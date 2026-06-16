import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { EMPTY_ENCOUNTER } from '../types';
import type { Action, EncounterState } from '../types';
import { createRoom, selfId, type Room } from '../net/room';

interface PlayerStore {
  myId: string; // stable combatant id for reconnects
  name: string;
  dex: number;
  joined: boolean;
  encounter: EncounterState; // latest snapshot from DM
  room: Room | null;
  join: (roomCode: string, name: string, dex: number) => void;
  send: (action: Action) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      myId: nanoid(),
      name: '',
      dex: 0,
      joined: false,
      encounter: EMPTY_ENCOUNTER,
      room: null,
      join: (roomCode, name, dex) => {
        const room = get().room ?? createRoom(roomCode);
        room.onSnapshot((state) => set({ encounter: state }));
        const id = get().myId;
        room.sendAction({ type: 'register', id, name, dex, peerId: selfId });
        set({ room, name, dex, joined: true });
      },
      send: (action) => get().room?.sendAction(action),
    }),
    {
      name: 'player-identity',
      partialize: (s) => ({ myId: s.myId, name: s.name, dex: s.dex }),
    },
  ),
);
