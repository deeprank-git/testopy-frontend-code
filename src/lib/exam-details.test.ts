import { describe, it, expect } from "vitest";
import { filledExamDetails, parseDetailText, toExamDetailsForm } from "./exam-details";

describe("parseDetailText", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(parseDetailText("Age limit: 18-32 years\nRelaxation as per rules\n\nNationality: Indian")).toEqual([
      { type: "p", lines: ["Age limit: 18-32 years", "Relaxation as per rules"] },
      { type: "p", lines: ["Nationality: Indian"] },
    ]);
  });

  it("groups -, * and • lines into bullet lists, mixed with paragraphs", () => {
    expect(parseDetailText("Tier 1 subjects:\n- Reasoning\n* Quant\n• English\nTotal: 200 marks")).toEqual([
      { type: "p", lines: ["Tier 1 subjects:"] },
      { type: "ul", items: ["Reasoning", "Quant", "English"] },
      { type: "p", lines: ["Total: 200 marks"] },
    ]);
  });

  it("treats markup as plain text and ignores empty input", () => {
    expect(parseDetailText("<script>alert(1)</script>")).toEqual([
      { type: "p", lines: ["<script>alert(1)</script>"] },
    ]);
    expect(parseDetailText("")).toEqual([]);
    expect(parseDetailText(undefined)).toEqual([]);
    expect(parseDetailText("\r\n- \r\n")).toEqual([]);
  });
});

describe("filledExamDetails / toExamDetailsForm", () => {
  it("lists sections with text, in display order", () => {
    expect(filledExamDetails({ syllabus: "x", eligibility: "y", pattern: "  " })).toEqual(["eligibility", "syllabus"]);
    expect(filledExamDetails(undefined)).toEqual([]);
  });

  it("fills missing sections with empty text", () => {
    expect(toExamDetailsForm({ pattern: "p" })).toEqual({ eligibility: "", pattern: "p", syllabus: "" });
    expect(toExamDetailsForm(null)).toEqual({ eligibility: "", pattern: "", syllabus: "" });
  });
});
