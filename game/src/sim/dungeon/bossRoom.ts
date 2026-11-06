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
// Update 0.3.36 (the designer: "Add a skip button while the Intro is played for any boss -> "SPACE" to skip") — any
// boss's show skipped (`skip`): run on to its end at once, each of its beats done (its boss where its show leaves it,
// you where it puts you), unheard; what its view keeps of it (Tidebreaker's crater) still told.
import type { Rng } from '../../core/rng';
import type { Spot } from '../../world/arena';
import { DRAGON } from '../../tuning/dragon';
import { SWARM } from '../../tuning/swarm';
import { BONE_KING } from '../../tuning/boneKing';
import { DINO } from '../../tuning/dino';
import { DROWNED } from '../../tuning/drowned';
import { WHALE } from '../../tuning/whale';
import { BIG_SHARK } from '../../tuning/bigShark';
import { CINEMA } from '../../tuning/cinema';
import { clearQuakes } from '../combat/quakes';
import { clearBombs } from '../combat/bombs';
import { clearPuddles } from '../combat/puddles';
import type { CombatState } from '../combat/state';
import { hitEnemy, isLive, setPhase, spawnEnemy } from '../enemies/enemy';
import { ENEMY_STATS, EnemyKind } from '../enemies/kinds';
import { spawnAt } from '../enemies/waves';
import { sharkWater, stepSharkIntro } from './sharkShow';
import { stepTideIntro } from './tideShow';
import { introBeats } from './bossBeats';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { ItemKind } from '../items/items';
import type { PlayerState } from '../player/state';
import { Vector3 } from 'three';
import { FROST_ROC } from '../../tuning/frostRoc';
import { setCliff } from '../../world/dungeon/plateau';
import { TIDEBREAKER } from '../../tuning/tidebreaker';
import { OKAMI } from '../../tuning/okami';
import { stepOkamiIntro } from './okamiShow';
import { stepDragonIntro } from './dragonShow';
import { stepSwarmIntro } from './swarmShow';
import { stepKingIntro } from './kingShow';
import { stepRocIntro } from './rocShow';

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
  /** Update 0.3.36 — its show to be skipped (SPACE). */
  skip: boolean;
  /** Update 0.3.50 — its own show, in its own room (the Dragon's; Update 0.3.52, The Swarm's): off, it rises out of the shared
   *  portal (the shared intro's tests). */
  ownShow: boolean;
  /** Update 0.3.57 — the way the Frost Roc in its ice faces (its eyes are the show's: engine/norse/plateauView.ts). */
  eyeYaw: number;
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

export function createBossRun(kind: EnemyKind = 'dragon'): BossRun {
  return { kind, stance: false, beat: 'waiting', t: 0, slot: -1, summon: 0, calling: false, skip: false, eyeYaw: 0, ownShow: kind === 'dragon' || kind === 'swarm' || kind === 'boneKing' || kind === 'frostRoc' };
}

/** Update 0.0.18 — who a boss calls once it rages, how many and how often (s) (Update 0.0.21: only the Demon called;
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
  // (Update 0.3.41 — the Demon's grunts gone with it.)
  return null;
}

/** Update 0.3.24 — whom a boss calls (null: none): its floor loads their models too (floorKinds.ts). */
export const calledBy = (kind: EnemyKind): EnemyKind | null => callsOf(kind)?.kind ?? null;

/** Update 0.2.1 (the designer) — every boss's chest gives 15 coins (a boss with no knob of its own; Update 0.3.41 — the
 *  Demon's knob gone with it). */
const BOSS_COINS = 15;

/** The coins a boss leaves (Update 0.2.0: in its chest). */
export const bossCoins = (kind: EnemyKind) => (kind === 'dragon' ? DRAGON.v.dragonCoins : kind === 'swarm' ? SWARM.v.coins : kind === 'boneKing' ? BONE_KING.v.kingCoins : kind === 'dino' ? DINO.v.dinoCoins : kind === 'drownedKing' ? DROWNED.v.kingCoins : kind === 'whale' ? WHALE.v.whaleCoins : kind === 'bigShark' ? BIG_SHARK.v.bigCoins : kind === 'frostRoc' ? FROST_ROC.v.rocCoins : kind === 'tidebreaker' ? TIDEBREAKER.v.tideCoins : kind === 'okami' ? OKAMI.v.okamiCoins : BOSS_COINS);

export { inShow, introBeats, portalOpen, wallsOpen, type IntroBeats } from './bossBeats';

/** The room is shut and the show starts (stepRooms calls this as you step in). */
export function startShow(b: BossRun, combat: CombatState, at: { x: number; z: number }) {
  b.beat = 'intro';
  b.t = 0;
  combat.events.push('bossIntro', 0, at.x, 1, at.z);
}

const mid = new Vector3();

/** A show skipped runs on in steps this long (s), at most this many. What a skipped show's events leave for good (its
 *  view's), still told. */
const SKIP_DT = 1 / 30;
const SKIP_STEPS = 3000;
const SKIP_KEEP: ReadonlySet<string> = new Set(['tideArrive']);

/** One tick of the boss room once its show has started. Returns true the tick the wooden gate opens. */
export function stepBoss(b: BossRun, portal: { x: number; z: number }, spawns: readonly Spot[], player: PlayerState, combat: CombatState, rng: Rng, dt: number, level?: DungeonLevel): boolean {
  if (b.skip && b.beat === 'intro') {
    b.skip = false;
    skipShow(b, portal, spawns, player, combat, rng, level);
    return false;
  }
  b.skip = false;
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
      // (Update 0.3.31 — Tidebreaker's own show: tideShow.ts.)
      if (b.kind === 'tidebreaker' && level) {
        stepTideIntro(b, level, player, combat, dt);
        break;
      }
      // (Update 0.3.50 — the Dragon's: dragonShow.ts.)
      if (b.kind === 'dragon' && b.ownShow && level) {
        stepDragonIntro(b, level, player, combat, dt);
        break;
      }
      // (Update 0.3.52 — The Swarm's: swarmShow.ts.)
      if (b.kind === 'swarm' && b.ownShow && level) {
        stepSwarmIntro(b, level, player, combat, dt);
        break;
      }
      // (Update 0.3.57 — the Frost Roc's: rocShow.ts.)
      if (b.kind === 'frostRoc' && b.ownShow && level) {
        stepRocIntro(b, level, player, combat, dt);
        break;
      }
      // (Update 0.3.54 — the Bone King's: kingShow.ts.)
      if (b.kind === 'boneKing' && b.ownShow && level) {
        stepKingIntro(b, level, player, combat, dt);
        break;
      }
      // (Update 0.3.34 — Yokai : Okami's: okamiShow.ts.)
      if (b.kind === 'okami' && level) {
        stepOkamiIntro(b, level, player, combat, dt);
        break;
      }
      const s = introBeats();
      if (!boss && b.t >= s.riseFrom) {
        mid.set(portal.x, -height, portal.z);
        b.slot = spawnEnemy(combat.enemies, b.kind, mid, Math.atan2(-(player.pos.x - portal.x), -(player.pos.z - portal.z)));
        if (b.slot >= 0) {
          setPhase(combat.enemies[b.slot], 'intro');
          // (Update 0.3.56 — the Frost Roc knows where its cliff is.)
          const roc = combat.enemies[b.slot].roc;
          if (roc && level) setCliff(roc, level.plan);
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
        if (b.kind === 'frostRoc') ev.push('rocRoar', b.slot, boss.pos.x, height * 0.85, boss.pos.z);
        if (b.kind === 'tidebreaker') ev.push('tideRoar', 0, boss.pos.x, height * 0.85, boss.pos.z);
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
      // (Update 0.3.58 — the Drowned King's after its first Maw of Many is done with.)
      if (calls && boss.stage > 0 && !b.calling && (b.kind !== 'drownedKing' || (boss.ult.count > 0 && boss.phase === 'chase'))) {
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

/** Its show run on to its end at once (its beats each done; their sounds and shakes not, but what stays). */
function skipShow(b: BossRun, portal: { x: number; z: number }, spawns: readonly Spot[], player: PlayerState, combat: CombatState, rng: Rng, level?: DungeonLevel) {
  const ev = combat.events;
  const kept: { kind: Parameters<typeof ev.push>[0]; value: number; x: number; y: number; z: number }[] = [];
  for (let i = 0; i < SKIP_STEPS && b.beat === 'intro'; i++) {
    stepBoss(b, portal, spawns, player, combat, rng, SKIP_DT, level);
    for (let k = 0; k < ev.length; k++) {
      const e = ev.at(k);
      if (SKIP_KEEP.has(e.kind)) kept.push({ kind: e.kind, value: e.value, x: e.x, y: e.y, z: e.z });
    }
    ev.clear();
  }
  for (const e of kept) ev.push(e.kind, e.value, e.x, e.y, e.z);
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
  // (Update 0.3.49 — the Dragon's burning pools go out with it.)
  clearPuddles(combat.puddles);
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
