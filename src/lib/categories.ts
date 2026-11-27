// Student-facing category lists: a category is only worth showing when it has
// at least one visible (published, active) test series. After a bulk import
// most categories have none yet, and listing them just shows empty tabs.

type SeriesWithCategory = { category?: { _id?: string } | string | null };

/** The category id a test series belongs to (list responses may populate it or not). */
export const seriesCategoryId = (s: SeriesWithCategory): string | undefined =>
  typeof s.category === "object" ? (s.category?._id ?? undefined) : (s.category ?? undefined);

type TestWithSeriesRef = { testSeries?: { _id?: string } | string | null };

/** The test series a test belongs to (populated or bare id). */
export const testSeriesIdOf = (t: TestWithSeriesRef): string | undefined =>
  typeof t.testSeries === "object" ? (t.testSeries?._id ?? undefined) : (t.testSeries ?? undefined);

/** `series`, keeping order, minus those with no test in `visibleTests`. */
export function seriesWithTests<S extends { _id: string }>(series: S[], visibleTests: TestWithSeriesRef[]): S[] {
  const used = new Set(visibleTests.map(testSeriesIdOf).filter(Boolean));
  return series.filter((s) => used.has(s._id));
}

/** `categories`, keeping order, minus those with no series in `visibleSeries`. */
export function categoriesWithSeries<C extends { _id: string }>(
  categories: C[],
  visibleSeries: SeriesWithCategory[],
): C[] {
  const used = new Set(visibleSeries.map(seriesCategoryId).filter(Boolean));
  return categories.filter((c) => used.has(c._id));
}
