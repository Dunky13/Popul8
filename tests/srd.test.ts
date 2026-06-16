import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapMonster, dexModifier } from '../src/services/srd';

test('dexModifier converts a dex score to a 5e modifier', () => {
  assert.equal(dexModifier(14), 2);
  assert.equal(dexModifier(10), 0);
  assert.equal(dexModifier(7), -2);
});

test('mapMonster extracts name, hp and dex modifier from an API stat block', () => {
  const raw = { name: 'Goblin', hit_points: 7, dexterity: 14 };
  assert.deepEqual(mapMonster(raw), { name: 'Goblin', hp: 7, dexMod: 2 });
});
