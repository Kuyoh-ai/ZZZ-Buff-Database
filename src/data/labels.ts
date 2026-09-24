import type { Element, Role } from "../types";

export const ELEMENT_LABEL: Record<Element, string> = {
  physical: "物理",
  fire: "炎",
  ice: "氷",
  electric: "電気",
  ether: "エーテル",
  auric_ink: "玄墨",
  wind: "風",
  lumiflux: "流明",
};

export const ROLE_LABEL: Record<Role, string> = {
  attack: "強攻",
  stun: "撃破",
  anomaly: "異常",
  support: "支援",
  defense: "防護",
  rupture: "命破",
  armorer: "鋭御",
};

/** 陣営IDと日本語名。characters.json の faction はここに登録されたIDを使う */
export interface FactionDef {
  id: string;
  label: string;
  /** 同陣営判定に使う大区分(防衛軍/治安局/ロスカリファ以外は自分自身) */
  group: string;
  /** 行の色帯に使う色(wikiwiki エージェント一覧の陣営列に準拠) */
  color: string;
}

/** 陣営(細分)。配列の順序がテーブルとアタッカー候補の既定の並び順 */
export const FACTIONS: FactionDef[] = [
  { id: "cunning_hares", label: "邪兎屋", group: "cunning_hares", color: "#ff498c" },
  { id: "victoria_housekeeping", label: "ヴィクトリア家政", group: "victoria_housekeeping", color: "#404049" },
  { id: "belobog_heavy_industries", label: "白祇重工", group: "belobog_heavy_industries", color: "#d4d4d4" },
  { id: "sons_of_calydon", label: "カリュドーンの子", group: "sons_of_calydon", color: "#bc3d29" },
  { id: "defense_force_obol", label: "防衛軍・オボルス小隊", group: "defense_force", color: "#e9d278" },
  { id: "defense_force_silver", label: "防衛軍・シルバー小隊", group: "defense_force", color: "#f0a65c" },
  { id: "hollow_special_operations", label: "対ホロウ六課", group: "hollow_special_operations", color: "#22bdcc" },
  { id: "neps_special_investigation", label: "治安局・特務捜査班", group: "new_eridu_public_security", color: "#0d75d9" },
  { id: "neps_public_order", label: "治安局・都市秩序部", group: "new_eridu_public_security", color: "#c9a97b" },
  { id: "stars_of_lyra", label: "スターズ・オブ・リラ", group: "stars_of_lyra", color: "#e14a3f" },
  { id: "mockingbird", label: "モッキンバード", group: "mockingbird", color: "#aa11cc" },
  { id: "yunkui_summit", label: "雲嶽山", group: "yunkui_summit", color: "#ffbf16" },
  { id: "spook_shack", label: "怪啖屋", group: "spook_shack", color: "#d54553" },
  { id: "krampus_compliance_authority", label: "クランプスの黒枝", group: "krampus_compliance_authority", color: "#716dff" },
  { id: "angels_of_delusion", label: "妄想エンジェル", group: "angels_of_delusion", color: "#f7509c" },
  { id: "phaethon", label: "パエトーン", group: "phaethon", color: "#ffe482" },
  { id: "ros_khalifa_foreign_affairs", label: "ロスカリファ・外務計策局", group: "ros_khalifa", color: "#185aca" },
  { id: "ros_khalifa_airspace", label: "ロスカリファ・空域巡警局", group: "ros_khalifa", color: "#2776f9" },
  { id: "ros_khalifa_flint_workshop", label: "ロスカリファ・フリンツ工房", group: "ros_khalifa", color: "#5fa8ff" },
  { id: "covenant_of_dayat", label: "ダアト結社", group: "covenant_of_dayat", color: "#b9adad" },
];

/** 大区分のラベル(細分をまとめる陣営。condition.factions にはこの ID も指定できる) */
export const FACTION_GROUP_LABEL: Record<string, string> = {
  defense_force: "新エリー都防衛軍",
  new_eridu_public_security: "新エリー都治安局",
  ros_khalifa: "ロスカリファ",
};

export const FACTION_LABEL: Record<string, string> = Object.fromEntries(FACTIONS.map((f) => [f.id, f.label]));
export const FACTION_ORDER: Record<string, number> = Object.fromEntries(FACTIONS.map((f, i) => [f.id, i]));
export const FACTION_GROUP: Record<string, string> = Object.fromEntries(FACTIONS.map((f) => [f.id, f.group]));
export const FACTION_COLOR: Record<string, string> = Object.fromEntries(FACTIONS.map((f) => [f.id, f.color]));

/** 同陣営判定用の大区分 ID(細分 ID / 大区分 ID のどちらを渡してもよい) */
export function factionGroupOf(id: string): string {
  return FACTION_GROUP[id] ?? id;
}
/** 細分 ID または大区分 ID として有効か */
export function isFactionId(id: string): boolean {
  return id in FACTION_LABEL || id in FACTION_GROUP_LABEL;
}
/** 表示ラベル(細分 → 大区分 → ID の順で解決) */
export function factionLabelOf(id: string): string {
  return FACTION_LABEL[id] ?? FACTION_GROUP_LABEL[id] ?? id;
}
