import type { ReactNode } from "react";

// Inline helpers for current-affairs article text (the block structure is
// parsed by lib/article-content.ts and rendered by components/site/ArticleBody).

export const ARTICLE_LINK_CLASS =
  "text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary transition-colors";

const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/g;

/** Plain text with raw http(s) URLs turned into links. */
export function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <a
        key={start}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        className={ARTICLE_LINK_CLASS}
      >
        {m[0]}
      </a>,
    );
    last = start + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
