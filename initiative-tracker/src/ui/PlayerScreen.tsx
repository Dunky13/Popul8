import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { sortOrder } from '../domain/order';
import { JoinScreen } from './JoinScreen';
import { DiceRoller } from './DiceRoller';

export function PlayerScreen({ roomCode }: { roomCode: string }) {
  const joined = usePlayerStore((s) => s.joined);
  const myId = usePlayerStore((s) => s.myId);
  const dex = usePlayerStore((s) => s.dex);
  const name = usePlayerStore((s) => s.name);
  const dmConnected = usePlayerStore((s) => s.dmConnected);
  const encounter = usePlayerStore((s) => s.encounter);
  const send = usePlayerStore((s) => s.send);
  const join = usePlayerStore((s) => s.join);
  const [initInput, setInitInput] = useState('');

  // Auto-reconnect on reload when the player has a persisted identity.
  useEffect(() => {
    if (!joined && name) {
      join(roomCode, name, dex);
    }
  }, [joined, name, dex, roomCode, join]);

  if (!joined) return <JoinScreen roomCode={roomCode} />;

  const me = encounter.combatants.find((c) => c.id === myId);
  const ordered = sortOrder(encounter.combatants);
  const submitted = me?.initiative != null;
  const active = encounter.combatants.find((c) => c.id === encounter.activeId);
  const myTurn = active != null && active.id === myId;

  function submit(value: number) {
    send({ type: 'submitInitiative', id: myId, initiative: value });
    setInitInput(String(value));
  }

  return (
    <main className="app app--player">
      <header className="appbar">
        <div className="appbar__title">
          {name || 'Adventurer'}
          <small>Player</small>
        </div>
        <div className="chip">
          <span className="chip__label">Room</span>
          <span className="chip__code">{roomCode}</span>
        </div>
      </header>

      <span className={`status${dmConnected ? '' : ' status--off'}`} role="status">
        {dmConnected ? 'Connected to DM' : 'Waiting for DM / reconnecting…'}
      </span>

      <div className={`turn-now${myTurn ? ' turn-now--you' : ''}`} role="status" aria-live="polite">
        {active ? (
          myTurn ? '⚔ Your turn!' : `${active.name}’s turn`
        ) : (
          'Encounter not started yet'
        )}
      </div>

      <section className="card hero">
        <span className="eyebrow">Your initiative</span>
        <p className={`hero__value${submitted ? '' : ' hero__value--empty'}`}>
          {submitted ? me?.initiative : 'not rolled'}
        </p>
        <DiceRoller dexMod={dex} onResult={submit} />
        <div className="inline-form">
          <input
            className="input input--num"
            type="number"
            inputMode="numeric"
            value={initInput}
            onChange={(e) => setInitInput(e.target.value)}
            placeholder="Type a number"
          />
          <button type="button" className="btn btn--ghost" disabled={initInput === ''} onClick={() => submit(Number(initInput))}>
            Submit
          </button>
        </div>
      </section>

      {me && (
        <section className="card">
          <h2 className="section-title">Hit points</h2>
          <div className="stepper">
            <label className="field" style={{ flex: 1 }}>
              <span>Current</span>
              <input
                className="input input--num"
                type="number"
                inputMode="numeric"
                value={me.hp?.current ?? 0}
                onChange={(e) =>
                  send({ type: 'updateHp', id: myId, current: Number(e.target.value), max: me.hp?.max ?? Number(e.target.value) })
                }
              />
            </label>
            <span className="stepper__sep">/</span>
            <label className="field" style={{ flex: 1 }}>
              <span>Max</span>
              <input
                className="input input--num"
                type="number"
                inputMode="numeric"
                value={me.hp?.max ?? 0}
                onChange={(e) =>
                  send({ type: 'updateHp', id: myId, current: me.hp?.current ?? Number(e.target.value), max: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <label className="field">
            <span>Conditions</span>
            <input
              className="input"
              value={me.conditions.map((c) => c.name).join(', ')}
              onChange={(e) => {
                const names = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                const byName = new Map(me.conditions.map((c) => [c.name, c]));
                send({
                  type: 'updateConditions',
                  id: myId,
                  conditions: names.map((name) => byName.get(name) ?? { name, rounds: null }),
                });
              }}
              placeholder="poisoned, prone…"
            />
          </label>
        </section>
      )}

      <section className="card">
        <h2 className="section-title">Turn order</h2>
        {ordered.length === 0 ? (
          <div className="empty"><strong>Empty</strong>Initiative hasn’t started yet.</div>
        ) : (
          <ol className="roster">
            {ordered.map((c, i) => {
              const isActive = c.id === encounter.activeId;
              const isMine = c.id === myId;
              return (
                <li
                  key={c.id}
                  className={`combatant${isActive ? ' is-active' : ''}${isMine ? ' is-mine' : ''}`}
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
                      {isMine && <span className="tag tag--you">you</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
