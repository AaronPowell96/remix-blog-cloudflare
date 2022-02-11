import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import urlExists from 'url-exists-deep';
import fetch from "node-fetch";
import * as React from "react";
import { renderToString } from "react-dom/server.js";
import { bundleMDX } from "mdx-bundler";
import { getMDXComponent } from "mdx-bundler/client/index.js";
import rehypeHighlight from "rehype-highlight";
import { Command } from "commander/esm.mjs";

const isLocalHostRunning = async () => {
  return await urlExists(process?.env?.BASE_URL);
}

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
    // if (!process.env.API_URL) {
      //   console.error("missing API_URL");
  //   process.exit(1);
  // }
  
  const rootPath = options.root;
  const mdxPaths = options.file;
  config({path: `${rootPath}/.env`});
  const results = {};
  let hasError = false;

    // Create miniflare KV directory if it doesn't exist.
    const KVDir = "../../.mf/kv"
    if (!fs.existsSync(KVDir)) {
      fs.mkdirSync(KVDir, {
        recursive: true
      });
    }
    
    if(process.env.NODE_ENV === "development"){
      let retry = 0;
      let exists = isLocalHostRunning();
      // Possible race condition? Sleep or somehow await for it to be running (Loop check its up?)
      while(!exists){
        // Sleep one second give localhost a chance to spinup.
        exists = isLocalHostRunning();
        await new Promise(resolve => setTimeout(resolve, 1000));
        retry++;
        
        if(retry > 5){
        console.error(`SHUTTING DOWN: Cannot connect to ${process?.env?.BASE_URL} after 5 retrys.`)
        process.exit(1);
        }
      }
    }
  for (let mdxPath of mdxPaths) {
    console.error(`Compiling ${mdxPath}...`);
    const fullPath = path.join(rootPath, mdxPath);
    const slug = mdxPath.split(path.sep).slice(1).join("/").replace(".mdx", "");
    
    const { frontmatter, code } = await bundleMDX({
      file: fullPath,
      // Don't minify source in development, allowing inspection.
      esbuildOptions(options, formatter) {
        options.minify = process.env.NODE_ENV !== "development"
        return options
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

    // Generate static HTML to render if there's no javascript.
    const Component = getMDXComponent(code);
    const html = renderToString(React.createElement(Component));

    const hash = crypto
      .createHash("sha256")
      .update(frontmatter + code)
      .digest("hex");

    // Send changed content to the cache.
    const response = await fetch(
      `${process?.env?.API_URL}/post-content`,
      {
        method: "post",
        body: JSON.stringify({
          slug,
          hash,
          frontmatter,
          html,
          code: code ?? undefined,
        }),
        // headers: {
        //   authorization: `Bearer ${process.env.POST_API_KEY}`,
        // },
      }
    );
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
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  }
  process.exit(hasError ? 1 : 0);
})();
