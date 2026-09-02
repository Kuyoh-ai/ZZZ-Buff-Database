import type { Buff, Character, Role } from "../types";

/** 役割ごとに「効果が乗らない」ステータス。命破(rupture)は攻撃力/貫通率/貫通値が無効、それ以外は透徹力が無効 */
const ROLE_INAPPLICABLE_STATS: Partial<Record<Role, ReadonlySet<string>>> = {
  rupture: new Set(["atk_pct", "atk_flat", "pen_ratio", "pen_flat"]),
};
const SHEER_ONLY_STATS = new Set(["sheer_force_pct", "sheer_force_flat", "sheer_dmg_pct"]);

/** 受け手の役割に対してそのステータスが意味を持つか */
export function statAppliesToRole(stat: string, role: Role): boolean {
  if (ROLE_INAPPLICABLE_STATS[role]?.has(stat)) return false;
  if (role !== "rupture" && SHEER_ONLY_STATS.has(stat)) return false;
  return true;
}

/**
 * provider が持つ buff が attacker に適用されるか。
 * attacker が未指定(null)の場合は常に true(強調なし)。
 */
export function appliesTo(buff: Buff, provider: Character, attacker: Character | null): boolean {
  if (!attacker) return true;
  if (!statAppliesToRole(buff.stat, attacker.role)) return false;
  const isSelf = provider.id === attacker.id;

  switch (buff.target) {
    case "self":
      if (!isSelf) return false;
      break;
    case "next_swap_in":
      if (isSelf) return false;
      break;
    case "team":
    case "enemy":
      break;
  }

  // 属性付きバフ(属性ダメージ/属性耐性ダウン)は受け手の属性が一致する必要がある
  if (buff.element) {
    const els = [attacker.element, attacker.subElement].filter(Boolean);
    if (!els.includes(buff.element)) return false;
  }

  const c = buff.condition;
  if (!c) return true;
  if (c.excludeSelf && isSelf) return false;
  if (c.elements && c.elements.length > 0) {
    const els = [attacker.element, attacker.subElement].filter(Boolean);
    if (!c.elements.some((e) => els.includes(e))) return false;
  }
  if (c.factions && c.factions.length > 0 && !c.factions.includes(attacker.faction)) return false;
  if (c.roles && c.roles.length > 0 && !c.roles.includes(attacker.role)) return false;
  return true;
}
