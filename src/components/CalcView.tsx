import { useMemo, useState } from "react";
import { BUFFS_BY_CHARACTER, CHARACTERS, CHARACTER_BY_ID } from "../data/load";
import { AGENT_STATS, ENEMIES, ENEMY_BY_ID } from "../data/calcLoad";
import { DISC_PRESETS, DISC_PRESET_BY_ID, defaultDiscPresetFor, type DiscPresetId } from "../data/disc_presets";
import { FIXED_PRESETS } from "../data/fixed_presets";
import { STATS, STAT_BY_KEY } from "../data/stats";
import { ELEMENT_LABEL, FACTION_COLOR, FACTION_LABEL, ROLE_LABEL } from "../data/labels";
import { RES_ELEMENTS } from "../data/calcSchema";
import type { Character, Element, Role, Settings } from "../types";
import type { AttackerPanel, AttackType, DamageMode, DamageResult } from "../lib/damage";
import { buildPanel, compareAll, enemyState, fixedTotals, type CompareRow, type FixedBuff } from "../lib/compare";
import { RarityChip } from "./BuffTable";
import { ElementIcon } from "./Icons";

const MODES: { id: DamageMode; label: string; hint: string; armorerOnly?: boolean }[] = [
  { id: "direct", label: "直接攻撃", hint: "スキルの直接ダメージ(会心あり)" },
  { id: "anomaly", label: "状態異常", hint: "属性異常のダメージ(異常マスタリー基準、会心なし)。蓄積側も発動頻度として乗算" },
  { id: "abloom", label: "狂咲", hint: "状態異常中の敵への命中で発生する追加状態異常ダメージ(狂咲ダメ% が別枠)" },
  { id: "disorder", label: "混沌", hint: "混沌ダメージ(混沌ダメ% が別枠)。蓄積側も乗算" },
  { id: "grievous", label: "重傷", hint: "鋭御の「重傷」(鋭撃ダメージの単発ヒット)。防御力基準、暴傷の 2 段会心、鋭撃ダメ% と重傷倍率が別枠。攻撃種別限定バフは含めない", armorerOnly: true },
];
const ANOMALY_UI_MODES: DamageMode[] = ["anomaly", "abloom", "disorder"];
const ATTACK_TYPES: { id: AttackType; label: string }[] = [
  { id: "generic", label: "汎用(種別限定バフを含めない)" },
  { id: "basic", label: "通常攻撃" },
  { id: "dash", label: "ダッシュ攻撃" },
  { id: "ex", label: "強化特殊スキル" },
  { id: "chain", label: "連携スキル" },
  { id: "ult", label: "終結スキル" },
  { id: "assist", label: "支援攻撃" },
  { id: "aftershock", label: "追加攻撃" },
];
const PANEL_FIELDS: { key: keyof AttackerPanel; label: string; unit: "%" | ""; roles?: Role[]; hint?: string }[] = [
  { key: "baseAtk", label: "基礎攻撃力", unit: "", hint: "エージェント + コアスキル + 音動機" },
  { key: "atkPct", label: "攻撃力%(常時)", unit: "%", hint: "ディスク + 音動機上級 + コア" },
  { key: "atkFlat", label: "攻撃力+(常時)", unit: "", hint: "ディスク 2 番 + サブ" },
  { key: "critRate", label: "会心率", unit: "%" },
  { key: "critDmg", label: "会心ダメージ", unit: "%" },
  { key: "dmgPct", label: "属性ダメージ%(常時)", unit: "%", hint: "ディスク 5 番 + 2 セット" },
  { key: "anomalyProficiency", label: "異常マスタリー", unit: "" },
  { key: "anomalyMastery", label: "異常掌握", unit: "" },
  { key: "penRatio", label: "貫通率", unit: "%" },
  { key: "penFlat", label: "貫通値", unit: "" },
  { key: "baseHp", label: "基礎HP", unit: "", roles: ["rupture"] },
  { key: "hpPct", label: "HP%(常時)", unit: "%", roles: ["rupture"] },
  { key: "baseDef", label: "基礎防御力", unit: "", roles: ["armorer"] },
  { key: "defPct", label: "防御力%(常時)", unit: "%", roles: ["armorer"] },
  { key: "sharpCritDmg", label: "暴傷ダメージ", unit: "%", roles: ["armorer"] },
];

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "-");
const fmtNum = (n: number) => (Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(1)) : "-");

function CharSelect({ value, onChange, exclude, label, testId }: { value: string | null; onChange: (id: string | null) => void; exclude?: string[]; label: string; testId: string }) {
  return (
    <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} aria-label={label} data-testid={testId}>
      <option value="">— 指定なし —</option>
      {CHARACTERS.filter((c) => !exclude?.includes(c.id)).map((c) => (
        <option key={c.id} value={c.id}>
          {c.nameJa}({ELEMENT_LABEL[c.element]} {ROLE_LABEL[c.role]})
        </option>
      ))}
    </select>
  );
}

export function CalcView({ settings, settingsPanel }: { settings: Settings; settingsPanel: React.ReactNode }) {
  const [attackerId, setAttackerId] = useState<string | null>(null);
  const [thirdId, setThirdId] = useState<string | null>(null);
  const [enemyId, setEnemyId] = useState<string>(ENEMIES[0]?.id ?? "generic_boss");
  const [broken, setBroken] = useState(true);
  /** 弱体倍率の上限の上書き(undefined = プリセット値、null = 上限なし) */
  const [stunCapOverride, setStunCapOverride] = useState<number | null | undefined>(undefined);
  const [miasma, setMiasma] = useState(false);
  const [mode, setMode] = useState<DamageMode>("direct");
  const [attackType, setAttackType] = useState<AttackType>("generic");
  const [anomalyCrit, setAnomalyCrit] = useState(false);
  const [includeBuildup, setIncludeBuildup] = useState(true);
  const [discId, setDiscId] = useState<DiscPresetId | null>(null);
  const [overrides, setOverrides] = useState<Partial<AttackerPanel>>({});
  const [fixed, setFixed] = useState<FixedBuff[]>([]);
  const [hideNoEffect, setHideNoEffect] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const attacker: Character | null = attackerId ? (CHARACTER_BY_ID[attackerId] ?? null) : null;
  const third: Character | null = thirdId && thirdId !== attackerId ? (CHARACTER_BY_ID[thirdId] ?? null) : null;
  const enemy = ENEMY_BY_ID[enemyId] ?? ENEMIES[0];
  const stats = attacker ? AGENT_STATS[attacker.id] : undefined;
  const effectiveDisc: DiscPresetId = discId ?? (attacker ? defaultDiscPresetFor(attacker.role) : "attack");
  const disc = DISC_PRESET_BY_ID[effectiveDisc];

  const computedPanel = useMemo(() => (attacker && stats ? buildPanel(attacker, stats, disc.build) : null), [attacker, stats, disc]);
  const panel = useMemo(() => (computedPanel ? { ...computedPanel, ...overrides } : null), [computedPanel, overrides]);

  const selectAttacker = (id: string | null) => {
    setAttackerId(id);
    setOverrides({});
    setDiscId(null);
    setOpenRow(null);
    const c = id ? CHARACTER_BY_ID[id] : null;
    if (c && c.role === "anomaly" && !ANOMALY_UI_MODES.includes(mode)) setMode("anomaly");
    else if (c && c.role === "armorer") setMode("grievous");
    else if (c && c.role !== "anomaly" && mode !== "direct") setMode("direct");
  };

  const output = useMemo(() => {
    if (!attacker || !panel) return null;
    return compareAll({
      attacker,
      third,
      candidates: CHARACTERS,
      buffsOf: (id) => BUFFS_BY_CHARACTER[id],
      settings,
      panel,
      enemy: enemyState(enemy, attacker, broken && !miasma, miasma, stunCapOverride),
      fixed: fixedTotals(fixed, attacker),
      mode,
      attackType,
      anomalyCrit,
      includeBuildup,
    });
  }, [attacker, third, panel, settings, enemy, broken, miasma, stunCapOverride, fixed, mode, attackType, anomalyCrit, includeBuildup]);

  const rows = useMemo(() => {
    if (!output) return [];
    const r = [...output.rows].sort((a, b) => b.ratio - a.ratio || a.character.nameJa.localeCompare(b.character.nameJa, "ja"));
    return hideNoEffect ? r.filter((x) => Math.abs(x.ratio - 1) > 1e-9) : r;
  }, [output, hideNoEffect]);

  const setOverride = (key: keyof AttackerPanel, raw: string) => {
    const n = Number(raw);
    setOverrides((o) => {
      const next = { ...o };
      if (raw === "" || !Number.isFinite(n)) delete next[key];
      else (next as Record<string, unknown>)[key] = n;
      return next;
    });
  };
  const addFixed = (b: FixedBuff = { stat: "dmg_pct", value: 10 }) => setFixed((f) => [...f, b]);
  const addPreset = (id: string) => {
    const p = FIXED_PRESETS.find((x) => x.id === id);
    if (p) setFixed((f) => [...f, ...p.buffs.map((b) => ({ ...b }))]);
  };
  const updateFixed = (i: number, patch: Partial<FixedBuff>) => setFixed((f) => f.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const removeFixed = (i: number) => setFixed((f) => f.filter((_, j) => j !== i));

  const resLabel = (e: typeof enemy) => {
    const weak = RES_ELEMENTS.filter((k) => (e.res[k] ?? 0) < 0).map((k) => ELEMENT_LABEL[k as Element]);
    const resist = RES_ELEMENTS.filter((k) => (e.res[k] ?? 0) > 0).map((k) => ELEMENT_LABEL[k as Element]);
    return `弱点: ${weak.length ? weak.join("・") : "なし"} / 耐性: ${resist.length ? resist.join("・") : "なし"}`;
  };

  return (
    <main className="layout layout--calc">
      <section className="panel panel--calc-settings" style={{ "--delay": "0.05s" } as React.CSSProperties}>
        {settingsPanel}
      </section>

      <section className="panel panel--calc-attacker" style={{ "--delay": "0.1s" } as React.CSSProperties}>
        <h2 className="panel__title">
          <span className="panel__num">02</span>アタッカーと計算モード
        </h2>
        <div className="fields">
          <label className="field field--wide">
            <span className="field__label">アタッカー</span>
            <CharSelect value={attackerId} onChange={selectAttacker} label="アタッカーを選択" testId="calc-attacker" />
          </label>
          {attacker && (
            <div className="calc-card" style={{ "--fac": FACTION_COLOR[attacker.faction] } as React.CSSProperties} data-testid="calc-attacker-card">
              <span className={`calc-card__el el--${attacker.element}`}>
                <ElementIcon element={attacker.element} />
              </span>
              <RarityChip rarity={attacker.rarity} />
              <b>{attacker.nameJa}</b>
              <span className={`tag el--${attacker.element}`}>{ELEMENT_LABEL[attacker.element]}</span>
              <span className="tag">{ROLE_LABEL[attacker.role]}</span>
              <span className="tag tag--faction">{FACTION_LABEL[attacker.faction] ?? attacker.faction}</span>
            </div>
          )}
          <div className="field field--wide">
            <span className="field__label">計算モード</span>
            <div className="segmented" role="radiogroup" aria-label="計算モード">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  className={`seg ${mode === m.id ? "seg--on" : ""}`}
                  title={m.armorerOnly && attacker?.role !== "armorer" ? "鋭御アタッカーのみ" : m.hint}
                  disabled={!!m.armorerOnly && attacker?.role !== "armorer"}
                  onClick={() => setMode(m.id)}
                  data-testid={`calc-mode-${m.id}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="field__hint">{MODES.find((m) => m.id === mode)?.hint}</span>
          </div>
          {mode === "grievous" ? null : mode === "direct" ? (
            <label className="field field--wide">
              <span className="field__label">攻撃種別</span>
              <select className="select" value={attackType} onChange={(e) => setAttackType(e.target.value as AttackType)} data-testid="calc-attack-type">
                {ATTACK_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="field field--wide checks">
              <label className="check">
                <input type="checkbox" checked={anomalyCrit} onChange={(e) => setAnomalyCrit(e.target.checked)} data-testid="calc-anomaly-crit" />
                状態異常に会心を適用(Ver.3.3 以降の仕様の受け口、既定 OFF)
              </label>
              {mode !== "abloom" && (
                <label className="check">
                  <input type="checkbox" checked={includeBuildup} onChange={(e) => setIncludeBuildup(e.target.checked)} data-testid="calc-buildup" />
                  蓄積側(異常掌握・蓄積効率・敵蓄積耐性ダウン)を発動頻度として乗算
                </label>
              )}
            </div>
          )}
          <label className="field field--wide">
            <span className="field__label">ディスク(平均ビルド)</span>
            <select className="select" value={effectiveDisc} onChange={(e) => setDiscId(e.target.value as DiscPresetId)} data-testid="calc-disc">
              {DISC_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="field__hint">
              {disc.mains} / サブ: {disc.subs} / 2 セット: {disc.sets}
            </span>
          </label>
        </div>
        {panel && computedPanel && attacker && (
          <>
            <div className="calc-sub">
              <span className="calc-sub__title">常時ステータス(Lv60 + モチーフ音動機 + ディスク)。空欄にすると自動値に戻ります</span>
              {Object.keys(overrides).length > 0 && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOverrides({})} data-testid="calc-override-reset">
                  上書きをリセット
                </button>
              )}
            </div>
            <div className="fields fields--stats">
              {PANEL_FIELDS.filter((f) => !f.roles || f.roles.includes(attacker.role)).map((f) => {
                const over = overrides[f.key] !== undefined;
                return (
                  <label key={f.key} className={`field ${over ? "field--over" : ""}`} title={f.hint}>
                    <span className="field__label">
                      {f.label}
                      {f.unit && <small>{f.unit}</small>}
                    </span>
                    <input
                      className="input input--num"
                      type="number"
                      step="any"
                      value={over ? String(overrides[f.key]) : ""}
                      placeholder={fmtNum(computedPanel[f.key] as number)}
                      onChange={(e) => setOverride(f.key, e.target.value)}
                      data-testid={`calc-field-${f.key}`}
                    />
                  </label>
                );
              })}
            </div>
            <p className="field__hint">
              音動機: {stats?.wengine?.nameJa ?? "-"}(基礎{stats?.wengine?.baseStat === "def" ? "防御力" : "攻撃力"} {stats?.wengine?.baseValue ?? "-"}、
              {stats?.wengine ? `${STAT_BY_KEY[stats.wengine.advStat]?.label ?? stats.wengine.advStat} ${stats.wengine.advValue}` : ""})。
              データは HoYoWiki(Lv60)と wikiwiki(ディスク)。根拠は <code>src/data/formula.md</code>
            </p>
          </>
        )}
      </section>

      <section className="panel panel--calc-enemy" style={{ "--delay": "0.15s" } as React.CSSProperties}>
        <h2 className="panel__title">
          <span className="panel__num">03</span>敵と状況
        </h2>
        <div className="fields">
          <label className="field field--wide">
            <span className="field__label">敵プリセット(危局強襲戦 Ver.3.x)</span>
            <select
              className="select"
              value={enemyId}
              onChange={(e) => {
                setEnemyId(e.target.value);
                setStunCapOverride(undefined);
              }}
              data-testid="calc-enemy"
            >
              {ENEMIES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nameJa}
                  {e.versions ? `(Ver.${e.versions.join("/")})` : ""}
                </option>
              ))}
            </select>
            <span className="field__hint">
              Lv{enemy.level} / 防御 {enemy.defLv70} / 弱体倍率 {enemy.stunMultiplier}% / {resLabel(enemy)}
              {enemy.anomalyTakenPct ? ` / 受ける状態異常ダメ ${enemy.anomalyTakenPct}%` : ""}
              {attacker && ` / ${ELEMENT_LABEL[attacker.element]}耐性 ${(enemy.res as Record<string, number | undefined>)[attacker.element] ?? 0}%`}
            </span>
            {enemy.note && <span className="field__hint">{enemy.note}</span>}
          </label>
          <div className="field field--wide checks">
            <label className="check">
              <input type="checkbox" checked={broken && !miasma} disabled={miasma} onChange={(e) => setBroken(e.target.checked)} data-testid="calc-broken" />
              ブレイク中(弱体倍率を適用)
            </label>
            <label className="check" title="弱体倍率バフを加算した合計(3 枠目・固定バフ・比較対象の分を含む)がこの値を超えないようカットします。空欄なら上限なし">
              弱体倍率の上限
              <input
                className="input input--num input--cap"
                type="number"
                step="any"
                value={stunCapOverride === undefined ? (enemy.stunMultiplierMax ?? "") : (stunCapOverride ?? "")}
                placeholder="なし"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setStunCapOverride(null);
                  else if (Number.isFinite(Number(v))) setStunCapOverride(Number(v));
                }}
                data-testid="calc-stun-cap"
              />
              %
            </label>
            <label className="check">
              <input type="checkbox" checked={miasma} onChange={(e) => setMiasma(e.target.checked)} data-testid="calc-miasma" />
              ミアズマシールド中(防御+80%、被ダメ-25%、ブレイク不可)
            </label>
          </div>
          <label className="field field--wide">
            <span className="field__label">3 枠目のメンバー(基準に含める)</span>
            <CharSelect value={thirdId} onChange={setThirdId} exclude={attackerId ? [attackerId] : []} label="3 枠目を選択" testId="calc-third" />
            <span className="field__hint">追加能力はアタッカー・3 枠目・比較対象の 3 人編成で発動条件を判定します</span>
          </label>
        </div>

        <div className="calc-sub">
          <span className="calc-sub__title">固定バフ(危局強襲戦 / 激変ノード / 手入力)</span>
          <div className="calc-sub__actions">
            <select className="select select--mini" value="" onChange={(e) => e.target.value && addPreset(e.target.value)} aria-label="プリセットを追加" data-testid="calc-preset">
              <option value="">プリセットを追加…</option>
              {FIXED_PRESETS.map((p) => (
                <option key={p.id} value={p.id} title={p.note}>
                  [{p.group}] {p.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => addFixed()} data-testid="calc-fixed-add">
              + 行を追加
            </button>
          </div>
        </div>
        {fixed.length > 0 && (
          <div className="fixed-list" data-testid="calc-fixed-list">
            {fixed.map((b, i) => (
              <div key={i} className="fixed-row">
                <select className="select" value={b.stat} onChange={(e) => updateFixed(i, { stat: e.target.value, element: STAT_BY_KEY[e.target.value]?.elemental ? (b.element ?? attacker?.element) : undefined })}>
                  {STATS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {STAT_BY_KEY[b.stat]?.elemental && (
                  <select className="select select--mini" value={b.element ?? ""} onChange={(e) => updateFixed(i, { element: (e.target.value || undefined) as Element | undefined })} aria-label="属性">
                    {(Object.keys(ELEMENT_LABEL) as Element[]).map((el) => (
                      <option key={el} value={el}>
                        {ELEMENT_LABEL[el]}
                      </option>
                    ))}
                  </select>
                )}
                <input className="input input--num" type="number" step="any" value={b.value} onChange={(e) => updateFixed(i, { value: Number(e.target.value) })} aria-label="値" />
                <span className="fixed-row__unit">{STAT_BY_KEY[b.stat]?.unit}</span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeFixed(i)} aria-label="削除">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel panel--table panel--calc-result" style={{ "--delay": "0.2s" } as React.CSSProperties}>
        {!attacker || !output || !panel ? (
          <p className="calc-empty" data-testid="calc-empty">
            アタッカーを選ぶと、各キャラをチームに加えたときの期待ダメージの比(基準 = アタッカー自身 + 3 枠目 + 固定バフ)を一覧します。
          </p>
        ) : (
          <>
            <Baseline result={output.baseline} panel={panel} mode={mode} totals={output.baselineTotals} />
            <div className="calc-toolbar">
              <label className="check">
                <input type="checkbox" checked={hideNoEffect} onChange={(e) => setHideNoEffect(e.target.checked)} data-testid="calc-hide-noeffect" />
                影響なし(×1.00)を隠す
              </label>
              <span className="field__hint" data-testid="calc-aa-note">
                常時発動・最大スタック・上限値の前提。追加能力は同席メンバーで発動条件を判定(一括/個別設定で OFF なら無効)。
                {attacker.additionalAbility &&
                  (output.baselineAa[attacker.id]
                    ? `${attacker.nameJa}の追加能力「${attacker.additionalAbility.name}」は基準で発動`
                    : `${attacker.nameJa}の追加能力「${attacker.additionalAbility.name}」(${attacker.additionalAbility.conditionShort})は基準では未発動。条件を満たす候補の行にはその分も含まれます`)}
              </span>
            </div>
            <div className="tablewrap tablewrap--calc">
              <table className="grid calc-table">
                <thead>
                  <tr>
                    <th className="th th--name">エージェント</th>
                    <th className="th">属性 / 役割</th>
                    <th className="th th--num">基準比</th>
                    <th className="th th--num">増加率</th>
                    <th className="th">追加能力</th>
                    <th className="th">寄与するバフ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <ResultRow key={r.character.id} row={r} open={openRow === r.character.id} onToggle={() => setOpenRow((o) => (o === r.character.id ? null : r.character.id))} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Baseline({ result, panel, mode, totals }: { result: DamageResult; panel: AttackerPanel; mode: DamageMode; totals: Record<string, number | undefined> }) {
  const p = result.parts;
  const armorer = panel.role === "armorer" && (mode === "direct" || mode === "grievous");
  const items: [string, string][] = [
    [panel.role === "rupture" && mode === "direct" ? "透徹力" : armorer ? "防御力" : "攻撃力(戦闘内)", fmtNum(p.baseStat)],
    [armorer ? "会心/暴傷" : "会心", `×${fmt(p.critMul, 3)}`],
    ["与ダメ枠", `×${fmt(p.dmgMul, 3)}`],
    ["防御枠", `×${fmt(p.defMul, 3)}`],
    ["耐性", `×${fmt(p.resMul, 2)}`],
    ["被ダメ", `×${fmt(p.takenMul, 2)}`],
    ["ブレイク", `×${fmt(p.breakMul, 2)}`],
  ];
  if (ANOMALY_UI_MODES.includes(mode)) items.push(["異常マスタリー×Lv", `×${fmt(p.apMul, 3)}`], ["異常/狂咲/混沌枠", `×${fmt(p.extraMul, 3)}`], ["蓄積側", `×${fmt(p.buildupMul, 3)}`]);
  else if (p.extraMul !== 1 || armorer || panel.role === "rupture") items.push([armorer ? (mode === "grievous" ? "鋭撃ダメ×重傷倍率" : "鋭撃ダメ") : panel.role === "rupture" ? "透徹ダメ" : "別枠", `×${fmt(p.extraMul, 3)}`]);
  const n = Object.values(totals).filter((v) => v).length;
  return (
    <div className="baseline" data-testid="calc-baseline">
      <span className="baseline__title">基準(×1.00)の内訳</span>
      {items.map(([k, v]) => (
        <span key={k} className="stat-chip stat-chip--sm">
          {k} <b>{v}</b>
        </span>
      ))}
      <span className="field__hint">基準に含まれるバフ: {n} 種</span>
      {armorer && (
        <span className="field__hint" data-testid="calc-armorer-note">
          暴傷: 会心率 {fmtNum(panel.critRate + (totals.crit_rate ?? 0))}%(1 段目 {fmtNum(Math.min(100, Math.max(0, panel.critRate + (totals.crit_rate ?? 0))))}% / 2 段目 {fmtNum(Math.min(100, Math.max(0, panel.critRate + (totals.crit_rate ?? 0) - 100)))}%)、暴傷ダメージ {fmtNum(panel.sharpCritDmg + (totals.sharp_crit_dmg ?? 0))}%。会心ダメージは乗らず、200% 超の会心率は無効
        </span>
      )}
    </div>
  );
}

function ResultRow({ row, open, onToggle }: { row: CompareRow; open: boolean; onToggle: () => void }) {
  const c = row.character;
  const pct = (row.ratio - 1) * 100;
  const cls = row.ratio > 1 + 1e-9 ? "ratio--up" : row.ratio < 1 - 1e-9 ? "ratio--down" : "ratio--same";
  return (
    <>
      <tr className={`row row--calc ${open ? "row--open" : ""}`} data-testid={`calc-row-${c.id}`} onClick={onToggle}>
        <td className="td td--name" style={{ "--fac": FACTION_COLOR[c.faction] } as React.CSSProperties}>
          <RarityChip rarity={c.rarity} />
          <span className="namebtn__ja">{c.nameJa}</span>
        </td>
        <td className="td">
          <span className={`tag el--${c.element}`}>{ELEMENT_LABEL[c.element]}</span> <span className="tag">{ROLE_LABEL[c.role]}</span>
        </td>
        <td className={`td td--num ratio ${cls}`} data-testid={`calc-ratio-${c.id}`}>
          ×{fmt(row.ratio, 3)}
        </td>
        <td className={`td td--num ratio ${cls}`}>
          {pct >= 0 ? "+" : ""}
          {fmt(pct, 1)}%
        </td>
        <td className="td">{row.aaJudged === null ? "—" : row.aaJudged ? "発動" : "条件外"}</td>
        <td className="td td--contrib">
          {row.enablesAa.map((m) => (
            <span key={m.id} className="tag tag--xs tag--enable" title={`${m.nameJa}の追加能力「${m.additionalAbility?.name ?? ""}」の発動条件を満たす`}>
              {m.nameJa}の追加能力を発動
            </span>
          ))}
          {row.contributions.length === 0
            ? row.enablesAa.length === 0 && "—"
            : row.contributions
                .slice(0, 4)
                .map((b) => `${STAT_BY_KEY[b.buff.stat]?.short ?? b.buff.stat} ${b.total > 0 ? "+" : ""}${b.total}${STAT_BY_KEY[b.buff.stat]?.unit ?? ""}`)
                .join(" / ")}
          {row.contributions.length > 4 && ` …他${row.contributions.length - 4}`}
        </td>
      </tr>
      {open && row.contributions.length > 0 && (
        <tr className="row row--detail">
          <td className="td" colSpan={6}>
            <div className="detail__list detail__list--calc">
              {row.contributions.map((b) => (
                <div key={b.buff.id} className="bufffx bufffx--on">
                  <div className="bufffx__top">
                    <span className="bufffx__stat">
                      {STAT_BY_KEY[b.buff.stat]?.label ?? b.buff.stat}
                      {b.buff.element && <span className={`tag tag--xs el--${b.buff.element}`}>{ELEMENT_LABEL[b.buff.element]}</span>}
                    </span>
                    <span className="bufffx__val">
                      {b.total > 0 ? "+" : ""}
                      {b.total}
                      <small>{STAT_BY_KEY[b.buff.stat]?.unit}</small>
                      {(b.buff.maxStacks ?? 1) > 1 && <small> ({b.perStack} × {b.buff.maxStacks})</small>}
                    </span>
                  </div>
                  <div className="bufffx__name">{b.buff.name}</div>
                  {b.buff.note && <div className="bufffx__note">{b.buff.note}</div>}
                  <a className="bufffx__src" href={b.buff.sourceUrl} target="_blank" rel="noreferrer">
                    出典
                  </a>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
