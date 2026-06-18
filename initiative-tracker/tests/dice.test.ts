import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollD20, rollInitiative } from '../src/domain/dice';

test('rollD20 returns the die face from the injected rng', () => {
  assert.equal(rollD20(() => 0), 1); // rng 0 -> face 1
  assert.equal(rollD20(() => 0.999), 20); // rng ~1 -> face 20
});

test('rollInitiative adds the dex modifier', () => {
  assert.equal(rollInitiative(3, {}, () => 0.999), 23); // 20 + 3
  assert.equal(rollInitiative(-1, {}, () => 0), 0); // 1 - 1
});

test('rollInitiative with advantage takes the higher of two rolls', () => {
  // rng yields 0 (->1) then 0.999 (->20); advantage keeps 20.
  const seq = [0, 0.999];
  let i = 0;
  const rng = () => seq[i++];
  assert.equal(rollInitiative(0, { advantage: true }, rng), 20);
});
