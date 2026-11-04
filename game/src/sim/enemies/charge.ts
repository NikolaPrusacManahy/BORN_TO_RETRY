// Update 0.0.15 — a boss's charge (the Demon's first; Update 0.0.18 — its numbers a spec: the Blue Demon's, the Dragon's
// swoop, the Velociraptor's, the Drowned King's surf): a straight run that throws you aside; a wall or a column in its
// way stuns it. Update 0.3.41 — out of the Demon's moves (demonMoves.ts), the Demon gone (its events keep its name:
// 'demonCharge', 'demonCrash', 'demonGore'). Pure.
import { Vector3 } from 'three';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, radiusOf, setPhase } from './enemy';
import { pushOutOfWalls } from '../../world/navGrid';

/** A charge's numbers: how fast (m/s), how far (m), what it does to you, and how tall the charger is (m). */
export interface ChargeSpec {
  speed: number;
  range: number;
  damage: number;
  shove: number;
  height: number;
}

const step = new Vector3();
const was = new Vector3();

/** Off it runs along the way it faces (locked now). */
export function startCharge(d: Enemy, index: number, w: EnemyWorld) {
  d.from.copy(d.pos);
  d.aim.set(-Math.sin(d.facing), 0, -Math.cos(d.facing));
  d.struck = false;
  setPhase(d, 'charge');
  w.events.push('demonCharge', index, d.pos.x, d.pos.y + 1, d.pos.z);
}

/** One tick of the charge. Returns 'crash' (it ran into something), 'out' (it ran its length) or 'on'. */
export function stepCharge(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, spec: ChargeSpec): 'crash' | 'out' | 'on' {
  const dist = spec.speed * dt;
  was.copy(d.pos);
  d.pos.x += d.aim.x * dist;
  d.pos.z += d.aim.z * dist;
  pushOutOfWalls(w.nav.large, d.pos, radiusOf(d));
  // Pushed back against the way it runs (not just along a wall it grazes): it hit something.
  step.subVectors(d.pos, was);
  if (step.x * d.aim.x + step.z * d.aim.z < dist * 0.5) {
    setPhase(d, 'stun');
    w.events.push('demonCrash', index, d.pos.x + d.aim.x * radiusOf(d), d.pos.y + 2, d.pos.z + d.aim.z * radiusOf(d));
    return 'crash';
  }
  if (!d.struck) gore(d, index, player, w, spec);
  if (Math.hypot(d.pos.x - d.from.x, d.pos.z - d.from.z) >= spec.range) return 'out';
  return 'on';
}

/** Running into you: hurt and thrown aside, away from its line (once a charge). */
function gore(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, spec: ChargeSpec) {
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  if (Math.hypot(dx, dz) > radiusOf(d) + BODY.radius || player.pos.y - d.pos.y > spec.height * 0.8) return;
  d.struck = true;
  if (!damagePlayer(player, spec.damage, d.kind)) return;
  // Which side of its line you're on decides where you're thrown; mostly forward with it.
  const side = Math.sign(dx * -d.aim.z + dz * d.aim.x) || 1;
  player.vel.x += (d.aim.x * 0.7 - d.aim.z * side * 0.7) * spec.shove;
  player.vel.z += (d.aim.z * 0.7 + d.aim.x * side * 0.7) * spec.shove;
  player.vel.y = Math.max(player.vel.y, 7);
  player.grounded = false;
  w.events.push('demonGore', index, player.pos.x, player.pos.y + 1, player.pos.z);
}
