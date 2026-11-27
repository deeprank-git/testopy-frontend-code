import { describe, it, expect } from "vitest";
import { paginationItems } from "./pagination";

describe("paginationItems", () => {
  it("lists every page when there are few", () => {
    expect(paginationItems(1, 1)).toEqual([1]);
    expect(paginationItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("always includes the current page and its neighbours", () => {
    expect(paginationItems(1, 10)).toEqual([1, 2, "…", 10]);
    expect(paginationItems(3, 10)).toEqual([1, 2, 3, 4, "…", 10]);
    expect(paginationItems(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
    expect(paginationItems(9, 10)).toEqual([1, "…", 8, 9, 10]);
    expect(paginationItems(10, 10)).toEqual([1, "…", 9, 10]);
  });

  it("clamps an out-of-range page", () => {
    expect(paginationItems(50, 10)).toEqual([1, "…", 9, 10]);
  });
});
