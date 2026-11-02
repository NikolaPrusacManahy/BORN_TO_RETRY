// Update 0.3.16 — the Big Shark's show and its water (the designer: "when entering the arena -> the camera changes angle
// as we see the water flooding the whole arena, the walls are 50% higher and ceilling as well -> the camera is then on the
// Sharks shoulder as they swim -> a camera shot of the front as they jump out of the water with a slow motion effect with
// the boss name on the right"): its own beats in place of the portal's (bossRoom.ts). The arena floods, from its floor to
// Arena water; the shark swims a curve across its far side under water; then straight on at the view, under the water
// (the designer: "before the jump we have a fixed shot of the shark going toward the camera"); then it leaps out of the
// water and dives back in, slowed mid-leap (the run's time: Show: slow motion); then the fight. Dead, its arena drains. Its path is worked out
// here from the arena's middle and where you stand (the view's shots follow it: engine/boss/sharkCinema.ts). Pure.
import { Vector3 } from 'three';
import { BIG_SHARK } from '../../tuning/bigShark';
import type { CombatState } from '../combat/state';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import { fishLength } from '../enemies/kinds6';
import type { PlayerState } from '../player/state';
import type { BossRun } from './bossRoom';

/** The show's beats, in seconds from stepping in (show time: the run's, slowed or not). */
export interface SharkBeats {
  flood: number;
  swimFrom: number;
  swimTo: number;
  approachTo: number;
  breachTo: number;
  slowFrom: number;
  slowTo: number;
  end: number;
}

const BEATS: SharkBeats = { flood: 0, swimFrom: 0, swimTo: 0, approachTo: 0, breachTo: 0, slowFrom: 0, slowTo: 0, end: 0 };

/** The beats as the knobs say now (one object, refilled). */
export function sharkBeats(): SharkBeats {
  const v = BIG_SHARK.v;
  const b = BEATS;
  b.flood = v.showFlood;
  b.swimFrom = Math.max(0, b.flood - 0.6);
  b.swimTo = b.swimFrom + v.showSwim;
  b.approachTo = b.swimTo + v.showApproach;
  b.breachTo = b.approachTo + v.showBreach;
  b.slowFrom = b.approachTo + v.showBreach * 0.3;
  b.slowTo = b.approachTo + v.showBreach * 0.72;
  b.end = b.breachTo + v.showBack;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** It swims its curve this far round the arena's middle (m), its middle this share of the water's depth up; then straight
 *  on this far (m), rising; it leaps this far (m), from this far under the surface (m) to this far over it (its middle);
 *  the leap is out of the water from this share of it to that. Back under, it swims on this far (m). */
const RADIUS = 9;
export const DEPTH = 0.42;
const APPROACH = 9;
const LEAP = 14;
const UNDER = 3;
const OVER = 3.2;
export const OUT_FROM = 0.2;
export const OUT_TO = 0.8;
const ON = 6;

/** Where the shark is in the show: its middle and the way it faces (`yaw`), and the leap's line (from where it leaves the
 *  water, along `way`, its peak). */
export interface SharkMark {
  mid: Vector3;
  yaw: number;
  from: Vector3;
  way: Vector3;
  peak: Vector3;
}

export const sharkMark = (): SharkMark => ({ mid: new Vector3(), yaw: 0, from: new Vector3(), way: new Vector3(), peak: new Vector3() });

/** Into the room from where you stand (unit, flat), and across it. */
const into = new Vector3();
const across = new Vector3();

/** The shark's place `t` s into the show (from Show: swim on), round the middle `mid` with you at `you`; into `out`. */
export function sharkAt(t: number, mid: { x: number; z: number }, you: { x: number; z: number }, out: SharkMark): SharkMark {
  const v = BIG_SHARK.v;
  const s = sharkBeats();
  const top = v.floodTop;
  into.set(mid.x - you.x, 0, mid.z - you.z);
  if (into.lengthSq() < 1e-6) into.set(0, 0, -1);
  into.normalize();
  across.set(-into.z, 0, into.x);
  const depth = top * DEPTH;
  // Round the far side, from your right to your left.
  const arc = (k: number, o: Vector3) => {
    const a = Math.PI * (0.6 - 0.75 * k);
    return o.set(mid.x + (Math.cos(a) * into.x + Math.sin(a) * across.x) * RADIUS, depth, mid.z + (Math.cos(a) * into.z + Math.sin(a) * across.z) * RADIUS);
  };
  // The curve's end (`via`), straight on from there towards the middle (`way`), the leap's start (`from`) and its peak.
  arc(1, via);
  out.way.set(mid.x - via.x, 0, mid.z - via.z).normalize();
  out.from.copy(via).addScaledVector(out.way, APPROACH);
  out.from.y = top - UNDER;
  out.peak.copy(out.from).addScaledVector(out.way, LEAP / 2).setY(top + OVER);
  if (t < s.swimTo) {
    const k = (t - s.swimFrom) / Math.max(0.01, s.swimTo - s.swimFrom);
    arc(k, out.mid);
    arc(Math.min(1, k + 0.02), ahead);
    out.yaw = Math.atan2(-(ahead.x - out.mid.x), -(ahead.z - out.mid.z));
    return out;
  }
  out.yaw = Math.atan2(-out.way.x, -out.way.z);
  if (t < s.approachTo) {
    // Straight on at the view, rising for the surface.
    const u = (t - s.swimTo) / Math.max(0.01, s.approachTo - s.swimTo);
    out.mid.copy(via).addScaledVector(out.way, APPROACH * u);
    out.mid.y = depth + (top - UNDER - depth) * smooth(u);
    return out;
  }
  if (t < s.breachTo) {
    const u = (t - s.approachTo) / Math.max(0.01, s.breachTo - s.approachTo);
    out.mid.copy(out.from).addScaledVector(out.way, LEAP * u);
    out.mid.y = top - UNDER + (UNDER + OVER) * Math.sin(Math.PI * u);
    return out;
  }
  const u = Math.min(1, (t - s.breachTo) / Math.max(0.01, s.end - s.breachTo));
  out.mid.copy(out.from).addScaledVector(out.way, LEAP + ON * smooth(u));
  out.mid.y = top - UNDER + (depth - top + UNDER) * smooth(u);
  return out;
}

const via = new Vector3();
const ahead = new Vector3();
const mark = sharkMark();
const at = new Vector3();

/** One tick of the show's beat (bossRoom.ts's 'intro', for the Big Shark): the flood, the shark placed, its splashes;
 *  done, the fight. `dt`: this tick's time. */
export function stepSharkIntro(b: BossRun, portal: { x: number; z: number }, player: PlayerState, combat: CombatState, dt: number) {
  const s = sharkBeats();
  const v = BIG_SHARK.v;
  const ev = combat.events;
  const before = b.t - dt;
  combat.flood = v.floodTop * smooth(b.t / s.flood);
  if (before <= 0) ev.push('bigSharkFlood', 0, portal.x, 0, portal.z);
  if (b.t < s.swimFrom) return;
  const h = ENEMY_STATS.bigShark().height;
  sharkAt(b.t, portal, player.pos, mark);
  if (b.slot < 0) {
    b.slot = spawnEnemy(combat.enemies, 'bigShark', at.set(mark.mid.x, mark.mid.y - h / 2, mark.mid.z), mark.yaw);
    if (b.slot < 0) return;
    setPhase(combat.enemies[b.slot], 'intro');
  }
  const boss = combat.enemies[b.slot];
  boss.pos.set(mark.mid.x, mark.mid.y - h / 2, mark.mid.z);
  boss.facing = mark.yaw;
  // Out of the water, and back in.
  const out = s.approachTo + (s.breachTo - s.approachTo) * OUT_FROM;
  const back = s.approachTo + (s.breachTo - s.approachTo) * OUT_TO;
  if (before < out && b.t >= out) ev.push('bigSharkBreach', b.slot, mark.mid.x, v.floodTop, mark.mid.z);
  if (before < back && b.t >= back) ev.push('bigSharkSplash', b.slot, mark.mid.x, v.floodTop, mark.mid.z);
  if (b.t < s.end) return;
  setPhase(boss, 'chase');
  boss.cooldown = 1;
  b.beat = 'fight';
  b.t = 0;
}

/** Its arena's water outside the show: full while it fights; once it's dead, draining. */
export function sharkWater(b: BossRun, combat: CombatState) {
  const v = BIG_SHARK.v;
  if (b.beat === 'fight') combat.flood = v.floodTop;
  else if (b.beat === 'dying' || b.beat === 'loot' || b.beat === 'open') {
    const k = b.beat === 'dying' ? b.t / Math.max(0.01, v.drainTime) : 1;
    const was = combat.flood;
    combat.flood = Math.max(0, Math.min(was, v.floodTop * (1 - smooth(k))));
    if (was > 0 && combat.flood === 0) combat.events.push('bigSharkDrain', 0, 0, 0, 0);
  }
}

/** The run's time while the show leaps it out of the water: slowed mid-leap (easing in and out). 1: not slowed. */
export function sharkSlow(b: BossRun): number {
  if (b.kind !== 'bigShark' || b.beat !== 'intro') return 1;
  const s = sharkBeats();
  const ease = 0.25;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - BIG_SHARK.v.showSlow) * Math.max(0, k);
}

/** You swim in it: its water this high (m; 0: you wade or walk). Under Swim from you'd stand on the floor. */
export const SWIM_FROM = 2.5;
export function sharkSea(b: BossRun, flood: number): number {
  return b.kind === 'bigShark' && b.beat !== 'waiting' && flood >= SWIM_FROM ? flood : 0;
}

/** Its length (m): the view frames its shots by it. */
export const sharkLength = () => fishLength('bigShark', ENEMY_STATS.bigShark().height);
