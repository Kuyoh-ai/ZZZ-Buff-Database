import type { Buff, Character, CharacterBuffs, CharSetting } from "../types";
import { appliesTo } from "./applicability";
import { resolveBuffTotal, round } from "./resolve";

export interface ResolvedBuff {
  buff: Buff;
  /** 最大スタック時の効果量 */
  total: number;
  /** 1スタックあたり */
  perStack: number;
  applicable: boolean;
}

export interface CellData {
  /** 適用可能なバフの合計(アタッカー未指定時は全バフ)。自バフ(target: self)は含めない */
  total: number;
  /** 自バフ(target: self)のみの合計(適用可能分) */
  totalSelf: number;
  /** 適用可能バフが1つもない場合でも、参考として全バフの合計 */
  totalAll: number;
  buffs: ResolvedBuff[];
  applicableCount: number;
}

export interface Row {
  character: Character;
  cells: Record<string, CellData>;
  /** アタッカーに適用可能なバフの総数 */
  applicableCount: number;
  buffCount: number;
}

export function buildRow(
  character: Character,
  data: CharacterBuffs | undefined,
  setting: CharSetting,
  attacker: Character | null,
  /** 自身のみが対象のバフ(target: self)を除外する */
  excludeSelfBuffs = false,
): Row {
  const cells: Record<string, CellData> = {};
  let applicableCount = 0;
  const buffs = (data?.buffs ?? []).filter((b) => !(excludeSelfBuffs && b.target === "self"));
  for (const buff of buffs) {
    const total = resolveBuffTotal(buff, setting);
    const perStack = round(total / (buff.maxStacks ?? 1));
    const applicable = appliesTo(buff, character, attacker);
    if (applicable) applicableCount++;
    const cell = (cells[buff.stat] ??= { total: 0, totalSelf: 0, totalAll: 0, buffs: [], applicableCount: 0 });
    cell.buffs.push({ buff, total, perStack, applicable });
    const isSelf = buff.target === "self";
    if (!isSelf) cell.totalAll = round(cell.totalAll + total);
    if (applicable) {
      if (isSelf) cell.totalSelf = round(cell.totalSelf + total);
      else cell.total = round(cell.total + total);
      cell.applicableCount++;
    }
  }
  return { character, cells, applicableCount, buffCount: buffs.length };
}

/** 表示用: パーティ向け値と自バフ値を分けて返す */
export function cellDisplay(c: CellData, attacker: Character | null): { party: number; self: number } {
  if (!attacker) {
    const self = c.buffs.filter((b) => b.buff.target === "self").reduce((n, b) => n + b.total, 0);
    return { party: c.totalAll, self: round(self) };
  }
  return { party: c.total, self: c.totalSelf };
}

/** ソート/表示用のセル値(パーティ/敵向けの合計。自バフは含めない)。アタッカー指定時は適用可能分、なければ undefined */
export function cellSortValue(row: Row, stat: string, attacker: Character | null): number | undefined {
  const c = row.cells[stat];
  if (!c) return undefined;
  if (!attacker) return c.totalAll;
  return c.applicableCount > 0 ? c.total : undefined;
}
