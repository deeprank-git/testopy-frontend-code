// Small non-component helpers shared by admin UI (kept out of .tsx component
// files so React fast refresh keeps working).

const PALETTE = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

/** Deterministic background colour for an entity without an image. */
export const colorFor = (s: string) =>
  PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

/** True when a react-query error is an HTTP 404 from the API. */
export const isNotFound = (error: unknown) =>
  (error as { response?: { status?: number } } | null)?.response?.status === 404;

/** Message from an axios error response, or a fallback. */
export const apiError = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message ??
  fallback;
