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
};

/** 陣営IDと日本語名。characters.json の faction はここに登録されたIDを使う */
export const FACTION_LABEL: Record<string, string> = {
  cunning_hares: "邪兎屋",
  victoria_housekeeping: "ヴィクトリア家政",
  belobog_heavy_industries: "白祇重工",
  sons_of_calydon: "カリュドーンの子",
  obol_squad: "オボルス小隊",
  new_eridu_public_security: "新エリー都治安局", // 刑事捜査特別チーム / 都市秩序部 などの課を含む
  hollow_special_operations: "対ホロウ特別行動部第六課",
  stars_of_lyra: "スターズ・オブ・リラ",
  mockingbird: "モッキンバード",
  defense_force: "新エリー都防衛軍",
  yunkui_summit: "雲嶽山",
  spook_shack: "怪談屋",
  angels_of_delusion: "妄想エンジェル",
  covenant_of_dayat: "ダアト結社",
  krampus_compliance_authority: "クランプスの黒枝",
  ros_khalifa: "ロスカリファ", // 空域巡警局 / 外務計策局 などの局を含む
  phaethon: "パエトーン",
  other: "その他",
};
