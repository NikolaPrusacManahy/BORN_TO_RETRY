// Update 0.2.18 — wave 2 of the Fate Cards (the designer: "just build wave 2"): the cards with effects of their own.
// Jagged Knuckles (jabs bleed), Pyre (a kill sets those near it on fire), Fire and Ice (a big hit throws a ring: fire,
// then ice), Thunderclap and Storm Heart (lightning), Death Throes, Powder Keg and Chain Reaction (blasts), Spirit Knives
// (a kill's knives home in), Splinter (a throw split in three). What they're made of: cardHits.ts. Update 0.2.22 — dealt
// again as II, each is stronger (cards.ts `boost`). Pure.
import { Vector3 } from 'three';
import { CARDS } from '../../tuning/cards';
import type { CombatState } from '../combat/state';
import { Enemy, isLive, radiusOf } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import type { Thrown } from '../weapons/weapons';
import { afflict, afflictAround, mid, nearest, queueBlast, tickHits, zap } from './cardHits';
import { boost, holds } from './cards';

/** A chained blast goes off this long after the one that set it off (s). */
const CHAIN_WAIT = 0.09;
/** Spirit Knives: their speed (m/s), how long they fly (s), how high over the body they leave (m). */
const SPIRIT_SPEED = 20;
const SPIRIT_LIFE = 2.5;
const SPIRIT_UP = 1.2;
/** Your chest, where Storm Heart's bolts leave from (m over your feet). */
const CHEST = 1.3;

const from = new Vector3();
/** A kill's middle (its own: a kill can come in the middle of Storm Heart's strikes, which go out from `from`). */
const body = new Vector3();

/** Each tick: bleeds and burns hurt, bolts fade, blasts due go off, Storm Heart strikes, Fire and Ice cools down. */
export function tickPowers(state: CombatState, player: PlayerState, dt: number) {
  const v = CARDS.v;
  const pw = state.powers;
  pw.bandT = Math.max(0, pw.bandT - dt);
  tickHits(state, dt);
  if (!holds(state, 'stormHeart') || player.dead) return;
  pw.stormT += dt;
  if (pw.stormT < v.stormEvery / boost(state, 'stormHeart')) return;
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
  if (holds(state, 'deathThroes') && state.rng() < v.throesChance * boost(state, 'deathThroes')) queueBlast(state, body, v.throesRadius, v.throesDamage);
  if (holds(state, 'chainReaction')) queueBlast(state, body, v.chainRadius, v.chainDamage * boost(state, 'chainReaction'), CHAIN_WAIT);
  if (holds(state, 'pyre')) {
    state.events.push('cardPyre', 0, body.x, body.y, body.z);
    afflictAround(state, e.pos.x, e.pos.z, v.pyreRadius * boost(state, 'pyre'), 'burn', v.burnDps, v.burnFor, e);
  }
  if (holds(state, 'spiritKnives')) spirits(state, e);
}

/** Spirit Knives: knives out of `e`'s body, each turning after an enemy near it. */
function spirits(state: CombatState, e: Enemy) {
  const v = CARDS.v;
  const count = Math.round(v.spiritKnives * boost(state, 'spiritKnives'));
  const targets = nearest(state, e.pos.x, e.pos.z, v.spiritRange, count);
  if (targets.length === 0) return;
  for (let k = 0; k < count; k++) {
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
  if (holds(state, 'jaggedKnuckles') && isLive(state.enemies[i])) afflict(state, i, 'bleed', CARDS.v.bleedDps * boost(state, 'jaggedKnuckles'), CARDS.v.bleedFor);
}

/** A parried shot (Update 0.3.5; a charged punch before) landed on enemy `i` at `at`: Thunderclap's lightning, Powder
 *  Keg's blast. */
export function heavyPowers(state: CombatState, i: number, at: Vector3) {
  const v = CARDS.v;
  if (holds(state, 'thunderclap')) for (const j of nearest(state, at.x, at.z, v.thunderRange, Math.round(v.zapTargets * boost(state, 'thunderclap')), i)) zap(state, at, j);
  if (holds(state, 'powderKeg')) queueBlast(state, at, v.kegRadius, v.kegDamage * boost(state, 'powderKeg'));
}

/** A thrown weapon broke at `at` (on what it hit, or a wall): Powder Keg's blast. */
export function breakPowers(state: CombatState, at: Vector3) {
  if (holds(state, 'powderKeg')) queueBlast(state, at, CARDS.v.kegRadius, CARDS.v.kegDamage * boost(state, 'powderKeg'));
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
