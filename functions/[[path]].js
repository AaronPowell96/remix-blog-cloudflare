import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages";

// @ts-ignore
import * as build from "../build";

const handleRequest = createPagesFunctionHandler({
  build,
});

export function onRequest(context) {
  console.log("context", context.env);
  console.log(handleRequest(context));
  return handleRequest(context);
}
