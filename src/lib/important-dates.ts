import { CalendarDays } from "lucide-react";

// TestSeries.importantDates is { "<label>": entry }. Each entry has exact
// dates, free text, or both (backend rule: utils/importantDates.js):
//   { from: "2026-09-30", to: "2026-10-30" }                   exact range
//   { text: "December 2026" }                                  no exact day yet
//   { from: "2026-07-26", to: "2026-07-26", text: "Extended" } dates + a note
export type ImportantDateEntry = { from?: string; to?: string; text?: string };
export type ImportantDates = Record<string, ImportantDateEntry>;

export const IMPORTANT_DATE_TEXT_MAX = 120;

// Pinned locale so this renders identically during SSR and client hydration.
export const formatImportantDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// One entry as shown to students: "30 Sept 2026 - 30 Oct 2026",
// "26 Jul 2026 · Extended", "December 2026", or "—" when there's nothing.
// Tolerates legacy/odd values (plain strings, missing fields).
export function formatImportantDateEntry(value: unknown): string {
  if (typeof value === "string") return value.trim() || "—";
  if (!value || typeof value !== "object") return "—";
  const { from, to, text } = value as ImportantDateEntry;
  const note = typeof text === "string" ? text.trim() : "";
  let dates = "";
  if (from) {
    dates =
      to && to !== from
        ? `${formatImportantDate(from)} - ${formatImportantDate(to)}`
        : formatImportantDate(from);
  }
  if (dates && note) return `${dates} · ${note}`;
  return dates || note || "—";
}

// ── Admin form rows ──────────────────────────────────────────────────────────

export type DateRow = { label: string; from: string; to: string; text: string };

export const emptyDateRow = (): DateRow => ({ label: "", from: "", to: "", text: "" });

// Every stored entry becomes an editable row — nothing is dropped, so saving
// the form never silently deletes text-only dates. Legacy plain-string values
// become text.
export function toDateRows(value: unknown): DateRow[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).map(([label, v]) => {
    if (typeof v === "string") return { label, from: "", to: "", text: v };
    const e = (v && typeof v === "object" ? v : {}) as ImportantDateEntry;
    return {
      label,
      from: typeof e.from === "string" ? e.from : "",
      to: typeof e.to === "string" ? e.to : "",
      text: typeof e.text === "string" ? e.text : "",
    };
  });
}

export function validateDateRows(rows: DateRow[]): string | null {
  const seen = new Set<string>();
  for (const [i, r] of rows.entries()) {
    const label = r.label.trim();
    if (!label) return `Date ${i + 1}: label is required`;
    if (seen.has(label)) return `"${label}" is listed twice`;
    seen.add(label);
    if (!!r.from !== !!r.to)
      return `"${label}": pick both dates (use the same day twice for one day)`;
    if (r.from && r.from > r.to) return `"${label}": start date is after end date`;
    const text = r.text.trim();
    if (!r.from && !text) return `"${label}": pick dates or enter text, e.g. "December 2026" or "TBA"`;
    if (text.length > IMPORTANT_DATE_TEXT_MAX)
      return `"${label}": text must be at most ${IMPORTANT_DATE_TEXT_MAX} characters`;
  }
  return null;
}

// Rows -> API payload, sending only the parts each row actually has.
export function fromDateRows(rows: DateRow[]): ImportantDates {
  return Object.fromEntries(
    rows.map((r) => {
      const text = r.text.replace(/\s+/g, " ").trim();
      return [
        r.label.trim(),
        { ...(r.from && r.to && { from: r.from, to: r.to }), ...(text && { text }) },
      ];
    }),
  );
}

// Cycled by index across however many date entries a series has, since
// entries are admin-defined free text with no fixed semantic per slot.
export const IMPORTANT_DATE_TINTS = [
  "bg-emerald-50 text-emerald-600",
  "bg-blue-50 text-blue-600",
  "bg-amber-50 text-amber-600",
  "bg-violet-50 text-violet-600",
  "bg-rose-50 text-rose-600",
  "bg-slate-50 text-slate-600",
];

export const ImportantDateIcon = CalendarDays;
