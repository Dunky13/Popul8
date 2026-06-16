const BASE = 'https://www.dnd5eapi.co/api/2014';

export function dexModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export interface SrdStatBlock {
  name: string;
  hit_points: number;
  dexterity: number;
}

export interface MonsterStats {
  name: string;
  hp: number;
  dexMod: number;
}

export function mapMonster(raw: SrdStatBlock): MonsterStats {
  return { name: raw.name, hp: raw.hit_points, dexMod: dexModifier(raw.dexterity) };
}

export interface MonsterRef {
  index: string;
  name: string;
}

let indexCache: MonsterRef[] | null = null;

// Fetches the full SRD monster index once, then filters client-side.
export async function searchMonsters(query: string): Promise<MonsterRef[]> {
  if (!indexCache) {
    const res = await fetch(`${BASE}/monsters`);
    if (!res.ok) throw new Error(`SRD index failed: ${res.status}`);
    const data = (await res.json()) as { results: MonsterRef[] };
    indexCache = data.results;
  }
  const q = query.trim().toLowerCase();
  if (!q) return indexCache.slice(0, 20);
  return indexCache.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 20);
}

export async function getMonster(index: string): Promise<MonsterStats> {
  const res = await fetch(`${BASE}/monsters/${index}`);
  if (!res.ok) throw new Error(`SRD monster failed: ${res.status}`);
  return mapMonster((await res.json()) as SrdStatBlock);
}
