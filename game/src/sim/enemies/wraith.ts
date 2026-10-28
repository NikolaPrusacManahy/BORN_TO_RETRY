// Update 0.0.13 — the Wraith (the designer: a flying enemy). A ghost that floats above the fight, keeping its distance:
// further than Wraith too far (or out of sight) it drifts closer, over cover; closer than Wraith too close it drifts
// away; in between it circles. With you in sight and its cast ready it raises its arms for the warning (it glows pale
// and wails), then casts a fan of slow orbs at you: step out of the fan or dash through it. A hit flinches it and
// cancels the cast. Reach it with a jump, a wall run, a pad or a thrown weapon. Pure.
import { Vector3 } from 'three';
import { FOES } from '../../tuning/foes';
import type { CollisionWorld } from '../collisionWorld';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { circle, flyCloser, keepHeight, middle, seesInAir } from './fly';

/** After a cast, before it moves again (s). */
const RECOVER = 0.4;
const TURN = 8;

const from = new Vector3();
const aim = new Vector3();
const dir = new Vector3();

export function updateWraith(r: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES.v;
  const dist = Math.hypot(player.pos.x - r.pos.x, player.pos.z - r.pos.z);
  const toward = yawTo(r, player.pos.x, player.pos.z);
  if (r.phase !== 'dead') keepHeight(r, v.wraithAlt, dt);
  switch (r.phase) {
    case 'flinch':
      if (r.t >= v.wraithFlinch) setPhase(r, 'chase');
      break;
    case 'recover':
      r.facing = turn(r.facing, toward, TURN * dt);
      if (r.t >= RECOVER) setPhase(r, 'chase');
      break;
    case 'chase': {
      if (player.dead) break;
      const sees = seesInAir(r, player, world);
      if (sees && dist <= v.wraithFar && r.cooldown <= 0) {
        setPhase(r, 'windup');
        w.events.push('wraithWindup', index, r.pos.x, r.pos.y + v.wraithHeight / 2, r.pos.z);
        break;
      }
      if (!sees || dist > v.wraithFar) flyCloser(r, player, w, v.wraithSpeed, toward, dt);
      else circle(r, player, w, v.wraithSpeed, v.wraithNear, toward, dt);
      break;
    }
    case 'windup':
      r.facing = turn(r.facing, toward, TURN * dt);
      if (r.t >= v.wraithWindup) {
        cast(r, index, player, w, world);
        setPhase(r, 'recover');
      }
      break;
  }
}

/** A fan of orbs from its middle at your chest, spread across (none if a wall came between). */
function cast(r: Enemy, index: number, player: PlayerState, w: EnemyWorld, world: CollisionWorld) {
  const v = FOES.v;
  r.cooldown = v.wraithCooldown;
  if (!seesInAir(r, player, world)) return;
  middle(r, from);
  aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from).normalize();
  const n = Math.max(1, Math.round(v.wraithOrbs));
  const spread = (v.wraithSpread * Math.PI) / 180;
  let fired = false;
  for (let i = 0; i < n; i++) {
    const angle = (i - (n - 1) / 2) * spread;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    dir.set(aim.x * c + aim.z * s, aim.y, -aim.x * s + aim.z * c).normalize();
    fired = fireOrb(w.orbs, from, dir, v.wraithOrbSpeed, v.wraithOrbDamage) || fired;
  }
  if (fired) w.events.push('wraithCast', index, from.x, from.y, from.z);
}
