// Update 0.3.50 — the Dragon's show (the designer: "We also need an intro"; at Tidebreaker's quality): its own beats in place
// of the portal's (bossRoom.ts). You've stepped into the walled-off end of its courtyard. It comes in over your head from
// behind, huge and fast, and away over the far wall (`dragonPass`). It circles the courtyard breathing fire on its walls
// (`dragonFireRun`, `dragonWallBurst`): they're driven back to the whole room behind a ring of flame, and passing each
// corner it knocks the crown off the tower there (`dragonTowerBurst`). It climbs straight up over the middle, then dives
// head first, its shadow growing on the floor, slowed while its name shows: the Dive Bomb you'll have to read in its second
// phase. It strikes the middle (`dragonLand`: a ring, the whole place shaking, a crater), staggers, rears up and screams
// fire at the sky (`dragonScream`); then the fight. Its path is a pure function of the show's time, so the views and the
// skip agree. Its views: engine/boss/dragonCinema.ts, dragonShowView.ts. Pure.
import { Vector3 } from 'three';
import { BOSS } from '../../tuning/boss';
import { DRAGON } from '../../tuning/dragon';
import type { DungeonLevel, Rect } from '../../world/dungeon/assemble';
import { startQuake } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { INTRO_DIVE, INTRO_FLY, INTRO_LAND, INTRO_LAP, INTRO_RISE, INTRO_SCREAM } from '../enemies/dragonMoves';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import type { PlayerState } from '../player/state';
import type { BossRun } from './bossRoom';

/** The show's beats, in seconds from stepping in (the run's time, slowed or not). */
export interface DragonBeats {
  pull: number;
  passFrom: number;
  /** It's over your head. */
  overhead: number;
  passTo: number;
  lapFrom: number;
  lapTo: number;
  riseFrom: number;
  diveFrom: number;
  slowFrom: number;
  slowTo: number;
  impact: number;
  screamAt: number;
  end: number;
}

const BEATS: DragonBeats = { pull: 0, passFrom: 0, overhead: 0, passTo: 0, lapFrom: 0, lapTo: 0, riseFrom: 0, diveFrom: 0, slowFrom: 0, slowTo: 0, impact: 0, screamAt: 0, end: 0 };
/** The view tilts up off your eyes this long (s); it comes in this far behind the middle past the room's edge, and away
 *  this far past the far side (m); this share through its pass, it's over your head; it starts this high and clears the
 *  walls by this much overhead. */
const PULL = 0.7;
const PASS_BEHIND = 50;
const PASS_AWAY = 45;
const PASS_OVERHEAD = 0.34;
const PASS_LOW = 15;
const PASS_RISE = 60;
/** It circles this far out past the walls (m), this high (m), easing onto its circle over this share of its lap. */
const LAP_OUT = 12;
const LAP_UP = 24;
const LAP_EASE = 0.14;
/** It climbs this high (m). */
export const CLIMB = 70;
/** Slowed this share of the way down its dive, to this; it staggers this long after it strikes (s); its landing's ring
 *  this far (m). */
const SLOW_SHARE: readonly [number, number] = [0.5, 0.86];
const STAGGER = 0.6;
const LAND_RING = 48;
/** Blows along the walls in its lap. */
export const WALL_BURSTS = 14;

export function dragonBeats(): DragonBeats {
  const v = DRAGON.v;
  const b = BEATS;
  b.pull = PULL;
  b.passFrom = PULL - 0.25;
  b.passTo = b.passFrom + v.showPass;
  b.overhead = b.passFrom + v.showPass * PASS_OVERHEAD;
  b.lapFrom = b.passTo;
  b.lapTo = b.lapFrom + v.showLap;
  b.riseFrom = b.lapTo;
  b.diveFrom = b.riseFrom + v.showRise;
  b.impact = b.diveFrom + v.showDive;
  b.slowFrom = b.diveFrom + v.showDive * SLOW_SHARE[0];
  b.slowTo = b.diveFrom + v.showDive * SLOW_SHARE[1];
  b.screamAt = b.impact + STAGGER;
  b.end = b.impact + v.showRoar;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** Into the room from the wall you came in by, and across it (unit, on the floor). */
export function showAxes(entrance: DungeonLevel['boss']['entrance'], fwd: { x: number; z: number }, right: { x: number; z: number }) {
  fwd.x = entrance === 'w' ? 1 : entrance === 'e' ? -1 : 0;
  fwd.z = entrance === 'n' ? 1 : entrance === 's' ? -1 : 0;
  right.x = -fwd.z;
  right.z = fwd.x;
}

/** How far its walls have been driven back (0..1), through its lap. */
export function dragonWalls(t: number): number {
  const s = dragonBeats();
  return smooth((t - s.lapFrom - 0.25) / Math.max(0.1, s.lapTo - s.lapFrom - 0.5));
}

/** How far round its lap it is (0..1). */
export const lapShare = (t: number) => {
  const s = dragonBeats();
  return Math.max(0, Math.min(1, (t - s.lapFrom) / Math.max(0.1, s.lapTo - s.lapFrom)));
};

/** The way from the middle `share` round its lap: (along, across) as a turn. */
export const lapAngle = (share: number) => share * Math.PI * 2;

/** When it passes each corner, the tower there (0..3 in the order of towerMids from `entrance`'s axes: see `towerAt`). */
export const towerTimes = (): number[] => {
  const s = dragonBeats();
  return [0.125, 0.375, 0.625, 0.875].map((u) => s.lapFrom + u * (s.lapTo - s.lapFrom));
};

/** Where the corner its lap passes `k`th is (m). */
export function cornerAt(level: DungeonLevel, k: number, out: { x: number; z: number }) {
  const p = level.boss.portal;
  const e = level.boss.end;
  const half = (e.max.x - e.min.x) / 2 - 4;
  const a = lapAngle(0.125 + k * 0.25);
  showAxes(level.boss.entrance, fwd, right);
  const c = Math.cos(a) >= 0 ? 1 : -1;
  const d = Math.sin(a) >= 0 ? 1 : -1;
  out.x = p.x + (fwd.x * c + right.x * d) * half;
  out.z = p.z + (fwd.z * c + right.z * d) * half;
  return out;
}

const fwd = { x: 0, z: 0 };
const right = { x: 0, z: 0 };

/** Where it is `t` s in. */
export interface DragonPose {
  x: number;
  y: number;
  z: number;
  /** Which way it faces (0: −z). */
  yaw: number;
  move: number;
}
export const dragonPose = (): DragonPose => ({ x: 0, y: 0, z: 0, yaw: 0, move: INTRO_FLY });

const yawOf = (dx: number, dz: number) => Math.atan2(-dx, -dz);

/** Where it is `t` s into the show, into `out`; `eye`: where you are (it faces you once it's down). */
export function dragonAt(level: DungeonLevel, t: number, eye: { x: number; z: number }, out: DragonPose): DragonPose {
  const s = dragonBeats();
  const b = level.boss;
  const p = b.portal;
  const half = (b.end.max.x - b.end.min.x) / 2;
  showAxes(b.entrance, fwd, right);
  if (t < s.passTo) {
    const u = Math.max(0, (t - s.passFrom) / Math.max(0.1, s.passTo - s.passFrom));
    const along = -(half + PASS_BEHIND) + (2 * half + PASS_BEHIND + PASS_AWAY) * u;
    out.x = p.x + fwd.x * along;
    out.z = p.z + fwd.z * along;
    out.y = PASS_LOW + PASS_RISE * (u - PASS_OVERHEAD) * (u - PASS_OVERHEAD);
    out.yaw = yawOf(fwd.x, fwd.z);
    out.move = INTRO_FLY;
    return out;
  }
  const r = half + LAP_OUT;
  if (t < s.riseFrom) {
    const u = lapShare(t);
    const a = lapAngle(u);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const cx = p.x + (fwd.x * ca + right.x * sa) * r;
    const cz = p.z + (fwd.z * ca + right.z * sa) * r;
    // Onto its circle, from where its pass left it.
    const e = smooth(u / LAP_EASE);
    const ex = p.x + fwd.x * (half + PASS_AWAY);
    const ez = p.z + fwd.z * (half + PASS_AWAY);
    const ey = PASS_LOW + PASS_RISE * (1 - PASS_OVERHEAD) * (1 - PASS_OVERHEAD);
    out.x = ex + (cx - ex) * e;
    out.z = ez + (cz - ez) * e;
    out.y = ey + (LAP_UP - ey) * e;
    out.yaw = yawOf(right.x * ca - fwd.x * sa, right.z * ca - fwd.z * sa);
    out.move = INTRO_LAP;
    return out;
  }
  const faced = yawOf(eye.x - p.x, eye.z - p.z);
  if (t < s.diveFrom) {
    // Straight up over the middle.
    const k = smooth((t - s.riseFrom) / Math.max(0.1, s.diveFrom - s.riseFrom));
    out.x = p.x + fwd.x * r * (1 - k);
    out.z = p.z + fwd.z * r * (1 - k);
    out.y = LAP_UP + (CLIMB - LAP_UP) * k;
    out.yaw = faced;
    out.move = INTRO_RISE;
    return out;
  }
  out.x = p.x;
  out.z = p.z;
  out.yaw = faced;
  if (t < s.impact) {
    const u = (t - s.diveFrom) / Math.max(0.1, s.impact - s.diveFrom);
    out.y = CLIMB * (1 - u * u);
    out.move = INTRO_DIVE;
    return out;
  }
  out.y = 0;
  out.move = t < s.screamAt ? INTRO_LAND : INTRO_SCREAM;
  return out;
}

/** Where a ray from the middle along (dx, dz) leaves `rect` (m along it). */
export function rectReach(rect: Rect, px: number, pz: number, dx: number, dz: number): number {
  const tx = dx > 1e-6 ? (rect.max.x - px) / dx : dx < -1e-6 ? (rect.min.x - px) / dx : Infinity;
  const tz = dz > 1e-6 ? (rect.max.z - pz) / dz : dz < -1e-6 ? (rect.min.z - pz) / dz : Infinity;
  return Math.max(0, Math.min(tx, tz));
}

/** The room's walls as far as they've been driven back `k` (0..1), into `out`. */
export function wallsAt(start: Rect, end: Rect, k: number, out: Rect): Rect {
  out.min.x = start.min.x + (end.min.x - start.min.x) * k;
  out.min.z = start.min.z + (end.min.z - start.min.z) * k;
  out.max.x = start.max.x + (end.max.x - start.max.x) * k;
  out.max.z = start.max.z + (end.max.z - start.max.z) * k;
  return out;
}

const pose = dragonPose();
const spot = new Vector3();
const corner = { x: 0, z: 0 };
const walls: Rect = { min: { x: 0, z: 0 }, max: { x: 0, z: 0 } };

/** The fire's spot on the walls `t` s in, into `out` (on the floor). */
export function fireSpot(level: DungeonLevel, t: number, out: Vector3): Vector3 {
  const b = level.boss;
  showAxes(b.entrance, fwd, right);
  const a = lapAngle(lapShare(t));
  const dx = fwd.x * Math.cos(a) + right.x * Math.sin(a);
  const dz = fwd.z * Math.cos(a) + right.z * Math.sin(a);
  const far = rectReach(wallsAt(b.start, b.end, dragonWalls(t), walls), b.portal.x, b.portal.z, dx, dz);
  return out.set(b.portal.x + dx * far, 0.5, b.portal.z + dz * far);
}

/** One tick of its show (bossRoom.ts's 'intro', for the Dragon); done, the fight. `dt`: this tick's time. */
export function stepDragonIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const s = dragonBeats();
  const ev = combat.events;
  const before = b.t - dt;
  const crossed = (t: number) => before < t && b.t >= t;
  const p = level.boss.portal;
  dragonAt(level, b.t, player.pos, pose);
  if (b.slot < 0 && b.t >= s.passFrom) {
    b.slot = spawnEnemy(combat.enemies, 'dragon', spot.set(pose.x, pose.y, pose.z), pose.yaw);
    if (b.slot >= 0) {
      const d = combat.enemies[b.slot];
      setPhase(d, 'intro');
      // Its home, where its core will bring it: the room's middle.
      d.from.set(p.x, 0, p.z);
    }
  }
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  if (boss) {
    boss.pos.set(pose.x, pose.y, pose.z);
    boss.prev.copy(boss.pos);
    boss.vel.set(0, 0, 0);
    boss.facing = pose.yaw;
    if (boss.move !== pose.move) {
      boss.move = pose.move;
      boss.t = 0;
    }
    if (pose.move === INTRO_LAP) fireSpot(level, b.t, boss.aim);
  }
  if (crossed(s.overhead)) ev.push('dragonPass', b.slot, player.pos.x, 8, player.pos.z);
  if (crossed(s.lapFrom)) ev.push('dragonFireRun', b.slot, p.x, 10, p.z);
  for (let i = 0; i < WALL_BURSTS; i++) {
    const at = s.lapFrom + ((s.lapTo - s.lapFrom) * (i + 0.5)) / WALL_BURSTS;
    if (!crossed(at)) continue;
    fireSpot(level, at, spot);
    ev.push('dragonWallBurst', i, spot.x, 1, spot.z);
  }
  towerTimes().forEach((at, k) => {
    if (!crossed(at)) return;
    cornerAt(level, k, corner);
    ev.push('dragonTowerBurst', k, corner.x, 12, corner.z);
  });
  if (crossed(s.diveFrom)) ev.push('dragonDive', b.slot, p.x, CLIMB, p.z);
  if (crossed(s.impact)) {
    ev.push('dragonLand', LAND_RING, p.x, 0.1, p.z);
    startQuake(combat.quakes, p.x, 0, p.z, 24, LAND_RING, 0, BOSS.v.quakeClear, 'dragon');
  }
  if (crossed(s.screamAt)) ev.push('dragonScream', b.slot, p.x, DRAGON.v.dragonHeight * 0.8, p.z);
  if (b.t < s.end || !boss) return;
  boss.pos.y = 0;
  boss.move = 0;
  setPhase(boss, 'chase');
  boss.cooldown = 1;
  b.beat = 'fight';
  b.t = 0;
}

/** The run's time through its dive: slowed (easing in and out) while its name shows. 1: not slowed. */
export function dragonSlow(b: BossRun): number {
  if (b.kind !== 'dragon' || !b.ownShow || b.beat !== 'intro') return 1;
  const s = dragonBeats();
  const ease = 0.12;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - DRAGON.v.showSlow) * Math.max(0, k);
}
