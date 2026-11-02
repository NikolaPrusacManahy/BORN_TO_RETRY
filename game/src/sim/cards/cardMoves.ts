// Update 0.2.15 — what the Scars did in a fight. Update 0.2.16 — the Fate Cards' (cards.ts), where it isn't a number
// changed in place: Shoulder Charge (a dash into an enemy throws it back and staggers it: no damage; Update 0.3.20 —
// Bowling, the slide's, gone), Pogo (a killing slam bounces you back up), Hair Trigger (the parry open twice as long; 0.3.5), Iron
// Knuckles (a punch on an enemy winding up makes it start over: a mini boss's, as any hit already staggers the rest),
// Ricochet (a thrown weapon turns to the next enemy); and what kills set off (Bloodrush, Killing Spree, Giant Killer),
// what a hit is worth (Mercy Kill, the meter's Air Butcher and Reaper's Rhythm), Cold Snap's freeze, Blood Money's
// coins, Quick Hands and All In. A boss is never staggered, stalled, frozen or finished early. Pure.
import { Vector3 } from 'three';
import { CARDS } from '../../tuning/cards';
import { FISTS } from '../../tuning/combat';
import { EXECUTION } from '../../tuning/execution';
import { MOVE } from '../../tuning/movement';
import { wallBetween } from '../../world/navGrid';
import { burstCoins } from '../combat/coins';
import type { ParryTimes } from '../combat/fists';
import type { CombatState } from '../combat/state';
import { Enemy, isLive, radiusOf, setPhase } from '../enemies/enemy';
import { ENEMY_STATS, MINI_BOSSES } from '../enemies/kinds';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import { THROWN_GRAVITY, THROWN_LIFE, THROWN_RADIUS, Thrown } from '../weapons/weapons';
import { BUILDS } from '../../tuning/builds';
import { lit } from './builds';
import { boost, holds } from './cards';
import { killPowers } from './cardPowers';

/** A dash touches an enemy this much beyond your two bodies (m): before you're pushed out of it. */
const TOUCH = 0.35;
/** Which move bumps now: none, a dash (Shoulder Charge). */
const NONE = 0;
const DASH_MOVE = 1;
/** Killing Spree remembers this many kills' times. */
const SPREE_MEMORY = 8;

const way = new Vector3();
const aimAt = new Vector3();

/** The cards' clocks, each tick: Bloodrush, Killing Spree, Giant Killer (your dashes free meanwhile), Blood Money. */
export function tickCards(state: CombatState, player: PlayerState, dt: number) {
  state.clock += dt;
  state.rush = Math.max(0, state.rush - dt);
  state.frenzy = Math.max(0, state.frenzy - dt);
  state.giant = Math.max(0, state.giant - dt);
  player.freeDash = state.giant;
  // Blood Money: coins for each hit taken since the last tick.
  if (player.hits < state.hitsSeen) state.hitsSeen = player.hits;
  const hits = player.hits - state.hitsSeen;
  state.hitsSeen = player.hits;
  if (hits > 0 && holds(state, 'bloodMoney') && !state.bare) {
    const n = Math.round(CARDS.v.bloodMoney) * hits;
    state.money += burstCoins(state.coins, player.pos, n, state.rng);
    state.events.push('cardCoins', n, player.pos.x, player.pos.y + 1, player.pos.z);
  }
  // (Update 0.2.19 — Shaken, a Death Card: a hit empties the meter; Miser's Oath, a Traitor Card: a hit costs coins.)
  if (hits > 0 && holds(state, 'shaken')) state.execution = 0;
  if (hits > 0 && holds(state, 'misersOath')) state.money = Math.max(0, state.money - Math.round(CARDS.v.misersCost) * hits);
}

/** A kill of yours (enemy `e`): Bloodrush, Killing Spree, Giant Killer (and wave 2's: cardPowers.ts). */
export function onKill(state: CombatState, e: Enemy) {
  const v = CARDS.v;
  if (holds(state, 'bloodrush')) state.rush = v.bloodrushFor;
  if (holds(state, 'killingSpree')) {
    state.spree.push(state.clock);
    if (state.spree.length > SPREE_MEMORY) state.spree.shift();
    const n = Math.round(v.spreeKills);
    if (state.spree.length >= n && state.clock - state.spree[state.spree.length - n] <= v.spreeWithin) {
      if (state.frenzy <= 0) state.events.push('cardSpree', 0, e.pos.x, e.pos.y, e.pos.z);
      state.frenzy = v.spreeFor;
    }
  }
  if (holds(state, 'giantKiller') && MINI_BOSSES.includes(e.kind)) {
    state.giant = v.giantKiller;
    state.events.push('cardGiant', 0, e.pos.x, e.pos.y, e.pos.z);
  }
  // (Update 0.2.18 — wave 2's: Death Throes, Chain Reaction, Pyre, Spirit Knives.)
  killPowers(state, e);
}

/** Your attacks' speed, times this (Killing Spree). */
export const frenzyFactor = (state: CombatState) => (state.frenzy > 0 ? 1 + CARDS.v.spreeRate : 1);
/** How fast reloads go (Quick Hands: 40% quicker is 1 / 0.6 as fast). */
export const handsRate = (state: CombatState) => (holds(state, 'quickHands') ? 1 / Math.max(0.2, 1 - CARDS.v.quickHands) : 1);

/** What one kill is worth on the execution meter, and how many fill it (Air Butcher, Reaper's Rhythm). */
export function meterStep(state: CombatState): { steps: number; worth: number } {
  // (Update 0.2.19 — Fasting and Executioner's Deal, Traitor Cards: fewer, the fewest counting; Blunted Rage, a Death
  // Card: more.)
  const v = CARDS.v;
  let base = holds(state, 'reapersRhythm') ? v.reaperKills : EXECUTION.v.killsToFill;
  if (holds(state, 'fasting')) base = Math.min(base, v.fastingKills);
  if (holds(state, 'executionersDeal')) base = Math.min(base, v.executionerKills);
  // (Update 0.2.22 — the Executions build's bonus: fewer.)
  const steps = Math.max(1, Math.round(base + (holds(state, 'bluntedRage') ? v.blunted : 0) - (lit(state.items.cards, 'executions') ? BUILDS.v.executions : 0)));
  const worth = state.inAir && holds(state, 'airButcher') ? Math.round(CARDS.v.airButcher) : 1;
  return { steps, worth };
}

/** What the meter is left at after an execution (Reaper's Rhythm: half full). */
export function meterAfter(state: CombatState): number {
  if (!holds(state, 'reapersRhythm')) return 0;
  const steps = meterStep(state).steps;
  return Math.floor(steps / 2) / steps;
}

/** Mercy Kill: a hit of `damage` on enemy `e` that would leave it under the line finishes it (not a boss). */
export function mercy(state: CombatState, e: Enemy, damage: number): number {
  if (!holds(state, 'mercyKill') || ENEMY_STATS[e.kind]().boss) return damage;
  return e.hp - damage < ENEMY_STATS[e.kind]().hp * CARDS.v.mercyKill * boost(state, 'mercyKill') ? Math.max(damage, e.hp) : damage;
}

/** Cold Snap: enemy `i`, hit by a parried shot (Update 0.3.5; a charged punch before) or a slam, freezes (not a boss). */
export function chill(state: CombatState, i: number) {
  const e = state.enemies[i];
  if (!holds(state, 'coldSnap') || !isLive(e) || ENEMY_STATS[e.kind]().boss) return;
  e.frozen = Math.max(e.frozen, CARDS.v.coldSnap);
  state.events.push('freeze', i, e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z);
}

/** All In: your fists' hits, times this. Update 0.2.22 — and the Fists build's bonus. */
export const fistFactor = (state: CombatState) => (state.weapon !== null ? 1 : (holds(state, 'allIn') ? 2 : 1) * (lit(state.items.cards, 'fists') ? 1 + BUILDS.v.fists : 1));

/** Shoulder Charge: each enemy your dash runs into is thrown back along your way and away from you, and staggered (not
 *  a boss or a mini boss), once a dash. */
export function bumpEnemies(state: CombatState, player: PlayerState) {
  const move = player.dashTime > 0 && holds(state, 'shoulderCharge') ? DASH_MOVE : NONE;
  if (move !== state.bumpMove) state.bumped.length = 0;
  state.bumpMove = move;
  if (move === NONE) return;
  const dir = player.dashDir;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!isLive(e) || e.phase === 'held' || e.phase === 'rebuild' || state.bumped.includes(i)) continue;
    const s = ENEMY_STATS[e.kind]();
    const dx = e.pos.x - player.pos.x;
    const dz = e.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > radiusOf(e) + BODY.radius + TOUCH || player.pos.y > e.pos.y + s.height || player.pos.y + BODY.height < e.pos.y) continue;
    state.bumped.push(i);
    // Along your way, and out to the side you passed it on.
    way.set(dir.x + (d > 1e-3 ? dx / d : 0), 0, dir.z + (d > 1e-3 ? dz / d : 0));
    const len = Math.hypot(way.x, way.z) || 1;
    const knock = CARDS.v.bumpKnock * FISTS.v.chargeKnock * s.knock;
    e.vel.x += (way.x / len) * knock;
    e.vel.z += (way.z / len) * knock;
    e.flash = 0.12;
    if (!s.boss && !MINI_BOSSES.includes(e.kind)) setPhase(e, 'flinch');
    state.events.push('cardBump', i, e.pos.x, e.pos.y + s.height * 0.5, e.pos.z);
  }
}

/** Pogo: a slam that killed (`kills`) bounces you back up, high enough to slam again. */
export function pogo(state: CombatState, player: PlayerState, kills: number) {
  if (kills <= 0 || !holds(state, 'pogo') || player.dead) return;
  player.vel.y = Math.sqrt(2 * MOVE.v.gravity * CARDS.v.pogoHeight);
  player.grounded = false;
  player.slamBounce = 0;
  state.events.push('cardPogo', kills, player.pos.x, player.pos.y, player.pos.z);
}

/** How fast a weapon's charge (right click held) fills, ×1 as tuned: Quick Hands' quicker. (Update 0.2.19 — Heavy
 *  Hands, a Death Card: slower.) Update 0.3.5 — the fists have no charge any more (right click is the parry). */
export function chargeRate(state: CombatState): number {
  const heavy = holds(state, 'heavyHands') ? 1 / (1 + CARDS.v.heavyHands) : 1;
  return (state.weapon !== null ? handsRate(state) : 1) * heavy;
}

/** Update 0.3.5 — the parry's window and waits: Hair Trigger's window as much longer as it made the charge quicker;
 *  Giant Killer's no wait while it's on (Update 0.3.6: after a press, or after a parry). */
export function parryTimes(state: CombatState): ParryTimes {
  TIMES.window = FISTS.v.parryWindow * (holds(state, 'hairTrigger') ? 1 / Math.max(0.05, CARDS.v.hairTrigger) : 1);
  TIMES.retry = state.giant > 0 ? 0 : FISTS.v.parryRetry;
  TIMES.cooldown = state.giant > 0 ? 0 : FISTS.v.parryCooldown;
  return TIMES;
}
const TIMES: ParryTimes = { window: 0, retry: 0, cooldown: 0 };

/** Iron Knuckles: enemy `i`, just punched, starts its windup over (not a boss). */
export function stall(state: CombatState, i: number) {
  const e = state.enemies[i];
  if (!holds(state, 'ironKnuckles') || !isLive(e) || e.phase !== 'windup' || ENEMY_STATS[e.kind]().boss) return;
  e.t = 0;
  state.events.push('cardStall', i, e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height, e.pos.z);
}

/** Ricochet: thrown weapon `t`, which has just hit enemy `skip` (at `at`), turns on to the next enemy (once a throw).
 *  Returns true if it did (it flies on); false: it breaks as before. */
export function ricochet(state: CombatState, t: Thrown, at: Vector3, skip: number): boolean {
  if (t.returns || t.bounces > 0 || !holds(state, 'ricochet')) return false;
  const first = state.enemies[skip];
  const i = nextTarget(state, first.pos, skip);
  if (i < 0) return false;
  const e = state.enemies[i];
  // From just outside the one it hit (its middle, out past its body: so it can't hit it again), towards the next.
  const hx = e.pos.x - first.pos.x;
  const hz = e.pos.z - first.pos.z;
  const h = Math.hypot(hx, hz) || 1;
  const out = radiusOf(first) + THROWN_RADIUS + 0.1;
  t.pos.set(first.pos.x + (hx / h) * out, at.y, first.pos.z + (hz / h) * out);
  aimAt.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z).sub(t.pos);
  const dist = Math.max(aimAt.length(), 1e-3);
  const speed = Math.max(t.vel.length(), 1);
  const time = dist / speed;
  // Straight at it, a little higher for the drop on the way.
  t.vel.copy(aimAt).multiplyScalar(speed / dist);
  t.vel.y += 0.5 * THROWN_GRAVITY * time;
  t.life = Math.max(t.life, Math.min(THROWN_LIFE, time + 0.3));
  t.bounces++;
  state.events.push('cardRicochet', i, t.pos.x, t.pos.y, t.pos.z);
  return true;
}

/** Ricochet: the live enemy nearest `from` (not `skip`) within reach and not behind a wall, or −1. */
export function nextTarget(state: CombatState, from: Vector3, skip: number): number {
  let best = -1;
  let bestD = CARDS.v.ricochetRange;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (i === skip || !isLive(e) || e.phase === 'held') continue;
    const d = Math.hypot(e.pos.x - from.x, e.pos.z - from.z);
    if (d >= bestD || wallBetween(state.nav.small, from.x, from.z, e.pos.x, e.pos.z)) continue;
    bestD = d;
    best = i;
  }
  return best;
}
