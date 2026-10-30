// Update 0.2.4 — the big Cactoro, floor 4's mini boss beside the Spider (the designer: "Mini boss - Spider & Cactoro";
// hard to kill by being smart, not tanky). It walks at you; every Big Cactoro pause it picks: a fan of spines thrown at
// you (spine volley), or an ambush: it digs in, hunts for you under the sand (out of reach) and the ground cracks under
// your feet for Ambush warning before it bursts up there; close by, a ring of spines. Hit it too fast (Thorn guard hits
// within Thorn guard window) and it shuts itself in its thorns for Thorn guard: nothing hurts it (evade.ts). Only a hard
// hit staggers it; it carries its room's key. Pure.
import { Vector3 } from 'three';
import { FOES4 } from '../../tuning/foes4';
import { fireOrb } from '../combat/orbs';
import { AIM_HEIGHT } from '../combat/turret';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { BURIED, spines } from './cactoro';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** Which move (Enemy.move): its spines thrown, its ambush (digging in, then coming up under you), a ring of spines. */
export const VOLLEY = 0;
export const AMBUSH = 1;
export const BURST = 2;
/** The ambush's last part: the ground cracking under you. */
export const ERUPT = 3;
/** It stops walking this far from your body (m), bursts its spines this close (m). */
const STAND_OFF = 3;
const BURST_NEAR = 3.5;
/** A ring of spines: its reach and damage are the small one's, bigger. */
const BURST_SCALE = 1.4;
/** Hunting under the sand it goes this fast (m/s), and comes up this far ahead of where you're heading (s of your run). */
const HUNT_SPEED = 10;
const LEAD = 0.3;
const TURN = 4;

const way = new Vector3();
const from = new Vector3();
const aim = new Vector3();

export function updateCactoroBig(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES4.v;
  const s = ENEMY_STATS[e.kind]();
  e.blink = Math.max(0, e.blink - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'stun':
      // Shut in its thorns.
      if (e.t >= v.guardTime) {
        setPhase(e, 'chase');
        e.cooldown = v.bigPause * 0.5;
      }
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t >= 0.6) {
        setPhase(e, 'chase');
        e.cooldown = v.bigPause;
      }
      break;
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.cooldown <= 0) {
        e.move = dist - radiusOf(e) <= BURST_NEAR ? (w.rng() < 0.6 ? BURST : AMBUSH) : w.rng() < 0.55 ? VOLLEY : AMBUSH;
        setPhase(e, 'windup');
        w.events.push('cactoroWindup', e.move, e.pos.x, e.pos.y + s.height * 0.7, e.pos.z);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(e) + STAND_OFF)) break;
      walk(e, way.x, way.z, s.speed * dt, w.nav.large);
      break;
    }
    case 'windup':
      if (e.move !== ERUPT) e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < windupOf(e.move)) break;
      if (e.move === VOLLEY) volley(e, index, player, w);
      else if (e.move === BURST) spines(e, index, player, w, v.spinesReach * BURST_SCALE, v.spinesDamage * BURST_SCALE);
      else if (e.move === AMBUSH) {
        w.events.push('cactoroDig', index, e.pos.x, 0.3, e.pos.z);
        e.pos.y = e.prev.y = BURIED;
        setPhase(e, 'burrow');
        break;
      } else erupt(e, index, player, w);
      setPhase(e, 'recover');
      break;
    case 'burrow': {
      // Hunting you under the sand, a little ahead of your run.
      const tx = player.pos.x + player.vel.x * LEAD;
      const tz = player.pos.z + player.vel.z * LEAD;
      const dx = tx - e.pos.x;
      const dz = tz - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.3) walk(e, dx / d, dz / d, Math.min(d, HUNT_SPEED * dt), w.nav.large);
      if (e.t >= v.ambushFind) {
        // The ground cracks where it'll burst up.
        e.move = ERUPT;
        setPhase(e, 'windup');
        w.events.push('cactoroRise', index, e.pos.x, 0.05, e.pos.z);
      }
      break;
    }
    default:
      break;
  }
}

/** The warning before `move` (s). */
export function windupOf(move: number): number {
  const v = FOES4.v;
  return move === VOLLEY ? v.volleyWindup : move === AMBUSH ? v.ambushDig : move === ERUPT ? v.ambushWarn : 0.5;
}

/** A fan of spines at your chest. */
function volley(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES4.v;
  from.set(e.pos.x - Math.sin(e.facing) * radiusOf(e), e.pos.y + ENEMY_STATS[e.kind]().height * 0.55, e.pos.z - Math.cos(e.facing) * radiusOf(e));
  aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from).normalize();
  const n = Math.max(1, Math.round(v.volleySpines));
  const spread = (v.volleySpread * Math.PI) / 180;
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * spread;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    way.set(aim.x * c + aim.z * sn, aim.y, -aim.x * sn + aim.z * c).normalize();
    fireOrb(w.orbs, from, way, v.volleySpeed, v.volleyDamage, e.kind, 'spine');
  }
  w.events.push('cactoroVolley', index, from.x, from.y, from.z);
}

/** It bursts up where it is: close by, you're hurt and thrown up. */
function erupt(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES4.v;
  e.pos.y = e.prev.y = 0;
  w.events.push('cactoroErupt', index, e.pos.x, 0.2, e.pos.z);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > v.ambushReach + radiusOf(e) || player.pos.y > 2.5 || !damagePlayer(player, v.ambushDamage, e.kind)) return;
  player.vel.x += (d > 1e-3 ? dx / d : 1) * 6;
  player.vel.z += (d > 1e-3 ? dz / d : 0) * 6;
  player.vel.y = Math.max(player.vel.y, 10);
  player.grounded = false;
}
