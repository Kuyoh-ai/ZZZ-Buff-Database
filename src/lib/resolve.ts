import type { Buff, CharSetting, Mindscape, MindscapeValues, Potential, PotentialValues, Settings, WenginePhase } from "../types";

const MS_KEYS = ["m1", "m2", "m3", "m4", "m5", "m6"] as const;
const PT_KEYS = ["t1", "t2", "t3", "t4", "t5", "t6"] as const;

/** 心象映画段階での実効値(1スタック) */
export function resolveMindscape(values: MindscapeValues, mindscape: Mindscape): number {
  let v = values.base;
  for (let i = 0; i < mindscape; i++) {
    const x = values[MS_KEYS[i]];
    if (x !== null && x !== undefined) v = x;
  }
  return v;
}

/** ポテンシャル解放段階での上書き値。該当段階に値が無ければ fallback を返す */
export function resolvePotential(values: PotentialValues | undefined, potential: Potential, fallback: number): number {
  if (!values) return fallback;
  let v = fallback;
  for (let i = 0; i < potential; i++) {
    const x = values[PT_KEYS[i]];
    if (x !== null && x !== undefined) v = x;
  }
  return v;
}

/** 音動機の凸段階での加算値 */
export function resolveWengine(buff: Buff, phase: WenginePhase): number {
  if (!buff.wengine || phase === 0) return 0;
  return buff.wengine[`p${phase}` as const];
}

/** 設定に基づく1スタックの効果量 */
export function resolveBuffValue(buff: Buff, setting: CharSetting): number {
  const ms = resolveMindscape(buff.values, setting.mindscape);
  return resolvePotential(buff.potential, setting.potential ?? 0, ms) + resolveWengine(buff, setting.wenginePhase);
}

/** 最大スタック時の効果量 */
export function resolveBuffTotal(buff: Buff, setting: CharSetting): number {
  return round(resolveBuffValue(buff, setting) * (buff.maxStacks ?? 1));
}

/** キャラごとの実効設定(個別設定が一括設定を上書き) */
export function effectiveSetting(settings: Settings, characterId: string): CharSetting {
  const o = settings.overrides[characterId];
  return {
    mindscape: o?.mindscape ?? settings.global.mindscape,
    wenginePhase: o?.wenginePhase ?? settings.global.wenginePhase,
    potential: o?.potential ?? settings.global.potential ?? 0,
  };
}

export function hasOverride(settings: Settings, characterId: string): boolean {
  const o = settings.overrides[characterId];
  return !!o && (o.mindscape !== undefined || o.wenginePhase !== undefined || o.potential !== undefined);
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}
