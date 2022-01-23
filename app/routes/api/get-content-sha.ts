import { json, LoaderFunction } from "remix";
// declare var CONTENT: KVNamespace;

export const loader: LoaderFunction = async ({context}) => {
  const {CONTENT} = context
  const data = (await CONTENT.get("$$content-sha", "json")) || {
    commit: { sha: "" },
  };
  return json(data);
};
