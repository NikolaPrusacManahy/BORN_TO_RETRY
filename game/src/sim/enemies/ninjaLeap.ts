// Update 0.3.33 — a ninja's leap (floor 8's Kunoichi and the Shadow: the Universal Animation Library's ninja jump),
// shared: crouched a moment (or off a wall at a run), up in a high arc turning over, down where you were when it left
// (a little ahead of where you were going), and its landing's blow all round it (a strike: martial.ts). Pure.
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, yawTo } from './enemy';
import { startStrike, Strike } from './martial';
import { LEAP } from './shrineShared';

/** It leads you by this share of the leap; the arc's height (m). */
const LEAD = 0.5;
const HIGH = 2.6;

/** Off it goes: from where it is to where you'll be. */
export function beginLeap(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, time: number, event: 'wallLeap' | 'ninjaLeap') {
  e.from.copy(e.pos);
  e.aim.set(player.pos.x + player.vel.x * time * LEAD, 0, player.pos.z + player.vel.z * time * LEAD);
  e.facing = yawTo(e, e.aim.x, e.aim.z);
  e.move = LEAP;
  setPhase(e, 'leap');
  w.events.push(event, index, e.pos.x, e.pos.y + 1, e.pos.z);
}

/** In the air: along its arc; down, its landing's blow. */
export function leapStep(e: Enemy, index: number, w: EnemyWorld, time: number, land: Strike) {
  const k = Math.min(1, e.t / Math.max(0.1, time));
  e.pos.x = e.from.x + (e.aim.x - e.from.x) * k;
  e.pos.z = e.from.z + (e.aim.z - e.from.z) * k;
  e.pos.y = e.from.y + 4 * HIGH * k * (1 - k);
  if (k < 1) return;
  e.pos.y = 0;
  e.vel.set(0, 0, 0);
  w.events.push('ninjaLand', land.reach, e.pos.x, 0.2, e.pos.z);
  startStrike(e, index, w, land);
}
