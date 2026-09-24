import { describe, expect, it } from "vitest";
import { FACTIONS, FACTION_GROUP, FACTION_GROUP_LABEL, FACTION_LABEL, FACTION_ORDER, factionGroupOf, isFactionId } from "./labels";

describe("FACTIONS", () => {
  it("has 20 factions in the specified order", () => {
    expect(FACTIONS.map((f) => f.label)).toEqual([
      "邪兎屋", "ヴィクトリア家政", "白祇重工", "カリュドーンの子", "防衛軍・オボルス小隊", "防衛軍・シルバー小隊", "対ホロウ六課",
      "治安局・特務捜査班", "治安局・都市秩序部", "スターズ・オブ・リラ", "モッキンバード", "雲嶽山", "怪啖屋", "クランプスの黒枝",
      "妄想エンジェル", "パエトーン", "ロスカリファ・外務計策局", "ロスカリファ・空域巡警局", "ロスカリファ・フリンツ工房", "ダアト結社",
    ]);
    expect(FACTION_ORDER.cunning_hares).toBe(0);
    expect(FACTION_ORDER.covenant_of_dayat).toBe(19);
  });
  it("groups have labels and every group id is a known group or a faction id", () => {
    for (const f of FACTIONS) expect(f.group === f.id || f.group in FACTION_GROUP_LABEL).toBe(true);
    expect(FACTION_GROUP.defense_force_obol).toBe("defense_force");
    expect(factionGroupOf("ros_khalifa_airspace")).toBe("ros_khalifa");
    expect(factionGroupOf("ros_khalifa")).toBe("ros_khalifa");
    expect(factionGroupOf("mockingbird")).toBe("mockingbird");
  });
  it("isFactionId accepts sub and group ids, rejects legacy ids", () => {
    expect(isFactionId("neps_public_order")).toBe(true);
    expect(isFactionId("new_eridu_public_security")).toBe(true);
    expect(isFactionId("obol_squad")).toBe(false);
    expect(Object.keys(FACTION_LABEL)).toHaveLength(20);
    for (const f of FACTIONS) expect(f.color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
