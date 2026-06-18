import { useDmStore } from '../store/dmStore';
import { sortOrder } from '../domain/order';

export function InitiativeList() {
  const encounter = useDmStore((s) => s.encounter);
  const dispatch = useDmStore((s) => s.dispatch);
  const ordered = sortOrder(encounter.combatants);

  // Fix #5: count PCs that haven't submitted initiative yet.
  const waiting = encounter.combatants.filter((c) => c.kind === 'pc' && !c.hasSubmitted).length;

  return (
    <>
      {waiting > 0 && <p>Waiting on {waiting} player(s)…</p>}
      <ol>
      {ordered.map((c) => (
        <li
          key={c.id}
          style={{ fontWeight: c.id === encounter.activeId ? 'bold' : 'normal' }}
        >
          <span>{c.initiative ?? '—'}</span>{' '}
          <span>{c.name}</span>{' '}
          {c.hp && <span>HP {c.hp.current}/{c.hp.max}</span>}{' '}
          {c.conditions.length > 0 && <span>[{c.conditions.join(', ')}]</span>}{' '}
          {!c.hasSubmitted && <em>waiting…</em>}{' '}
          <button type="button" onClick={() => dispatch({ type: 'setActive', id: c.id })}>
            Set active
          </button>{' '}
          <button type="button" onClick={() => dispatch({ type: 'removeCombatant', id: c.id })}>
            Remove
          </button>
        </li>
      ))}
      </ol>
    </>
  );
}
