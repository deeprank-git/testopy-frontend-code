// TestSeries.examDetails: Eligibility / Exam Pattern / Syllabus, written by
// admins as plain text (backend rules: utils/examDetails.js). No HTML is ever
// rendered — text is split into paragraphs and bullet lists here and output
// as React text nodes.
//
// Writing format (shown as help text in the admin form):
//   - a blank line starts a new paragraph
//   - a line starting with "- ", "* " or "• " is a bullet

export const EXAM_DETAIL_KEYS = ["eligibility", "pattern", "syllabus"] as const;
export type ExamDetailKey = (typeof EXAM_DETAIL_KEYS)[number];
export type ExamDetails = Partial<Record<ExamDetailKey, string>>;

export const EXAM_DETAIL_MAX = 20000;

export const EXAM_DETAIL_META: Record<ExamDetailKey, { title: string; hint: string }> = {
  eligibility: {
    title: "Eligibility",
    hint: "Nationality, age limit, qualification, age relaxation…",
  },
  pattern: {
    title: "Exam Pattern",
    hint: "Subjects, number of questions, marks, duration, negative marking…",
  },
  syllabus: {
    title: "Syllabus",
    hint: "Subject-wise topics covered in the exam…",
  },
};

export type DetailBlock = { type: "p"; lines: string[] } | { type: "ul"; items: string[] };

// Checked on trimmed lines, so a bare "-" (from "- ") is an empty bullet.
const BULLET = /^[-*•](?:\s+|$)/;

/** Plain text -> paragraphs (keeping single line breaks) and bullet lists. */
export function parseDetailText(text: string | undefined | null): DetailBlock[] {
  if (!text) return [];
  const blocks: DetailBlock[] = [];
  for (const chunk of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    let current: DetailBlock | null = null;
    for (const raw of chunk.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      if (BULLET.test(line)) {
        const item = line.replace(BULLET, "").trim();
        if (!item) continue;
        if (current?.type !== "ul") blocks.push((current = { type: "ul", items: [] }));
        current.items.push(item);
      } else {
        if (current?.type !== "p") blocks.push((current = { type: "p", lines: [] }));
        current.lines.push(line);
      }
    }
  }
  return blocks;
}

/** Sections that have text, in display order. */
export function filledExamDetails(details: ExamDetails | null | undefined): ExamDetailKey[] {
  return EXAM_DETAIL_KEYS.filter((k) => typeof details?.[k] === "string" && details[k]!.trim() !== "");
}

/** Form value with every section present (missing -> ""). */
export const toExamDetailsForm = (details: ExamDetails | null | undefined): Record<ExamDetailKey, string> => ({
  eligibility: details?.eligibility ?? "",
  pattern: details?.pattern ?? "",
  syllabus: details?.syllabus ?? "",
});
