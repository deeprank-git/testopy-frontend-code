import { describe, it, expect } from "vitest";
import {
  sectionTotals,
  sectionFill,
  canPublishTest,
  validateSections,
  validateQuestionForm,
  emptyQuestionForm,
  buildQuestionCsvTemplate,
} from "./exam-rules";

const sections = [
  { _id: "s1", name: "Reasoning", no_of_questions: 2, no_of_marks: 4, duration: 10 },
  { _id: "s2", name: "Quant", no_of_questions: 1, no_of_marks: 2, duration: 5 },
];

describe("sectionTotals", () => {
  it("sums questions, marks and duration", () => {
    expect(sectionTotals(sections)).toEqual({ questions: 3, marks: 6, duration: 15 });
  });
  it("treats blank/NaN inputs as 0", () => {
    expect(
      sectionTotals([{ name: "x", no_of_questions: NaN, no_of_marks: 0, duration: 0 }]),
    ).toEqual({
      questions: 0,
      marks: 0,
      duration: 0,
    });
  });
});

describe("sectionFill", () => {
  it("counts only active questions per section and classifies status", () => {
    const qs = [
      { section: "s1", isActive: true },
      { section: "s1", isActive: false },
      { section: "s2", isActive: true },
    ];
    expect(sectionFill(sections, qs)).toEqual([
      { id: "s1", name: "Reasoning", planned: 2, filled: 1, status: "partial" },
      { id: "s2", name: "Quant", planned: 1, filled: 1, status: "full" },
    ]);
  });
  it("reports empty and over", () => {
    const qs = [{ section: "s2" }, { section: "s2" }];
    expect(sectionFill(sections, qs).map((s) => s.status)).toEqual(["empty", "over"]);
  });
});

describe("canPublishTest", () => {
  it("blocks when any section is short and names it", () => {
    expect(canPublishTest(sections, [{ section: "s1" }, { section: "s2" }])).toEqual({
      ok: false,
      reason: "Reasoning needs 1 more question",
    });
  });
  it("blocks a test with no sections", () => {
    expect(canPublishTest([], []).ok).toBe(false);
  });
  it("allows when every section is filled", () => {
    const qs = [{ section: "s1" }, { section: "s1" }, { section: "s2" }];
    expect(canPublishTest(sections, qs)).toEqual({ ok: true });
  });
});

describe("validateSections", () => {
  it("requires at least one section", () => {
    expect(validateSections([])).toBe("Add at least one section");
  });
  it("requires names and positive numbers", () => {
    expect(validateSections([{ name: " ", no_of_questions: 1, no_of_marks: 1, duration: 1 }])).toBe(
      "Section 1: name is required",
    );
    expect(validateSections([{ name: "A", no_of_questions: 0, no_of_marks: 1, duration: 1 }])).toBe(
      "Section 1: questions, marks and minutes must be greater than 0",
    );
  });
  it("rejects duplicate names (CSV upload matches sections by name)", () => {
    const s = { no_of_questions: 1, no_of_marks: 1, duration: 1 };
    expect(
      validateSections([
        { name: "A", ...s },
        { name: "a ", ...s },
      ]),
    ).toBe('Duplicate section name "a"');
  });
  it("returns null when valid", () => {
    expect(validateSections(sections)).toBeNull();
  });
});

describe("validateQuestionForm", () => {
  const valid = {
    ...emptyQuestionForm("s1", 2),
    questionText: "Q?",
    options: ["a", "b", "c", "d"],
    correctAnswer: 1,
  };
  it("accepts a valid form", () => {
    expect(validateQuestionForm(valid)).toEqual({});
  });
  it("flags missing fields", () => {
    const errors = validateQuestionForm({
      ...valid,
      section: "",
      questionText: "  ",
      options: ["a", "", "c", "d"],
    });
    expect(errors).toEqual({
      section: "Pick a section",
      questionText: "Question text is required",
      options: "Option B is empty",
    });
  });
  it("requires 4 or 5 options and a correct answer within range", () => {
    expect(validateQuestionForm({ ...valid, options: ["a", "b", "c"] }).options).toBe(
      "Use 4 or 5 options",
    );
    expect(validateQuestionForm({ ...valid, correctAnswer: 4 }).correctAnswer).toBe(
      "Mark the correct answer",
    );
  });
  it("requires positive marks", () => {
    expect(validateQuestionForm({ ...valid, marks: 0 }).marks).toBe("Marks must be greater than 0");
  });
});

describe("buildQuestionCsvTemplate", () => {
  it("pre-fills the test id and one example row per section", () => {
    const csv = buildQuestionCsvTemplate("t1", sections);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "test,section,questionText,option1,option2,option3,option4,option5,correctAnswer,marks,explanation,order",
    );
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith("t1,Reasoning,")).toBe(true);
    expect(lines[2].startsWith("t1,Quant,")).toBe(true);
  });
  it("quotes values containing commas", () => {
    const csv = buildQuestionCsvTemplate("t1", [{ ...sections[0], name: "GA, CA" }]);
    expect(csv.split("\n")[1].startsWith('t1,"GA, CA",')).toBe(true);
  });
});
