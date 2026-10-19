import type { Role } from "../types";

/**
 * ドライバディスクの「平均的なビルド」既定値(S 級 Lv15、有効サブ命中 24 回前後 = ホヨラボ評価 S+ 相当)。
 * 数値の根拠は src/data/formula.md §7(wikiwiki ドライバディスク)。4 セット効果は条件付きが多いため含めない。
 */

/** ディスク由来の常時ステータス(戦闘外レイヤー) */
export interface DiscBuild {
  hp_flat: number;
  atk_flat: number;
  def_flat: number;
  hp_pct: number;
  atk_pct: number;
  def_pct: number;
  crit_rate: number;
  crit_dmg: number;
  /** 異常マスタリー(固定値) */
  anomaly_proficiency: number;
  /** 異常掌握% */
  anomaly_mastery_pct: number;
  pen_ratio: number;
  pen_flat: number;
  /** アタッカー属性の属性ダメージ% */
  element_dmg_pct: number;
}

export type DiscPresetId = "attack" | "anomaly" | "rupture" | "armorer";

export interface DiscPreset {
  id: DiscPresetId;
  label: string;
  /** 4/5/6 番のメインステータス(表示用) */
  mains: string;
  /** サブステータス(表示用) */
  subs: string;
  /** 2 セット効果(表示用) */
  sets: string;
  build: DiscBuild;
}

/** S 級 Lv15 の固定メイン(1〜3 番) */
const FIXED = { hp_flat: 2200, atk_flat: 316, def_flat: 184 };
const ZERO: DiscBuild = {
  ...FIXED,
  hp_pct: 0,
  atk_pct: 0,
  def_pct: 0,
  crit_rate: 0,
  crit_dmg: 0,
  anomaly_proficiency: 0,
  anomaly_mastery_pct: 0,
  pen_ratio: 0,
  pen_flat: 0,
  element_dmg_pct: 0,
};

/** サブ 1 回分の値 */
export const SUB = { crit_rate: 2.4, crit_dmg: 4.8, atk_pct: 3, atk_flat: 19, hp_pct: 3, def_pct: 4.8, pen_flat: 9, anomaly_proficiency: 9, def_flat: 15 };

export const DISC_PRESETS: DiscPreset[] = [
  {
    id: "attack",
    label: "強攻型(撃破/支援/防護も同じ)",
    mains: "4 会心ダメージ 48% / 5 属性ダメージ 30% / 6 攻撃力 30%",
    subs: "会心率 ×8 / 会心ダメージ ×8 / 攻撃力% ×5 / 攻撃力 ×3",
    sets: "属性ダメージ +10% / 会心率 +8%",
    build: {
      ...ZERO,
      crit_dmg: 48 + SUB.crit_dmg * 8,
      element_dmg_pct: 30 + 10,
      atk_pct: 30 + SUB.atk_pct * 5,
      crit_rate: SUB.crit_rate * 8 + 8,
      atk_flat: FIXED.atk_flat + SUB.atk_flat * 3,
    },
  },
  {
    id: "anomaly",
    label: "異常型",
    mains: "4 異常マスタリー 92 / 5 属性ダメージ 30% / 6 異常掌握 30%",
    subs: "異常マスタリー ×8 / 攻撃力% ×8 / 攻撃力 ×4 / 貫通値 ×4",
    sets: "異常マスタリー +30 / 属性ダメージ +10%",
    build: {
      ...ZERO,
      anomaly_proficiency: 92 + SUB.anomaly_proficiency * 8 + 30,
      element_dmg_pct: 30 + 10,
      anomaly_mastery_pct: 30,
      atk_pct: SUB.atk_pct * 8,
      atk_flat: FIXED.atk_flat + SUB.atk_flat * 4,
      pen_flat: SUB.pen_flat * 4,
    },
  },
  {
    id: "rupture",
    label: "命破型",
    mains: "4 会心ダメージ 48% / 5 属性ダメージ 30% / 6 HP 30%",
    subs: "会心率 ×8 / 会心ダメージ ×8 / HP% ×5 / 攻撃力% ×3",
    sets: "属性ダメージ +10% / 会心率 +8%",
    build: {
      ...ZERO,
      crit_dmg: 48 + SUB.crit_dmg * 8,
      element_dmg_pct: 30 + 10,
      hp_pct: 30 + SUB.hp_pct * 5,
      crit_rate: SUB.crit_rate * 8 + 8,
      atk_pct: SUB.atk_pct * 3,
    },
  },
  {
    id: "armorer",
    label: "鋭御型",
    mains: "4 会心率 24% / 5 貫通率 24% / 6 防御力 48%",
    subs: "会心率 ×8 / 防御力% ×8 / 貫通値 ×4 / 防御力 ×4",
    sets: "防御力 +16% / 属性ダメージ +10%",
    build: {
      ...ZERO,
      crit_rate: 24 + SUB.crit_rate * 8,
      pen_ratio: 24,
      def_pct: 48 + SUB.def_pct * 8 + 16,
      pen_flat: SUB.pen_flat * 4,
      def_flat: FIXED.def_flat + SUB.def_flat * 4,
      element_dmg_pct: 10,
    },
  },
];

export const DISC_PRESET_BY_ID = Object.fromEntries(DISC_PRESETS.map((p) => [p.id, p])) as Record<DiscPresetId, DiscPreset>;

/** 役割に対する既定のディスクプリセット */
export function defaultDiscPresetFor(role: Role): DiscPresetId {
  if (role === "anomaly") return "anomaly";
  if (role === "rupture") return "rupture";
  if (role === "armorer") return "armorer";
  return "attack";
}
