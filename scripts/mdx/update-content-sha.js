import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const commit = process.env.COMMIT_SHA;

async function getCommit() {
  console.log(`Getting commit: ${commit}`);
  if (!commit) return { sha: "" };

  try {
    const res = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPO}/commits/${commit}`
    );
    const data = await res.json();
    console.log(`Found commit: ${JSON.stringify(data?.commit,null,2)}`)
    return {
      isDeployCommit: commit === "HEAD" ? "Unknown" : true,
      sha: data?.sha,
      author: data?.commit?.author?.name || data?.commit?.committer?.name,
      date: data?.commit?.author?.date || data?.commit?.committer?.date,
      message: data?.commit?.message,
      link: data.html_url,
    };
  } catch (error) {
    return { sha: '' }
  }
}

async function go() {
  const buildInfo = {
    buildTime: Date.now(),
    commit: await getCommit(),
  };

  const response = await fetch(`${process.env.API_URL || "http://localhost:8788/api"}/update-content-sha`, {
    method: "post",
    body: JSON.stringify(buildInfo),
    // headers: {
    //   authorization: `Bearer ${process.env.POST_API_KEY}`,
    // },
  });
  if (!response.ok) {
    console.log({ status: response.status, statusText: response.statusText });
    process.exit(1);
  }
  console.log("content sha updated", buildInfo);
  process.exit(0);
}
go();

/*
eslint
  consistent-return: "off",
*/
