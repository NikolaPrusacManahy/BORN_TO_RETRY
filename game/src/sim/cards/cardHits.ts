// Update 0.2.18 — wave 2 of the Fate Cards: what their effects are made of (cardPowers.ts, buildPowers.ts use them).
// Kept here (CombatState.powers): the bleeds and burns ticking, the bolts while they're drawn, the blasts waiting their
// turn (a chain goes off one blast after another, a moment apart, never all in one tick). The engine draws them
// (engine/cardFx.ts). A boss bleeds, burns and is struck, but is never frozen. Update 0.2.22 — split out of
// cardPowers.ts; the Kills build's bonus (builds.ts) makes all of them hit harder. Pure.
import { Vector3 } from 'three';
import { BUILDS } from '../../tuning/builds';
import { CARDS } from '../../tuning/cards';
import { FISTS } from '../../tuning/combat';
import { wallBetween } from '../../world/navGrid';
import type { CombatState } from '../combat/state';
import { landHit, type TargetHit } from '../combat/strike';
import { Enemy, isLive, radiusOf } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import { lit } from './builds';

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

/** A blast to go off (`wait` s from now): Death Throes', Powder Keg's, Chain Reaction's, Aftershock's, Shrapnel's. */
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
  /** Update 0.2.22 — Static Step: you were dashing last tick (a dash begun shows as this turning true). */
  dashing: boolean;
}

const DOT_POOL = 64;
const BOLT_POOL = 16;
const BLAST_POOL = 32;
/** A bleed or burn hurts this often (s). */
const DOT_TICK = 0.25;
/** A bolt is drawn this long (s). */
export const BOLT_LIFE = 0.18;
/** At most this many blasts go off in a tick. */
const BLASTS_A_TICK = 12;
/** A blast reaches this far up or down (m); its knock, as a charged punch's. */
const LEVEL = 2.5;
const BLAST_KNOCK = 0.6;

export function createPowers(): Powers {
  return {
    dots: Array.from({ length: DOT_POOL }, () => ({ alive: false, slot: -1, kind: 'bleed' as DotKind, dps: 0, left: 0, tick: 0 })),
    bolts: Array.from({ length: BOLT_POOL }, () => ({ alive: false, from: new Vector3(), to: new Vector3(), life: 0 })),
    blasts: Array.from({ length: BLAST_POOL }, () => ({ alive: false, at: new Vector3(), radius: 0, damage: 0, wait: 0 })),
    bandT: 0,
    fire: true,
    stormT: 0,
    dashing: false,
  };
}

export function clearPowers(p: Powers) {
  for (const d of p.dots) d.alive = false;
  for (const b of p.bolts) b.alive = false;
  for (const b of p.blasts) b.alive = false;
  p.bandT = p.stormT = 0;
  p.fire = true;
  p.dashing = false;
}

const hit: TargetHit = { kind: 'enemy', index: -1, s: 0, point: new Vector3() };
export const mid = (e: Enemy, out: Vector3) => out.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.5, e.pos.z);

/** Update 0.2.22 — the cards' hits, times this (the Kills build's bonus). */
export const cardFactor = (state: CombatState) => (lit(state.items.cards, 'kills') ? 1 + BUILDS.v.kills : 1);

/** Hits enemy `i` for `damage`, pushed along (dx, dz). Returns true if it died. */
export function strike(state: CombatState, i: number, damage: number, knock: number, dx: number, dz: number, event: 'cardDot' | 'cardZap' | 'cardBlastHit', value: number, steady = false): boolean {
  const f = cardFactor(state);
  hit.index = i;
  mid(state.enemies[i], hit.point);
  return landHit(state, hit, damage * f, knock, dx, dz, event, event === 'cardDot' ? value : Math.round(value * f), steady);
}

/** Up to `n` live enemies nearest (x, z) within `range` (not `skip`, not behind a wall), nearest first. */
export function nearest(state: CombatState, x: number, z: number, range: number, n: number, skip = -1): number[] {
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

/** Every live enemy within `radius` of (x, z) (not `skip`) set bleeding or burning. */
export function afflictAround(state: CombatState, x: number, z: number, radius: number, kind: DotKind, dps: number, secs: number, skip: Enemy | null = null) {
  for (let i = 0; i < state.enemies.length; i++) {
    const o = state.enemies[i];
    if (o !== skip && isLive(o) && Math.hypot(o.pos.x - x, o.pos.z - z) <= radius + radiusOf(o)) afflict(state, i, kind, dps, secs);
  }
}

/** A blast at `at` (`wait` s from now). */
export function queueBlast(state: CombatState, at: Vector3, radius: number, damage: number, wait = 0) {
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
export function zap(state: CombatState, at: Vector3, i: number) {
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

/** Each tick: bleeds and burns hurt, bolts fade, blasts due go off. */
export function tickHits(state: CombatState, dt: number) {
  const pw = state.powers;
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
}
