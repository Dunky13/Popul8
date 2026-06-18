import { useEffect } from 'react';
import { useDmStore } from '../store/dmStore';
import { RoomQr } from './RoomQr';
import { InitiativeList } from './InitiativeList';
import { TurnControls } from './TurnControls';
import { AddMonsterForm } from './AddMonsterForm';

export function DmScreen() {
  const roomCode = useDmStore((s) => s.roomCode);
  const connect = useDmStore((s) => s.connect);

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <main className="app">
      <header className="appbar">
        <div className="appbar__title">
          Initiative Tracker
          <small>Dungeon Master</small>
        </div>
        <div className="chip">
          <span className="chip__label">Room</span>
          <span className="chip__code">{roomCode}</span>
        </div>
      </header>

      <RoomQr roomCode={roomCode} />
      <InitiativeList />
      <AddMonsterForm />
      <TurnControls />
    </main>
  );
}
