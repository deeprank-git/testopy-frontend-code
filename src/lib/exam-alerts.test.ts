import { describe, it, expect } from "vitest";
import {
  alertDay,
  alertStatus,
  alertListParams,
  formatAlertDate,
  withAlertCategories,
  type AlertFilters,
  type ExamAlert,
} from "./exam-alerts";

// 24 Nov 2026, 3pm in the machine's local time zone.
const NOW = new Date(2026, 10, 24, 15, 0);
let seq = 0;
const alert = (over: Partial<ExamAlert> = {}): ExamAlert => ({
  _id: `a${++seq}`,
  title: "Alert",
  type: "exam_date",
  date: "2026-11-24T00:00:00.000Z",
  createdAt: "2026-11-01T10:00:00.000Z",
  category: null,
  ...over,
});
const ALL: AlertFilters = {
  tab: "all",
  category: "all",
  type: "all",
  month: "all",
  status: "all",
};

describe("alertDay / formatAlertDate", () => {
  it("reads the UTC calendar day", () => {
    expect(alertDay(alert({ date: "2026-12-05T00:00:00.000Z" }))).toBe("2026-12-05");
  });
  it("formats as dd Mon yyyy", () => {
    const text = formatAlertDate("2026-12-05T00:00:00.000Z");
    expect(text).toContain("05");
    expect(text).toContain("Dec");
    expect(text).toContain("2026");
  });
});

describe("alertStatus", () => {
  it("is upcoming today and later, past before today", () => {
    expect(alertStatus(alert({ date: "2026-11-24T00:00:00.000Z" }), NOW)).toBe("upcoming");
    expect(alertStatus(alert({ date: "2026-12-01T00:00:00.000Z" }), NOW)).toBe("upcoming");
    expect(alertStatus(alert({ date: "2026-11-23T00:00:00.000Z" }), NOW)).toBe("past");
  });
});

describe("withAlertCategories", () => {
  it("adds categories that only appear on alerts (e.g. archived), once, after the active ones", () => {
    const active = [{ _id: "c1", name: "SSC" }];
    const alerts = [
      alert({ category: { _id: "c1", name: "SSC" } }),
      alert({ category: { _id: "c9", name: "Old" } }),
      alert({ category: { _id: "c9", name: "Old" } }),
      alert({ category: null }),
    ];
    expect(withAlertCategories(active, alerts)).toEqual([
      { _id: "c1", name: "SSC" },
      { _id: "c9", name: "Old" },
    ]);
  });
});

describe("alertListParams", () => {
  const TODAY = "2026-11-24";
  it("sends nothing for no filters", () => {
    expect(alertListParams(ALL, TODAY)).toEqual({});
  });
  it("maps the tab or the type dropdown to type", () => {
    expect(alertListParams({ ...ALL, tab: "result" }, TODAY)).toEqual({ type: "result" });
    expect(alertListParams({ ...ALL, type: "admit_card" }, TODAY)).toEqual({ type: "admit_card" });
    expect(alertListParams({ ...ALL, tab: "result", type: "result" }, TODAY)).toEqual({
      type: "result",
    });
  });
  it("returns null when the tab and type dropdown disagree (nothing can match)", () => {
    expect(alertListParams({ ...ALL, tab: "result", type: "admit_card" }, TODAY)).toBeNull();
  });
  it("maps category, month of year, and status with today", () => {
    expect(
      alertListParams({ ...ALL, category: "c1", month: "12", status: "upcoming" }, TODAY),
    ).toEqual({ category: "c1", monthOfYear: "12", status: "upcoming", today: TODAY });
  });
});
