// Update 0.3.54 — the Bone King's show (at Tidebreaker's quality): its own beats in place of the portal's (bossRoom.ts). You've
// stepped into the walled-off end of the pit. The floor trembles and its walls are forced back: bones everywhere. They lift and
// fly to its middle, every one, and a skeleton builds itself out of them from the feet up. It stands, massive, and has no head.
// Its skull lies on the floor in front of it. It stoops, takes it in its hand, and sets it on its own neck; green fire catches in
// its eyes, slowed while its name shows. It roars, and brings its arm down flat on the floor (the Arm Slam you'll have to read,
// the shock throwing the spare bones back all over the pit); then the fight. Its views: engine/boss/kingCinema.ts, kingPose.ts,
// kingView.ts. Pure.
import { Vector3 } from 'three';
import { BONE_KING } from '../../tuning/boneKing';
import { BOSS } from '../../tuning/boss';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { startQuake } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import type { Enemy } from '../enemies/enemy';
import { kingTall } from '../enemies/kingBody';
import type { PlayerState } from '../player/state';
import type { BossRun } from './bossRoom';

/** Where it is in its show (Enemy.move; Enemy.t counts from each): building, standing headless, stooping, lifting its skull,
 *  its eyes catching, roaring, its arm up and coming down. */
export const SHOW_WAIT = 9;
export const SHOW_BUILD = 10;
export const SHOW_STAND = 11;
export const SHOW_STOOP = 12;
export const SHOW_LIFT = 13;
export const SHOW_EYES = 14;
export const SHOW_ROAR = 15;
export const SHOW_ARM = 16;
export const SHOW_DOWN = 17;

export interface KingBeats {
  pull: number;
  wallsFrom: number;
  wallsTo: number;
  buildFrom: number;
  standFrom: number;
  stoopFrom: number;
  liftFrom: number;
  slowFrom: number;
  slowTo: number;
  roarFrom: number;
  armFrom: number;
  slamAt: number;
  end: number;
}

const BEATS: KingBeats = { pull: 0, wallsFrom: 0, wallsTo: 0, buildFrom: 0, standFrom: 0, stoopFrom: 0, liftFrom: 0, slowFrom: 0, slowTo: 0, roarFrom: 0, armFrom: 0, slamAt: 0, end: 0 };
/** The view lifts off your eyes this long (s); its walls take this long to go back; it stands this long, headless. */
const PULL = 0.7;
const WALLS = 2;
const STAND = 0.5;
/** Its eyes catch over this long, slowed (s). */
const EYES = 1.1;
const SLOW_IN = 0.1;

export function kingBeats(): KingBeats {
  const v = BONE_KING.v;
  const b = BEATS;
  b.pull = PULL;
  b.wallsFrom = PULL - 0.1;
  b.wallsTo = b.wallsFrom + WALLS;
  b.buildFrom = b.wallsFrom + 0.4;
  b.standFrom = b.buildFrom + v.showBuild;
  b.stoopFrom = b.standFrom + STAND;
  b.liftFrom = b.stoopFrom + v.showStoop;
  b.slowFrom = b.liftFrom + v.showLift;
  b.slowTo = b.slowFrom + SLOW_IN + EYES;
  b.roarFrom = b.slowTo;
  b.armFrom = b.roarFrom + v.showRoar;
  b.slamAt = b.armFrom + v.showArm;
  b.end = b.slamAt + v.showBack;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** How far its walls have been forced back (0..1). */
export function kingWalls(t: number): number {
  const s = kingBeats();
  return smooth((t - s.wallsFrom) / Math.max(0.1, s.wallsTo - s.wallsFrom));
}

/** Where its skull lies on the floor, in front of it (shares of its height: forward; to its right). */
export function skullSpot(e: Enemy, out: Vector3): Vector3 {
  const h = kingTall(e);
  const fx = -Math.sin(e.facing);
  const fz = -Math.cos(e.facing);
  return out.set(e.pos.x + fx * 0.42 * h - fz * 0.12 * h, 0.05, e.pos.z + fz * 0.42 * h + fx * 0.12 * h);
}

const spot = new Vector3();

function nextStage(e: Enemy, move: number) {
  e.move = move;
  e.t = 0;
}

/** One tick of its show (bossRoom.ts's 'intro', for the Bone King); done, the fight. `dt`: this tick's time. */
export function stepKingIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const s = kingBeats();
  const ev = combat.events;
  const before = b.t - dt;
  const crossed = (t: number) => before < t && b.t >= t;
  const p = level.boss.portal;
  if (b.slot < 0) {
    const yaw = Math.atan2(-(player.pos.x - p.x), -(player.pos.z - p.z));
    b.slot = spawnEnemy(combat.enemies, 'boneKing', spot.set(p.x, 0, p.z), yaw);
    if (b.slot >= 0) {
      const e = combat.enemies[b.slot];
      setPhase(e, 'intro');
      e.move = SHOW_WAIT;
      // (None of the loose bones where you stand: the rest are behind its walls till they go.)
      if (e.king) {
        const st = level.boss.start;
        e.king.clearOf = { minX: st.min.x, maxX: st.max.x, minZ: st.min.z, maxZ: st.max.z };
      }
    }
  }
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  if (!boss) return;
  boss.facing = Math.atan2(-(player.pos.x - p.x), -(player.pos.z - p.z));
  const height = kingTall(boss);
  if (crossed(s.wallsFrom)) ev.push('kingTremble', b.slot, p.x, 0.1, p.z);
  if (crossed(s.buildFrom)) {
    ev.push('kingGather', b.slot, p.x, 0.1, p.z);
    nextStage(boss, SHOW_BUILD);
  }
  if (crossed(s.standFrom)) {
    ev.push('kingStands', b.slot, p.x, 0.1, p.z);
    nextStage(boss, SHOW_STAND);
  }
  if (crossed(s.stoopFrom)) nextStage(boss, SHOW_STOOP);
  if (crossed(s.liftFrom)) nextStage(boss, SHOW_LIFT);
  if (crossed(s.slowFrom)) {
    ev.push('kingSkullOn', b.slot, p.x, height * 0.8, p.z);
    nextStage(boss, SHOW_EYES);
  }
  if (crossed(s.roarFrom)) {
    ev.push('kingRoar', b.slot, p.x, height * 0.85, p.z);
    nextStage(boss, SHOW_ROAR);
  }
  if (crossed(s.armFrom)) nextStage(boss, SHOW_ARM);
  if (crossed(s.slamAt)) {
    ev.push('kingSlam', b.slot, p.x, 0.1, p.z);
    startQuake(combat.quakes, p.x, 0, p.z, 18, 30, 0, BOSS.v.quakeClear, 'boneKing');
    nextStage(boss, SHOW_DOWN);
  }
  if (b.t < s.end) return;
  boss.move = 0;
  setPhase(boss, 'chase');
  boss.cooldown = 1.2;
  b.beat = 'fight';
  b.t = 0;
}

/** The run's time as its eyes catch: slowed (easing in and out) while its name shows. 1: not slowed. */
export function kingSlow(b: BossRun): number {
  if (b.kind !== 'boneKing' || !b.ownShow || b.beat !== 'intro') return 1;
  const s = kingBeats();
  const ease = 0.1;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - BONE_KING.v.showSlow) * Math.max(0, k);
}
