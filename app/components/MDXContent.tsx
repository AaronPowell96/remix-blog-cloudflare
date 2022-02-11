import { getMDXComponent } from "~/utils/mdx.client";

export const MDXContent = ({html, code}: {html: string, code: string}) => {
    let Component = null;
    if (typeof window !== "undefined" && code) {
      Component = getMDXComponent(code);
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
    );
}