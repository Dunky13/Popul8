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
    <main>
      <h1>DM — Initiative Tracker</h1>
      <RoomQr roomCode={roomCode} />
      <TurnControls />
      <InitiativeList />
      <AddMonsterForm />
    </main>
  );
}
