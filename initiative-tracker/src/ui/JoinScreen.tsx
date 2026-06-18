import { useState } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function JoinScreen({ roomCode }: { roomCode: string }) {
  const join = usePlayerStore((s) => s.join);
  const savedName = usePlayerStore((s) => s.name);
  const savedDex = usePlayerStore((s) => s.dex);
  const [name, setName] = useState(savedName);
  const [dex, setDex] = useState(savedDex);

  return (
    <main className="join">
      <form
        className="card join__card"
        onSubmit={(e) => {
          e.preventDefault();
          if (name) join(roomCode, name, dex);
        }}
      >
        <p className="join__sigil">⚔</p>
        <p className="eyebrow">Joining room {roomCode}</p>
        <h1 className="section-title" style={{ justifyContent: 'center' }}>
          Enter the fray
        </h1>

        <label className="field">
          <span>Character name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aria Brightwood"
            autoFocus
          />
        </label>

        <label className="field">
          <span>Dexterity modifier</span>
          <input
            className="input input--num"
            type="number"
            inputMode="numeric"
            value={dex}
            onChange={(e) => setDex(Number(e.target.value))}
            placeholder="0"
          />
        </label>

        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={!name}>
          Join encounter
        </button>
      </form>
    </main>
  );
}
