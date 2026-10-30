// Update 0.2.4 — the Velociraptor's moves once their warning is over (dino.ts picks them and warns).
// Update 0.2.8 — its new moves (the designer: "move sets that were not in the game yet"). Here, the pieces they share:
// which move is which, its pace, its charge (the Demon's run with its own numbers, steering after you as it goes; a
// wall or a column stuns it) and its pounces: a feint's, its own, a lunge out of the sandstorm, the dive off a wall,
// each flying its own time, its landing glowing on the floor. In its frenzy a pounce of its own (or a feint's) landing
// on you pins you (pin.ts). The hunt's moves are in dinoHunt.ts, the frenzy's in dinoFrenzy.ts, the blitz in
// dinoBlitz.ts. Pure.
import { DINO } from '../../tuning/dino';
import { startPin } from '../combat/pin';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import type { ChargeSpec } from './demonMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, walk, yawTo } from './enemy';

/** Which move (Enemy.move): the ones it picks (the sandstorm when its gap is over), then the ones that follow from
 *  them (a feint's stop, a lunge out of the storm, a bite while it pins you). */
export const CHARGE = 0;
export const KICK = 1;
export const WALL = 2;
export const SCREECH = 3;
export const POUNCE = 4;
export const STORM = 5;
export const BLITZ = 6;
export const FEINT = 7;
export const LUNGE = 8;
export const BITE = 9;
/** It rears up this long, calling up a sandstorm (s). */
export const STORM_CALL = 1;
/** Landing this far over you (m), it hasn't caught you. */
const OVER = 2.5;

const SPEC: ChargeSpec = { speed: 0, range: 0, damage: 0, shove: 0, height: 0 };

/** How much quicker it is in its frenzy. */
export const dinoPace = (d: Enemy) => (d.stage > 0 ? DINO.v.frenzyPace : 1);

/** Its charge's numbers as the knobs say now (one object, refilled). */
export function dinoCharge(d: Enemy): ChargeSpec {
  const v = DINO.v;
  SPEC.speed = v.chargeSpeed * dinoPace(d);
  SPEC.range = v.chargeRange;
  SPEC.damage = v.chargeDamage;
  SPEC.shove = v.chargeShove;
  SPEC.height = v.dinoHeight;
  return SPEC;
}

/** Charging, it turns its run after you (Charge steering). */
export function steer(d: Enemy, player: PlayerState, dt: number) {
  const want = yawTo(d, player.pos.x, player.pos.z);
  const now = Math.atan2(-d.aim.x, -d.aim.z);
  const diff = Math.atan2(Math.sin(want - now), Math.cos(want - now));
  const turned = now + Math.max(-DINO.v.chargeSteer * dt, Math.min(DINO.v.chargeSteer * dt, diff));
  d.aim.set(-Math.sin(turned), 0, -Math.cos(turned));
  d.facing = turned;
}

/** How long its pounce `move` flies (s). */
export function leapAir(move: number): number {
  const v = DINO.v;
  return move === FEINT ? v.feintAir : move === WALL ? v.wallAir : move === LUNGE ? v.lungeAir : v.pounceAir;
}

/** Off it pounces (the move it's on says how), for the free spot nearest where you stand, landing at `ground`'s height.
 *  False if there's nowhere to land. */
export function startPounce(d: Enemy, player: PlayerState, w: EnemyWorld, ground = d.pos.y): boolean {
  d.aim.y = 0;
  if (!freeSpotNear(w.nav.large, player.pos.x, player.pos.z, d.aim)) return false;
  d.aim.y = ground;
  d.from.copy(d.pos);
  d.facing = yawTo(d, d.aim.x, d.aim.z);
  setPhase(d, 'leap');
  w.events.push('dinoPounce', d.move, d.pos.x, d.pos.y + 1, d.pos.z);
  return true;
}

/** One tick of a pounce. Landed, it hurts you in Pounce reach (or, in its frenzy, a pounce of its own pins you) and
 *  stands ('recover'). */
export function stepPounce(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DINO.v;
  const k = Math.min(1, d.t / leapAir(d.move));
  d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
  d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
  // (Off a wall it drops at you; a lunge stays low; the rest go up and over.)
  const arc = d.move === WALL ? 1 : d.move === LUNGE ? v.pounceArc * 0.4 : v.pounceArc;
  d.pos.y = d.from.y + (d.aim.y - d.from.y) * k + 4 * arc * k * (1 - k);
  if (k < 1) return;
  d.pos.copy(d.aim);
  walk(d, 0, 0, 0, w.nav.large);
  setPhase(d, 'recover');
  w.events.push('dinoLand', d.move, d.pos.x, d.pos.y, d.pos.z);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (player.dead || player.pos.y - d.pos.y > OVER) return;
  const pins = d.stage > 0 && (d.move === POUNCE || d.move === FEINT);
  if (pins && dist <= v.pinReach + radiusOf(d) && player.invuln <= 0) {
    startPin(w, index, player);
    return;
  }
  const damage = d.move === WALL ? v.wallDamage : d.move === LUNGE ? v.lungeDamage : v.pounceDamage;
  if (dist <= v.pounceReach + radiusOf(d) && damagePlayer(player, damage, d.kind)) throwYou(player, d, dx, dz, dist, 12, 7);
}

/** Thrown off it, along (dx, dz) (`dist` long), `shove` hard and `up` into the air. */
export function throwYou(player: PlayerState, d: Enemy, dx: number, dz: number, dist: number, shove: number, up: number) {
  const nx = dist > 1e-3 ? dx / dist : -Math.sin(d.facing);
  const nz = dist > 1e-3 ? dz / dist : -Math.cos(d.facing);
  player.vel.x += nx * shove;
  player.vel.z += nz * shove;
  player.vel.y = Math.max(player.vel.y, up);
  player.grounded = false;
}
