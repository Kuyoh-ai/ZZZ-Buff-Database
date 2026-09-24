import { FACTION_ORDER } from "../data/labels";
import type { Character } from "../types";

export interface SortKey {
  key: string;
  dir: "asc" | "desc";
}

export type Getter<T> = (row: T, key: string) => number | string | undefined;

/** 複数キーでソート。undefined は方向に関わらず常に末尾 */
export function multiSort<T>(rows: T[], keys: SortKey[], get: Getter<T>): T[] {
  if (keys.length === 0) return rows.slice();
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      for (const k of keys) {
        const av = get(a.row, k.key);
        const bv = get(b.row, k.key);
        const au = av === undefined || av === null;
        const bu = bv === undefined || bv === null;
        if (au && bu) continue;
        if (au) return 1;
        if (bu) return -1;
        let c: number;
        if (typeof av === "number" && typeof bv === "number") c = av - bv;
        else c = String(av).localeCompare(String(bv), "ja");
        if (c !== 0) return k.dir === "asc" ? c : -c;
      }
      return a.i - b.i;
    })
    .map((x) => x.row);
}

/** 列クリック時のキー更新。shift なしは単一キー、shift ありは追加/トグル */
export function toggleSortKey(keys: SortKey[], key: string, multi: boolean): SortKey[] {
  const existing = keys.find((k) => k.key === key);
  const next: SortKey = { key, dir: existing ? (existing.dir === "desc" ? "asc" : "desc") : "desc" };
  if (!multi) return [next];
  if (existing) return keys.map((k) => (k.key === key ? next : k));
  return [...keys, next];
}

/** 既定の並び順: 陣営(FACTIONS の順) → 実装 Ver. 昇順 → 名前(50音) */
export function defaultOrder(a: Character, b: Character): number {
  const fa = FACTION_ORDER[a.faction] ?? 999;
  const fb = FACTION_ORDER[b.faction] ?? 999;
  if (fa !== fb) return fa - fb;
  const va = parseFloat(a.releaseVersion);
  const vb = parseFloat(b.releaseVersion);
  if (va !== vb) return va - vb;
  return a.nameJa.localeCompare(b.nameJa, "ja");
}

export function sortDefault<T extends Character>(chars: T[]): T[] {
  return chars.slice().sort(defaultOrder);
}
