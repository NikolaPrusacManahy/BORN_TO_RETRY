// Update 0.3.14 — floor 6's powder kegs (the plan, MD/FLOOR6_PIRATE_PLAN.md: "barrels that blow up when hit (a punch,
// a throw, … another keg)"): a keg goes up when a punch of yours lands on it, a slam lands by it, a body is thrown into
// it, or another keg's blast reaches it (a moment later: Keg chain). Its blast hurts you and enemies, the more the
// nearer (half at its edge), throws you out, and flings the bodies it kills. (Its cannons are gone: the designer, "they
// are far far unmanagable on fast gameplay".) While an execution, a grab or a pin holds the world, it waits.
// Update 0.3.15 — and the Bomber's powder bombs (combat/bombs.ts): a punch bats one (in the air or burning on the
// ground) back at the nearest Bomber, to blow where it lands; a powder bomb's blast hurts enemies too (Bomb on enemies)
// and lights the kegs in it. Pure.
import { Vector3 } from 'three';
import { COVE_KNOBS } from '../../tuning/cove';
import { FOES_COVE } from '../../tuning/foesCove';
import { LAUNCH } from '../../tuning/launch';
import type { Cove, KegSpot } from '../../world/dungeon/cove';
import { execHeld } from '../combat/execution';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit } from '../combat/strike';
import { isLive, radiusOf } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import { launch } from '../enemies/flight';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';

export interface Keg {
  spot: KegSpot;
  state: 'whole' | 'lit' | 'gone';
  /** Its fuse (s), lit. */
  t: number;
}

export interface Powder {
  /** Its clock (s): it stands still while the world's held. */
  t: number;
  kegs: Keg[];
}

/** A slam sets off kegs this near (m); a body thrown at least Splat speed, this near. A batted bomb flies this long
 *  (s); with no Bomber left, this far ahead (m). */
const SLAM_REACH = 3.5;
const THROWN_REACH = 1.3;
const BATTED = 0.45;
const BAT_AHEAD = 9;

const hit = emptyTargetHit();

export const createPowder = (cove: Cove): Powder => ({ t: 0, kegs: cove.kegs.map((spot) => ({ spot, state: 'whole', t: 0 })) });

/** One tick of the floor's powder kegs. */
export function stepPowder(b: Powder, player: PlayerState, combat: CombatState, dt: number) {
  if (execHeld(combat.exec) || combat.grab.on || combat.pin.on) return;
  b.t += dt;
  sparks(b, player, combat);
  bombBlasts(b, combat);
  for (const k of b.kegs) {
    if (k.state !== 'lit' || (k.t -= dt) > 0) continue;
    blast(b, k, player, combat);
  }
}

/** A keg's fuse lit: it goes up in `fuse` s (a lit one keeps the shorter). */
export function light(k: Keg, fuse: number) {
  if (k.state === 'gone') return;
  k.t = k.state === 'lit' ? Math.min(k.t, fuse) : fuse;
  k.state = 'lit';
}

/** What sets kegs off this tick: a punch of yours in front of you, a slam's landing, a body thrown into one. */
function sparks(b: Powder, player: PlayerState, combat: CombatState) {
  const v = COVE_KNOBS.v;
  let punched = false;
  for (let i = 0; i < combat.events.length; i++) {
    const k = combat.events.at(i).kind;
    if (k === 'jabL' || k === 'jabR' || k === 'heavy') punched = true;
  }
  let slammed = false;
  for (let i = 0; i < player.events.length; i++) if (player.events.at(i).kind === 'slamLand') slammed = true;
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  if (punched) batBombs(player, combat, fx, fz);
  for (const k of b.kegs) {
    if (k.state !== 'whole') continue;
    const dx = k.spot.x - player.pos.x;
    const dz = k.spot.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (punched && d < v.punchReach && (dx * fx + dz * fz) / Math.max(d, 1e-6) > 0.3) light(k, 0);
    else if (slammed && d < SLAM_REACH) light(k, 0);
    else if (combat.enemies.some((e) => e.alive && Math.hypot(e.vel.x, e.vel.z) >= LAUNCH.v.splatSpeed && Math.hypot(e.pos.x - k.spot.x, e.pos.z - k.spot.z) < THROWN_REACH)) light(k, 0);
  }
}

/** It goes up: you and enemies in its reach hurt (half at its edge) and thrown out; the kegs in it lit. */
function blast(b: Powder, k: Keg, player: PlayerState, combat: CombatState) {
  const v = COVE_KNOBS.v;
  const { x, z } = k.spot;
  k.state = 'gone';
  combat.events.push('kegBlast', b.kegs.indexOf(k), x, 0.6, z);
  const share = (d: number) => 1 - 0.5 * Math.min(1, d / v.kegReach);
  const dp = Math.hypot(player.pos.x - x, player.pos.z - z);
  if (!player.dead && dp < v.kegReach && player.pos.y < 3 && damagePlayer(player, v.kegDamage * share(dp), 'keg')) {
    const out = Math.max(dp, 1e-3);
    player.vel.x += ((player.pos.x - x) / out) * v.kegKnock;
    player.vel.z += ((player.pos.z - z) / out) * v.kegKnock;
    player.vel.y = Math.max(player.vel.y, v.kegKnock * 0.5);
    player.grounded = false;
  }
  hurtFoes(combat, x, z, v.kegReach, v.kegFoes, v.kegKnock);
  lightNear(b, x, z, v.kegReach);
}

/** The enemies in a blast (at x, z; this reach) hurt, the more the nearer (half at its edge); those it kills flung. */
function hurtFoes(combat: CombatState, x: number, z: number, reach: number, damage: number, knock: number) {
  combat.enemies.forEach((e, i) => {
    const d = Math.hypot(e.pos.x - x, e.pos.z - z);
    if (!isLive(e) || d > reach + radiusOf(e) || ENEMY_STATS[e.kind]().boss) return;
    const ox = d > 1e-3 ? (e.pos.x - x) / d : 1;
    const oz = d > 1e-3 ? (e.pos.z - z) / d : 0;
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height / 2, e.pos.z);
    if (landHit(combat, hit, damage * (1 - 0.5 * Math.min(1, d / reach)), knock, ox, oz, 'hitThrown', damage, true)) launch(e, ox, oz);
  });
}

/** The whole kegs in a blast lit (a moment later). */
function lightNear(b: Powder, x: number, z: number, reach: number) {
  for (const o of b.kegs) if (o.state === 'whole' && Math.hypot(o.spot.x - x, o.spot.z - z) < reach) light(o, COVE_KNOBS.v.kegChain);
}

const target = new Vector3();

/** A punch bats the powder bombs in front of you or at your feet (in the air or burning on the ground) back at the
 *  nearest Bomber. */
function batBombs(player: PlayerState, combat: CombatState, fx: number, fz: number) {
  const reach = COVE_KNOBS.v.punchReach;
  for (const bomb of combat.bombs) {
    if (!bomb.alive || bomb.look !== 'powder') continue;
    const dx = bomb.pos.x - player.pos.x;
    const dz = bomb.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > reach || Math.abs(bomb.pos.y - player.pos.y - 1) > 1.6 || (d > 1 && (dx * fx + dz * fz) / d < 0.3)) continue;
    let best = Infinity;
    target.set(player.pos.x + fx * BAT_AHEAD, player.pos.y, player.pos.z + fz * BAT_AHEAD);
    for (const e of combat.enemies) {
      const dd = Math.hypot(e.pos.x - bomb.pos.x, e.pos.z - bomb.pos.z);
      if (e.kind !== 'bomber' || !isLive(e) || dd >= best) continue;
      best = dd;
      target.set(e.pos.x, e.pos.y, e.pos.z);
    }
    bomb.from.copy(bomb.pos);
    bomb.to.copy(target);
    bomb.t = 0;
    bomb.fall = BATTED;
    bomb.fuse = 0;
    combat.events.push('bombBatted', 0, bomb.pos.x, bomb.pos.y, bomb.pos.z);
  }
}

/** A powder bomb's blast this tick: enemies in it hurt, kegs in it lit. */
function bombBlasts(b: Powder, combat: CombatState) {
  const v = FOES_COVE.v;
  for (let i = 0; i < combat.events.length; i++) {
    const ev = combat.events.at(i);
    if (ev.kind !== 'powderBlast') continue;
    hurtFoes(combat, ev.x, ev.z, ev.value, v.bombFoes, COVE_KNOBS.v.kegKnock);
    lightNear(b, ev.x, ev.z, ev.value);
  }
}
