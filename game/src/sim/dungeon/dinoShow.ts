// Update 0.3.61 — the Velociraptor's show (at Tidebreaker's quality; spec MD_UPDATES/U0361_VELOCIRAPTOR_SHOW.md): its own beats in place of
// the portal's (bossRoom.ts). "Trust your ears", from the first: you've stepped into sand-choked ruins, its walls going back, the view
// high over them. Nothing there. Down low: a click, off to one side, and the view turns: something crosses the far gap. A click from the
// other side, nearer, and the view turns: it's gone again, a tail. Then a hiss, and it's up on the wall ahead, crouched, its eyes
// burning. It leaps off it, hangs over you, slowed while its name shows, and comes down skidding, sand flying in a ring. It roars; then
// the fight. Where it is is a pure function of the show's time, so the views and the skip agree. Its views: engine/boss/dinoCinema.ts,
// ruinsView.ts. Pure.
import { Vector3 } from 'three';
import { DINO } from '../../tuning/dino';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { startQuake } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { HIDDEN_AT } from '../enemies/dinoMoves';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import type { PlayerState } from '../player/state';
import { BOSS } from '../../tuning/boss';
import type { BossRun } from './bossRoom';

/** Where it is in its show (Enemy.move; Enemy.t counts from each): out of sight, running by, crouched on the wall, in the air, landed, roaring. */
export const SHOW_GONE = 20;
export const SHOW_RUN = 21;
export const SHOW_CROUCH = 22;
export const SHOW_AIR = 23;
export const SHOW_LAND = 24;
export const SHOW_ROAR = 25;

export interface DinoBeats {
  pull: number;
  wallsFrom: number;
  wallsTo: number;
  /** Its two clicks. */
  clickA: number;
  clickB: number;
  hissAt: number;
  leapAt: number;
  slowFrom: number;
  slowTo: number;
  landAt: number;
  roarAt: number;
  end: number;
}

const BEATS: DinoBeats = { pull: 0, wallsFrom: 0, wallsTo: 0, clickA: 0, clickB: 0, hissAt: 0, leapAt: 0, slowFrom: 0, slowTo: 0, landAt: 0, roarAt: 0, end: 0 };
/** The view lifts off your eyes this long (s). It hangs this long, slowed. It roars this long after it lands. */
const PULL = 0.7;
const HANG = 0.9;
const TO_ROAR = 0.4;
/** How high it gets (m); how far along its leap it hangs. */
export const APEX = 10;
const HANG_AT = 0.62;
/** It runs by this far off to each side of its middle (m), so far toward you, over this long of each click's beat. */
export const BY_SIDE = 20;
const BY_NEAR = 2;
const BY_FOR = 0.7;
/** The wall it crouches on stands this high (m). */
export const WALL_TOP = 6;

export function dinoBeats(): DinoBeats {
  const v = DINO.v;
  const b = BEATS;
  b.pull = PULL;
  b.wallsFrom = PULL - 0.1;
  b.wallsTo = b.wallsFrom + v.showHigh;
  b.clickA = PULL + v.showHigh;
  b.clickB = b.clickA + v.showClick;
  b.hissAt = b.clickB + v.showClick;
  b.leapAt = b.hissAt + v.showHiss;
  b.slowFrom = b.leapAt + v.showRise;
  b.slowTo = b.slowFrom + HANG;
  b.landAt = b.slowTo + v.showFall;
  b.roarAt = b.landAt + TO_ROAR;
  b.end = b.roarAt + v.showRoar + v.showBack;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** How far its walls have gone back (0..1). */
export function dinoWalls(t: number): number {
  const s = dinoBeats();
  return smooth((t - s.wallsFrom) / Math.max(0.1, s.wallsTo - s.wallsFrom));
}

/** The spot on the wall it crouches on: the far wall, straight ahead of you. */
export function wallSpot(level: DungeonLevel, toX: number, toZ: number, out: Vector3): Vector3 {
  const e = level.boss.end;
  const p = level.boss.portal;
  const halfX = (e.max.x - e.min.x) / 2;
  const halfZ = (e.max.z - e.min.z) / 2;
  // (Along the way away from you, to the wall there, its top.)
  const reach = Math.abs(toX) > Math.abs(toZ) ? halfX : halfZ;
  return out.set(p.x - toX * (reach - 0.5), WALL_TOP, p.z - toZ * (reach - 0.5));
}

/** Where it is, `t` s into its show (feet); (toX, toZ): the way to you from its middle. */
export function dinoAt(level: DungeonLevel, t: number, toX: number, toZ: number, out: Vector3): Vector3 {
  const s = dinoBeats();
  const p = level.boss.portal;
  const ax = toZ;
  const az = -toX;
  // Out of sight.
  out.set(p.x, HIDDEN_AT, p.z);
  const across = (at: number, side: number) => {
    const u = (t - at) / BY_FOR;
    if (u < 0 || u > 1) return false;
    const along = -16 + 26 * u + BY_NEAR;
    out.set(p.x + ax * side * BY_SIDE + toX * along, 0, p.z + az * side * BY_SIDE + toZ * along);
    return true;
  };
  if (t < s.hissAt) {
    if (!across(s.clickA + 0.2, 1)) across(s.clickB + 0.2, -1);
    return out;
  }
  wallSpot(level, toX, toZ, out);
  if (t < s.leapAt) return out;
  if (t >= s.landAt) return out.set(p.x, 0, p.z);
  // Its leap: to its top, a hang while its name shows, then down on its middle.
  const wx = out.x;
  const wz = out.z;
  const rise = Math.min(1, (t - s.leapAt) / Math.max(0.1, s.slowFrom - s.leapAt));
  const hang = t >= s.slowFrom && t < s.slowTo;
  const fall = t >= s.slowTo ? (t - s.slowTo) / Math.max(0.1, s.landAt - s.slowTo) : 0;
  const along = t < s.slowFrom ? HANG_AT * rise : hang ? HANG_AT : HANG_AT + (1 - HANG_AT) * fall;
  const y = t < s.slowFrom ? WALL_TOP + (APEX - WALL_TOP) * (1 - (1 - rise) * (1 - rise)) : hang ? APEX : APEX * (1 - fall * fall);
  return out.set(wx + (p.x - wx) * along, y, wz + (p.z - wz) * along);
}

const spot = new Vector3();
const was = new Vector3();

function nextStage(boss: { move: number; t: number }, move: number) {
  boss.move = move;
  boss.t = 0;
}

/** One tick of its show (bossRoom.ts's 'intro', for the Velociraptor); done, the fight. `dt`: this tick's time. */
export function stepDinoIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const s = dinoBeats();
  const ev = combat.events;
  const before = b.t - dt;
  const crossed = (t: number) => before < t && b.t >= t;
  const p = level.boss.portal;
  const d = Math.max(0.1, Math.hypot(player.pos.x - p.x, player.pos.z - p.z));
  const toX = (player.pos.x - p.x) / d;
  const toZ = (player.pos.z - p.z) / d;
  const yaw = Math.atan2(-toX, -toZ);
  if (b.slot < 0) {
    b.slot = spawnEnemy(combat.enemies, 'dino', spot.set(p.x, HIDDEN_AT, p.z), yaw);
    if (b.slot >= 0) {
      const e = combat.enemies[b.slot];
      setPhase(e, 'intro');
      e.move = SHOW_GONE;
    }
  }
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  if (!boss) return;
  was.copy(boss.pos);
  dinoAt(level, b.t, toX, toZ, boss.pos);
  boss.prev.copy(boss.pos);
  const running = boss.pos.y === 0 && b.t < s.hissAt;
  if (running && (boss.pos.x !== was.x || boss.pos.z !== was.z)) boss.facing = Math.atan2(-(boss.pos.x - was.x), -(boss.pos.z - was.z));
  else boss.facing = yaw;
  if (running && boss.move !== SHOW_RUN) nextStage(boss, SHOW_RUN);
  if (!running && boss.move === SHOW_RUN) nextStage(boss, SHOW_GONE);
  b.eyeYaw = yaw;
  const ax = toZ * BY_SIDE;
  const az = -toX * BY_SIDE;
  if (crossed(s.wallsFrom)) ev.push('dinoSand', b.slot, p.x, 0.1, p.z);
  if (crossed(s.clickA)) ev.push('dinoClick', 0.4, p.x + ax, 1, p.z + az);
  if (crossed(s.clickB)) ev.push('dinoClick', 0.8, p.x - ax, 1, p.z - az);
  if (crossed(s.hissAt)) {
    ev.push('dinoHiss', 2, boss.pos.x, boss.pos.y + 2, boss.pos.z);
    nextStage(boss, SHOW_CROUCH);
  }
  if (crossed(s.leapAt)) {
    ev.push('dinoPounce', 1, boss.pos.x, boss.pos.y + 1, boss.pos.z);
    nextStage(boss, SHOW_AIR);
  }
  if (crossed(s.landAt)) {
    ev.push('dinoShowLand', b.slot, p.x, 0.1, p.z);
    startQuake(combat.quakes, p.x, 0, p.z, 16, 22, 0, BOSS.v.quakeClear, 'dino');
    nextStage(boss, SHOW_LAND);
  }
  if (crossed(s.roarAt)) {
    ev.push('dinoRoar', b.slot, p.x, DINO.v.dinoHeight * 0.85, p.z);
    nextStage(boss, SHOW_ROAR);
  }
  if (b.t < s.end) return;
  boss.move = 0;
  boss.pos.y = boss.prev.y = 0;
  setPhase(boss, 'chase');
  boss.cooldown = 1;
  b.beat = 'fight';
  b.t = 0;
}

/** The run's time as it hangs: slowed (easing in and out) while its name shows. 1: not slowed. */
export function dinoSlow(b: BossRun): number {
  if (b.kind !== 'dino' || !b.ownShow || b.beat !== 'intro') return 1;
  const s = dinoBeats();
  const ease = 0.12;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - DINO.v.showSlow) * Math.max(0, k);
}
