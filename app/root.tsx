import type {
    ActionFunction,
    HeadersFunction,
    LinksFunction,
    LoaderFunction,
    MetaFunction,
} from '@remix-run/cloudflare'
import { redirect } from '@remix-run/cloudflare'
import {
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useLoaderData,
} from '@remix-run/react'
import globalStyles from './components/styles.css'
import { links as testLinks } from './components/Test'
import { createGlobalStyle, ThemeProvider } from 'styled-components'
import reset from './styles/reset'
import { ThemePreferenceProvider, theme } from './theme'
import { ThemeToggle } from './theme/ThemeToggle'
import { colorSchemeCookie, getColorScheme } from './theme/cookies'
import { createHead } from 'remix-island'

export const headers: HeadersFunction = () => ({
    'Accept-CH': 'Sec-CH-Prefers-Color-Scheme',
})

export const loader: LoaderFunction = async ({ request }) => ({
    colorScheme: await getColorScheme(request),
})

// export const action: ActionFunction = async ({ request }) => {
//     const currentColorScheme = await getColorScheme(request)
//     const newColorScheme = currentColorScheme === 'light' ? 'dark' : 'light'
//     console.log('new color scheme', newColorScheme)
//     return redirect(request.url, {
//         headers: {
//             'Set-Cookie': await colorSchemeCookie.serialize(newColorScheme),
//         },
//     })
// }

const GlobalStyle = createGlobalStyle`
  ${reset}
  html body {
    height: 100vh;
    width: 100vw;
    font-family: Lato, Montserrat, sans-serif;
    font-size: 16px;
    scroll-behavior: smooth;
    transition: all 0.30s ease-in-out;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.body};
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  &::-webkit-scrollbar {
    width: 3px;
  }
`

export const meta: MetaFunction = () => ({
    charset: 'utf-8',
    title: 'New Remix App',
    viewport: 'width=device-width,initial-scale=1',
})

export const links: LinksFunction = () => {
    return [...testLinks(), { rel: 'stylesheet', href: globalStyles }]
}

export const Head = createHead(() => (
    <>
        <Meta />
        <Links />
    </>
))

export default function App() {
    const { colorScheme } = useLoaderData()

    return (
        <>
            <Head />
            <ThemePreferenceProvider defaultTheme={colorScheme as string}>
                <GlobalStyle />
                <ThemeToggle />
                <Outlet />
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
            </ThemePreferenceProvider>
        </>
    )
}

// export default function App() {
//     const { colorScheme } = useLoaderData()
//     return (
//         <html lang="en">
//             <head>
//                 <Head />
//             </head>
//             <ThemePreferenceProvider defaultTheme={colorScheme as string}>
//                 <body>
//                     <GlobalStyle />
//                     <Outlet />
//                     <ScrollRestoration />
//                     <Scripts />
//                     <LiveReload />
//                 </body>
//             </ThemePreferenceProvider>
//         </html>
//     )
// }
