// Update 0.2.4 — the Flying Tribal (floor 4's flier beside the Wasp; the designer's "flying tribal masked creature";
// enemies "smarter than ordinary enemies"). A shaman: it keeps well off you (Flying Tribal keeps off), behind its
// allies, and every Ward gap it chants (Ward chant: hit it then and the chant breaks) and wards the ally nearest you:
// that one shrugs off your next Ward blows (evade.ts). Kill it first, or every fight drags on. With no ally left it
// throws a fan of feathers at you. Pure.
import { Vector3 } from 'three';
import { FOES4 } from '../../tuning/foes4';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, isLive, setPhase, turn, walk, yawTo } from './enemy';
import { keepHeight } from './fly';
import { ENEMY_STATS } from './kinds';

/** Its height over the floor (m), its turn rate (rad/s), its feathers' speed (m/s) and spread (rad). */
const ALT = 3.2;
const TURN = 6;
const FEATHER_SPEED = 16;
const SPREAD = 0.2;
/** Behind its ally, this far beyond it from you (m). */
const BEHIND = 5;

const target = new Vector3();
const from = new Vector3();
const aim = new Vector3();
const way = new Vector3();

/** The ally to ward: the live one nearest you, not a boss, not one of its kind, not already warded (−1: none). */
function allyFor(e: Enemy, player: PlayerState, w: EnemyWorld): number {
  let best = -1;
  let bestD = Infinity;
  w.enemies.forEach((o, i) => {
    if (o === e || !isLive(o) || o.kind === e.kind || ENEMY_STATS[o.kind]().boss || o.ward > 0) return;
    const d = Math.hypot(o.pos.x - player.pos.x, o.pos.z - player.pos.z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

export function updateMaskTribal(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, _world: CollisionWorld) {
  const v = FOES4.v;
  const s = ENEMY_STATS[e.kind]();
  const toward = yawTo(e, player.pos.x, player.pos.z);
  if (e.phase !== 'dead') keepHeight(e, ALT, dt);
  switch (e.phase) {
    case 'flinch':
      // (Hit mid-chant: the chant breaks.)
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover':
      if (e.t >= 0.5) setPhase(e, 'chase');
      break;
    case 'windup': {
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v.wardWindup) break;
      const ally = allyFor(e, player, w);
      if (ally >= 0) {
        const o = w.enemies[ally];
        o.ward = Math.round(v.wardHits);
        w.events.push('maskWard', ally, o.pos.x, o.pos.y + ENEMY_STATS[o.kind]().height * 0.6, o.pos.z);
      } else feathers(e, index, player, w);
      setPhase(e, 'recover');
      e.cooldown = v.wardGap;
      break;
    }
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      const ally = allyFor(e, player, w);
      if (e.cooldown <= 0) {
        setPhase(e, 'windup');
        w.events.push('maskChant', index, e.pos.x, e.pos.y + s.height * 0.6, e.pos.z);
        break;
      }
      // Behind the ally nearest you, or simply well off you.
      if (ally >= 0) {
        const o = w.enemies[ally];
        const dx = o.pos.x - player.pos.x;
        const dz = o.pos.z - player.pos.z;
        const d = Math.max(1e-3, Math.hypot(dx, dz));
        target.set(o.pos.x + (dx / d) * BEHIND, 0, o.pos.z + (dz / d) * BEHIND);
      } else {
        const dx = e.pos.x - player.pos.x;
        const dz = e.pos.z - player.pos.z;
        const d = Math.max(1e-3, Math.hypot(dx, dz));
        target.set(player.pos.x + (dx / d) * v.maskKeep, 0, player.pos.z + (dz / d) * v.maskKeep);
      }
      // Never closer to you than it keeps off.
      const pd = Math.hypot(target.x - player.pos.x, target.z - player.pos.z);
      if (pd < v.maskKeep) {
        target.x = player.pos.x + ((target.x - player.pos.x) / Math.max(pd, 1e-3)) * v.maskKeep;
        target.z = player.pos.z + ((target.z - player.pos.z) / Math.max(pd, 1e-3)) * v.maskKeep;
      }
      way.set(target.x - e.pos.x, 0, target.z - e.pos.z);
      const d = way.length();
      if (d > 0.4) walk(e, way.x / d, way.z / d, Math.min(d, s.speed * dt), w.nav.air);
      break;
    }
    default:
      break;
  }
}

/** Alone: a fan of feathers at your chest. */
function feathers(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES4.v;
  from.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z);
  aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from).normalize();
  const n = Math.max(1, Math.round(v.featherSpines));
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * SPREAD;
    way.set(aim.x * Math.cos(a) + aim.z * Math.sin(a), aim.y, -aim.x * Math.sin(a) + aim.z * Math.cos(a)).normalize();
    fireOrb(w.orbs, from, way, FEATHER_SPEED, v.featherDamage, e.kind, 'spine');
  }
  w.events.push('maskFeathers', index, from.x, from.y, from.z);
}
