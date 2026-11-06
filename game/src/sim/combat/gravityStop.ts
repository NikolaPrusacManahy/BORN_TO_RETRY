// Update 0.3.85 — Gravity Sean's ultimate in normal mode, Time Stop (the designer: "you unleash a gravity zone that covers the whole room and act like a time stop (when you hit an enemy they looks unfazed and hit
// will register when time stop ends)"). Q with the meter full: nothing in the world moves but him and what he throws. A hit of his is held back (`storeHit`, gravityMeter.ts): the enemy doesn't flinch, lose health or
// die. When it ends they all land at once: one blow for each target, their sum, and no dodging it. A boss stops too: only its cancel window, if it's open, takes them one by one, as they're what cancels it. Pure.
import { Vector3 } from 'three';
import { FEEDBACK } from '../../tuning/combat';
import { SEAN } from '../../tuning/sean';
import { isLive } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import type { PlayerState } from '../player/state';
import type { StoredHit } from './gravityMeter';
import type { CombatState } from './state';
import { emptyTargetHit, landHit } from './strike';

const hit = emptyTargetHit();
const way = new Vector3();

/** Q in normal mode, the meter full. */
export function startStop(state: CombatState, player: PlayerState) {
  state.grav.stop = { t: 0, stored: [], releasing: false };
  // (Nothing caught mid-flash, or half a tick from where it stands, for the whole of it.)
  for (const e of state.enemies) {
    e.flash = 0;
    e.prev.copy(e.pos);
  }
  state.events.push('seanStopStart', 0, player.pos.x, player.pos.y, player.pos.z);
}

/** One target's stored blows land. */
function land(state: CombatState, s: StoredHit) {
  if (s.kind === 'enemy' && !isLive(state.enemies[s.index])) return;
  hit.kind = s.kind;
  hit.index = s.index;
  hit.part = s.part;
  hit.s = 0;
  hit.point.copy(s.point);
  // Thrown along where its blows pushed it, up to a limit.
  way.set(s.dx, 0, s.dz);
  const push = way.length();
  const knock = Math.min(SEAN.v.stopKnockMax, push);
  const fx = push > 1e-3 ? way.x / push : 0;
  const fz = push > 1e-3 ? way.z / push : 0;
  // (Update 0.3.90 — what they kill heals by the stance they were struck in.)
  state.grav.as = s.unstable;
  // (A cancel window counts blows.)
  const counted = s.kind === 'enemy' && state.enemies[s.index].ult.on ? s.hits : 1;
  for (let i = 0; i < counted; i++) {
    const killed = landHit(state, hit, s.damage / counted, knock, fx, fz, 'hitSlam', Math.round(s.damage / counted));
    if (killed && s.kind === 'enemy') launch(state.enemies[s.index], fx, fz);
  }
  state.grav.as = null;
  state.events.push('seanStopPop', s.damage, s.point.x, s.point.y, s.point.z);
}

/** It ends: everything registers. Also when he's gone, or isn't him any more (the Lab). */
export function endStop(state: CombatState, player: PlayerState) {
  const g = state.grav;
  const s = g.stop;
  if (!s) return;
  s.releasing = true;
  state.events.push('seanStopEnd', s.stored.length, player.pos.x, player.pos.y, player.pos.z);
  for (const h of s.stored) land(state, h);
  g.stop = null;
  if (s.stored.length > 0) state.hitStop.request(FEEDBACK.v.stopKill);
}

/** Each tick. */
export function stepStop(state: CombatState, player: PlayerState, dt: number) {
  const s = state.grav.stop;
  if (!s) return;
  s.t += dt;
  if (s.t >= SEAN.v.stopTime || player.dead) endStop(state, player);
}

/** How drained of colour the screen is meanwhile (0 … 1): the view's. */
export function stopShade(state: CombatState): number {
  const s = state.grav.stop;
  return s ? Math.min(1, s.t / 0.25) * SEAN.v.stopGrey : 0;
}
