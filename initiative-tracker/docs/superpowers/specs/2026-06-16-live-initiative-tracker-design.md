# D&D 5e Live Initiative Tracker — Design

Date: 2026-06-16
Status: Approved

## Purpose

A web app for running D&D 5e combat initiative. The DM runs the tracker; players
connect from their phones during the session to submit their initiative, roll dice,
watch the live turn order, and manage their own HP and conditions. No backend server
or hosting cost — the app stays a static PWA deployed to GitHub Pages, with players
connecting peer-to-peer.

## Roles & Entry

Single React app, two roles selected by URL:

- No `?room=` query param → **DM / host** flow.
- `?room=CODE` → **player / join** flow.

The DM device holds the authoritative `EncounterState`. Players send *actions*; the DM
applies them and broadcasts a state *snapshot* to all peers. Players render only from
the DM's snapshot — they never trust each other.

## Tech Stack

- **Framework:** React 19 + Vite, TypeScript.
- **TypeScript:** version 7 beta, type-checked with the native `tsgo` compiler (not `tsc`).
- **Linting:** `oxlint` (not ESLint).
- **State:** Zustand (with `persist` for the DM store).
- **Realtime:** [Trystero](https://github.com/dmotz/trystero) — room-based WebRTC that
  bootstraps via public trackers, so there is no signaling server to run or pay for.
- **Monster data:** [dnd5eapi.co](https://www.dnd5eapi.co) SRD 5.1 API (CORS `*`,
  client-side fetch, no backend, no key). SRD content only — legally safe, ~330 monsters.
- **Deploy:** static build to GitHub Pages (matching sibling projects).
- **Package manager:** pnpm.

These tooling choices (TS 7 beta / `tsgo` / `oxlint`) intentionally differ from the
sibling `character-sheet-generator` project, which uses `tsc` + ESLint.

## Networking (`src/net/`)

A thin Trystero wrapper. Room ID is a short human-typeable code (e.g. `K7QF`). Two
logical message channels:

- **action** (player → DM): `register`, `submitInitiative`, `updateHP`, `updateConditions`.
- **snapshot** (DM → all): the full `EncounterState`.

The DM is the only peer that mutates state. Peer-to-peer chatter between players is
ignored. Whenever a new peer joins, the DM re-sends the current snapshot so late joiners
sync immediately.

## Data Model (`src/types/`)

```ts
type Combatant = {
  id: string;
  name: string;
  kind: 'pc' | 'monster';
  initiative: number | null;   // null = not rolled yet
  dex: number | null;          // dex modifier, used for tiebreak and rolls
  hp: { current: number; max: number } | null;
  conditions: string[];
  peerId?: string;             // connected player owning this PC
  hasSubmitted: boolean;
};

type EncounterState = {
  combatants: Combatant[];
  round: number;
  activeId: string | null;     // whose turn it currently is
  started: boolean;
};
```

## Core Logic (pure, unit-tested)

- `sortOrder(combatants)` → sorts by initiative descending, **Dexterity modifier descending
  as tiebreak**, stable fallback for full ties.
- `rollInitiative(dexMod, { advantage? })` → d20 + modifier.
- `applyAction(state, action)` → reducer; the single place where state mutates. Testable
  with no network involved.
- `advanceTurn(state)` / `prevTurn(state)` → moves `activeId` along the sorted order;
  bumps `round` on wrap-around.

## UI

**DM screen:**
- Room code + QR for players to join.
- Auto-sorted initiative list with per-row HP, conditions, and active-turn highlight.
- Drag-to-reorder for manual override of ties.
- Add-Monster form with **SRD search**: type a monster name, pick from dnd5eapi.co
  results, autofills HP and dex modifier (derived from the API's dex score:
  `floor((score - 10) / 2)`). On add, initiative is **auto-rolled** (`d20 + dex mod`).
  All fields remain manually editable, and manual-only entry works when offline or for
  non-SRD monsters. Adding the same monster repeatedly creates distinct instances
  (Goblin 1, Goblin 2), each with its own auto-rolled initiative and HP.
- Next / Prev turn controls and a round counter.
- "Waiting on N players" indicator (PCs that have not yet submitted initiative).

**Player screen:**
- Join: type character name + dex modifier.
- Submit initiative: in-app d20 roller (with advantage) or type a number directly.
- Live read-only turn order, highlighting the player's own turn.
- Own HP and conditions editor, synced to the DM.

## SRD Monster Lookup (`src/services/srd.ts`)

Thin wrapper over dnd5eapi.co:

- `searchMonsters(query)` → name + index list (the API exposes a full monster index;
  filter client-side, or hit `/api/2014/monsters?name=`).
- `getMonster(index)` → fetches the stat block; maps to `{ name, hp: hit_points,
  dexMod: floor((dexterity - 10) / 2) }`.

Failures (network down, monster not found) fall back to manual entry — never block the
DM. Results may be cached in memory for the session.

## Identity, Reconnection & Persistence

- Players **self-register** by typing their character name on joining; the DM
  separately **adds monsters/NPCs** (DM sets their initiative and dex modifier).
- DM store is persisted to localStorage (state + room code) via Zustand `persist`.
  On reload, the DM rejoins the same room and restores state; players auto-reconnect.
- Player stores its claimed combatant `id` + name locally. On reconnect it re-`register`s
  with the same id, so the DM rebinds `peerId` rather than creating a duplicate combatant.
- Connection-lost banner shown on dropout; Trystero auto-retries the connection.

## Error Handling

- Player joins a room with no DM present → "waiting for DM" state.
- Duplicate character names allowed; combatants are keyed by `id`, not name.
- Lost connection → reconnect banner; state re-syncs from the next DM snapshot.
- SRD API unreachable or monster not found → silent fallback to manual monster entry.

## Testing

`node --test` plus a `tsgo` type-check (mirroring the sibling project's test script, but
using `tsgo` instead of `tsc`). Coverage focuses on the pure logic: `sortOrder`,
`rollInitiative`, `applyAction`, and turn advancement. The networking and UI layers are
kept thin and are not unit-tested.

## Out of Scope (v1)

- Player-to-player visibility of each other's HP/conditions (only the DM aggregates).
- Persisting encounters across sessions beyond the DM's own localStorage.
- Non-SRD monster content (Monster Manual / homebrew) beyond manual entry.
- Full stat blocks (attacks, abilities) — lookup pulls HP and dex modifier only.
- Multiple simultaneous encounters per DM.
