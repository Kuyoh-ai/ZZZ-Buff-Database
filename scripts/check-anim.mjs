// src/**/*.css の animation / transition の duration が 0.5s 以内か検証する。
// ローディング演出(loading / loader / splash を含むセレクタ)は対象外。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const LIMIT_MS = 500;
const EXEMPT = /loading|loader|splash/i;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith(".css") ? [path.join(dir, d.name)] : [],
  );
}

let violations = 0;
let checked = 0;
for (const file of walk(srcDir)) {
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1].trim();
    const body = m[2];
    if (EXEMPT.test(selector)) continue;
    const decl = /(animation|transition)(?:-duration)?\s*:\s*([^;]+);/g;
    let d;
    while ((d = decl.exec(body))) {
      checked++;
      // カンマ区切りの各アニメーションについて、最初に現れる時間が duration
      for (const part of d[2].split(",")) {
        const t = part.match(/(\d*\.?\d+)(ms|s)\b/);
        if (!t) continue;
        const ms = t[2] === "s" ? parseFloat(t[1]) * 1000 : parseFloat(t[1]);
        if (ms > LIMIT_MS) {
          violations++;
          console.error(`${path.relative(root, file)}: "${selector}" ${d[1]}: ${part.trim()} (${ms}ms > ${LIMIT_MS}ms)`);
        }
      }
    }
  }
}
if (violations) {
  console.error(`${violations} violation(s)`);
  process.exit(1);
}
console.log(`check-anim OK (${checked} declarations, all non-loading animations <= ${LIMIT_MS}ms)`);
