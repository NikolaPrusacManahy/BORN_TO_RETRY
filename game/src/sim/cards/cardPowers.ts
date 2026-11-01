// Update 0.2.18 — wave 2 of the Fate Cards (the designer: "just build wave 2"): the cards with effects of their own.
// Jagged Knuckles (jabs bleed), Pyre (a kill sets those near it on fire), Fire and Ice (a big hit throws a ring: fire,
// then ice), Thunderclap and Storm Heart (lightning), Death Throes, Powder Keg and Chain Reaction (blasts), Spirit Knives
// (a kill's knives home in), Splinter (a throw split in three). Kept here (CombatState.powers): the bleeds and burns
// ticking, the bolts while they're drawn, the blasts waiting their turn (a chain goes off one blast after another, a
// moment apart, never all in one tick). The engine draws them (engine/cardFx.ts). A boss bleeds, burns and is struck,
// but is never frozen. Pure.
import { Vector3 } from 'three';
import { CARDS } from '../../tuning/cards';
import { FISTS } from '../../tuning/combat';
import { wallBetween } from '../../world/navGrid';
import type { CombatState } from '../combat/state';
import { landHit, type TargetHit } from '../combat/strike';
import { Enemy, isLive, radiusOf } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import type { Thrown } from '../weapons/weapons';
import { holds } from './cards';

export type DotKind = 'bleed' | 'burn';

/** An enemy bleeding or burning: its slot, damage a second, seconds left, time since its last tick. */
export interface Dot {
  alive: boolean;
  slot: number;
  kind: DotKind;
  dps: number;
  left: number;
  tick: number;
}

/** A bolt of lightning, while it's drawn. */
export interface Bolt {
  alive: boolean;
  from: Vector3;
  to: Vector3;
  life: number;
}

/** A blast to go off (`wait` s from now): Death Throes', Powder Keg's, Chain Reaction's. */
export interface Blast {
  alive: boolean;
  at: Vector3;
  radius: number;
  damage: number;
  wait: number;
}

export interface Powers {
  dots: Dot[];
  bolts: Bolt[];
  blasts: Blast[];
  /** Fire and Ice: seconds before the next ring, and whether it's fire. Storm Heart: seconds since its last strike. */
  bandT: number;
  fire: boolean;
  stormT: number;
}

const DOT_POOL = 64;
const BOLT_POOL = 16;
const BLAST_POOL = 32;
/** A bleed or burn hurts this often (s). */
const DOT_TICK = 0.25;
/** A bolt is drawn this long (s). */
export const BOLT_LIFE = 0.18;
/** A chained blast goes off this long after the one that set it off (s); at most this many go off in a tick. */
const CHAIN_WAIT = 0.09;
const BLASTS_A_TICK = 12;
/** A blast reaches this far up or down (m); its knock, as a charged punch's. */
const LEVEL = 2.5;
const BLAST_KNOCK = 0.6;
/** Spirit Knives: their speed (m/s), how long they fly (s), how high over the body they leave (m). */
const SPIRIT_SPEED = 20;
const SPIRIT_LIFE = 2.5;
const SPIRIT_UP = 1.2;
/** Your chest, where Storm Heart's bolts leave from (m over your feet). */
const CHEST = 1.3;

export function createPowers(): Powers {
  return {
    dots: Array.from({ length: DOT_POOL }, () => ({ alive: false, slot: -1, kind: 'bleed' as DotKind, dps: 0, left: 0, tick: 0 })),
    bolts: Array.from({ length: BOLT_POOL }, () => ({ alive: false, from: new Vector3(), to: new Vector3(), life: 0 })),
    blasts: Array.from({ length: BLAST_POOL }, () => ({ alive: false, at: new Vector3(), radius: 0, damage: 0, wait: 0 })),
    bandT: 0,
    fire: true,
    stormT: 0,
  };
}

export function clearPowers(p: Powers) {
  for (const d of p.dots) d.alive = false;
  for (const b of p.bolts) b.alive = false;
  for (const b of p.blasts) b.alive = false;
  p.bandT = p.stormT = 0;
  p.fire = true;
}

const hit: TargetHit = { kind: 'enemy', index: -1, s: 0, point: new Vector3() };
const from = new Vector3();
/** A kill's middle (its own: a kill can come in the middle of Storm Heart's strikes, which go out from `from`). */
const body = new Vector3();
const mid = (e: Enemy, out: Vector3) => out.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z);

/** Hits enemy `i` for `damage`, pushed along (dx, dz). Returns true if it died. */
function strike(state: CombatState, i: number, damage: number, knock: number, dx: number, dz: number, event: 'cardDot' | 'cardZap' | 'cardBlastHit', value: number, steady = false): boolean {
  hit.index = i;
  mid(state.enemies[i], hit.point);
  return landHit(state, hit, damage, knock, dx, dz, event, value, steady);
}

/** Up to `n` live enemies nearest (x, z) within `range` (not `skip`, not behind a wall), nearest first. */
function nearest(state: CombatState, x: number, z: number, range: number, n: number, skip = -1): number[] {
  const found: { i: number; d: number }[] = [];
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (i === skip || !isLive(e) || e.phase === 'held') continue;
    const d = Math.hypot(e.pos.x - x, e.pos.z - z);
    if (d <= range && !wallBetween(state.nav.small, x, z, e.pos.x, e.pos.z)) found.push({ i, d });
  }
  return found
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((f) => f.i);
}

/** Sets enemy `slot` bleeding or burning for `secs` at `dps` (a new one starts it over). */
export function afflict(state: CombatState, slot: number, kind: DotKind, dps: number, secs: number) {
  const dots = state.powers.dots;
  const had = dots.find((d) => d.alive && d.slot === slot && d.kind === kind);
  const d = had ?? dots.find((x) => !x.alive);
  if (!d) return;
  if (!had) d.tick = 0;
  d.alive = true;
  d.slot = slot;
  d.kind = kind;
  d.dps = dps;
  d.left = secs;
}

/** A blast at `at` (`wait` s from now). */
function queueBlast(state: CombatState, at: Vector3, radius: number, damage: number, wait = 0) {
  const b = state.powers.blasts.find((x) => !x.alive);
  if (!b) return;
  b.alive = true;
  b.at.copy(at);
  b.radius = radius;
  b.damage = damage;
  b.wait = wait;
}

/** A blast going off: everything within its reach (not behind a wall) hit, half as hard at the edge, thrown out. */
function blast(state: CombatState, b: Blast) {
  state.events.push('cardBoom', b.radius, b.at.x, b.at.y, b.at.z);
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!isLive(e) || e.phase === 'held') continue;
    const dx = e.pos.x - b.at.x;
    const dz = e.pos.z - b.at.z;
    const d = Math.hypot(dx, dz);
    if (d > b.radius + radiusOf(e) || Math.abs(e.pos.y - b.at.y) > LEVEL || wallBetween(state.nav.small, b.at.x, b.at.z, e.pos.x, e.pos.z)) continue;
    const k = Math.min(1, d / b.radius);
    const damage = Math.round(b.damage * (1 - 0.5 * k));
    strike(state, i, damage, FISTS.v.chargeKnock * BLAST_KNOCK, d > 1e-3 ? dx / d : 0, d > 1e-3 ? dz / d : -1, 'cardBlastHit', damage);
  }
}

/** A bolt from `at` to enemy `i`, and its hit. */
function zap(state: CombatState, at: Vector3, i: number) {
  const e = state.enemies[i];
  const b = state.powers.bolts.find((x) => !x.alive);
  if (b) {
    b.alive = true;
    b.from.copy(at);
    mid(e, b.to);
    b.life = BOLT_LIFE;
  }
  const dx = e.pos.x - at.x;
  const dz = e.pos.z - at.z;
  const d = Math.hypot(dx, dz) || 1;
  strike(state, i, CARDS.v.zapDamage, 0.3, dx / d, dz / d, 'cardZap', CARDS.v.zapDamage);
}

/** Each tick: bleeds and burns hurt, bolts fade, blasts due go off, Storm Heart strikes, Fire and Ice cools down. */
export function tickPowers(state: CombatState, player: PlayerState, dt: number) {
  const v = CARDS.v;
  const pw = state.powers;
  pw.bandT = Math.max(0, pw.bandT - dt);
  for (const d of pw.dots) {
    if (!d.alive) continue;
    const e = state.enemies[d.slot];
    if (!isLive(e) || e.phase === 'held') {
      d.alive = false;
      continue;
    }
    d.left -= dt;
    d.tick += dt;
    while (d.tick >= DOT_TICK && isLive(e)) {
      d.tick -= DOT_TICK;
      strike(state, d.slot, d.dps * DOT_TICK, 0, 0, 0, 'cardDot', d.kind === 'burn' ? 1 : 0, true);
    }
    if (d.left <= 0 || !isLive(e)) d.alive = false;
  }
  for (const b of pw.bolts) if (b.alive && (b.life -= dt) <= 0) b.alive = false;
  let n = 0;
  for (const b of pw.blasts) {
    if (!b.alive || (b.wait -= dt) > 0) continue;
    if (n++ >= BLASTS_A_TICK) break;
    b.alive = false;
    blast(state, b);
  }
  if (!holds(state, 'stormHeart') || player.dead) return;
  pw.stormT += dt;
  if (pw.stormT < v.stormEvery) return;
  const near = nearest(state, player.pos.x, player.pos.z, v.stormRange, Math.round(v.zapTargets));
  if (near.length === 0) return;
  pw.stormT = 0;
  from.set(player.pos.x, player.pos.y + CHEST, player.pos.z);
  state.events.push('cardStorm', near.length, from.x, from.y, from.z);
  for (const i of near) zap(state, from, i);
}

/** A kill of yours (enemy `e`): Death Throes, Chain Reaction, Pyre, Spirit Knives. */
export function killPowers(state: CombatState, e: Enemy) {
  const v = CARDS.v;
  mid(e, body);
  if (holds(state, 'deathThroes') && state.rng() < v.throesChance) queueBlast(state, body, v.throesRadius, v.throesDamage);
  if (holds(state, 'chainReaction')) queueBlast(state, body, v.chainRadius, v.chainDamage, CHAIN_WAIT);
  if (holds(state, 'pyre')) {
    state.events.push('cardPyre', 0, body.x, body.y, body.z);
    for (let i = 0; i < state.enemies.length; i++) {
      const o = state.enemies[i];
      if (o !== e && isLive(o) && Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z) <= v.pyreRadius + radiusOf(o)) afflict(state, i, 'burn', v.burnDps, v.burnFor);
    }
  }
  if (holds(state, 'spiritKnives')) spirits(state, e);
}

/** Spirit Knives: knives out of `e`'s body, each turning after an enemy near it. */
function spirits(state: CombatState, e: Enemy) {
  const v = CARDS.v;
  const targets = nearest(state, e.pos.x, e.pos.z, v.spiritRange, Math.round(v.spiritKnives));
  if (targets.length === 0) return;
  for (let k = 0; k < Math.round(v.spiritKnives); k++) {
    const knife = state.knives.find((x) => !x.alive);
    if (!knife) return;
    const t = state.enemies[targets[k % targets.length]];
    knife.alive = true;
    knife.stuck = false;
    knife.pos.set(e.pos.x, e.pos.y + SPIRIT_UP, e.pos.z);
    mid(t, knife.vel).sub(knife.pos);
    // Fanned out at first; they turn after their marks.
    knife.vel.y += 2 + k;
    knife.vel.setLength(SPIRIT_SPEED);
    knife.life = SPIRIT_LIFE;
    knife.hand = 2;
    knife.kind = 'daggers';
    knife.home = targets[k % targets.length];
  }
  state.events.push('cardSpirit', targets.length, e.pos.x, e.pos.y + SPIRIT_UP, e.pos.z);
}

/** Jagged Knuckles: enemy `i`, jabbed, bleeds. */
export function jabPowers(state: CombatState, i: number) {
  if (holds(state, 'jaggedKnuckles') && isLive(state.enemies[i])) afflict(state, i, 'bleed', CARDS.v.bleedDps, CARDS.v.bleedFor);
}

/** A charged punch landed on enemy `i` at `at`: Thunderclap's lightning, Powder Keg's blast. */
export function heavyPowers(state: CombatState, i: number, at: Vector3) {
  const v = CARDS.v;
  if (holds(state, 'thunderclap')) for (const j of nearest(state, at.x, at.z, v.thunderRange, Math.round(v.zapTargets), i)) zap(state, at, j);
  if (holds(state, 'powderKeg')) queueBlast(state, at, v.kegRadius, v.kegDamage);
}

/** A thrown weapon broke at `at` (on what it hit, or a wall): Powder Keg's blast. */
export function breakPowers(state: CombatState, at: Vector3) {
  if (holds(state, 'powderKeg')) queueBlast(state, at, CARDS.v.kegRadius, CARDS.v.kegDamage);
}

/** Fire and Ice: a hit of `damage` at `at` throws a ring (fire, then ice) round it, if it's hard enough and ready. */
export function bigHit(state: CombatState, at: Vector3, damage: number) {
  const v = CARDS.v;
  const pw = state.powers;
  if (!holds(state, 'fireAndIce') || damage < v.bandHit || pw.bandT > 0) return;
  pw.bandT = v.bandEvery;
  const fire = pw.fire;
  pw.fire = !fire;
  state.events.push('cardRing', fire ? 1 : 0, at.x, at.y, at.z);
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!isLive(e) || Math.hypot(e.pos.x - at.x, e.pos.z - at.z) > v.bandRadius + radiusOf(e)) continue;
    if (fire) afflict(state, i, 'burn', v.burnDps, v.burnFor);
    else if (!ENEMY_STATS[e.kind]().boss) e.frozen = Math.max(e.frozen, v.bandFreeze);
  }
}

/** Splinter: a weapon just thrown (`t`, one that breaks) splits in three, the other two either side of it. */
export function splinter(state: CombatState, t: Thrown) {
  if (!holds(state, 'splinter') || t.returns) return;
  const a = (CARDS.v.splinter * Math.PI) / 180;
  for (const side of [-1, 1]) {
    const c = state.thrown.find((x) => !x.alive);
    if (!c) return;
    Object.assign(c, { alive: true, kind: t.kind, spin: t.spin, life: t.life, returns: false, power: t.power, phase: t.phase, uses: t.uses, speed: 0, struckN: 0, bounces: 0 });
    c.pos.copy(t.pos);
    const s = Math.sin(a * side);
    const co = Math.cos(a * side);
    c.vel.set(t.vel.x * co - t.vel.z * s, t.vel.y, t.vel.x * s + t.vel.z * co);
  }
  state.events.push('cardSplinter', 0, t.pos.x, t.pos.y, t.pos.z);
}
