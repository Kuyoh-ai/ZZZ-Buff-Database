import { describe, expect, it } from "vitest";
import type { Character, CharacterBuffs, Settings } from "../types";
import type { AgentStats, Enemy } from "../data/calcSchema";
import { DISC_PRESET_BY_ID } from "../data/disc_presets";
import { buildPanel, collectBuffs, compareAll, enemyState, fixedTotals, judgeInTeam } from "./compare";

const settings: Settings = { global: { mindscape: 0, wenginePhase: 0, potential: 0, additionalAbility: true }, overrides: {} };

const mk = (id: string, over: Partial<Character> = {}): Character => ({
  id,
  nameJa: id,
  nameEn: id,
  rarity: "S",
  element: "ice",
  role: "attack",
  assist: "parry",
  faction: "cunning_hares",
  wengine: { nameJa: "-", nameEn: "-" },
  releaseVersion: "1.0",
  sourceUrl: "https://example.com/c",
  ...over,
});

const attacker = mk("atk", { element: "ice", role: "attack", faction: "victoria_housekeeping" });
const third = mk("third", { element: "fire", role: "support", faction: "cunning_hares" });
const supp = mk("supp", {
  element: "ice",
  role: "support",
  faction: "stars_of_lyra",
  additionalAbility: { name: "AA", condition: "", conditionShort: "[強攻]", activation: { roles: ["attack"] }, sourceUrl: "https://example.com/a" },
});
const stunner = mk("stun", { element: "electric", role: "stun", faction: "cunning_hares" });

const buffs: Record<string, CharacterBuffs> = {
  atk: { characterId: "atk", buffs: [{ id: "atk_self_cd", name: "コア", stat: "crit_dmg", target: "self", values: { base: 20 }, sourceUrl: "https://example.com" }] },
  third: { characterId: "third", buffs: [{ id: "third_atk", name: "コア", stat: "atk_pct", target: "team", values: { base: 10 }, sourceUrl: "https://example.com" }] },
  supp: {
    characterId: "supp",
    buffs: [
      { id: "supp_dmg", name: "コア", stat: "dmg_pct", target: "team", values: { base: 20 }, sourceUrl: "https://example.com" },
      { id: "supp_aa", name: "追加能力: 会心", stat: "crit_rate", target: "team", values: { base: 10 }, sourceUrl: "https://example.com" },
      { id: "supp_basic", name: "通常", stat: "basic_dmg_pct", target: "team", values: { base: 30 }, sourceUrl: "https://example.com" },
      { id: "supp_res_fire", name: "炎耐性", stat: "enemy_res_down_pct", element: "fire", target: "enemy", values: { base: 25 }, sourceUrl: "https://example.com" },
      { id: "supp_res_ice", name: "氷耐性", stat: "enemy_res_down_pct", element: "ice", target: "enemy", values: { base: 15 }, sourceUrl: "https://example.com" },
    ],
  },
  stun: { characterId: "stun", buffs: [{ id: "stun_mult", name: "弱体", stat: "enemy_stun_dmg_multiplier", target: "enemy", values: { base: 35 }, sourceUrl: "https://example.com" }] },
};
const buffsOf = (id: string) => buffs[id];

const stats: AgentStats = {
  nameJa: "x",
  entryId: "1",
  sourceUrl: "https://wiki.hoyolab.com/pc/zzz/entry/1",
  level: 60,
  base: { hp: 8000, atk: 800, def: 600, crit_rate: 5, crit_dmg: 50, anomaly_proficiency: 100, anomaly_mastery: 100, pen_ratio: 0 },
  core: { atk: 75, crit_rate: 14.4 },
  wengine: { nameJa: "w", entryId: "2", baseStat: "atk", baseValue: 700, advStat: "crit_rate", advValue: 24, sourceUrl: "https://wiki.hoyolab.com/pc/zzz/entry/2" },
};
const enemy: Enemy = { id: "e", nameJa: "e", nameEn: "e", level: 70, defLv70: 952.8, res: { ice: -20, fire: 20 }, stunMultiplier: 150, anomalyTakenPct: 0, sourceUrl: "https://example.com/e" };

describe("compare: パネル生成", () => {
  it("基礎攻撃力 = エージェント + コア + 音動機、常時% はディスク + 音動機上級", () => {
    const p = buildPanel(attacker, stats, DISC_PRESET_BY_ID.attack.build);
    expect(p.baseAtk).toBe(800 + 75 + 700);
    expect(p.atkPct).toBe(45); // 30 + 3×5
    expect(p.critRate).toBeCloseTo(5 + 14.4 + 19.2 + 8 + 24, 5);
    expect(p.critDmg).toBeCloseTo(50 + 48 + 38.4, 5);
    expect(p.dmgPct).toBe(40);
  });
  it("鋭御は追加された会心ダメージの 0.35 倍を会心率に変換(基礎 50% 分は変換しない)", () => {
    const c = mk("cl", { role: "armorer" });
    const s: AgentStats = { ...stats, base: { ...stats.base, crit_rate: 22.5, sharp_crit_dmg: 150 }, core: { crit_rate: 28.8 }, wengine: { ...stats.wengine!, baseStat: "def", baseValue: 431, advStat: "def_pct", advValue: 48 } };
    const p = buildPanel(c, s, DISC_PRESET_BY_ID.armorer.build);
    expect(p.critRate).toBeCloseTo(22.5 + 28.8 + 24 + 19.2 + 0.35 * 0, 5);
    expect(p.baseDef).toBe(600 + 431);
    expect(p.baseAtk).toBe(800);
    expect(p.sharpCritDmg).toBe(150);
  });
  it("上書きが最優先", () => {
    const p = buildPanel(attacker, stats, DISC_PRESET_BY_ID.attack.build, { critRate: 90 });
    expect(p.critRate).toBe(90);
  });
  it("敵の耐性はアタッカー属性で引く(流明は 0)", () => {
    expect(enemyState(enemy, attacker, true, false).res).toBe(-20);
    expect(enemyState(enemy, mk("l", { element: "lumiflux" }), true, false).res).toBe(0);
    expect(enemyState({ ...enemy, id: "the_creator" }, attacker, true, true).miasmaDmgCutPct).toBe(50);
  });
});

describe("compare: 追加能力のチーム判定", () => {
  it("他メンバーの誰かで条件を満たせば ON、誰も満たさなければ OFF、データなしは null", () => {
    expect(judgeInTeam(supp, [attacker, supp], 0)).toBe(true);
    expect(judgeInTeam(supp, [third, supp], 0)).toBe(false);
    expect(judgeInTeam(supp, [third, supp, attacker], 0)).toBe(true);
    expect(judgeInTeam(third, [attacker, third], 0)).toBe(null);
    expect(judgeInTeam(supp, [supp], 0)).toBe(false); // 同席者がいなければ未発動(3 人目は当てにしない)
  });
});

describe("compare: バフ合算", () => {
  const providers = (...cs: Character[]) => cs.map((c) => ({ character: c, buffs: buffsOf(c.id) }));
  it("自バフ・属性一致の耐性ダウンだけが入り、汎用では通常攻撃ダメ% を含めない", () => {
    const { totals } = collectBuffs(providers(attacker, supp), attacker, settings, { attackType: "generic", mode: "direct" });
    expect(totals.crit_dmg).toBe(20);
    expect(totals.dmg_pct).toBe(20);
    expect(totals.crit_rate).toBe(10);
    expect(totals.enemy_res_down_pct).toBe(15);
    expect(totals.basic_dmg_pct).toBeUndefined();
  });
  it("攻撃種別「通常攻撃」で通常攻撃ダメ% が入る。異常系では入らない", () => {
    expect(collectBuffs(providers(attacker, supp), attacker, settings, { attackType: "basic", mode: "direct" }).totals.basic_dmg_pct).toBe(30);
    expect(collectBuffs(providers(attacker, supp), attacker, settings, { attackType: "basic", mode: "anomaly" }).totals.basic_dmg_pct).toBeUndefined();
  });
  it("modes 付きのバフは該当モードでのみ入る(狂咲限定の耐性無視など)", () => {
    const ab = mk("ab", { element: "ice", role: "anomaly" });
    const bo = (id: string): CharacterBuffs | undefined =>
      id === "ab" ? { characterId: "ab", buffs: [{ id: "ab_res", name: "狂咲限定", stat: "enemy_res_ignore_all_pct", target: "enemy", modes: ["abloom"], values: { base: 15 }, sourceUrl: "https://example.com" }] } : undefined;
    const prov = [{ character: ab, buffs: bo("ab") }];
    expect(collectBuffs(prov, attacker, settings, { attackType: "generic", mode: "direct" }).totals.enemy_res_ignore_all_pct).toBeUndefined();
    expect(collectBuffs(prov, attacker, settings, { attackType: "generic", mode: "anomaly" }).totals.enemy_res_ignore_all_pct).toBeUndefined();
    expect(collectBuffs(prov, attacker, settings, { attackType: "generic", mode: "abloom" }).totals.enemy_res_ignore_all_pct).toBe(15);
  });
  it("重傷モードでは攻撃種別限定バフが入らない", () => {
    expect(collectBuffs(providers(attacker, supp), attacker, settings, { attackType: "basic", mode: "grievous" }).totals.basic_dmg_pct).toBeUndefined();
    expect(collectBuffs(providers(attacker, supp), attacker, settings, { attackType: "basic", mode: "grievous" }).totals.dmg_pct).toBe(20);
  });
  it("scale 付きバフは出し手のステータスから実値を計算(from / cap)、パネルなしなら上限値", () => {
    const jane = mk("jane", { element: "physical", role: "anomaly" });
    const bo = (id: string): CharacterBuffs | undefined =>
      id === "jane"
        ? {
            characterId: "jane",
            buffs: [
              { id: "j_dmg", name: "与ダメ", stat: "dmg_pct", target: "self", scale: { stat: "anomaly_proficiency", per: 0.1, cap: 30 }, values: { base: 30 }, sourceUrl: "https://example.com" },
              { id: "j_atk", name: "攻撃", stat: "atk_flat", target: "self", scale: { stat: "anomaly_proficiency", per: 2, from: 120, cap: 600 }, values: { base: 600 }, sourceUrl: "https://example.com" },
            ],
          }
        : undefined;
    const prov = [{ character: jane, buffs: bo("jane") }];
    const pnl = buildPanel(jane, { ...stats, base: { ...stats.base, anomaly_proficiency: 100 }, core: {} }, DISC_PRESET_BY_ID.anomaly.build); // AP = 100 + 194 = 294
    const t = collectBuffs(prov, jane, settings, { attackType: "generic", mode: "anomaly", panel: pnl }).totals;
    expect(t.dmg_pct).toBeCloseTo(29.4, 6);
    expect(t.atk_flat).toBeCloseTo((294 - 120) * 2, 6);
    const noPanel = collectBuffs(prov, jane, settings, { attackType: "generic", mode: "anomaly" }).totals;
    expect(noPanel.dmg_pct).toBe(30);
    expect(noPanel.atk_flat).toBe(600);
    // 他メンバーの異常マスタリーバフで実値が伸びる(scale の参照先に固定バフを含む)
    const ap = mk("ap", { element: "fire", role: "support" });
    const bo2 = (id: string): CharacterBuffs | undefined =>
      id === "ap" ? { characterId: "ap", buffs: [{ id: "ap_b", name: "AP", stat: "anomaly_proficiency", target: "team", values: { base: 100 }, sourceUrl: "https://example.com" }] } : bo(id);
    const t2 = collectBuffs([{ character: jane, buffs: bo2("jane") }, { character: ap, buffs: bo2("ap") }], jane, settings, { attackType: "generic", mode: "anomaly", panel: pnl }).totals;
    expect(t2.dmg_pct).toBeCloseTo(30, 6); // 394 × 0.1 = 39.4 → 上限 30
    expect(t2.atk_flat).toBeCloseTo((394 - 120) * 2, 6);
  });
  it("追加能力はチームで条件を満たさないと入らない", () => {
    const t = collectBuffs(providers(third, supp), third, settings, { attackType: "generic", mode: "direct" }).totals;
    expect(t.crit_rate).toBeUndefined();
    expect(t.dmg_pct).toBe(20);
  });
  it("一括設定で追加能力 OFF なら条件を満たしても入らない", () => {
    const off: Settings = { ...settings, global: { ...settings.global, additionalAbility: false } };
    const t = collectBuffs(providers(attacker, supp), attacker, off, { attackType: "generic", mode: "direct" }).totals;
    expect(t.crit_rate).toBeUndefined();
  });
  it("固定バフは属性付きなら一致時のみ", () => {
    const t = fixedTotals([{ stat: "crit_dmg", value: 30 }, { stat: "dmg_pct_element", value: 20, element: "fire" }, { stat: "dmg_pct_element", value: 15, element: "ice" }, { stat: "crit_dmg", value: 5 }], attacker);
    expect(t).toEqual({ crit_dmg: 35, dmg_pct_element: 15 });
  });
});

describe("compare: 全候補の比率", () => {
  const panel = buildPanel(attacker, stats, DISC_PRESET_BY_ID.attack.build);
  const base = (over: Partial<Parameters<typeof compareAll>[0]> = {}) =>
    compareAll({
      attacker,
      third: null,
      candidates: [attacker, third, supp, stunner],
      buffsOf,
      settings,
      panel,
      enemy: enemyState(enemy, attacker, true, false),
      fixed: {},
      mode: "direct",
      attackType: "generic",
      anomalyCrit: false,
      includeBuildup: true,
      ...over,
    });
  it("アタッカー自身と 3 枠目は候補から除外、比率は基準比", () => {
    const out = base({ third });
    expect(out.rows.map((r) => r.character.id)).toEqual(["supp", "stun"]);
    const supRow = out.rows.find((r) => r.character.id === "supp")!;
    expect(supRow.ratio).toBeGreaterThan(1);
    expect(supRow.contributions.map((b) => b.buff.id).sort()).toEqual(["supp_aa", "supp_dmg", "supp_res_ice"]);
    expect(supRow.aaJudged).toBe(true);
  });
  it("3 枠目のバフは基準に含まれる(基準値が上がる)", () => {
    expect(base({ third }).baseline.expected).toBeGreaterThan(base().baseline.expected);
    expect(base({ third }).baselineTotals.atk_pct).toBe(10);
  });
  it("アタッカー自身の追加能力は同席者が条件を満たすときだけ基準/候補に入る", () => {
    const atkAa = mk("atkaa", {
      element: "ice",
      role: "attack",
      additionalAbility: { name: "AA", condition: "", conditionShort: "[支援]", activation: { roles: ["support"] }, sourceUrl: "https://example.com/a" },
    });
    const bo = (id: string): CharacterBuffs | undefined =>
      id === "atkaa" ? { characterId: "atkaa", buffs: [{ id: "atkaa_aa", name: "追加能力: 与ダメ", stat: "dmg_pct", target: "self", values: { base: 50 }, sourceUrl: "https://example.com" }] } : buffsOf(id);
    const run = (t: Character | null) =>
      compareAll({ attacker: atkAa, third: t, candidates: [supp, stunner], buffsOf: bo, settings, panel, enemy: enemyState(enemy, atkAa, true, false), fixed: {}, mode: "direct", attackType: "generic", anomalyCrit: false, includeBuildup: true });
    const solo = run(null);
    expect(solo.baselineAa.atkaa).toBe(false);
    expect(solo.baselineTotals.dmg_pct).toBeUndefined();
    // 支援のシーシィア相当(supp)を加えるとアタッカーの追加能力が発動し、その分も候補の効果に含まれる
    const suppRow = solo.rows.find((r) => r.character.id === "supp")!;
    expect(suppRow.result.parts.dmgMul).toBeCloseTo(1 + (panel.dmgPct + 50 + 20) / 100, 10);
    expect(suppRow.enablesAa.map((m) => m.id)).toEqual(["atkaa"]);
    const stunRow = solo.rows.find((r) => r.character.id === "stun")!;
    expect(stunRow.result.parts.dmgMul).toBeCloseTo(1 + panel.dmgPct / 100, 10);
    // 3 枠目が条件を満たせば基準から ON
    const withThird = run(third);
    expect(withThird.baselineAa.atkaa).toBe(true);
    expect(withThird.baselineTotals.dmg_pct).toBe(50);
  });
  it("弱体倍率バフはブレイク中のみ効く", () => {
    const stunRow = (o: Parameters<typeof base>[0]) => base(o).rows.find((r) => r.character.id === "stun")!;
    expect(stunRow({}).ratio).toBeCloseTo(1.85 / 1.5, 6);
    expect(stunRow({ enemy: enemyState(enemy, attacker, false, false) }).ratio).toBeCloseTo(1, 6);
  });
  it("弱体倍率の上限は 3 枠目の分を含めた合計でカットされる(残り枠だけが候補の効果になる)", () => {
    const stun2 = mk("stun2", { element: "ice", role: "stun" });
    const bo = (id: string): CharacterBuffs | undefined =>
      id === "stun2" ? { characterId: "stun2", buffs: [{ id: "stun2_mult", name: "弱体", stat: "enemy_stun_dmg_multiplier", target: "enemy", values: { base: 40 }, sourceUrl: "https://example.com" }] } : buffsOf(id);
    const run = (t: Character | null, cap?: number) =>
      compareAll({ attacker, third: t, candidates: [stunner], buffsOf: bo, settings, panel, enemy: enemyState({ ...enemy, stunMultiplierMax: cap }, attacker, true, false), fixed: {}, mode: "direct", attackType: "generic", anomalyCrit: false, includeBuildup: true });
    // 上限なし: 150 → 185
    expect(run(null).rows[0].ratio).toBeCloseTo(1.85 / 1.5, 6);
    // 上限 200、3 枠目なし: 150 → 185(上限内)
    expect(run(null, 200).rows[0].ratio).toBeCloseTo(1.85 / 1.5, 6);
    // 上限 200、3 枠目 +40 で基準 190 → 候補 +35 は残り 10 だけ効く(225 → 200)
    const o = run(stun2, 200);
    expect(o.baseline.parts.breakMul).toBeCloseTo(1.9, 10);
    expect(o.rows[0].ratio).toBeCloseTo(2.0 / 1.9, 6);
    // 上限 190(基準で既に到達) → 候補は ×1.00
    expect(run(stun2, 190).rows[0].ratio).toBeCloseTo(1, 10);
    // 上限 225 以上なら全量(150 + 40 + 35 = 225)
    expect(run(stun2, 225).rows[0].ratio).toBeCloseTo(2.25 / 1.9, 6);
    // UI からの上書き(null = 上限なし)はプリセットより優先
    expect(enemyState({ ...enemy, stunMultiplierMax: 200 }, attacker, true, false, null).stunMultiplierMax).toBeUndefined();
    expect(enemyState({ ...enemy, stunMultiplierMax: 200 }, attacker, true, false, 180).stunMultiplierMax).toBe(180);
    expect(enemyState({ ...enemy, stunMultiplierMax: 200 }, attacker, true, false).stunMultiplierMax).toBe(200);
  });
  it("命破アタッカーには貫通率/防御ダウンが効かない", () => {
    const rup = mk("rup", { role: "rupture", element: "ice" });
    const pen = mk("pen", { element: "ice", role: "support" });
    const bo = (id: string): CharacterBuffs | undefined =>
      id === "pen" ? { characterId: "pen", buffs: [{ id: "pen_def", name: "防御", stat: "enemy_def_down_pct", target: "enemy", values: { base: 30 }, sourceUrl: "https://example.com" }] } : undefined;
    const out = compareAll({
      attacker: rup,
      third: null,
      candidates: [pen],
      buffsOf: bo,
      settings,
      panel: buildPanel(rup, stats, DISC_PRESET_BY_ID.rupture.build),
      enemy: enemyState(enemy, rup, true, false),
      fixed: {},
      mode: "direct",
      attackType: "generic",
      anomalyCrit: false,
      includeBuildup: true,
    });
    expect(out.rows[0].ratio).toBeCloseTo(1, 10);
  });
  it("命破アタッカーには攻撃力バフが 0.3 倍で透徹力に乗り、敵防御ダウンは寄与に出ない", () => {
    const rup = mk("rup", { role: "rupture", element: "ice" });
    const atkBuffer = mk("atkb", { element: "fire", role: "support" });
    const defBuffer = mk("defb", { element: "fire", role: "support" });
    const bo = (id: string): CharacterBuffs | undefined =>
      id === "atkb"
        ? { characterId: "atkb", buffs: [{ id: "atkb_flat", name: "攻撃", stat: "atk_flat", target: "team", values: { base: 1200 }, sourceUrl: "https://example.com" }] }
        : id === "defb"
          ? { characterId: "defb", buffs: [{ id: "defb_def", name: "防御", stat: "enemy_def_down_pct", target: "enemy", values: { base: 30 }, sourceUrl: "https://example.com" }] }
          : undefined;
    const out = compareAll({
      attacker: rup,
      third: null,
      candidates: [atkBuffer, defBuffer],
      buffsOf: bo,
      settings,
      panel: buildPanel(rup, stats, DISC_PRESET_BY_ID.rupture.build),
      enemy: enemyState(enemy, rup, true, false),
      fixed: {},
      mode: "direct",
      attackType: "generic",
      anomalyCrit: false,
      includeBuildup: true,
    });
    const a = out.rows.find((r) => r.character.id === "atkb")!;
    expect(a.result.parts.baseStat - out.baseline.parts.baseStat).toBeCloseTo(0.3 * 1200, 6);
    expect(a.ratio).toBeGreaterThan(1);
    const d = out.rows.find((r) => r.character.id === "defb")!;
    expect(d.contributions).toEqual([]);
    expect(d.ratio).toBeCloseTo(1, 10);
  });
  it("固定バフは基準にも候補にも入る", () => {
    const a = base();
    const b = base({ fixed: { crit_dmg: 100 } });
    expect(b.baseline.expected).toBeGreaterThan(a.baseline.expected);
  });
});
