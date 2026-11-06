// Update 0.3.72 — the Playable Demon's other buttons (the bible). Shift, Hellfire Lunge: the dash, longer and faster, burning through all it
// passes (player/dash.ts moves you; this hits). Ctrl on the ground, Brand of Ruin: the sword planted, fire out along lines from you,
// a moment rooted and untouchable: your way out when you're surrounded. Ctrl in the air's the slam's dive, and its landing is
// the same Brand, bigger the further you fell (demonFire.ts). Pure.
// Update 0.3.73 — a hot Lunge leaves fire along its way; heat cools and kills heal here, each tick.
import { Vector3 } from 'three';
import { DEMON } from '../../tuning/demon';
import { healPlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { leaveBurn, plantBrand } from './demonFire';
import { coolHeat, isHot } from './heat';
import type { CombatState } from './state';
import { landHit } from './strike';
import { sweepTargets, targetId } from './sweep';
import { launch } from '../enemies/flight';

/** It's swept at chest height (m over your feet). */
const CHEST = 1.1;
const from = new Vector3();
const to = new Vector3();

/** One tick of a lunge: whatever you've passed since the last tick takes it, once. */
export function stepLunge(state: CombatState, player: PlayerState) {
  const b = state.blade;
  const v = DEMON.v;
  const on = player.dashTime > 0;
  if (on && !b.lunging) {
    b.lunging = true;
    b.lungeFrom.copy(player.pos);
    b.lungeStart.copy(player.pos);
    b.lungeStruck.clear();
    b.step = -1;
    b.charging = b.full = false;
    state.events.push('demonLunge', 0, player.pos.x, player.pos.y + CHEST, player.pos.z);
  }
  if (!b.lunging) return;
  from.set(b.lungeFrom.x, b.lungeFrom.y + CHEST, b.lungeFrom.z);
  to.set(player.pos.x, player.pos.y + CHEST, player.pos.z);
  const fx = player.dashDir.x;
  const fz = player.dashDir.z;
  sweepTargets(state, from, to, v.lungeWidth, (t) => {
    const id = targetId(t);
    if (b.lungeStruck.has(id)) return;
    b.lungeStruck.add(id);
    const killed = landHit(state, t, v.lungeDamage, v.lungeKnock, fx, fz, 'hitSlash', v.lungeDamage);
    if (killed && t.kind === 'enemy') launch(state.enemies[t.index], fx, fz);
    state.hitStop.request(v.lungeStop);
  });
  b.lungeFrom.copy(player.pos);
  if (!on) {
    b.lunging = false;
    state.events.push('demonLungeEnd', 0, player.pos.x, player.pos.y + CHEST, player.pos.z);
    if (isHot(state)) leaveBurn(state, b.lungeStart.x, b.lungeStart.z, player.pos.x, player.pos.z, player.pos.y);
  }
}

/** Ctrl on the ground: the sword goes in, if it's been long enough. */
export function tryBrand(state: CombatState, player: PlayerState, pressed: boolean): boolean {
  const b = state.blade;
  const v = DEMON.v;
  if (!pressed || !player.grounded || b.brandWait > 0 || b.plant > 0 || b.step >= 0 || b.guard) return false;
  b.charging = b.full = false;
  b.plant = v.plantFor;
  b.brandWait = v.brandWait;
  player.invuln = Math.max(player.invuln, v.plantFor);
  plantBrand(state, player.pos.x, player.pos.y, player.pos.z, player.yaw, 0);
  return true;
}

/** A dive's landing: the sword goes in, from `drop` m up. */
export function landPlunge(state: CombatState, player: PlayerState, drop: number) {
  state.blade.plant = DEMON.v.plantFor * 0.7;
  plantBrand(state, player.pos.x, player.pos.y, player.pos.z, player.yaw, Math.max(0.01, drop));
}

/** Update 0.3.73 — Forged from the Fallen: kills turned into health. */
export function feedOnFallen(state: CombatState, player: PlayerState) {
  const b = state.blade;
  if (b.fallen <= 0) return;
  healPlayer(player, b.fallen * DEMON.v.killHeal);
  b.fallen = 0;
}

/** Last Verdict's sheet fading (it runs while the world holds still, too). */
export function tickCleave(state: CombatState, dt: number) {
  const c = state.demonFire.cleave;
  if (!c) return;
  c.left -= dt;
  if (c.left <= 0) state.demonFire.cleave = null;
}

/** The Demon's timers, one tick. */
export function tickDemon(state: CombatState, player: PlayerState, dt: number) {
  const b = state.blade;
  b.plant = Math.max(0, b.plant - dt);
  b.brandWait = Math.max(0, b.brandWait - dt);
  b.grey = Math.max(0, b.grey - dt);
  coolHeat(state, dt);
  feedOnFallen(state, player);
  tickCleave(state, dt);
}

/** How fast you can move, with the sword in the floor or held up to block. */
export const bladeSlow = (state: CombatState) => (state.blade.plant > 0 ? DEMON.v.plantSlow : state.blade.guard ? DEMON.v.guardSlow : 1);
