import { json, LoaderFunction } from "@remix-run/cloudflare";

export const loader: LoaderFunction = async ({context}) => {
  const CONTENT = context.CONTENT as KVNamespace
  const data = (await CONTENT.get("$$content-sha", "json")) || {
    commit: { sha: "" },
  };
  return json(data);
};
