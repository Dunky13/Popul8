import { useState } from 'react';
import { rollInitiative } from '../domain/dice';

export function DiceRoller({ dexMod, onResult }: { dexMod: number; onResult: (value: number) => void }) {
  const [advantage, setAdvantage] = useState(false);
  const [last, setLast] = useState<number | null>(null);

  function roll() {
    const value = rollInitiative(dexMod, { advantage });
    setLast(value);
    onResult(value);
  }

  const mod = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;

  return (
    <div className="roller">
      <div className="roller__row">
        <button type="button" className="btn btn--primary btn--lg" style={{ flex: 1 }} onClick={roll}>
          🎲 Roll d20 {mod}
        </button>
        {last !== null && <span className="roll-result" aria-live="polite">{last}</span>}
      </div>
      <label className="adv">
        <input type="checkbox" checked={advantage} onChange={(e) => setAdvantage(e.target.checked)} />
        Roll with advantage
      </label>
    </div>
  );
}
