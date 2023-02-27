import { json } from '@remix-run/cloudflare'
import type {
    HeadersFunction,
    LinksFunction,
    MetaFunction,
    LoaderFunction,
} from '@remix-run/cloudflare'
import { useLoaderData } from '@remix-run/react'
import { siteTitle } from '~/utils/constants'
import { getBlogs } from '~/models/getBlogs.server'
import { Button } from '~/components/Button'
import { ThemeToggle } from '~/theme/ThemeToggle'

type LoaderData = { blogs: Awaited<ReturnType<typeof getBlogs>> }

export const headers: HeadersFunction = ({ loaderHeaders }) => loaderHeaders

export const loader: LoaderFunction = async ({ request, context, params }) => {
    const CONTENT = context.CONTENT as KVNamespace

    return json<LoaderData>(
        {
            blogs: await getBlogs(CONTENT),
        },
        {
            headers: {
                // use weak etag because Cloudflare only supports
                // strong etag on Enterprise plans :(
                //   ETag: weakHash,
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
    if (data) {
        title = `Blog - ${siteTitle}`
    }
    return {
        title,
    }
}

export default function Index() {
    const { blogs } = useLoaderData<LoaderData>() as LoaderData

    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
            <h1>Blogs</h1>
            <Button> test</Button>
            <ul
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                {blogs.map(({ name, metadata, title }) => {
                    return (
                        <a
                            style={{ background: '#31c1f1' }}
                            href={name}
                            key={name}
                        >
                            {metadata['og:image'] ? (
                                <img
                                    src={metadata['og:image']}
                                    alt="Header"
                                    style={{ width: '250px', height: '250px' }}
                                />
                            ) : null}
                            <h5>{metadata.title}</h5>
                            <h6>{metadata.description}</h6>
                            <span>
                                Published at{' '}
                                {new Date(
                                    metadata.published
                                ).toLocaleDateString()}
                            </span>
                        </a>
                    )
                })}
            </ul>
        </div>
    )
}
