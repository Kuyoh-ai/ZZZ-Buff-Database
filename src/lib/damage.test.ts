import { describe, expect, it } from "vitest";
import {
  anomalyLevelCoef,
  armorerCritExpectation,
  computeDamage,
  critExpectation,
  defMultiplier,
  levelCoef,
  type AttackerPanel,
  type EnemyState,
} from "./damage";

/** formula.md §10 の fixture: 戦闘内攻撃力 3000 / CR 70 / CD 150 / 与ダメ +50 / 敵防御 952.8 / 貫通率 20 / 弱点 / ブレイク 150% */
const panel: AttackerPanel = {
  role: "attack",
  level: 60,
  baseAtk: 3000,
  atkPct: 0,
  atkFlat: 0,
  baseHp: 15000,
  hpPct: 0,
  hpFlat: 0,
  baseDef: 1000,
  defPct: 0,
  defFlat: 0,
  critRate: 70,
  critDmg: 150,
  anomalyProficiency: 100,
  anomalyMastery: 100,
  penRatio: 20,
  penFlat: 0,
  dmgPct: 50,
  sharpCritDmg: 150,
  sheerForceFlat: 0,
};
const enemy: EnemyState = { def: 952.8, res: -20, stunMultiplier: 150, broken: true, anomalyTakenPct: 0, miasma: false };

describe("damage: 基本項", () => {
  it("レベル係数と異常レベル係数", () => {
    expect(levelCoef(60)).toBe(794);
    expect(levelCoef(55)).toBe(689);
    expect(levelCoef(57)).toBe(689); // 表にない Lv は直前の値
    expect(anomalyLevelCoef(60)).toBe(2);
    expect(anomalyLevelCoef(1)).toBe(1);
  });
  it("会心期待値は会心率 100% でクリップ", () => {
    expect(critExpectation(70, 150)).toBeCloseTo(2.05, 10);
    expect(critExpectation(130, 100)).toBeCloseTo(2, 10);
    expect(critExpectation(-5, 100)).toBeCloseTo(1, 10);
  });
  it("鋭御の会心は 100% 超で 2 段判定、200% で頭打ち", () => {
    expect(armorerCritExpectation(50, 150)).toBeCloseTo(1.75, 10);
    expect(armorerCritExpectation(130, 150)).toBeCloseTo(3.625, 10);
    expect(armorerCritExpectation(200, 150)).toBeCloseTo(6.25, 10);
    expect(armorerCritExpectation(250, 150)).toBeCloseTo(6.25, 10);
  });
  it("防御枠: 貫通率 100% / 貫通値過多で実効防御は 0(下限)", () => {
    expect(defMultiplier(60, 952.8, 0, 20, 0)).toBeCloseTo(0.510204, 5);
    expect(defMultiplier(60, 952.8, 0, 100, 0)).toBe(1);
    expect(defMultiplier(60, 952.8, 0, 0, 5000)).toBe(1);
    expect(defMultiplier(60, 952.8, 0, 0, 0)).toBeCloseTo(0.4545, 3);
    // 防御ダウンと防御無視は同枠加算(呼び出し側で合算)、貫通率は別で乗算
    expect(defMultiplier(60, 1000, 50, 50, 0)).toBeCloseTo(794 / (794 + 250), 10);
  });
});

describe("damage: fixture(formula.md §10)", () => {
  it("通常ダメージ 8471.94", () => {
    const r = computeDamage(panel, enemy, {}, { mode: "direct" });
    expect(r.expected).toBeCloseTo(8471.94, 1);
    expect(r.parts.defMul).toBeCloseTo(0.510204, 5);
    expect(r.parts.resMul).toBeCloseTo(1.2, 10);
    expect(r.parts.breakMul).toBeCloseTo(1.5, 10);
  });
  it("命破 13284.0(透徹力 2400、防御枠なし、貫通率は無効)", () => {
    const r = computeDamage({ ...panel, role: "rupture" }, enemy, {}, { mode: "direct" });
    expect(r.parts.baseStat).toBeCloseTo(2400, 10);
    expect(r.parts.defMul).toBe(1);
    expect(r.expected).toBeCloseTo(13284.0, 1);
    const withPen = computeDamage({ ...panel, role: "rupture" }, enemy, { pen_ratio: 50, enemy_def_down_pct: 30 }, { mode: "direct" });
    expect(withPen.expected).toBeCloseTo(r.expected, 6);
  });
  it("鋭御 4993.62(防御力 1000、CR 130、暴傷 150。会心ダメージは無効)", () => {
    const p = { ...panel, role: "armorer" as const, critRate: 130 };
    const r = computeDamage(p, enemy, {}, { mode: "direct" });
    expect(r.expected).toBeCloseTo(4993.62, 1);
    const cd = computeDamage(p, enemy, { crit_dmg: 100, atk_pct: 50 }, { mode: "direct" });
    expect(cd.expected).toBeCloseTo(r.expected, 6);
    const sharp = computeDamage(p, enemy, { sharp_crit_dmg: 25 }, { mode: "direct" });
    expect(sharp.parts.critMul).toBeCloseTo(2.75 * (1 + 0.3 * 1.75), 10);
    // 鋭撃ダメージ% は与ダメ枠とは別枠乗算。鋭御以外では無効
    const sd = computeDamage(p, enemy, { sharp_dmg_pct: 16, dmg_pct: 10 }, { mode: "direct" });
    expect(sd.parts.extraMul).toBeCloseTo(1.16, 10);
    expect(sd.parts.dmgMul).toBeCloseTo(1.6, 10);
    expect(computeDamage(panel, enemy, { sharp_dmg_pct: 16 }, { mode: "direct" }).parts.extraMul).toBe(1);
  });
});

describe("damage: 重傷モード(鋭御)", () => {
  const cl = { ...panel, role: "armorer" as const, critRate: 150 };
  it("重傷は鋭御の直接攻撃と同じ基準(防御力・暴傷会心・鋭撃ダメ)に重傷倍率を別枠で乗せる", () => {
    const direct = computeDamage(cl, enemy, { sharp_dmg_pct: 16 }, { mode: "direct" });
    const gr = computeDamage(cl, enemy, { sharp_dmg_pct: 16 }, { mode: "grievous" });
    expect(gr.expected).toBeCloseTo(direct.expected, 6);
    const gm = computeDamage(cl, enemy, { sharp_dmg_pct: 16, grievous_multiplier_pct: 30 }, { mode: "grievous" });
    expect(gm.parts.extraMul).toBeCloseTo(1.16 * 1.3, 10);
    expect(computeDamage(cl, enemy, { grievous_multiplier_pct: 30 }, { mode: "direct" }).parts.extraMul).toBeCloseTo(1, 10);
  });
  it("暴傷ダメージバフは会心率 100% 超で 2 段とも乗るため効果が大きい", () => {
    const base = computeDamage({ ...cl, critRate: 200 }, enemy, {}, { mode: "grievous" });
    const buffed = computeDamage({ ...cl, critRate: 200 }, enemy, { sharp_crit_dmg: 25 }, { mode: "grievous" });
    expect(buffed.expected / base.expected).toBeCloseTo((2.75 * 2.75) / (2.5 * 2.5), 10);
    const low = computeDamage({ ...cl, critRate: 50 }, enemy, { sharp_crit_dmg: 25 }, { mode: "grievous" }).expected / computeDamage({ ...cl, critRate: 50 }, enemy, {}, { mode: "grievous" }).expected;
    expect(low).toBeCloseTo(1.875 / 1.75, 10);
  });
});

describe("damage: 枠の加算/乗算", () => {
  it("非ブレイク時はブレイク枠 1.0、弱体倍率バフは加算", () => {
    const nb = computeDamage(panel, { ...enemy, broken: false }, { enemy_stun_dmg_multiplier: 35 }, { mode: "direct" });
    expect(nb.parts.breakMul).toBe(1);
    const b = computeDamage(panel, enemy, { enemy_stun_dmg_multiplier: 35 }, { mode: "direct" });
    expect(b.parts.breakMul).toBeCloseTo(1.85, 10);
  });
  it("弱体倍率の上限: バフ加算後の合計を上限でカット(上限未指定なら無制限)", () => {
    const capped = { ...enemy, stunMultiplierMax: 200 };
    expect(computeDamage(panel, capped, { enemy_stun_dmg_multiplier: 35 }, { mode: "direct" }).parts.breakMul).toBeCloseTo(1.85, 10);
    expect(computeDamage(panel, capped, { enemy_stun_dmg_multiplier: 80 }, { mode: "direct" }).parts.breakMul).toBeCloseTo(2.0, 10);
    expect(computeDamage(panel, enemy, { enemy_stun_dmg_multiplier: 80 }, { mode: "direct" }).parts.breakMul).toBeCloseTo(2.3, 10);
    // 上限が基礎値以下なら基礎値ではなく上限(上限の方が小さい設定はそのまま尊重)
    expect(computeDamage(panel, { ...enemy, stunMultiplierMax: 150 }, { enemy_stun_dmg_multiplier: 35 }, { mode: "direct" }).parts.breakMul).toBeCloseTo(1.5, 10);
  });
  it("攻撃力は常時レイヤーと戦闘内レイヤーが乗算", () => {
    const p = { ...panel, baseAtk: 1000, atkPct: 50, atkFlat: 100 };
    const r = computeDamage(p, enemy, { atk_pct: 20, atk_flat: 1200 }, { mode: "direct" });
    expect(r.parts.atk).toBeCloseTo((1000 * 1.5 + 100) * 1.2 + 1200, 10);
  });
  it("与ダメ枠は 1 つの加算枠、被ダメ枠は独立乗算、耐性は加算", () => {
    const r = computeDamage(panel, enemy, { dmg_pct: 20, dmg_pct_element: 30, basic_dmg_pct: 10, enemy_dmg_taken_pct: 10, enemy_res_down_pct: 25, enemy_res_ignore_all_pct: 10 }, { mode: "direct" });
    expect(r.parts.dmgMul).toBeCloseTo(2.1, 10);
    expect(r.parts.takenMul).toBeCloseTo(1.1, 10);
    expect(r.parts.resMul).toBeCloseTo(1.55, 10);
  });
  it("ミアズマシールド: 防御 +80%、被ダメ -25%、ブレイク不可", () => {
    const r = computeDamage(panel, { ...enemy, miasma: true }, {}, { mode: "direct" });
    expect(r.parts.breakMul).toBe(1);
    expect(r.parts.takenMul).toBeCloseTo(0.75, 10);
    expect(r.parts.defMul).toBeCloseTo(794 / (794 + 952.8 * 1.8 * 0.8), 6);
  });
});

describe("damage: 状態異常/狂咲/混沌", () => {
  it("状態異常は会心なし(トグル OFF)、AP/100 × Lv係数 2.0、異常ダメ枠は別枠", () => {
    const r = computeDamage(panel, enemy, { crit_rate: 30, crit_dmg: 100, anomaly_dmg_pct: 20, enemy_anomaly_taken_pct: 10 }, { mode: "anomaly" });
    expect(r.parts.critMul).toBe(1);
    expect(r.parts.apMul).toBeCloseTo(2, 10);
    expect(r.parts.extraMul).toBeCloseTo(1.3, 10);
    expect(r.parts.buildupMul).toBe(1);
  });
  it("異常会心トグル ON で会心期待値が乗る", () => {
    const off = computeDamage(panel, enemy, {}, { mode: "anomaly" });
    const on = computeDamage(panel, enemy, {}, { mode: "anomaly", anomalyCrit: true });
    expect(on.expected / off.expected).toBeCloseTo(2.05, 10);
  });
  it("固有の状態異常会心(anomaly_crit_*)はトグル OFF でも乗り、ON では通常の会心と合算", () => {
    const off = computeDamage(panel, enemy, { anomaly_crit_rate: 40, anomaly_crit_dmg: 50 }, { mode: "anomaly" });
    expect(off.parts.critMul).toBeCloseTo(1 + 0.4 * 0.5, 10);
    const on = computeDamage(panel, enemy, { anomaly_crit_rate: 40, anomaly_crit_dmg: 50 }, { mode: "anomaly", anomalyCrit: true });
    expect(on.parts.critMul).toBeCloseTo(1 + 1.0 * (1.5 + 0.5), 10); // 70+40 → 100% にクリップ、150+50
  });
  it("混沌ダメージ倍率+X% は基礎 450% への加算として混沌モードでのみ乗る", () => {
    const d = computeDamage(panel, enemy, { disorder_multiplier_pct: 180, disorder_dmg_pct: 30 }, { mode: "disorder" });
    expect(d.parts.extraMul).toBeCloseTo(1.3 * (630 / 450), 10);
    expect(computeDamage(panel, enemy, { disorder_multiplier_pct: 180 }, { mode: "anomaly" }).parts.extraMul).toBeCloseTo(1, 10);
  });
  it("敵の受ける状態異常ダメージ -40% は異常ダメ枠に入る", () => {
    const r = computeDamage(panel, { ...enemy, anomalyTakenPct: -40 }, {}, { mode: "anomaly" });
    expect(r.parts.extraMul).toBeCloseTo(0.6, 10);
  });
  it("蓄積側は状態異常/混沌にのみ乗り、狂咲には乗らない", () => {
    const b = { anomaly_mastery: 50, anomaly_buildup_pct: 20, enemy_anomaly_buildup_res_down_pct: 10 };
    const an = computeDamage(panel, enemy, b, { mode: "anomaly" });
    expect(an.parts.buildupMul).toBeCloseTo(1.5 * 1.2 * 1.1, 10);
    const ab = computeDamage(panel, enemy, b, { mode: "abloom" });
    expect(ab.parts.buildupMul).toBe(1);
    const dis = computeDamage(panel, enemy, b, { mode: "disorder" });
    expect(dis.parts.buildupMul).toBeCloseTo(1.5 * 1.2 * 1.1, 10);
    const noBuild = computeDamage(panel, enemy, b, { mode: "anomaly", includeBuildup: false });
    expect(noBuild.parts.buildupMul).toBe(1);
  });
  it("狂咲ダメ% と混沌ダメ% はそれぞれのモードでのみ乗る", () => {
    const b = { abloom_dmg_pct: 50, disorder_dmg_pct: 30 };
    expect(computeDamage(panel, enemy, b, { mode: "anomaly" }).parts.extraMul).toBeCloseTo(1, 10);
    expect(computeDamage(panel, enemy, b, { mode: "abloom" }).parts.extraMul).toBeCloseTo(1.5, 10);
    expect(computeDamage(panel, enemy, b, { mode: "disorder" }).parts.extraMul).toBeCloseTo(1.3, 10);
  });
});
