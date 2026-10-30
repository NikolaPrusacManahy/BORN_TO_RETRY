// Update 0.2.4 — the Green Blob (floor 4; the designer's "green little blob"; enemies "hard to kill", not tankier). It
// rolls at you and, close (Green Blob hop), squashes down (its warning) and hops onto you. Killed, it splits into
// Bloblings (Green Blob splits): smaller, quicker, the same hop; they don't split again. A kill that leaves you more
// to kill. Pure.
import { Vector3 } from 'three';
import { FOES4 } from '../../tuning/foes4';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, radiusOf, setPhase, spawnEnemy, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** Its hop: how long in the air (s), how high (m); it stands this long after landing (s). */
const AIR = 0.5;
const ARC = 1.4;
const RECOVER = 0.6;
const TURN = 8;
/** Its Bloblings come out this far from where it died (m), flung off this fast (m/s). */
const SPLIT_OUT = 0.8;
const FLING = 6;

const way = new Vector3();
const at = new Vector3();

export function updateGreenBlob(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES4.v;
  const s = ENEMY_STATS[e.kind]();
  const small = e.kind === 'blobling';
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover':
      if (e.t >= RECOVER * (small ? 0.6 : 1)) setPhase(e, 'chase');
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v.blobWindup * (small ? 0.7 : 1)) break;
      e.from.copy(e.pos);
      e.aim.set(player.pos.x, e.pos.y, player.pos.z);
      setPhase(e, 'leap');
      w.events.push('blobHop', index, e.pos.x, e.pos.y + 0.3, e.pos.z);
      break;
    case 'leap': {
      const k = Math.min(1, e.t / AIR);
      e.pos.x = e.from.x + (e.aim.x - e.from.x) * k;
      e.pos.z = e.from.z + (e.aim.z - e.from.z) * k;
      e.pos.y = e.from.y + 4 * ARC * k * (1 - k);
      if (k < 1) break;
      e.pos.y = e.from.y;
      walk(e, 0, 0, 0, w.nav.small);
      land(e, index, player, w, small);
      setPhase(e, 'recover');
      break;
    }
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.cooldown <= 0 && dist <= v.blobHop && Math.abs(player.pos.y - e.pos.y) < 1.5) {
        setPhase(e, 'windup');
        w.events.push('blobWindup', index, e.pos.x, e.pos.y + s.height * 0.5, e.pos.z);
        e.cooldown = 1.2;
        break;
      }
      const how = chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way);
      if (how !== 'none') walk(e, way.x, way.z, Math.min(s.speed * dt, Math.max(0, dist - 1.2)), w.nav.small);
      break;
    }
    default:
      break;
  }
}

/** It comes down: on you, you're hurt and knocked off. */
function land(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, small: boolean) {
  const v = FOES4.v;
  w.events.push('blobLand', index, e.pos.x, e.pos.y, e.pos.z);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > radiusOf(e) + 1 || player.pos.y - e.pos.y > 1.6 || !damagePlayer(player, small ? v.bloblingDamage : v.blobDamage, e.kind)) return;
  player.vel.x += (d > 1e-3 ? dx / d : 1) * 5;
  player.vel.z += (d > 1e-3 ? dz / d : 0) * 5;
  player.vel.y = Math.max(player.vel.y, 3);
  player.grounded = false;
}

/** Killed (its body's first tick): a Green Blob splits into its Bloblings. */
export function splitBlob(e: Enemy, index: number, w: EnemyWorld) {
  if (e.struck || e.kind !== 'greenBlob') return;
  e.struck = true;
  const n = Math.round(FOES4.v.blobSplit);
  w.events.push('blobSplit', index, e.pos.x, e.pos.y + 0.5, e.pos.z);
  for (let i = 0; i < n; i++) {
    const a = e.facing + Math.PI / 2 + (i * Math.PI * 2) / Math.max(1, n);
    at.set(e.pos.x + Math.sin(a) * SPLIT_OUT, e.pos.y, e.pos.z + Math.cos(a) * SPLIT_OUT);
    const s = spawnEnemy(w.enemies, 'blobling', at, e.facing);
    if (s < 0) continue;
    const b = w.enemies[s];
    b.vel.set(Math.sin(a) * FLING, 0, Math.cos(a) * FLING);
    b.cooldown = 0.8;
    w.events.push('enemySpawn', s, at.x, at.y, at.z);
  }
}
