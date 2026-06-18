import { useDmStore } from '../store/dmStore';

export function TurnControls() {
  const round = useDmStore((s) => s.encounter.round);
  const next = useDmStore((s) => s.next);
  const prev = useDmStore((s) => s.prev);

  return (
    <div className="turnbar">
      <div className="turnbar__round">
        <span>Round</span>
        <strong>{round}</strong>
      </div>
      <button type="button" className="btn btn--ghost" onClick={prev}>
        ◀ Prev
      </button>
      <button type="button" className="btn btn--primary" onClick={next}>
        Next ▶
      </button>
    </div>
  );
}
