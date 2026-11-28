// Admin → Scripts: types and pure helpers for the scripts page
// (backend: /api/admin/scripts, utils/scriptCatalog.js).

export type ScriptOptionType = "boolean" | "number" | "date" | "files";

export type ScriptOption = {
  key: string;
  type: ScriptOptionType;
  label: string;
  description: string;
  min?: number;
  required?: boolean;
  /** File extensions, e.g. [".png", ".jpg"]. */
  accept?: string[];
};

export type ScriptRunStatus = "running" | "succeeded" | "failed" | "stopped";

export type ScriptRun = {
  _id: string;
  script: string;
  options: Record<string, unknown>;
  files: string[];
  status: ScriptRunStatus;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  /** Only on GET /admin/scripts/runs/:id. */
  log?: string;
  logTruncated?: boolean;
  startedBy: { _id: string; name?: string; email?: string } | null;
};

export type AdminScript = {
  key: string;
  name: string;
  group: string;
  description: string;
  options: ScriptOption[];
  lastRun: ScriptRun | null;
};

/** Form values: booleans, number/date as typed strings ("" = not set). */
export type ScriptFormValues = Record<string, boolean | string>;

export const RUN_STATUS_META: Record<
  ScriptRunStatus,
  { label: string; tone: "info" | "success" | "danger" | "neutral" }
> = {
  running: { label: "Running", tone: "info" },
  succeeded: { label: "Succeeded", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  stopped: { label: "Stopped", tone: "neutral" },
};

/** The options object the API expects: only ticked / filled values. */
export function toRunOptions(options: ScriptOption[], values: ScriptFormValues) {
  const out: Record<string, boolean | number | string> = {};
  for (const o of options) {
    const v = values[o.key];
    if (o.type === "boolean" && v === true) out[o.key] = true;
    if (o.type === "number" && typeof v === "string" && v.trim() !== "") out[o.key] = Number(v);
    if (o.type === "date" && typeof v === "string" && v !== "") out[o.key] = v;
  }
  return out;
}

/** "28 Nov 2026, 2:05 pm" in the viewer's time zone. */
export const formatRunTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** "45s", "3m 20s", "1h 4m". */
export function formatDuration(fromIso: string, toIso: string) {
  const s = Math.max(
    0,
    Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000),
  );
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

/** Ticked options as readable labels, for "last run with …". */
export function describeRunOptions(options: ScriptOption[], runOptions: Record<string, unknown>) {
  return options
    .filter((o) => runOptions[o.key] !== undefined && runOptions[o.key] !== false)
    .map((o) => (o.type === "boolean" ? o.label : `${o.label}: ${String(runOptions[o.key])}`));
}
