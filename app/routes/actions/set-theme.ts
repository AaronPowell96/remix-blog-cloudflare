import { themeMap } from '~/theme'
import type {
    ActionFunction,
    HeadersFunction,
    LoaderFunction,
} from '@remix-run/cloudflare'
import { json, redirect } from '@remix-run/cloudflare'
import { colorSchemeCookie, getColorScheme } from '~/theme/cookies'

export const headers: HeadersFunction = () => ({
    'Accept-CH': 'Sec-CH-Prefers-Color-Scheme',
})

export const action: ActionFunction = async ({ request }) => {
    const theme = await getColorScheme(request)
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    if (!themeMap?.[newTheme]) {
        return json({
            success: false,
            message: `theme value of ${newTheme} is not a valid theme`,
        })
    }

    return json(
        { success: true },
        {
            headers: {
                'Set-Cookie': await colorSchemeCookie.serialize(newTheme),
            },
        }
    )
}

export const loader: LoaderFunction = () => redirect('/', { status: 404 })
