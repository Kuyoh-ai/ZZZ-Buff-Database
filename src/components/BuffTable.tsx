import { Fragment, useState } from "react";
import { ELEMENT_LABEL, FACTION_LABEL, ROLE_LABEL } from "../data/labels";
import type { StatDef } from "../data/stats";
import type { SortKey } from "../lib/sort";
import { cellDisplay, type CellData, type Row } from "../lib/table";
import { effectiveSetting, hasOverride } from "../lib/resolve";
import type { Character, CharSetting, Mindscape, Potential, Settings, WenginePhase } from "../types";
import { ElementIcon } from "./Icons";

const TARGET_LABEL = { self: "自身", team: "チーム", enemy: "敵デバフ", next_swap_in: "次の登場キャラ" } as const;

function fmt(v: number, unit: string) {
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
  return unit ? `${s}${unit}` : s;
}

export function BuffTable({
  rows,
  stats,
  attacker,
  settings,
  sortKeys,
  onSort,
  onOverride,
}: {
  rows: Row[];
  stats: StatDef[];
  attacker: Character | null;
  settings: Settings;
  sortKeys: SortKey[];
  onSort: (key: string, multi: boolean) => void;
  onOverride: (id: string, patch: Partial<CharSetting> | null) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ id: string; stat: string } | null>(null);

  const sortIdx = (key: string) => sortKeys.findIndex((k) => k.key === key);
  const Th = ({ k, children, className = "" }: { k: string; children: React.ReactNode; className?: string }) => {
    const i = sortIdx(k);
    const on = i >= 0;
    return (
      <th
        className={`th ${className} ${on ? "th--sorted" : ""}`}
        onClick={(e) => onSort(k, e.shiftKey)}
        data-testid={`th-${k}`}
        title="クリックでソート / Shift+クリックで複数キー"
      >
        <span className="th__label">{children}</span>
        {on && (
          <span className="th__sort" key={`${k}-${sortKeys[i].dir}`}>
            {sortKeys.length > 1 && <b>{i + 1}</b>}
            {sortKeys[i].dir === "desc" ? "▼" : "▲"}
          </span>
        )}
      </th>
    );
  };

  return (
    <div className="tablewrap">
      <table className="grid" data-testid="buff-table">
        <thead>
          <tr>
            <Th k="name" className="th--name">
              エージェント
            </Th>
            <th className="th th--setting">個別設定</th>
            {attacker && (
              <Th k="applicable" className="th--num">
                適用数
              </Th>
            )}
            {stats.map((s) => (
              <Th key={s.key} k={s.key} className={`th--stat ${s.debuff ? "th--debuff" : ""}`}>
                <span className="th__group">{s.group}</span>
                {s.short}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const c = row.character;
            const setting = effectiveSetting(settings, c.id);
            const ov = hasOverride(settings, c.id);
            const isSelf = attacker?.id === c.id;
            return (
              <Fragment key={c.id}>
                <tr
                  className={`row ${isSelf ? "row--self" : ""} ${open === c.id ? "row--open" : ""}`}
                  style={{ "--delay": `${Math.min(ri, 20) * 0.02}s` } as React.CSSProperties}
                  data-testid={`row-${c.id}`}
                >
                  <td className="td td--name">
                    <button type="button" className="namebtn" onClick={() => setOpen(open === c.id ? null : c.id)}>
                      <span className={`elicon el--${c.element}`}>
                        <ElementIcon element={c.element} size={14} />
                      </span>
                      <span className={`rarity rarity--${c.rarity}`}>{c.rarity}</span>
                      <span className="namebtn__ja">{c.nameJa}</span>
                      <span className="namebtn__sub">
                        {ROLE_LABEL[c.role]} · {FACTION_LABEL[c.faction] ?? c.faction}
                      </span>
                    </button>
                  </td>
                  <td className={`td td--setting ${ov ? "td--overridden" : ""}`}>
                    <RowSetting
                      id={c.id}
                      setting={setting}
                      overridden={ov}
                      onOverride={onOverride}
                      wengineName={c.wengine.nameJa}
                      hasPotential={!!c.hasPotential}
                    />
                  </td>
                  {attacker && (
                    <td className="td td--num">
                      <span className="num">{row.applicableCount}</span>
                      <span className="num__sub">/{row.buffCount}</span>
                    </td>
                  )}
                  {stats.map((s) => (
                    <Cell
                      key={s.key}
                      stat={s}
                      cell={row.cells[s.key]}
                      attacker={attacker}
                      active={detail?.id === c.id && detail.stat === s.key}
                      onClick={() =>
                        setDetail(detail?.id === c.id && detail.stat === s.key ? null : { id: c.id, stat: s.key })
                      }
                    />
                  ))}
                </tr>
                {(open === c.id || detail?.id === c.id) && (
                  <tr className="row row--detail">
                    <td colSpan={2 + (attacker ? 1 : 0) + stats.length}>
                      <DetailPanel row={row} stat={open === c.id ? null : detail!.stat} attacker={attacker} setting={setting} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td className="td td--empty" colSpan={2 + stats.length}>
                該当するエージェントがいません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  stat,
  cell,
  attacker,
  active,
  onClick,
}: {
  stat: StatDef;
  cell: CellData | undefined;
  attacker: Character | null;
  active: boolean;
  onClick: () => void;
}) {
  if (!cell) return <td className="td td--stat td--none" />;
  const applicable = cell.applicableCount > 0;
  const state = !attacker ? "" : applicable ? "cell--applicable" : "cell--muted";
  const { party, self } = cellDisplay(cell, attacker);
  const elements = [...new Set(cell.buffs.map((b) => b.buff.element).filter(Boolean))];
  const hasParty = cell.buffs.some((b) => b.buff.target !== "self");
  const unlock = party === 0 && hasParty ? unlockHint(cell) : party === 0 && self === 0 ? unlockHint(cell) : null;
  return (
    <td
      className={`td td--stat cell ${state} ${stat.debuff ? "cell--debuff" : ""} ${active ? "cell--active" : ""}`}
      onClick={onClick}
      data-testid={`cell-${stat.key}`}
    >
      {unlock ? (
        <span className="cell__value cell__value--zero" key="zero" title={`パーティ向け効果は ${unlock} で有効`}>
          <i>{unlock}</i>
        </span>
      ) : hasParty ? (
        <span className="cell__value" key={party}>
          {stat.debuff ? "-" : "+"}
          {fmt(party, stat.unit)}
        </span>
      ) : (
        <span className="cell__value cell__value--selfonly" key={`s${self}`} title="自身のみのバフ">
          自 +{fmt(self, stat.unit)}
        </span>
      )}
      {hasParty && self > 0 && (
        <span className="cell__selfadd" title="自身のみのバフ(別枠、合算しない)">
          自 +{fmt(self, stat.unit)}
        </span>
      )}
      <span className="cell__meta">
        {elements.map((e) => (
          <span key={e} className={`cell__el el--${e}`} title={ELEMENT_LABEL[e!]}>
            <ElementIcon element={e!} size={10} />
          </span>
        ))}
        {cell.buffs.some((b) => b.buff.target === "enemy") && (
          <span className="cell__enemy" title="敵へのデバフ">
            敵
          </span>
        )}
        {cell.buffs.length > 1 && <span className="cell__count">×{cell.buffs.length}</span>}
      </span>
    </td>
  );
}

/** 現在の設定で0のセルについて、どの段階で有効になるかのヒント(例 "M2" / "W") */
function unlockHint(cell: CellData): string {
  let best: number | null = null;
  let wengine = false;
  let potential = false;
  const party = cell.buffs.filter((b) => b.buff.target !== "self");
  for (const { buff } of party.length ? party : cell.buffs) {
    const v = buff.values;
    const ks = ["m1", "m2", "m3", "m4", "m5", "m6"] as const;
    ks.forEach((k, i) => {
      const x = v[k];
      if (x && x !== 0 && (best === null || i + 1 < best)) best = i + 1;
    });
    if (buff.wengine && Object.values(buff.wengine).some((x) => x)) wengine = true;
    if (buff.potential && Object.values(buff.potential).some((x) => x)) potential = true;
  }
  if (best === null && !wengine && potential) return "T";
  if (best !== null && wengine) return `M${best}/W`;
  if (best !== null) return `M${best}`;
  if (wengine) return "W";
  return "0";
}

const MS: Mindscape[] = [0, 1, 2, 3, 4, 5, 6];
const WP: WenginePhase[] = [0, 1, 2, 3, 4, 5];
const PT: Potential[] = [0, 1, 2, 3, 4, 5, 6];

function RowSetting({
  id,
  setting,
  overridden,
  onOverride,
  wengineName,
  hasPotential,
}: {
  id: string;
  setting: CharSetting;
  overridden: boolean;
  onOverride: (id: string, patch: Partial<CharSetting> | null) => void;
  wengineName: string;
  hasPotential: boolean;
}) {
  const hasWengine = wengineName && wengineName !== "-";
  return (
    <div className="rowset">
      <select
        className="select select--mini"
        value={setting.mindscape}
        onChange={(e) => onOverride(id, { mindscape: Number(e.target.value) as Mindscape })}
        aria-label="心象映画(個別)"
        data-testid={`row-ms-${id}`}
      >
        {MS.map((m) => (
          <option key={m} value={m}>
            M{m}
          </option>
        ))}
      </select>
      <select
        className="select select--mini"
        value={setting.wenginePhase}
        onChange={(e) => onOverride(id, { wenginePhase: Number(e.target.value) as WenginePhase })}
        aria-label="音動機(個別)"
        title={hasWengine ? wengineName : "モチーフ音動機なし"}
        disabled={!hasWengine}
        data-testid={`row-wp-${id}`}
      >
        {WP.map((p) => (
          <option key={p} value={p}>
            {p === 0 ? "W-" : `P${p}`}
          </option>
        ))}
      </select>
      {hasPotential && (
        <select
          className="select select--mini select--pt"
          value={setting.potential}
          onChange={(e) => onOverride(id, { potential: Number(e.target.value) as Potential })}
          aria-label="ポテンシャル解放(個別)"
          title="ポテンシャル解放"
          data-testid={`row-pt-${id}`}
        >
          {PT.map((t) => (
            <option key={t} value={t}>
              {t === 0 ? "T-" : `T${t}`}
            </option>
          ))}
        </select>
      )}
      {overridden && (
        <button
          type="button"
          className="rowset__reset"
          onClick={() => onOverride(id, null)}
          title="一括設定に戻す"
          aria-label="一括設定に戻す"
          data-testid={`row-reset-${id}`}
        >
          ↺
        </button>
      )}
    </div>
  );
}

function DetailPanel({
  row,
  stat,
  attacker,
  setting,
}: {
  row: Row;
  stat: string | null;
  attacker: Character | null;
  setting: CharSetting;
}) {
  const entries = Object.entries(row.cells).filter(([k]) => !stat || k === stat);
  const c = row.character;
  return (
    <div className="detail">
      <div className="detail__head">
        <span className="detail__name">{c.nameJa}</span>
        <span className="detail__setting">
          M{setting.mindscape} / {setting.wenginePhase === 0 ? "音動機なし" : `${c.wengine.nameJa} P${setting.wenginePhase}`}
          {c.hasPotential && ` / ポテンシャル T${setting.potential}`}
        </span>
        <a className="detail__src" href={c.sourceUrl} target="_blank" rel="noreferrer">
          参照元 ↗
        </a>
      </div>
      {entries.length === 0 && <p className="detail__empty">数値化できるバフ/デバフのデータがありません。</p>}
      <div className="detail__list">
        {entries.flatMap(([, cell]) =>
          cell.buffs.map((rb) => {
            const b = rb.buff;
            const st = statLabel(b.stat);
            return (
              <div key={b.id} className={`bufffx ${attacker ? (rb.applicable ? "bufffx--on" : "bufffx--off") : ""}`}>
                <div className="bufffx__top">
                  <span className="bufffx__stat">
                    {st}
                    {b.element && <span className={`tag tag--xs el--${b.element}`}>{ELEMENT_LABEL[b.element]}</span>}
                  </span>
                  <span className="bufffx__val">
                    {fmt(rb.total, unitOf(b.stat))}
                    {b.maxStacks && b.maxStacks > 1 && (
                      <small>
                        {" "}
                        ({fmt(rb.perStack, unitOf(b.stat))} × {b.maxStacks})
                      </small>
                    )}
                  </span>
                </div>
                <div className="bufffx__name">{b.name}</div>
                <div className="bufffx__tags">
                  <span className="tag tag--xs">{TARGET_LABEL[b.target]}</span>
                  {b.condition?.elements?.map((e) => (
                    <span key={e} className={`tag tag--xs el--${e}`}>
                      {ELEMENT_LABEL[e]}のみ
                    </span>
                  ))}
                  {b.condition?.roles?.map((r) => (
                    <span key={r} className="tag tag--xs">
                      {ROLE_LABEL[r]}のみ
                    </span>
                  ))}
                  {b.condition?.factions?.map((f) => (
                    <span key={f} className="tag tag--xs">
                      {FACTION_LABEL[f] ?? f}のみ
                    </span>
                  ))}
                  {b.condition?.excludeSelf && <span className="tag tag--xs">自身除く</span>}
                  {b.duration && <span className="tag tag--xs">{b.duration}</span>}
                </div>
                {b.note && <div className="bufffx__note">{b.note}</div>}
                <div className="bufffx__ms">
                  {(["base", "m1", "m2", "m3", "m4", "m5", "m6"] as const).map((k) => {
                    const v = b.values[k];
                    return (
                      <span key={k} className={`ms ${v === null || v === undefined ? "ms--same" : ""}`}>
                        <i>{k === "base" ? "M0" : k.toUpperCase()}</i>
                        {v === null || v === undefined ? "—" : fmt(v, unitOf(b.stat))}
                      </span>
                    );
                  })}
                  {b.potential && (
                    <span className="ms ms--pt">
                      <i>ポテンシャル</i>
                      {(["t1", "t2", "t3", "t4", "t5", "t6"] as const)
                        .map((k) => (b.potential![k] === null || b.potential![k] === undefined ? "—" : fmt(b.potential![k]!, unitOf(b.stat))))
                        .join("/")}
                    </span>
                  )}
                  {b.wengine && (
                    <span className="ms ms--w">
                      <i>音動機</i>+{b.wengine.p1}/{b.wengine.p2}/{b.wengine.p3}/{b.wengine.p4}/{b.wengine.p5}
                    </span>
                  )}
                </div>
                <a className="bufffx__src" href={b.sourceUrl} target="_blank" rel="noreferrer">
                  参照元 ↗
                </a>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

import { STAT_BY_KEY } from "../data/stats";
function statLabel(k: string) {
  return STAT_BY_KEY[k]?.label ?? k;
}
function unitOf(k: string) {
  return STAT_BY_KEY[k]?.unit ?? "";
}
