// Pure business rules for the admin Exams drill-down. No React, no I/O —
// unit-tested in exam-rules.test.ts.

export type SectionDraft = {
  _id?: string;
  name: string;
  no_of_questions: number;
  no_of_marks: number;
  duration: number;
};

export type QuestionLike = { section: string; isActive?: boolean };

export type FillStatus = "empty" | "partial" | "full" | "over";
export type SectionFill = { id: string; name: string; planned: number; filled: number; status: FillStatus };

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function sectionTotals(sections: SectionDraft[]) {
  return sections.reduce(
    (acc, s) => ({
      questions: acc.questions + num(s.no_of_questions),
      marks: acc.marks + num(s.no_of_marks),
      duration: acc.duration + num(s.duration),
    }),
    { questions: 0, marks: 0, duration: 0 },
  );
}

export function sectionFill(sections: SectionDraft[], questions: QuestionLike[]): SectionFill[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    if (q.isActive === false) continue;
    counts.set(String(q.section), (counts.get(String(q.section)) ?? 0) + 1);
  }
  return sections.map((s) => {
    const id = String(s._id ?? "");
    const planned = num(s.no_of_questions);
    const filled = counts.get(id) ?? 0;
    const status: FillStatus =
      filled === 0 ? "empty" : filled < planned ? "partial" : filled === planned ? "full" : "over";
    return { id, name: s.name, planned, filled, status };
  });
}

export function canPublishTest(
  sections: SectionDraft[],
  questions: QuestionLike[],
): { ok: true } | { ok: false; reason: string } {
  if (sections.length === 0) return { ok: false, reason: "Add at least one section" };
  for (const s of sectionFill(sections, questions)) {
    const missing = s.planned - s.filled;
    if (missing > 0) {
      return { ok: false, reason: `${s.name} needs ${missing} more question${missing === 1 ? "" : "s"}` };
    }
  }
  return { ok: true };
}

export function validateSections(sections: SectionDraft[]): string | null {
  if (sections.length === 0) return "Add at least one section";
  const seen = new Set<string>();
  for (const [i, s] of sections.entries()) {
    const name = s.name.trim();
    if (!name) return `Section ${i + 1}: name is required`;
    if (!(num(s.no_of_questions) > 0 && num(s.no_of_marks) > 0 && num(s.duration) > 0)) {
      return `Section ${i + 1}: questions, marks and minutes must be greater than 0`;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) return `Duplicate section name "${key}"`;
    seen.add(key);
  }
  return null;
}

export type QuestionForm = {
  section: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  marks: number;
};

export const emptyQuestionForm = (section: string, marks: number): QuestionForm => ({
  section,
  questionText: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
  marks,
});

export const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

export function validateQuestionForm(f: QuestionForm): Partial<Record<keyof QuestionForm, string>> {
  const errors: Partial<Record<keyof QuestionForm, string>> = {};
  if (!f.section) errors.section = "Pick a section";
  if (!f.questionText.trim()) errors.questionText = "Question text is required";
  if (f.options.length !== 4 && f.options.length !== 5) {
    errors.options = "Use 4 or 5 options";
  } else {
    const blank = f.options.findIndex((o) => !o.trim());
    if (blank !== -1) errors.options = `Option ${OPTION_LETTERS[blank]} is empty`;
  }
  if (!Number.isInteger(f.correctAnswer) || f.correctAnswer < 0 || f.correctAnswer >= f.options.length) {
    errors.correctAnswer = "Mark the correct answer";
  }
  if (!(num(f.marks) > 0)) errors.marks = "Marks must be greater than 0";
  return errors;
}

// Mirrors CSV_COLUMNS in backend controllers/questionController.js
// (option5 optional; correctAnswer is 1-based in the CSV).
const CSV_COLUMNS = [
  "test",
  "section",
  "questionText",
  "option1",
  "option2",
  "option3",
  "option4",
  "option5",
  "correctAnswer",
  "marks",
  "explanation",
  "order",
];

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Default marks for one question in a section: section marks / section questions (min 1). */
export const marksPerQuestionFor = (s: SectionDraft) =>
  num(s.no_of_questions) > 0 ? Math.max(0.25, num(s.no_of_marks) / num(s.no_of_questions)) : 1;

export function buildQuestionCsvTemplate(testId: string, sections: SectionDraft[]): string {
  const rows = sections.map((s) =>
    [
      testId,
      s.name,
      "Sample question text",
      "Option 1",
      "Option 2",
      "Option 3",
      "Option 4",
      "",
      "1",
      String(marksPerQuestionFor(s)),
      "Optional explanation",
      "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}
