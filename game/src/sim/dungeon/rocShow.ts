// Update 0.3.57 — the Frost Roc's show (at Tidebreaker's quality): its own beats in place of the portal's (bossRoom.ts). You've stepped
// into the walled-off end of the plateau. A gale gets up, and its walls are forced back: snow blowing over peaks, and a glacier in
// the plateau's middle with something dark in it. The floor thumps, once, twice, three times, the ice cracking each time; on the
// third its eyes open in the ice. It bursts out, up over everything, wings wide, and hangs there, slowed while its name shows. It
// comes down in one stomp, a ring rolling out under the view: the one you'll have to jump. It screams, wings up; then the fight. Its
// height is a pure function of the show's time, so the views and the skip agree. Its views: engine/norse/rocCinema.ts, plateauView.ts,
// rocPose.ts. Pure.
import { Vector3 } from 'three';
import { BOSS } from '../../tuning/boss';
import { FROST_ROC } from '../../tuning/frostRoc';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { setCliff } from '../../world/dungeon/plateau';
import { startQuake } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import type { PlayerState } from '../player/state';
import type { BossRun } from './bossRoom';

/** Where it is in its show (Enemy.move; Enemy.t counts from each): in the ice, up and hanging, coming down, landed, screaming. */
export const SHOW_ICE = 20;
export const SHOW_UP = 21;
export const SHOW_DOWN = 22;
export const SHOW_LAND = 23;
export const SHOW_SCREAM = 24;

export interface RocBeats {
  pull: number;
  wallsFrom: number;
  wallsTo: number;
  /** Its three thumps. */
  thumps: [number, number, number];
  burstAt: number;
  slowFrom: number;
  slowTo: number;
  landAt: number;
  screamAt: number;
  end: number;
}

const BEATS: RocBeats = { pull: 0, wallsFrom: 0, wallsTo: 0, thumps: [0, 0, 0], burstAt: 0, slowFrom: 0, slowTo: 0, landAt: 0, screamAt: 0, end: 0 };
/** The view lifts off your eyes this long (s); its walls take this long to go back; the gale blows this long before its first thump. */
const PULL = 0.7;
const WALLS = 2;
const GALE = 1.6;
/** It hangs this long, slowed (s); it screams this long after it lands (s). How high it gets (m). */
const HANG = 0.9;
const TO_SCREAM = 0.35;
export const APEX = 9;

export function rocBeats(): RocBeats {
  const v = FROST_ROC.v;
  const b = BEATS;
  b.pull = PULL;
  b.wallsFrom = PULL - 0.1;
  b.wallsTo = b.wallsFrom + WALLS;
  const gap = v.showThumps / 3;
  b.thumps[0] = PULL + GALE;
  b.thumps[1] = b.thumps[0] + gap;
  b.thumps[2] = b.thumps[1] + gap;
  b.burstAt = b.thumps[2] + gap;
  b.slowFrom = b.burstAt + v.showRise;
  b.slowTo = b.slowFrom + HANG;
  b.landAt = b.slowTo + v.showFall;
  b.screamAt = b.landAt + TO_SCREAM;
  b.end = b.screamAt + v.showScream + v.showBack;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** How far its walls have been forced back (0..1). */
export function rocWalls(t: number): number {
  const s = rocBeats();
  return smooth((t - s.wallsFrom) / Math.max(0.1, s.wallsTo - s.wallsFrom));
}

/** How high it is, `t` s into its show (m). */
export function rocShowY(t: number): number {
  const s = rocBeats();
  if (t <= s.burstAt || t >= s.landAt) return 0;
  if (t < s.slowFrom) {
    const c = 1 - (t - s.burstAt) / Math.max(0.1, s.slowFrom - s.burstAt);
    return APEX * (1 - c * c);
  }
  if (t < s.slowTo) return APEX;
  const k = (t - s.slowTo) / Math.max(0.1, s.landAt - s.slowTo);
  return APEX * (1 - k * k);
}

const spot = new Vector3();

function nextStage(boss: { move: number; t: number }, move: number) {
  boss.move = move;
  boss.t = 0;
}

/** One tick of its show (bossRoom.ts's 'intro', for the Frost Roc); done, the fight. `dt`: this tick's time. */
export function stepRocIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const s = rocBeats();
  const ev = combat.events;
  const before = b.t - dt;
  const crossed = (t: number) => before < t && b.t >= t;
  const p = level.boss.portal;
  const yaw = Math.atan2(-(player.pos.x - p.x), -(player.pos.z - p.z));
  if (b.slot < 0) {
    b.slot = spawnEnemy(combat.enemies, 'frostRoc', spot.set(p.x, 0, p.z), yaw);
    if (b.slot >= 0) {
      const e = combat.enemies[b.slot];
      setPhase(e, 'intro');
      e.move = SHOW_ICE;
      if (e.roc) setCliff(e.roc, level.plan);
    }
  }
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  if (!boss) return;
  boss.facing = yaw;
  b.eyeYaw = yaw;
  boss.pos.y = rocShowY(b.t);
  // (Frozen still, and tinted so, till it bursts.)
  boss.frozen = b.t < s.burstAt ? 1 : 0;
  if (crossed(s.wallsFrom)) ev.push('rocGale', b.slot, p.x, 0.1, p.z);
  s.thumps.forEach((t, i) => {
    if (crossed(t)) {
      ev.push('rocThump', i, p.x, 0.1, p.z);
      startQuake(combat.quakes, p.x, 0, p.z, 18, 10 + i * 8, 0, BOSS.v.quakeClear, 'frostRoc');
    }
  });
  if (crossed(s.burstAt)) {
    ev.push('rocBurst', b.slot, p.x, 3, p.z);
    nextStage(boss, SHOW_UP);
  }
  if (crossed(s.slowTo)) nextStage(boss, SHOW_DOWN);
  if (crossed(s.landAt)) {
    ev.push('rocStomp', 3, p.x, 0.1, p.z);
    startQuake(combat.quakes, p.x, 0, p.z, FROST_ROC.v.stompSpeed, FROST_ROC.v.stompReach, 0, BOSS.v.quakeClear, 'frostRoc');
    nextStage(boss, SHOW_LAND);
  }
  if (crossed(s.screamAt)) {
    ev.push('rocRoar', b.slot, p.x, FROST_ROC.v.rocHeight * 0.85, p.z);
    nextStage(boss, SHOW_SCREAM);
  }
  if (b.t < s.end) return;
  boss.move = 0;
  boss.pos.y = 0;
  boss.frozen = 0;
  setPhase(boss, 'chase');
  boss.cooldown = 1.2;
  b.beat = 'fight';
  b.t = 0;
}

/** The run's time as it hangs: slowed (easing in and out) while its name shows. 1: not slowed. */
export function rocSlow(b: BossRun): number {
  if (b.kind !== 'frostRoc' || !b.ownShow || b.beat !== 'intro') return 1;
  const s = rocBeats();
  const ease = 0.12;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - FROST_ROC.v.showSlow) * Math.max(0, k);
}
