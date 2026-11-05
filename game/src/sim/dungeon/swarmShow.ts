// Update 0.3.52 — The Swarm's show (at Tidebreaker's quality; the bible's "the Eye is the boss, the worms are the problem"): its
// own beats in place of the portal's (bossRoom.ts). You've stepped into the walled-off end of its nest. The floor heaves. The
// walls are forced back (`swarmPour`), and behind them its worms have been lying all over the floor: they wake and flood in
// toward the middle, a tide of them (the real worms: swarmBody.ts). They pile into a heap that writhes, closed over. It parts:
// its eye opens, slowed while its name shows (`swarmOpen`). Its laser sweeps the whole room once (`swarmGaze`), and the fight.
// Pure.
import { Vector3 } from 'three';
import { SWARM } from '../../tuning/swarm';
import { BOSS } from '../../tuning/boss';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { startQuake } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import { MASS, scatterSwarm, WAIT } from '../enemies/swarmBody';
import { swarmEyeHeight } from '../enemies/swarmHits';
import { aimGaze } from '../enemies/swarmMoves';
import type { PlayerState } from '../player/state';
import type { BossRun } from './bossRoom';

/** Its eye in its show (Enemy.move): shut in the heap, opening, its laser going round. */
export const EYE_SHUT = 10;
export const EYE_OPENING = 11;
export const EYE_SWEEP = 12;

export interface SwarmBeats {
  pull: number;
  pourFrom: number;
  wallsTo: number;
  /** Its last worms have woken. */
  wakeTo: number;
  heapFrom: number;
  openFrom: number;
  slowFrom: number;
  slowTo: number;
  sweepFrom: number;
  sweepTo: number;
  end: number;
}

const BEATS: SwarmBeats = { pull: 0, pourFrom: 0, wallsTo: 0, wakeTo: 0, heapFrom: 0, openFrom: 0, slowFrom: 0, slowTo: 0, sweepFrom: 0, sweepTo: 0, end: 0 };
/** The view lifts off your eyes this long (s); its walls take this share of its pour to go back; its eye takes this long to
 *  open (s), slowed from this far into that. */
const PULL = 0.7;
const WALLS_SHARE = 0.72;
const OPEN_LONG = 1.1;
const SLOW_IN = 0.15;
/** Its worms' heads swim this much harder, flooding in. */
const RUSH = 2.6;
/** Its heap parts in front of its eye, this many times its radius wide. */
const PART = 1.25;

export function swarmBeats(): SwarmBeats {
  const v = SWARM.v;
  const b = BEATS;
  b.pull = PULL;
  b.pourFrom = PULL - 0.1;
  b.wallsTo = b.pourFrom + v.showPour * WALLS_SHARE;
  b.wakeTo = b.pourFrom + v.showPour * 0.6;
  b.heapFrom = b.pourFrom + v.showPour;
  b.openFrom = b.heapFrom + v.showHeap;
  b.slowFrom = b.openFrom + SLOW_IN;
  b.slowTo = b.slowFrom + OPEN_LONG;
  b.sweepFrom = b.slowTo + 0.2;
  b.sweepTo = b.sweepFrom + v.showSweep;
  b.end = b.sweepTo + v.showBack;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** How far its walls have been forced back (0..1). */
export function swarmWalls(t: number): number {
  const s = swarmBeats();
  return smooth((t - s.pourFrom) / Math.max(0.1, s.wallsTo - s.pourFrom));
}

/** Its eye's opening (0 shut … 1 wide), `t` s into the show. */
export function eyeOpen(t: number): number {
  const s = swarmBeats();
  return smooth((t - s.openFrom) / Math.max(0.1, s.slowTo - s.openFrom));
}

const spot = new Vector3();

/** One tick of its show (bossRoom.ts's 'intro', for The Swarm); done, the fight. `dt`: this tick's time. */
export function stepSwarmIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const s = swarmBeats();
  const ev = combat.events;
  const before = b.t - dt;
  const crossed = (t: number) => before < t && b.t >= t;
  const p = level.boss.portal;
  if (b.slot < 0) {
    const yaw = Math.atan2(-(player.pos.x - p.x), -(player.pos.z - p.z));
    b.slot = spawnEnemy(combat.enemies, 'swarm', spot.set(p.x, 0, p.z), yaw);
    if (b.slot >= 0) {
      const e = combat.enemies[b.slot];
      setPhase(e, 'intro');
      e.move = EYE_SHUT;
      // Its worms, lying all over its floor behind the walls.
      if (e.swarm) {
        scatterSwarm(e.swarm, p.x, swarmEyeHeight(), p.z, level.boss.start, s.pourFrom, s.wakeTo, combat.rng);
        e.swarm.rush = RUSH;
      }
    }
  }
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  if (!boss?.swarm) return;
  const body = boss.swarm;
  // They wake, the nearest first.
  for (let k = 0; k < body.worms; k++) {
    if (body.state[k] === WAIT && b.t >= body.wake[k]) {
      body.state[k] = MASS;
      body.t[k] = 0;
    }
  }
  const move = b.t < s.openFrom ? EYE_SHUT : b.t < s.sweepFrom ? EYE_OPENING : EYE_SWEEP;
  if (move !== boss.move) {
    boss.move = move;
    boss.t = 0;
  }
  // Its laser: once round, starting and ending on you.
  const faced = Math.atan2(-(player.pos.x - p.x), -(player.pos.z - p.z));
  boss.facing = move === EYE_SWEEP ? faced + Math.PI * 2 * smooth((b.t - s.sweepFrom) / Math.max(0.1, s.sweepTo - s.sweepFrom)) : faced;
  if (move === EYE_SWEEP) aimGaze(boss, player, combat);
  // Its heap parts in front of it as it opens, and its laser shoves through what's there as it goes round.
  body.part = SWARM.v.eye * PART * eyeOpen(b.t);
  body.partX = -Math.sin(boss.facing);
  body.partZ = -Math.cos(boss.facing);
  if (crossed(s.pourFrom)) ev.push('swarmPour', b.slot, p.x, 0.1, p.z);
  if (crossed(s.heapFrom)) {
    ev.push('swarmPhase', b.slot, p.x, swarmEyeHeight(), p.z);
    startQuake(combat.quakes, p.x, 0, p.z, 18, 30, 0, BOSS.v.quakeClear, 'swarm');
  }
  if (crossed(s.openFrom)) ev.push('swarmOpen', b.slot, p.x, swarmEyeHeight(), p.z);
  if (crossed(s.sweepFrom)) ev.push('swarmGaze', b.slot, p.x, swarmEyeHeight(), p.z);
  if (b.t < s.end) return;
  body.rush = 1;
  body.part = 0;
  boss.move = 0;
  boss.facing = faced;
  setPhase(boss, 'chase');
  boss.cooldown = 1.2;
  b.beat = 'fight';
  b.t = 0;
}

/** The run's time as its eye opens: slowed (easing in and out) while its name shows. 1: not slowed. */
export function swarmSlow(b: BossRun): number {
  if (b.kind !== 'swarm' || !b.ownShow || b.beat !== 'intro') return 1;
  const s = swarmBeats();
  const ease = 0.12;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - SWARM.v.showSlow) * Math.max(0, k);
}
