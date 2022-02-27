import {
    HeadersFunction,
    json,
    LinksFunction,
    MetaFunction,
    useLoaderData,
  } from "remix";
  import type { LoaderFunction } from "remix";
  import { siteTitle } from "~/utils/constants";
type BlogContentType = {
    frontmatter: { [key: string]: any };
    html: string;
    code?: string;
    hash?: string;
  };
  
  export const headers: HeadersFunction = ({ loaderHeaders }) => loaderHeaders;
  
  export const loader: LoaderFunction = async ({request, context, params}) => {
    const {CONTENT} = context.env
    // const slug = params['slug']
    // if (slug === undefined) {
    //   throw new Response("Not Found", { status: 404 });
    // }
    const {keys: blogs} = await CONTENT.list({prefix: "blog"});
  
    return json(
      {
        blogs,
        env: context.env
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
    const { blogs } = useLoaderData();

    return (
      <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
        <h1>Blogs</h1>
        <ul>
            {blogs.map(({name, metadata}) => {
                return (
                    <a href={name}>
                    <li>
                        {metadata.title}
                    </li>
                    </a>
                )
            })}
        </ul>
      </div>
    );
  }
  