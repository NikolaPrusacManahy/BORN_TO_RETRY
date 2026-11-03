// Update 0.3.34 — Yokai : Okami's show (the designer's intro: "Arena shakes, all previous rooms are destroyed at once, the
// arena expand (2 camera angles) * The floating islands all moves and regroup near the arena (2 camera angles) * Okami
// lands on one island and make it crach on the arena, inbedding it there * 3 temples fall from the sy and blocks the
// exit gate as a nice presentation (2 camera angles) * The remaining island shift and merge with the combat arena,
// becoming a walkable surface once crashed into the arena … * Okami jumps in the air and slow motion + name * lands on
// ground and start to go back to player POV"): its own beats in place of the portal's (bossRoom.ts). The view pulls up
// off you; the whole place shakes and the floor's other rooms all blow at once (`okamiBlast`); the arena's walls slide
// out to a boss room's size, hold, then to twice it (`okamiGrow`, as Tidebreaker's: engine/boss/shell.ts); the sky's
// islands come in and gather over the arena (`okamiIsles`); it comes down out of the sky onto its own (`okamiArrive`),
// which falls with it on it and crashes into the arena (`isleCrash`, the first); the three temples come down across the
// doorway you came in by (`templeFall`); the other islands crash in one after another, merging with the arena
// (`isleCrash`); it leaps from its island, slowed while its name shows (`okamiLeap`), and lands in front of you
// (`okamiLand`); then the fight.
// The designer, having read it: "when Okami lands on the island and it lands on the ground, it shakes so much that the
// camera angle shows a far wide shot of the shock wave blowing everything away" (its island's crash: `crashTo`, the view
// far and wide); "the slow motion squence is too slow, make x2 faster"; "the after slow motion landing needs a
// destroying landing impact and a very same monster transformation at the end with the screem" (its landing's blast,
// then its MonsterTransformation, `okamiRoar`). The islands' places and what's on them: world/dungeon/okamiIsles.ts (their boxes solid
// once the show's over: roomLoop.ts). Its views: engine/shrine/okamiCinema.ts, okamiShowView.ts. Pure.
import { BOSS } from '../../tuning/boss';
import { OKAMI } from '../../tuning/okami';
import type { CombatState } from '../combat/state';
import { startQuake } from '../combat/quakes';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import { ARRIVE, LAND, LEAP, RIDE, ROAR } from '../enemies/okamiShared';
import type { PlayerState } from '../player/state';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { OkamiArena } from '../../world/dungeon/okamiIsles';
import type { BossRun } from './bossRoom';
import { Vector3 } from 'three';

/** The show's beats, in seconds from stepping in (the run's time, slowed or not). */
export interface OkamiBeats {
  pull: number;
  blast: number;
  wreckTo: number;
  growFrom: number;
  growMid: number;
  holdTo: number;
  growTo: number;
  islesFrom: number;
  islesB: number;
  islesTo: number;
  arriveFrom: number;
  arriveAt: number;
  crashAt: number;
  crashTo: number;
  templesFrom: number;
  /** When each temple strikes. */
  temple: [number, number, number];
  templesB: number;
  templesTo: number;
  mergeFrom: number;
  mergeTo: number;
  leapFrom: number;
  slowFrom: number;
  slowTo: number;
  leapTo: number;
  /** Landed, its roar (its MonsterTransformation, its scream). */
  roarAt: number;
  end: number;
}

const BEATS: OkamiBeats = { pull: 0, blast: 0, wreckTo: 0, growFrom: 0, growMid: 0, holdTo: 0, growTo: 0, islesFrom: 0, islesB: 0, islesTo: 0, arriveFrom: 0, arriveAt: 0, crashAt: 0, crashTo: 0, templesFrom: 0, temple: [0, 0, 0], templesB: 0, templesTo: 0, mergeFrom: 0, mergeTo: 0, leapFrom: 0, slowFrom: 0, slowTo: 0, leapTo: 0, roarAt: 0, end: 0 };
/** The view pulls up this long (s); the rooms blow this long after; the walls hold at a boss room's size this long;
 *  it comes down onto its island this far into its beat (a share); it crouches this long before its leap; landed, it
 *  roars this long after (s). */
const PULL = 0.8;
const BLAST_AFTER = 0.45;
const HOLD = 0.5;
const ARRIVE_SHARE = 0.45;
const CROUCH = 0.35;
const ROAR_AFTER = 0.6;
/** Its island hangs this high over its place before it falls (m), the others this high; each falls this long (s). */
export const HOVER = 40;
export const HOVER_OTHER = 30;
export const FALL = 0.7;
/** It comes down out of the sky from this high and this far out (m); its leap goes this high (m). */
export const ARRIVE_FROM: readonly [number, number] = [150, 90];
export const LEAP_HIGH = 24;
/** Its landing's ring this far (m: a destroying landing). */
const LAND_RING = 45;

/** The beats as the knobs say now (one object, refilled). */
export function okamiBeats(): OkamiBeats {
  const v = OKAMI.v;
  const b = BEATS;
  b.pull = PULL;
  b.blast = PULL + BLAST_AFTER;
  b.wreckTo = PULL + v.showWreck;
  b.growFrom = b.wreckTo;
  b.growMid = b.growFrom + (v.showGrow - HOLD) * 0.4;
  b.holdTo = b.growMid + HOLD;
  b.growTo = b.growFrom + v.showGrow;
  b.islesFrom = b.growTo;
  b.islesB = b.islesFrom + v.showIsles * 0.55;
  b.islesTo = b.islesFrom + v.showIsles;
  b.arriveFrom = b.islesTo;
  b.arriveAt = b.arriveFrom + v.showCrash * ARRIVE_SHARE;
  b.crashAt = b.arriveFrom + v.showCrash;
  b.crashTo = b.crashAt + v.showBlow;
  b.templesFrom = b.crashTo;
  const step = v.showTemples / 3.6;
  b.temple = [b.templesFrom + step * 0.9, b.templesFrom + step * 1.8, b.templesFrom + step * 2.9];
  b.templesB = (b.temple[1] + b.temple[2]) / 2;
  b.templesTo = b.templesFrom + v.showTemples;
  b.mergeFrom = b.templesTo;
  b.mergeTo = b.mergeFrom + v.showMerge;
  b.leapFrom = b.mergeTo;
  b.leapTo = b.leapFrom + v.showLeap;
  b.slowFrom = b.leapFrom + CROUCH + 0.2;
  b.slowTo = b.leapTo - 0.55;
  b.roarAt = b.leapTo + ROAR_AFTER;
  b.end = b.roarAt + v.showRoar;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** How far its walls have slid back (0..1): to a boss room's size by a half, held, then to the whole room. */
export function okamiWalls(t: number): number {
  const s = okamiBeats();
  if (t < s.holdTo) return 0.5 * smooth((t - s.growFrom) / Math.max(0.01, s.growMid - s.growFrom));
  return 0.5 + 0.5 * smooth((t - s.holdTo) / Math.max(0.01, s.growTo - s.holdTo));
}

/** The floor's rooms but its own, each with when it blows (s into the show): all at once. */
export function okamiBlasts(level: DungeonLevel): { room: number; at: number }[] {
  const s = okamiBeats();
  return level.rooms.map((_, i) => i).filter((i) => i !== level.boss.room).map((room) => ({ room, at: s.blast }));
}

/** When each island strikes the arena (its own first, then the rest one after another as they merge). */
export function isleLands(arena: OkamiArena): number[] {
  const s = okamiBeats();
  const n = arena.isles.length - 1;
  const span = s.mergeTo - s.mergeFrom - FALL - 0.4;
  return arena.isles.map((isle, i) => (isle.main ? s.crashAt : s.mergeFrom + FALL + (n > 1 ? (span * (i - 1)) / (n - 1) : 0)));
}

/** How high over its place an island is `t` s into the show (m: 0 once it's in): hanging, then falling faster and
 *  faster to strike at its time. */
export function isleDrop(arena: OkamiArena, i: number, t: number): number {
  const lands = isleLands(arena)[i];
  const high = arena.isles[i].main ? HOVER : HOVER_OTHER;
  const fall = arena.isles[i].main ? lands - okamiBeats().arriveAt : FALL;
  const k = (t - (lands - fall)) / Math.max(0.05, fall);
  return k <= 0 ? high : k >= 1 ? 0 : high * (1 - k * k);
}

/** Where it is `t` s into the show (into `out`: x, y, z), from when it comes down out of the sky to its landing. */
export function okamiAt(arena: OkamiArena, t: number, out: { x: number; y: number; z: number }) {
  const s = okamiBeats();
  const own = arena.isles[0];
  if (t < s.arriveAt) {
    // Down out of the sky (from far behind its island, high), onto its island's top.
    const k = smooth((t - s.arriveFrom) / Math.max(0.05, s.arriveAt - s.arriveFrom));
    const ox = own.x - arena.fwd.x * ARRIVE_FROM[1];
    const oz = own.z - arena.fwd.z * ARRIVE_FROM[1];
    out.x = ox + (own.x - ox) * k;
    out.z = oz + (own.z - oz) * k;
    out.y = ARRIVE_FROM[0] + (HOVER + own.top - ARRIVE_FROM[0]) * k;
    return out;
  }
  if (t < s.leapFrom + CROUCH) {
    out.x = own.x;
    out.z = own.z;
    out.y = own.top + isleDrop(arena, 0, t);
    return out;
  }
  // Its leap: from its island's top, up and over, down in front of you.
  const k = Math.min(1, (t - s.leapFrom - CROUCH) / Math.max(0.05, s.leapTo - s.leapFrom - CROUCH));
  const l = arena.landing;
  out.x = own.x + (l.x - own.x) * k;
  out.z = own.z + (l.z - own.z) * k;
  out.y = own.top * (1 - k) + 4 * LEAP_HIGH * k * (1 - k);
  return out;
}

const at = { x: 0, y: 0, z: 0 };
const spot = new Vector3();

/** One tick of its show (bossRoom.ts's 'intro', for Okami): the rooms, the walls, the islands, its coming, the temples,
 *  its leap, its landing; done, the fight. `dt`: this tick's time. */
export function stepOkamiIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const arena = level.okami;
  if (!arena) return;
  const s = okamiBeats();
  const ev = combat.events;
  const before = b.t - dt;
  const crossed = (t: number) => before < t && b.t >= t;
  const p = level.boss.portal;
  if (crossed(s.blast)) {
    for (const { room } of okamiBlasts(level)) {
      const r = level.rooms[room];
      ev.push('okamiBlast', room, (r.min.x + r.max.x) / 2, Math.max(r.max.x - r.min.x, r.max.z - r.min.z) / 2, (r.min.z + r.max.z) / 2);
    }
  }
  if (crossed(s.growFrom)) ev.push('okamiGrow', 0, p.x, 0, p.z);
  if (crossed(s.holdTo)) ev.push('okamiGrow', 1, p.x, 0, p.z);
  if (crossed(s.islesFrom)) ev.push('okamiIsles', 0, p.x, HOVER, p.z);
  // It comes, out of the sky.
  if (crossed(s.arriveFrom) && b.slot < 0) {
    okamiAt(arena, b.t, at);
    b.slot = spawnEnemy(combat.enemies, 'okami', spot.set(at.x, at.y, at.z), Math.atan2(-arena.fwd.x, -arena.fwd.z));
    if (b.slot >= 0) setPhase(combat.enemies[b.slot], 'intro');
  }
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  isleLands(arena).forEach((when, i) => {
    if (!crossed(when)) return;
    const isle = arena.isles[i];
    ev.push('isleCrash', i, isle.x, isle.r, isle.z);
    startQuake(combat.quakes, isle.x, 0, isle.z, 18, isle.r * 2.2, 0, BOSS.v.quakeClear, 'okami');
  });
  s.temple.forEach((when, i) => {
    const t = arena.temples[i];
    if (t && crossed(when)) ev.push('templeFall', i, t.x, 0, t.z);
  });
  if (boss) {
    // (Its phase's clock: each move's clip from its start. Held where the show has it: no fall.)
    const move = b.t < s.arriveAt ? ARRIVE : b.t < s.crashAt + 0.3 ? RIDE : b.t < s.leapFrom ? ROAR : b.t < s.leapTo ? LEAP : b.t < s.roarAt ? LAND : ROAR;
    if (move !== boss.move) {
      boss.move = move;
      boss.t = 0;
    }
    okamiAt(arena, b.t, at);
    boss.pos.set(at.x, at.y, at.z);
    boss.prev.copy(boss.pos);
    boss.vel.set(0, 0, 0);
    const l = arena.landing;
    const toward = b.t < s.leapFrom ? Math.atan2(-(l.x - arena.isles[0].x), -(l.z - arena.isles[0].z)) : Math.atan2(-(arena.safe.x - boss.pos.x), -(arena.safe.z - boss.pos.z));
    boss.facing = toward;
  }
  if (crossed(s.arriveAt)) ev.push('okamiArrive', 0, arena.isles[0].x, HOVER, arena.isles[0].z);
  if (crossed(s.crashAt + 0.3)) ev.push('okamiGrowl', b.slot, arena.isles[0].x, arena.isles[0].top + 4, arena.isles[0].z);
  // You, where you'll fight from, facing in (the view's on its leap).
  if (crossed(s.leapFrom)) {
    player.pos.set(arena.safe.x, 0, arena.safe.z);
    player.vel.set(0, 0, 0);
    player.yaw = arena.safe.yaw;
    ev.push('okamiLeap', b.slot, arena.isles[0].x, arena.isles[0].top, arena.isles[0].z);
  }
  if (crossed(s.leapTo)) {
    const l = arena.landing;
    ev.push('okamiLand', LAND_RING, l.x, 0, l.z);
    startQuake(combat.quakes, l.x, 0, l.z, 20, LAND_RING, 0, BOSS.v.quakeClear, 'okami');
  }
  if (crossed(s.roarAt)) ev.push('okamiRoar', b.slot, arena.landing.x, ENEMY_STATS.okami().height * 0.85, arena.landing.z);
  if (b.t < s.end || !boss) return;
  boss.pos.y = 0;
  boss.move = 0;
  setPhase(boss, 'chase');
  boss.cooldown = 1;
  b.beat = 'fight';
  b.t = 0;
}

/** The run's time through its leap: slowed (easing in and out) while its name shows. 1: not slowed. */
export function okamiSlow(b: BossRun): number {
  if (b.kind !== 'okami' || b.beat !== 'intro') return 1;
  const s = okamiBeats();
  const ease = 0.3;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - OKAMI.v.showSlow) * Math.max(0, k);
}

/** Its arena's islands' and temples' boxes (gates): solid once the show's over. */
export const okamiGates = (arena: OkamiArena): number[] => [...arena.isles.flatMap((i) => i.gates), ...arena.temples.map((t) => t.gate)];

/** Update 0.3.34 — the view's sky: has the show taken its islands (they've come in)? */
export const islesTaken = (b: BossRun) => b.kind === 'okami' && b.beat !== 'waiting' && (b.beat !== 'intro' || b.t >= okamiBeats().islesFrom);
