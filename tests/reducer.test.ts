import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction } from '../src/domain/reducer';
import { EMPTY_ENCOUNTER } from '../src/types';
import type { Combatant, EncounterState } from '../src/types';

function monster(id: string): Combatant {
  return { id, name: id, kind: 'monster', initiative: 12, dex: 1, hp: { current: 7, max: 7 }, conditions: [], hasSubmitted: true };
}

test('register adds a new PC combatant', () => {
  const s = applyAction(EMPTY_ENCOUNTER, { type: 'register', id: 'p1', name: 'Aria', dex: 2, peerId: 'peerA' });
  assert.equal(s.combatants.length, 1);
  assert.deepEqual(
    { ...s.combatants[0] },
    { id: 'p1', name: 'Aria', kind: 'pc', initiative: null, dex: 2, hp: null, conditions: [], peerId: 'peerA', hasSubmitted: false },
  );
});

test('register with an existing id rebinds peerId without duplicating (reconnect)', () => {
  let s: EncounterState = applyAction(EMPTY_ENCOUNTER, { type: 'register', id: 'p1', name: 'Aria', dex: 2, peerId: 'old' });
  s = applyAction(s, { type: 'submitInitiative', id: 'p1', initiative: 17 });
  s = applyAction(s, { type: 'register', id: 'p1', name: 'Aria', dex: 2, peerId: 'new' });
  assert.equal(s.combatants.length, 1);
  assert.equal(s.combatants[0].peerId, 'new');
  assert.equal(s.combatants[0].initiative, 17, 'keeps prior initiative on reconnect');
});

test('submitInitiative sets initiative and marks submitted', () => {
  let s = applyAction(EMPTY_ENCOUNTER, { type: 'register', id: 'p1', name: 'Aria', dex: 2, peerId: 'peerA' });
  s = applyAction(s, { type: 'submitInitiative', id: 'p1', initiative: 19 });
  assert.equal(s.combatants[0].initiative, 19);
  assert.equal(s.combatants[0].hasSubmitted, true);
});

test('updateHp and updateConditions mutate only the target', () => {
  let s = applyAction(EMPTY_ENCOUNTER, { type: 'addCombatant', combatant: monster('m1') });
  s = applyAction(s, { type: 'updateHp', id: 'm1', current: 3, max: 7 });
  s = applyAction(s, { type: 'updateConditions', id: 'm1', conditions: ['prone'] });
  assert.deepEqual(s.combatants[0].hp, { current: 3, max: 7 });
  assert.deepEqual(s.combatants[0].conditions, ['prone']);
});

test('removeCombatant clears activeId when removing the active combatant', () => {
  let s = applyAction(EMPTY_ENCOUNTER, { type: 'addCombatant', combatant: monster('m1') });
  s = applyAction(s, { type: 'setActive', id: 'm1' });
  s = applyAction(s, { type: 'removeCombatant', id: 'm1' });
  assert.equal(s.combatants.length, 0);
  assert.equal(s.activeId, null);
});

test('reorder applies an explicit manual order', () => {
  let s = applyAction(EMPTY_ENCOUNTER, { type: 'addCombatant', combatant: monster('m1') });
  s = applyAction(s, { type: 'addCombatant', combatant: monster('m2') });
  s = applyAction(s, { type: 'reorder', orderedIds: ['m2', 'm1'] });
  assert.deepEqual(s.combatants.map((c) => c.id), ['m2', 'm1']);
});

test('actions targeting an unknown id are a no-op', () => {
  const s = applyAction(EMPTY_ENCOUNTER, { type: 'submitInitiative', id: 'ghost', initiative: 5 });
  assert.deepEqual(s, EMPTY_ENCOUNTER);
});
