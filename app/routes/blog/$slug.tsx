import {
  HeadersFunction,
  json,
  LinksFunction,
  MetaFunction,
  useLoaderData,
} from "remix";
import type { LoaderFunction } from "remix";
import { getMDXComponent } from "~/utils/mdx.client";
import customCodeCss from "~/styles/custom-code.css";
import { siteTitle } from "~/utils/constants";
import { MDXContent } from "~/components/MDXContent";

declare var CONTENT: KVNamespace;

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/github-dark.min.css",
  },
  {
    rel: "stylesheet",
    href: customCodeCss,
  },
];

type BlogContentType = {
  frontmatter: { [key: string]: any };
  html: string;
  code?: string;
  hash?: string;
};

export const headers: HeadersFunction = ({ loaderHeaders }) => loaderHeaders;

export const loader: LoaderFunction = async ({request, context, params}) => {
  const {CONTENT} = context.env
  const slug = params['slug']
  if (slug === undefined) {
    throw new Response("Not Found", { status: 404 });
  }
  const data = await CONTENT.get(`blog/${slug}`, "json");
  if (data === undefined) {
    throw new Response("Not Found", { status: 404 });
  }
  const { frontmatter, html, code, hash } = data as BlogContentType;
  const weakHash = `W/"${hash}"`;
  const etag = request.headers.get("If-None-Match");
  if (etag === weakHash) {
    return new Response(null, { status: 304 });
  }

  return json(
    {
      slug,
      frontmatter,
      html,
      code,
      env: context.env
    },
    {
      headers: {
        // use weak etag because Cloudflare only supports
        // strong etag on Enterprise plans :(
        ETag: weakHash,
        // add cache control and status for cloudflare?
        "Cache-Control": "maxage=1, s-maxage=60, stale-while-revalidate",
        //'CF-Cache-Status': 'MISS',
        "x-remix": "test",
      },
    }
  );
};
export let meta: MetaFunction = ({ data }) => {
  let title = siteTitle;
  let description = "";
  if (data) {
    title = `${data.frontmatter.title} - ${siteTitle}`;
    description = data.frontmatter.description;
  }
  return {
    title,
    description,
  };
};
export default function Post() {
  const { html, frontmatter, code, env } = useLoaderData();

  console.log("test", env)
  return (
    <>
      <MDXContent html={html} code={code}/>
      <span>{env ? env.TEST: "no env"}</span>
      <span>hi nope</span>
    </>
  );
}
