import type { Action, Combatant, EncounterState } from '../types';

function mapCombatant(
  state: EncounterState,
  id: string,
  fn: (c: Combatant) => Combatant,
): EncounterState {
  let changed = false;
  const combatants = state.combatants.map((c) => {
    if (c.id !== id) return c;
    changed = true;
    return fn(c);
  });
  return changed ? { ...state, combatants } : state;
}

export function applyAction(state: EncounterState, action: Action): EncounterState {
  switch (action.type) {
    case 'register': {
      const existing = state.combatants.find((c) => c.id === action.id);
      if (existing) {
        return mapCombatant(state, action.id, (c) => ({
          ...c,
          name: action.name,
          dex: action.dex,
          peerId: action.peerId,
        }));
      }
      const combatant: Combatant = {
        id: action.id,
        name: action.name,
        kind: 'pc',
        initiative: null,
        dex: action.dex,
        hp: null,
        conditions: [],
        peerId: action.peerId,
        hasSubmitted: false,
      };
      return { ...state, combatants: [...state.combatants, combatant] };
    }
    case 'submitInitiative':
      return mapCombatant(state, action.id, (c) => ({
        ...c,
        initiative: action.initiative,
        hasSubmitted: true,
      }));
    case 'updateHp':
      return mapCombatant(state, action.id, (c) => ({
        ...c,
        hp: { current: action.current, max: action.max },
      }));
    case 'updateConditions':
      return mapCombatant(state, action.id, (c) => ({ ...c, conditions: action.conditions }));
    case 'addCombatant':
      return { ...state, combatants: [...state.combatants, action.combatant] };
    case 'removeCombatant':
      return {
        ...state,
        combatants: state.combatants.filter((c) => c.id !== action.id),
        activeId: state.activeId === action.id ? null : state.activeId,
      };
    case 'reorder': {
      const byId = new Map(state.combatants.map((c) => [c.id, c]));
      const reordered = action.orderedIds
        .map((id) => byId.get(id))
        .filter((c): c is Combatant => c !== undefined);
      const named = new Set(action.orderedIds);
      const rest = state.combatants.filter((c) => !named.has(c.id));
      return { ...state, combatants: [...reordered, ...rest] };
    }
    case 'setActive':
      return { ...state, activeId: action.id };
    case 'setRound':
      return { ...state, round: action.round };
    case 'start':
      return { ...state, started: true };
    default: {
      void (action satisfies never);
      return state;
    }
  }
}
