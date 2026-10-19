import type { FixedBuff } from "../lib/compare";

/**
 * 危局強襲戦 / 式輿防衛戦 激変ノードのバフのプリセット(固定バフ行として追加する)。
 * 出典: wikiwiki 危局強襲戦(https://wikiwiki.jp/zenless/危局強襲戦)、式輿防衛戦(https://wikiwiki.jp/zenless/式輿防衛戦)。
 * 役割限定(「強攻の攻撃力+20%」など)や条件付き(「終結スキル後」)も上限値として収録する(既存 DB と同じ方針)。
 * 既存 stat で表現できない効果(ブレイク値 / エネルギー)は note に残し数値化しない。
 */
export interface FixedPreset {
  id: string;
  label: string;
  group: "危局強襲戦 Ver.3.2 第3期" | "激変ノード Ver.3.2 第3期";
  buffs: FixedBuff[];
  note: string;
  sourceUrl: string;
}

const DA = "https://wikiwiki.jp/zenless/危局強襲戦";
const SD = "https://wikiwiki.jp/zenless/式輿防衛戦";

export const FIXED_PRESETS: FixedPreset[] = [
  {
    id: "da_3_2_3_hagyo",
    label: "破御(強攻の攻撃力+20%、終結後の会心ダメ+50%)",
    group: "危局強襲戦 Ver.3.2 第3期",
    buffs: [
      { stat: "atk_pct", value: 20 },
      { stat: "crit_dmg", value: 50 },
    ],
    note: "ブレイク値+20% は数値化しない。攻撃力+20% は強攻限定、会心ダメ+50% は終結スキル後(上限値として収録)",
    sourceUrl: DA,
  },
  {
    id: "da_3_2_3_rinretsu",
    label: "凛冽(氷ダメ+15%、異常マスタリー+60、狂咲/混沌後の異常・混沌ダメ+25%)",
    group: "危局強襲戦 Ver.3.2 第3期",
    buffs: [
      { stat: "dmg_pct_element", value: 15, element: "ice" },
      { stat: "anomaly_proficiency", value: 60 },
      { stat: "anomaly_dmg_pct", value: 25 },
      { stat: "disorder_dmg_pct", value: 25 },
      { stat: "anomaly_buildup_pct", value: 15 },
    ],
    note: "狂咲/混沌発動後のチーム効果は上限値として常時扱い",
    sourceUrl: DA,
  },
  {
    id: "da_3_2_3_eijin",
    label: "鋭刃(防御力+15%、鋭撃ダメ+15%、特殊/強化特殊後の電気・風ダメ+30%)",
    group: "危局強襲戦 Ver.3.2 第3期",
    buffs: [
      { stat: "def_pct", value: 15 },
      { stat: "sharp_dmg_pct", value: 15 },
      { stat: "dmg_pct_element", value: 30, element: "electric" },
      { stat: "dmg_pct_element", value: 30, element: "wind" },
    ],
    note: "撃破の強化特殊ブレイク値+20% は数値化しない",
    sourceUrl: DA,
  },
  {
    id: "cn_3_2_3_05_1",
    label: "激変 05-1(鋭撃ダメ+20%、スキル命中で貫通率+10%、ブレイク中の敵の電気耐性15%無視)",
    group: "激変ノード Ver.3.2 第3期",
    buffs: [
      { stat: "sharp_dmg_pct", value: 20 },
      { stat: "pen_ratio", value: 10 },
      { stat: "enemy_res_down_pct", value: 15, element: "electric" },
    ],
    note: "撃破のエネルギー+15 は数値化しない",
    sourceUrl: SD,
  },
  {
    id: "cn_3_2_3_05_2",
    label: "激変 05-2(異常特性 3 名で状態異常ダメ+60%)",
    group: "激変ノード Ver.3.2 第3期",
    buffs: [{ stat: "anomaly_dmg_pct", value: 60 }],
    note: "異常特性 2 名なら +10%(現行ステージ表記。予定表は +50%)。入場時デシベルは数値化しない",
    sourceUrl: SD,
  },
  {
    id: "cn_3_2_3_05_3",
    label: "激変 05-3(炎/エーテルダメ+15%、透徹ダメ+15%、終結ダメ+30%、全属性耐性10%無視)",
    group: "激変ノード Ver.3.2 第3期",
    buffs: [
      { stat: "dmg_pct_element", value: 15, element: "fire" },
      { stat: "dmg_pct_element", value: 15, element: "ether" },
      { stat: "sheer_dmg_pct", value: 15 },
      { stat: "ult_dmg_pct", value: 30 },
      { stat: "enemy_res_ignore_all_pct", value: 10 },
    ],
    note: "終結スキル関連は攻撃種別「終結スキル」選択時のみ有効",
    sourceUrl: SD,
  },
];
