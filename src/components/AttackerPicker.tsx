import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ELEMENT_LABEL, FACTION_COLOR, FACTION_LABEL, ROLE_LABEL } from "../data/labels";
import type { Character } from "../types";
import { RarityChip } from "./BuffTable";
import { ElementIcon } from "./Icons";

const NONE = "__none__";

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
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  /** リストは panel の clip-path に切られないよう body 直下に出し、ボタンの位置から fixed 配置する */
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  /** 先頭は「指定なし」、以降は既定順(陣営 → Ver. → 名前)のキャラ */
  const options: (Character | null)[] = [null, ...characters];
  const currentIndex = value ? Math.max(0, options.findIndex((o) => o?.id === value)) : 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const top = r.bottom + 4;
      setPos({ top, left: r.left, width: r.width, maxHeight: Math.max(160, Math.min(420, window.innerHeight - top - 12)) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    setActive(currentIndex);
    setOpen(true);
  };
  const choose = (i: number) => {
    onChange(options[i]?.id ?? null);
    setOpen(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      const d = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => Math.min(options.length - 1, Math.max(0, a + d)));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) openList();
      else choose(active);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActive(options.length - 1);
    }
  };
  const optId = (i: number) => `${listId}-${options[i]?.id ?? NONE}`;

  return (
    <div className="attacker">
      <h2 className="panel__title">
        <span className="panel__num">02</span>アタッカー(受け手)
      </h2>
      <div className="attacker__row">
        <div className={`dd ${open ? "dd--open" : ""}`} ref={rootRef}>
          <button
            type="button"
            className="dd__btn"
            ref={btnRef}
            onClick={() => (open ? setOpen(false) : openList())}
            onKeyDown={onKeyDown}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open ? optId(active) : undefined}
            aria-label="アタッカーを選択"
            data-testid="attacker-toggle"
          >
            {sel ? (
              <>
                <RarityChip rarity={sel.rarity} />
                <span className="dd__name">{sel.nameJa}</span>
                <span className="dd__sub">
                  {ELEMENT_LABEL[sel.element]}
                  {sel.subElement ? `+${ELEMENT_LABEL[sel.subElement]}` : ""} {ROLE_LABEL[sel.role]}
                </span>
              </>
            ) : (
              <span className="dd__placeholder">— 指定なし(全バフを表示) —</span>
            )}
          </button>
          {open &&
            pos &&
            createPortal(
            <ul
              className="dd__list"
              role="listbox"
              id={listId}
              ref={listRef}
              data-testid="attacker-list"
              style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            >
              {options.map((c, i) => (
                <li
                  key={c?.id ?? NONE}
                  id={optId(i)}
                  role="option"
                  aria-selected={c ? c.id === value : !value}
                  className={`dd__opt ${i === active ? "dd__opt--active" : ""} ${(c ? c.id === value : !value) ? "dd__opt--sel" : ""}`}
                  style={c ? ({ "--fac": FACTION_COLOR[c.faction] } as React.CSSProperties) : undefined}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  data-testid={`attacker-opt-${c?.id ?? "none"}`}
                >
                  {c ? (
                    <>
                      <RarityChip rarity={c.rarity} />
                      <span className="dd__name">{c.nameJa}</span>
                      <span className="dd__fac">{FACTION_LABEL[c.faction] ?? c.faction}</span>
                      <span className="dd__sub">
                        {ELEMENT_LABEL[c.element]}
                        {c.subElement ? `+${ELEMENT_LABEL[c.subElement]}` : ""} {ROLE_LABEL[c.role]}
                      </span>
                    </>
                  ) : (
                    <span className="dd__placeholder">— 指定なし(全バフを表示) —</span>
                  )}
                </li>
              ))}
            </ul>,
            document.body,
          )}
        </div>
        {sel && (
          <button type="button" className="btn btn--ghost" onClick={() => onChange(null)} data-testid="attacker-clear">
            解除
          </button>
        )}
      </div>
      {sel ? (
        <div className="attacker__card" key={sel.id} style={{ "--fac": FACTION_COLOR[sel.faction] } as React.CSSProperties}>
          <div className={`attacker__el el--${sel.element}`}>
            <ElementIcon element={sel.element} />
          </div>
          <div className="attacker__info">
            <div className="attacker__name">
              <RarityChip rarity={sel.rarity} />
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
          <p className="attacker__note" data-testid="attacker-aa-note">
            各行の「追加能力」チェックは、{sel.nameJa}との2人編成で発動条件を満たすかで自動設定しています(3人目は未考慮)。手動で変更でき、解除すると元の設定に戻ります。
          </p>
        </div>
      ) : (
        <p className="attacker__hint">アタッカーを指定すると、そのキャラに有効なバフが強調表示されます。</p>
      )}
    </div>
  );
}
