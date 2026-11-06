// Update 0.2.4 — the Velociraptor's moves once their warning is over (dino.ts picks them and warns).
// Update 0.2.8 — its charge (the Demon's run with its own numbers, steering after you as it goes; a wall or a column stuns it) and its
// pounces; landing on you in phase 2 it pins you (pin.ts).
// Update 0.3.60 — by the Boss Design Bible, "Trust your ears" (spec MD_UPDATES/U0360_VELOCIRAPTOR_BIBLE.md): its Sickle Pounce. It
// crouches and hisses; in the air it turns after you for the first of its flight, so dodge late; missed, it skids and is open. Here too,
// which move is which and what they share. Its Stalk & Ambush, Tail Lash, Pack Call and Feint: dinoHunt.ts. Its Apex Hunt: dinoApex.ts.
// Its wall launch, sand kick, sandstorm, screech and blitz are gone. Pure.
import { DINO } from '../../tuning/dino';
import { startPin } from '../combat/pin';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import type { ChargeSpec } from './charge';
import { Enemy, EnemyWorld, radiusOf, setPhase, walk, yawTo } from './enemy';

/** Which move (Enemy.move): the ones it picks, then the ones that follow from them (coming out of hiding, its lunge, a bite while it
 *  pins you, its roar as phase 2 starts). */
export const CHARGE = 0;
export const SICKLE = 1;
export const TAIL = 2;
export const AMBUSH = 3;
export const PACK = 4;
export const FEINT = 5;
export const APEX = 6;
export const EMERGE = 7;
export const LUNGE = 8;
export const BITE = 9;
export const ROAR = 10;
/** Landing this far over you (m), it hasn't caught you. */
const OVER = 2.5;
/** Unseen, it's this far under the floor: out of reach of every blow, not drawn. */
export const HIDDEN_AT = -6;

const SPEC: ChargeSpec = { speed: 0, range: 0, damage: 0, shove: 0, height: 0 };

/** How much quicker it is in phase 2. */
export const dinoPace = (d: Enemy) => (d.stage > 0 ? DINO.v.frenzyPace : 1);

/** It's gone: only your ears can find it. */
export const hiddenDino = (d: Enemy) => d.kind === 'dino' && d.pos.y <= HIDDEN_AT * 0.5;

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
  return move === LUNGE ? v.lungeAir : v.pounceAir;
}

/** Off it pounces (the move it's on says how), for the free spot nearest where you stand, landing at `ground`'s height.
 *  False if there's nowhere to land. */
export function startPounce(d: Enemy, player: PlayerState, w: EnemyWorld, ground = 0): boolean {
  d.aim.y = 0;
  if (!freeSpotNear(w.nav.large, player.pos.x, player.pos.z, d.aim)) return false;
  d.aim.y = ground;
  d.from.copy(d.pos);
  d.facing = yawTo(d, d.aim.x, d.aim.z);
  setPhase(d, 'leap');
  w.events.push('dinoPounce', d.move, d.pos.x, d.pos.y + 1, d.pos.z);
  return true;
}

/** One tick of a pounce: a Sickle Pounce's landing turns after you for the first of its flight (dodge too early and it follows). Landed,
 *  it hurts you in Pounce reach (in phase 2 a Sickle Pounce pins you) and stands; a Sickle Pounce that misses skids on, open. */
export function stepPounce(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DINO.v;
  const air = leapAir(d.move);
  const k = Math.min(1, d.t / air);
  if (d.move === SICKLE && k < v.correctFor) {
    const dx = player.pos.x - d.aim.x;
    const dz = player.pos.z - d.aim.z;
    const off = Math.hypot(dx, dz);
    if (off > 1e-3) {
      const step = Math.min(off, v.correctSpeed * dt);
      d.aim.x += (dx / off) * step;
      d.aim.z += (dz / off) * step;
    }
  }
  d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
  d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
  // (A lunge stays low; a pounce goes up and over.)
  const arc = d.move === LUNGE ? v.pounceArc * 0.4 : v.pounceArc;
  d.pos.y = d.from.y + (d.aim.y - d.from.y) * k + 4 * arc * k * (1 - k);
  if (k < 1) return;
  d.pos.copy(d.aim);
  walk(d, 0, 0, 0, w.nav.large);
  w.events.push('dinoLand', d.move, d.pos.x, d.pos.y, d.pos.z);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  const over = player.pos.y - d.pos.y > OVER;
  const landed = !player.dead && !over && dist <= v.pounceReach + radiusOf(d) && player.invuln <= 0;
  if (d.move === SICKLE && !landed) {
    // Missed: it skids on, open.
    const fx = -Math.sin(d.facing);
    const fz = -Math.cos(d.facing);
    d.vel.x += fx * v.skidSlide;
    d.vel.z += fz * v.skidSlide;
    setPhase(d, 'stun');
    w.events.push('dinoSkid', index, d.pos.x, d.pos.y + 0.3, d.pos.z);
    return;
  }
  setPhase(d, 'recover');
  if (!landed) return;
  if (d.stage > 0 && d.move === SICKLE && dist <= v.pinReach + radiusOf(d)) {
    startPin(w, index, player);
    return;
  }
  const damage = d.move === LUNGE ? v.lungeDamage : v.pounceDamage;
  if (damagePlayer(player, damage, d.kind)) throwYou(player, d, dx, dz, dist, 12, 7);
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
