// Update 0.3.59 — the Drowned King's show (at Tidebreaker's quality; spec MD_UPDATES/U0359_DROWNED_KING_SHOW.md): its own beats in place
// of the portal's (bossRoom.ts). You've stepped into a dry temple. The walls start to weep, then burst: water falling down all four, and
// the floor floods round your knees, seen from high. Then quiet, low on the water: a great fin cuts it, round you, once, faster, and goes
// under. Nothing. In its middle a crown comes up out of the water, slowly, and stops, looking at you. Then all of it bursts up, hangs,
// slowed while its name shows, and comes down: a wave rolls out under the view. Its heads snap their jaws, twice, at you: you've just
// seen its tell. Then the fight, and the first thing it does is launch them. Where it is is a pure function of the show's time, so the
// views and the skip agree. Its views: engine/temple/drownedCinema.ts, templeView.ts. Pure.
import { Vector3 } from 'three';
import { DROWNED } from '../../tuning/drowned';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { CombatState } from '../combat/state';
import { SHOW_CROWN } from '../enemies/drownedKingMoves';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import type { PlayerState } from '../player/state';
import type { BossRun } from './bossRoom';

/** Where it is in its show (Enemy.move; Enemy.t counts from each): under (its fin), its crown rising, up and hanging, down, landed. */
export const SHOW_UNDER = 20;
export { SHOW_CROWN };
export const SHOW_UP = 22;
export const SHOW_DOWN = 23;
export const SHOW_LAND = 24;

export interface DrownedBeats {
  pull: number;
  /** The walls burst, the water falling till it's up. */
  burstAt: number;
  floodTo: number;
  /** Its fin round you. */
  finFrom: number;
  finTo: number;
  /** Its crown coming up. */
  crownFrom: number;
  crownTo: number;
  /** All of it, up. */
  upAt: number;
  slowFrom: number;
  slowTo: number;
  landAt: number;
  snapAt: number;
  end: number;
}

const BEATS: DrownedBeats = { pull: 0, burstAt: 0, floodTo: 0, finFrom: 0, finTo: 0, crownFrom: 0, crownTo: 0, upAt: 0, slowFrom: 0, slowTo: 0, landAt: 0, snapAt: 0, end: 0 };
/** The view lifts off your eyes this long (s); the walls weep this long before they burst. */
const PULL = 0.7;
const WEEP = 0.5;
/** The silence with its fin gone before its crown (s); its crown stops this long, looking at you, before it bursts up. It hangs this long, slowed. */
const SILENCE = 0.5;
const CROWN_HOLD = 0.5;
const HANG = 0.9;
/** How high it gets (m); its crown's top this far out of the water as it stops. Its height's this far under the water, under. */
export const APEX = 8;
const CROWN_UP = 1.5;
const TO_SNAP = 0.35;

export function drownedBeats(): DrownedBeats {
  const v = DROWNED.v;
  const b = BEATS;
  b.pull = PULL;
  b.burstAt = PULL + WEEP;
  b.floodTo = b.burstAt + v.showFlood;
  b.finFrom = b.floodTo;
  b.finTo = b.finFrom + v.showFin;
  b.crownFrom = b.finTo + SILENCE;
  b.crownTo = b.crownFrom + v.showCrown;
  b.upAt = b.crownTo + CROWN_HOLD;
  b.slowFrom = b.upAt + v.showRise;
  b.slowTo = b.slowFrom + HANG;
  b.landAt = b.slowTo + v.showFall;
  b.snapAt = b.landAt + TO_SNAP;
  b.end = b.snapAt + v.showSnap + v.showBack;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** Its water at `t` s into its show (m): nothing till the walls burst, then up to knee deep. */
export function showWater(t: number): number {
  const s = drownedBeats();
  return DROWNED.v.shallow * smooth((t - s.burstAt) / Math.max(0.1, s.floodTo - s.burstAt));
}

/** Its fin's ring: this far toward you from its middle, this wide (m). */
export const RING_OUT = 12;
const RING_R = 9;

/** Its fin at `t` s into its show: round a ring on your side of its middle, speeding up; (toX, toZ): the way to you. */
export function finSpot(t: number, x: number, z: number, toX: number, toZ: number, out: Vector3): Vector3 {
  const s = drownedBeats();
  const k = Math.max(0, Math.min(1, (t - s.finFrom) / Math.max(0.1, s.finTo - s.finFrom)));
  // (From its middle's side, three quarters round.)
  const a = Math.PI + k * k * Math.PI * 1.5;
  return out.set(x + toX * (RING_OUT + Math.cos(a) * RING_R) + toZ * Math.sin(a) * RING_R, 0, z + toZ * (RING_OUT + Math.cos(a) * RING_R) - toX * Math.sin(a) * RING_R);
}

/** How far its walls have burst back (0..1). */
export function drownedWalls(t: number): number {
  const s = drownedBeats();
  return smooth((t - s.burstAt) / Math.max(0.1, s.floodTo - s.burstAt));
}

/** Where it stands, `t` s into its show (height of its feet: m). */
export function drownedShowY(t: number): number {
  const s = drownedBeats();
  const h = DROWNED.v.kingHeight;
  if (t >= s.landAt) return 0;
  if (t < s.crownFrom) return -h;
  // Its crown comes up, and only that.
  if (t < s.upAt) return -h + CROWN_UP * smooth((t - s.crownFrom) / Math.max(0.1, s.crownTo - s.crownFrom));
  if (t < s.slowFrom) {
    const c = 1 - (t - s.upAt) / Math.max(0.1, s.slowFrom - s.upAt);
    return -h + CROWN_UP + (APEX + h - CROWN_UP) * (1 - c * c);
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

/** One tick of its show (bossRoom.ts's 'intro', for the Drowned King); done, the fight. `dt`: this tick's time. */
export function stepDrownedIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const s = drownedBeats();
  const v = DROWNED.v;
  const ev = combat.events;
  const before = b.t - dt;
  const crossed = (t: number) => before < t && b.t >= t;
  const p = level.boss.portal;
  const yaw = Math.atan2(-(player.pos.x - p.x), -(player.pos.z - p.z));
  if (b.slot < 0) {
    b.slot = spawnEnemy(combat.enemies, 'drownedKing', spot.set(p.x, -v.kingHeight, p.z), yaw);
    if (b.slot >= 0) {
      const e = combat.enemies[b.slot];
      setPhase(e, 'intro');
      e.move = SHOW_UNDER;
    }
  }
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  if (!boss) return;
  b.eyeYaw = yaw;
  boss.pos.y = boss.prev.y = drownedShowY(b.t);
  combat.flood = showWater(b.t);
  // Its fin round you; then, its middle.
  const d = Math.max(0.1, Math.hypot(player.pos.x - p.x, player.pos.z - p.z));
  if (b.t >= s.finFrom && b.t < s.finTo) {
    finSpot(b.t, p.x, p.z, (player.pos.x - p.x) / d, (player.pos.z - p.z) / d, spot);
    boss.facing = Math.atan2(-(spot.x - boss.pos.x), -(spot.z - boss.pos.z));
    boss.pos.x = boss.prev.x = spot.x;
    boss.pos.z = boss.prev.z = spot.z;
  } else {
    boss.facing = yaw;
    boss.pos.x = boss.prev.x = p.x;
    boss.pos.z = boss.prev.z = p.z;
  }
  if (crossed(s.pull)) ev.push('drownedWeep', b.slot, p.x, 3, p.z);
  if (crossed(s.burstAt)) ev.push('drownedWalls', b.slot, p.x, 3, p.z);
  if (crossed(s.finFrom)) ev.push('drownedFinCut', b.slot, boss.pos.x, v.shallow, boss.pos.z);
  if (crossed(s.finTo)) ev.push('drownedFinGone', b.slot, boss.pos.x, v.shallow, boss.pos.z);
  if (crossed(s.crownFrom)) {
    ev.push('drownedCrown', b.slot, p.x, v.shallow, p.z);
    nextStage(boss, SHOW_CROWN);
  }
  if (crossed(s.upAt)) {
    ev.push('drownedRise', b.slot, p.x, v.shallow, p.z);
    nextStage(boss, SHOW_UP);
  }
  if (crossed(s.slowTo)) nextStage(boss, SHOW_DOWN);
  if (crossed(s.landAt)) {
    ev.push('drownedShowWave', b.slot, p.x, v.shallow, p.z);
    ev.push('drownedLand', b.slot, p.x, v.shallow, p.z);
    nextStage(boss, SHOW_LAND);
  }
  if (crossed(s.snapAt)) ev.push('drownedSnap', b.slot, p.x, v.kingHeight * 0.6, p.z);
  if (crossed(s.snapAt + v.showSnap * 0.5)) ev.push('drownedSnap', b.slot, p.x, v.kingHeight * 0.6, p.z);
  if (b.t < s.end) return;
  boss.move = 0;
  boss.pos.y = boss.prev.y = 0;
  setPhase(boss, 'chase');
  boss.cooldown = 0;
  b.beat = 'fight';
  b.t = 0;
}

/** The run's time as it hangs: slowed (easing in and out) while its name shows. 1: not slowed. */
export function drownedSlow(b: BossRun): number {
  if (b.kind !== 'drownedKing' || !b.ownShow || b.beat !== 'intro') return 1;
  const s = drownedBeats();
  const ease = 0.12;
  const k = Math.min(smooth((b.t - s.slowFrom) / ease), 1 - smooth((b.t - (s.slowTo - ease)) / ease));
  return 1 - (1 - DROWNED.v.showSlow) * Math.max(0, k);
}
