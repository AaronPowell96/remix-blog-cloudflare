import { json, LoaderFunction } from "remix";

export const loader: LoaderFunction = async ({context}) => {
  const {CONTENT} = context.env
  const data = (await CONTENT.get("$$content-sha", "json")) || {
    commit: { sha: "" },
  };
  return json(data);
};
