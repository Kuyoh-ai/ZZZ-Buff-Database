import { useEffect } from "react";

/** ロード演出(0.5s制限の対象外)。1.1s で自動終了 */
export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="splash" aria-hidden>
      <div className="splash__band splash__band--1" />
      <div className="splash__band splash__band--2" />
      <div className="splash__logo">
        <span className="splash__z">Z</span>
        <span className="splash__z">Z</span>
        <span className="splash__z">Z</span>
        <span className="splash__sub">BUFF DATABASE</span>
      </div>
    </div>
  );
}
