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
    <div>
      <h3>Add monster</h3>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search SRD (e.g. goblin)" />
      <button type="button" onClick={search}>Search</button>
      {error && <p role="alert">{error}</p>}
      <ul>
        {results.map((r) => (
          <li key={r.index}>
            {r.name} <button type="button" onClick={() => addFromSrd(r)}>Add</button>
          </li>
        ))}
      </ul>
      <ManualMonster onAdd={add} />
    </div>
  );
}

function ManualMonster({ onAdd }: { onAdd: (name: string, hp: number, dexMod: number) => void }) {
  const [name, setName] = useState('');
  const [hp, setHp] = useState(10);
  const [dexMod, setDexMod] = useState(0);
  return (
    <div>
      <h4>Manual</h4>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input type="number" value={hp} onChange={(e) => setHp(Number(e.target.value))} placeholder="HP" />
      <input type="number" value={dexMod} onChange={(e) => setDexMod(Number(e.target.value))} placeholder="Dex mod" />
      <button type="button" disabled={!name} onClick={() => { onAdd(name, hp, dexMod); setName(''); }}>
        Add (auto-roll init)
      </button>
    </div>
  );
}
