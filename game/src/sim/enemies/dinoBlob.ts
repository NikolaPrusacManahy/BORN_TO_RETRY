// Update 0.2.4 — the Dino (floor 4; the designer: "turn him into a Blob monster and give him frustrating moves": the
// Dino's model, small). Hit and run: it circles you out of your reach (Dino circles at), now one way, now the other;
// when it's ready it crouches and hisses (Dino crouch: your warning), then pounces at where you are and bites. Then it
// stands open for Dino open (the moment to hit it: nothing it does saves it then) and springs back out of reach. Any
// other time, it hops away from most of your blows (evade.ts). Learn its rhythm: let it come, step aside, hit it while
// it's open. Pure.
import { FOES4 } from '../../tuning/foes4';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { Vector3 } from 'three';

/** Its turn rate (rad/s). Its pounce's arc (m up). Its bite reaches this far from its jaws as it lands (m). */
const TURN = 10;
const ARC = 1.2;
const JAWS = 1.3;
/** It lands this far short of you (m). */
const SHORT = 0.9;
/** A slide of d m starts at 7 d m/s (Enemy's slide friction). */
const SLIDE = 7;

const way = new Vector3();

export function updateDinoBlob(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES4.v;
  const s = ENEMY_STATS[e.kind]();
  e.blink = Math.max(0, e.blink - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'recover');
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v.dinoBlobWindup) break;
      // Off it goes, landing just in front of where you are now (its jaws on you).
      e.from.copy(e.pos);
      e.aim.set(player.pos.x - (player.pos.x - e.pos.x) / Math.max(dist, 1e-3) * SHORT, e.pos.y, player.pos.z - (player.pos.z - e.pos.z) / Math.max(dist, 1e-3) * SHORT);
      e.struck = false;
      setPhase(e, 'leap');
      w.events.push('dinoBlobPounce', index, e.pos.x, e.pos.y + 0.5, e.pos.z);
      break;
    case 'leap': {
      const k = Math.min(1, e.t / v.dinoBlobAir);
      e.pos.x = e.from.x + (e.aim.x - e.from.x) * k;
      e.pos.z = e.from.z + (e.aim.z - e.from.z) * k;
      e.pos.y = e.from.y + 4 * ARC * k * (1 - k);
      if (k < 1) break;
      e.pos.y = e.from.y;
      walk(e, 0, 0, 0, w.nav.small);
      bite(e, index, player, w);
      setPhase(e, 'recover');
      break;
    }
    case 'recover':
      // Open: it stands; then it springs back out of reach.
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t >= v.dinoBlobOpen) {
        hopAway(e, player.pos.x, player.pos.z, v.dinoBlobHop);
        w.events.push('dinoBlobHop', index, e.pos.x, e.pos.y + 0.5, e.pos.z);
        setPhase(e, 'chase');
        e.cooldown = v.dinoBlobGap;
      }
      break;
    case 'chase': {
      if (player.dead) break;
      e.facing = turn(e.facing, toward, TURN * dt);
      const sees = inLine(e, player, w.nav.small, s.height);
      if (e.cooldown <= 0 && sees && dist <= v.dinoBlobRing + 2) {
        setPhase(e, 'windup');
        w.events.push('dinoBlobWindup', index, e.pos.x, e.pos.y + s.height * 0.6, e.pos.z);
        break;
      }
      if (!sees || dist > v.dinoBlobRing + 2) {
        const how = chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way);
        if (how !== 'none') walk(e, way.x, way.z, s.speed * dt, w.nav.small);
        break;
      }
      // Round you at its ring: in or out to it, and across.
      e.strafeTime -= dt;
      if (e.strafeTime <= 0) {
        e.strafeTime = 1 + 1.5 * w.rng();
        e.strafe = -e.strafe;
      }
      const nx = (e.pos.x - player.pos.x) / Math.max(dist, 1e-3);
      const nz = (e.pos.z - player.pos.z) / Math.max(dist, 1e-3);
      const out = Math.max(-1, Math.min(1, (v.dinoBlobRing - dist) * 0.8));
      way.set(nx * out + nz * e.strafe, 0, nz * out - nx * e.strafe).normalize();
      walk(e, way.x, way.z, s.speed * dt, w.nav.small);
      break;
    }
    default:
      break;
  }
}

/** Its jaws as it lands: on you, you're hurt and knocked back. */
function bite(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES4.v;
  w.events.push('dinoBlobBite', index, e.pos.x - Math.sin(e.facing) * radiusOf(e), e.pos.y + 0.8, e.pos.z - Math.cos(e.facing) * radiusOf(e));
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > radiusOf(e) + JAWS || player.pos.y - e.pos.y > 1.6 || !damagePlayer(player, v.dinoBlobBite, e.kind)) return;
  player.vel.x += (d > 1e-3 ? dx / d : 1) * 6;
  player.vel.z += (d > 1e-3 ? dz / d : 0) * 6;
  player.vel.y = Math.max(player.vel.y, 3);
  player.grounded = false;
}

/** Springs `dist` m straight away from (x, z). */
export function hopAway(e: Enemy, x: number, z: number, dist: number) {
  let dx = e.pos.x - x;
  let dz = e.pos.z - z;
  let d = Math.hypot(dx, dz);
  // (Right on it: straight back from where it faces.)
  if (d < 1e-3) {
    dx = Math.sin(e.facing);
    dz = Math.cos(e.facing);
    d = 1;
  }
  e.vel.x = (dx / d) * dist * SLIDE;
  e.vel.z = (dz / d) * dist * SLIDE;
}
