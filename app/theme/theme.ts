export type ThemeType = typeof light // This is the type definition for my theme object.

export const base = {
    borderRadius: {
        none: '0',
        xs: '4px',
        sm: '8px',
        md: '16px',
        circle: '50%',
    },
    boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)',
    fontFamily: {
        heading: 'Montserrat, sans-serif',
        body: 'Lato, sans-serif',
        code: 'Roboto Mono, monospace',
    },
    fontSizes: {
        small: '12px',
        medium: '16px',
        large: '20px',
    },
    spaces: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
    },
    breakpoints: {
        xs: '320px',
        sm: '480px',
        md: '768px',
        lg: '1024px',
        xl: '1200px',
    },
}

export const light = {
    colors: {
        background: '#f8f5f2',
        primary: '#078080',
        secondary: '#f45d48',
        tertiary: '#f8f5f2',
        highlights: {
            primary: '#ff77ee',
            secondary: '#FFD60A',
        },
        text: {
            heading: '#232323',
            body: '#222525',
            inverse: '#fffffe',
        },
        danger: '#e74c3c',
    },
}

export const dark = {
    colors: {
        background: '#232323',
        primary: '#FFD60A',
        secondary: '#ff77ee',
        tertiary: '#444444',
        highlights: {
            primary: '#078080',
            secondary: '#f45d48',
        },
        text: {
            heading: '#fffffe',
            body: '#dddddd',
            inverse: '#232323',
        },
        danger: '#e74c3c',
    },
}

export const theme = light
export const themeMap: Record<'light' | 'dark' | string, ThemeType> = {
    light,
    dark,
}
