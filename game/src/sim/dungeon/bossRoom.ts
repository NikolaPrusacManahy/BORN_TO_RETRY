// Update 0.0.15 — the boss room (the designer). Stepping in shuts its gates and starts the show: the walls slide back
// as the room grows, a portal opens in the middle and the Demon rises out of it, holds its stance, and the fight
// starts as the view comes back to you (engine/cinema.ts reads the same beats). Once it rages it calls grunts. Killed,
// every grunt dies with it; its body hangs, sinks and bursts (demon.ts), leaving coins, a key and a heart; then the
// wooden gate swings open onto the dark (the way down), and the room's own gates lift. Pure and seeded.
// Update 0.0.18 — each floor its boss (kinds.ts bossOf): floor 2's is the Dragon. It screams as its stance starts (the
// view shakes). Update 0.0.21 (the designer) — the Dragon calls no wasps (raging, it bombs you from the sky); its bombs
// go with it when it dies.
// Update 0.2.0 (the designer: "bosses no longer drop the rewards right away, instead a chest spawns 3 m away from the
// exit gate") — its body bursts with nothing; what it left (its coins, a key, a heart) is in the chest that rises in
// front of the wooden gate as it opens (treasure.ts, roomLoop.ts).
// Update 0.2.3 — floor 3's is the Bone King: it roars as it takes its stance. Update 0.2.4 — floor 4's the Dino (it
// roars too). Update 0.2.10 — floor 5's the Drowned King: it roars too, and as it rises for good it calls its brood of
// Spawnlings, once (the designer: "only one wave of smaller minions, once only, not infinite"). Update 0.3.16 — floor 6's
// the Big Shark: its show is its own (sharkShow.ts: the arena floods, no portal, no walls sliding), and dead, its arena
// drains.
import type { Rng } from '../../core/rng';
import type { Spot } from '../../world/arena';
import { BOSS } from '../../tuning/boss';
import { DRAGON } from '../../tuning/dragon';
import { BONE_KING } from '../../tuning/boneKing';
import { DINO } from '../../tuning/dino';
import { DROWNED } from '../../tuning/drowned';
import { WHALE } from '../../tuning/whale';
import { BIG_SHARK } from '../../tuning/bigShark';
import { CINEMA } from '../../tuning/cinema';
import { clearQuakes } from '../combat/quakes';
import { clearBombs } from '../combat/bombs';
import type { CombatState } from '../combat/state';
import { hitEnemy, isLive, setPhase, spawnEnemy } from '../enemies/enemy';
import { ENEMY_STATS, EnemyKind } from '../enemies/kinds';
import { spawnAt } from '../enemies/waves';
import { sharkWater, stepSharkIntro } from './sharkShow';
import type { ItemKind } from '../items/items';
import type { PlayerState } from '../player/state';
import { Vector3 } from 'three';

export type BossBeat = 'waiting' | 'intro' | 'fight' | 'dying' | 'loot' | 'open';

export interface BossRun {
  /** Update 0.0.18 — which boss (the floor's), and whether its stance has started (the Dragon screams). */
  kind: EnemyKind;
  stance: boolean;
  beat: BossBeat;
  /** Seconds into the beat. */
  t: number;
  /** The boss's enemy slot (−1: not here yet). */
  slot: number;
  /** Seconds to its next call for grunts, and whether it has started calling (it rages). */
  summon: number;
  calling: boolean;
}

/** What the boss leaves you (Update 0.2.0: in its chest). Update 0.2.15 — no key any more (the designer: "the chest on
 *  a boss won does not give a key anymore, it gives scars"): its heart (and its coins, and Scars). */
export const BOSS_LOOT: readonly ItemKind[] = ['heart'];
/** It calls again only while fewer than this many grunts are left. */
const CALL_UNDER = 2;
/** Grunts never appear closer to you than this, if there's room (m). */
const CALL_CLEAR = 8;
/** After the show, a moment before its first move (s). */
const FIRST_MOVE = 1;

export function createBossRun(kind: EnemyKind = 'demon'): BossRun {
  return { kind, stance: false, beat: 'waiting', t: 0, slot: -1, summon: 0, calling: false };
}

/** Update 0.0.18 — who a boss calls once it rages, how many and how often (s) (Update 0.0.21: only the Demon calls;
 *  Update 0.2.10: and the Drowned King, once: never again, `every` Infinity). */
interface Calls {
  kind: EnemyKind;
  count: number;
  every: number;
}
const CALLS: Calls = { kind: 'grunt', count: 0, every: 0 };

function callsOf(kind: EnemyKind): Calls | null {
  if (kind === 'drownedKing') {
    CALLS.kind = 'spawnling';
    CALLS.count = DROWNED.v.brood;
    CALLS.every = Infinity;
    return CALLS;
  }
  // (Update 0.2.11 — the Old Whale's brood of Clownfish, once.)
  if (kind === 'whale') {
    CALLS.kind = 'clownfish';
    CALLS.count = WHALE.v.brood;
    CALLS.every = Infinity;
    return CALLS;
  }
  if (kind !== 'demon') return null;
  CALLS.kind = 'grunt';
  CALLS.count = BOSS.v.summonGrunts;
  CALLS.every = BOSS.v.summonEvery;
  return CALLS;
}

/** Update 0.3.24 — whom a boss calls (null: none): its floor loads their models too (floorKinds.ts). */
export const calledBy = (kind: EnemyKind): EnemyKind | null => callsOf(kind)?.kind ?? null;

/** The coins a boss leaves (Update 0.2.0: in its chest). */
export const bossCoins = (kind: EnemyKind) => (kind === 'dragon' ? DRAGON.v.dragonCoins : kind === 'boneKing' ? BONE_KING.v.kingCoins : kind === 'dino' ? DINO.v.dinoCoins : kind === 'drownedKing' ? DROWNED.v.kingCoins : kind === 'whale' ? WHALE.v.whaleCoins : kind === 'bigShark' ? BIG_SHARK.v.bigCoins : BOSS.v.demonCoins);

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
  const s = introBeats();
  return smooth((b.t - s.wallsFrom) / (s.wallsTo - s.wallsFrom));
}

/** How open the portal is (0..1): it opens, holds while the boss rises, then closes. */
export function portalOpen(b: BossRun): number {
  if (b.beat !== 'intro' || b.kind === 'bigShark') return 0;
  const s = introBeats();
  if (b.t < s.riseTo) return smooth((b.t - s.portalFrom) / (s.portalTo - s.portalFrom));
  return 1 - smooth((b.t - s.riseTo) / 0.8);
}

/** The show is on: you neither move nor fight. */
export const inShow = (b: BossRun) => b.beat === 'intro';

/** The room is shut and the show starts (stepRooms calls this as you step in). */
export function startShow(b: BossRun, combat: CombatState, at: { x: number; z: number }) {
  b.beat = 'intro';
  b.t = 0;
  combat.events.push('bossIntro', 0, at.x, 1, at.z);
}

const mid = new Vector3();

/** One tick of the boss room once its show has started. Returns true the tick the wooden gate opens. */
export function stepBoss(b: BossRun, portal: { x: number; z: number }, spawns: readonly Spot[], player: PlayerState, combat: CombatState, rng: Rng, dt: number): boolean {
  const height = ENEMY_STATS[b.kind]().height;
  const calls = callsOf(b.kind);
  const ev = combat.events;
  b.t += dt;
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  if (b.kind === 'bigShark') sharkWater(b, combat);
  switch (b.beat) {
    case 'intro': {
      if (b.kind === 'bigShark') {
        stepSharkIntro(b, portal, player, combat, dt);
        break;
      }
      const s = introBeats();
      if (!boss && b.t >= s.riseFrom) {
        mid.set(portal.x, -height, portal.z);
        b.slot = spawnEnemy(combat.enemies, b.kind, mid, Math.atan2(-(player.pos.x - portal.x), -(player.pos.z - portal.z)));
        if (b.slot >= 0) {
          setPhase(combat.enemies[b.slot], 'intro');
          ev.push('bossRise', b.slot, portal.x, 0, portal.z);
        }
        break;
      }
      if (!boss) break;
      // Up out of the portal, slowing as it arrives.
      const k = Math.max(0, Math.min(1, (b.t - s.riseFrom) / (s.riseTo - s.riseFrom)));
      boss.pos.y = -height * (1 - k) * (1 - k);
      // The Dragon screams as it takes its stance.
      if (!b.stance && b.t >= s.riseTo) {
        b.stance = true;
        if (b.kind === 'dragon') ev.push('dragonScream', b.slot, boss.pos.x, height * 0.8, boss.pos.z);
        if (b.kind === 'boneKing') ev.push('kingRoar', b.slot, boss.pos.x, height * 0.85, boss.pos.z);
        if (b.kind === 'dino') ev.push('dinoRoar', b.slot, boss.pos.x, height * 0.85, boss.pos.z);
        if (b.kind === 'drownedKing') ev.push('drownedRoar', b.slot, boss.pos.x, height * 0.85, boss.pos.z);
      }
      if (b.t >= s.end) {
        boss.pos.y = 0;
        setPhase(boss, 'chase');
        boss.cooldown = FIRST_MOVE;
        b.beat = 'fight';
        b.t = 0;
      }
      break;
    }
    case 'fight':
      if (!boss) break;
      if (boss.phase === 'dead') {
        down(b, b.slot, combat);
        break;
      }
      // Once it rages, it calls grunts: at once, then every so often while few are left.
      if (calls && boss.stage > 0 && !b.calling) {
        b.calling = true;
        b.summon = 0;
      }
      if (b.calling) {
        b.summon -= dt;
        if (calls && b.summon <= 0 && minions(combat, b.slot) < CALL_UNDER) {
          b.summon = calls.every;
          call(spawns, player, combat, rng, calls);
        }
      }
      break;
    case 'dying':
      // Its body has burst (what it leaves is in its chest: Update 0.2.0).
      if (!boss || !boss.struck) break;
      b.beat = 'loot';
      b.t = 0;
      break;
    case 'loot':
      if (b.t < CINEMA.v.gateDelay) break;
      b.beat = 'open';
      b.t = 0;
      return true;
    default:
      break;
  }
  return false;
}

/** It's dead: every grunt dies with it, its orbs and quakes are gone. */
function down(b: BossRun, slot: number, combat: CombatState) {
  const ev = combat.events;
  const boss = combat.enemies[slot];
  b.beat = 'dying';
  b.t = 0;
  ev.push('bossDown', slot, boss.pos.x, boss.pos.y + ENEMY_STATS[boss.kind]().height * 0.5, boss.pos.z);
  combat.enemies.forEach((e, i) => {
    if (i === slot || !isLive(e)) return;
    hitEnemy(e, e.hp, 0, 0, 0);
    ev.push('kill', 0, e.pos.x, e.pos.y + 1, e.pos.z);
  });
  for (const o of combat.orbs) {
    if (!o.alive) continue;
    o.alive = false;
    ev.push('orbPop', 0, o.pos.x, o.pos.y, o.pos.z);
  }
  clearQuakes(combat.quakes);
  clearBombs(combat.bombs);
}

function minions(combat: CombatState, slot: number): number {
  let n = 0;
  combat.enemies.forEach((e, i) => {
    if (i !== slot && isLive(e)) n++;
  });
  return n;
}

/** Its minions at the room's spawn spots, away from you (seeded). Update 0.2.10 — out of spots away from you (the
 *  Drowned King's brood is many), the room's others, round again. */
function call(spawns: readonly Spot[], player: PlayerState, combat: CombatState, rng: Rng, calls: Calls) {
  const far = spawns.filter((s) => Math.hypot(s.x - player.pos.x, s.z - player.pos.z) >= CALL_CLEAR);
  const pool = [...(far.length > 0 ? far : spawns)];
  for (let n = 0; n < calls.count && spawns.length > 0; n++) {
    if (pool.length === 0) pool.push(...spawns);
    spawnAt(combat.enemies, calls.kind, pool, player, rng, combat.events);
  }
}
