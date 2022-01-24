const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const exec = require("util").promisify(require("child_process").exec);
const cacheFilePath = "./app/.cache.json";
const force = true;

(async function () {
  console.log("WATCHING CONTENT CHANGED")
  await main();
})();

async function main() {
  // read from cache

  let cache = {};
  if (fs.existsSync(cacheFilePath)) {
    cache = JSON.parse(fs.readFileSync(cacheFilePath));
  }
  try {
    chokidar.watch("./content").on("all", async (event, contentPath) => {
      if (event === "addDir") return;
      console.log("Listening to:", contentPath);
      const { match, dir, file } = validContentPath(contentPath);
      console.log(match, dir, file);
      if (!match) return;

      const lastModified = fs.statSync(contentPath).mtimeMs;
      // Check for changes
      if (cache[contentPath] && cache[contentPath].lastModified === lastModified) {
        // Early return if no change.
        return;
      }

      if (file === "_series.mdx") {
        const { frontmatter, filelist } = await parseSeries(contentPath);
        console.log({ frontmatter, filelist });
        updateCache(cache, dir, {
          type: "series",
          frontmatter,
          filelist,
          lastModified,
        });
        return;
      }

      const parts = dir.split(path.sep);
      let series = undefined;
      if (parts.length >= 3) {
        series = parts.slice(0, 3).join("/");
        if (cache[series]?.type === "series") {
          console.log(`Part of series ${series}`);
        }
        if (file === "index.mdx") {
          contentPath = dir; // just compile the directory
        }
      }

      console.log(`Compling: ${contentPath}`);
      const results = await doCompile(contentPath);
      const { hash } = results[contentPath];
      console.log(results);
      updateCache(cache, contentPath, {
        series,
        lastModified,
        hash,
      });
    });
  } catch (e) {
    console.error(e);
  }
}

function updateCache(cache, path, entry) {
  cache[path] = entry;
  fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2));
}

async function doCompile(contentPath) {
  console.log(`🛠 Compiling ${contentPath}...`);
  const command = `cd scripts/mdx && node compile-mdx.js --root ../.. --json --file ${contentPath}`;
  let out = await exec(command).catch((e) => {
    console.error(e);
  });
  return JSON.parse(out.stdout);
}

function validContentPath(contentPath) {
  const _contentPath = contentPath.replaceAll(path.sep, "/");
  const match = /\/?(?<dir>content\/(?:.*))\/(?<file>[^.]+\.mdx)$/gm.exec(
    _contentPath
  );
  if (!match) return { match: false };
  const { dir, file } = match.groups;
  return { match: true, dir: dir.replaceAll("/", path.sep), file };
}

function parseSeries(path) {
  const file = fs.readFileSync(path, "utf8");
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
  return { frontmatter, filelist };
}

function parseLine(line) {
  const parts = line.split(":");
  const name = parts[0].trim();
  const value = parts[1].trim();
  return { name, value };
}
