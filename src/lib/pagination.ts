/**
 * Page buttons to show: every page when there are 7 or fewer, otherwise the
 * first and last page plus the current page and its neighbours, with "…" for
 * the gaps — so the current page always has a button.
 *   (5, 10) -> [1, "…", 4, 5, 6, "…", 10]
 */
export function paginationItems(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: Math.max(total, 1) }, (_, i) => i + 1);
  const current = Math.min(Math.max(page, 1), total);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  const items: (number | "…")[] = [1];
  if (start > 2) items.push("…");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}
