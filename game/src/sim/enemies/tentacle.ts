// Update 0.3.15 — floor 6's Kraken Tentacle (the Pirate Kit's Tentacle). Sent into a room, it goes into the sea nearest
// its spot (only rooms with sea get one: wavePlan.ts), 2 m out from the water's edge (the designer's picture: not at
// the edge), and lurks there unseen. Come near and it bursts out and grabs you by surprise (the designer: "grabs the
// player by surprise and lifts them in the air"): up in its coil, click to break free, or it slams you down; either way
// you land on the shore, never in the sea (combat/coil.ts). Once up it stays up, rooted, rearing back before each lunge
// for you (Tentacle wind-up); you punch it from the shore. With you never near, it rises anyway (Tentacle lurk). (It sank
// under once at half health, the designer's "just maybe one time when half health"; then it vanished as you broke free,
// "it just dissapears and dies": Tentacle sinks at is 0 now, never; set it to have it back, rising after Tentacle
// under.) It never flinches. Pure.
import { FOES_COVE_B } from '../../tuning/foesCoveB';
import { LAVA_DEPTH } from '../../world/dungeon/assemble';
import { startCoil } from '../combat/coil';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

/** Under the sea it's this deep (m, its feet); it rises in this long (s), bursting out in this (s); in the sea it stands
 *  this far out from the water's edge nearest its spot (m; in a narrow channel, its middle), the sea no further than
 *  this from it (m: its room's); you're out of its grab this high (m); its rest after a lunge that missed (s). */
const UNDER = -9;
const RISE = 1;
const SURPRISE = 0.3;
const IN = 2;
const SEA_NEAR = 24;
const HIGH = 3;
const REST = 0.6;
/** Its move (`move`): the lunge. */
export const LUNGE = 1;

export function updateTentacle(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE_B.v;
  e.vel.set(0, 0, 0);
  if (e.deeds === 0) return settle(e, w);
  // Worn down to half (`stage`: it's been under), it sinks under, once.
  if (e.stage === 0 && e.phase !== 'burrow' && e.hp <= ENEMY_STATS.tentacle().hp * v.tentacleSinkAt) {
    e.stage = 1;
    sink(e, index, w);
    return;
  }
  const toward = yawTo(e, player.pos.x, player.pos.z);
  const near = !player.dead && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= v.tentacleReach && player.pos.y < HIGH && !w.grab.on && !w.pin.on;
  switch (e.phase) {
    case 'burrow':
      // Lurking: you come near and it bursts out at you; you never do, and it rises anyway.
      e.near += dt;
      if (near) setPhase(e, 'leap');
      else if (e.near >= (e.stage === 0 ? v.tentacleLurk : v.tentacleUnder)) setPhase(e, 'intro');
      else break;
      w.events.push('tentacleRise', index, e.pos.x, -LAVA_DEPTH, e.pos.z);
      break;
    case 'leap':
      e.pos.y = e.prev.y = UNDER + (e.perch - UNDER) * Math.min(1, e.t / SURPRISE);
      e.facing = toward;
      if (e.t < SURPRISE) break;
      if (near) startCoil(w, index, player);
      else setPhase(e, 'chase');
      break;
    case 'intro':
      e.pos.y = e.prev.y = UNDER + (e.perch - UNDER) * Math.min(1, e.t / RISE);
      if (e.t >= RISE) setPhase(e, 'chase');
      break;
    case 'stun':
      if (e.t < v.tentacleStun) break;
      e.cooldown = v.tentacleGap;
      setPhase(e, 'chase');
      break;
    case 'flinch':
    case 'recover':
      if (e.t >= REST) setPhase(e, 'chase');
      break;
    case 'chase':
      e.facing = turn(e.facing, toward, 3 * dt);
      if (!near || e.cooldown > 0) break;
      e.move = LUNGE;
      setPhase(e, 'windup');
      w.events.push('tentacleWindup', index, e.pos.x, e.pos.y + ENEMY_STATS.tentacle().height, e.pos.z);
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, 4 * dt);
      if (e.t < v.tentacleWindup) break;
      e.move = 0;
      if (near) {
        startCoil(w, index, player);
        break;
      }
      e.cooldown = v.tentacleGap;
      setPhase(e, 'recover');
      break;
  }
}

/** Just sent in: into the sea nearest its spot, out from the edge, and under it to lurk. No sea near: it isn't here. */
function settle(e: Enemy, w: EnemyWorld) {
  const pits = w.ground?.pits ?? [];
  let best = Infinity;
  for (const b of pits) {
    const ix = Math.min(IN, b.w / 2);
    const iz = Math.min(IN, b.d / 2);
    const x = Math.max(b.x - b.w / 2 + ix, Math.min(b.x + b.w / 2 - ix, e.pos.x));
    const z = Math.max(b.z - b.d / 2 + iz, Math.min(b.z + b.d / 2 - iz, e.pos.z));
    const d = Math.hypot(x - e.pos.x, z - e.pos.z);
    if (d < best) {
      best = d;
      e.aim.set(x, 0, z);
    }
  }
  if (best > SEA_NEAR) {
    e.alive = false;
    return;
  }
  e.deeds = 1;
  e.pos.set(e.aim.x, UNDER, e.aim.z);
  e.prev.copy(e.pos);
  e.perch = -LAVA_DEPTH;
  e.stage = 0;
  e.near = 0;
  setPhase(e, 'burrow');
}

/** Down under the sea, out of reach, to lurk. */
function sink(e: Enemy, index: number, w: EnemyWorld) {
  e.pos.y = e.prev.y = UNDER;
  e.near = 0;
  e.move = 0;
  setPhase(e, 'burrow');
  w.events.push('tentacleSink', index, e.pos.x, -LAVA_DEPTH, e.pos.z);
}

/** Driven off for good: down it goes, under the sea. */
export function tentacleSinks(e: Enemy) {
  e.perch = UNDER;
}
