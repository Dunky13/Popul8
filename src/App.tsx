import { DmScreen } from './ui/DmScreen';
import { PlayerScreen } from './ui/PlayerScreen';

export function App() {
  const room = new URLSearchParams(window.location.search).get('room');
  return room ? <PlayerScreen roomCode={room} /> : <DmScreen />;
}
