import type { Character, CharacterBuffs } from "../types";
import charactersJson from "./characters.json";
import { sortDefault } from "../lib/sort";

const buffModules = import.meta.glob<{ default: CharacterBuffs }>("./buffs/*.json", { eager: true });

/** 既定順(陣営 → Ver. → 名前)に並べたキャラ一覧 */
export const CHARACTERS: Character[] = sortDefault(charactersJson as Character[]);

export const BUFFS_BY_CHARACTER: Record<string, CharacterBuffs> = Object.fromEntries(
  Object.values(buffModules).map((m) => [m.default.characterId, m.default]),
);

export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
