// Pure helpers for exam alerts (student page + admin page).
//
// Dates: admins pick a day with <input type="date">, the API stores it as UTC
// midnight. So an alert's calendar day is its *UTC* date, compared against the
// viewer's *local* today. Never use getDate()/getMonth() on an alert date.

export const ALERT_TYPES = ["exam_date", "registration", "admit_card", "result", "other"] as const;
export type AlertType = (typeof ALERT_TYPES)[number];
export type AlertStatus = "upcoming" | "past";

export type ExamAlert = {
  _id: string;
  title: string;
  description?: string;
  type: AlertType;
  date: string;
  category?: { _id: string; name: string; slug?: string } | null;
  link?: string;
  isActive?: boolean;
  createdAt: string;
};

export type AlertFilters = {
  tab: "all" | AlertType;
  category: string; // "all" or a category _id
  type: "all" | AlertType;
  month: string; // "all" or "01".."12"
  status: "all" | AlertStatus;
};

/** Labels and colours shared by the student and admin pages. */
export const ALERT_TYPE_META: Record<
  AlertType,
  { label: string; chip: string; iconBg: string; badge: string }
> = {
  exam_date: {
    label: "Exam Date",
    chip: "Exam date",
    iconBg: "bg-blue-50 text-blue-600",
    badge: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  registration: {
    label: "Registration Open",
    chip: "Registration",
    iconBg: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  },
  admit_card: {
    label: "Admit Card",
    chip: "Admit card",
    iconBg: "bg-violet-50 text-violet-600",
    badge: "bg-violet-100 text-violet-700 hover:bg-violet-100",
  },
  result: {
    label: "Result",
    chip: "Result",
    iconBg: "bg-orange-50 text-orange-600",
    badge: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  },
  other: {
    label: "Other",
    chip: "Other",
    iconBg: "bg-rose-50 text-rose-600",
    badge: "bg-rose-100 text-rose-700 hover:bg-rose-100",
  },
};

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const localYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "YYYY-MM-DD" the alert is about (UTC day). Also the value for <input type="date">. */
export const alertDay = (a: Pick<ExamAlert, "date">) => new Date(a.date).toISOString().slice(0, 10);

export const formatAlertDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export function alertStatus(a: Pick<ExamAlert, "date">, now: Date = new Date()): AlertStatus {
  return alertDay(a) >= localYmd(now) ? "upcoming" : "past";
}

export function daysUntilLabel(a: Pick<ExamAlert, "date">, now: Date = new Date()): string {
  const diff = Math.round((Date.parse(alertDay(a)) - Date.parse(localYmd(now))) / DAY_MS);
  if (diff < 0) return "Past";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

export function alertStats(alerts: ExamAlert[], now: Date = new Date()) {
  const weekAgo = now.getTime() - 7 * DAY_MS;
  return {
    upcomingExams: alerts.filter(
      (a) => a.type === "exam_date" && alertStatus(a, now) === "upcoming",
    ).length,
    newThisWeek: alerts.filter((a) => new Date(a.createdAt).getTime() >= weekAgo).length,
    total: alerts.length,
  };
}

export function filterAlerts(alerts: ExamAlert[], f: AlertFilters, now: Date = new Date()) {
  return alerts.filter(
    (a) =>
      (f.tab === "all" || a.type === f.tab) &&
      (f.type === "all" || a.type === f.type) &&
      (f.category === "all" || a.category?._id === f.category) &&
      (f.month === "all" || alertDay(a).slice(5, 7) === f.month) &&
      (f.status === "all" || alertStatus(a, now) === f.status),
  );
}

export function upcomingSoon(alerts: ExamAlert[], limit = 4, now: Date = new Date()) {
  return alerts
    .filter((a) => alertStatus(a, now) === "upcoming")
    .sort((x, y) => alertDay(x).localeCompare(alertDay(y)))
    .slice(0, limit);
}

/** Active categories plus any (e.g. archived) category still used by an alert, so filters can find it. */
export function withAlertCategories(
  categories: { _id: string; name: string }[],
  alerts: Pick<ExamAlert, "category">[],
): { _id: string; name: string }[] {
  const out = [...categories];
  const seen = new Set(categories.map((c) => c._id));
  for (const { category } of alerts) {
    if (category && !seen.has(category._id)) {
      seen.add(category._id);
      out.push({ _id: category._id, name: category.name });
    }
  }
  return out;
}
