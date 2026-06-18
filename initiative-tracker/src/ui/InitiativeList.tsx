import type { CSSProperties } from 'react';
import { useDmStore } from '../store/dmStore';
import { sortOrder } from '../domain/order';
import { HpBar } from './HpBar';

export function InitiativeList() {
  const encounter = useDmStore((s) => s.encounter);
  const dispatch = useDmStore((s) => s.dispatch);
  const ordered = sortOrder(encounter.combatants);

  // Count PCs that haven't submitted initiative yet.
  const waiting = encounter.combatants.filter((c) => c.kind === 'pc' && !c.hasSubmitted).length;

  return (
    <section className="card">
      <h2 className="section-title">
        Initiative
        <span className="count">{ordered.length} in the fray</span>
      </h2>

      {waiting > 0 && (
        <p className="alert" role="status">
          Waiting on {waiting} player{waiting > 1 ? 's' : ''} to roll…
        </p>
      )}

      {ordered.length === 0 ? (
        <div className="empty">
          <strong>No combatants yet</strong>
          Share the room QR with players, or add a monster below.
        </div>
      ) : (
        <ol className="roster">
          {ordered.map((c, i) => {
            const isActive = c.id === encounter.activeId;
            return (
              <li
                key={c.id}
                className={`combatant${isActive ? ' is-active' : ''}${!c.hasSubmitted ? ' is-waiting' : ''}`}
                style={{ '--i': i } as CSSProperties}
              >
                <div className="init">
                  <span className={`init__num${c.initiative == null ? ' init__num--empty' : ''}`}>
                    {c.initiative ?? '—'}
                  </span>
                  {isActive && <span className="init__cue">turn</span>}
                </div>

                <div className="combatant__body">
                  <div className="combatant__name">
                    {c.name}
                    {c.kind === 'monster' && <span className="tag tag--monster">NPC</span>}
                    {!c.hasSubmitted && <span className="tag tag--wait">waiting</span>}
                  </div>
                  {c.hp && <HpBar current={c.hp.current} max={c.hp.max} />}
                  {c.conditions.length > 0 && (
                    <div className="conditions">
                      {c.conditions.map((cond) => (
                        <span key={cond} className="condition">{cond}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="combatant__actions">
                  <button
                    type="button"
                    className={`iconbtn${isActive ? ' iconbtn--active' : ''}`}
                    aria-label={`Set ${c.name} active`}
                    title="Set active"
                    onClick={() => dispatch({ type: 'setActive', id: c.id })}
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="iconbtn iconbtn--danger"
                    aria-label={`Remove ${c.name}`}
                    title="Remove"
                    onClick={() => dispatch({ type: 'removeCombatant', id: c.id })}
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
