// M1 — what the HUD shows, pushed by the game a few times a second (React never runs per frame).
import type { MoveMode } from '../sim/player/state';

export interface HudState {
  dashCharges: number;
  dashMax: number;
  mode: MoveMode;
}

export interface HudStore {
  get(): HudState;
  set(next: HudState): void;
  subscribe(fn: () => void): () => void;
}

export function createHudStore(): HudStore {
  let state: HudState = { dashCharges: 0, dashMax: 0, mode: 'ground' };
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      if (next.dashCharges === state.dashCharges && next.dashMax === state.dashMax && next.mode === state.mode) return;
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
}

export function createDebugInfo(): DebugInfo {
  return { speed: 0, vSpeed: 0, mode: 'ground', dashCharges: 0, wallJumpsLeft: 0, rawInput: false, keyboardLock: false, fullscreen: false };
}
