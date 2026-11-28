import { describe, expect, it } from "vitest";
import {
  describeRunOptions,
  formatDuration,
  timeAgo,
  toRunOptions,
  type ScriptOption,
} from "./scripts";

const options: ScriptOption[] = [
  { key: "details", type: "boolean", label: "Fill dates", description: "" },
  { key: "dryRun", type: "boolean", label: "Dry run", description: "" },
  { key: "limit", type: "number", label: "Max pages", description: "", min: 1 },
  { key: "date", type: "date", label: "Day", description: "" },
  { key: "files", type: "files", label: "Logos", description: "" },
];

describe("toRunOptions", () => {
  it("sends only ticked and filled options, numbers as numbers", () => {
    expect(
      toRunOptions(options, { details: true, dryRun: false, limit: " 20 ", date: "" }),
    ).toEqual({
      details: true,
      limit: 20,
    });
    expect(toRunOptions(options, { date: "2026-11-20", limit: "" })).toEqual({
      date: "2026-11-20",
    });
  });
});

describe("formatDuration", () => {
  it.each([
    ["2026-11-28T10:00:00Z", "2026-11-28T10:00:45Z", "45s"],
    ["2026-11-28T10:00:00Z", "2026-11-28T10:03:20Z", "3m 20s"],
    ["2026-11-28T10:00:00Z", "2026-11-28T11:04:00Z", "1h 4m"],
  ])("%s → %s = %s", (from, to, out) => expect(formatDuration(from, to)).toBe(out));
});

describe("timeAgo", () => {
  const now = new Date("2026-11-28T12:00:00Z").getTime();
  it.each([
    ["2026-11-28T11:59:30Z", "just now"],
    ["2026-11-28T11:55:00Z", "5 min ago"],
    ["2026-11-28T09:00:00Z", "3 h ago"],
    ["2026-11-27T10:00:00Z", "1 day ago"],
    ["2026-11-25T10:00:00Z", "3 days ago"],
  ])("%s → %s", (iso, out) => expect(timeAgo(iso, now)).toBe(out));
});

describe("describeRunOptions", () => {
  it("lists what a run was started with", () => {
    expect(describeRunOptions(options, { details: true, limit: 20 })).toEqual([
      "Fill dates",
      "Max pages: 20",
    ]);
    expect(describeRunOptions(options, {})).toEqual([]);
  });
});
