// Update 0.3.63 — Hellwarden's moves (the Boss Design Bible's Blazing Sword Demon, "The final exam": each echoes a skill you've learnt; spec
// MD_UPDATES/U0363_HELLWARDEN.md). Its Blazing Arc: its blade flares, a wide swing to jump over, and a wall of fire on the floor for 4 s
// that cuts the room (the Frost Roc's: ground or air?); columns in its way are cut through. Its Hellfire Lunge: it goes up in embers, a
// whoosh from the side it'll arrive on, and a thrust: parry it (the Drowned King's and the Velociraptor's). Its Brand of Ruin: its sword in
// the floor, cracks glowing in lines, fire pillars spreading along them: stand in the gaps (Okami's). Its Twin Blade Recall: both blades
// thrown, swinging out and back; parry one and it goes back into it: it's weaker till it fetches it. Pure.
import { Vector3 } from 'three';
import { HELLWARDEN } from '../../tuning/hellwarden';
import { segmentDistance2D } from '../combat/geometry';
import { parryBossBlow } from '../combat/meleeParry';
import { fireRib } from '../combat/orbs';
import { pillarsIn, PillarWorld, snapPillar } from '../combat/pillars';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, walk, yawTo } from './enemy';

/** Which move (Enemy.move): the ones it picks, then what follows them. */
export const ARC = 0;
export const LUNGE = 1;
export const BRAND = 2;
export const ECHOES = 3;
export const TWIN = 4;
export const VERDICT = 5;
export const THRUST = 6;
export const ROAR = 7;
/** Its Arc reaches this far either side of its front (rad). */
export const ARC_HALF = 1.75;
/** A fire wall burns you this far off its line (m), and again after this long (s). */
const WALL_WIDE = 0.9;
const BURN_AGAIN = 0.7;
/** Risen, its Arc swings twice, this long apart (s). */
const ARC_AGAIN = 0.4;
/** Unseen, it's this far under the floor. */
export const HIDDEN_AT = -8;

const from = new Vector3();
const to = new Vector3();

/** Its pace. */
export const paceOf = (e: Enemy) => (e.stage > 0 ? HELLWARDEN.v.ragePace : 1);
/** Its blows' share (weak, with a blade knocked away). */
export const hurtOf = (e: Enemy) => (e.warden && e.warden.weak > 0 ? HELLWARDEN.v.weakShare : 1);
export const hiddenWarden = (e: Enemy) => e.kind === 'hellwarden' && e.pos.y <= HIDDEN_AT * 0.5;

/** One swing of its Arc: you in reach and arc, your feet low: hurt and thrown. Columns in reach are cut. A wall of fire ahead of it. */
export function swingArc(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = HELLWARDEN.v;
  const b = e.warden!;
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  const off = Math.abs(Math.atan2(Math.sin(yawTo(e, player.pos.x, player.pos.z) - e.facing), Math.cos(yawTo(e, player.pos.x, player.pos.z) - e.facing)));
  w.events.push('wardenArc', index, e.pos.x, e.pos.y + 2, e.pos.z);
  if (!player.dead && dist <= v.arcReach && off <= ARC_HALF && player.pos.y - e.pos.y < v.arcOver && damagePlayer(player, v.arcDamage * hurtOf(e), e.kind)) throwYou(player, e, dx, dz, dist, 12, 6);
  // The columns in its way go.
  const pillars = pillarsIn(w);
  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    if (p.broken) continue;
    const d = Math.hypot(p.x - e.pos.x, p.z - e.pos.z);
    const toward = Math.atan2(-(p.x - e.pos.x), -(p.z - e.pos.z));
    const pa = Math.abs(Math.atan2(Math.sin(toward - e.facing), Math.cos(toward - e.facing)));
    if (d <= v.arcReach + 1 && pa <= ARC_HALF) snapPillar(w as unknown as PillarWorld, i, toward);
  }
  if (b.weak > 0) return;
  const fx = -Math.sin(e.facing);
  const fz = -Math.cos(e.facing);
  const cx = e.pos.x + fx * v.wallAhead;
  const cz = e.pos.z + fz * v.wallAhead;
  const half = v.wallLong / 2;
  b.walls.push({ ax: cx - fz * half, az: cz + fx * half, bx: cx + fz * half, bz: cz - fx * half, left: v.wallFor, burn: 0 });
}

/** One tick of its Arc after its first swing (risen, a second). True once it's done. */
export function stepArc(e: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  if (e.stage === 0 || e.shots >= 1) return true;
  if (e.t < ARC_AGAIN / paceOf(e)) return false;
  e.shots = 1;
  e.facing = yawTo(e, player.pos.x, player.pos.z);
  swingArc(e, index, player, w);
  return true;
}

/** Its fire walls, one tick: burning out; you in one, your feet low: burned. */
export function stepWalls(e: Enemy, player: PlayerState, dt: number) {
  const v = HELLWARDEN.v;
  const b = e.warden!;
  for (let i = b.walls.length - 1; i >= 0; i--) {
    const f = b.walls[i];
    f.left -= dt;
    f.burn = Math.max(0, f.burn - dt);
    if (f.left <= 0) {
      b.walls.splice(i, 1);
      continue;
    }
    if (f.burn > 0 || player.dead || player.pos.y >= v.wallOver) continue;
    if (segmentDistance2D(f.ax, f.az, f.bx, f.bz, player.pos.x, player.pos.z) > WALL_WIDE) continue;
    f.burn = BURN_AGAIN;
    damagePlayer(player, v.wallDamage * hurtOf(e), e.kind);
  }
}

/** It goes up in embers, and it's gone. */
export function vanish(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = HELLWARDEN.v;
  w.events.push('wardenVanish', index, e.pos.x, e.pos.y + 2, e.pos.z);
  // Behind you, or to one side (seeded): the whoosh from there says which.
  const a = player.yaw + [Math.PI, Math.PI / 2, -Math.PI / 2][Math.floor(w.rng() * 3)];
  const r = radiusOf(e) + v.lungeOff;
  e.aim.set(player.pos.x - Math.sin(a) * r, 0, player.pos.z - Math.cos(a) * r);
  e.pos.x = e.prev.x = e.aim.x;
  e.pos.z = e.prev.z = e.aim.z;
  e.pos.y = e.prev.y = HIDDEN_AT;
  walk(e, 0, 0, 0, w.nav.large);
  setPhase(e, 'burrow');
  e.move = LUNGE;
  w.events.push('wardenWhoosh', index, e.pos.x, 1.5, e.pos.z);
}

/** It arrives, thrusting: parried, it's open; not, it runs you through. */
export function thrust(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = HELLWARDEN.v;
  e.pos.y = e.prev.y = 0;
  e.facing = yawTo(e, player.pos.x, player.pos.z);
  e.move = THRUST;
  w.events.push('wardenThrust', index, e.pos.x, e.pos.y + 2.5, e.pos.z);
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  if (player.dead || dist > radiusOf(e) + v.lungeReach || player.pos.y - e.pos.y > 4) {
    setPhase(e, 'recover');
    return;
  }
  if (parryBossBlow(player, w, e, index)) {
    if (e.hp <= 0) return;
    setPhase(e, 'stun');
    w.events.push('wardenParried', index, e.pos.x, e.pos.y + 3, e.pos.z);
    return;
  }
  if (damagePlayer(player, v.lungeDamage * hurtOf(e), e.kind)) throwYou(player, e, dx, dz, dist, 13, 6);
  setPhase(e, 'recover');
}

/** Its Brand starts: its sword in the floor, the lines glowing. */
export function plantBrand(e: Enemy, index: number, w: EnemyWorld) {
  e.warden!.brand = { x: e.pos.x, z: e.pos.z, a: w.rng() * Math.PI * 2, t: 0, done: 0 };
  w.events.push('wardenBrand', index, e.pos.x, 0.2, e.pos.z);
  e.move = BRAND;
  setPhase(e, 'dive');
}

/** Where step `i` of line `s` of its Brand erupts. */
export function brandSpot(br: { x: number; z: number; a: number }, s: number, i: number, r0: number, out: { x: number; z: number }) {
  const v = HELLWARDEN.v;
  const n = Math.round(v.brandSpokes);
  const a = br.a + (s / n) * Math.PI * 2;
  const r = r0 + i * v.brandStep;
  out.x = br.x + Math.sin(a) * r;
  out.z = br.z + Math.cos(a) * r;
}

const at = { x: 0, z: 0 };

/** Its Brand, one tick, whatever it's doing: step by step out along its lines. */
export function stepBrand(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = HELLWARDEN.v;
  const b = e.warden!;
  const br = b.brand;
  if (!br) return;
  br.t += dt;
  const steps = Math.round(v.brandSteps);
  const spokes = Math.round(v.brandSpokes);
  const r0 = radiusOf(e) + 1;
  while (br.done < steps && br.t >= v.brandWarn + br.done * v.brandStepT) {
    const i = br.done++;
    brandSpot(br, 0, i, r0, at);
    w.events.push('wardenErupt', i, at.x, 0.2, at.z);
    for (let s = 0; s < spokes; s++) {
      brandSpot(br, s, i, r0, at);
      if (player.dead || Math.hypot(player.pos.x - at.x, player.pos.z - at.z) > v.brandRadius || player.pos.y > 5) continue;
      if (damagePlayer(player, v.brandDamage * hurtOf(e), e.kind)) throwYou(player, e, player.pos.x - at.x, player.pos.z - at.z, 1, 7, 8);
    }
  }
  if (br.done >= steps && br.t >= v.brandWarn + steps * v.brandStepT + 0.4) b.brand = null;
  void index;
}

/** Both its blades go, one each way, out past you and back. */
export function throwBlades(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = HELLWARDEN.v;
  from.set(e.pos.x, e.pos.y + v.height * 0.55, e.pos.z);
  to.set(player.pos.x, Math.max(1.2, player.pos.y + 1), player.pos.z);
  for (const side of [1, -1]) {
    if (!fireRib(w.orbs, from, to, side, v.twinFor / paceOf(e), v.twinWide, v.twinDamage * hurtOf(e), e.kind)) continue;
    const o = w.orbs.find((x) => x.alive && x.look === 'rib' && x.arc === side && x.arcT === 0);
    if (o) o.look = 'blade';
  }
  e.warden!.thrown = true;
  w.events.push('wardenThrow', index, e.pos.x, e.pos.y + 3, e.pos.z);
}

/** Its blades still out (or one on its way back into it). */
export const bladesOut = (w: EnemyWorld) => w.orbs.some((o) => o.alive && o.look === 'blade');

/** A blade you parried has come back into it: it's weaker till it fetches it. */
export function bladeStruck(e: Enemy, index: number, w: EnemyWorld) {
  if (e.warden) e.warden.weak = HELLWARDEN.v.weakFor;
  w.events.push('wardenDisarmed', index, e.pos.x, e.pos.y + 3, e.pos.z);
}
