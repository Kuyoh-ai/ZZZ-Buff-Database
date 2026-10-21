import type { Buff, Character, CharacterBuffs, CharSetting, Role, Settings } from "../types";
import type { AgentStats, Enemy } from "../data/calcSchema";
import type { DiscBuild } from "../data/disc_presets";
import { judgeAdditionalAbility } from "./activation";
import { statAppliesToRole } from "./applicability";
import { effectiveSetting, round } from "./resolve";
import { buildRow, type ResolvedBuff } from "./table";
import { ATTACK_TYPE_STAT, SKILL_TYPE_STATS, combatAtk, computeDamage, type AttackerPanel, type AttackType, type BuffTotals, type DamageMode, type DamageResult, type EnemyState } from "./damage";

/** アタッカーの常時パネルを agent_stats + ディスク + 上書きから作る(式は formula.md §6〜7) */
export function buildPanel(c: Character, s: AgentStats, disc: DiscBuild, overrides: Partial<AttackerPanel> = {}): AttackerPanel {
  const base = s.base;
  const core = s.core;
  const w = s.wengine;
  const adv = (key: string) => (w && w.advStat === key ? w.advValue : 0);
  const wBase = (key: "atk" | "def" | "hp") => (w && w.baseStat === key ? w.baseValue : 0);
  const critDmgAdded = disc.crit_dmg + (core.crit_dmg ?? 0) + adv("crit_dmg");
  let critRate = base.crit_rate + (core.crit_rate ?? 0) + disc.crit_rate + adv("crit_rate");
  // クラレッタ: 開幕会心ダメージ 1% ごとに開幕会心率 +0.35%(基礎 50% 分は base.crit_rate 22.5 に含まれている)
  if (c.role === "armorer") critRate += 0.35 * critDmgAdded;
  const panel: AttackerPanel = {
    role: c.role,
    level: 60,
    baseAtk: base.atk + (core.atk ?? 0) + wBase("atk"),
    atkPct: disc.atk_pct + (core.atk_pct ?? 0) + adv("atk_pct"),
    atkFlat: disc.atk_flat,
    baseHp: base.hp + (core.hp ?? 0) + wBase("hp"),
    hpPct: disc.hp_pct + (core.hp_pct ?? 0) + adv("hp_pct"),
    hpFlat: disc.hp_flat,
    baseDef: base.def + (core.def ?? 0) + wBase("def"),
    defPct: disc.def_pct + (core.def_pct ?? 0) + adv("def_pct"),
    defFlat: disc.def_flat,
    critRate: round2(critRate),
    critDmg: base.crit_dmg + critDmgAdded,
    anomalyProficiency: (base.anomaly_proficiency ?? 0) + (core.anomaly_proficiency ?? 0) + disc.anomaly_proficiency + adv("anomaly_proficiency"),
    anomalyMastery: round2(((base.anomaly_mastery ?? 0) + (core.anomaly_mastery ?? 0)) * (1 + (disc.anomaly_mastery_pct + adv("anomaly_mastery_pct")) / 100)),
    penRatio: (base.pen_ratio ?? 0) + (core.pen_ratio ?? 0) + disc.pen_ratio + adv("pen_ratio"),
    penFlat: disc.pen_flat + (core.pen_flat ?? 0),
    dmgPct: disc.element_dmg_pct,
    sharpCritDmg: base.sharp_crit_dmg ?? 150,
    sheerForceFlat: 0,
  };
  return { ...panel, ...overrides };
}

/** 敵プリセット + 状況からアタッカー属性向けの EnemyState を作る(流明/玄墨は耐性キーが無いので 0) */
export function enemyState(e: Enemy, attacker: Character, broken: boolean, miasma: boolean, stunMultiplierMax?: number | null): EnemyState {
  const res = (e.res as Record<string, number | undefined>)[attacker.element] ?? 0;
  const creator = e.id === "the_creator";
  const cap = stunMultiplierMax === undefined ? e.stunMultiplierMax : (stunMultiplierMax ?? undefined);
  return {
    def: e.defLv70,
    res,
    stunMultiplier: e.stunMultiplier,
    stunMultiplierMax: cap,
    broken,
    anomalyTakenPct: e.anomalyTakenPct,
    miasma,
    miasmaDefUpPct: creator ? 10 : 80,
    miasmaDmgCutPct: creator ? 50 : 25,
  };
}

/** 固定バフ(危局/激変/手入力)。stat キーと値。element 付き stat はアタッカー属性に一致するときだけ有効 */
export interface FixedBuff {
  stat: string;
  value: number;
  element?: Character["element"];
}

export function fixedTotals(fixed: FixedBuff[], attacker: Character): BuffTotals {
  const t: BuffTotals = {};
  for (const f of fixed) {
    if (!f.stat || !Number.isFinite(f.value)) continue;
    if (f.element && f.element !== attacker.element && f.element !== attacker.subElement) continue;
    t[f.stat] = (t[f.stat] ?? 0) + f.value;
  }
  return t;
}

/**
 * チーム内での追加能力の発動判定。同席している他のメンバーの誰かで条件を満たせば ON、誰も満たさなければ OFF
 * (既存一覧の「出し手 + アタッカーの 2 人基準」と同じく、不在の 3 人目は当てにしない)。
 * activation データが無いキャラは null(設定値に従う)
 */
export function judgeInTeam(c: Character, team: Character[], potential: number): boolean | null {
  if (!c.additionalAbility?.activation) return null;
  for (const o of team) {
    if (o.id === c.id) continue;
    if (judgeAdditionalAbility(c, o, potential)) return true;
  }
  return false;
}

export interface Provider {
  character: Character;
  buffs: CharacterBuffs | undefined;
}

export interface CollectOptions {
  attackType: AttackType;
  mode: DamageMode;
  /** アタッカーのパネル(scale 付きバフの実値計算に使う。未指定なら values の上限値をそのまま使う) */
  panel?: AttackerPanel;
  /** 出し手(アタッカー以外)のパネル。scale の参照先が出し手自身のステータスのため */
  panelOf?: (c: Character) => AttackerPanel | undefined;
}

/** scale の参照ステータスをパネルから取る */
export function panelStat(p: AttackerPanel, stat: NonNullable<Buff["scale"]>["stat"], totals: BuffTotals): number {
  switch (stat) {
    case "anomaly_proficiency":
      return p.anomalyProficiency + (totals.anomaly_proficiency ?? 0);
    case "anomaly_mastery":
      return p.anomalyMastery + (totals.anomaly_mastery ?? 0);
    case "crit_rate":
      return p.critRate + (totals.crit_rate ?? 0);
    case "crit_dmg":
      return p.critDmg + (totals.crit_dmg ?? 0);
    case "atk":
      return combatAtk(p, totals);
    case "hp":
      return p.baseHp * (1 + (p.hpPct + (totals.hp_pct ?? 0)) / 100) + p.hpFlat + (totals.hp_flat ?? 0);
    case "def":
      return p.baseDef * (1 + (p.defPct + (totals.def_pct ?? 0)) / 100) + p.defFlat + (totals.def_flat ?? 0);
  }
}

/** scale 付きバフの実値(1 スタック)。src は出し手のステータス値 */
export function scaledValue(scale: NonNullable<Buff["scale"]>, src: number): number {
  const v = scale.per * Math.max(0, src - (scale.from ?? 0));
  return scale.cap !== undefined ? Math.min(scale.cap, v) : v;
}

/** 提供者の設定(個別/一括)に、チーム基準の追加能力判定を重ねる */
export function providerSetting(settings: Settings, c: Character, team: Character[]): CharSetting {
  const s = effectiveSetting(settings, c.id);
  const j = judgeInTeam(c, team, c.hasPotential ? s.potential : 0);
  const aa = j === null ? (s.additionalAbility ?? true) : j && (s.additionalAbility ?? true);
  return { ...s, additionalAbility: aa };
}

/** attacker に適用できるバフを提供者ごとに集め、stat ごとの合計にする。攻撃種別限定バフは種別一致時のみ(異常系モードでは含めない) */
export function collectBuffs(providers: Provider[], attacker: Character, settings: Settings, opts: CollectOptions): { totals: BuffTotals; applied: Record<string, ResolvedBuff[]> } {
  const team = providers.map((p) => p.character);
  const totals: BuffTotals = {};
  const applied: Record<string, ResolvedBuff[]> = {};
  const typeStat = opts.attackType === "generic" ? null : ATTACK_TYPE_STAT[opts.attackType];
  // 1 パス目: 固定値のバフを合算。scale 付きは 2 パス目で出し手のステータスから実値を決める
  const scaled: { provider: Character; rb: ResolvedBuff }[] = [];
  for (const p of providers) {
    const setting = providerSetting(settings, p.character, team);
    const row = buildRow(p.character, p.buffs, setting, attacker, false, calcStatApplies);
    const list: ResolvedBuff[] = [];
    for (const cell of Object.values(row.cells)) {
      for (const rb of cell.buffs) {
        if (!rb.applicable) continue;
        if (!statCounts(rb.buff, opts.mode, typeStat)) continue;
        if (rb.buff.scale && opts.panel) {
          scaled.push({ provider: p.character, rb });
          continue;
        }
        totals[rb.buff.stat] = (totals[rb.buff.stat] ?? 0) + rb.total;
        if (rb.total !== 0) list.push(rb);
      }
    }
    applied[p.character.id] = list;
  }
  if (opts.panel) {
    const staticTotals = { ...totals };
    for (const { provider, rb } of scaled) {
      const scale = rb.buff.scale!;
      const isAtk = provider.id === attacker.id;
      const pnl = isAtk ? opts.panel : opts.panelOf?.(provider);
      // 出し手のパネルが無い場合は values の上限値で代用
      const per = pnl ? scaledValue(scale, panelStat(pnl, scale.stat, isAtk ? staticTotals : {})) : rb.perStack;
      const total = round(per * (rb.buff.maxStacks ?? 1));
      totals[rb.buff.stat] = (totals[rb.buff.stat] ?? 0) + total;
      if (total !== 0) applied[provider.id].push({ ...rb, perStack: round(per), total });
    }
  }
  return { totals, applied };
}

/**
 * ダメージ比較での役割別の stat 有効判定。一覧の statAppliesToRole と違い、命破には攻撃力バフを通す
 * (透徹力 = 0.3×攻撃力 + 0.1×HP に乗る)。命破に防御枠は無いので敵防御ダウンは落とす
 */
export function calcStatApplies(stat: string, role: Role): boolean {
  if (role === "rupture") {
    if (stat === "atk_pct" || stat === "atk_flat") return true;
    if (stat === "enemy_def_down_pct") return false;
  }
  return statAppliesToRole(stat, role);
}

/** そのバフの stat が計算に入るか(攻撃種別限定は一致時のみ、異常系では種別限定は不算入) */
export function statCounts(buff: Buff, mode: DamageMode, typeStat: string | null): boolean {
  if (buff.modes && !buff.modes.includes(mode)) return false;
  if (SKILL_TYPE_STATS.has(buff.stat)) return mode === "direct" && typeStat === buff.stat;
  return true;
}

export function mergeTotals(a: BuffTotals, b: BuffTotals): BuffTotals {
  const out: BuffTotals = { ...a };
  for (const [k, val] of Object.entries(b)) out[k] = (out[k] ?? 0) + (val ?? 0);
  return out;
}

export interface CompareInput {
  attacker: Character;
  third: Character | null;
  candidates: Character[];
  buffsOf: (id: string) => CharacterBuffs | undefined;
  /** 出し手(アタッカー以外)のパネル(scale 付きバフ用。未指定なら上限値で代用) */
  panelOf?: (c: Character) => AttackerPanel | undefined;
  settings: Settings;
  panel: AttackerPanel;
  enemy: EnemyState;
  fixed: BuffTotals;
  mode: DamageMode;
  attackType: AttackType;
  anomalyCrit: boolean;
  includeBuildup: boolean;
}

export interface CompareRow {
  character: Character;
  /** 基準比(基準 = 1.0) */
  ratio: number;
  result: DamageResult;
  /** この候補が提供したバフ(適用分) */
  contributions: ResolvedBuff[];
  /** 候補の追加能力の判定結果(null = データなし) */
  aaJudged: boolean | null;
  /** この候補を加えることで追加能力が発動するようになる基準メンバー(アタッカー / 3 枠目) */
  enablesAa: Character[];
}

export interface CompareOutput {
  baseline: DamageResult;
  baselineTotals: BuffTotals;
  /** 基準編成(アタッカー + 3 枠目)での各メンバーの追加能力の判定(null = データなし) */
  baselineAa: Record<string, boolean | null>;
  rows: CompareRow[];
}

export function compareAll(input: CompareInput): CompareOutput {
  const { attacker, third, settings, panel, enemy, fixed } = input;
  const dmgOpts = { mode: input.mode, anomalyCrit: input.anomalyCrit, includeBuildup: input.includeBuildup, abloomApScaling: !!attacker.abloomApScaling };
  const collect = (extra: Character | null) => {
    const members = [attacker, third, extra].filter((c): c is Character => !!c);
    const providers = members.map((c) => ({ character: c, buffs: input.buffsOf(c.id) }));
    return collectBuffs(providers, attacker, settings, { attackType: input.attackType, mode: input.mode, panel, panelOf: input.panelOf });
  };
  const base = collect(null);
  const baselineTotals = mergeTotals(base.totals, fixed);
  const baseline = computeDamage(panel, enemy, baselineTotals, dmgOpts);
  const baseTeam = [attacker, third].filter((c): c is Character => !!c);
  const baselineAa: Record<string, boolean | null> = {};
  for (const c of baseTeam) baselineAa[c.id] = judgeInTeam(c, baseTeam, c.hasPotential ? effectiveSetting(settings, c.id).potential : 0);
  const rows: CompareRow[] = [];
  for (const c of input.candidates) {
    if (c.id === attacker.id || c.id === third?.id) continue;
    const col = collect(c);
    const totals = mergeTotals(col.totals, fixed);
    const result = computeDamage(panel, enemy, totals, dmgOpts);
    const team = [attacker, third, c].filter((x): x is Character => !!x);
    const s = effectiveSetting(settings, c.id);
    const enablesAa = baseTeam.filter((m) => baselineAa[m.id] === false && judgeInTeam(m, team, m.hasPotential ? effectiveSetting(settings, m.id).potential : 0) === true);
    rows.push({
      character: c,
      ratio: baseline.expected > 0 ? result.expected / baseline.expected : 1,
      result,
      contributions: col.applied[c.id] ?? [],
      aaJudged: judgeInTeam(c, team, c.hasPotential ? s.potential : 0),
      enablesAa,
    });
  }
  return { baseline, baselineTotals, baselineAa, rows };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
