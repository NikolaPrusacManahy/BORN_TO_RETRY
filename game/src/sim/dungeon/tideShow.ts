// Update 0.3.31 — Tidebreaker's show (the designer: "Intro cinematic for the boss: All previous rooms explode and all of
// space; The boss room is x2 bigger than a normal boss room, you see it expanding; A shot of the earth shakes and
// explode; A meteor is coming from the earth exploding as it has at least 2 different camera angler as it lands on the
// arena with a massive explosion, revealing the boss doing the monster transformation animation as the whole place
// shakes and name displayed in slow motion like the shark boss"): its own beats in place of the portal's (bossRoom.ts).
// The view pulls up off you; the floor's other rooms blow up one after another, the furthest first (each a `tideBlast`:
// value, the room; y, its half-width), the sky with them (engine/moon/spaceSky.ts); the boss room's walls slide out to a
// boss room's size, hold, then out to twice it (`wallsOpen`, engine/boss/shell.ts); the Earth shakes and bursts; a
// meteor falls from it onto the arena's middle (the view's two shots: engine/boss/tideCinema.ts) and strikes
// (`tideArrive`: a ring, the whole place shaking); out of its crater Tidebreaker rises roaring (its MonsterTransformation),
// slowed while its name shows (Show: slow motion); then the fight. Pure.
import { BOSS } from '../../tuning/boss';
import { TIDEBREAKER } from '../../tuning/tidebreaker';
import type { CombatState } from '../combat/state';
import { startQuake } from '../combat/quakes';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import { ROAR } from '../enemies/tideShared';
import type { PlayerState } from '../player/state';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { Vector3 } from 'three';
import type { BossRun } from './bossRoom';

/** The show's beats, in seconds from stepping in (the run's time, slowed or not). */
export interface TideBeats {
  pull: number;
  wreckFrom: number;
  wreckTo: number;
  growFrom: number;
  growMid: number;
  holdTo: number;
  growTo: number;
  earthFrom: number;
  earthBurst: number;
  meteorFrom: number;
  angleB: number;
  impact: number;
  slowFrom: number;
  slowTo: number;
  end: number;
}

const BEATS: TideBeats = { pull: 0, wreckFrom: 0, wreckTo: 0, growFrom: 0, growMid: 0, holdTo: 0, growTo: 0, earthFrom: 0, earthBurst: 0, meteorFrom: 0, angleB: 0, impact: 0, slowFrom: 0, slowTo: 0, end: 0 };
/** The view pulls up this long (s); the walls hold at a boss room's size this long; the slow motion lasts this long
 *  (s, the run's: its time slowed, longer as you see it); its landing's ring this far (m). */
const PULL = 0.8;
const HOLD = 0.5;
const SLOW = 1.1;
const ARRIVE_RING = 40;

/** The beats as the knobs say now (one object, refilled). */
export function tideBeats(): TideBeats {
  const v = TIDEBREAKER.v;
  const b = BEATS;
  b.pull = PULL;
  b.wreckFrom = PULL;
  b.wreckTo = b.wreckFrom + v.showWreck;
  b.growFrom = b.wreckTo;
  b.growMid = b.growFrom + (v.showGrow - HOLD) * 0.4;
  b.holdTo = b.growMid + HOLD;
  b.growTo = b.growFrom + v.showGrow;
  b.earthFrom = b.growTo;
  b.earthBurst = b.earthFrom + v.showEarth * 0.7;
  b.meteorFrom = b.earthFrom + v.showEarth;
  b.angleB = b.meteorFrom + v.showMeteor * 0.55;
  b.impact = b.meteorFrom + v.showMeteor;
  b.slowFrom = b.impact + 0.35;
  b.slowTo = b.slowFrom + SLOW;
  b.end = b.impact + v.showReveal;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** How far its walls have slid back (0..1): to a boss room's size by a half, held, then to the whole room. */
export function tideWalls(t: number): number {
  const s = tideBeats();
  if (t < s.holdTo) return 0.5 * smooth((t - s.growFrom) / Math.max(0.01, s.growMid - s.growFrom));
  return 0.5 + 0.5 * smooth((t - s.holdTo) / Math.max(0.01, s.growTo - s.holdTo));
}

/** The floor's rooms but its own, each with when it blows (s into the show): the furthest first. */
export function blastOrder(level: DungeonLevel): { room: number; at: number }[] {
  const s = tideBeats();
  const p = level.boss.portal;
  const mid = (i: number) => {
    const r = level.rooms[i];
    return Math.hypot((r.min.x + r.max.x) / 2 - p.x, (r.min.z + r.max.z) / 2 - p.z);
  };
  const rooms = level.rooms.map((_, i) => i).filter((i) => i !== level.boss.room).sort((a, b) => mid(b) - mid(a));
  const span = s.wreckTo - s.wreckFrom - 0.4;
  return rooms.map((room, k) => ({ room, at: s.wreckFrom + (rooms.length > 1 ? (span * k) / (rooms.length - 1) : 0) }));
}

const at = new Vector3();

/** One tick of its show (bossRoom.ts's 'intro', for Tidebreaker): the rooms blowing, the walls, the Earth, the meteor,
 *  its landing and its rise; done, the fight. `dt`: this tick's time. */
export function stepTideIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const s = tideBeats();
  const ev = combat.events;
  const before = b.t - dt;
  const p = level.boss.portal;
  const crossed = (t: number) => before < t && b.t >= t;
  for (const { room, at: when } of blastOrder(level)) {
    if (!crossed(when)) continue;
    const r = level.rooms[room];
    ev.push('tideBlast', room, (r.min.x + r.max.x) / 2, Math.max(r.max.x - r.min.x, r.max.z - r.min.z) / 2, (r.min.z + r.max.z) / 2);
  }
  if (crossed(s.growFrom)) ev.push('tideGrow', 0, p.x, 0, p.z);
  if (crossed(s.holdTo)) ev.push('tideGrow', 1, p.x, 0, p.z);
  if (crossed(s.earthFrom)) ev.push('tideEarth', 0, p.x, 0, p.z);
  if (crossed(s.earthBurst)) ev.push('tideEarth', 1, p.x, 0, p.z);
  if (crossed(s.meteorFrom)) ev.push('tideMeteor', 0, p.x, 0, p.z);
  if (crossed(s.impact)) {
    // Its landing: the whole place shaking, a ring out over the arena; and out of the crater, it.
    ev.push('tideArrive', ARRIVE_RING, p.x, 0, p.z);
    startQuake(combat.quakes, p.x, 0, p.z, 22, ARRIVE_RING, 0, BOSS.v.quakeClear, 'tidebreaker');
    if (b.slot < 0) b.slot = spawnEnemy(combat.enemies, 'tidebreaker', at.set(p.x, 0, p.z), Math.atan2(-(player.pos.x - p.x), -(player.pos.z - p.z)));
    const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
    if (boss) {
      setPhase(boss, 'intro');
      boss.move = ROAR;
      ev.push('tideRoar', 0, p.x, TIDEBREAKER.v.tideHeight * 0.85, p.z);
    }
  }
  if (b.t < s.end || b.slot < 0) return;
  const boss = combat.enemies[b.slot];
  setPhase(boss, 'chase');
  boss.cooldown = 1;
  b.beat = 'fight';
  b.t = 0;
}

/** The run's time while it rises out of its crater: slowed (easing in and out) while its name shows. 1: not slowed. */
export function tideSlow(b: BossRun): number {
  if (b.kind !== 'tidebreaker' || b.beat !== 'intro') return 1;
  const s = tideBeats();
  const ease = 0.25;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - TIDEBREAKER.v.showSlow) * Math.max(0, k);
}
