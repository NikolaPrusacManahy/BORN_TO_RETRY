// Update 0.0.15 — the boss room (the designer). Stepping in shuts its gates and starts the show: the walls slide back
// as the room grows, a portal opens in the middle and the Demon rises out of it, holds its stance, and the fight
// starts as the view comes back to you (engine/cinema.ts reads the same beats). Once it rages it calls grunts. Killed,
// every grunt dies with it; its body hangs, sinks and bursts (demon.ts), leaving coins, a key and a heart; then the
// wooden gate swings open onto the dark (the way down), and the room's own gates lift. Pure and seeded.
import type { Rng } from '../../core/rng';
import type { Spot } from '../../world/arena';
import { BOSS } from '../../tuning/boss';
import { CINEMA } from '../../tuning/cinema';
import { burstCoins } from '../combat/coins';
import { clearQuakes } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { hitEnemy, isLive, setPhase, spawnEnemy } from '../enemies/enemy';
import { spawnAt } from '../enemies/waves';
import { ITEM_KINDS, ItemKind, takeItem } from '../items/items';
import type { PlayerState } from '../player/state';
import { Vector3 } from 'three';

export type BossBeat = 'waiting' | 'intro' | 'fight' | 'dying' | 'loot' | 'open';

export interface BossRun {
  beat: BossBeat;
  /** Seconds into the beat. */
  t: number;
  /** The boss's enemy slot (−1: not here yet). */
  slot: number;
  /** Seconds to its next call for grunts, and whether it has started calling (it rages). */
  summon: number;
  calling: boolean;
}

/** What the boss leaves you. **(placeholder)** */
const LOOT: readonly ItemKind[] = ['key', 'heart'];
/** It calls again only while fewer than this many grunts are left. */
const CALL_UNDER = 2;
/** Grunts never appear closer to you than this, if there's room (m). */
const CALL_CLEAR = 8;
/** After the show, a moment before its first move (s). */
const FIRST_MOVE = 1;

export function createBossRun(): BossRun {
  return { beat: 'waiting', t: 0, slot: -1, summon: 0, calling: false };
}

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
  if (b.beat === 'waiting') return 0;
  if (b.beat !== 'intro') return 1;
  const s = introBeats();
  return smooth((b.t - s.wallsFrom) / (s.wallsTo - s.wallsFrom));
}

/** How open the portal is (0..1): it opens, holds while the boss rises, then closes. */
export function portalOpen(b: BossRun): number {
  if (b.beat !== 'intro') return 0;
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
  const v = BOSS.v;
  const ev = combat.events;
  b.t += dt;
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  switch (b.beat) {
    case 'intro': {
      const s = introBeats();
      if (!boss && b.t >= s.riseFrom) {
        mid.set(portal.x, -v.demonHeight, portal.z);
        b.slot = spawnEnemy(combat.enemies, 'demon', mid, Math.atan2(-(player.pos.x - portal.x), -(player.pos.z - portal.z)));
        if (b.slot >= 0) {
          setPhase(combat.enemies[b.slot], 'intro');
          ev.push('bossRise', b.slot, portal.x, 0, portal.z);
        }
        break;
      }
      if (!boss) break;
      // Up out of the portal, slowing as it arrives.
      const k = Math.max(0, Math.min(1, (b.t - s.riseFrom) / (s.riseTo - s.riseFrom)));
      boss.pos.y = -v.demonHeight * (1 - k) * (1 - k);
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
      if (boss.stage > 0 && !b.calling) {
        b.calling = true;
        b.summon = 0;
      }
      if (b.calling) {
        b.summon -= dt;
        if (b.summon <= 0 && minions(combat, b.slot) < CALL_UNDER) {
          b.summon = v.summonEvery;
          call(spawns, player, combat, rng);
        }
      }
      break;
    case 'dying':
      if (!boss || !boss.struck) break;
      // Its body has burst: what it leaves you.
      mid.set(boss.pos.x, boss.pos.y + v.demonHeight * 0.5, boss.pos.z);
      combat.money += burstCoins(combat.coins, mid, v.demonCoins, rng);
      for (const kind of LOOT) {
        takeItem(kind, player, combat);
        ev.push('bossLoot', ITEM_KINDS.indexOf(kind), mid.x, mid.y, mid.z);
      }
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
  ev.push('bossDown', slot, boss.pos.x, boss.pos.y + BOSS.v.demonHeight * 0.5, boss.pos.z);
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
}

function minions(combat: CombatState, slot: number): number {
  let n = 0;
  combat.enemies.forEach((e, i) => {
    if (i !== slot && isLive(e)) n++;
  });
  return n;
}

/** Grunts at the room's spawn spots, away from you (seeded). */
function call(spawns: readonly Spot[], player: PlayerState, combat: CombatState, rng: Rng) {
  const far = spawns.filter((s) => Math.hypot(s.x - player.pos.x, s.z - player.pos.z) >= CALL_CLEAR);
  const pool = [...(far.length > 0 ? far : spawns)];
  for (let n = 0; n < BOSS.v.summonGrunts && pool.length > 0; n++) spawnAt(combat.enemies, 'grunt', pool, player, rng, combat.events);
}
