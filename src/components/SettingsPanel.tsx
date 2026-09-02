import type { CharSetting, Mindscape, Potential, WenginePhase } from "../types";

const MS: Mindscape[] = [0, 1, 2, 3, 4, 5, 6];
const PT: Potential[] = [0, 1, 2, 3, 4, 5, 6];
const WP: WenginePhase[] = [0, 1, 2, 3, 4, 5];

export function SettingsPanel({
  global,
  overrideCount,
  onChange,
  onClearOverrides,
}: {
  global: CharSetting;
  overrideCount: number;
  onChange: (s: CharSetting) => void;
  onClearOverrides: () => void;
}) {
  return (
    <div className="settings">
      <h2 className="panel__title">
        <span className="panel__num">01</span>一括設定
      </h2>
      <div className="settings__group">
        <div className="settings__label">心象映画</div>
        <div className="segmented" role="radiogroup" aria-label="心象映画(一括)">
          {MS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={global.mindscape === m}
              className={`seg ${global.mindscape === m ? "seg--on" : ""}`}
              onClick={() => onChange({ ...global, mindscape: m })}
              data-testid={`global-ms-${m}`}
            >
              M{m}
            </button>
          ))}
        </div>
      </div>
      <div className="settings__group">
        <div className="settings__label">モチーフ音動機</div>
        <div className="segmented" role="radiogroup" aria-label="音動機(一括)">
          {WP.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={global.wenginePhase === p}
              className={`seg ${global.wenginePhase === p ? "seg--on" : ""}`}
              onClick={() => onChange({ ...global, wenginePhase: p })}
              data-testid={`global-wp-${p}`}
            >
              {p === 0 ? "なし" : `P${p}`}
            </button>
          ))}
        </div>
      </div>
      <div className="settings__group">
        <div className="settings__label">ポテンシャル解放</div>
        <div className="segmented" role="radiogroup" aria-label="ポテンシャル解放(一括)">
          {PT.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={global.potential === t}
              className={`seg seg--pt ${global.potential === t ? "seg--on" : ""}`}
              onClick={() => onChange({ ...global, potential: t })}
              data-testid={`global-pt-${t}`}
              title="ポテンシャル解放が実装されているキャラにのみ適用"
            >
              {t === 0 ? "なし" : `T${t}`}
            </button>
          ))}
        </div>
      </div>
      <div className="settings__foot">
        <span className="settings__hint">
          個別設定 <b className="num">{overrideCount}</b> 件
        </span>
        <button type="button" className="btn btn--ghost" onClick={onClearOverrides} disabled={overrideCount === 0}>
          個別設定をすべてリセット
        </button>
      </div>
    </div>
  );
}
