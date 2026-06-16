/**
 * Thin wrapper over Trystero (Nostr strategy).
 *
 * Strategy choice: bare `trystero` re-exports `@trystero-p2p/nostr`, which
 * uses public Nostr relays for WebRTC signalling — zero backend required,
 * ideal for a fully static GitHub Pages deployment.
 *
 * Internal notes on API differences vs the original plan sketch:
 *  - `makeAction` returns a `MessageAction<T>` object (not a tuple).
 *    Send via `.send(data)`, receive by assigning `.onMessage = handler`.
 *  - `.onMessage` callback receives `(data, context: MessageContext)` where
 *    `context.peerId` holds the sender's id.
 *  - `onPeerJoin` / `onPeerLeave` are assignable properties on the Room
 *    object, not methods.
 *  - `leave()` returns `Promise<void>`; we fire-and-forget it.
 */
import { joinRoom } from 'trystero';
import type { DataPayload } from 'trystero';
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

  // makeAction returns a MessageAction<T> object, not a tuple.
  // Action/EncounterState are structurally JSON-serialisable but lack the
  // index signature required by DataPayload, so we use DataPayload as the
  // channel type and cast at the boundaries.
  const actionChannel = room.makeAction('action');
  const snapshotChannel = room.makeAction('snapshot');

  return {
    onAction(handler) {
      actionChannel.onMessage = (action, context) =>
        handler(action as Action, context.peerId);
    },
    sendAction(action) {
      void actionChannel.send(action as unknown as DataPayload);
    },
    broadcast(state) {
      void snapshotChannel.send(state as unknown as DataPayload);
    },
    onSnapshot(handler) {
      snapshotChannel.onMessage = (state) =>
        handler(state as unknown as EncounterState);
    },
    onPeerJoin(handler) {
      room.onPeerJoin = handler;
    },
    onPeerLeave(handler) {
      room.onPeerLeave = handler;
    },
    leave() {
      void room.leave();
    },
  };
}

/** Trystero peerId for this client (stable for the room session). */
export { selfId } from 'trystero';
