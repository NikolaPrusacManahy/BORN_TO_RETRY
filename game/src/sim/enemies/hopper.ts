// Update 0.3.18 — floor 8's Leaper (Finn the Frog on foot; the plan: "Frog — the ground"). It keeps a few metres off
// you, hopping back if you come at it. With its turn (a big one's: one leap at a time) it crouches, then leaps high in
// the low gravity onto where you're heading (Leaper leap: its shadow comes over you), landing on you (Leaper landing)
// and sending a shock ring along the ground (Shock ring: jump it, combat/quakes.ts). Then it's a while before the next
// (Leaper every). Pure.
import { Vector3 } from 'three';
import { FOES_MOON } from '../../tuning/foesMoon';
import { startQuake } from '../combat/quakes';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { arcTo, keepRing } from './moves';
import { armed } from './tokens';

/** It keeps this far off (m); leaps from no further than this (m); crouches this long (s); its leap peaks this high
 *  (m); it aims where you'll be this long ahead (s), at most this far ahead (m); its landing hurts you this near (m);
 *  a ring clears your feet this high (m). */
const KEEP = 5.5;
const LEAP_MAX = 15;
const CROUCH = 0.5;
const PEAK = 5.5;
const LEAD = 0.5;
const LEAD_MAX = 3;
const LAND = 1.7;
const CLEAR = 0.4;

const way = new Vector3();

export function updateHopper(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_MOON.v;
  const s = ENEMY_STATS.hopper();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      return;
    case 'recover':
      keepRing(e, player, w, 'small', s.speed, KEEP, 6, dt);
      if (e.t >= 0.6) setPhase(e, 'chase');
      return;
    case 'chase': {
      if (player.dead) return;
      const sees = inLine(e, player, w.nav.small, 3);
      if (e.cooldown <= 0 && dist <= LEAP_MAX && sees && armed(e)) {
        setPhase(e, 'windup');
        w.events.push('hopperCrouch', index, e.pos.x, e.pos.y + 0.8, e.pos.z);
        return;
      }
      // (Too far, or something between you: it comes round to where it can leap.)
      if (dist > LEAP_MAX || !sees) {
        e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 6 * dt);
        if (chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way) !== 'none') walk(e, way.x, way.z, s.speed * dt, w.nav.small);
      } else keepRing(e, player, w, 'small', s.speed, KEEP, 6, dt);
      return;
    }
    case 'windup': {
      e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 10 * dt);
      if (e.t < CROUCH) return;
      // Onto where you'll be.
      const lx = Math.max(-LEAD_MAX, Math.min(LEAD_MAX, player.vel.x * LEAD));
      const lz = Math.max(-LEAD_MAX, Math.min(LEAD_MAX, player.vel.z * LEAD));
      e.from.copy(e.pos);
      e.aim.set(player.pos.x + lx, e.pos.y, player.pos.z + lz);
      setPhase(e, 'leap');
      w.events.push('hopperLeap', index, e.aim.x, e.aim.y, e.aim.z);
      return;
    }
    case 'leap': {
      const k = Math.min(1, e.t / v.hopperLeap);
      arcTo(e, k, PEAK);
      e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 8 * dt);
      if (k < 1) return;
      e.pos.y = e.from.y;
      w.events.push('hopperLand', index, e.pos.x, e.pos.y, e.pos.z);
      if (!player.dead && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= LAND && player.pos.y - e.pos.y < 1.5) damagePlayer(player, v.hopperDamage, 'hopper');
      startQuake(w.quakes, e.pos.x, e.pos.y, e.pos.z, v.ringSpeed, v.ringReach, v.ringDamage, CLEAR, 'hopper');
      e.cooldown = v.hopperEvery;
      setPhase(e, 'recover');
      return;
    }
  }
}
