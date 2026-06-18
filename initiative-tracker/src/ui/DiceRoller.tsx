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

  return (
    <div>
      <label>
        <input type="checkbox" checked={advantage} onChange={(e) => setAdvantage(e.target.checked)} />
        Advantage
      </label>
      <button type="button" onClick={roll}>Roll d20 {dexMod >= 0 ? `+${dexMod}` : dexMod}</button>
      {last !== null && <span> Rolled: {last}</span>}
    </div>
  );
}
