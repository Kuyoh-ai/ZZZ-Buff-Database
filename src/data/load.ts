import type { Character, CharacterBuffs } from "../types";
import charactersJson from "./characters.json";

const buffModules = import.meta.glob<{ default: CharacterBuffs }>("./buffs/*.json", { eager: true });

export const CHARACTERS: Character[] = charactersJson as Character[];

export const BUFFS_BY_CHARACTER: Record<string, CharacterBuffs> = Object.fromEntries(
  Object.values(buffModules).map((m) => [m.default.characterId, m.default]),
);

export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
