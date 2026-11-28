import type { ReactNode } from "react";
import { linkify } from "@/lib/articleContent";
import {
  parseArticleContent,
  splitLeadLabel,
  type ArticleBlock,
  type ArticleListItem,
} from "@/lib/article-content";
import { cn } from "@/lib/utils";

// The body of a current-affairs article: headings, paragraphs, bullet lists
// and tables parsed from the stored text (lib/article-content.ts). A short
// "Label:" at the start of a paragraph or bullet is set in bold, and URLs
// become links.
export function ArticleBody({
  content,
  title,
  className,
}: {
  content: string | null | undefined;
  title?: string;
  className?: string;
}) {
  const blocks = parseArticleContent(content, title);
  if (blocks.length === 0) {
    return <p className="text-muted-foreground italic">No content available for this article.</p>;
  }
  return (
    <div
      className={cn(
        "max-w-[720px] text-[16px] leading-7 text-foreground/85 md:text-[17px] md:leading-8",
        className,
      )}
    >
      {blocks.map((block, i) => (
        <Block key={i} block={block} first={i === 0} />
      ))}
    </div>
  );
}

function Inline({ text }: { text: string }): ReactNode {
  const label = splitLeadLabel(text);
  if (!label) return <>{linkify(text)}</>;
  return (
    <>
      <strong className="font-semibold text-foreground">{label[0]}:</strong> {linkify(label[1])}
    </>
  );
}

function List({ items, level = 0 }: { items: ArticleListItem[]; level?: number }) {
  return (
    <ul
      className={cn(
        "space-y-2 pl-5",
        level === 0
          ? "mt-4 list-disc marker:text-primary"
          : "mt-2 list-[circle] marker:text-muted-foreground",
      )}
    >
      {items.map((item, i) => (
        <li key={i} className="pl-1">
          <Inline text={item.text} />
          {item.children.length > 0 && <List items={item.children} level={level + 1} />}
        </li>
      ))}
    </ul>
  );
}

function Block({ block, first }: { block: ArticleBlock; first: boolean }) {
  switch (block.type) {
    case "heading":
      return (
        <h2
          className={cn(
            "font-display text-xl font-bold leading-snug tracking-tight text-foreground md:text-[22px]",
            first ? "mb-3" : "mb-3 mt-10",
          )}
        >
          {block.text}
        </h2>
      );
    case "list":
      return <List items={block.items} />;
    case "table":
      return (
        <div className="mt-5 overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-sm leading-6">
            <thead className="bg-muted/60">
              <tr>
                {block.header.map((cell, i) => (
                  <th key={i} className="px-3 py-2 font-semibold text-foreground">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t border-border align-top">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={cn("px-3 py-2", c === 0 && "font-medium text-foreground")}
                    >
                      {linkify(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return (
        <p className={first ? undefined : "mt-5"}>
          <Inline text={block.text} />
        </p>
      );
  }
}
