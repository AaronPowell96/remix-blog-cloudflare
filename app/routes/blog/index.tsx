import {
    json
  } from "@remix-run/cloudflare";
  import type {     HeadersFunction,
    LinksFunction,
    MetaFunction,LoaderFunction } from "@remix-run/cloudflare";
 import {    useLoaderData}  from "@remix-run/react"
    import { siteTitle } from "~/utils/constants";
import { getBlogs } from "~/models/getBlogs.server";

  type LoaderData = {blogs:Awaited<ReturnType<typeof getBlogs>>}
  

  export const headers: HeadersFunction = ({ loaderHeaders }) => loaderHeaders;
  
  export const loader: LoaderFunction = async ({request, context, params})=> {
    const CONTENT = context.CONTENT as KVNamespace;
  
    return json<LoaderData>({
blogs: await getBlogs(CONTENT)
    },
    {
      headers: {
        // use weak etag because Cloudflare only supports
        // strong etag on Enterprise plans :(
      //   ETag: weakHash,
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
    if (data) {
      title = `Blog - ${siteTitle}`;
    }
    return {
      title,
    };
  };

export default function Index() {
    const {blogs} = useLoaderData<LoaderData>() as LoaderData;

    return (
      <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
        <h1>Blogs</h1>
        <ul>
            {blogs.map(({name, metadata}) => {
                return (
                    <a href={name} key={name}>
                    <li>
                        {metadata.title}
                        {JSON.stringify(metadata, null, 2)}
                    </li>
                    <span>oops</span>
                    </a>
                )
            })}
        </ul>
      </div>
    );
  }
  