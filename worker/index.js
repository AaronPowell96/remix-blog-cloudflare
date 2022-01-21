import { createEventHandler } from "@remix-run/cloudflare-workers";
import { redirectHandler } from "./redirect";

import * as build from "../build";

const handler = createEventHandler({ build });
const handleFetch = (event) => {
  const url = new URL(event.request.url);
  if (url.hostname === "remix-blog-cloudflare.pages.dev") {
    event.respondWith(redirectHandler(event));
    return;
  }
  handler(event);
};
addEventListener("fetch", handleFetch);