// Update 0.1.5 — the Hammer's smash (the designer: "smash the ground and it creates a shockwave across the room"). The
// charged blow lands on the floor before you; a ring rolls out from it over the floor, fast at first and slowing, out
// to Shockwave reach. Every enemy (and lab dummy) its front passes under takes a hit once, thrown outwards: not one
// higher above the floor than Shockwave height (fliers over it), nor one behind a wall from where it started. Pure.
import { Vector3 } from 'three';
import { WEAPONS } from '../../tuning/weapons';
import { wallBetween } from '../../world/navGrid';
import type { CollisionWorld } from '../collisionWorld';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit, TargetKind } from '../combat/strike';
import { isLive, ENEMY_POOL } from '../enemies/enemy';
import type { PlayerState } from '../player/state';

export interface SmashWave {
  alive: boolean;
  /** Where it started, on the floor. */
  at: Vector3;
  /** Seconds since, and how far its front has rolled (m). */
  t: number;
  r: number;
  /** What it has hit (enemy slots; the lab's dummies). */
  struck: boolean[];
  struckDummy: boolean[];
}

export const WAVE_POOL = 3;
/** The blow lands this far ahead of your feet (m). */
export const SMASH_AHEAD = 1.6;
const DUMMY_CAP = 32;

const DOWN = new Vector3(0, -1, 0);
const from = new Vector3();
const dummyAt = new Vector3();
const hit = emptyTargetHit();

export function createSmashWaves(): SmashWave[] {
  return Array.from({ length: WAVE_POOL }, () => ({ alive: false, at: new Vector3(), t: 0, r: 0, struck: new Array<boolean>(ENEMY_POOL).fill(false), struckDummy: new Array<boolean>(DUMMY_CAP).fill(false) }));
}

/** Seconds a wave takes to roll its full reach. */
export const waveTime = () => WEAPONS.v.waveReach / Math.max(0.1, WEAPONS.v.waveSpeed);

/** How far a wave has rolled after `t` s: fast out, then slowing (as the ring is drawn). */
export function waveFront(t: number): number {
  const k = Math.min(1, t / waveTime());
  return WEAPONS.v.waveReach * (1 - (1 - k) ** 3);
}

/** The smash lands: a wave from the floor `SMASH_AHEAD` before you along `dir` (flattened). */
export function startWave(state: CombatState, player: PlayerState, dir: Vector3, world: CollisionWorld) {
  let w = state.smashWaves[0];
  for (const q of state.smashWaves)
    if (!q.alive) {
      w = q;
      break;
    }
  const flat = Math.hypot(dir.x, dir.z) || 1;
  w.at.set(player.pos.x + (dir.x / flat) * SMASH_AHEAD, player.pos.y, player.pos.z + (dir.z / flat) * SMASH_AHEAD);
  if (!player.grounded) {
    // In the air: the floor under where it lands.
    from.copy(w.at);
    const d = world.rayDistance(from, DOWN, 30);
    if (d < 30) w.at.y -= d;
  }
  w.alive = true;
  w.t = 0;
  w.r = 0;
  w.struck.fill(false);
  w.struckDummy.fill(false);
  state.events.push('smash', WEAPONS.v.waveReach, w.at.x, w.at.y, w.at.z);
}

export function updateSmashWaves(state: CombatState, dt: number) {
  for (const w of state.smashWaves) {
    if (!w.alive) continue;
    w.t += dt;
    w.r = waveFront(w.t);
    for (let i = 0; i < state.enemies.length && i < w.struck.length; i++) {
      const e = state.enemies[i];
      if (!w.struck[i] && isLive(e) && under(state, w, e.pos)) {
        w.struck[i] = true;
        strike(state, w, 'enemy', i, e.pos);
      }
    }
    for (let i = 0; i < state.dummies.length && i < DUMMY_CAP; i++) {
      const d = state.dummies[i];
      dummyAt.copy(d.home).add(d.offset);
      if (!w.struckDummy[i] && !d.broken && under(state, w, dummyAt)) {
        w.struckDummy[i] = true;
        strike(state, w, 'dummy', i, dummyAt);
      }
    }
    if (w.t >= waveTime()) w.alive = false;
  }
}

/** Its front has reached `pos` (feet), low enough and not behind a wall. */
function under(state: CombatState, w: SmashWave, pos: Vector3): boolean {
  const d = Math.hypot(pos.x - w.at.x, pos.z - w.at.z);
  return d <= w.r && pos.y - w.at.y <= WEAPONS.v.waveHeight && pos.y - w.at.y >= -1 && !wallBetween(state.nav.small, w.at.x, w.at.z, pos.x, pos.z);
}

function strike(state: CombatState, w: SmashWave, kind: TargetKind, index: number, pos: Vector3) {
  const v = WEAPONS.v;
  const dx = pos.x - w.at.x;
  const dz = pos.z - w.at.z;
  const d = Math.hypot(dx, dz);
  hit.kind = kind;
  hit.index = index;
  hit.s = 0;
  hit.point.set(pos.x, pos.y + 0.5, pos.z);
  landHit(state, hit, v.waveDamage, v.waveKnock, d > 1e-3 ? dx / d : 0, d > 1e-3 ? dz / d : 1, 'hitSlam', v.waveDamage);
}
