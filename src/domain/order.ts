import type { Combatant, EncounterState } from '../types';

export function sortOrder(combatants: Combatant[]): Combatant[] {
  return combatants
    .map((c, index) => ({ c, index }))
    .sort((x, y) => {
      const xi = x.c.initiative;
      const yi = y.c.initiative;
      // Unrolled (null) sorts after any rolled value.
      if (xi === null && yi === null) return x.index - y.index;
      if (xi === null) return 1;
      if (yi === null) return -1;
      if (yi !== xi) return yi - xi;
      const dx = x.c.dex ?? 0;
      const dy = y.c.dex ?? 0;
      if (dy !== dx) return dy - dx;
      return x.index - y.index; // stable
    })
    .map((entry) => entry.c);
}

function step(state: EncounterState, direction: 1 | -1): EncounterState {
  const order = sortOrder(state.combatants);
  if (order.length === 0) return { ...state, activeId: null };
  const currentIndex = order.findIndex((c) => c.id === state.activeId);
  if (currentIndex === -1) {
    return { ...state, activeId: direction === 1 ? order[0].id : order[order.length - 1].id };
  }
  const nextIndex = currentIndex + direction;
  if (nextIndex >= order.length) {
    return { ...state, activeId: order[0].id, round: state.round + 1 };
  }
  if (nextIndex < 0) {
    return { ...state, activeId: order[order.length - 1].id, round: Math.max(1, state.round - 1) };
  }
  return { ...state, activeId: order[nextIndex].id };
}

export function advanceTurn(state: EncounterState): EncounterState {
  return step(state, 1);
}

export function prevTurn(state: EncounterState): EncounterState {
  return step(state, -1);
}
