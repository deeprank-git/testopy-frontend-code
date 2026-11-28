import { describe, expect, it } from "vitest";
import { parseArticleContent, splitLeadLabel, tidyInline } from "./article-content";

describe("parseArticleContent", () => {
  it("reads the scrapers' format: headings, paragraphs, nested bullets and tables", () => {
    const content = [
      "Intro paragraph.",
      "",
      "## Why in News?",
      "",
      "- Gana-Sanghas: republics.",
      "  - Etymology: equal status.",
      "    - Deeper.",
      "  - Geography: periphery.",
      "- Vedic assemblies.",
      "",
      "| Dimension | Ancient | Modern |",
      "| Voting | Clan chiefs | Universal |",
    ].join("\n");

    expect(parseArticleContent(content)).toEqual([
      { type: "paragraph", text: "Intro paragraph." },
      { type: "heading", text: "Why in News?" },
      {
        type: "list",
        items: [
          {
            text: "Gana-Sanghas: republics.",
            children: [
              { text: "Etymology: equal status.", children: [{ text: "Deeper.", children: [] }] },
              { text: "Geography: periphery.", children: [] },
            ],
          },
          { text: "Vedic assemblies.", children: [] },
        ],
      },
      {
        type: "table",
        header: ["Dimension", "Ancient", "Modern"],
        rows: [["Voting", "Clan chiefs", "Universal"]],
      },
    ]);
  });

  it("joins sentences that older scraped text broke at every link", () => {
    const legacy =
      "For Prelims:\nReserve Bank of India\n,\n16th Finance Commission\n,\nDBT\n\nWhy in News?";
    expect(parseArticleContent(legacy)).toEqual([
      {
        type: "paragraph",
        text: "For Prelims: Reserve Bank of India, 16th Finance Commission, DBT",
      },
      { type: "paragraph", text: "Why in News?" },
    ]);
  });

  it("keeps one paragraph per line for admin text without blank lines", () => {
    expect(parseArticleContent("First paragraph.\nSecond paragraph.")).toEqual([
      { type: "paragraph", text: "First paragraph." },
      { type: "paragraph", text: "Second paragraph." },
    ]);
  });

  it("drops a leading breadcrumb and repeated title", () => {
    const blocks = parseArticleContent(
      "Home\n\nTardigrades Found\n\nBody text.",
      "Tardigrades Found",
    );
    expect(blocks).toEqual([{ type: "paragraph", text: "Body text." }]);
  });

  it("handles empty content and a one-row table", () => {
    expect(parseArticleContent(null)).toEqual([]);
    expect(parseArticleContent("| Mains Practice Question: Discuss. |")).toEqual([
      { type: "paragraph", text: "Mains Practice Question: Discuss." },
    ]);
  });
});

describe("tidyInline / splitLeadLabel", () => {
  it("fixes spacing around punctuation", () => {
    expect(tidyInline("Reserve Bank ( RBI ) , and  more")).toBe("Reserve Bank (RBI), and more");
  });

  it("finds a short leading label only", () => {
    expect(splitLeadLabel("Heterotardigrade characters: dorsal plates.")).toEqual([
      "Heterotardigrade characters",
      "dorsal plates.",
    ]);
    expect(splitLeadLabel("The meeting ended at 10:30 with an agreement.")).toBeNull();
    expect(splitLeadLabel("No label here.")).toBeNull();
  });
});
