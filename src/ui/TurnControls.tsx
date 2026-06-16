import { useDmStore } from '../store/dmStore';

export function TurnControls() {
  const round = useDmStore((s) => s.encounter.round);
  const next = useDmStore((s) => s.next);
  const prev = useDmStore((s) => s.prev);

  return (
    <div>
      <span>Round {round}</span>
      <button type="button" onClick={prev}>Prev</button>
      <button type="button" onClick={next}>Next</button>
    </div>
  );
}
