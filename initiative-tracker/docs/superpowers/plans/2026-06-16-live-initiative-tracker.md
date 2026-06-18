# Live Initiative Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static D&D 5e initiative-tracker PWA where the DM hosts an encounter and players connect peer-to-peer from their phones to submit initiative, roll dice, watch turn order, and manage their own HP/conditions.

**Architecture:** Single React app, two roles chosen by URL (`?room=CODE` = player, otherwise DM). The DM device holds the authoritative `EncounterState`; players send actions, the DM applies them via a pure reducer and broadcasts a full state snapshot over Trystero WebRTC. Pure domain logic (dice, sort, reducer, turn advance, SRD mapping) is isolated from React and networking, and is the unit-tested core.

**Tech Stack:** React 19 + Vite 8 + TypeScript 7 native (`tsgo` via `@typescript/native-preview`), oxlint, Zustand, Trystero (WebRTC), dnd5eapi.co (SRD monsters), `qrcode`, `nanoid`, pnpm. Tests via `node --test` over `tsgo`-compiled output.

---

## File Structure

```
live-tracker/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.test.json
├── .oxlintrc.json
├── .gitignore
├── src/
│   ├── main.tsx                 # React entry, mounts <App/>
│   ├── App.tsx                  # role routing by ?room=
│   ├── types.ts                 # Combatant, EncounterState, Action, messages
│   ├── domain/
│   │   ├── dice.ts              # rollD20, rollInitiative
│   │   ├── order.ts             # sortOrder, advanceTurn, prevTurn
│   │   └── reducer.ts           # applyAction (the only state mutator)
│   ├── services/
│   │   └── srd.ts               # searchMonsters, getMonster (dnd5eapi.co)
│   ├── net/
│   │   └── room.ts              # Trystero wrapper: join, onAction, sendAction, broadcast, onSnapshot
│   ├── store/
│   │   ├── dmStore.ts           # Zustand + persist; hosts EncounterState, wires net
│   │   └── playerStore.ts       # Zustand; player-side mirror + identity
│   └── ui/
│       ├── DmScreen.tsx
│       ├── PlayerScreen.tsx
│       ├── JoinScreen.tsx
│       ├── InitiativeList.tsx
│       ├── AddMonsterForm.tsx
│       ├── TurnControls.tsx
│       ├── RoomQr.tsx
│       └── DiceRoller.tsx
└── tests/
    ├── dice.test.ts
    ├── order.test.ts
    ├── reducer.test.ts
    └── srd.test.ts
```

**Responsibility boundaries:**
- `domain/*` — pure, deterministic (dice takes an injectable RNG), no React/network imports. The unit-tested core.
- `services/srd.ts` — exports a pure `mapMonster()` (tested) and an async `getMonster()` fetch wrapper (thin, not tested).
- `net/room.ts` — only transport. Knows message shapes, knows nothing about game rules.
- `store/*` — glue: holds state, calls `domain` reducer, pushes through `net`.
- `ui/*` — presentational; read from stores, dispatch actions.

---

## Task 0: Project scaffold

**Files:**
- Create: `live-tracker/package.json`, `vite.config.ts`, `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.test.json`, `.oxlintrc.json`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/ui/DmScreen.tsx`, `src/ui/PlayerScreen.tsx`

- [ ] **Step 1: Create `live-tracker/package.json`**

```json
{
  "name": "live-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsgo -p tsconfig.app.json && vite build",
    "preview": "vite preview",
    "typecheck": "tsgo -p tsconfig.app.json --noEmit",
    "lint": "oxlint",
    "test": "tsgo -p tsconfig.test.json && node -e \"require('node:fs').writeFileSync('.tmp-tests/package.json', JSON.stringify({ type: 'commonjs' }))\" && node --test .tmp-tests/tests/*.test.js"
  },
  "dependencies": {
    "nanoid": "5.1.11",
    "qrcode": "1.5.4",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "trystero": "0.25.2",
    "zustand": "5.0.9"
  },
  "devDependencies": {
    "@types/node": "24.10.1",
    "@types/qrcode": "1.5.5",
    "@types/react": "19.2.5",
    "@types/react-dom": "19.2.3",
    "@typescript/native-preview": "7.0.0-dev.20260615.1",
    "@vitejs/plugin-react": "6.0.2",
    "oxlint": "1.70.0",
    "vite": "8.0.16"
  }
}
```

- [ ] **Step 2: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Initiative Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base must match the GitHub Pages subpath; '/' is fine for local + user/org pages.
export default defineConfig({
  base: './',
  plugins: [react()],
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }]
}
```

- [ ] **Step 5: Create `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create `tsconfig.test.json`** (compiles src + tests to CommonJS for `node --test`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "outDir": ".tmp-tests",
    "rootDir": ".",
    "jsx": "react-jsx",
    "noEmit": false
  },
  "include": ["src/types.ts", "src/domain", "src/services/srd.ts", "tests"]
}
```

- [ ] **Step 7: Create `.oxlintrc.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript"],
  "categories": { "correctness": "error" },
  "ignorePatterns": ["dist", ".tmp-tests"]
}
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules
dist
.tmp-tests
*.local
.DS_Store
```

- [ ] **Step 9: Create placeholder `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 10: Create placeholder `src/App.tsx`**

```tsx
export function App() {
  return <h1>Initiative Tracker</h1>;
}
```

- [ ] **Step 11: Install dependencies**

Run: `cd live-tracker && pnpm install`
Expected: dependencies install without error. `pnpm exec tsgo --version` prints a `7.0.0-dev` version. `pnpm exec oxlint --version` prints `oxlint 1.70.0` (or compatible).

- [ ] **Step 12: Verify dev server boots**

Run: `cd live-tracker && pnpm typecheck`
Expected: no type errors.
Run: `cd live-tracker && pnpm build`
Expected: build succeeds, `dist/` produced.

- [ ] **Step 13: Commit**

```bash
git add live-tracker/package.json live-tracker/vite.config.ts live-tracker/index.html live-tracker/tsconfig*.json live-tracker/.oxlintrc.json live-tracker/.gitignore live-tracker/src live-tracker/pnpm-lock.yaml
git commit -m "chore: scaffold live-tracker vite+react+tsgo project"
```

---

## Task 1: Domain types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `cd live-tracker && pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add live-tracker/src/types.ts
git commit -m "feat: add core domain types"
```

---

## Task 2: Dice

**Files:**
- Create: `src/domain/dice.ts`
- Test: `tests/dice.test.ts`

- [ ] **Step 1: Write the failing test — `tests/dice.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd live-tracker && pnpm test`
Expected: FAIL — cannot find module `../src/domain/dice`.

- [ ] **Step 3: Implement `src/domain/dice.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd live-tracker && pnpm test`
Expected: PASS (dice tests).

- [ ] **Step 5: Commit**

```bash
git add live-tracker/src/domain/dice.ts live-tracker/tests/dice.test.ts
git commit -m "feat: add dice rolling with injectable rng"
```

---

## Task 3: Initiative order & turn advancement

**Files:**
- Create: `src/domain/order.ts`
- Test: `tests/order.test.ts`

- [ ] **Step 1: Write the failing test — `tests/order.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortOrder, advanceTurn, prevTurn } from '../src/domain/order';
import type { Combatant, EncounterState } from '../src/types';

function c(id: string, initiative: number | null, dex: number | null): Combatant {
  return { id, name: id, kind: 'pc', initiative, dex, hp: null, conditions: [], hasSubmitted: initiative !== null };
}

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd live-tracker && pnpm test`
Expected: FAIL — cannot find module `../src/domain/order`.

- [ ] **Step 3: Implement `src/domain/order.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd live-tracker && pnpm test`
Expected: PASS (order tests).

- [ ] **Step 5: Commit**

```bash
git add live-tracker/src/domain/order.ts live-tracker/tests/order.test.ts
git commit -m "feat: add initiative sort and turn advancement"
```

---

## Task 4: State reducer

**Files:**
- Create: `src/domain/reducer.ts`
- Test: `tests/reducer.test.ts`

- [ ] **Step 1: Write the failing test — `tests/reducer.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd live-tracker && pnpm test`
Expected: FAIL — cannot find module `../src/domain/reducer`.

- [ ] **Step 3: Implement `src/domain/reducer.ts`**

```ts
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
      // Append any combatants not named in orderedIds, preserving their order.
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
      const _exhaustive: never = action;
      return state;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd live-tracker && pnpm test`
Expected: PASS (reducer tests).

- [ ] **Step 5: Commit**

```bash
git add live-tracker/src/domain/reducer.ts live-tracker/tests/reducer.test.ts
git commit -m "feat: add encounter state reducer"
```

---

## Task 5: SRD monster lookup

**Files:**
- Create: `src/services/srd.ts`
- Test: `tests/srd.test.ts`

- [ ] **Step 1: Write the failing test — `tests/srd.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd live-tracker && pnpm test`
Expected: FAIL — cannot find module `../src/services/srd`.

- [ ] **Step 3: Implement `src/services/srd.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd live-tracker && pnpm test`
Expected: PASS (srd tests).

- [ ] **Step 5: Commit**

```bash
git add live-tracker/src/services/srd.ts live-tracker/tests/srd.test.ts
git commit -m "feat: add SRD monster lookup service"
```

---

## Task 6: Trystero networking wrapper

**Files:**
- Create: `src/net/room.ts`

No unit test (transport layer; verified through manual two-window testing in Task 11).

- [ ] **Step 1: Implement `src/net/room.ts`**

```ts
import { joinRoom } from 'trystero';
import type { Action, EncounterState } from '../types';

const APP_ID = 'dnd5e-live-initiative-tracker';

export interface Room {
  /** Listen for actions sent by players (DM side). */
  onAction(handler: (action: Action, peerId: string) => void): void;
  /** Send an action to the DM (player side). */
  sendAction(action: Action): void;
  /** Broadcast the full encounter snapshot to all peers (DM side). */
  broadcast(state: EncounterState): void;
  /** Listen for snapshots from the DM (player side). */
  onSnapshot(handler: (state: EncounterState) => void): void;
  /** Notified when a peer joins (DM re-broadcasts to sync late joiners). */
  onPeerJoin(handler: (peerId: string) => void): void;
  /** Notified when a peer leaves. */
  onPeerLeave(handler: (peerId: string) => void): void;
  leave(): void;
}

export function createRoom(roomCode: string): Room {
  const room = joinRoom({ appId: APP_ID }, roomCode);
  const [sendActionRaw, getActionRaw] = room.makeAction<Action>('action');
  const [sendSnapshotRaw, getSnapshotRaw] = room.makeAction<EncounterState>('snapshot');

  return {
    onAction(handler) {
      getActionRaw((action, peerId) => handler(action, peerId));
    },
    sendAction(action) {
      void sendActionRaw(action);
    },
    broadcast(state) {
      void sendSnapshotRaw(state);
    },
    onSnapshot(handler) {
      getSnapshotRaw((state) => handler(state));
    },
    onPeerJoin(handler) {
      room.onPeerJoin(handler);
    },
    onPeerLeave(handler) {
      room.onPeerLeave(handler);
    },
    leave() {
      room.leave();
    },
  };
}

/** Trystero peerId for this client (stable for the room session). */
export { selfId } from 'trystero';
```

- [ ] **Step 2: Type-check**

Run: `cd live-tracker && pnpm typecheck`
Expected: no errors. (If Trystero's `makeAction`/`onPeerJoin` signatures differ from the above, adjust the wrapper to match its exported types — the wrapper is the only place that touches Trystero's API.)

- [ ] **Step 3: Commit**

```bash
git add live-tracker/src/net/room.ts
git commit -m "feat: add trystero room transport wrapper"
```

---

## Task 7: DM store

**Files:**
- Create: `src/store/dmStore.ts`

- [ ] **Step 1: Implement `src/store/dmStore.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customAlphabet } from 'nanoid';
import { EMPTY_ENCOUNTER } from '../types';
import type { Action, EncounterState } from '../types';
import { applyAction } from '../domain/reducer';
import { advanceTurn, prevTurn } from '../domain/order';
import { createRoom, type Room } from '../net/room';

const makeCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 4);

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
            room.broadcast(next);
          }
        });
        room.onPeerJoin(() => room.broadcast(get().encounter));
        set({ room });
      },
      dispatch: (action) => {
        const next = applyAction(get().encounter, action);
        set({ encounter: next });
        get().room?.broadcast(next);
      },
      next: () => {
        const next = advanceTurn(get().encounter);
        set({ encounter: next });
        get().room?.broadcast(next);
      },
      prev: () => {
        const next = prevTurn(get().encounter);
        set({ encounter: next });
        get().room?.broadcast(next);
      },
    }),
    {
      name: 'dm-encounter',
      // Persist only serialisable state, never the live Room object.
      partialize: (s) => ({ roomCode: s.roomCode, encounter: s.encounter }),
    },
  ),
);
```

- [ ] **Step 2: Type-check**

Run: `cd live-tracker && pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add live-tracker/src/store/dmStore.ts
git commit -m "feat: add DM store with persistence and net wiring"
```

---

## Task 8: Player store

**Files:**
- Create: `src/store/playerStore.ts`

- [ ] **Step 1: Implement `src/store/playerStore.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { EMPTY_ENCOUNTER } from '../types';
import type { Action, EncounterState } from '../types';
import { createRoom, selfId, type Room } from '../net/room';

interface PlayerStore {
  myId: string; // stable combatant id for reconnects
  name: string;
  dex: number;
  joined: boolean;
  encounter: EncounterState; // latest snapshot from DM
  room: Room | null;
  join: (roomCode: string, name: string, dex: number) => void;
  send: (action: Action) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      myId: nanoid(),
      name: '',
      dex: 0,
      joined: false,
      encounter: EMPTY_ENCOUNTER,
      room: null,
      join: (roomCode, name, dex) => {
        const room = get().room ?? createRoom(roomCode);
        room.onSnapshot((state) => set({ encounter: state }));
        const id = get().myId;
        room.sendAction({ type: 'register', id, name, dex, peerId: selfId });
        set({ room, name, dex, joined: true });
      },
      send: (action) => get().room?.sendAction(action),
    }),
    {
      name: 'player-identity',
      partialize: (s) => ({ myId: s.myId, name: s.name, dex: s.dex }),
    },
  ),
);
```

- [ ] **Step 2: Type-check**

Run: `cd live-tracker && pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add live-tracker/src/store/playerStore.ts
git commit -m "feat: add player store with stable identity"
```

---

## Task 9: DM UI

**Files:**
- Create: `src/ui/RoomQr.tsx`, `src/ui/InitiativeList.tsx`, `src/ui/TurnControls.tsx`, `src/ui/AddMonsterForm.tsx`, `src/ui/DmScreen.tsx`

- [ ] **Step 1: Implement `src/ui/RoomQr.tsx`**

```tsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function RoomQr({ roomCode }: { roomCode: string }) {
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { width: 192 }).then(setDataUrl).catch(() => setDataUrl(''));
  }, [joinUrl]);

  return (
    <div>
      <h2>Room {roomCode}</h2>
      {dataUrl && <img src={dataUrl} alt={`Join QR for room ${roomCode}`} width={192} height={192} />}
      <p><a href={joinUrl}>{joinUrl}</a></p>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/ui/TurnControls.tsx`**

```tsx
import { useDmStore } from '../store/dmStore';

export function TurnControls() {
  const round = useDmStore((s) => s.encounter.round);
  const next = useDmStore((s) => s.next);
  const prev = useDmStore((s) => s.prev);

  return (
    <div>
      <span>Round {round}</span>
      <button type="button" onClick={prev}>Prev</button>
      <button type="button" onClick={next}>Next</button>
    </div>
  );
}
```

- [ ] **Step 3: Implement `src/ui/InitiativeList.tsx`**

```tsx
import { useDmStore } from '../store/dmStore';
import { sortOrder } from '../domain/order';

export function InitiativeList() {
  const encounter = useDmStore((s) => s.encounter);
  const dispatch = useDmStore((s) => s.dispatch);
  const ordered = sortOrder(encounter.combatants);

  return (
    <ol>
      {ordered.map((c) => (
        <li
          key={c.id}
          style={{ fontWeight: c.id === encounter.activeId ? 'bold' : 'normal' }}
        >
          <span>{c.initiative ?? '—'}</span>{' '}
          <span>{c.name}</span>{' '}
          {c.hp && <span>HP {c.hp.current}/{c.hp.max}</span>}{' '}
          {c.conditions.length > 0 && <span>[{c.conditions.join(', ')}]</span>}{' '}
          {!c.hasSubmitted && <em>waiting…</em>}{' '}
          <button type="button" onClick={() => dispatch({ type: 'setActive', id: c.id })}>
            Set active
          </button>{' '}
          <button type="button" onClick={() => dispatch({ type: 'removeCombatant', id: c.id })}>
            Remove
          </button>
        </li>
      ))}
    </ol>
  );
}
```

> NOTE: drag-to-reorder is deferred to a polish task. The `reorder` action and the
> `setActive` override above cover manual tie-breaking for v1 without a DnD library.

- [ ] **Step 4: Implement `src/ui/AddMonsterForm.tsx`**

```tsx
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useDmStore } from '../store/dmStore';
import { searchMonsters, getMonster, type MonsterRef } from '../services/srd';
import { rollInitiative } from '../domain/dice';
import type { Combatant } from '../types';

export function AddMonsterForm() {
  const dispatch = useDmStore((s) => s.dispatch);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MonsterRef[]>([]);
  const [error, setError] = useState('');

  async function search() {
    setError('');
    try {
      setResults(await searchMonsters(query));
    } catch {
      setError('SRD lookup unavailable — add the monster manually.');
    }
  }

  function add(name: string, hp: number, dexMod: number) {
    const combatant: Combatant = {
      id: nanoid(),
      name,
      kind: 'monster',
      initiative: rollInitiative(dexMod),
      dex: dexMod,
      hp: { current: hp, max: hp },
      conditions: [],
      hasSubmitted: true,
    };
    dispatch({ type: 'addCombatant', combatant });
  }

  async function addFromSrd(ref: MonsterRef) {
    try {
      const stats = await getMonster(ref.index);
      add(stats.name, stats.hp, stats.dexMod);
    } catch {
      setError('Could not load that monster — add it manually.');
    }
  }

  return (
    <div>
      <h3>Add monster</h3>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search SRD (e.g. goblin)" />
      <button type="button" onClick={search}>Search</button>
      {error && <p role="alert">{error}</p>}
      <ul>
        {results.map((r) => (
          <li key={r.index}>
            {r.name} <button type="button" onClick={() => addFromSrd(r)}>Add</button>
          </li>
        ))}
      </ul>
      <ManualMonster onAdd={add} />
    </div>
  );
}

function ManualMonster({ onAdd }: { onAdd: (name: string, hp: number, dexMod: number) => void }) {
  const [name, setName] = useState('');
  const [hp, setHp] = useState(10);
  const [dexMod, setDexMod] = useState(0);
  return (
    <div>
      <h4>Manual</h4>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input type="number" value={hp} onChange={(e) => setHp(Number(e.target.value))} placeholder="HP" />
      <input type="number" value={dexMod} onChange={(e) => setDexMod(Number(e.target.value))} placeholder="Dex mod" />
      <button type="button" disabled={!name} onClick={() => { onAdd(name, hp, dexMod); setName(''); }}>
        Add (auto-roll init)
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Implement `src/ui/DmScreen.tsx`**

```tsx
import { useEffect } from 'react';
import { useDmStore } from '../store/dmStore';
import { RoomQr } from './RoomQr';
import { InitiativeList } from './InitiativeList';
import { TurnControls } from './TurnControls';
import { AddMonsterForm } from './AddMonsterForm';

export function DmScreen() {
  const roomCode = useDmStore((s) => s.roomCode);
  const connect = useDmStore((s) => s.connect);

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <main>
      <h1>DM — Initiative Tracker</h1>
      <RoomQr roomCode={roomCode} />
      <TurnControls />
      <InitiativeList />
      <AddMonsterForm />
    </main>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `cd live-tracker && pnpm typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add live-tracker/src/ui/RoomQr.tsx live-tracker/src/ui/InitiativeList.tsx live-tracker/src/ui/TurnControls.tsx live-tracker/src/ui/AddMonsterForm.tsx live-tracker/src/ui/DmScreen.tsx
git commit -m "feat: add DM screen UI"
```

---

## Task 10: Player UI

**Files:**
- Create: `src/ui/DiceRoller.tsx`, `src/ui/JoinScreen.tsx`, `src/ui/PlayerScreen.tsx`

- [ ] **Step 1: Implement `src/ui/DiceRoller.tsx`**

```tsx
import { useState } from 'react';
import { rollInitiative } from '../domain/dice';

export function DiceRoller({ dexMod, onResult }: { dexMod: number; onResult: (value: number) => void }) {
  const [advantage, setAdvantage] = useState(false);
  const [last, setLast] = useState<number | null>(null);

  function roll() {
    const value = rollInitiative(dexMod, { advantage });
    setLast(value);
    onResult(value);
  }

  return (
    <div>
      <label>
        <input type="checkbox" checked={advantage} onChange={(e) => setAdvantage(e.target.checked)} />
        Advantage
      </label>
      <button type="button" onClick={roll}>Roll d20 {dexMod >= 0 ? `+${dexMod}` : dexMod}</button>
      {last !== null && <span> Rolled: {last}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/ui/JoinScreen.tsx`**

```tsx
import { useState } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function JoinScreen({ roomCode }: { roomCode: string }) {
  const join = usePlayerStore((s) => s.join);
  const savedName = usePlayerStore((s) => s.name);
  const savedDex = usePlayerStore((s) => s.dex);
  const [name, setName] = useState(savedName);
  const [dex, setDex] = useState(savedDex);

  return (
    <main>
      <h1>Join room {roomCode}</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" />
      <input type="number" value={dex} onChange={(e) => setDex(Number(e.target.value))} placeholder="Dex modifier" />
      <button type="button" disabled={!name} onClick={() => join(roomCode, name, dex)}>
        Join
      </button>
    </main>
  );
}
```

- [ ] **Step 3: Implement `src/ui/PlayerScreen.tsx`**

```tsx
import { useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { sortOrder } from '../domain/order';
import { JoinScreen } from './JoinScreen';
import { DiceRoller } from './DiceRoller';

export function PlayerScreen({ roomCode }: { roomCode: string }) {
  const joined = usePlayerStore((s) => s.joined);
  const myId = usePlayerStore((s) => s.myId);
  const dex = usePlayerStore((s) => s.dex);
  const encounter = usePlayerStore((s) => s.encounter);
  const send = usePlayerStore((s) => s.send);
  const [initInput, setInitInput] = useState('');

  if (!joined) return <JoinScreen roomCode={roomCode} />;

  const me = encounter.combatants.find((c) => c.id === myId);
  const ordered = sortOrder(encounter.combatants);

  function submit(value: number) {
    send({ type: 'submitInitiative', id: myId, initiative: value });
    setInitInput(String(value));
  }

  return (
    <main>
      <h1>Room {roomCode}</h1>
      <section>
        <h2>Your initiative {me?.initiative != null ? `(submitted: ${me.initiative})` : ''}</h2>
        <DiceRoller dexMod={dex} onResult={submit} />
        <input type="number" value={initInput} onChange={(e) => setInitInput(e.target.value)} placeholder="Or type a number" />
        <button type="button" disabled={initInput === ''} onClick={() => submit(Number(initInput))}>
          Submit
        </button>
      </section>

      {me && (
        <section>
          <h2>Your HP & conditions</h2>
          <input
            type="number"
            value={me.hp?.current ?? 0}
            onChange={(e) =>
              send({ type: 'updateHp', id: myId, current: Number(e.target.value), max: me.hp?.max ?? Number(e.target.value) })
            }
          />
          {' / '}
          <input
            type="number"
            value={me.hp?.max ?? 0}
            onChange={(e) =>
              send({ type: 'updateHp', id: myId, current: me.hp?.current ?? Number(e.target.value), max: Number(e.target.value) })
            }
          />
          <input
            value={me.conditions.join(', ')}
            onChange={(e) =>
              send({
                type: 'updateConditions',
                id: myId,
                conditions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="Conditions (comma-separated)"
          />
        </section>
      )}

      <section>
        <h2>Turn order</h2>
        <ol>
          {ordered.map((c) => (
            <li key={c.id} style={{ fontWeight: c.id === encounter.activeId ? 'bold' : 'normal' }}>
              {c.initiative ?? '—'} {c.name} {c.id === myId ? '(you)' : ''}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `cd live-tracker && pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add live-tracker/src/ui/DiceRoller.tsx live-tracker/src/ui/JoinScreen.tsx live-tracker/src/ui/PlayerScreen.tsx
git commit -m "feat: add player screen UI"
```

---

## Task 11: Role routing & end-to-end manual verification

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx` with role routing**

```tsx
import { DmScreen } from './ui/DmScreen';
import { PlayerScreen } from './ui/PlayerScreen';

export function App() {
  const room = new URLSearchParams(window.location.search).get('room');
  return room ? <PlayerScreen roomCode={room} /> : <DmScreen />;
}
```

- [ ] **Step 2: Type-check, lint, build**

Run: `cd live-tracker && pnpm typecheck && pnpm lint && pnpm build`
Expected: all succeed.

- [ ] **Step 3: Manual two-window verification**

Run: `cd live-tracker && pnpm dev`
Then:
1. Open the dev URL (DM screen). Note the room code, e.g. `K7QF`.
2. Open a second browser window at `<dev-url>?room=K7QF` (player). Use a real second device/phone on the same internet if possible.
3. Player: enter a name + dex mod, Join. Confirm the PC appears in the DM's list with "waiting…".
4. Player: roll initiative (and try advantage), Submit. Confirm the value appears on the DM list and "waiting…" clears.
5. DM: search SRD for "goblin", Add. Confirm it appears with auto-rolled initiative and HP 7.
6. DM: press Next/Prev. Confirm the active highlight moves and round increments on wrap, mirrored on the player screen.
7. Player: change HP/conditions. Confirm they appear on the DM list.
8. Reload the DM window. Confirm the room code + encounter restore and the player reconnects without duplicating.

Expected: all eight checks pass. Record any failures and fix before committing.

- [ ] **Step 4: Commit**

```bash
git add live-tracker/src/App.tsx
git commit -m "feat: route DM vs player by room query param"
```

---

## Task 12: GitHub Pages deploy

**Files:**
- Create: `.github/workflows/deploy-live-tracker.yml`

- [ ] **Step 1: Confirm `vite.config.ts` base**

The `base: './'` set in Task 0 produces relative asset paths that work under any
GitHub Pages subpath. No change needed unless deploying to a known fixed subpath.

- [ ] **Step 2: Create `.github/workflows/deploy-live-tracker.yml`**

```yaml
name: Deploy live-tracker
on:
  push:
    branches: [main]
    paths: ['live-tracker/**', '.github/workflows/deploy-live-tracker.yml']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages-live-tracker
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: live-tracker
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: live-tracker/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: live-tracker/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-live-tracker.yml
git commit -m "ci: deploy live-tracker to github pages"
```

> NOTE: enabling Pages (Settings → Pages → Source: GitHub Actions) is a one-time repo
> setting the maintainer does in the GitHub UI; it cannot be scripted here.

---

## Self-Review Notes

- **Spec coverage:** roles/entry (Task 11), networking (Task 6), data model (Task 1), dice (Task 2), sort + Dex-mod tiebreak (Task 3), reducer/actions (Task 4), turn advance + round (Task 3), SRD lookup + auto-roll (Tasks 5, 9), DM UI incl. add-monster + QR + turn controls + waiting indicator (Task 9), player UI incl. join/roll/HP/conditions/order mirror (Task 10), reconnection/persistence (Tasks 7, 8, verified Task 11 step 3.8), error handling (SRD fallback Task 9, missing-DM = empty snapshot shown), testing (Tasks 2–5), deploy (Task 12). Drag-to-reorder from the spec is intentionally reduced to `reorder` action + `setActive` override for v1 (noted in Task 9).
- **Type consistency:** `Action` union (Task 1) matches the reducer cases (Task 4), the DM action filter (Task 7), and player `send` calls (Task 10). `dex` is the modifier everywhere; `mapMonster`→`dexMod` feeds `addCombatant` (Task 9). `Room` interface (Task 6) matches store usage (Tasks 7, 8).
- **Placeholders:** none — every code step is complete.
