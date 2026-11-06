// Update 0.3.72 — the Playable Demon's fire (enemy_bibles/Born to Retry — Playable Demon.docx; the designer: "continue phase 2"): what its
// moves leave behind them. Its overhead's short wall of fire on the floor; its Ember Wave, a flaming crescent, the only thing it
// throws; its Brand of Ruin, pillars erupting outward along lines, from a sword planted or from a dive (the higher the fall,
// the more lines and the wider they go). The boss's own moves, hurting what's in front of you instead. Pure.
import { Vector3 } from 'three';
import { DEMON } from '../../tuning/demon';
import { SLAM } from '../../tuning/movement';
import { wallBetween } from '../../world/navGrid';
import type { CollisionWorld } from '../collisionWorld';
import { launch } from '../enemies/flight';
import type { CombatState } from './state';
import { isHot } from './heat';
import { landHit } from './strike';
import { sweepTargets, targetId } from './sweep';

export interface FireWall {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  /** The floor it burns on, seconds left of it, and till it burns again. */
  y: number;
  left: number;
  burn: number;
}

export interface EmberWave {
  pos: Vector3;
  dir: Vector3;
  /** Seconds left of it, and what it's been through. */
  life: number;
  struck: Set<string>;
}

export interface BrandFire {
  x: number;
  y: number;
  z: number;
  /** The first line's direction (rad), its lines, how many steps along each, how far apart. */
  a: number;
  spokes: number;
  steps: number;
  step: number;
  /** Seconds since it was planted, before it erupts, and the steps done so far. */
  t: number;
  warn: number;
  done: number;
  damage: number;
  /** A line that's met a wall stops; each thing burns once. */
  stopped: boolean[];
  struck: Set<string>;
}

/** Update 0.3.73 — Last Verdict's slash, for its view and how far it's got: from where, how far out (m), and how much longer it shows (s). */
export interface Cleave {
  x: number;
  y: number;
  z: number;
  r: number;
  left: number;
}

export interface DemonFire {
  walls: FireWall[];
  waves: EmberWave[];
  brands: BrandFire[];
  cleave: Cleave | null;
}

export const createDemonFire = (): DemonFire => ({ walls: [], waves: [], brands: [], cleave: null });

/** At most so many at once (the oldest goes). */
const MAX_WALLS = 4;
const MAX_WAVES = 4;
const MAX_BRANDS = 2;
/** A wall burns what's this far off its line (m), and this high over its floor. */
const WALL_WIDE = 0.9;
const WALL_OVER = 2.6;
/** Pillars reach this high over their floor (m); a line's first step is this far out. */
const PILLAR_OVER = 5;
const PILLAR_FROM = 1.6;
/** Its lines at their fewest and shortest, a plunge's at the most and at what fall it gets there (m past Slam height). */
const PLUNGE_MIN = { spokes: 6, steps: 4, step: 1.8 };
const PLUNGE_MAX = { spokes: 12, steps: 10, step: 2.6 };
const PLUNGE_FULL = 12;

const way = new Vector3();
const next = new Vector3();
const DOWN = new Vector3(0, -1, 0);
const at = { x: 0, z: 0 };

const lastN = <T>(list: T[], n: number) => {
  while (list.length > n) list.shift();
};

/** The overhead's blow leaves its wall on the floor ahead, across your way. */
export function leaveWall(state: CombatState, eye: Vector3, dir: Vector3, world: CollisionWorld) {
  const v = DEMON.v;
  const flat = Math.hypot(dir.x, dir.z) || 1;
  const fx = dir.x / flat;
  const fz = dir.z / flat;
  way.set(fx, 0, fz);
  const ahead = Math.max(0.5, Math.min(v.wallAhead, world.rayDistance(eye, way, v.wallAhead + 0.5) - 0.5));
  const cx = eye.x + fx * ahead;
  const cz = eye.z + fz * ahead;
  next.set(cx, eye.y, cz);
  const y = eye.y - Math.min(world.rayDistance(next, DOWN, 30), 30);
  // (Update 0.3.73 — at high heat, longer.)
  const half = (v.wallLong * (isHot(state) ? v.hotWall : 1)) / 2;
  state.demonFire.walls.push({ ax: cx - fz * half, az: cz + fx * half, bx: cx + fz * half, bz: cz - fx * half, y, left: v.wallFor, burn: 0 });
  lastN(state.demonFire.walls, MAX_WALLS);
  state.events.push('demonWall', 0, cx, y, cz);
}

/** Update 0.3.73 — fire along a line on the floor: a hot Lunge's trail. */
export function leaveBurn(state: CombatState, ax: number, az: number, bx: number, bz: number, y: number) {
  state.demonFire.walls.push({ ax, az, bx, bz, y, left: DEMON.v.wallFor, burn: 0 });
  lastN(state.demonFire.walls, MAX_WALLS);
}

/** Ember Wave: the flaming crescent, from your eye along your aim. */
export function launchWave(state: CombatState, eye: Vector3, dir: Vector3) {
  const v = DEMON.v;
  state.demonFire.waves.push({ pos: eye.clone().addScaledVector(dir, 1), dir: dir.clone(), life: v.waveRange / v.waveSpeed, struck: new Set() });
  lastN(state.demonFire.waves, MAX_WAVES);
  state.events.push('emberWave', 0, eye.x, eye.y, eye.z);
}

/** Brand of Ruin at (x, y, z), its first line along `yaw`. `drop`: how far you fell (0: planted standing). */
export function plantBrand(state: CombatState, x: number, y: number, z: number, yaw: number, drop: number) {
  const v = DEMON.v;
  const k = drop > 0 ? Math.max(0, Math.min(1, (drop - SLAM.v.minHeight) / PLUNGE_FULL)) : 0;
  const lerp = (a: number, b: number) => a + (b - a) * k;
  const b: BrandFire =
    drop > 0
      ? { x, y, z, a: yaw, spokes: Math.round(lerp(PLUNGE_MIN.spokes, PLUNGE_MAX.spokes)), steps: Math.round(lerp(PLUNGE_MIN.steps, PLUNGE_MAX.steps)), step: lerp(PLUNGE_MIN.step, PLUNGE_MAX.step), t: 0, warn: 0, done: 0, damage: lerp(v.brandDamage, v.plungeDamage), stopped: [], struck: new Set() }
      : { x, y, z, a: yaw, spokes: Math.round(v.brandSpokes), steps: Math.round(v.brandSteps), step: v.brandStep, t: 0, warn: v.brandWarn, done: 0, damage: v.brandDamage, stopped: [], struck: new Set() };
  b.stopped = new Array<boolean>(b.spokes).fill(false);
  state.demonFire.brands.push(b);
  lastN(state.demonFire.brands, MAX_BRANDS);
  state.events.push('demonBrand', drop > 0 ? 1 : 0, x, y, z);
}

/** Where step `i` of line `s` of a Brand is. */
export function brandAt(b: BrandFire, s: number, i: number, out: { x: number; z: number }) {
  const a = b.a + (s / b.spokes) * Math.PI * 2;
  const r = PILLAR_FROM + i * b.step;
  out.x = b.x + Math.sin(a) * r;
  out.z = b.z + Math.cos(a) * r;
  return out;
}

/** A step's pillar lasts this long (s; for its view). */
export const PILLAR_FOR = 0.45;
/** When step `i` of a Brand erupts (s after it's planted). */
export const eruptAt = (b: BrandFire, i: number) => b.warn + i * DEMON.v.brandStepT;

const from = new Vector3();
const to = new Vector3();

function stepWalls(state: CombatState, dt: number) {
  const walls = state.demonFire.walls;
  const v = DEMON.v;
  for (let i = walls.length - 1; i >= 0; i--) {
    const f = walls[i];
    f.left -= dt;
    f.burn -= dt;
    if (f.left <= 0) {
      walls.splice(i, 1);
      continue;
    }
    if (f.burn > 0) continue;
    f.burn = v.wallTick;
    from.set(f.ax, f.y + WALL_OVER / 2, f.az);
    to.set(f.bx, f.y + WALL_OVER / 2, f.bz);
    sweepTargets(state, from, to, WALL_WIDE, (t) => {
      // (A burn: no stagger, no dodging it.)
      landHit(state, t, v.wallDamage, 0, 0, 0, 'cardDot', 1, true);
    });
  }
}

function stepWaves(state: CombatState, world: CollisionWorld, dt: number) {
  const waves = state.demonFire.waves;
  const v = DEMON.v;
  for (let i = waves.length - 1; i >= 0; i--) {
    const o = waves[i];
    o.life -= dt;
    const step = v.waveSpeed * dt;
    const wall = world.rayDistance(o.pos, o.dir, step + 0.2);
    next.copy(o.pos).addScaledVector(o.dir, Math.min(step, wall));
    const flat = Math.hypot(o.dir.x, o.dir.z) || 1;
    const fx = o.dir.x / flat;
    const fz = o.dir.z / flat;
    sweepTargets(state, o.pos, next, v.waveWidth, (t) => {
      const id = targetId(t);
      if (o.struck.has(id)) return;
      o.struck.add(id);
      const killed = landHit(state, t, v.waveDamage, v.waveKnock, fx, fz, 'hitSlash', v.waveDamage);
      if (killed && t.kind === 'enemy') launch(state.enemies[t.index], fx, fz);
    });
    o.pos.copy(next);
    if (wall <= step + 0.2 || o.life <= 0) {
      if (wall <= step + 0.2) state.events.push('emberPop', 0, o.pos.x, o.pos.y, o.pos.z);
      waves.splice(i, 1);
    }
  }
}

function stepBrands(state: CombatState, dt: number) {
  const brands = state.demonFire.brands;
  const v = DEMON.v;
  for (let i = brands.length - 1; i >= 0; i--) {
    const b = brands[i];
    b.t += dt;
    while (b.done < b.steps && b.t >= eruptAt(b, b.done)) {
      const k = b.done++;
      let first = true;
      for (let s = 0; s < b.spokes; s++) {
        if (b.stopped[s]) continue;
        brandAt(b, s, k, at);
        if (wallBetween(state.nav.small, b.x, b.z, at.x, at.z)) {
          b.stopped[s] = true;
          continue;
        }
        if (first) state.events.push('demonErupt', k, at.x, b.y, at.z);
        first = false;
        from.set(at.x, b.y, at.z);
        to.set(at.x, b.y + PILLAR_OVER, at.z);
        const sa = b.a + (s / b.spokes) * Math.PI * 2;
        sweepTargets(state, from, to, v.brandRadius, (t) => {
          const id = targetId(t);
          if (b.struck.has(id)) return;
          b.struck.add(id);
          const killed = landHit(state, t, b.damage, v.brandKnock, Math.sin(sa), Math.cos(sa), 'hitSlam', b.damage);
          if (killed && t.kind === 'enemy') launch(state.enemies[t.index], Math.sin(sa), Math.cos(sa));
        });
      }
    }
    if (b.done >= b.steps && b.t >= eruptAt(b, b.steps) + PILLAR_FOR) brands.splice(i, 1);
  }
}

/** One tick of all of it. */
export function stepDemonFire(state: CombatState, world: CollisionWorld, dt: number) {
  const f = state.demonFire;
  if (f.walls.length === 0 && f.waves.length === 0 && f.brands.length === 0) return;
  stepWalls(state, dt);
  stepWaves(state, world, dt);
  stepBrands(state, dt);
}

export function clearDemonFire(f: DemonFire) {
  f.walls.length = 0;
  f.waves.length = 0;
  f.brands.length = 0;
  f.cleave = null;
}

