import type { CalcMode, Role } from "../types";

/**
 * ダメージ計算(純粋関数)。式と根拠は src/data/formula.md。
 * スキル倍率・敵 HP・距離減衰など比率計算で打ち消される項は持たない(expected は相対値)。
 */

/** 計算モード: 直接攻撃 / 状態異常 / 狂咲(状態異常中の敵への追加状態異常ダメージ) / 混沌 / 重傷(鋭御の鋭撃ダメージ単発ヒット) */
export type DamageMode = CalcMode;
export const ANOMALY_MODES: ReadonlySet<DamageMode> = new Set(["anomaly", "abloom", "disorder"]);

/** 混沌の基礎ダメージ倍率%(wikiwiki 状態異常: 物理/炎/氷/電気/エーテルは 450% + 残秒数依存)。「混沌ダメージ倍率+X%」はこれへの加算として扱う */
export const DISORDER_BASE_MULT = 450;
/** 攻撃種別(汎用 = 種別限定バフを含めない) */
export type AttackType = "generic" | "basic" | "dash" | "ex" | "chain" | "ult" | "assist" | "aftershock";

export const ATTACK_TYPE_STAT: Record<Exclude<AttackType, "generic">, string> = {
  basic: "basic_dmg_pct",
  dash: "dash_dmg_pct",
  ex: "ex_dmg_pct",
  chain: "chain_dmg_pct",
  ult: "ult_dmg_pct",
  assist: "assist_dmg_pct",
  aftershock: "aftershock_dmg_pct",
};
export const SKILL_TYPE_STATS = new Set(Object.values(ATTACK_TYPE_STAT));

/** 攻撃側レベル係数 K(wikiwiki ダメージ計算式) */
export const LEVEL_COEF: Record<number, number> = { 1: 50, 10: 94, 20: 172, 30: 281, 40: 421, 50: 592, 55: 689, 59: 772, 60: 794 };

/** アタッカーの常時(戦闘外)パネル。% は百分率の数値(30 = 30%) */
export interface AttackerPanel {
  role: Role;
  level: number;
  /** 基礎攻撃力(エージェント + コアスキル + 音動機) */
  baseAtk: number;
  atkPct: number;
  atkFlat: number;
  baseHp: number;
  hpPct: number;
  hpFlat: number;
  baseDef: number;
  defPct: number;
  defFlat: number;
  critRate: number;
  critDmg: number;
  /** 異常マスタリー */
  anomalyProficiency: number;
  /** 異常掌握(% 補正後の実数) */
  anomalyMastery: number;
  penRatio: number;
  penFlat: number;
  /** 常時の与ダメ%(属性ダメージ等) */
  dmgPct: number;
  /** 鋭御の暴傷ダメージ(基礎 150) */
  sharpCritDmg: number;
  /** 固定透徹力(命破) */
  sheerForceFlat: number;
}

export interface EnemyState {
  /** 敵防御力(Lv60 以降は一定) */
  def: number;
  /** アタッカー属性に対する耐性%(弱点 -20 / 耐性 +20) */
  res: number;
  /** ブレイク中の弱体倍率%(標準 150) */
  stunMultiplier: number;
  /** 弱体倍率の上限%(バフ加算後の合計をここでカット。未指定なら上限なし) */
  stunMultiplierMax?: number;
  broken: boolean;
  /** 受ける状態異常ダメージの増減% */
  anomalyTakenPct: number;
  /** ミアズマシールド展開中(防御アップ・ダメージカット・ブレイク不可) */
  miasma: boolean;
  miasmaDefUpPct?: number;
  miasmaDmgCutPct?: number;
}

/** stat キー → 合計値(最大スタック・属性フィルタ済み) */
export type BuffTotals = Partial<Record<string, number>>;

export interface DamageOptions {
  mode: DamageMode;
  /** 状態異常に会心を適用する(Ver.3.3 以降の仕様の受け口。既定 false) */
  anomalyCrit?: boolean;
  /** 状態異常/混沌で蓄積側(異常掌握・蓄積効率・敵蓄積耐性ダウン)を発動頻度の近似として乗じる(既定 true) */
  includeBuildup?: boolean;
}

export interface DamageParts {
  /** 基準となるステータス(攻撃力 / 透徹力 / 防御力) */
  baseStat: number;
  atk: number;
  critMul: number;
  dmgMul: number;
  defMul: number;
  resMul: number;
  takenMul: number;
  breakMul: number;
  /** 役割/モード固有の別枠(透徹ダメ% / 異常ダメ枠 / 狂咲 / 混沌) */
  extraMul: number;
  /** 異常マスタリー/100 × Lv係数(異常系のみ、それ以外 1) */
  apMul: number;
  /** 蓄積側の相対倍率(異常系のみ、それ以外 1) */
  buildupMul: number;
}

export interface DamageResult {
  expected: number;
  parts: DamageParts;
}

const v = (b: BuffTotals, k: string) => b[k] ?? 0;
const pct = (n: number) => n / 100;

export function levelCoef(level: number): number {
  const keys = Object.keys(LEVEL_COEF)
    .map(Number)
    .sort((a, b) => a - b);
  let k = LEVEL_COEF[keys[0]];
  for (const l of keys) if (l <= level) k = LEVEL_COEF[l];
  return k;
}

/** 状態異常のレベル係数(Lv60 = 2.0、小数第 4 位以下切り捨て) */
export function anomalyLevelCoef(level: number): number {
  return Math.floor((1 + (level - 1) / 59) * 10000) / 10000;
}

/** 通常の会心期待値(会心率は 100% でクリップ) */
export function critExpectation(critRate: number, critDmg: number): number {
  return 1 + Math.min(100, Math.max(0, critRate)) / 100 * (critDmg / 100);
}

/**
 * 鋭御の会心(暴傷)期待値。会心時は会心ダメージの代わりに暴傷ダメージボーナス L が乗り、
 * 会心率 100% 超過分でもう一度「暴傷」判定を行い発生すれば L がもう 1 回乗る(判定は 2 回まで = 200% で頭打ち)
 */
export function armorerCritExpectation(critRate: number, sharpCritDmg: number): number {
  const cr = Math.min(200, Math.max(0, critRate)) / 100;
  const L = sharpCritDmg / 100;
  if (cr <= 1) return 1 + cr * L;
  return (1 + L) * (1 + (cr - 1) * L);
}

/** 防御枠 */
export function defMultiplier(level: number, enemyDef: number, defDownPct: number, penRatio: number, penFlat: number): number {
  const K = levelCoef(level);
  const eff = Math.max(0, enemyDef * (1 - pct(Math.min(100, defDownPct))) * (1 - pct(Math.min(100, penRatio))) - penFlat);
  return K / (K + eff);
}

/** 戦闘内攻撃力 */
export function combatAtk(p: AttackerPanel, b: BuffTotals): number {
  const out = p.baseAtk * (1 + pct(p.atkPct)) + p.atkFlat;
  return out * (1 + pct(v(b, "atk_pct"))) + v(b, "atk_flat");
}

export function computeDamage(p: AttackerPanel, e: EnemyState, b: BuffTotals, o: DamageOptions): DamageResult {
  const mode = o.mode;
  const isAnomaly = ANOMALY_MODES.has(mode);
  const atk = combatAtk(p, b);
  const hp = p.baseHp * (1 + pct(p.hpPct + v(b, "hp_pct"))) + p.hpFlat + v(b, "hp_flat");
  const def = p.baseDef * (1 + pct(p.defPct + v(b, "def_pct"))) + p.defFlat + v(b, "def_flat");
  const critRate = p.critRate + v(b, "crit_rate");
  const critDmg = p.critDmg + v(b, "crit_dmg");

  // 与ダメ枠(1 つの加算枠)。攻撃種別限定バフは呼び出し側で種別に応じてフィルタ済み
  let dmgSum = p.dmgPct + v(b, "dmg_pct") + v(b, "dmg_pct_element");
  for (const k of SKILL_TYPE_STATS) dmgSum += v(b, k);
  const dmgMul = 1 + pct(dmgSum);

  const enemyDef = e.def * (1 + (e.miasma ? pct(e.miasmaDefUpPct ?? 80) : 0));
  const resMul = 1 - pct(e.res) + pct(v(b, "enemy_res_down_pct") + v(b, "enemy_res_ignore_all_pct"));
  const takenMul = 1 + pct(v(b, "enemy_dmg_taken_pct")) - (e.miasma ? pct(e.miasmaDmgCutPct ?? 25) : 0);
  const stunTotal = e.stunMultiplier + v(b, "enemy_stun_dmg_multiplier");
  const stunCapped = e.stunMultiplierMax !== undefined ? Math.min(e.stunMultiplierMax, stunTotal) : stunTotal;
  const breakMul = e.broken && !e.miasma ? pct(stunCapped) : 1;

  let baseStat: number;
  let critMul: number;
  let defMul: number;
  let extraMul = 1;
  let apMul = 1;
  let buildupMul = 1;

  if (isAnomaly) {
    // 状態異常ダメージ: 攻撃力 × 異常マスタリー/100 × Lv係数。
    // 会心: 固有の状態異常会心(ジェーンの強撃、アリアの狂咲など anomaly_crit_*)は常に適用。
    // anomalyCrit(Ver.3.3 以降の受け口)が ON のときは通常の会心率/会心ダメージも合算する
    baseStat = atk;
    apMul = ((p.anomalyProficiency + v(b, "anomaly_proficiency")) / 100) * anomalyLevelCoef(p.level);
    const acr = v(b, "anomaly_crit_rate") + (o.anomalyCrit ? critRate : 0);
    const acd = v(b, "anomaly_crit_dmg") + (o.anomalyCrit ? critDmg : 0);
    critMul = acr > 0 ? critExpectation(acr, acd) : 1;
    defMul = defMultiplier(p.level, enemyDef, v(b, "enemy_def_down_pct"), p.penRatio + v(b, "pen_ratio"), p.penFlat + v(b, "pen_flat"));
    extraMul = 1 + pct(v(b, "anomaly_dmg_pct") + v(b, "enemy_anomaly_taken_pct") + e.anomalyTakenPct);
    if (mode === "abloom") extraMul *= 1 + pct(v(b, "abloom_dmg_pct"));
    if (mode === "disorder") extraMul *= (1 + pct(v(b, "disorder_dmg_pct"))) * ((DISORDER_BASE_MULT + v(b, "disorder_multiplier_pct")) / DISORDER_BASE_MULT);
    if ((mode === "anomaly" || mode === "disorder") && (o.includeBuildup ?? true)) {
      const am = p.anomalyMastery > 0 ? (p.anomalyMastery + v(b, "anomaly_mastery")) / p.anomalyMastery : 1;
      buildupMul = am * (1 + pct(v(b, "anomaly_buildup_pct"))) * (1 + pct(v(b, "enemy_anomaly_buildup_res_down_pct")));
    }
  } else if (p.role === "rupture") {
    // 命破: 透徹力基準、防御枠なし、透徹ダメ% は別枠
    const sheer = (0.3 * atk + 0.1 * hp + p.sheerForceFlat + v(b, "sheer_force_flat")) * (1 + pct(v(b, "sheer_force_pct")));
    baseStat = sheer;
    critMul = critExpectation(critRate, critDmg);
    defMul = 1;
    extraMul = 1 + pct(v(b, "sheer_dmg_pct"));
  } else if (p.role === "armorer") {
    // 鋭御: 防御力基準、暴傷ダメージで会心、会心ダメージは無効
    baseStat = def;
    critMul = armorerCritExpectation(critRate, p.sharpCritDmg + v(b, "sharp_crit_dmg"));
    defMul = defMultiplier(p.level, enemyDef, v(b, "enemy_def_down_pct"), p.penRatio + v(b, "pen_ratio"), p.penFlat + v(b, "pen_flat"));
    // 鋭撃ダメージ% は与ダメ枠とは別枠乗算(命破の透徹ダメージ% と同じ扱い)
    extraMul = 1 + pct(v(b, "sharp_dmg_pct"));
    // 重傷モード: 重傷の単発ヒット。重傷ダメージ倍率アップ(クラレッタ M1 の 130% など)を別枠で乗せる。攻撃種別限定バフは呼び出し側で除外
    if (mode === "grievous") extraMul *= 1 + pct(v(b, "grievous_multiplier_pct"));
  } else {
    baseStat = atk;
    critMul = critExpectation(critRate, critDmg);
    defMul = defMultiplier(p.level, enemyDef, v(b, "enemy_def_down_pct"), p.penRatio + v(b, "pen_ratio"), p.penFlat + v(b, "pen_flat"));
  }

  const expected = baseStat * apMul * dmgMul * critMul * defMul * resMul * takenMul * breakMul * extraMul * buildupMul;
  return { expected, parts: { baseStat, atk, critMul, dmgMul, defMul, resMul, takenMul, breakMul, extraMul, apMul, buildupMul } };
}
