import { useEffect, useMemo, useState } from "react";
import { BUFFS_BY_CHARACTER, CHARACTERS, CHARACTER_BY_ID } from "./data/load";
import { STATS } from "./data/stats";
import type { Character, CharSetting, Element, Role, Settings } from "./types";
import { effectiveSetting } from "./lib/resolve";
import { multiSort, toggleSortKey, type SortKey } from "./lib/sort";
import { buildRow, cellSortValue } from "./lib/table";
import { Header } from "./components/Header";
import { SettingsPanel } from "./components/SettingsPanel";
import { AttackerPicker } from "./components/AttackerPicker";
import { Filters, type FilterState } from "./components/Filters";
import { BuffTable } from "./components/BuffTable";
import { Splash } from "./components/Splash";

const STORAGE_KEY = "zzz-buff-db:settings:v2";
const LEGACY_KEY = "zzz-buff-db:settings:v1";
const DEFAULT_GLOBAL: CharSetting = { mindscape: 0, wenginePhase: 0, potential: 6 };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Settings;
      s.global.potential ??= 6;
      return s;
    }
    // v1 からの移行: ポテンシャル解放の既定を T6 にする
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const s = JSON.parse(legacy) as Settings;
      return { ...s, global: { ...s.global, potential: 6 } };
    }
  } catch {
    /* ignore */
  }
  return { global: { ...DEFAULT_GLOBAL }, overrides: {} };
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [attackerId, setAttackerId] = useState<string | null>(null);
  const [sortKeys, setSortKeys] = useState<SortKey[]>([]);
  const [filter, setFilter] = useState<FilterState>({ elements: [], roles: [], factions: [], rarities: [], query: "" });
  const [showEmptyCols, setShowEmptyCols] = useState(false);
  const [excludeSelfBuffs, setExcludeSelfBuffs] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const attacker: Character | null = attackerId ? (CHARACTER_BY_ID[attackerId] ?? null) : null;

  const rows = useMemo(
    () =>
      CHARACTERS.map((c) =>
        buildRow(c, BUFFS_BY_CHARACTER[c.id], effectiveSetting(settings, c.id), attacker, excludeSelfBuffs),
      ),
    [settings, attacker, excludeSelfBuffs],
  );

  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    return rows.filter(({ character: c }) => {
      if (filter.elements.length && !filter.elements.includes(c.element) && !(c.subElement && filter.elements.includes(c.subElement)))
        return false;
      if (filter.roles.length && !filter.roles.includes(c.role)) return false;
      if (filter.factions.length && !filter.factions.includes(c.faction)) return false;
      if (filter.rarities.length && !filter.rarities.includes(c.rarity)) return false;
      if (q && !c.nameJa.toLowerCase().includes(q) && !c.nameEn.toLowerCase().includes(q) && !c.id.includes(q)) return false;
      return true;
    });
  }, [rows, filter]);

  const visibleStats = useMemo(() => {
    if (showEmptyCols) return STATS;
    // フィルタ後に表示されているキャラの中で、その列にバフを持つキャラがいる列だけ表示
    return STATS.filter((s) => filtered.some((r) => r.cells[s.key]));
  }, [filtered, showEmptyCols]);

  const sorted = useMemo(
    () =>
      multiSort(filtered, sortKeys, (row, key) => {
        if (key === "name") return row.character.nameJa;
        if (key === "rarity") return row.character.rarity === "S" ? 1 : 0;
        if (key === "element") return row.character.element;
        if (key === "role") return row.character.role;
        if (key === "faction") return row.character.faction;
        if (key === "applicable") return row.applicableCount;
        if (key === "version") return parseFloat(row.character.releaseVersion);
        return cellSortValue(row, key, attacker);
      }),
    [filtered, sortKeys, attacker],
  );

  const setGlobal = (s: CharSetting) => setSettings((p) => ({ ...p, global: s }));
  const setOverride = (id: string, patch: Partial<CharSetting> | null) =>
    setSettings((p) => {
      const overrides = { ...p.overrides };
      if (patch === null) delete overrides[id];
      else overrides[id] = { ...overrides[id], ...patch };
      return { ...p, overrides };
    });
  const clearOverrides = () => setSettings((p) => ({ ...p, overrides: {} }));
  /** A級キャラ全員に個別設定を上書き適用 */
  const setARank = (patch: Partial<CharSetting>) =>
    setSettings((p) => {
      const overrides = { ...p.overrides };
      for (const c of CHARACTERS) if (c.rarity === "A") overrides[c.id] = { ...overrides[c.id], ...patch };
      return { ...p, overrides };
    });

  const elements = useMemo(() => [...new Set(CHARACTERS.flatMap((c) => [c.element, c.subElement].filter(Boolean)))] as Element[], []);
  const roles = useMemo(() => [...new Set(CHARACTERS.map((c) => c.role))] as Role[], []);
  const factions = useMemo(() => [...new Set(CHARACTERS.map((c) => c.faction))], []);

  return (
    <>
      {!ready && <Splash onDone={() => setReady(true)} />}
      <div className={`app ${ready ? "app--ready" : ""}`}>
        <Header characterCount={CHARACTERS.length} buffCount={rows.reduce((n, r) => n + r.buffCount, 0)} />
        <main className="layout">
          <section className="panel panel--settings" style={{ "--delay": "0.05s" } as React.CSSProperties}>
            <SettingsPanel
              global={settings.global}
              overrideCount={Object.keys(settings.overrides).length}
              onChange={setGlobal}
              onClearOverrides={clearOverrides}
              onSetARank={setARank}
            />
          </section>
          <section className="panel panel--attacker" style={{ "--delay": "0.1s" } as React.CSSProperties}>
            <AttackerPicker characters={CHARACTERS} value={attackerId} onChange={setAttackerId} />
          </section>
          <section className="panel panel--filters" style={{ "--delay": "0.15s" } as React.CSSProperties}>
            <Filters
              state={filter}
              onChange={setFilter}
              elements={elements}
              roles={roles}
              factions={factions}
              showEmptyCols={showEmptyCols}
              onToggleEmptyCols={() => setShowEmptyCols((v) => !v)}
              excludeSelfBuffs={excludeSelfBuffs}
              onToggleExcludeSelf={() => setExcludeSelfBuffs((v) => !v)}
              sortKeys={sortKeys}
              onClearSort={() => setSortKeys([])}
            />
          </section>
          <section className="panel panel--table" style={{ "--delay": "0.2s" } as React.CSSProperties}>
            <BuffTable
              rows={sorted}
              stats={visibleStats}
              attacker={attacker}
              settings={settings}
              sortKeys={sortKeys}
              onSort={(key, multi) => setSortKeys((k) => toggleSortKey(k, key, multi))}
              onOverride={setOverride}
            />
          </section>
        </main>
        <footer className="footer">
          <p>
            データは HoYoWiki / Game8 / wikiwiki 等を参照して手動で整理したものです。誤りがあれば
            <code>src/data/buffs/</code> の JSON を修正してください。各バフの参照元はセルの詳細に記載しています。
          </p>
        </footer>
      </div>
    </>
  );
}
