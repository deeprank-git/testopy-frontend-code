// Links shown on an exam (test series) page: Official Website, Apply Online
// and the notification PDF. Each is optional — most imported exams have none —
// so pages render a button/link only when this returns a usable href, instead
// of pointing at "" (which reloads the page) or "#".

/** A trimmed http(s) URL or in-app "/path", otherwise undefined. */
export function usableLink(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (/^https?:\/\/\S+$/i.test(v)) return v;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  return undefined;
}

export type ExamLinkKey = "officialWebsite" | "applyLink" | "notificationPdf";

/** The page's links, each present only when usable. `notificationPdfUrl` is already resolved. */
export function examPageLinks(
  series: { officialWebsite?: string; applyLink?: string } | null | undefined,
  notificationPdfUrl: string | undefined,
): Partial<Record<ExamLinkKey, string>> {
  const links: Partial<Record<ExamLinkKey, string>> = {};
  const website = usableLink(series?.officialWebsite);
  const apply = usableLink(series?.applyLink);
  const pdf = usableLink(notificationPdfUrl);
  if (website) links.officialWebsite = website;
  if (apply) links.applyLink = apply;
  if (pdf) links.notificationPdf = pdf;
  return links;
}
