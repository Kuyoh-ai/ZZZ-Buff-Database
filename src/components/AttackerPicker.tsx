import { ELEMENT_LABEL, FACTION_LABEL, ROLE_LABEL } from "../data/labels";
import type { Character } from "../types";
import { ElementIcon } from "./Icons";

export function AttackerPicker({
  characters,
  value,
  onChange,
}: {
  characters: Character[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const sel = value ? characters.find((c) => c.id === value) : undefined;
  return (
    <div className="attacker">
      <h2 className="panel__title">
        <span className="panel__num">02</span>アタッカー(受け手)
      </h2>
      <div className="attacker__row">
        <select
          className="select"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          data-testid="attacker-select"
          aria-label="アタッカーを選択"
        >
          <option value="">— 指定なし(全バフを表示) —</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.rarity} {c.nameJa} / {ELEMENT_LABEL[c.element]}
              {c.subElement ? `+${ELEMENT_LABEL[c.subElement]}` : ""} {ROLE_LABEL[c.role]}
            </option>
          ))}
        </select>
        {sel && (
          <button type="button" className="btn btn--ghost" onClick={() => onChange(null)}>
            解除
          </button>
        )}
      </div>
      {sel ? (
        <div className="attacker__card" key={sel.id}>
          <div className={`attacker__el el--${sel.element}`}>
            <ElementIcon element={sel.element} />
          </div>
          <div className="attacker__info">
            <div className="attacker__name">
              <span className={`rarity rarity--${sel.rarity}`}>{sel.rarity}</span>
              {sel.nameJa}
              <span className="attacker__en">{sel.nameEn}</span>
            </div>
            <div className="attacker__tags">
              <span className={`tag el--${sel.element}`}>{ELEMENT_LABEL[sel.element]}</span>
              {sel.subElement && <span className={`tag el--${sel.subElement}`}>{ELEMENT_LABEL[sel.subElement]}</span>}
              <span className="tag">{ROLE_LABEL[sel.role]}</span>
              <span className="tag tag--faction">{FACTION_LABEL[sel.faction] ?? sel.faction}</span>
            </div>
          </div>
          <div className="attacker__legend">
            <span className="legend legend--on">適用可</span>
            <span className="legend legend--off">適用不可</span>
            <span className="legend legend--self">自己バフ</span>
          </div>
        </div>
      ) : (
        <p className="attacker__hint">アタッカーを指定すると、そのキャラに有効なバフが強調表示されます。</p>
      )}
    </div>
  );
}
