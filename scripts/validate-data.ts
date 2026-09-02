import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CharacterSchema, CharacterBuffsSchema } from "../src/data/schema";
import { FACTION_LABEL } from "../src/data/labels";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const charsPath = path.join(root, "src/data/characters.json");
const buffsDir = path.join(root, "src/data/buffs");
const MIN_CHARS = 40;

let errors = 0;
const err = (m: string) => {
  errors++;
  console.error("ERROR:", m);
};

const chars = JSON.parse(fs.readFileSync(charsPath, "utf8")) as unknown[];
const ids = new Set<string>();
for (const c of chars) {
  const r = CharacterSchema.safeParse(c);
  if (!r.success) {
    const id = JSON.stringify((c as { id?: string }).id);
    err(`character ${id}: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    continue;
  }
  if (ids.has(r.data.id)) err(`duplicate character id ${r.data.id}`);
  ids.add(r.data.id);
  if (!(r.data.faction in FACTION_LABEL)) err(`character ${r.data.id}: unknown faction ${r.data.faction}`);
}
console.log(`characters: ${ids.size}`);
if (ids.size < MIN_CHARS) err(`expected at least ${MIN_CHARS} characters`);

let buffCount = 0;
const buffIds = new Set<string>();
const files = fs.existsSync(buffsDir) ? fs.readdirSync(buffsDir).filter((f) => f.endsWith(".json")) : [];
for (const f of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(buffsDir, f), "utf8"));
  const r = CharacterBuffsSchema.safeParse(raw);
  if (!r.success) {
    err(`${f}: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    continue;
  }
  if (r.data.characterId !== path.basename(f, ".json")) err(`${f}: characterId mismatch (${r.data.characterId})`);
  if (!ids.has(r.data.characterId)) err(`${f}: unknown characterId ${r.data.characterId}`);
  for (const b of r.data.buffs) {
    if (buffIds.has(b.id)) err(`${f}: duplicate buff id ${b.id}`);
    buffIds.add(b.id);
    for (const fac of b.condition?.factions ?? []) {
      if (!(fac in FACTION_LABEL)) err(`${f}/${b.id}: unknown faction ${fac}`);
    }
    buffCount++;
  }
}
const missing = [...ids].filter((id) => !files.includes(`${id}.json`));
console.log(`buff files: ${files.length}, buffs: ${buffCount}`);
if (missing.length) console.warn(`WARN: characters without buff file: ${missing.join(", ")}`);

if (errors) {
  console.error(`${errors} error(s)`);
  process.exit(1);
}
console.log("OK");
