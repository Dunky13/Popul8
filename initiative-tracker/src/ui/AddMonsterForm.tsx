import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useDmStore } from '../store/dmStore';
import { searchMonsters, getMonster, type MonsterRef } from '../services/srd';
import { rollInitiative } from '../domain/dice';
import type { Combatant } from '../types';

export function AddMonsterForm() {
  const dispatch = useDmStore((s) => s.dispatch);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MonsterRef[]>([]);
  const [error, setError] = useState('');

  async function search() {
    setError('');
    try {
      setResults(await searchMonsters(query));
    } catch {
      setError('SRD lookup unavailable — add the monster manually.');
    }
  }

  function add(name: string, hp: number, dexMod: number) {
    const combatant: Combatant = {
      id: nanoid(),
      name,
      kind: 'monster',
      initiative: rollInitiative(dexMod),
      dex: dexMod,
      hp: { current: hp, max: hp },
      conditions: [],
      hasSubmitted: true,
    };
    dispatch({ type: 'addCombatant', combatant });
  }

  async function addFromSrd(ref: MonsterRef) {
    try {
      const stats = await getMonster(ref.index);
      add(stats.name, stats.hp, stats.dexMod);
    } catch {
      setError('Could not load that monster — add it manually.');
    }
  }

  return (
    <details className="disclosure">
      <summary>Add monster</summary>
      <div className="disclosure__body">
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SRD — e.g. goblin"
          />
          <button type="submit" className="btn btn--ghost">Search</button>
        </form>

        {error && <p className="alert alert--error" role="alert">{error}</p>}

        {results.length > 0 && (
          <ul className="results">
            {results.map((r) => (
              <li key={r.index}>
                <span>{r.name}</span>
                <button type="button" className="btn btn--ghost" onClick={() => addFromSrd(r)}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}

        <ManualMonster onAdd={add} />
      </div>
    </details>
  );
}

function ManualMonster({ onAdd }: { onAdd: (name: string, hp: number, dexMod: number) => void }) {
  const [name, setName] = useState('');
  const [hp, setHp] = useState(10);
  const [dexMod, setDexMod] = useState(0);

  return (
    <form
      className="card"
      style={{ background: 'transparent', boxShadow: 'none', padding: 0, gap: 'var(--sp-2)' }}
      onSubmit={(e) => {
        e.preventDefault();
        if (name) {
          onAdd(name, hp, dexMod);
          setName('');
        }
      }}
    >
      <span className="eyebrow">Or add manually</span>
      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <div className="inline-form">
        <label className="field" style={{ flex: 1 }}>
          <span>HP</span>
          <input className="input input--num" type="number" inputMode="numeric" value={hp} onChange={(e) => setHp(Number(e.target.value))} />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Dex mod</span>
          <input className="input input--num" type="number" inputMode="numeric" value={dexMod} onChange={(e) => setDexMod(Number(e.target.value))} />
        </label>
      </div>
      <button type="submit" className="btn btn--primary btn--block" disabled={!name}>
        Add &amp; auto-roll initiative
      </button>
    </form>
  );
}
