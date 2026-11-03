// Update 0.3.31 — the boss room's show's beats, how far its walls have slid back and how open its portal is (out of
// bossRoom.ts, which had reached its size; no change but Tidebreaker's: its walls slide out in two stages, it has no
// portal, tideShow.ts). Pure.
import { CINEMA } from '../../tuning/cinema';
import type { BossRun } from './bossRoom';
import { tideWalls } from './tideShow';
import { okamiWalls } from './okamiShow';

/** The show's beats, in seconds from stepping in. */
export interface IntroBeats {
  wallsFrom: number;
  wallsTo: number;
  portalFrom: number;
  portalTo: number;
  riseFrom: number;
  riseTo: number;
  stanceTo: number;
  end: number;
}

const BEATS: IntroBeats = { wallsFrom: 0, wallsTo: 0, portalFrom: 0, portalTo: 0, riseFrom: 0, riseTo: 0, stanceTo: 0, end: 0 };

/** The beats as the knobs say now (one object, refilled: the view asks every frame). */
export function introBeats(): IntroBeats {
  const c = CINEMA.v;
  const b = BEATS;
  b.wallsFrom = c.pull * 0.6;
  b.wallsTo = b.wallsFrom + c.walls;
  b.portalFrom = Math.max(b.wallsFrom, b.wallsTo - 0.3);
  b.portalTo = b.portalFrom + c.portal;
  b.riseFrom = b.portalTo - 0.2;
  b.riseTo = b.riseFrom + c.rise;
  b.stanceTo = b.riseTo + c.stance;
  b.end = b.stanceTo + c.back;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** How far the walls have slid back (0: the small room you walk into, 1: the whole room). */
export function wallsOpen(b: BossRun): number {
  if (b.kind === 'bigShark') return 1;
  if (b.beat === 'waiting') return 0;
  if (b.beat !== 'intro') return 1;
  if (b.kind === 'tidebreaker') return tideWalls(b.t);
  if (b.kind === 'okami') return okamiWalls(b.t);
  const s = introBeats();
  return smooth((b.t - s.wallsFrom) / (s.wallsTo - s.wallsFrom));
}

/** How open the portal is (0..1): it opens, holds while the boss rises, then closes. */
export function portalOpen(b: BossRun): number {
  if (b.beat !== 'intro' || b.kind === 'bigShark' || b.kind === 'tidebreaker' || b.kind === 'okami') return 0;
  const s = introBeats();
  if (b.t < s.riseTo) return smooth((b.t - s.portalFrom) / (s.portalTo - s.portalFrom));
  return 1 - smooth((b.t - s.riseTo) / 0.8);
}

/** The show is on: you neither move nor fight. */
export const inShow = (b: BossRun) => b.beat === 'intro';
