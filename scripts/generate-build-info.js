const path = require("path");
const fs = require("fs");
// this is installed by remix...
// eslint-disable-next-line import/no-extraneous-dependencies
const fetch = require("node-fetch");

async function getCommit() {
  const commit = process.env.COMMIT_SHA;
  try {
    const res = await (await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPO}/commits`
    ))?.json()

    console.log("res from github api", res)
    const data = res?.[0];

    if(!data?.sha){
      console.log("No sha from github api, using get-content-sha")
      const buildInfo = await (await fetch(
        "https://remix-blog-cloudflare.pages.dev/api/get-content-sha"
      ))?.json()


      console.log("build info from content", buildInfo)
      if(buildInfo?.commit) {
        return buildInfo?.commit
      }
    }

    return {
      isDeployCommit: data?.sha === "HEAD" ? "Unknown" : true,
      sha: data?.sha,
      author: data?.commit?.author?.name,
      date: data?.commit?.author?.date,
      message: data?.commit?.message,
      link: data?.html_url,
    };
  } catch (error) {
    console.log("Err build info: ", error)
    if (!commit) return { sha: "" }
    return {sha: commit};
  }
}

async function go() {
  const buildInfo = {
    buildTime: Date.now(),
    commit: await getCommit(),
  };

  fs.writeFileSync(
    path.join(__dirname, "../public/build/info.json"),
    JSON.stringify(buildInfo, null, 2)
  );
  console.log("build info generated", buildInfo);
}
go();