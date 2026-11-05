// Update 0.3.49 — a boss's ultimate (the designer's Boss Design Bible): once as phase 2 starts, then about every so often;
// a loud tell, an on-screen cue saying how to cancel it, a window to do it in. Cancelled: a long stagger and a big damage
// window. Failed: heavy damage, never an instant death (but the final boss's). Each boss has its own way to cancel: this
// holds what they share (is it due, the window, the progress the HUD draws), the boss its moves. A hit on its marked side
// goes to the cancel, not its health (the Dragon's core). Pure.
import type { Enemy } from './enemy';

export interface Ultimate {
  /** Its window is open. */
  on: boolean;
  /** The cue on screen (the cancel, in a few words). */
  cue: string;
  /** Seconds left of its window, and the window's whole length. */
  left: number;
  window: number;
  /** Progress to the cancel, and what it takes. */
  fill: number;
  need: number;
  /** Hits within this far of its front count (rad, either side; 0: none do). */
  arc: number;
  /** How many it has started this fight, and the seconds since the last. */
  count: number;
  since: number;
}

export const createUltimate = (): Ultimate => ({ on: false, cue: '', left: 0, window: 1, fill: 0, need: 1, arc: 0, count: 0, since: 0 });

export function resetUltimate(u: Ultimate) {
  u.on = false;
  u.cue = '';
  u.left = u.fill = u.arc = u.count = u.since = 0;
  u.window = u.need = 1;
}

/** Is one due (the first at once, in phase 2; then every `every` s)? `dt`: this tick, counted. */
export function ultimateDue(u: Ultimate, every: number, dt: number): boolean {
  if (u.on) return false;
  u.since += dt;
  return u.count === 0 || u.since >= every;
}

/** Its window opens. */
export function openUltimate(u: Ultimate, cue: string, window: number, need: number, arc = 0) {
  u.on = true;
  u.cue = cue;
  u.left = u.window = Math.max(0.1, window);
  u.fill = 0;
  u.need = Math.max(1, need);
  u.arc = arc;
  u.count++;
  u.since = 0;
}

export type UltimateState = 'open' | 'cancelled' | 'failed';

/** One tick of its window: 'cancelled' or 'failed' the tick it ends. */
export function stepUltimate(u: Ultimate, dt: number): UltimateState {
  if (!u.on) return 'failed';
  if (u.fill >= u.need) {
    u.on = false;
    return 'cancelled';
  }
  u.left = Math.max(0, u.left - dt);
  if (u.left > 0) return 'open';
  u.on = false;
  return 'failed';
}

/** A blow travelling (dirX, dirZ) lands on `e`: does it land on the side its cancel takes hits from? */
export function ultimateTakes(e: Enemy, dirX: number, dirZ: number): boolean {
  const u = e.ult;
  if (!u.on || u.arc <= 0) return false;
  const len = Math.hypot(dirX, dirZ);
  if (len < 1e-3) return false;
  // (It faces −sin, −cos; a blow on its front travels against that.)
  return (dirX * Math.sin(e.facing) + dirZ * Math.cos(e.facing)) / len >= Math.cos(u.arc);
}

/** The ultimate on now, of the enemies given (null: none): the HUD's cue, the music's cut. */
export function ultimateIn(enemies: readonly Enemy[]): Ultimate | null {
  for (const e of enemies) if (e.alive && e.phase !== 'dead' && e.ult.on) return e.ult;
  return null;
}
