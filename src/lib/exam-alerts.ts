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

const pad = (n: number) => String(n).padStart(2, "0");
export const localYmd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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

/** Query params for GET /exam-alerts, or null when the tab and type dropdown disagree (no match possible). */
export function alertListParams(
  f: AlertFilters,
  today: string,
): {
  type?: AlertType;
  category?: string;
  monthOfYear?: string;
  status?: AlertStatus;
  today?: string;
} | null {
  if (f.tab !== "all" && f.type !== "all" && f.tab !== f.type) return null;
  const type = f.tab !== "all" ? f.tab : f.type !== "all" ? f.type : undefined;
  return {
    ...(type ? { type } : {}),
    ...(f.category !== "all" ? { category: f.category } : {}),
    ...(f.month !== "all" ? { monthOfYear: f.month } : {}),
    ...(f.status !== "all" ? { status: f.status, today } : {}),
  };
}
