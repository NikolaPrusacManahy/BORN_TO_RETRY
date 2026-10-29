// Update 0.0.21 — the Dragon's second phase (the designer: "when the Dragon starts its second phase, right away it flies
// into the air and bombs the ground with massive fireballs; the player can see where they will land; it lasts 5 to 8
// seconds in the air"). It screams and climbs; up there it keeps a little way off you and lobs a fire bomb every Bomb
// gap at your feet or near them (the spot glows from the throw: sim/combat/bombs.ts); its time up, it comes back down
// and the fight goes on. Enemy.cooldown holds its time left up there, Enemy.strafeTime the next bomb. Pure.
import { Vector3 } from 'three';
import { DRAGON } from '../../tuning/dragon';
import { dropBomb } from '../combat/bombs';
import type { PlayerState } from '../player/state';
import { dragonMouth } from './dragonMoves';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';

/** A bomb lands right on you this share of the time; the rest scatter round you. */
const ON_YOU = 0.35;

const mouth = new Vector3();
const spot = new Vector3();

/** Up it goes: its time in the air picked (seeded). */
export function startSky(d: Enemy, index: number, w: EnemyWorld) {
  const v = DRAGON.v;
  setPhase(d, 'sky');
  d.cooldown = v.skyMin + (v.skyMax - v.skyMin) * w.rng();
  d.strafeTime = v.skyRise;
  dragonMouth(d, mouth);
  w.events.push('dragonScream', index, mouth.x, mouth.y, mouth.z);
}

/** One tick up there. Returns true once it's back on the ground. */
export function stepSky(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DRAGON.v;
  const up = d.cooldown > 0;
  const rate = v.skyAlt / Math.max(0.1, v.skyRise);
  d.pos.y += Math.max(-rate * dt, Math.min(rate * dt, (up ? v.skyAlt : 0) - d.pos.y));
  d.facing = turn(d.facing, yawTo(d, player.pos.x, player.pos.z), v.dragonTurn * dt);
  // A little way off you, drifting after you.
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > v.skyKeep + 0.5) walk(d, dx / dist, dz / dist, Math.min(v.skyDrift * dt, dist - v.skyKeep), w.nav.large);
  if (!up) {
    if (d.pos.y > 0.01) return false;
    d.pos.y = 0;
    setPhase(d, 'chase');
    return true;
  }
  d.strafeTime -= dt;
  if (d.strafeTime > 0 || player.dead) return false;
  d.strafeTime = v.bombGap;
  const on = w.rng() < ON_YOU;
  const a = w.rng() * Math.PI * 2;
  const r = on ? 0 : v.bombSpread * (0.3 + 0.7 * w.rng());
  spot.set(player.pos.x + Math.cos(a) * r, 0, player.pos.z + Math.sin(a) * r);
  dragonMouth(d, mouth);
  if (dropBomb(w.bombs, mouth, spot, v.bombFall, v.bombRadius, v.bombDamage, v.bombShove, d.kind)) w.events.push('dragonBomb', index, mouth.x, mouth.y, mouth.z);
  return false;
}
