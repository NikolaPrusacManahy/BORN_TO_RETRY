// M1 — what the HUD shows, pushed by the game a few times a second (React never runs per frame). Hit markers
// and hurt flashes are counters: each new number restarts their animation.
import type { MoveMode } from '../sim/player/state';

export type MarkerKind = 'hit' | 'heavy' | 'kill';

export interface HudState {
  dashCharges: number;
  dashMax: number;
  mode: MoveMode;
  /** M1 step 6 — counts hits; `marker` is the last one's kind. */
  hits: number;
  marker: MarkerKind;
  /** Counts orb hits on you. */
  hurts: number;
}

export interface HudStore {
  get(): HudState;
  set(next: HudState): void;
  subscribe(fn: () => void): () => void;
}

export function createHudStore(): HudStore {
  let state: HudState = { dashCharges: 0, dashMax: 0, mode: 'ground', hits: 0, marker: 'hit', hurts: 0 };
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      const same = (Object.keys(next) as (keyof HudState)[]).every((k) => next[k] === state[k]);
      if (same) return;
      state = next;
      subs.forEach((fn) => fn());
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** Live numbers for the F2 overlay, written every frame and read by the overlay's own loop. */
export interface DebugInfo {
  speed: number;
  vSpeed: number;
  mode: MoveMode;
  dashCharges: number;
  wallJumpsLeft: number;
  /** Raw (unadjusted) mouse input granted. */
  rawInput: boolean;
  keyboardLock: boolean;
  fullscreen: boolean;
  /** M1 step 6 — hit-stop left (ms). */
  hitStop: number;
}

export function createDebugInfo(): DebugInfo {
  return { speed: 0, vSpeed: 0, mode: 'ground', dashCharges: 0, wallJumpsLeft: 0, rawInput: false, keyboardLock: false, fullscreen: false, hitStop: 0 };
}
