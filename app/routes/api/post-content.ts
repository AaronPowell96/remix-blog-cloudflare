import { ActionFunction, json } from '@remix-run/cloudflare'

// declare var CONTENT: KVNamespace;
declare var POST_API_KEY: string

export const action: ActionFunction = async ({ request, context }) => {
    const CONTENT = context.CONTENT as KVNamespace
    try {
        // const key = request.headers.get("Authorization");
        // if (key !== `Bearer ${POST_API_KEY}`) {
        //   return new Response(`Unauthorized ${key}`, { status: 401 });
        // }
        const data = (await request.json()) as {
            slug: string
            frontmatter: Record<string, string>
            metadata: Record<string, string>
        }
        const metadata = data?.frontmatter || {}
        // console.log("dataaaaaa", data)
        // console.log("metadataaaa", metadata)
        // metadata.draft add draft/ in front or behind slug
        await CONTENT.put(data.slug.toLowerCase(), JSON.stringify(data), {
            metadata: { ...metadata },
        })
        return json({ success: true })
    } catch (e: any) {
        return json({ message: e.message, stack: e.stack })
    }
}
