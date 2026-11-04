// Update 0.3.42 — a blow on The Swarm (the designer's spec: "shooting worms off the heap opens gaps to the eye"; here,
// punching): from where it landed in towards the eye, the first worm in the way takes it (its flash, a shove; killed, it
// drops off the heap and its share of the bar goes with it). With no worm in the way, through a gap, the eye takes it
// all. A big blow (a charged punch, a slam) tears out every worm near where it lands, as many as it's worth. A blow
// with no point (a slam's ring, a bleed) lands on the side it came from. Pure.
import type { Vector3 } from 'three';
import { SWARM } from '../../tuning/swarm';
import type { Enemy } from './enemy';
import { DEAD, livingWorm, type SwarmBody } from './swarmBody';

/** How far from a blow's line a bead still takes it (m, past its own radius). */
const SLACK = 0.3;
/** A big blow tears out worms this close to where it lands (m). */
const CRATER = 1.3;
/** A blow's shove on the bead it lands on (m). */
const SHOVE = 0.25;

/** The eye's height over The Swarm's feet (m). */
export const swarmEyeHeight = () => SWARM.v.eyeLift + SWARM.v.eye;

/** What a blow of `damage` along (dirX, dirZ), landing at `at` (null: on the side it came from), takes off The Swarm's
 *  bar: a worm's share for each worm it kills, all of it if it reaches the eye, nothing if a worm takes it and lives. */
export function swarmTakes(e: Enemy, s: SwarmBody, damage: number, dirX: number, dirZ: number, at: Vector3 | null): number {
  const v = SWARM.v;
  // (A blow worth its whole bar finishes it, worms or not.)
  if (damage >= v.swarmHp) return damage;
  const ex = e.pos.x;
  const ey = e.pos.y + swarmEyeHeight();
  const ez = e.pos.z;
  const d = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
  const ax = at ? at.x : ex - (dirX / d) * (s.extent + SLACK);
  const ay = at ? at.y : ey;
  const az = at ? at.z : ez - (dirZ / d) * (s.extent + SLACK);
  // Along the line from where it landed to the eye's middle; the eye's surface this far along it.
  const lx = ex - ax;
  const ly = ey - ay;
  const lz = ez - az;
  const len2 = lx * lx + ly * ly + lz * lz;
  const len = Math.sqrt(len2) || 1e-6;
  const eyeAt = Math.max(0, 1 - v.eye / len);
  const n = s.beads;
  let best = -1;
  let bestT = Infinity;
  for (let w = 0; w < s.worms; w++) {
    if (!livingWorm(s, w)) continue;
    for (let b = 0; b < n; b++) {
      const i = w * n + b;
      const px = s.x[i] - ax;
      const py = s.y[i] - ay;
      const pz = s.z[i] - az;
      const t = Math.max(0, Math.min(1, (px * lx + py * ly + pz * lz) / (len2 || 1)));
      if (t > eyeAt || t >= bestT) continue;
      const qx = px - lx * t;
      const qy = py - ly * t;
      const qz = pz - lz * t;
      const reach = s.r[i] + SLACK;
      if (qx * qx + qy * qy + qz * qz > reach * reach) continue;
      best = i;
      bestT = t;
    }
  }
  if (best < 0) {
    s.eyeHit++;
    return damage;
  }
  const share = (v.wormShare * v.swarmHp) / Math.max(1, s.worms);
  const w = (best / n) | 0;
  s.flash[w] = 0.12;
  s.x[best] += (dirX / d) * SHOVE;
  s.z[best] += (dirZ / d) * SHOVE;
  s.hp[w] -= damage;
  let lost = 0;
  if (s.hp[w] <= 0) lost += kill(s, w, best) * share;
  // A big blow tears out more: every worm near where it landed, as many as it's worth beyond the first.
  let more = Math.floor(damage / Math.max(1, v.wormHp)) - 1;
  if (more > 0) {
    const hx = s.x[best], hy = s.y[best], hz = s.z[best];
    for (let k = 0; k < s.worms && more > 0; k++) {
      if (!livingWorm(s, k) || k === w) continue;
      for (let b = 0; b < n; b++) {
        const i = k * n + b;
        const dx = s.x[i] - hx, dy = s.y[i] - hy, dz = s.z[i] - hz;
        if (dx * dx + dy * dy + dz * dz > CRATER * CRATER) continue;
        lost += kill(s, k, i) * share;
        more--;
        break;
      }
    }
  }
  return lost;
}

/** Worm `w` killed (bead `i` where it was struck): off the heap, its gore told. Returns 1. */
function kill(s: SwarmBody, w: number, i: number): number {
  s.state[w] = DEAD;
  s.t[w] = 0;
  s.flash[w] = 0.12;
  if (s.goreN < s.gore.length / 3) {
    const o = s.goreN++ * 3;
    s.gore[o] = s.x[i];
    s.gore[o + 1] = s.y[i];
    s.gore[o + 2] = s.z[i];
  }
  return 1;
}
