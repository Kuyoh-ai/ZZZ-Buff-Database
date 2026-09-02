import type { Buff, Character } from "../types";

/**
 * provider が持つ buff が attacker に適用されるか。
 * attacker が未指定(null)の場合は常に true(強調なし)。
 */
export function appliesTo(buff: Buff, provider: Character, attacker: Character | null): boolean {
  if (!attacker) return true;
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
