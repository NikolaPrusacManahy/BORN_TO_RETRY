// Update 0.3.15 — Captain Barbarossa, floor 6's second mini boss (the Pirate Kit's captain: his hook, his parrot). He
// keeps a pistol shot off you. Aiming, a red line runs from his pistol to you and follows you, slower than you can run
// (Captain aim speed) for Captain aim; then he fires down it (Captain shot): it finds you if you're still on the line
// and nothing stands between you. Outrun the line, or get behind something. Up close, his hook sweeps wide in front of
// him (brawler.ts). Only a hard hit staggers him; a hit that staggers him spoils his aim. Pure.
import { Vector3 } from 'three';
import { FOES_COVE_B } from '../../tuning/foesCoveB';
import { wallBetween } from '../../world/navGrid';
import { AIM_HEIGHT } from '../combat/turret';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const HOOK: Brawl = {
  reach: () => FOES_COVE_B.v.captainReach,
  windup: () => FOES_COVE_B.v.captainWindup,
  damage: () => FOES_COVE_B.v.captainDamage,
  turn: 7,
  windupTurn: 3,
  arc: 140,
  recover: 0.6,
  shove: 10,
  windupEvent: 'captainWindup',
  strikeEvent: 'captainSweep',
};
/** His move (`move`) aiming. He shoots from this far out (m) up to this; comes nearer past this; his pistol is this high
 *  (m); a shot finds you this near its line (m, your body's more); it flies this far at most (m). */
export const AIMING = 1;
const SHOOT_MIN = 5;
const SHOOT_MAX = 22;
const COME = 14;
export const PISTOL = 1.6;
const LINE = 0.3;
const SHOT_REACH = 30;

const way = new Vector3();
const chest = new Vector3();

export function updateCaptain(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.phase === 'flinch') e.move = 0;
  if (e.phase === 'windup' && e.move === AIMING) return aim(e, index, player, w, dt);
  if (e.phase !== 'chase' || player.dead || dist < SHOOT_MIN) {
    brawl(e, index, player, w, dt, HOOK, true);
    return;
  }
  if (e.cooldown <= 0 && dist <= SHOOT_MAX && inLine(e, player, w.nav.small, 3) && armed(e)) {
    e.move = AIMING;
    e.aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z);
    setPhase(e, 'windup');
    w.events.push('captainAim', index, e.pos.x, e.pos.y + PISTOL, e.pos.z);
    return;
  }
  e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 5 * dt);
  // (Near enough, he stops, if nothing stands between you; otherwise he comes round it, on the big bodies' grid.)
  if (dist <= COME && inLine(e, player, w.nav.small, 3)) return;
  const how = chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
  if (how !== 'none') walk(e, way.x, way.z, ENEMY_STATS.captain().speed * dt, w.nav.large);
}

/** His aim (`aim`) following you, slower than you run; then the shot down it. */
function aim(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE_B.v;
  chest.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z);
  way.subVectors(chest, e.aim);
  const gap = way.length();
  if (gap > 1e-4) e.aim.addScaledVector(way, Math.min(gap, v.captainTrack * dt) / gap);
  e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 8 * dt);
  if (e.t < v.captainAim) return;
  // The shot: from his pistol through his aim, on.
  const hx = e.pos.x;
  const hy = e.pos.y + PISTOL;
  const hz = e.pos.z;
  way.set(e.aim.x - hx, e.aim.y - hy, e.aim.z - hz).normalize();
  const along = (chest.x - hx) * way.x + (chest.y - hy) * way.y + (chest.z - hz) * way.z;
  const off = Math.hypot(chest.x - (hx + way.x * along), chest.y - (hy + way.y * along), chest.z - (hz + way.z * along));
  const clear = !wallBetween(w.nav.small, hx, hz, player.pos.x, player.pos.z);
  const found = !player.dead && along > 0 && along < SHOT_REACH && off <= LINE + BODY.radius && clear;
  const end = found ? along : SHOT_REACH;
  w.events.push('captainShot', index, hx + way.x * end, hy + way.y * end, hz + way.z * end);
  if (found) damagePlayer(player, v.captainShot, 'captain');
  e.move = 0;
  e.cooldown = v.captainEvery;
  setPhase(e, 'recover');
}
