import { useEffect, useState } from 'react';
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

  // Fix #2: auto-reconnect on reload when the player has a persisted identity.
  // Only fires when name is non-empty (persisted player) and not yet joined.
  useEffect(() => {
    if (!joined && name) {
      join(roomCode, name, dex);
    }
  }, [joined, name, dex, roomCode, join]);

  if (!joined) return <JoinScreen roomCode={roomCode} />;

  const me = encounter.combatants.find((c) => c.id === myId);
  const ordered = sortOrder(encounter.combatants);

  function submit(value: number) {
    send({ type: 'submitInitiative', id: myId, initiative: value });
    setInitInput(String(value));
  }

  return (
    <main>
      <h1>Room {roomCode}</h1>

      {/* Fix #4: DM connection banner */}
      {!dmConnected && <p role="alert">Waiting for DM / reconnecting…</p>}

      <section>
        <h2>Your initiative {me?.initiative != null ? `(submitted: ${me.initiative})` : ''}</h2>
        <DiceRoller dexMod={dex} onResult={submit} />
        <input type="number" value={initInput} onChange={(e) => setInitInput(e.target.value)} placeholder="Or type a number" />
        <button type="button" disabled={initInput === ''} onClick={() => submit(Number(initInput))}>
          Submit
        </button>
      </section>

      {me && (
        <section>
          <h2>Your HP & conditions</h2>
          <input
            type="number"
            value={me.hp?.current ?? 0}
            onChange={(e) =>
              send({ type: 'updateHp', id: myId, current: Number(e.target.value), max: me.hp?.max ?? Number(e.target.value) })
            }
          />
          {' / '}
          <input
            type="number"
            value={me.hp?.max ?? 0}
            onChange={(e) =>
              send({ type: 'updateHp', id: myId, current: me.hp?.current ?? Number(e.target.value), max: Number(e.target.value) })
            }
          />
          <input
            value={me.conditions.join(', ')}
            onChange={(e) =>
              send({
                type: 'updateConditions',
                id: myId,
                conditions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="Conditions (comma-separated)"
          />
        </section>
      )}

      <section>
        <h2>Turn order</h2>
        <ol>
          {ordered.map((c) => (
            <li key={c.id} style={{ fontWeight: c.id === encounter.activeId ? 'bold' : 'normal' }}>
              {c.initiative ?? '—'} {c.name} {c.id === myId ? '(you)' : ''}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
