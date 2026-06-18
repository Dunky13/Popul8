import { useDmStore } from '../store/dmStore';

export function TurnControls() {
  const round = useDmStore((s) => s.encounter.round);
  const activeId = useDmStore((s) => s.encounter.activeId);
  const combatants = useDmStore((s) => s.encounter.combatants);
  const next = useDmStore((s) => s.next);
  const prev = useDmStore((s) => s.prev);

  const active = combatants.find((c) => c.id === activeId);
  const empty = combatants.length === 0;

  return (
    <div className="turnbar">
      <div className="turnbar__now">
        {active ? (
          <>
            <span className="turnbar__cue">Now</span>
            <strong>{active.name}</strong>
          </>
        ) : (
          <span className="turnbar__idle">
            {empty ? 'Add combatants to begin' : 'Press Next to begin combat'}
          </span>
        )}
      </div>
      <div className="turnbar__controls">
        <div className="turnbar__round">
          <span>Round</span>
          <strong>{round}</strong>
        </div>
        <button type="button" className="btn btn--ghost" disabled={empty} onClick={prev}>
          ◀ Prev
        </button>
        <button type="button" className="btn btn--primary" disabled={empty} onClick={next}>
          Next ▶
        </button>
      </div>
    </div>
  );
}
