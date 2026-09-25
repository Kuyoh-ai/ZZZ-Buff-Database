import { describe, expect, it } from "vitest";
import type { Character } from "../types";
import { judgeAdditionalAbility, judgeAdditionalAbilities } from "./activation";

const mk = (p: Partial<Character> & { id: string }): Character => ({
  nameJa: p.id,
  nameEn: p.id,
  rarity: "S",
  element: "fire",
  role: "attack",
  assist: "parry",
  faction: "cunning_hares",
  wengine: { nameJa: "", nameEn: "" },
  releaseVersion: "1.0",
  sourceUrl: "https://example.com",
  ...p,
});
const aa = (activation: NonNullable<Character["additionalAbility"]>["activation"]) => ({
  name: "x",
  condition: "x",
  conditionShort: "x",
  activation,
  sourceUrl: "https://example.com",
});

describe("judgeAdditionalAbility", () => {
  const koleda = mk({
    id: "koleda",
    element: "fire",
    role: "stun",
    faction: "belobog_heavy_industries",
    additionalAbility: aa({ sameElement: true, sameFaction: true, roles: ["rupture"] }),
  });
  it("same element activates", () =>
    expect(judgeAdditionalAbility(koleda, mk({ id: "a", element: "fire", faction: "sons_of_calydon" }))).toBe(true));
  it("same element via subElement activates", () =>
    expect(judgeAdditionalAbility(koleda, mk({ id: "a", element: "ice", subElement: "fire", faction: "sons_of_calydon" }))).toBe(true));
  it("same faction activates", () =>
    expect(judgeAdditionalAbility(koleda, mk({ id: "a", element: "ice", faction: "belobog_heavy_industries" }))).toBe(true));
  it("listed role activates", () =>
    expect(judgeAdditionalAbility(koleda, mk({ id: "a", element: "ice", role: "rupture", faction: "sons_of_calydon" }))).toBe(true));
  it("nothing matches -> false", () =>
    expect(judgeAdditionalAbility(koleda, mk({ id: "a", element: "ice", role: "attack", faction: "sons_of_calydon" }))).toBe(false));
  it("self -> null (not judged)", () => expect(judgeAdditionalAbility(koleda, koleda)).toBeNull());
  it("no activation data -> null", () => {
    const c = mk({ id: "c", additionalAbility: { name: "x", condition: "x", conditionShort: "x", sourceUrl: "https://example.com" } });
    expect(judgeAdditionalAbility(c, mk({ id: "a" }))).toBeNull();
    expect(judgeAdditionalAbility(mk({ id: "d" }), mk({ id: "a" }))).toBeNull();
  });
  it("same faction is judged by faction group (防衛軍 = オボルス + シルバー)", () => {
    const trigger = mk({ id: "t", element: "electric", role: "stun", faction: "defense_force_obol", additionalAbility: aa({ sameFaction: true }) });
    expect(judgeAdditionalAbility(trigger, mk({ id: "a", element: "ice", faction: "defense_force_silver" }))).toBe(true);
    expect(judgeAdditionalAbility(trigger, mk({ id: "a", element: "ice", faction: "neps_public_order" }))).toBe(false);
  });
  it("parry support depends on attacker's assist type", () => {
    const caesar = mk({ id: "caesar", element: "physical", role: "defense", faction: "sons_of_calydon", additionalAbility: aa({ parrySupport: true, sameFaction: true }) });
    expect(judgeAdditionalAbility(caesar, mk({ id: "a", element: "ice", assist: "parry" }))).toBe(true);
    expect(judgeAdditionalAbility(caesar, mk({ id: "a", element: "ice", assist: "evasive" }))).toBe(false);
  });
  it("potentialRoles count only when buffer potential >= 1", () => {
    const k = mk({ id: "k", element: "fire", role: "stun", faction: "belobog_heavy_industries", additionalAbility: aa({ sameElement: true, potentialRoles: ["armorer"] }) });
    const armorer = mk({ id: "a", element: "electric", role: "armorer", faction: "ros_khalifa_flint_workshop" });
    expect(judgeAdditionalAbility(k, armorer)).toBe(false);
    expect(judgeAdditionalAbility(k, armorer, 0)).toBe(false);
    expect(judgeAdditionalAbility(k, armorer, 1)).toBe(true);
    expect(judgeAdditionalAbilities([k], armorer, () => 6)).toEqual({ k: true });
  });
  it("judgeAdditionalAbilities omits null results", () => {
    const attacker = mk({ id: "a", element: "fire", faction: "sons_of_calydon" });
    const none = mk({ id: "n" });
    expect(judgeAdditionalAbilities([koleda, attacker, none], attacker)).toEqual({ koleda: true });
  });
});
