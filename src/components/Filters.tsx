import { ELEMENT_LABEL, FACTION_LABEL, ROLE_LABEL } from "../data/labels";
import { STAT_BY_KEY } from "../data/stats";
import type { SortKey } from "../lib/sort";
import type { Element, Rarity, Role } from "../types";

export interface FilterState {
  elements: Element[];
  roles: Role[];
  factions: string[];
  rarities: Rarity[];
  query: string;
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

const SORT_LABEL: Record<string, string> = {
  name: "名前",
  rarity: "レア",
  element: "属性",
  role: "役割",
  faction: "陣営",
  applicable: "適用数",
  version: "Ver",
};

export function Filters({
  state,
  onChange,
  elements,
  roles,
  factions,
  showEmptyCols,
  onToggleEmptyCols,
  excludeSelfBuffs,
  onToggleExcludeSelf,
  sortKeys,
  onClearSort,
}: {
  state: FilterState;
  onChange: (s: FilterState) => void;
  elements: Element[];
  roles: Role[];
  factions: string[];
  showEmptyCols: boolean;
  onToggleEmptyCols: () => void;
  excludeSelfBuffs: boolean;
  onToggleExcludeSelf: () => void;
  sortKeys: SortKey[];
  onClearSort: () => void;
}) {
  return (
    <div className="filters">
      <h2 className="panel__title">
        <span className="panel__num">03</span>フィルタ / ソート
      </h2>
      <div className="filters__rows">
        <input
          className="input"
          type="search"
          placeholder="名前で検索…"
          value={state.query}
          onChange={(e) => onChange({ ...state, query: e.target.value })}
          data-testid="search"
          aria-label="名前で検索"
        />
        <div className="chips" aria-label="属性">
          {elements.map((e) => (
            <button
              key={e}
              type="button"
              className={`chip el--${e} ${state.elements.includes(e) ? "chip--on" : ""}`}
              onClick={() => onChange({ ...state, elements: toggle(state.elements, e) })}
              data-testid={`filter-el-${e}`}
            >
              {ELEMENT_LABEL[e]}
            </button>
          ))}
        </div>
        <div className="chips" aria-label="役割">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              className={`chip ${state.roles.includes(r) ? "chip--on" : ""}`}
              onClick={() => onChange({ ...state, roles: toggle(state.roles, r) })}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
          {(["S", "A"] as Rarity[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`chip chip--rarity-${r} ${state.rarities.includes(r) ? "chip--on" : ""}`}
              onClick={() => onChange({ ...state, rarities: toggle(state.rarities, r) })}
            >
              {r}級
            </button>
          ))}
        </div>
        <div className="chips chips--faction" aria-label="陣営">
          {factions.map((f) => (
            <button
              key={f}
              type="button"
              className={`chip chip--sm ${state.factions.includes(f) ? "chip--on" : ""}`}
              onClick={() => onChange({ ...state, factions: toggle(state.factions, f) })}
            >
              {FACTION_LABEL[f] ?? f}
            </button>
          ))}
        </div>
        <div className="filters__foot">
          <div className="checks">
            <label className="check check--primary">
              <input type="checkbox" checked={excludeSelfBuffs} onChange={onToggleExcludeSelf} data-testid="exclude-self" />
              自バフを除く(パーティ/敵への効果のみ表示)
            </label>
            <label className="check">
              <input type="checkbox" checked={showEmptyCols} onChange={onToggleEmptyCols} />
              データのない列も表示
            </label>
          </div>
          <div className="sortinfo">
            {sortKeys.length === 0 ? (
              <span className="sortinfo__hint">列見出しクリックでソート / Shift+クリックで複数キー</span>
            ) : (
              <>
                {sortKeys.map((k, i) => (
                  <span key={k.key} className="sortkey">
                    <b>{i + 1}</b> {SORT_LABEL[k.key] ?? STAT_BY_KEY[k.key]?.short ?? k.key}
                    <i>{k.dir === "desc" ? "▼" : "▲"}</i>
                  </span>
                ))}
                <button type="button" className="btn btn--ghost btn--sm" onClick={onClearSort}>
                  解除
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
