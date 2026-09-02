import { describe, expect, it } from "vitest";
import type { Buff, Settings } from "../types";
import { effectiveSetting, hasOverride, resolveBuffTotal, resolveBuffValue, resolveMindscape } from "./resolve";

const buff: Buff = {
  id: "t",
  name: "t",
  stat: "atk_pct",
  target: "team",
  values: { base: 10, m2: 15, m6: 30 },
  wengine: { p1: 5, p2: 6, p3: 7, p4: 8, p5: 10 },
  maxStacks: 3,
  sourceUrl: "x",
};

describe("resolveMindscape", () => {
  it("base at 0", () => expect(resolveMindscape(buff.values, 0)).toBe(10));
  it("unchanged at m1 (null carries forward)", () => expect(resolveMindscape(buff.values, 1)).toBe(10));
  it("override at m2", () => expect(resolveMindscape(buff.values, 2)).toBe(15));
  it("m2 carries to m5", () => expect(resolveMindscape(buff.values, 5)).toBe(15));
  it("m6", () => expect(resolveMindscape(buff.values, 6)).toBe(30));
  it("explicit null is ignored", () => expect(resolveMindscape({ base: 1, m1: null, m2: 2 }, 1)).toBe(1));
});

describe("resolveBuffValue / Total", () => {
  it("no wengine", () => expect(resolveBuffValue(buff, { mindscape: 0, wenginePhase: 0, potential: 0 })).toBe(10));
  it("wengine p1", () => expect(resolveBuffValue(buff, { mindscape: 0, wenginePhase: 1, potential: 0 })).toBe(15));
  it("m6 + p5", () => expect(resolveBuffValue(buff, { mindscape: 6, wenginePhase: 5, potential: 0 })).toBe(40));
  it("total = value * maxStacks", () => expect(resolveBuffTotal(buff, { mindscape: 2, wenginePhase: 5, potential: 0 })).toBe(75));
  it("buff without wengine ignores phase", () =>
    expect(resolveBuffValue({ ...buff, wengine: undefined }, { mindscape: 0, wenginePhase: 5, potential: 0 })).toBe(10));
});

describe("potential", () => {
  const pb: Buff = { ...buff, wengine: undefined, maxStacks: 1, potential: { t2: 20, t5: 25 } };
  it("no potential -> mindscape value", () => expect(resolveBuffValue(pb, { mindscape: 0, wenginePhase: 0, potential: 0 })).toBe(10));
  it("t1 carries base", () => expect(resolveBuffValue(pb, { mindscape: 0, wenginePhase: 0, potential: 1 })).toBe(10));
  it("t2 overrides", () => expect(resolveBuffValue(pb, { mindscape: 0, wenginePhase: 0, potential: 2 })).toBe(20));
  it("t6 keeps t5", () => expect(resolveBuffValue(pb, { mindscape: 6, wenginePhase: 0, potential: 6 })).toBe(25));
  it("potential-only buff is 0 until unlocked", () =>
    expect(resolveBuffValue({ ...pb, values: { base: 0 }, potential: { t3: 8 } }, { mindscape: 6, wenginePhase: 0, potential: 2 })).toBe(0));
});

describe("effectiveSetting", () => {
  const s: Settings = {
    global: { mindscape: 2, wenginePhase: 1, potential: 0 },
    overrides: { a: { mindscape: 6 }, b: { mindscape: 0, wenginePhase: 5, potential: 3 } },
  };
  it("global when no override", () => expect(effectiveSetting(s, "z")).toEqual({ mindscape: 2, wenginePhase: 1, potential: 0 }));
  it("partial override keeps other from global", () =>
    expect(effectiveSetting(s, "a")).toEqual({ mindscape: 6, wenginePhase: 1, potential: 0 }));
  it("full override", () => expect(effectiveSetting(s, "b")).toEqual({ mindscape: 0, wenginePhase: 5, potential: 3 }));
  it("reset returns to global", () => {
    const reset: Settings = { ...s, overrides: { ...s.overrides, a: {} } };
    expect(effectiveSetting(reset, "a")).toEqual({ mindscape: 2, wenginePhase: 1, potential: 0 });
    expect(hasOverride(reset, "a")).toBe(false);
    expect(hasOverride(s, "a")).toBe(true);
  });
});
