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
