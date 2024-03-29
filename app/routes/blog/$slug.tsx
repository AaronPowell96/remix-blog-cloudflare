import type {
    HeadersFunction,
    LinksFunction,
    MetaFunction,
    LoaderFunction,
} from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import { siteTitle } from '~/utils/constants'
import { MDXContent } from '../../components/MDXContent'
import type { ReactNode } from 'react'
import { useLoaderData } from '@remix-run/react'
import { Button } from '~/components/Button'

export const links: LinksFunction = () => [
    {
        rel: 'stylesheet',
        href: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/github-dark.min.css',
    },
]

type BlogContentType = {
    frontmatter: { [key: string]: any }
    html: string
    code: string
    hash?: string
    Component: ReactNode
}

export const headers: HeadersFunction = ({ loaderHeaders }) => loaderHeaders

export const loader: LoaderFunction = async ({ request, context, params }) => {
    const CONTENT = context.CONTENT as KVNamespace
    // console.log("content", context)
    const slug = params['slug']

    if (slug === undefined || !CONTENT.get(`blog/${slug}`)) {
        throw new Response('Not Found', { status: 404 })
    }

    console.log('CONTENT', CONTENT)
    const data = await CONTENT.get(`blog/${slug}`, 'json')
    // console.log("DATA", data)
    if (data === undefined) {
        throw new Response('Not Found', { status: 404 })
    }
    const blog = data as BlogContentType
    const weakHash = `W/"${blog?.hash}"`
    const etag = request.headers.get('If-None-Match')
    if (etag === weakHash) {
        return new Response(null, { status: 304 })
    }

    return json(
        {
            slug,
            frontmatter: blog?.frontmatter,
            html: blog?.html,
            code: blog?.code,
            // Component,
            context: context,
        },
        {
            headers: {
                // use weak etag because Cloudflare only supports
                // strong etag on Enterprise plans :(
                ETag: weakHash,
                // add cache control and status for cloudflare?
                'Cache-Control':
                    'maxage=1, s-maxage=60, stale-while-revalidate',
                //'CF-Cache-Status': 'MISS',
                'x-remix': 'test',
            },
        }
    )
}
export let meta: MetaFunction = ({ data }) => {
    let title = siteTitle
    let description = ''
    if (data) {
        title = `${data.frontmatter?.title} - ${siteTitle}`
        description = data.frontmatter?.description
    }
    return {
        title,
        description,
        'twitter:card': 'summary_large_image',
        ...data?.frontmatter,
        'og:title': data?.frontmatter?.['og:title'] || title,
        'og:description': data?.frontmatter?.['og:description'] || description,
        // allow for transform overrides in og:image as string concat onto end as they override.
        'og:image': data?.frontmatter?.['og:image'],
    }
}
export default function Post() {
    const { html, code } = useLoaderData()
    // const Component = getMDXComponent(code || '');
    return (
        <>
            <Button> test</Button>
            <MDXContent html={html} code={code} />
        </>
    )
}
