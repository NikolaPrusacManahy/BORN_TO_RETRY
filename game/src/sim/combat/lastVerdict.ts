// Update 0.3.73 — the Playable Demon's Q, Last Verdict (the bible: "when heat is full: screen goes black and white, the sword grows huge, one cleave
// that kills everything in a line"). The world holds still for it, as it does for an execution: you can still aim, and then it comes down, along
// your way, through anything, as far as there is. It burns the heat. Your sword comes back to your hand for it if it was out. Pure.
import { Vector3 } from 'three';
import { DEMON } from '../../tuning/demon';
import type { CollisionWorld } from '../collisionWorld';
import { isLive } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { ENEMY_STATS } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import { begin, VERDICT } from './bladeSwing';
import { catchBlade } from './bladeThrow';
import { leaveBurn } from './demonFire';
import type { CombatIntent } from './fists';
import type { CombatState } from './state';
import { landHit } from './strike';
import { sweepTargets } from './sweep';

/** More than any health. */
const KILLS = 100000;
/** It's measured from your chest (m over your feet); and how long its sheet shows (s). */
const CHEST = 1.1;
export const CLEAVE_FOR = 0.35;
/** A second life's taken too (a Cursed Crewman's head, a mech's pilot). */
const LIVES = 2;

const from = new Vector3();
const to = new Vector3();

/** Q: if the sword's full, it starts. */
export function tryVerdict(state: CombatState, player: PlayerState, pressed: boolean, yaw: number): boolean {
  const b = state.blade;
  if (!pressed || b.verdict || b.heat < 1) return false;
  catchBlade(state);
  b.verdict = true;
  b.verdictT = 0;
  b.verdictStruck = false;
  b.charging = b.full = b.guard = false;
  b.lunging = false;
  b.plant = 0;
  b.queued = 0;
  player.guard = 0;
  player.dashTime = 0;
  player.slamming = false;
  place(state, player, yaw);
  begin(b, VERDICT, state.events);
  state.events.push('demonVerdict', 0, player.pos.x, player.pos.y, player.pos.z);
  return true;
}

function place(state: CombatState, player: PlayerState, yaw: number) {
  const b = state.blade;
  b.verdictX = player.pos.x;
  b.verdictY = player.pos.y;
  b.verdictZ = player.pos.z;
  b.verdictYaw = yaw;
}

/** The blow: everything along your way, at any height. */
function cleave(state: CombatState, player: PlayerState, world: CollisionWorld) {
  const v = DEMON.v;
  const b = state.blade;
  const fx = -Math.sin(b.verdictYaw);
  const fz = -Math.cos(b.verdictYaw);
  from.set(player.pos.x, player.pos.y + CHEST, player.pos.z);
  to.copy(from);
  to.x += fx * v.verdictLong;
  to.z += fz * v.verdictLong;
  sweepTargets(
    state,
    from,
    to,
    v.verdictWidth,
    (t) => {
      const e = t.kind === 'enemy' ? state.enemies[t.index] : null;
      const s = e ? ENEMY_STATS[e.kind]() : null;
      // (A boss by its knob: the bible's says it kills.)
      const share = s?.boss && v.verdictBoss < 1 ? v.verdictBoss : 0;
      for (let i = 0; i < LIVES; i++) {
        const killed = landHit(state, t, share > 0 ? s!.hp * share : KILLS, v.overheadKnock, fx, fz, 'hitPierce', 1, true);
        if (killed && e) launch(e, fx, fz);
        if (killed || !e || !isLive(e) || share > 0) break;
      }
    },
    true,
  );
  // What it leaves: its line, burning, as far as the first wall.
  from.y = player.pos.y + CHEST;
  to.set(fx, 0, fz);
  const long = Math.min(v.verdictLong, world.rayDistance(from, to, v.verdictLong));
  leaveBurn(state, player.pos.x, player.pos.z, player.pos.x + fx * long, player.pos.z + fz * long, player.pos.y);
  state.demonFire.cleave = { ax: player.pos.x, az: player.pos.z, bx: player.pos.x + fx * v.verdictLong, bz: player.pos.z + fz * v.verdictLong, y: player.pos.y, left: CLEAVE_FOR };
  // (Whatever it just killed, it's spent.)
  b.heat = 0;
  state.hitStop.request(v.overheadStop);
  state.events.push('demonCleave', 0, player.pos.x, player.pos.y, player.pos.z);
}

/** One tick of it: nothing else in the world moves. */
export function stepVerdict(state: CombatState, player: PlayerState, intent: CombatIntent, world: CollisionWorld, dt: number) {
  const b = state.blade;
  const v = DEMON.v;
  b.verdictT += dt;
  if (!b.verdictStruck) {
    place(state, player, intent.yaw);
    if (b.verdictT < v.verdictWindup) return;
    b.verdictStruck = true;
    cleave(state, player, world);
    return;
  }
  if (b.verdictT < v.verdictWindup + v.verdictHold) return;
  b.verdict = false;
  b.step = -1;
  b.grey = v.verdictFade;
  player.invuln = Math.max(player.invuln, 0.3);
}

/** How drained of colour the screen is (0 … 1): the view's. */
export function verdictShade(state: CombatState): number {
  const b = state.blade;
  const v = DEMON.v;
  if (b.verdict) return b.verdictStruck ? 1 : Math.min(1, b.verdictT / Math.max(0.05, v.verdictWindup * 0.35));
  return b.grey > 0 ? b.grey / Math.max(0.05, v.verdictFade) : 0;
}
