import { describe, expect, it } from "vitest";
import type { Character } from "../types";
import { defaultOrder, multiSort, sortDefault, toggleSortKey } from "./sort";

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

describe("defaultOrder", () => {
  const mk = (id: string, faction: string, ver: string, name: string): Character => ({
    id, nameJa: name, nameEn: id, rarity: "S", element: "ice", role: "attack", faction,
    wengine: { nameJa: "-", nameEn: "-" }, releaseVersion: ver, sourceUrl: "x",
  });
  const hares10b = mk("billy", "cunning_hares", "1.0", "ビリー");
  const hares10a = mk("anby", "cunning_hares", "1.0", "アンビー");
  const hares28 = mk("sbilly", "cunning_hares", "2.8", "スターライト・ビリー");
  const vic10 = mk("ellen", "victoria_housekeeping", "1.0", "エレン");
  const dayat = mk("remielle", "covenant_of_dayat", "3.1", "レミエール");
  const silver = mk("s0", "defense_force_silver", "1.6", "0号・アンビー");
  const obol = mk("s11", "defense_force_obol", "1.0", "11号");
  it("faction order first (FACTIONS order, not label/id)", () => {
    expect(sortDefault([dayat, vic10, hares28]).map((c) => c.id)).toEqual(["sbilly", "ellen", "remielle"]);
    expect(defaultOrder(obol, silver)).toBeLessThan(0);
  });
  it("then version ascending, then Japanese name", () => {
    expect(sortDefault([hares28, hares10b, hares10a]).map((c) => c.id)).toEqual(["anby", "billy", "sbilly"]);
  });
  it("does not mutate input and unknown faction goes last", () => {
    const arr = [dayat, hares10a];
    sortDefault(arr);
    expect(arr[0].id).toBe("remielle");
    expect(defaultOrder(mk("x", "unknown", "1.0", "x"), dayat)).toBeGreaterThan(0);
  });
});
