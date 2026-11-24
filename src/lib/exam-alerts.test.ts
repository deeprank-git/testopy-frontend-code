import { describe, it, expect } from "vitest";
import {
  alertDay,
  alertStats,
  alertStatus,
  daysUntilLabel,
  filterAlerts,
  formatAlertDate,
  upcomingSoon,
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

describe("daysUntilLabel", () => {
  it.each([
    ["2026-11-24", "Today"],
    ["2026-11-25", "Tomorrow"],
    ["2026-11-29", "In 5 days"],
    ["2026-11-20", "Past"],
  ])("%s → %s", (ymd, label) => {
    expect(daysUntilLabel(alert({ date: `${ymd}T00:00:00.000Z` }), NOW)).toBe(label);
  });
});

describe("alertStats", () => {
  it("counts upcoming exam dates, alerts created this week, and total", () => {
    const stats = alertStats(
      [
        alert({ type: "exam_date", date: "2026-12-01T00:00:00.000Z" }), // upcoming exam
        alert({ type: "exam_date", date: "2026-11-01T00:00:00.000Z" }), // past exam
        alert({ type: "result", date: "2026-12-01T00:00:00.000Z" }), // upcoming, not an exam
        alert({ createdAt: new Date(NOW.getTime() - 2 * 86_400_000).toISOString() }), // new
      ],
      NOW,
    );
    expect(stats).toEqual({ upcomingExams: 2, newThisWeek: 1, total: 4 });
  });
});

describe("filterAlerts", () => {
  const ssc = { _id: "c1", name: "SSC" };
  const rows = [
    alert({ _id: "x1", type: "exam_date", date: "2026-12-05T00:00:00.000Z", category: ssc }),
    alert({ _id: "x2", type: "registration", date: "2026-12-20T00:00:00.000Z" }),
    alert({ _id: "x3", type: "result", date: "2026-10-01T00:00:00.000Z", category: ssc }),
  ];
  const ids = (f: Partial<AlertFilters>) =>
    filterAlerts(rows, { ...ALL, ...f }, NOW).map((a) => a._id);

  it("returns everything with no filters", () => expect(ids({})).toEqual(["x1", "x2", "x3"]));
  it("filters by tab", () => expect(ids({ tab: "registration" })).toEqual(["x2"]));
  it("filters by type", () => expect(ids({ type: "result" })).toEqual(["x3"]));
  it("filters by category", () => expect(ids({ category: "c1" })).toEqual(["x1", "x3"]));
  it("filters by month (MM)", () => expect(ids({ month: "12" })).toEqual(["x1", "x2"]));
  it("filters by status", () => {
    expect(ids({ status: "upcoming" })).toEqual(["x1", "x2"]);
    expect(ids({ status: "past" })).toEqual(["x3"]);
  });
  it("combines filters", () => expect(ids({ category: "c1", status: "upcoming" })).toEqual(["x1"]));
});

describe("upcomingSoon", () => {
  it("returns upcoming alerts soonest first, capped", () => {
    const rows = [
      alert({ _id: "late", date: "2026-12-20T00:00:00.000Z" }),
      alert({ _id: "past", date: "2026-11-01T00:00:00.000Z" }),
      alert({ _id: "soon", date: "2026-11-25T00:00:00.000Z" }),
      alert({ _id: "mid", date: "2026-12-01T00:00:00.000Z" }),
    ];
    expect(upcomingSoon(rows, 2, NOW).map((a) => a._id)).toEqual(["soon", "mid"]);
  });
});
