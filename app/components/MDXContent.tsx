import { getMDXComponent } from '~/utils/mdx.client'
import { Button } from './Button'
export const MDXContent = ({ html, code }: { html: string; code: string }) => {
    let Component = null
    if (typeof window !== 'undefined' && code) {
        // console.log("MDX CODEEEEE")
        Component = getMDXComponent(code, {
            Button: Button,
        })
    } else {
        // console.log("MDX HTML", html)
    }
    const classes = `prose dark:prose-invert prose-slate`
    return (
        <>
            {Component ? (
                <main className={classes}>
                    <Component />
                </main>
            ) : (
                <main
                    className={classes}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            )}
        </>
    )
}
