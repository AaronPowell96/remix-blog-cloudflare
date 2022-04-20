const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const exec = require("util").promisify(require("child_process").exec);
// Local files for handling KV storage and cache.
// cache.json is inside app to trigger Hot Module Reloading on changes.
const cacheFilePath = `.${path.sep}app${path.sep}.cache.json`;
const miniflareKVPath = `${process.cwd()}${path.sep}.mf${path.sep}kv`;

(async function () {
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
      if (!match) return;
      const lastModified = fs.statSync(contentPath).mtimeMs;
      // If local KV file doesn't exist, or the cached content has changed. Compile the mdx file.
      console.log("LAST MODIFIED", cache[contentPath].lastModified, lastModified, `${miniflareKVPath}${path.sep}${contentPath.split(".")[0]}`, fs.existsSync(`${miniflareKVPath}${path.sep}${contentPath.split(".")[0]}`));
      if (
        fs.existsSync(`${miniflareKVPath}${path.sep}${contentPath.split(".")[0]}`) &&
        cache[contentPath] &&
        cache[contentPath].lastModified === lastModified
      ) {
        // Early return if no change.
        return;
      }
      console.time(`Time to Compile ${contentPath}`);
      const results = await doCompile(contentPath);
      const { hash } = results[contentPath];
      updateCache(cache, contentPath, {
        lastModified,
        hash,
      });
      console.timeEnd(`Time to Compile ${contentPath}`);
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
  console.log(`Compiling ${contentPath}...`);
  const command = `cd scripts/mdx && node compile-mdx.js --root ../.. --json --file ${contentPath}`;
  let out = await exec(command).catch((e) => {
    return e
  });
  if(out.stderr){
    // throw Error(out.stderr);
    console.error(out.stderr);
    return;
  }
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
