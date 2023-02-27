import type { EntryContext } from '@remix-run/cloudflare'
import { RemixServer } from '@remix-run/react'
import { Head } from './root'
import { renderHeadToString } from 'remix-island'

import { renderToReadableStream } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'

export default function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext
) {
    return handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext
    )
}

async function handleBrowserRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext
) {
    let didError = false
    const sheet = new ServerStyleSheet()
    const readable = await renderToReadableStream(
        sheet.collectStyles(
            <RemixServer context={remixContext} url={request.url} />
        )
    )

    const styles = sheet.getStyleTags()
    responseHeaders.set('Content-Type', 'text/html')
    const stream = new ReadableStream({
        start(controller) {
            // Add the HTML head to the response
            const head = renderHeadToString({ request, remixContext, Head })
            controller.enqueue(
                new Uint8Array(
                    new TextEncoder().encode(
                        `<!DOCTYPE html><html><head>${head}${styles}</head><body><div id="root">`
                    )
                )
            )

            // Consume the readable stream and write chunks to the response
            const reader = readable.getReader()
            function read() {
                reader
                    .read()
                    .then(({ done, value }) => {
                        if (done) {
                            // Add the HTML foot to the response
                            controller.enqueue(
                                new Uint8Array(
                                    new TextEncoder().encode(
                                        `</div></body></html>`
                                    )
                                )
                            )
                            controller.close()
                            return
                        }
                        controller.enqueue(value)
                        read()
                    })
                    .catch((error) => {
                        controller.error(error)
                        readable.cancel()
                    })
            }
            read()
        },
        cancel() {
            readable.cancel()
        },
    })

    return new Response(stream, {
        headers: responseHeaders,
        status: didError ? 500 : responseStatusCode,
    })
}

// import type { EntryContext } from '@remix-run/cloudflare'
// import { RemixServer } from '@remix-run/react'
// import { renderToString } from 'react-dom/server'

// export default function handleRequest(
//     request: Request,
//     responseStatusCode: number,
//     responseHeaders: Headers,
//     remixContext: EntryContext
// ) {
//     const markup = renderToString(
//         <RemixServer context={remixContext} url={request.url} />
//     )

//     responseHeaders.set('Content-Type', 'text/html')

//     return new Response('<!DOCTYPE html>' + markup, {
//         status: responseStatusCode,
//         headers: responseHeaders,
//     })
// }
