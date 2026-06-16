import { useState } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function JoinScreen({ roomCode }: { roomCode: string }) {
  const join = usePlayerStore((s) => s.join);
  const savedName = usePlayerStore((s) => s.name);
  const savedDex = usePlayerStore((s) => s.dex);
  const [name, setName] = useState(savedName);
  const [dex, setDex] = useState(savedDex);

  return (
    <main>
      <h1>Join room {roomCode}</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" />
      <input type="number" value={dex} onChange={(e) => setDex(Number(e.target.value))} placeholder="Dex modifier" />
      <button type="button" disabled={!name} onClick={() => join(roomCode, name, dex)}>
        Join
      </button>
    </main>
  );
}
