import { describe, expect, it } from "vitest";
import type { Buff, Character } from "../types";
import { appliesTo } from "./applicability";

const mk = (id: string, p: Partial<Character> = {}): Character => ({
  id,
  nameJa: id,
  nameEn: id,
  rarity: "S",
  element: "ether",
  role: "attack",
  faction: "cunning_hares",
  wengine: { nameJa: "-", nameEn: "-" },
  releaseVersion: "1.0",
  sourceUrl: "x",
  ...p,
});
const provider = mk("nicole", { role: "support" });
const zhu = mk("zhu_yuan", { faction: "new_eridu_public_security" });
const ellen = mk("ellen", { element: "ice", faction: "victoria_housekeeping" });
const miyabi = mk("miyabi", { element: "ice", subElement: "fire", faction: "hollow_special_operations" });

const b = (p: Partial<Buff>): Buff => ({
  id: "b",
  name: "b",
  stat: "atk_pct",
  target: "team",
  values: { base: 1 },
  sourceUrl: "x",
  ...p,
});

describe("appliesTo", () => {
  it("no attacker -> always true", () => expect(appliesTo(b({ target: "self" }), provider, null)).toBe(true));
  it("self only applies to self", () => {
    expect(appliesTo(b({ target: "self" }), provider, provider)).toBe(true);
    expect(appliesTo(b({ target: "self" }), provider, zhu)).toBe(false);
  });
  it("team applies to anyone incl. self", () => {
    expect(appliesTo(b({ target: "team" }), provider, zhu)).toBe(true);
    expect(appliesTo(b({ target: "team" }), provider, provider)).toBe(true);
  });
  it("team excludeSelf", () => {
    expect(appliesTo(b({ condition: { excludeSelf: true } }), provider, provider)).toBe(false);
    expect(appliesTo(b({ condition: { excludeSelf: true } }), provider, zhu)).toBe(true);
  });
  it("enemy debuff applies to all", () => expect(appliesTo(b({ target: "enemy" }), provider, ellen)).toBe(true));
  it("next_swap_in excludes self", () => {
    expect(appliesTo(b({ target: "next_swap_in" }), provider, provider)).toBe(false);
    expect(appliesTo(b({ target: "next_swap_in" }), provider, zhu)).toBe(true);
  });
  it("element condition (incl. subElement)", () => {
    const ice = b({ condition: { elements: ["ice"] } });
    const fire = b({ condition: { elements: ["fire"] } });
    expect(appliesTo(ice, provider, ellen)).toBe(true);
    expect(appliesTo(ice, provider, zhu)).toBe(false);
    expect(appliesTo(fire, provider, miyabi)).toBe(true);
  });
  it("elemental buff requires matching attacker element", () => {
    const iceRes = b({ stat: "enemy_res_down_pct", element: "ice", target: "enemy" });
    expect(appliesTo(iceRes, provider, ellen)).toBe(true);
    expect(appliesTo(iceRes, provider, miyabi)).toBe(true);
    expect(appliesTo(iceRes, provider, zhu)).toBe(false);
  });
  it("rupture attacker: atk/pen not applicable, sheer force applicable", () => {
    const rupture = mk("yixuan", { role: "rupture" });
    expect(appliesTo(b({ stat: "atk_pct" }), provider, rupture)).toBe(false);
    expect(appliesTo(b({ stat: "pen_ratio" }), provider, rupture)).toBe(false);
    expect(appliesTo(b({ stat: "sheer_force_flat" }), provider, rupture)).toBe(true);
    expect(appliesTo(b({ stat: "hp_pct" }), provider, rupture)).toBe(true);
    expect(appliesTo(b({ stat: "crit_dmg" }), provider, rupture)).toBe(true);
  });
  it("armorer attacker: atk/hp/crit dmg/sheer not applicable, def/crit rate/sharp crit dmg/dmg applicable", () => {
    const armorer = mk("claretta", { role: "armorer", element: "electric" });
    for (const stat of ["atk_pct", "atk_flat", "hp_pct", "hp_flat", "crit_dmg", "sheer_force_pct", "sheer_force_flat", "sheer_dmg_pct"]) {
      expect(appliesTo(b({ stat }), provider, armorer)).toBe(false);
    }
    for (const stat of ["def_pct", "def_flat", "crit_rate", "sharp_crit_dmg", "dmg_pct", "basic_dmg_pct"]) {
      expect(appliesTo(b({ stat }), provider, armorer)).toBe(true);
    }
    expect(appliesTo(b({ stat: "dmg_pct_element", element: "electric" }), provider, armorer)).toBe(true);
  });
  it("non-armorer attacker: sharp crit dmg not applicable", () => {
    expect(appliesTo(b({ stat: "sharp_crit_dmg" }), provider, zhu)).toBe(false);
    expect(appliesTo(b({ stat: "sharp_crit_dmg" }), provider, mk("y", { role: "rupture" }))).toBe(false);
  });
  it("non-rupture attacker: sheer force not applicable", () => {
    expect(appliesTo(b({ stat: "sheer_force_flat" }), provider, zhu)).toBe(false);
    expect(appliesTo(b({ stat: "atk_pct" }), provider, zhu)).toBe(true);
  });
  it("faction condition", () => {
    const f = b({ condition: { factions: ["victoria_housekeeping"] } });
    expect(appliesTo(f, provider, ellen)).toBe(true);
    expect(appliesTo(f, provider, zhu)).toBe(false);
  });
  it("role condition", () => {
    const r = b({ condition: { roles: ["attack", "anomaly"] } });
    expect(appliesTo(r, provider, zhu)).toBe(true);
    expect(appliesTo(r, provider, provider)).toBe(false);
  });
  it("combined element OR + faction AND", () => {
    const c = b({ condition: { elements: ["ice", "fire"], factions: ["victoria_housekeeping"] } });
    expect(appliesTo(c, provider, ellen)).toBe(true);
    expect(appliesTo(c, provider, miyabi)).toBe(false);
  });
});

describe("faction condition uses faction group", () => {
  const neps1 = mk("zhu", { faction: "neps_special_investigation" });
  const neps2 = mk("cissia", { faction: "neps_public_order" });
  const hares = mk("nicole", { faction: "cunning_hares" });
  it("group id in condition applies to every sub-faction", () => {
    expect(appliesTo(b({ condition: { factions: ["new_eridu_public_security"] } }), provider, neps1)).toBe(true);
    expect(appliesTo(b({ condition: { factions: ["new_eridu_public_security"] } }), provider, neps2)).toBe(true);
    expect(appliesTo(b({ condition: { factions: ["new_eridu_public_security"] } }), provider, hares)).toBe(false);
  });
  it("sub-faction id in condition applies to sibling sub-faction of the same group", () => {
    expect(appliesTo(b({ condition: { factions: ["neps_special_investigation"] } }), provider, neps2)).toBe(true);
  });
  it("ungrouped factions match only themselves", () => {
    expect(appliesTo(b({ condition: { factions: ["cunning_hares"] } }), provider, hares)).toBe(true);
    expect(appliesTo(b({ condition: { factions: ["cunning_hares"] } }), provider, neps1)).toBe(false);
  });
});
