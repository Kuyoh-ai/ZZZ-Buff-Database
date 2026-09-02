export interface StatDef {
  key: string;
  label: string;
  short: string;
  unit: "%" | "";
  /** 敵に付与するデバフか */
  debuff?: boolean;
  /** 属性付き(element指定を伴う)か */
  elemental?: boolean;
  group: "基礎" | "ダメージ" | "異常" | "ブレイク" | "エネルギー" | "デバフ";
}

export const STATS: StatDef[] = [
  { key: "atk_pct", label: "攻撃力%", short: "攻撃%", unit: "%", group: "基礎" },
  { key: "atk_flat", label: "攻撃力(固定)", short: "攻撃+", unit: "", group: "基礎" },
  { key: "crit_rate", label: "会心率", short: "会心率", unit: "%", group: "基礎" },
  { key: "crit_dmg", label: "会心ダメージ", short: "会心DMG", unit: "%", group: "基礎" },
  { key: "pen_ratio", label: "貫通率", short: "貫通率", unit: "%", group: "基礎" },
  { key: "pen_flat", label: "貫通値", short: "貫通+", unit: "", group: "基礎" },
  { key: "atk_speed_pct", label: "攻撃速度", short: "攻速", unit: "%", group: "基礎" },
  { key: "sheer_force_pct", label: "貫通力%", short: "貫通力%", unit: "%", group: "基礎" },
  { key: "sheer_force_flat", label: "貫通力(固定)", short: "貫通力+", unit: "", group: "基礎" },
  { key: "dmg_pct", label: "与ダメージ", short: "与DMG", unit: "%", group: "ダメージ" },
  { key: "dmg_pct_element", label: "属性ダメージ", short: "属性DMG", unit: "%", elemental: true, group: "ダメージ" },
  { key: "basic_dmg_pct", label: "通常攻撃ダメージ", short: "通常DMG", unit: "%", group: "ダメージ" },
  { key: "dash_dmg_pct", label: "ダッシュ攻撃ダメージ", short: "ダッシュDMG", unit: "%", group: "ダメージ" },
  { key: "ex_dmg_pct", label: "強化特殊ダメージ", short: "特殊DMG", unit: "%", group: "ダメージ" },
  { key: "chain_dmg_pct", label: "連携スキルダメージ", short: "連携DMG", unit: "%", group: "ダメージ" },
  { key: "ult_dmg_pct", label: "終結スキルダメージ", short: "終結DMG", unit: "%", group: "ダメージ" },
  { key: "assist_dmg_pct", label: "支援攻撃ダメージ", short: "支援DMG", unit: "%", group: "ダメージ" },
  { key: "anomaly_proficiency", label: "異常マスタリー", short: "異常マス", unit: "", group: "異常" },
  { key: "anomaly_mastery", label: "異常掌握", short: "異常掌握", unit: "", group: "異常" },
  { key: "anomaly_buildup_pct", label: "異常蓄積効率", short: "異常蓄積", unit: "%", group: "異常" },
  { key: "anomaly_dmg_pct", label: "属性異常ダメージ", short: "異常DMG", unit: "%", group: "異常" },
  { key: "disorder_dmg_pct", label: "混沌ダメージ", short: "混沌DMG", unit: "%", group: "異常" },
  { key: "impact_pct", label: "衝撃力%", short: "衝撃力%", unit: "%", group: "ブレイク" },
  { key: "impact_flat", label: "衝撃力(固定)", short: "衝撃力+", unit: "", group: "ブレイク" },
  { key: "daze_pct", label: "与ブレイク値", short: "ブレイク値", unit: "%", group: "ブレイク" },
  { key: "energy_regen", label: "エネルギー自動回復", short: "EN回復", unit: "", group: "エネルギー" },
  { key: "energy_gain_flat", label: "エネルギー獲得", short: "EN獲得", unit: "", group: "エネルギー" },
  { key: "decibel_gain", label: "デシベル獲得", short: "デシベル", unit: "", group: "エネルギー" },
  { key: "adrenaline", label: "アドレナリン", short: "アドレナ", unit: "", group: "エネルギー" },
  { key: "enemy_def_down_pct", label: "敵防御力ダウン", short: "防御DOWN", unit: "%", debuff: true, group: "デバフ" },
  { key: "enemy_res_down_pct", label: "敵属性耐性ダウン", short: "耐性DOWN", unit: "%", debuff: true, elemental: true, group: "デバフ" },
  { key: "enemy_dmg_taken_pct", label: "敵被ダメージ増加", short: "被DMG", unit: "%", debuff: true, group: "デバフ" },
  { key: "enemy_stun_dmg_multiplier", label: "ブレイク弱体倍率", short: "弱体倍率", unit: "%", debuff: true, group: "デバフ" },
  { key: "enemy_anomaly_taken_pct", label: "敵被異常ダメージ増加", short: "被異常", unit: "%", debuff: true, group: "デバフ" },
  { key: "hp_pct", label: "HP%", short: "HP%", unit: "%", group: "基礎" },
  { key: "def_pct", label: "防御力%", short: "防御%", unit: "%", group: "基礎" },
  { key: "sheer_dmg_pct", label: "透徹ダメージ", short: "透徹DMG", unit: "%", group: "ダメージ" },
  { key: "aftershock_dmg_pct", label: "追加攻撃ダメージ", short: "追加攻撃DMG", unit: "%", group: "ダメージ" },
  { key: "enemy_res_ignore_all_pct", label: "敵全属性耐性ダウン/無視", short: "全耐性DOWN", unit: "%", debuff: true, group: "デバフ" },
  { key: "enemy_anomaly_buildup_res_down_pct", label: "敵異常蓄積耐性ダウン", short: "蓄積耐性DOWN", unit: "%", debuff: true, group: "デバフ" },
];

export const STAT_KEYS = STATS.map((s) => s.key);
export const STAT_BY_KEY = Object.fromEntries(STATS.map((s) => [s.key, s])) as Record<string, StatDef>;
