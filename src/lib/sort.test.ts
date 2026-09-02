import { describe, expect, it } from "vitest";
import { multiSort, toggleSortKey } from "./sort";

type R = { n: string; a?: number; b?: number };
const rows: R[] = [
  { n: "w", a: 1, b: 2 },
  { n: "x", a: 3, b: 1 },
  { n: "y", a: 3, b: 3 },
  { n: "z", b: 9 },
];
const get = (r: R, k: string) => r[k as keyof R];

describe("multiSort", () => {
  it("no keys keeps order", () => expect(multiSort(rows, [], get).map((r) => r.n)).toEqual(["w", "x", "y", "z"]));
  it("single desc, undefined last", () =>
    expect(multiSort(rows, [{ key: "a", dir: "desc" }], get).map((r) => r.n)).toEqual(["x", "y", "w", "z"]));
  it("single asc, undefined last", () =>
    expect(multiSort(rows, [{ key: "a", dir: "asc" }], get).map((r) => r.n)).toEqual(["w", "x", "y", "z"]));
  it("multi key: a desc then b desc", () =>
    expect(
      multiSort(
        rows,
        [
          { key: "a", dir: "desc" },
          { key: "b", dir: "desc" },
        ],
        get,
      ).map((r) => r.n),
    ).toEqual(["y", "x", "w", "z"]));
  it("string key", () =>
    expect(multiSort(rows, [{ key: "n", dir: "desc" }], get).map((r) => r.n)).toEqual(["z", "y", "x", "w"]));
  it("does not mutate", () => {
    const copy = rows.slice();
    multiSort(rows, [{ key: "a", dir: "desc" }], get);
    expect(rows).toEqual(copy);
  });
});

describe("toggleSortKey", () => {
  it("first click -> desc single", () => expect(toggleSortKey([], "a", false)).toEqual([{ key: "a", dir: "desc" }]));
  it("second click toggles to asc", () =>
    expect(toggleSortKey([{ key: "a", dir: "desc" }], "a", false)).toEqual([{ key: "a", dir: "asc" }]));
  it("non-multi replaces", () =>
    expect(toggleSortKey([{ key: "a", dir: "desc" }], "b", false)).toEqual([{ key: "b", dir: "desc" }]));
  it("multi appends", () =>
    expect(toggleSortKey([{ key: "a", dir: "desc" }], "b", true)).toEqual([
      { key: "a", dir: "desc" },
      { key: "b", dir: "desc" },
    ]));
  it("multi toggles existing in place", () =>
    expect(
      toggleSortKey(
        [
          { key: "a", dir: "desc" },
          { key: "b", dir: "desc" },
        ],
        "a",
        true,
      ),
    ).toEqual([
      { key: "a", dir: "asc" },
      { key: "b", dir: "desc" },
    ]));
});
