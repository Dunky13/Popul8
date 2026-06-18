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
  dmConnected: boolean;
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
      dmConnected: false,
      encounter: EMPTY_ENCOUNTER,
      room: null,
      join: (roomCode, name, dex) => {
        const room = get().room ?? createRoom(roomCode);
        room.onSnapshot((state) => set({ encounter: state }));
        const id = get().myId;
        // Build once; used immediately (DM-already-present) and in onPeerJoin (DM-arrives-later).
        const register = { type: 'register' as const, id, name, dex, peerId: selfId };
        room.sendAction(register);
        // Fix #1 & #4: onPeerJoin re-registers with DM when they connect later,
        // and marks the DM as connected. Single slot — combine both into one handler.
        room.onPeerJoin(() => {
          room.sendAction(register);
          set({ dmConnected: true });
        });
        // Fix #4: onPeerLeave clears dmConnected.
        room.onPeerLeave(() => set({ dmConnected: false }));
        set({ room, name, dex, joined: true });
      },
      send: (action) => get().room?.sendAction(action),
    }),
    {
      name: 'player-identity',
      // dmConnected is intentionally excluded — it is ephemeral runtime state.
      partialize: (s) => ({ myId: s.myId, name: s.name, dex: s.dex }),
    },
  ),
);
