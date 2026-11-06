// Update 0.2.10 — the Drowned King's moves risen (phase 2: up for good, it commands the water; drownedKing.ts picks them
// and warns). Its surf: it rides a wave straight at you, turning after you a little; into a wall or a column it's stunned (the
// Demon's charge with its own numbers). Pure.
// Update 0.3.58 — by the Boss Design Bible (spec MD_UPDATES/U0358_DROWNED_KING_BIBLE.md): its Riptide takes the tidal wall's place. It
// leans back, the water rushing towards it and dragging you with it (its old undertow), then whips its tail: a wave crosses the whole
// room, low enough to jump at its crest, high enough to knock you off a low stone. Taken by it, into the water, it Fin Dives you at
// once. Its bites and its geysers are gone. Its surf stays: "it swims faster than you run", and a stone stuns it as a wall does.
import { DROWNED } from '../../tuning/drowned';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { ChargeSpec } from './charge';
import { throwYou } from './dinoMoves';
import { feetIn } from './drownedKingMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, yawTo } from './enemy';

/** Its wave's thickness (m), and how hard it throws you up (m/s). */
const THICK = 0.8;
const THROW_UP = 7;

const SURF: ChargeSpec = { speed: 0, range: 0, damage: 0, shove: 0, height: 0 };

/** Its tell, one tick: the water rushes towards it, dragging you while your feet are in it. */
export function stepRipPull(k: Enemy, player: PlayerState, w: EnemyWorld) {
  if (player.dead || !feetIn(player, w)) return;
  const dx = k.pos.x - player.pos.x;
  const dz = k.pos.z - player.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.3) return;
  player.current.x += (dx / d) * DROWNED.v.riptidePull;
  player.current.z += (dz / d) * DROWNED.v.riptidePull;
}

/** Its wave's off, from it, towards where you are. Enemy.from: where it rolls from; Enemy.aim: its way (flat, length 1). */
export function startRiptide(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const d = Math.hypot(dx, dz);
  k.from.set(k.pos.x, 0, k.pos.z);
  if (d > 1e-3) k.aim.set(dx / d, 0, dz / d);
  else k.aim.set(-Math.sin(k.facing), 0, -Math.cos(k.facing));
  k.struck = false;
  setPhase(k, 'blast');
  w.events.push('drownedRiptide', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
}

/** How far along its way a spot is from where its wave rolls from (m). */
export const ripAlong = (k: Enemy, x: number, z: number) => (x - k.from.x) * k.aim.x + (z - k.from.z) * k.aim.z;
/** Its wave's front, rolling (m from where it rolls from). */
export const ripFront = (k: Enemy) => radiusOf(k) + DROWNED.v.riptideSpeed * k.t;
/** Its wave's top (m over the floor). */
export const ripTop = (w: { flood: number }) => w.flood + DROWNED.v.riptideCrest;

/** One tick of its wave rolling: passing you with your feet under its crest, you're hurt and thrown along it (once a wave), and
 *  once you're in the water it comes for you (Enemy.drowned.finNow). True once it's rolled its reach. */
export function stepRiptide(k: Enemy, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DROWNED.v;
  const front = ripFront(k);
  const s = ripAlong(k, player.pos.x, player.pos.z);
  if (!k.struck && !player.dead && s <= front && s >= front - THICK - v.riptideSpeed * dt && player.pos.y < ripTop(w)) {
    k.struck = true;
    if (damagePlayer(player, v.riptideDamage, k.kind)) {
      throwYou(player, k, k.aim.x, k.aim.z, 1, v.riptideThrow, THROW_UP);
      if (k.drowned) k.drowned.finNow = true;
    }
  }
  return front >= v.riptideReach;
}

/** Its surf's numbers as the knobs say now (one object, refilled). */
export function surfSpec(): ChargeSpec {
  const v = DROWNED.v;
  SURF.speed = v.surfSpeed;
  SURF.range = v.surfRange;
  SURF.damage = v.surfDamage;
  SURF.shove = v.surfShove;
  SURF.height = v.kingHeight;
  return SURF;
}

/** Off it surfs, the way it faces. */
export function startSurf(k: Enemy, index: number, w: EnemyWorld) {
  k.from.copy(k.pos);
  k.aim.set(-Math.sin(k.facing), 0, -Math.cos(k.facing));
  k.struck = false;
  setPhase(k, 'charge');
  w.events.push('drownedSurf', index, k.pos.x, Math.max(w.flood, 0.05), k.pos.z);
}

/** Surfing, it turns its way after you (Surf steering). */
export function steerSurf(k: Enemy, player: PlayerState, dt: number) {
  const want = yawTo(k, player.pos.x, player.pos.z);
  const now = Math.atan2(-k.aim.x, -k.aim.z);
  const diff = Math.atan2(Math.sin(want - now), Math.cos(want - now));
  const step = DROWNED.v.surfSteer * dt;
  const turned = now + Math.max(-step, Math.min(step, diff));
  k.aim.set(-Math.sin(turned), 0, -Math.cos(turned));
  k.facing = turned;
}
