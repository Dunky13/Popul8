import { AppRail } from './ui/AppRail';
import { DmScreen } from './ui/DmScreen';
import { PlayerScreen } from './ui/PlayerScreen';

export function App() {
  const room = new URLSearchParams(window.location.search).get('room');
  return (
    <>
      <AppRail current="tracker" />
      {room ? <PlayerScreen roomCode={room} /> : <DmScreen />}
    </>
  );
}
