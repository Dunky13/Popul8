import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customAlphabet } from 'nanoid';
import { EMPTY_ENCOUNTER } from '../types';
import type { Action, EncounterState } from '../types';
import { applyAction } from '../domain/reducer';
import { advanceTurn, prevTurn } from '../domain/order';
import { createRoom, type Room } from '../net/room';

const makeCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 4);

interface DmStore {
  roomCode: string;
  encounter: EncounterState;
  room: Room | null;
  connect: () => void;
  dispatch: (action: Action) => void; // apply locally + broadcast
  next: () => void;
  prev: () => void;
}

export const useDmStore = create<DmStore>()(
  persist(
    (set, get) => ({
      roomCode: makeCode(),
      encounter: EMPTY_ENCOUNTER,
      room: null,
      connect: () => {
        if (get().room) return;
        const room = createRoom(get().roomCode);
        room.onAction((action) => {
          // Players may only send player-scoped actions; ignore anything else.
          if (
            action.type === 'register' ||
            action.type === 'submitInitiative' ||
            action.type === 'updateHp' ||
            action.type === 'updateConditions'
          ) {
            const next = applyAction(get().encounter, action);
            set({ encounter: next });
            room.broadcast(next);
          }
        });
        room.onPeerJoin(() => room.broadcast(get().encounter));
        set({ room });
      },
      dispatch: (action) => {
        const next = applyAction(get().encounter, action);
        set({ encounter: next });
        get().room?.broadcast(next);
      },
      next: () => {
        const next = advanceTurn(get().encounter);
        set({ encounter: next });
        get().room?.broadcast(next);
      },
      prev: () => {
        const next = prevTurn(get().encounter);
        set({ encounter: next });
        get().room?.broadcast(next);
      },
    }),
    {
      name: 'dm-encounter',
      // Persist only serialisable state, never the live Room object.
      partialize: (s) => ({ roomCode: s.roomCode, encounter: s.encounter }),
    },
  ),
);
