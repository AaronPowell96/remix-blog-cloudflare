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
  const images = [];

  const ImageReplacement = (props) => {
    const imageIndex = props.src.indexOf("images") || 0;
    const transforms =
      imageIndex !== 0 ? props.src.substring(0, imageIndex - 1) : "";
    const localSource = path.join(
      rootPath,
      "content",
      props.src.substring(imageIndex)
    );
    const public_id = props.src.substring(imageIndex).split(".")[0];
    // console.log(cloudinary_resources)
    let existingResource = cloudinary_resources?.find(
      (image) => image.public_id === public_id
    )?.url;
    const end = existingResource?.substring(
      existingResource?.indexOf("upload/") + 7
    );
    const start = existingResource?.substring(
      0,
      existingResource?.indexOf("upload/") + 7
    );
    const existingResourceUrl = `${start}${transforms}/${end}`;
    const remoteSource =
      (existingResource && existingResourceUrl) ||
      `${process.env.CLOUDINARY_IMAGE_URL.replace(
        "cloudname_replaced_programatically",
        process.env.CLOUDINARY_CLOUD_NAME
      )}/${transforms}/${public_id}`;
    if (!existingResource) {
      images.push({ public_id, src: localSource, transforms });
    }
    return React.createElement("img", {
      ...props,
      src: remoteSource,
    });
  };

  for (let mdxPath of mdxPaths) {
    console.error(`Compiling ${mdxPath}...`);
    const fullPath = path.join(rootPath, mdxPath);
    const slug = mdxPath.split(path.sep).slice(1).join("/").replace(".mdx", "");

    //TODO: maybe grab og:Image or something from frontmatter to use for generation of social sharing.
    const { frontmatter, code } = await bundleMDX({
      file: fullPath,
      // Don't minify source in development, allowing inspection.
      esbuildOptions(options, formatter) {
        options.minify = process.env.NODE_ENV !== "development";
        return options;
      },
      // XDM Highlight <pre></pre> tags
      xdmOptions(options) {
        options.rehypePlugins = [
          ...(options.rehypePlugins ?? []),
          rehypeHighlight,
        ];
        return options;
      },
    });

    const ParagraphImageReplacement = (props) => {
      if (typeof props.children !== "string" && props.children.type === "img") {
        return React.createElement(props.children);
      }

      return React.createElement("p", props);
    };

    // Generate static HTML to render if there's no javascript.
    // Replacement = Get the attributes from image tag, upload to cloudflare, return new image with cloudflare url
    // <Component components={{img: Replacement}}
    const MDXComponent = React.createElement(getMDXComponent(code), {
      components: { img: ImageReplacement, p: ParagraphImageReplacement },
    });
    // const Component = () => <MDXComponent components={{img: Replacement}}/>
    const html = renderToString(MDXComponent);
    // const html = getHTML(code)
    const hash = crypto
      .createHash("sha256")
      .update(frontmatter + code)
      .digest("hex");

    const msgs = [];
    // console.log("images", images)
    // for (const image of images) {
    //    const cloudResp = await cloudinary.v2.uploader.upload(image.src, {public_id: image.public_id}, function(error, result) {
    //     msgs.push(result)
    //     msgs.push(error)
    //     // console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrresult", result, error)
    //    });
    //    msgs.push(cloudResp)
    // }

    for (const image of images) {
      try {
        await cloudinary.v2.api.resource(image.public_id);
      } catch (e) {
        if (e.error.http_code == 404) {
          try {
            await cloudinary.v2.uploader.upload(image.src, {
              public_id: image.public_id,
            });
            msgs.push(`Succesfully uploaded ${image.public_id}`);
          } catch (err) {
            throw new Error({ "UPLOAD FAILED": image.public_id, ...err });
          }
        } else {
          msgs.push(JSON.stringify(e, null, 2));
        }
      }
    }
    // Send changed content to the cache.
    const response = await fetch(`${process?.env?.API_URL}/post-content`, {
      method: "post",
      body: JSON.stringify({
        slug,
        hash,
        frontmatter,
        html,
        component: MDXComponent.toString(),
        code: code ?? undefined,
        msgs,
        images,
        cloudinary_resources,
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
