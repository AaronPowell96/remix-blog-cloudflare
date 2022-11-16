import { json } from "@remix-run/cloudflare";

type Blog = {
    slug: string;
    title: string;
    name: string;
    metadata: Record<string, string>;
  };


  
  type BlogContentType = {
    frontmatter: { [key: string]: any };
    html: string;
    code?: string;
    hash?: string;
  };
  
  export async function getBlogs(CONTENT: KVNamespace) {
    // const slug = params['slug']
    // if (slug === undefined) {
    //   throw new Response("Not Found", { status: 404 });
    // }
    const {keys: blogs} = await CONTENT.list({prefix: "blog"});
  
    return blogs as Blog[]
  }