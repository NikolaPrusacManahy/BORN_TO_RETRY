// Update 0.3.22 — floor 7's Völva (the More-enemies pack's Witch, her robe pale; MD/FLOOR7_WARBAND_PLAN.md), the
// seeress. She keeps Völva keeps off from you, within her range. With her turn and a clear line her hand glows (Völva
// cast) and she lobs a rime bolt where you stand (combat/bombs.ts 'rime'): it bursts, chilling you if you're caught,
// and leaves a patch of rime, ice while it lasts (combat/frost.ts): she spreads the ice. Every Raise every, a fallen
// Draugr's body near her (draugr.ts: raisable) and she chants over it (Raise chant; a ring of frost on the body); then
// it stands up whole. Hit her (a flinch), or knock the body away, and the chant breaks. Cornered, she backs off; right up
// against her, a weak shove. Pure.
import { Vector3 } from 'three';
import { FOES_NORSE } from '../../tuning/foesNorse';
import { dropBomb } from '../combat/bombs';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { chaseDir } from './chase';
import { raisable, raiseDead } from './draugr';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const SHOVE: Brawl = {
  reach: () => 1.8,
  windup: () => 0.4,
  damage: () => 6,
  turn: 8,
  windupTurn: 5,
  arc: 80,
  recover: 0.6,
  shove: 9,
  windupEvent: 'volvaCast',
  strikeEvent: 'throwerShove',
};
/** Her moves (`move`): her hand glowing for a bolt; chanting over a body (its slot in `shots`, where it lay in `aim`). */
export const CASTING = 1;
export const CHANTING = 2;
/** The bolt leaves her hand this high (m); a body knocked this far from where it lay breaks her chant (m); she shoves
 *  closer than this (m); the body's time is held this young while she chants (s: it doesn't sink meanwhile). */
const HAND = 1.6;
const MOVED = 1;
const CORNERED = 1.6;
const HOLD = 0.5;
/** A burst throws you this hard (m/s). */
const BURST_SHOVE = 3;

const way = new Vector3();
const from = new Vector3();
const to = new Vector3();

export function updateVolva(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_NORSE.v;
  const s = ENEMY_STATS.volva();
  e.blink = Math.max(0, e.blink - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  if (e.phase === 'flinch' && e.move === CHANTING) w.events.push('volvaBroken', index, e.aim.x, 0.3, e.aim.z);
  if (e.phase === 'flinch') e.move = 0;
  if (e.phase === 'windup' && e.move === CASTING) {
    e.facing = turn(e.facing, toward, 6 * dt);
    if (e.t >= v.volvaCast) cast(e, index, player, w);
    return;
  }
  if (e.phase === 'charge' && e.move === CHANTING) return chant(e, index, w, dt);
  if (e.phase !== 'chase' || player.dead) {
    brawl(e, index, player, w, dt, SHOVE, true);
    return;
  }
  if (dist < CORNERED) return brawl(e, index, player, w, dt, SHOVE, true);
  if (e.blink <= 0 && startChant(e, index, w)) return;
  if (e.cooldown <= 0 && dist <= v.volvaFar && armed(e) && inLine(e, player, w.nav.small, 3)) {
    e.move = CASTING;
    setPhase(e, 'windup');
    w.events.push('volvaCast', index, e.pos.x, e.pos.y + HAND, e.pos.z);
    return;
  }
  e.facing = turn(e.facing, toward, 6 * dt);
  if (dist < v.volvaNear && dist > 1e-3) walk(e, (e.pos.x - player.pos.x) / dist, (e.pos.z - player.pos.z) / dist, s.speed * dt, w.nav.small);
  else if ((dist > v.volvaFar * 0.85 || !inLine(e, player, w.nav.small, 3)) && chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way) !== 'none') walk(e, way.x, way.z, s.speed * dt, w.nav.small);
}

/** A rime bolt lobbed where you stand. */
function cast(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES_NORSE.v;
  from.set(e.pos.x + Math.cos(e.facing) * 0.3, e.pos.y + HAND, e.pos.z - Math.sin(e.facing) * 0.3);
  // (On the floor under you, or the ledge you stand on.)
  to.set(player.pos.x, player.grounded ? player.pos.y : 0, player.pos.z);
  if (dropBomb(w.bombs, from, to, v.rimeFlight, v.rimeReach, v.rimeDamage, BURST_SHOVE, 'volva', 'rime')) w.events.push('volvaBolt', index, from.x, from.y, from.z);
  e.move = 0;
  e.cooldown = v.volvaEvery;
  setPhase(e, 'recover');
}

/** The nearest raisable body within her reach: she starts her chant over it. */
function startChant(e: Enemy, index: number, w: EnemyWorld): boolean {
  const v = FOES_NORSE.v;
  let best = -1;
  let bestD = v.raiseRange;
  w.enemies.forEach((b, i) => {
    if (!raisable(b) || w.enemies.some((o) => o.kind === 'volva' && o !== e && o.alive && o.move === CHANTING && o.shots === i)) return;
    const d = Math.hypot(b.pos.x - e.pos.x, b.pos.z - e.pos.z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  if (best < 0) return false;
  const b = w.enemies[best];
  e.shots = best;
  e.aim.copy(b.pos);
  e.move = CHANTING;
  e.facing = yawTo(e, b.pos.x, b.pos.z);
  // (Her arms up: a charge's clip.)
  setPhase(e, 'charge');
  w.events.push('volvaChant', index, b.pos.x, b.pos.y + 0.2, b.pos.z);
  return true;
}

/** Chanting: the body held where it lies; at the chant's end it stands. Gone or knocked away, it breaks. */
function chant(e: Enemy, index: number, w: EnemyWorld, dt: number) {
  const v = FOES_NORSE.v;
  const b = w.enemies[e.shots];
  e.facing = turn(e.facing, yawTo(e, e.aim.x, e.aim.z), 6 * dt);
  if (!b || !b.alive || b.phase !== 'dead' || Math.hypot(b.pos.x - e.aim.x, b.pos.z - e.aim.z) > MOVED) {
    w.events.push('volvaBroken', index, e.aim.x, 0.3, e.aim.z);
    e.move = 0;
    e.blink = v.raiseEvery * 0.5;
    setPhase(e, 'recover');
    return;
  }
  b.t = Math.min(b.t, HOLD);
  if (e.t < v.raiseChant) return;
  raiseDead(b);
  w.events.push('volvaRaise', e.shots, b.pos.x, b.pos.y + 0.5, b.pos.z);
  e.move = 0;
  e.blink = v.raiseEvery;
  setPhase(e, 'recover');
}
