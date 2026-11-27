import { describe, it, expect } from "vitest";
import {
  formatImportantDate,
  formatImportantDateEntry,
  fromDateRows,
  IMPORTANT_DATE_TEXT_MAX,
  toDateRows,
  validateDateRows,
  type DateRow,
} from "./important-dates";

const row = (p: Partial<DateRow>): DateRow => ({ label: "Exam", from: "", to: "", text: "", ...p });

describe("formatImportantDateEntry", () => {
  const d = formatImportantDate;
  it("formats exact days and ranges", () => {
    expect(formatImportantDateEntry({ from: "2026-07-01", to: "2026-07-01" })).toBe(d("2026-07-01"));
    expect(formatImportantDateEntry({ from: "2026-09-30", to: "2026-10-30" })).toBe(
      `${d("2026-09-30")} - ${d("2026-10-30")}`,
    );
  });
  it("shows text alone, or as a note beside dates", () => {
    expect(formatImportantDateEntry({ text: "December 2026" })).toBe("December 2026");
    expect(formatImportantDateEntry({ from: "2026-07-26", to: "2026-07-26", text: "Extended" })).toBe(
      `${d("2026-07-26")} · Extended`,
    );
  });
  it("tolerates legacy and empty values", () => {
    expect(formatImportantDateEntry("July 2025")).toBe("July 2025");
    expect(formatImportantDateEntry({})).toBe("—");
    expect(formatImportantDateEntry({ text: "  " })).toBe("—");
    expect(formatImportantDateEntry(null)).toBe("—");
  });
});

describe("toDateRows / fromDateRows", () => {
  it("keeps every entry, including text-only and legacy strings", () => {
    expect(
      toDateRows({
        "Exam Date": { from: "2026-09-30", to: "2026-10-30" },
        "Tier 2": { text: "December 2026" },
        "Last Date": { from: "2026-07-26", to: "2026-07-26", text: "Extended" },
        Old: "July 2025",
      }),
    ).toEqual([
      { label: "Exam Date", from: "2026-09-30", to: "2026-10-30", text: "" },
      { label: "Tier 2", from: "", to: "", text: "December 2026" },
      { label: "Last Date", from: "2026-07-26", to: "2026-07-26", text: "Extended" },
      { label: "Old", from: "", to: "", text: "July 2025" },
    ]);
    expect(toDateRows(undefined)).toEqual([]);
  });

  it("sends only the parts each row has, trimmed", () => {
    expect(
      fromDateRows([
        row({ label: " Exam Date ", from: "2026-09-30", to: "2026-10-30" }),
        row({ label: "Tier 2", text: "  December   2026 " }),
        row({ label: "Last Date", from: "2026-07-26", to: "2026-07-26", text: "Extended" }),
      ]),
    ).toEqual({
      "Exam Date": { from: "2026-09-30", to: "2026-10-30" },
      "Tier 2": { text: "December 2026" },
      "Last Date": { from: "2026-07-26", to: "2026-07-26", text: "Extended" },
    });
  });

  it("round-trips stored entries unchanged", () => {
    const stored = {
      A: { from: "2026-01-01", to: "2026-01-02" },
      B: { text: "TBA" },
      C: { from: "2026-03-01", to: "2026-03-01", text: "Revised" },
    };
    expect(fromDateRows(toDateRows(stored))).toEqual(stored);
  });
});

describe("validateDateRows", () => {
  it("accepts dates, text, or both", () => {
    expect(
      validateDateRows([
        row({ label: "A", from: "2026-01-01", to: "2026-01-01" }),
        row({ label: "B", text: "TBA" }),
        row({ label: "C", from: "2026-01-01", to: "2026-01-03", text: "Extended" }),
      ]),
    ).toBeNull();
  });

  it.each([
    [[row({ label: " ", text: "TBA" })], /label is required/],
    [[row({ label: "A", text: "x" }), row({ label: " A ", text: "y" })], /listed twice/],
    [[row({ from: "2026-01-01" })], /pick both dates/],
    [[row({ from: "2026-01-05", to: "2026-01-01" })], /start date is after end date/],
    [[row({ text: "   " })], /pick dates or enter text/],
    [[row({ text: "a".repeat(IMPORTANT_DATE_TEXT_MAX + 1) })], /at most/],
  ])("rejects %j", (rows, message) => {
    expect(validateDateRows(rows)).toMatch(message);
  });
});
