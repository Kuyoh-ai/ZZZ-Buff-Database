export function Header({ characterCount, buffCount }: { characterCount: number; buffCount: number }) {
  return (
    <header className="header">
      <div className="header__stripe" />
      <div className="header__inner">
        <h1 className="header__title">
          <span className="header__tag">ZENLESS ZONE ZERO</span>
          <span className="header__main">
            BUFF<em>/</em>DEBUFF <span className="header__db">DATABASE</span>
          </span>
        </h1>
        <div className="header__meta">
          <span className="stat-chip">
            <b>{characterCount}</b> AGENTS
          </span>
          <span className="stat-chip">
            <b>{buffCount}</b> EFFECTS
          </span>
        </div>
      </div>
      <div className="header__halftone" />
    </header>
  );
}
