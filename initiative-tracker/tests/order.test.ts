import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortOrder, advanceTurn, prevTurn } from '../src/domain/order';
import type { Combatant, EncounterState } from '../src/types';

function c(id: string, initiative: number | null, dex: number | null): Combatant {
  return { id, name: id, kind: 'pc', initiative, dex, hp: null, conditions: [], hasSubmitted: initiative !== null };
}

test('advanceTurn ticks condition durations down on round wrap, dropping expired', () => {
  const s: EncounterState = {
    combatants: [
      {
        ...c('a', 20, 0),
        conditions: [
          { name: 'Poisoned', rounds: 2 },
          { name: 'Prone', rounds: 1 },
          { name: 'Cursed', rounds: null },
        ],
      },
      c('b', 10, 0),
    ],
    round: 1,
    activeId: 'b', // last in order → next advance wraps the round
    started: true,
  };
  const next = advanceTurn(s);
  assert.equal(next.round, 2);
  assert.deepEqual(next.combatants[0].conditions, [
    { name: 'Poisoned', rounds: 1 }, // 2 → 1
    { name: 'Cursed', rounds: null }, // indefinite, unchanged; Prone (1 → 0) dropped
  ]);
});

test('advanceTurn within a round does not tick durations', () => {
  const s: EncounterState = {
    combatants: [{ ...c('a', 20, 0), conditions: [{ name: 'Poisoned', rounds: 2 }] }, c('b', 10, 0)],
    round: 1,
    activeId: 'a', // not the last → no wrap
    started: true,
  };
  const next = advanceTurn(s);
  assert.equal(next.round, 1);
  assert.deepEqual(next.combatants[0].conditions, [{ name: 'Poisoned', rounds: 2 }]);
});

test('sortOrder sorts by initiative desc', () => {
  const out = sortOrder([c('a', 10, 0), c('b', 18, 0), c('d', 14, 0)]);
  assert.deepEqual(out.map((x) => x.id), ['b', 'd', 'a']);
});

test('sortOrder breaks ties by dex modifier desc', () => {
  const out = sortOrder([c('a', 15, 1), c('b', 15, 3), c('d', 15, 2)]);
  assert.deepEqual(out.map((x) => x.id), ['b', 'd', 'a']);
});

test('sortOrder puts unrolled (null initiative) combatants last, stable', () => {
  const out = sortOrder([c('a', null, 5), c('b', 12, 0), c('d', null, 9)]);
  assert.deepEqual(out.map((x) => x.id), ['b', 'a', 'd']);
});

function state(ids: string[], activeId: string | null, round = 1): EncounterState {
  return {
    combatants: ids.map((id, i) => c(id, 20 - i, 0)),
    round,
    activeId,
    started: true,
  };
}

test('advanceTurn moves to the next combatant in sorted order', () => {
  const next = advanceTurn(state(['a', 'b', 'd'], 'a'));
  assert.equal(next.activeId, 'b');
  assert.equal(next.round, 1);
});

test('advanceTurn wraps and increments round', () => {
  const next = advanceTurn(state(['a', 'b', 'd'], 'd'));
  assert.equal(next.activeId, 'a');
  assert.equal(next.round, 2);
});

test('advanceTurn from no active selects the first', () => {
  const next = advanceTurn(state(['a', 'b', 'd'], null));
  assert.equal(next.activeId, 'a');
});

test('prevTurn wraps backward and decrements round (min 1)', () => {
  const next = prevTurn(state(['a', 'b', 'd'], 'a', 2));
  assert.equal(next.activeId, 'd');
  assert.equal(next.round, 1);
  const floored = prevTurn(state(['a', 'b', 'd'], 'a', 1));
  assert.equal(floored.round, 1);
});
