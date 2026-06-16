export type CombatantKind = 'pc' | 'monster';

export interface Combatant {
  id: string;
  name: string;
  kind: CombatantKind;
  initiative: number | null; // null = not rolled yet
  dex: number | null; // dex modifier; used for tiebreak and rolls
  hp: { current: number; max: number } | null;
  conditions: string[];
  peerId?: string; // connected player owning this PC
  hasSubmitted: boolean;
}

export interface EncounterState {
  combatants: Combatant[];
  round: number;
  activeId: string | null; // whose turn it currently is
  started: boolean;
}

// Player -> DM actions.
export type Action =
  | { type: 'register'; id: string; name: string; dex: number; peerId: string }
  | { type: 'submitInitiative'; id: string; initiative: number }
  | { type: 'updateHp'; id: string; current: number; max: number }
  | { type: 'updateConditions'; id: string; conditions: string[] }
  // DM-local actions (not sent over the wire, but go through the same reducer):
  | { type: 'addCombatant'; combatant: Combatant }
  | { type: 'removeCombatant'; id: string }
  | { type: 'reorder'; orderedIds: string[] }
  | { type: 'setActive'; id: string | null }
  | { type: 'setRound'; round: number }
  | { type: 'start' };

export const EMPTY_ENCOUNTER: EncounterState = {
  combatants: [],
  round: 1,
  activeId: null,
  started: false,
};
