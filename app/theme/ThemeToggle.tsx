import type { ActionFunction } from '@remix-run/cloudflare'
import { redirect } from '@remix-run/cloudflare'
import { Form, useFetcher } from '@remix-run/react'
import { colorSchemeCookie, getColorScheme } from './cookies'
import { useThemePreference } from './ThemePreferenceProvider'

export const ThemeToggle = () => {
    const fetcher = useFetcher()
    const { currentTheme, setCurrentTheme } = useThemePreference()
    const toggleTheme = () =>
        setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')

    return (
        <fetcher.Form method="post" action="/actions/set-theme">
            <button type="submit" onClick={() => toggleTheme()}>
                Change Theme
            </button>
        </fetcher.Form>
    )
    //   <button onClick={toggleTheme}> Toggle Theme </button>
}
