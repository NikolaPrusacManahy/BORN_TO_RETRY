// Update 0.3.64 — Hellwarden's show (at Tidebreaker's quality; spec MD_UPDATES/U0364_HELLWARDEN_SHOW.md; MD/FLOOR10_HELL_PLAN.md's proposal):
// its own beats in place of the portal's (bossRoom.ts). You've stepped into its throne room. Its walls go back, the void past them and its
// throne over everything. The floor splits along a line straight at you, lava rising in it, and out of it, step by step, it walks up,
// dragging its sword along the stone behind it, sparks flying. It stops. Its sword catches fire. It raises it, slowed while its name shows,
// and brings it down: a ring of fire rolling out, the whole room shaking. It roars; then the fight. Where it is is a pure function of the
// show's time, so the views and the skip agree. Its views: engine/hell/wardenCinema.ts, throneView.ts. Pure.
import { Vector3 } from 'three';
import { BOSS } from '../../tuning/boss';
import { HELLWARDEN } from '../../tuning/hellwarden';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { startQuake } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import type { PlayerState } from '../player/state';
import type { BossRun } from './bossRoom';

/** Where it is in its show (Enemy.move; Enemy.t counts from each): under the floor, walking up, stopped, raising it, its blow, its roar. */
export const SHOW_UNDER = 20;
export const SHOW_WALK = 21;
export const SHOW_DRAG = 22;
export const SHOW_RAISE = 23;
export const SHOW_BLOW = 24;
export const SHOW_ROAR = 25;

export interface WardenBeats {
  pull: number;
  wallsFrom: number;
  wallsTo: number;
  riftFrom: number;
  riftTo: number;
  walkFrom: number;
  walkTo: number;
  igniteAt: number;
  slowFrom: number;
  slowTo: number;
  blowAt: number;
  roarAt: number;
  end: number;
}

const BEATS: WardenBeats = { pull: 0, wallsFrom: 0, wallsTo: 0, riftFrom: 0, riftTo: 0, walkFrom: 0, walkTo: 0, igniteAt: 0, slowFrom: 0, slowTo: 0, blowAt: 0, roarAt: 0, end: 0 };
/** The view lifts off your eyes this long (s); its walls take this long to go back. It's raised this long, slowed. */
const PULL = 0.7;
const WALLS = 1.8;
const HANG = 1;
const TO_ROAR = 0.4;
/** It walks up from this far away from you past its middle (m), to its middle; starting this far under the floor. Steps a second. */
const WALK_FROM = 14;
const UNDER = 6.5;
export const STEPS = 1.4;

export function wardenBeats(): WardenBeats {
  const v = HELLWARDEN.v;
  const b = BEATS;
  b.pull = PULL;
  b.wallsFrom = PULL - 0.1;
  b.wallsTo = b.wallsFrom + WALLS;
  b.riftFrom = b.wallsTo - 0.3;
  b.riftTo = b.riftFrom + v.showRift;
  b.walkFrom = b.riftTo - 0.4;
  b.walkTo = b.walkFrom + v.showWalk;
  b.igniteAt = b.walkTo + 0.1;
  b.slowFrom = b.igniteAt + v.showDrag * 0.6;
  b.slowTo = b.slowFrom + HANG;
  b.blowAt = b.slowTo + v.showDown;
  b.roarAt = b.blowAt + TO_ROAR;
  b.end = b.roarAt + v.showRoar + v.showBack;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** How far its walls have gone back (0..1). */
export function wardenWalls(t: number): number {
  const s = wardenBeats();
  return smooth((t - s.wallsFrom) / Math.max(0.1, s.wallsTo - s.wallsFrom));
}

/** How far the rift's opened (0..1): opening, then closing after its blow. */
export function riftOpen(t: number): number {
  const s = wardenBeats();
  return smooth((t - s.riftFrom) / Math.max(0.1, s.riftTo - s.riftFrom)) * (1 - smooth((t - s.blowAt) / 1.2));
}

/** Where it is, `t` s into its show (feet); (toX, toZ): the way to you from the middle (x, z). */
export function wardenAt(x: number, z: number, t: number, toX: number, toZ: number, out: Vector3): Vector3 {
  const s = wardenBeats();
  const k = smooth((t - s.walkFrom) / Math.max(0.1, s.walkTo - s.walkFrom));
  const back = WALK_FROM * (1 - k);
  // Up the slope of the rift, then level.
  const y = t < s.walkFrom ? -UNDER : -UNDER * (1 - Math.min(1, k * 1.7)) ** 1.2;
  return out.set(x - toX * back, y, z - toZ * back);
}

const spot = new Vector3();

function nextStage(boss: { move: number; t: number }, move: number) {
  boss.move = move;
  boss.t = 0;
}

/** One tick of its show (bossRoom.ts's 'intro', for Hellwarden); done, the fight. `dt`: this tick's time. */
export function stepWardenIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const s = wardenBeats();
  const v = HELLWARDEN.v;
  const ev = combat.events;
  const before = b.t - dt;
  const crossed = (t: number) => before < t && b.t >= t;
  const p = level.boss.portal;
  const d = Math.max(0.1, Math.hypot(player.pos.x - p.x, player.pos.z - p.z));
  const toX = (player.pos.x - p.x) / d;
  const toZ = (player.pos.z - p.z) / d;
  const yaw = Math.atan2(-toX, -toZ);
  if (b.slot < 0) {
    b.slot = spawnEnemy(combat.enemies, 'hellwarden', wardenAt(p.x, p.z, 0, toX, toZ, spot), yaw);
    if (b.slot >= 0) {
      const e = combat.enemies[b.slot];
      setPhase(e, 'intro');
      e.move = SHOW_UNDER;
    }
  }
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  if (!boss) return;
  wardenAt(p.x, p.z, b.t, toX, toZ, boss.pos);
  boss.prev.copy(boss.pos);
  boss.facing = yaw;
  b.eyeYaw = yaw;
  if (crossed(s.riftFrom)) ev.push('wardenRift', b.slot, p.x, 0.2, p.z);
  if (crossed(s.walkFrom)) nextStage(boss, SHOW_WALK);
  if (b.t >= s.walkFrom && b.t < s.walkTo) {
    const was = Math.floor((before - s.walkFrom) * STEPS);
    if (Math.floor((b.t - s.walkFrom) * STEPS) > was) ev.push('wardenStep', b.slot, boss.pos.x, Math.max(0.1, boss.pos.y), boss.pos.z);
  }
  if (crossed(s.walkTo)) nextStage(boss, SHOW_DRAG);
  if (crossed(s.igniteAt)) ev.push('wardenIgnite', b.slot, p.x, v.height * 0.5, p.z);
  if (crossed(s.slowFrom)) nextStage(boss, SHOW_RAISE);
  if (crossed(s.slowTo)) nextStage(boss, SHOW_BLOW);
  if (crossed(s.blowAt)) {
    ev.push('wardenShowBlow', b.slot, p.x, 0.2, p.z);
    startQuake(combat.quakes, p.x, 0, p.z, 18, 30, 0, BOSS.v.quakeClear, 'hellwarden');
  }
  if (crossed(s.roarAt)) {
    ev.push('wardenRoar', b.slot, p.x, v.height * 0.85, p.z);
    nextStage(boss, SHOW_ROAR);
  }
  if (b.t < s.end) return;
  boss.move = 0;
  boss.pos.y = boss.prev.y = 0;
  setPhase(boss, 'chase');
  boss.cooldown = 0.8;
  b.beat = 'fight';
  b.t = 0;
}

/** The run's time as it raises its sword: slowed (easing in and out) while its name shows. 1: not slowed. */
export function wardenSlow(b: BossRun): number {
  if (b.kind !== 'hellwarden' || !b.ownShow || b.beat !== 'intro') return 1;
  const s = wardenBeats();
  const ease = 0.12;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - HELLWARDEN.v.showSlow) * Math.max(0, k);
}
