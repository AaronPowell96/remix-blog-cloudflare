import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import React from 'react'
import { ThemeProvider } from 'styled-components'
import { themeMap } from './theme'

const ThemePreferenceContext = React.createContext<{
    currentTheme: string
    setCurrentTheme: (theme: 'light' | 'dark') => void
} | null>(null)

export const ThemePreferenceProvider: React.FC<
    PropsWithChildren<{ defaultTheme?: string }>
> = ({ defaultTheme = 'dark', children }) => {
    console.log('defaultTheme', defaultTheme)
    const [currentTheme, setCurrentTheme] = React.useState<'light' | 'dark'>(
        () =>
            (defaultTheme in themeMap && (defaultTheme as 'light' | 'dark')) ||
            'dark'
    )

    useEffect(() => {
        console.log('current theme', currentTheme)
    }, [currentTheme])

    return (
        <ThemePreferenceContext.Provider
            value={{ currentTheme, setCurrentTheme }}
        >
            <ThemeProvider theme={themeMap[currentTheme]}>
                {children}
            </ThemeProvider>
        </ThemePreferenceContext.Provider>
    )
}

export const useThemePreference = () => {
    const context = React.useContext(ThemePreferenceContext)
    if (context === null) {
        throw new Error(
            'useThemePreference must be used within a ThemePreferenceProvider'
        )
    }
    return context
}
