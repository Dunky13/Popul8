export type Rng = () => number; // returns [0, 1)

export function rollD20(rng: Rng = Math.random): number {
  return Math.floor(rng() * 20) + 1;
}

export interface RollOptions {
  advantage?: boolean;
}

export function rollInitiative(
  dexMod: number,
  options: RollOptions = {},
  rng: Rng = Math.random,
): number {
  const a = rollD20(rng);
  const die = options.advantage ? Math.max(a, rollD20(rng)) : a;
  return die + dexMod;
}
