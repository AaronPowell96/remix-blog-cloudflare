import { config } from "dotenv";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import urlExist from 'url-exist';
import fetch from "node-fetch";
import * as React from "react";
import { renderToString } from "react-dom/server.js";
import { bundleMDX } from "mdx-bundler";
import { getMDXComponent } from "mdx-bundler/client/index.js";
import { remarkMdxCodeMeta } from "remark-mdx-code-meta";
import rehypeHighlight from "rehype-highlight";
import { Command } from "commander/esm.mjs";
(async function () {
  config();
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
  const results = {};
  let hasError = false;
  const processed = {};
  const seriesList = {};
  const contentData = {};
 
  for (let mdxPath of mdxPaths) {
    console.error(`Compiling ${mdxPath}...`);
    const fullPath = path.join(rootPath, mdxPath);
    if (processed[mdxPath]) continue;
    processed[mdxPath] = true;
    const parts = mdxPath.split(path.sep);
    console.error("MDX PATH PARTS", parts)
    const slug = parts.slice(1).join("/").replace(".mdx", "");
    let series = undefined;
    if (parts.length > 3) {
      const seriesPath = path.join(parts.slice(0, 3).join("/"), "_series.mdx");
      if (
        !seriesList[seriesPath] &&
        fs.existsSync(path.join(rootPath, seriesPath))
      ) {
        seriesList[seriesPath] = parseSeries(path.join(rootPath, seriesPath));
      }
      series = seriesList[seriesPath];
    }

    let mdxSource = "";
    let files = {};
    if ((await fsp.lstat(fullPath)).isDirectory()) {
      mdxSource = await fsp.readFile(`${fullPath}/index.mdx`, "utf8");
      const mdxFiles = (await fsp.readdir(fullPath)).filter(
        (filename) => filename !== "index.mdx"
      );
      const results = await Promise.all(
        mdxFiles.map(async (filename) =>
          fsp.readFile(`${fullPath}/${filename}`, "utf8")
        )
      );
      files = Object.fromEntries(
        results.map((content, i) => [`./${mdxFiles[i]}`, content])
      );
    } else {
      mdxSource = await fsp.readFile(fullPath, "utf8");
    }
    const { frontmatter, code } = await bundleMDX({
      source: mdxSource,
      files,
      xdmOptions(options) {
        // options.remarkPlugins = [
        //   ...(options.remarkPlugins ?? []),
        //   remarkMdxCodeMeta,
        // ]
        options.rehypePlugins = [
          ...(options.rehypePlugins ?? []),
          rehypeHighlight,
        ];
        return options;
      },
    });
    const Component = getMDXComponent(code);
    const html = renderToString(React.createElement(Component));
    const hasComponents = Object.keys(files).length > 0;

    const hash = crypto
      .createHash("sha256")
      .update(frontmatter + code)
      .digest("hex");

    console.error("MDX NODE ENV", process.env.NODE_ENV);

    
    contentData[mdxPath] = JSON.stringify({
      slug,
      hash,
      frontmatter,
      series,
      html,
      code: hasComponents ? code : undefined,
    }, null, 2)
    
    let retry = 0;
    let exists = false;
    const isLocalHostRunning = async () => {
      exists = await urlExist('http://localhost:8788/');
    }
    // Possible race condition? Sleep or somehow await for it to be running (Loop check its up?)
    while(!exists){
      // Sleep one second give localhost a chance to spinup.
      isLocalHostRunning();
      await new Promise(resolve => setTimeout(resolve, 1000));
      retry++;
      
      if(retry > 5){
      process.stderr("SHUTTING DOWN: Cannot connect to http://localhost:8788/ after 5 retrys.")
      process.exit(1);
      }
    }
    const response = await fetch(
      `http://localhost:8788/api/post-content`,
      {
        method: "post",
        body: JSON.stringify({
          slug,
          hash,
          frontmatter,
          series,
          html,
          code: hasComponents ? code : undefined,
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
  // Create miniflare KV directory if it doesn't exist.`
  const KVDir = "../../.mf/kv"
  if (!fs.existsSync(KVDir)) {
    fs.mkdirSync(KVDir, {
      recursive: true
    });
  }

  // path.join(KVDir, 'CONTENT.json')
  // fs.writeFileSync("../../.mf/kv/CONTENT.json", JSON.stringify(contentData, null, 2))
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  }
  process.exit(hasError ? 1 : 0);
})();

function parseSeries(path) {
  const file = fs.readFileSync(path, "utf8");
  const slug = path.substring(
    path.indexOf("content/") + 8,
    path.indexOf("_series") - 1
  );
  const lines = file.split("\n");
  const frontmatter = {};
  const filelist = [];
  let state = "START";
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (state === "START") {
      if (line.startsWith("---")) {
        state = "FRONTMATTER";
      }
    } else if (state === "FRONTMATTER") {
      if (line.startsWith("---")) {
        state = "CONTENT";
      } else {
        const { name, value } = parseLine(line);
        frontmatter[name] = value;
      }
    } else if (state === "CONTENT") {
      if (line.startsWith("---")) {
        state = "END";
      }
      filelist.push(line);
    }
  }
  return { slug, frontmatter, filelist };
}

function parseLine(line) {
  const parts = line.split(":");
  const name = parts[0].trim();
  const value = parts[1].trim();
  return { name, value };
}
