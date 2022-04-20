import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import urlExists from "url-exists-deep";
import fetch from "node-fetch";
import * as React from "react";
import { renderToString } from "react-dom/server.js";
import { bundleMDX } from "mdx-bundler";
import { getMDXComponent } from "mdx-bundler/client/index.js";
import rehypeHighlight from "rehype-highlight";
import { Command } from "commander/esm.mjs";
import * as cloudinary from "cloudinary";
import remarkGfm from 'remark-gfm'
// import {getHTML} from "./getHTML.js"
const isLocalHostRunning = async () => {
  return await urlExists(process?.env?.BASE_URL);
};

(async function () {
  const program = new Command();
  program
    .requiredOption(
      "-R, --root <path>",
      "Root path content is relative to root"
    )
    .option("-f, --file [files...]", "Files to compile")
    .option("-j, --json", "Output JSON");

  program.parse(process.argv);
  const options = program.opts();
  //   if (!process.env.API_URL) {
  //       console.error("missing API_URL");
  //   process.exit(1);
  // }

  const rootPath = options.root;
  const mdxPaths = options.file;
  const results = {};
  let hasError = false;

  config({ path: `${rootPath}/.env` });

  if(!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) {
    throw Error("CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME env vars are required")
  }

  // Create miniflare KV directory if it doesn't exist.
  const KVDir = path.join(rootPath, ".mf/kv");
  if (!fs.existsSync(KVDir)) {
    fs.mkdirSync(KVDir, {
      recursive: true,
    });
  }

  if (process.env.NODE_ENV === "development") {
    let retry = 0;
    let exists = isLocalHostRunning();
    // Possible race condition? Sleep or somehow await for it to be running (Loop check its up?)
    while (!exists) {
      // Sleep one second give localhost a chance to spinup.
      exists = isLocalHostRunning();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retry++;

      if (retry > 5) {
        console.error(
          `SHUTTING DOWN: Cannot connect to ${process?.env?.BASE_URL} after 5 retrys.`
        );
        process.exit(1);
      }
    }
  }

  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  let cloudinary_resources;

  try {
    cloudinary_resources = (await cloudinary.v2.api.resources())?.resources;
  } catch (e) {
    console.log("errrr", e);
  }
  // change to object with key being the src and value being remotesource so we can shortcut
  // if already exists

  const images = {};
  let msgs = [];
  let temp_code = '';
    //   const ParagraphimageSourceReplace = (props) => {
    //   // console.log("child type of P", props.children.type)
    //   console.error("props", props)
    //   if (props.children.type === "img") {
    //     // console.error(props.children)
    //     return React.createElement("h1", null, "bye");
    //     return React.createElement(props.children.type, props.children.props);
    //   }
      
    //   return React.createElement("h1", null, "hi");
    //   return React.createElement("p", props);
    // };

  const injectRemoteImages = async (code) => {
    temp_code = code;
    [...code.matchAll(/src: "(.*)"/g)].forEach(([,match]) => {
      imageSourceReplace(match);
    });

    // console.error(temp_code)
    await uploadInjectedImages(code);
    // const MDXComponent = getMDXComponent(temp_code);
    const html = renderToString(React.createElement(getMDXComponent(temp_code)));
    return {html, transformedCode: temp_code}
  }

  const cloudinaryUpload = async (props) => {
    const exists = await cloudinary.v2.api.resource(props.public_id)

      // console.warn("exists", exists)
      if(!exists){
        msgs.push("Uploading image: " + props.src + " with " + props.transforms);
          try {
            await cloudinary.v2.uploader.upload(props.src, {
              public_id: props.public_id,
              // overwrite: false,
              eager: props.transforms.length ? props.transforms.join(",") : undefined,
              // transformation: props.transforms.join(","),
              // format: "webp"
            });
            msgs.push(`Succesfully uploaded ${props.public_id}`);
          } catch (err) {
            console.warn({ "UPLOAD FAILED": props.public_id, ...err });
          }
        }
          else if(props.transforms.length && !exists.derived.find((d) => d.transformation === props.transforms.join(","))){
            msgs.push("Image already exists, adding new transformations " + props.public_id + " with " + props.transforms);
            try{
            await cloudinary.v2.uploader.explicit(props.src, {type: 'upload', public_id: props.public_id, eager: props.transforms.join(",")} )
            msgs.push(`Succesfully Added Transformation for ${props.public_id} - ${props.transforms}`);
            }catch (err) {
              console.warn({ "ADD TRANSFORM FAILED": props.public_id, ...err });
            }
          }else{
            msgs.push("Image already exists, no new transformations added. " + props.public_id + " with " + props.transforms);
          }
  }
  const uploadInjectedImages = async () => {
    for await (const image of Object.keys(images)) {
      const props = images[image];
      // console.log("HTML IN LOOP", html)
      await cloudinaryUpload(props)
    }
  }
  const imageSourceReplace = (src) => {
    // console.info("imageSourceReplace", props);
    // Enable env var for Cloudinary ON/OFF, copy images folder to public if OFF.
    // Dont transform src that begins with http

    
    if(src.indexOf("http") === 0) {
      return {}
    }
    if(images[src]){
      return images[src]
    }
    
    const imageIndex = src.indexOf("images") || 0;
    let transforms =
      imageIndex !== 0 ? src.substring(0, imageIndex - 1).split(",") : [];

    const localSource = path.join(
      rootPath,
      "content",
      src.substring(imageIndex)
    );
    const public_id = `${src.substring(imageIndex).split(".")[0]}`;
    let existingResource = cloudinary_resources?.find(
      (image) => image.public_id === public_id
    )?.url;

    // existingResource.transforms
    const end = existingResource?.substring(
      existingResource?.indexOf("upload/") + 7
      );
      const start = existingResource?.substring(
        0,
        existingResource?.indexOf("upload/") + 7
        );
        // console.warn("END STARRT", end, start)
        const existingResourceUrl = `${start}${transforms.length ? `${transforms.join(",")}/` : ''}${end}`;
        // Create the URL that will be created. We need a deterministic URL for this to work as uploads happen later.
        const remoteSource =
        ((existingResource && existingResourceUrl) ||
        (`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${transforms.length ?
         `${transforms.join(",")}/` : ''}${public_id}.${src.substring(imageIndex - 1).split(".")[1]}`))
        
        // console.warn("remoteSource", remoteSource)

    images[src] = { public_id, src: localSource, transforms, remoteSource };
    temp_code = temp_code.replaceAll(`"${src}"`, `"${remoteSource}"`);
    return { public_id, src: localSource, transforms, remoteSource };
    // console.error(temp_code);
    // return React.createElement("img", {
    //   ...props,
    //   src: remoteSource,
    // });
  };

  for await (let mdxPath of mdxPaths) {
    const fullPath = path.join(process.cwd(), rootPath, mdxPath);
    const slug = mdxPath.split(path.sep).slice(1).join("/").replace(".mdx", "");
    msgs = [];
    // console.error("BEFORE BUNDLE", rootPath, process.cwd())
    //TODO: maybe grab og:Image or something from frontmatter to use for generation of social sharing.
    // Move image to public or upload
    //Grab og:title and og:image og:description and generate an image on cloudinary overlay of text etc.

    const { frontmatter, code } = await bundleMDX({
      cwd: fullPath,
      file: fullPath,
      // Don't minify source in development, allowing inspection.
      esbuildOptions(options, formatter) {
        options.minify = process.env.NODE_ENV !== "development";
        return options;
      },
      // XDM Highlight <pre></pre> tags
      xdmOptions(options) {
        options.remarkPlugins = [
          ...(options.remarkPlugins ?? []),
          remarkGfm,
        ]
        options.rehypePlugins = [
          ...(options.rehypePlugins ?? []),
          rehypeHighlight,
        ];
        return options;
      },
    });

    if(frontmatter['og:image']){
      const props = imageSourceReplace(`h_630,w_1200,c_scale,f_png/c_fit,w_1100,b_rgb:000a,co_white,${!frontmatter?.['image:disable_text'] ? `l_text:Arial_90_bold_center:${frontmatter?.['og:title'] || frontmatter?.['title'] || ''}` : ''},${frontmatter?.['image:transforms'] ?? ''}/${frontmatter['og:image']}`);
      if(props?.remoteSource){
        // Force og:image to be png
        let source = props.remoteSource.split(".");
        source.pop();
        source = source.join(".");
        frontmatter['og:image'] = `${source}.png`;
        props.remoteSource = `${source}.png`;
      await cloudinaryUpload(props)
      frontmatter['og:image'] = props.remoteSource
      }
    }
    // temp_code = code;

    
    // Generate static HTML to render if there's no javascript.
    // Replacement = Get the attributes from image tag, upload to cloudflare, return new image with cloudflare url
    // <Component components={{img: Replacement}}
    // const MDXComponent = React.createElement(getMDXComponent(code), {
    //   components: { img: imageSourceReplace, p: ParagraphimageSourceReplace },
    // });

    // console.log(code.match(/src: "(.*)"/g));

    
    // function that takes code string, grabs all src, maps over a set to replace all src with cloudinary url.
    // return code and html, keep functions separate for image to cloudinary url and the upload.
    // let html = renderToString(MDXComponent)

    const {transformedCode, html} = await injectRemoteImages(code);

    // console.warn("CODEEEEEE", code)
    // msgs.push("Code: " + code)
    // console.log(codeA)
    // const Component = () => <MDXComponent components={{img: Replacement}}/>
    // Can renderToString be changed to renderToReadableStream in React18?
    
    // renderToString(MDXComponent).replaceAll(`"${props.src}"`, remoteSource);

    // msgs.push("HTML: " + html)
    // console.error("AFTER BUNDLE", html)
    // const html = getHTML(code)
    const hash = crypto
      .createHash("sha256")
      .update(frontmatter + code)
      .digest("hex");

    // console.log("images", images)
    // for (const image of images) {
    //    const cloudResp = await cloudinary.v2.uploader.upload(image.src, {public_id: image.public_id}, function(error, result) {
    //     msgs.push(result)
    //     msgs.push(error)
    //     // console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrresult", result, error)
    //    });
    //    msgs.push(cloudResp)
    // }


    // console.error("HTML", html, "code", code);
    // Send changed content to the cache.
    const response = await fetch(`${process?.env?.API_URL}/post-content`, {
      method: "post",
      body: JSON.stringify({
        slug,
        hash,
        frontmatter,
        html,
        // Component: MDXComponent,
        code: transformedCode ?? undefined,
        matches: [...code.matchAll(/src: "(.*)"/g)],
        msgs,
        images,
        // cloudinary_resources,
      }),
      // headers: {
      //   authorization: `Bearer ${process.env.POST_API_KEY}`,
      // },
    });
    if (!response.ok) {
      const body = await response.text();
      results[mdxPath] = {
        status: response.status,
        statusText: response.statusText,
        body,
      };
      hasError = true;
    }
    results[mdxPath] = {
      status: response.status,
      statusText: response.statusText,
      slug,
      hash,
    };
    // console.error("CODEEE", code)
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  }
  process.exit(hasError ? 1 : 0);
})();
