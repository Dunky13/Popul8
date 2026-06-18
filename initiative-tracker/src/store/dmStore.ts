import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customAlphabet } from 'nanoid';
import { EMPTY_ENCOUNTER } from '../types';
import type { ActiveCondition, Action, EncounterState } from '../types';
import { applyAction } from '../domain/reducer';
import { advanceTurn, prevTurn } from '../domain/order';
import { createRoom, type Room } from '../net/room';

const makeCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 4);

/**
 * Player-facing view of the encounter. Monster HP is the DM's secret, so it is
 * stripped before any snapshot leaves the DM — players never receive it.
 */
function redactForPlayers(state: EncounterState): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((c) =>
      c.kind === 'monster' && c.hp ? { ...c, hp: null } : c,
    ),
  };
}

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
            room.broadcast(redactForPlayers(next));
          }
        });
        room.onPeerJoin(() => room.broadcast(redactForPlayers(get().encounter)));
        set({ room });
      },
      dispatch: (action) => {
        const next = applyAction(get().encounter, action);
        set({ encounter: next });
        get().room?.broadcast(redactForPlayers(next));
      },
      next: () => {
        const next = advanceTurn(get().encounter);
        set({ encounter: next });
        get().room?.broadcast(redactForPlayers(next));
      },
      prev: () => {
        const next = prevTurn(get().encounter);
        set({ encounter: next });
        get().room?.broadcast(redactForPlayers(next));
      },
    }),
    {
      name: 'dm-encounter',
      version: 1,
      // Persist only serialisable state, never the live Room object.
      partialize: (s) => ({ roomCode: s.roomCode, encounter: s.encounter }),
      // v0 stored conditions as plain strings; v1 stores { name, rounds }.
      migrate: (persisted) => {
        const s = persisted as { roomCode: string; encounter: EncounterState };
        if (!s?.encounter) return s;
        return {
          ...s,
          encounter: {
            ...s.encounter,
            combatants: s.encounter.combatants.map((c) => ({
              ...c,
              conditions: (c.conditions as Array<string | ActiveCondition>).map((cond) =>
                typeof cond === 'string' ? { name: cond, rounds: null } : cond,
              ),
            })),
          },
        };
      },
    },
  ),
);
