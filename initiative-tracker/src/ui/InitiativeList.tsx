import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useDmStore } from '../store/dmStore';
import { sortOrder } from '../domain/order';
import { CONDITIONS } from '../domain/conditions';
import type { Combatant } from '../types';
import { HpBar } from './HpBar';

export function InitiativeList() {
  const encounter = useDmStore((s) => s.encounter);
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
          {ordered.map((c, i) => (
            <CombatantRow
              key={c.id}
              c={c}
              index={i}
              isActive={c.id === encounter.activeId}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function CombatantRow({ c, index, isActive }: { c: Combatant; index: number; isActive: boolean }) {
  const dispatch = useDmStore((s) => s.dispatch);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('1');
  const [custom, setCustom] = useState('');

  function adjustHp(delta: number) {
    if (!c.hp) return;
    const current = Math.max(0, Math.min(c.hp.max, c.hp.current + delta));
    dispatch({ type: 'updateHp', id: c.id, current, max: c.hp.max });
  }

  function toggleCondition(cond: string) {
    const conditions = c.conditions.includes(cond)
      ? c.conditions.filter((x) => x !== cond)
      : [...c.conditions, cond];
    dispatch({ type: 'updateConditions', id: c.id, conditions });
  }

  function addCustom() {
    const value = custom.trim();
    if (!value || c.conditions.includes(value)) {
      setCustom('');
      return;
    }
    dispatch({ type: 'updateConditions', id: c.id, conditions: [...c.conditions, value] });
    setCustom('');
  }

  const n = Math.abs(Number(amount)) || 0;

  return (
    <li
      className={`combatant${isActive ? ' is-active' : ''}${!c.hasSubmitted ? ' is-waiting' : ''}`}
      style={{ '--i': index } as CSSProperties}
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
          className={`iconbtn${open ? ' iconbtn--active' : ''}`}
          aria-label={`Manage ${c.name}`}
          aria-expanded={open}
          title="HP & status"
          onClick={() => setOpen((o) => !o)}
        >
          ⚙
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

      {open && (
        <div className="manage">
          {c.hp && (
            <div className="manage__hp">
              <span className="eyebrow">Adjust HP</span>
              <div className="hpadjust">
                <input
                  className="input input--num"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="HP amount"
                />
                <button type="button" className="btn btn--danger" disabled={n === 0} onClick={() => adjustHp(-n)}>
                  − Damage
                </button>
                <button type="button" className="btn btn--ghost" disabled={n === 0} onClick={() => adjustHp(n)}>
                  + Heal
                </button>
              </div>
            </div>
          )}

          <div className="manage__status">
            <span className="eyebrow">Status effects</span>
            <div className="cond-grid">
              {CONDITIONS.map((cond) => {
                const on = c.conditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    className={`cond-chip${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleCondition(cond)}
                  >
                    {cond}
                  </button>
                );
              })}
            </div>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                addCustom();
              }}
            >
              <input
                className="input"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Custom effect…"
              />
              <button type="submit" className="btn btn--ghost" disabled={!custom.trim()}>
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
