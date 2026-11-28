// Current-affairs article text -> blocks to render (components/site/ArticleBody.tsx).
//
// The scrapers write (backend scrapers/article_text.py):
//   ## Heading
//   A paragraph on one line.
//   - Bullet
//     - Nested bullet (two spaces per level)
//   | Header | Header |
//   | Cell   | Cell   |
// with a blank line between blocks. Text written by admins in the editor is
// usually one paragraph per line, so a line is its own paragraph unless the
// text uses blank lines between blocks (then lines of one block are joined —
// older scraped text broke sentences at every link).

export type ArticleListItem = { text: string; children: ArticleListItem[] };

export type ArticleBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: ArticleListItem[] }
  | { type: "table"; header: string[]; rows: string[][] };

const BULLET = /^(\s*)[-•]\s+(.*)$/;
const HEADING = /^#{2,3}\s+(.*)$/;
const TABLE_ROW = /^\|(.*)\|\s*$/;
const PUNCTUATION_ONLY = /^[,.;:!?)\]]+$/;

/** "India , 16th" -> "India, 16th"; "( DBT )" -> "(DBT)". */
export const tidyInline = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?)\]%])/g, "$1")
    .replace(/([([])\s+/g, "$1")
    .trim();

function buildTree(flat: { text: string; level: number }[]): ArticleListItem[] {
  const root: ArticleListItem[] = [];
  const stack: { level: number; children: ArticleListItem[] }[] = [{ level: -1, children: root }];
  for (const { text, level } of flat) {
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
    const item = { text, children: [] };
    stack[stack.length - 1].children.push(item);
    stack.push({ level, children: item.children });
  }
  return root;
}

export function parseArticleContent(
  content: string | null | undefined,
  title = "",
): ArticleBlock[] {
  const text = (content ?? "").replace(/\r\n?/g, "\n");
  const joinLines = /\n\s*\n/.test(text);
  const blocks: ArticleBlock[] = [];
  let list: { text: string; level: number }[] | null = null;
  let table: string[][] | null = null;
  let para: string[] | null = null;

  const flush = () => {
    if (list) blocks.push({ type: "list", items: buildTree(list) });
    if (table) {
      if (table.length === 1) blocks.push({ type: "paragraph", text: table[0].join(" — ") });
      else blocks.push({ type: "table", header: table[0], rows: table.slice(1) });
    }
    if (para) blocks.push({ type: "paragraph", text: tidyInline(para.join(" ")) });
    list = table = para = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flush();
      continue;
    }
    const bullet = BULLET.exec(line);
    const heading = HEADING.exec(line.trim());
    const row = TABLE_ROW.exec(line.trim());

    if (bullet) {
      if (!list) flush();
      list ??= [];
      list.push({
        text: tidyInline(bullet[2]),
        level: Math.floor(bullet[1].replace(/\t/g, "  ").length / 2),
      });
    } else if (heading) {
      flush();
      blocks.push({ type: "heading", text: tidyInline(heading[1]) });
    } else if (row) {
      if (!table) flush();
      table ??= [];
      table.push(row[1].split("|").map(tidyInline));
    } else if (
      PUNCTUATION_ONLY.test(line.trim()) &&
      (para || blocks.at(-1)?.type === "paragraph")
    ) {
      // A stray "," left on its own line by older scraped text.
      if (para) para[para.length - 1] += line.trim();
      else (blocks.at(-1) as { text: string }).text += line.trim();
    } else if (para && joinLines) {
      para.push(line.trim());
    } else {
      flush();
      para = [line.trim()];
    }
  }
  flush();

  // Older scraped text began with the breadcrumb ("Home") and the title.
  const t = title.trim().toLowerCase();
  while (blocks.length && blocks[0].type === "paragraph") {
    const first = blocks[0].text.trim().toLowerCase();
    if (first === "home" || (t && first === t)) blocks.shift();
    else break;
  }
  return blocks.filter((b) => b.type !== "paragraph" || b.text);
}

/** "Label: rest" -> ["Label", "rest"] for a short leading label, else null. */
export function splitLeadLabel(text: string): [string, string] | null {
  const m = /^([A-Za-z][^:.?!]{1,58}):\s+(\S.*)$/.exec(text);
  return m ? [m[1], m[2]] : null;
}
