import { describe, it, expect } from "vitest";
import { categoriesWithSeries, seriesCategoryId } from "./categories";

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
