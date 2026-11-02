// Update 0.3.13 — floor 8's machinery (the plan for floors 7–10: "crushers, fire vents, moving floors"), run all the
// time on one clock, each press and vent at its place in its room's beat (world/dungeon/forge.ts), so they go off one
// after another across a room:
//  - a press hangs, then clanks and shudders (its warning: its shadow darkens under it), drops, rests on the floor
//    (solid: you and enemies are pushed off it), and rises again. Landing on you it hurts (Press damage) and throws you
//    out from under it; an enemy under it takes Press on enemies;
//  - a fire vent idles, sputters (its warning), then jets fire: you in it are hurt once a jet (Vent damage) and thrown
//    up out of it; an enemy in it takes Vent on enemies;
//  - a belt carries what stands on it the way it runs: you (as the water drags you), enemies and bodies.
// While an execution, a grab or a pin holds the world, it waits. Its sounds are only for what's near you. Pure.
import { FORGE_KNOBS } from '../../tuning/forge';
import { beltUnder, Forge, PressSpot, VentSpot } from '../../world/dungeon/forge';
import { pushOutOfWalls } from '../../world/navGrid';
import { execHeld } from '../combat/execution';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit } from '../combat/strike';
import { Enemy, isLive, radiusOf } from '../enemies/enemy';
import { ENEMY_STATS, flies } from '../enemies/kinds';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { BODY } from '../player/body';

export type PressBeat = 'hang' | 'warn' | 'drop' | 'rest' | 'rise';
export type VentBeat = 'idle' | 'warn' | 'burn';

export interface Press {
  spot: PressSpot;
  beat: PressBeat;
  /** Its hammer's underside (m over the floor). */
  y: number;
}

export interface Vent {
  spot: VentSpot;
  beat: VentBeat;
  /** This jet has burnt you already; the enemies it has (their slots). */
  burntYou: boolean;
  burnt: number[];
}

export interface Machinery {
  forge: Forge;
  /** The machinery's clock (s): it stands still while the world's held. */
  t: number;
  presses: Press[];
  vents: Vent[];
}

/** A hammer's thickness (m) and how far in from its press's sides it is (the posts stand round it). */
export const HAMMER = 1.4;
export const HAMMER_IN = 0.4;
/** Under this its hammer is in the way (m: pushed off it). */
const SOLID = BODY.height + 0.1;
/** A vent's fire: how far from its middle it reaches (m, the grate's half). */
export const VENT_HALF = 0.8;
/** Its fire throws you up this fast (m/s). */
const VENT_POP = 7;
/** A press throws you out from under it this fast (m/s). */
const PRESS_SHOVE = 5;
/** Only what's this near you is heard (m): a press, a vent. */
const PRESS_EAR = 14;
const VENT_EAR = 10;
/** On the floor (m: feet this low are on a belt). */
const ON_FLOOR = 0.3;

const hit = emptyTargetHit();

export function createMachinery(forge: Forge): Machinery {
  return {
    forge,
    t: 0,
    presses: forge.presses.map((spot) => ({ spot, ...pressAt(spot, 0) })),
    vents: forge.vents.map((spot) => ({ spot, beat: ventAt(spot, 0), burntYou: false, burnt: [] })),
  };
}

/** Where a press is in its beat at the machinery's time `t`: its beat and its hammer's underside. */
export function pressAt(spot: PressSpot, t: number): { beat: PressBeat; y: number } {
  const v = FORGE_KNOBS.v;
  const cycle = v.pressHang + v.pressWarn + v.pressDrop + v.pressRest + v.pressRise;
  let s = (((t + spot.beat * v.pressWave) % cycle) + cycle) % cycle;
  if ((s -= v.pressHang) < 0) return { beat: 'hang', y: v.pressHeight };
  if ((s -= v.pressWarn) < 0) return { beat: 'warn', y: v.pressHeight };
  if ((s -= v.pressDrop) < 0) {
    const k = 1 + s / v.pressDrop;
    return { beat: 'drop', y: v.pressHeight * (1 - k * k) };
  }
  if ((s -= v.pressRest) < 0) return { beat: 'rest', y: 0 };
  const k = (s + v.pressRise) / v.pressRise;
  return { beat: 'rise', y: v.pressHeight * k * k * (3 - 2 * k) };
}

/** Where a vent is in its beat at time `t`. */
export function ventAt(spot: VentSpot, t: number): VentBeat {
  const v = FORGE_KNOBS.v;
  const cycle = v.ventIdle + v.ventWarn + v.ventBurn;
  const s = (((t + spot.beat * v.ventWave) % cycle) + cycle) % cycle;
  return s < v.ventIdle ? 'idle' : s < v.ventIdle + v.ventWarn ? 'warn' : 'burn';
}

/** One tick of the floor's machinery. */
export function stepMachinery(m: Machinery, player: PlayerState, combat: CombatState, dt: number) {
  if (m.presses.length + m.vents.length + m.forge.belts.length === 0) return;
  if (execHeld(combat.exec) || combat.grab.on || combat.pin.on) return;
  m.t += dt;
  for (const p of m.presses) stepPress(p, m.t, player, combat);
  for (const vent of m.vents) stepVent(vent, m.t, player, combat);
  carry(m, player, combat, dt);
}

const near = (player: PlayerState, x: number, z: number, ear: number) => Math.hypot(player.pos.x - x, player.pos.z - z) < ear;

/** Is (x, z) under a press's hammer, `r` round it? */
const under = (s: PressSpot, x: number, z: number, r: number) => Math.abs(x - s.x) < s.w / 2 - HAMMER_IN + r && Math.abs(z - s.z) < s.d / 2 - HAMMER_IN + r;

function stepPress(p: Press, t: number, player: PlayerState, combat: CombatState) {
  const s = p.spot;
  const was = p.beat;
  const now = pressAt(s, t);
  p.beat = now.beat;
  p.y = now.y;
  if (now.beat === 'warn' && was === 'hang' && near(player, s.x, s.z, PRESS_EAR)) combat.events.push('pressWarn', s.w, s.x, p.y + HAMMER, s.z);
  const landed = (now.beat === 'rest' || now.beat === 'rise') && (was === 'drop' || was === 'warn' || was === 'hang');
  if (landed) {
    if (near(player, s.x, s.z, PRESS_EAR)) combat.events.push('pressSlam', Math.max(s.w, s.d), s.x, 0, s.z);
    if (!player.dead && player.pos.y < HAMMER && under(s, player.pos.x, player.pos.z, BODY.radius)) damagePlayer(player, FORGE_KNOBS.v.pressDamage, 'crusher');
    combat.enemies.forEach((e, i) => {
      if (!isLive(e) || flies(e.kind) || e.pos.y > HAMMER || !under(s, e.pos.x, e.pos.z, radiusOf(e))) return;
      hit.kind = 'enemy';
      hit.index = i;
      hit.point.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height / 2, e.pos.z);
      landHit(combat, hit, FORGE_KNOBS.v.pressFoes, 0, 0, 0, 'hitSlam', FORGE_KNOBS.v.pressFoes, true);
    });
  }
  // Down (or low going up): in the way. You, and anything on the ground, out from under it. (Coming down, it lands on
  // what's under it.)
  if (p.y >= SOLID || p.beat === 'drop') return;
  if (!player.dead && player.pos.y < p.y + HAMMER && under(s, player.pos.x, player.pos.z, BODY.radius)) {
    const [dx, dz] = shoveOut(s, player.pos, BODY.radius);
    if (landed) {
      player.vel.x = dx * PRESS_SHOVE;
      player.vel.z = dz * PRESS_SHOVE;
    }
  }
  for (const e of combat.enemies) if (e.alive && !flies(e.kind) && e.pos.y < p.y + HAMMER && under(s, e.pos.x, e.pos.z, radiusOf(e))) shoveOut(s, e.pos, radiusOf(e));
}

/** Out from under a press to its nearest side; the way it went. */
function shoveOut(s: PressSpot, pos: { x: number; z: number }, r: number): [number, number] {
  const hx = s.w / 2 - HAMMER_IN + r;
  const hz = s.d / 2 - HAMMER_IN + r;
  const ox = pos.x - s.x;
  const oz = pos.z - s.z;
  if (hx - Math.abs(ox) < hz - Math.abs(oz)) {
    const sx = ox < 0 ? -1 : 1;
    pos.x = s.x + sx * hx;
    return [sx, 0];
  }
  const sz = oz < 0 ? -1 : 1;
  pos.z = s.z + sz * hz;
  return [0, sz];
}

function stepVent(vent: Vent, t: number, player: PlayerState, combat: CombatState) {
  const s = vent.spot;
  const was = vent.beat;
  vent.beat = ventAt(s, t);
  if (vent.beat === was) {
    if (vent.beat === 'burn') burn(vent, player, combat);
    return;
  }
  if (vent.beat === 'warn' && near(player, s.x, s.z, VENT_EAR)) combat.events.push('ventWarn', 0, s.x, 0, s.z);
  if (vent.beat !== 'burn') return;
  vent.burntYou = false;
  vent.burnt.length = 0;
  if (near(player, s.x, s.z, VENT_EAR)) combat.events.push('ventBurst', 0, s.x, 0, s.z);
  burn(vent, player, combat);
}

/** Its fire: you and enemies in it, once a jet. */
function burn(vent: Vent, player: PlayerState, combat: CombatState) {
  const v = FORGE_KNOBS.v;
  const s = vent.spot;
  const reach = VENT_HALF + BODY.radius;
  if (!vent.burntYou && !player.dead && player.pos.y < v.ventHeight && Math.abs(player.pos.x - s.x) < reach && Math.abs(player.pos.z - s.z) < reach) {
    vent.burntYou = true;
    if (damagePlayer(player, v.ventDamage, 'vent')) {
      player.vel.y = Math.max(player.vel.y, VENT_POP);
      player.grounded = false;
    }
  }
  combat.enemies.forEach((e, i) => {
    const r = VENT_HALF + radiusOf(e);
    if (!isLive(e) || vent.burnt.includes(i) || e.pos.y > v.ventHeight || Math.abs(e.pos.x - s.x) > r || Math.abs(e.pos.z - s.z) > r) return;
    vent.burnt.push(i);
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height / 2, e.pos.z);
    landHit(combat, hit, v.ventFoes, 0, 0, 0, 'hitSlam', v.ventFoes, true);
  });
}

/** The belts: you (as a current, through the walls' collision), enemies and bodies on the ground. */
function carry(m: Machinery, player: PlayerState, combat: CombatState, dt: number) {
  if (m.forge.belts.length === 0) return;
  const speed = FORGE_KNOBS.v.beltSpeed;
  const mine = player.grounded && player.pos.y < ON_FLOOR ? beltUnder(m.forge, player.pos.x, player.pos.z) : null;
  if (mine) {
    player.current.x += mine.dx * speed;
    player.current.z += mine.dz * speed;
  }
  for (const e of combat.enemies) {
    if (!riding(e)) continue;
    const b = beltUnder(m.forge, e.pos.x, e.pos.z);
    if (!b) continue;
    e.pos.x += b.dx * speed * dt;
    e.pos.z += b.dz * speed * dt;
    pushOutOfWalls(combat.nav[ENEMY_STATS[e.kind]().size], e.pos, radiusOf(e));
  }
}

/** On the ground where a belt can take it: a walker or a body, not one held, perched or in the air. */
const riding = (e: Enemy) => e.alive && !flies(e.kind) && e.phase !== 'held' && e.perch <= 0 && e.pos.y < ON_FLOOR && !ENEMY_STATS[e.kind]().boss;
