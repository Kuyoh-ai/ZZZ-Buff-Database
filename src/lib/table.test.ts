import { describe, expect, it } from "vitest";
import type { Character, CharacterBuffs } from "../types";
import { buildRow, cellDisplay, cellSortValue, isAdditionalAbility } from "./table";

const ch: Character = {
  id: "a", nameJa: "a", nameEn: "a", rarity: "S", element: "ice", role: "support", faction: "x",
  wengine: { nameJa: "-", nameEn: "-" }, releaseVersion: "1.0", sourceUrl: "x",
};
const data: CharacterBuffs = {
  characterId: "a",
  buffs: [
    { id: "self", name: "s", stat: "crit_rate", target: "self", values: { base: 10 }, sourceUrl: "x" },
    { id: "team", name: "t", stat: "crit_rate", target: "team", values: { base: 5, m2: 8 }, maxStacks: 2, sourceUrl: "x" },
    { id: "enemy", name: "e", stat: "enemy_def_down_pct", target: "enemy", values: { base: 20 }, sourceUrl: "x" },
  ],
};
const aaData: CharacterBuffs = {
  characterId: "a",
  buffs: [
    ...data.buffs,
    { id: "aa", name: "追加能力: 契約合意(チーム会心率アップ)", stat: "crit_rate", target: "team", values: { base: 7 }, sourceUrl: "x" },
    { id: "aa2", name: "完全なる物語(追加能力)-会心ダメージ上昇", stat: "crit_dmg", target: "self", values: { base: 30 }, sourceUrl: "x" },
  ],
};

describe("buildRow", () => {
  it("party total excludes self buffs; self kept separately", () => {
    const r = buildRow(ch, data, { mindscape: 0, wenginePhase: 0, potential: 0 }, null);
    expect(r.cells.crit_rate.totalAll).toBe(10);
    expect(cellDisplay(r.cells.crit_rate, null)).toEqual({ party: 10, self: 10 });
    expect(r.buffCount).toBe(3);
  });
  it("with attacker = self, self buffs go to totalSelf", () => {
    const r = buildRow(ch, data, { mindscape: 0, wenginePhase: 0, potential: 0 }, ch);
    expect(r.cells.crit_rate.total).toBe(10);
    expect(r.cells.crit_rate.totalSelf).toBe(10);
  });
  it("excludeSelfBuffs drops target:self", () => {
    const r = buildRow(ch, data, { mindscape: 2, wenginePhase: 0, potential: 0 }, null, true);
    expect(r.cells.crit_rate.totalAll).toBe(16);
    expect(r.cells.crit_rate.totalSelf).toBe(0);
    expect(r.cells.crit_rate.buffs.map((b) => b.buff.id)).toEqual(["team"]);
    expect(r.buffCount).toBe(2);
  });
  it("cellSortValue is undefined when nothing applies to attacker", () => {
    const other: Character = { ...ch, id: "b", role: "attack" };
    const r = buildRow(ch, data, { mindscape: 0, wenginePhase: 0, potential: 0 }, other, true);
    expect(cellSortValue(r, "crit_rate", other)).toBe(10); // 5 × 2 stacks
    expect(cellSortValue(r, "atk_pct", other)).toBeUndefined();
  });
});

describe("additionalAbility toggle", () => {
  it("isAdditionalAbility matches by name anywhere", () => {
    expect(isAdditionalAbility(aaData.buffs[3])).toBe(true);
    expect(isAdditionalAbility(aaData.buffs[4])).toBe(true);
    expect(isAdditionalAbility(aaData.buffs[1])).toBe(false);
  });
  it("included by default and when true", () => {
    for (const setting of [
      { mindscape: 0, wenginePhase: 0, potential: 0 },
      { mindscape: 0, wenginePhase: 0, potential: 0, additionalAbility: true },
    ] as const) {
      const r = buildRow(ch, aaData, setting, null);
      expect(r.cells.crit_rate.totalAll).toBe(17); // 5×2 stacks + 7
      expect(r.cells.crit_dmg).toBeDefined();
      expect(r.buffCount).toBe(5);
    }
  });
  it("false drops additional-ability buffs from cells and buffCount, others unchanged", () => {
    const r = buildRow(ch, aaData, { mindscape: 0, wenginePhase: 0, potential: 0, additionalAbility: false }, null);
    expect(r.cells.crit_rate.totalAll).toBe(10); // 5×2 stacks
    expect(r.cells.crit_rate.buffs.map((b) => b.buff.id)).toEqual(["self", "team"]);
    expect(r.cells.crit_dmg).toBeUndefined();
    expect(r.cells.enemy_def_down_pct.totalAll).toBe(20);
    expect(r.buffCount).toBe(3);
  });
  it("combines with excludeSelfBuffs", () => {
    const r = buildRow(ch, aaData, { mindscape: 0, wenginePhase: 0, potential: 0, additionalAbility: false }, null, true);
    expect(r.cells.crit_rate.buffs.map((b) => b.buff.id)).toEqual(["team"]);
    expect(r.buffCount).toBe(2);
  });
});
