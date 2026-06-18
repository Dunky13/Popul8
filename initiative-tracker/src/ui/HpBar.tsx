import type { CSSProperties } from 'react';

/** Inline HP bar; fill width + colour shift from red (low) to green (full). */
export function HpBar({ current, max }: { current: number; max: number }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const hue = 25 + ratio * 120; // 25 = red, ~145 = green
  const style = {
    '--ratio': ratio,
    '--hp-color': `oklch(0.72 0.16 ${hue})`,
  } as CSSProperties;

  return (
    <div className="hp">
      <div className="hp__track">
        <div className="hp__fill" style={style} />
      </div>
      <span className="hp__text">{current}/{max}</span>
    </div>
  );
}
