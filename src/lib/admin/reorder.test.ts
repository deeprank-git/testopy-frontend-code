import { describe, expect, it } from "vitest";
import { reorderById } from "./reorder";

const items = (...ids: string[]) => ids.map((_id) => ({ _id }));
const ids = (list: { _id: string }[] | null) => list?.map((i) => i._id);

describe("reorderById", () => {
  it("moves an item forward and backward", () => {
    const all = items("a", "b", "c", "d");
    const v = ["a", "b", "c", "d"];
    expect(ids(reorderById(all, v, "a", "c"))).toEqual(["b", "c", "a", "d"]);
    expect(ids(reorderById(all, v, "d", "b"))).toEqual(["a", "d", "b", "c"]);
  });

  it("keeps hidden items in their slots", () => {
    const all = items("a", "x", "b", "c");
    expect(ids(reorderById(all, ["a", "b", "c"], "c", "a"))).toEqual(["c", "x", "a", "b"]);
  });

  it("returns null when nothing moved or ids are unknown", () => {
    const all = items("a", "b");
    expect(reorderById(all, ["a", "b"], "a", "a")).toBeNull();
    expect(reorderById(all, ["a", "b"], "a", "zzz")).toBeNull();
  });
});
