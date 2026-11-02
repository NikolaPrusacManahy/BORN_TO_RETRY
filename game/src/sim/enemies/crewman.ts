// Update 0.3.15 — floor 6's Cursed Crewman (the Pirate Kit's Skeleton, its cutlass): a sword fighter (brawler.ts).
// Brought down, it doesn't die: its skull flies off and it goes on headless (enemy.ts makes it the Headless, the
// Skeleton_Headless: a body of its own, its own health). Headless it's blind: it charges where it last heard you (a
// punch, a dash, a jump, a landing, a slide, a slam, a kill) and swings wild where it ends up, or at you if you're
// right there. Heard nothing for a while, it wanders. Kill it again. (Floor 3's Skeletons come back whole; this one
// comes back blind.) Pure.
import { Vector3 } from 'three';
import { FOES_COVE } from '../../tuning/foesCove';
import { meleeHit } from '../combat/meleeParry';
import type { PlayerState } from '../player/state';
import { lineClear } from '../../world/navGrid';
import { brawl, Brawl } from './brawler';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const CUTLASS: Brawl = {
  reach: () => 2.2,
  windup: () => 0.6,
  damage: () => FOES_COVE.v.crewmanDamage,
  turn: 9,
  windupTurn: 4,
  arc: 80,
  recover: 0.55,
  shove: 8,
  windupEvent: 'crewmanWindup',
  strikeEvent: 'crewmanStrike',
};

export function updateCrewman(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  brawl(e, index, player, w, dt, CUTLASS, armed(e));
}

/** What it hears of yours: your moves, and your blows and kills. */
const LOUD_MOVES = new Set<string>(['jump', 'airJump', 'dashJump', 'land', 'slamLand', 'dash', 'wallJump', 'wallRunJump', 'pad']);
const LOUD_BLOWS = new Set<string>(['jabL', 'jabR', 'heavy', 'kill', 'slash']);
/** It swings once it's this near where it heard you, or this near you (m: it bumps into you); its wild swing reaches
 *  this far all round its front (m, degrees); its wind-up and rest (s); wandering, it picks a way this often (s). */
const THERE = 1.5;
const BUMP = 1.3;
const SWING = 2.3;
const ARC = 150;
const WINDUP = 0.45;
const REST = 0.6;
const WANDER = 1.2;

const way = new Vector3();

export function updateHeadless(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE.v;
  const s = ENEMY_STATS.headless();
  // Just beheaded: its skull flies.
  if (e.shots === 1) {
    e.shots = 0;
    e.near = v.headlessEars;
    w.events.push('skullOff', index, e.pos.x, e.pos.y + 1.9, e.pos.z);
  }
  if (heard(player, w)) {
    e.aim.set(player.pos.x, 0, player.pos.z);
    e.near = 0;
  } else e.near += dt;
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover':
      if (e.t >= REST) setPhase(e, 'chase');
      break;
    case 'windup':
      if (e.t < WINDUP) break;
      w.events.push('headlessStrike', index, e.pos.x, e.pos.y + 1.1, e.pos.z);
      {
        const off = Math.abs(Math.atan2(Math.sin(yawTo(e, player.pos.x, player.pos.z) - e.facing), Math.cos(yawTo(e, player.pos.x, player.pos.z) - e.facing)));
        if (!player.dead && dist <= SWING && off <= (ARC * Math.PI) / 360 && Math.abs(player.pos.y - e.pos.y) < 2) meleeHit(player, w, e, index, v.headlessDamage);
      }
      setPhase(e, 'recover');
      break;
    case 'chase': {
      if (!player.dead && dist < BUMP) return swing(e, index, w);
      const hunting = e.near <= v.headlessEars;
      // Wandering, it picks a way now and then: somewhere it can walk straight to.
      if (!hunting && e.t >= WANDER) {
        e.t = 0;
        wander(e, w);
      }
      const dx = e.aim.x - e.pos.x;
      const dz = e.aim.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < THERE) {
        if (hunting) swing(e, index, w);
        break;
      }
      // Straight there if nothing's in the way; hunting, round walls on your trail (the way to you); wandering into a
      // wall, it picks another way (the designer: enemies "run on the same spot").
      const g = w.nav.small;
      if (lineClear(g, e.pos.x, e.pos.z, e.aim.x, e.aim.z)) way.set(dx / d, 0, dz / d);
      else if (!hunting || chaseDir(w.flow.small, g, e.pos, player.pos.x, player.pos.z, way) === 'none') {
        e.t = WANDER;
        break;
      }
      e.facing = turn(e.facing, Math.atan2(-way.x, -way.z), 9 * dt);
      walk(e, way.x, way.z, Math.min(d, s.speed * (hunting ? 1 : 0.4) * dt), g);
      break;
    }
  }
}

/** A new way to wander: a spot near it it can walk straight to (if it finds one). */
function wander(e: Enemy, w: EnemyWorld) {
  for (let k = 0; k < 6; k++) {
    const x = e.pos.x + (w.rng() - 0.5) * 8;
    const z = e.pos.z + (w.rng() - 0.5) * 8;
    if (!lineClear(w.nav.small, e.pos.x, e.pos.z, x, z)) continue;
    e.aim.set(x, 0, z);
    return;
  }
  e.aim.set(e.pos.x, 0, e.pos.z);
}

function swing(e: Enemy, index: number, w: EnemyWorld) {
  setPhase(e, 'windup');
  w.events.push('headlessWindup', index, e.pos.x, e.pos.y + 1.1, e.pos.z);
}

/** Did you make a sound it hears this tick? */
function heard(player: PlayerState, w: EnemyWorld): boolean {
  if (player.dead) return false;
  for (let i = 0; i < player.events.length; i++) if (LOUD_MOVES.has(player.events.at(i).kind)) return true;
  for (let i = 0; i < w.events.length; i++) if (LOUD_BLOWS.has(w.events.at(i).kind)) return true;
  return false;
}
