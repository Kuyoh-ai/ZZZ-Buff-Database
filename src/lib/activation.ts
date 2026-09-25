import { factionGroupOf } from "../data/labels";
import type { Character } from "../types";

/**
 * 追加能力の発動判定(2 人基準)。
 * 「出し手(buffer)とアタッカー(attacker)の 2 人がチームにいる」前提で、アタッカーだけで発動条件を満たすかを返す。
 * チームの 3 人目は不明なので false は「アタッカーだけでは満たさない」の意味(3 人目次第で発動し得る)。
 * 出し手自身がアタッカーの場合や activation データが無い場合は null(判定しない = 設定を変えない)。
 * bufferPotential は出し手のポテンシャル解放段階(activation.potentialRoles は 1 以上のときだけ有効)。
 */
export function judgeAdditionalAbility(buffer: Character, attacker: Character, bufferPotential = 0): boolean | null {
  if (buffer.id === attacker.id) return null;
  const act = buffer.additionalAbility?.activation;
  if (!act) return null;
  if (act.sameElement) {
    const mine = [buffer.element, buffer.subElement].filter(Boolean);
    if ([attacker.element, attacker.subElement].some((e) => e && mine.includes(e))) return true;
  }
  if (act.sameFaction && factionGroupOf(buffer.faction) === factionGroupOf(attacker.faction)) return true;
  if (act.roles?.includes(attacker.role)) return true;
  if (bufferPotential >= 1 && act.potentialRoles?.includes(attacker.role)) return true;
  if (act.parrySupport && attacker.assist === "parry") return true;
  return false;
}

/** 全キャラ分の判定。null(判定しない)のキャラはキーを持たない */
export function judgeAdditionalAbilities(
  characters: Character[],
  attacker: Character,
  potentialOf: (c: Character) => number = () => 0,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const c of characters) {
    const j = judgeAdditionalAbility(c, attacker, potentialOf(c));
    if (j !== null) out[c.id] = j;
  }
  return out;
}
