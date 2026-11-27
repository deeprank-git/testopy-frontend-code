import { describe, it, expect } from "vitest";
import { categoriesWithSeries, seriesCategoryId, seriesWithTests, testSeriesIdOf } from "./categories";

describe("testSeriesIdOf / seriesWithTests", () => {
  it("reads populated and bare series refs", () => {
    expect(testSeriesIdOf({ testSeries: { _id: "s1" } })).toBe("s1");
    expect(testSeriesIdOf({ testSeries: "s2" })).toBe("s2");
    expect(testSeriesIdOf({})).toBeUndefined();
  });

  it("keeps only series that have a visible test, in order", () => {
    const series = [{ _id: "cgl" }, { _id: "chsl" }, { _id: "mts" }];
    expect(seriesWithTests(series, [{ testSeries: "mts" }, { testSeries: { _id: "cgl" } }])).toEqual([
      { _id: "cgl" },
      { _id: "mts" },
    ]);
    expect(seriesWithTests(series, [])).toEqual([]);
  });
});

describe("seriesCategoryId", () => {
  it("reads populated and bare category refs", () => {
    expect(seriesCategoryId({ category: { _id: "c1" } })).toBe("c1");
    expect(seriesCategoryId({ category: "c2" })).toBe("c2");
    expect(seriesCategoryId({ category: null })).toBeUndefined();
    expect(seriesCategoryId({})).toBeUndefined();
  });
});

describe("categoriesWithSeries", () => {
  const categories = [
    { _id: "ssc", name: "SSC" },
    { _id: "bank", name: "Banking" },
    { _id: "rail", name: "Railways" },
  ];

  it("keeps only categories that have a visible series, in their original order", () => {
    expect(
      categoriesWithSeries(categories, [{ category: "rail" }, { category: { _id: "ssc" } }, { category: "rail" }]),
    ).toEqual([
      { _id: "ssc", name: "SSC" },
      { _id: "rail", name: "Railways" },
    ]);
  });

  it("returns nothing when no series are visible", () => {
    expect(categoriesWithSeries(categories, [])).toEqual([]);
  });
});
