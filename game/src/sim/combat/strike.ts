// M2 — what a sweep hits: the nearest live target (dummy, turret or enemy) along a segment, and applying a hit to it.
// Punches, sword swings and thrown weapons all use these, so every target takes every attack the same way.
// Update 0.0.12 — every enemy kind is a target; only grunts drop a weapon (15%: the designer); every kill drops coins.
// Update 0.0.16 — a Yeti (the brute) drops its room's key: one per room, whichever Yeti dies first (the designer).
// Update 0.0.17 — a kill's coins (halves count as one more half the time; more with gold ingots on), and maybe a kill
// bonus (not from a boss).
// Update 0.1.19 — the Ninja may teleport away from a hit about to land (ninja.ts): it misses.
// Update 0.2.23 — floor 2's wasps' hives are targets too (sim/dungeon/hives.ts): a ball on its wall.
import { hitWormling, WORMLING_RADIUS, wormlingUp } from '../enemies/wormlings';
import { spineAt, spineFrom, spineRadius } from '../enemies/kingBody';
import { kneeAt, kneeRadius, kneesOpen } from '../enemies/rocBody';
import { anchorY, CHAIN_R } from '../enemies/sharkAbyss';
import { BIG_SHARK } from '../../tuning/bigShark';
import { SWARM } from '../../tuning/swarm';
import { Vector3 } from 'three';
import { ENEMIES } from '../../tuning/enemies';
import { FEEDBACK } from '../../tuning/combat';
import { enemyAxis, hitEnemy, isLive, radiusOf, wouldDie } from '../enemies/enemy';
import { dropWeapon } from '../weapons/weapons';
import { dodges } from '../enemies/evade';
import { ENEMY_STATS, MINI_BOSSES } from '../enemies/kinds';
import { burstCoins } from './coins';
import { betterKeyFor, keyFor } from '../items/items';
import { dropItem } from '../items/drops';
import { coinsFor, rollBonus } from '../items/bonuses';
import { newUses } from '../cards/cards';
import { mercy, meterStep, onKill } from '../cards/cardMoves';
import { bigHit } from '../cards/cardPowers';
import { holds } from '../cards/cards';
import { CARDS } from '../../tuning/cards';
import { hitDummy } from './dummy';
import { segmentDistance } from './geometry';
import type { CombatEvent, CombatState } from './state';
import { TARGET_SHAPES, dummyAxis, turretAxis } from './targets';
import { hitTurret } from './turretDamage';
import { HIVE_RADIUS, hitHive } from '../dungeon/hives';
import { DEMON } from '../../tuning/demon';
import { addHeat } from './heat';
import { gravHit, gravKill, storeHit } from './gravityMeter';

export type TargetKind = 'dummy' | 'turret' | 'enemy' | 'hive' | 'wormling' | 'spine' | 'knee' | 'head' | 'chain';

export interface TargetHit {
  kind: TargetKind;
  index: number;
  /** How far along the segment (0..1), and the point on the target's axis closest to it. */
  s: number;
  point: Vector3;
  /** Update 0.3.56 — which part of it (the Frost Roc's knee). */
  part: number;
}

const a = new Vector3();
const b = new Vector3();
const at = new Vector3();
const sOut = { s: 0 };
/** Update 0.3.58 — a Drowned King's head is this big to hit (m). */
const HEAD_R = 0.5;

export function emptyTargetHit(): TargetHit {
  return { kind: 'dummy', index: -1, s: 0, point: new Vector3(), part: 0 };
}

/** The nearest target whose capsule comes within `radius` of the segment `from`→`to`. Writes it to `out`. */
export function nearestTarget(state: CombatState, from: Vector3, to: Vector3, radius: number, out: TargetHit, heads = true): boolean {
  out.index = -1;
  let nearest = Infinity;
  const consider = (kind: TargetKind, index: number, r: number) => {
    if (segmentDistance(from, to, a, b, at, sOut) > radius + r || sOut.s >= nearest) return;
    nearest = sOut.s;
    out.kind = kind;
    out.index = index;
    out.s = sOut.s;
    out.point.copy(at);
  };
  state.dummies.forEach((d, i) => {
    if (d.broken) return;
    dummyAxis(d, a, b);
    consider('dummy', i, TARGET_SHAPES.dummy.radius);
  });
  state.turrets.forEach((t, i) => {
    if (t.broken) return;
    turretAxis(t, a, b);
    consider('turret', i, TARGET_SHAPES.turret.radius);
  });
  state.enemies.forEach((e, i) => {
    if (!isLive(e)) return;
    enemyAxis(e, a, b);
    consider('enemy', i, radiusOf(e));
  });
  state.hives.forEach((h, i) => {
    if (h.broken) return;
    a.copy(h.pos);
    b.copy(h.pos);
    consider('hive', i, HIVE_RADIUS);
  });
  // (Update 0.3.51 — The Swarm's big worms.)
  state.wormlings.forEach((q, i) => {
    if (!wormlingUp(q)) return;
    a.set(q.x, 0, q.z);
    b.set(q.x, q.top, q.z);
    consider('wormling', i, WORMLING_RADIUS);
  });
  // (Update 0.3.62 — the Big Shark's anchor's chain, as it waits under it: ahead of the rest.)
  state.enemies.forEach((e, i) => {
    if (!isLive(e) || !e.shark?.chainOpen || e.shark.marked < 0) return;
    const c = e.shark.anchors[e.shark.marked];
    a.set(c.x, anchorY(), c.z);
    b.set(c.x, BIG_SHARK.v.floodTop + 0.6, c.z);
    if (segmentDistance(from, to, a, b, at, sOut) > radius + CHAIN_R) return;
    nearest = -1;
    out.kind = 'chain';
    out.index = i;
    out.s = sOut.s;
    out.point.copy(at);
  });
  // (Update 0.3.58 — the Drowned King's heads flying at you: shot or punched, they pop; parrying's the bonus.)
  if (heads) {
    state.orbs.forEach((o, i) => {
      if (!o.alive || o.parried || o.look !== 'head') return;
      a.copy(o.pos);
      b.copy(o.pos);
      consider('head', i, HEAD_R);
    });
  }
  // (Update 0.3.53 — the Bone King's vertebra, through its Colossus: for a blow from up on its body, ahead of its body itself.)
  state.enemies.forEach((e, i) => {
    if (!isLive(e) || !e.king || !e.ult.on || from.y < spineFrom(e)) return;
    spineAt(e, a);
    b.copy(a);
    if (segmentDistance(from, to, a, b, at, sOut) > radius + spineRadius(e)) return;
    nearest = -1;
    out.kind = 'spine';
    out.index = i;
    out.s = sOut.s;
    out.point.copy(at);
  });
  // (Update 0.3.56 — the Frost Roc's knees, through its Mountain Fall: ahead of its body, while they stand.)
  state.enemies.forEach((e, i) => {
    if (!isLive(e) || !kneesOpen(e) || !e.roc) return;
    let knee = Infinity;
    for (let k = 0; k < 2; k++) {
      if (e.roc.knees[k] <= 0) continue;
      kneeAt(e, k, a);
      b.copy(a);
      if (segmentDistance(from, to, a, b, at, sOut) > radius + kneeRadius() || sOut.s >= knee) continue;
      knee = sOut.s;
      out.kind = 'knee';
      out.index = i;
      out.part = k;
      out.s = sOut.s;
      out.point.copy(at);
    }
  });
  return out.index >= 0;
}

/** Applies a hit pushed along (dirX, dirZ) (length 1). Returns true if it killed or broke the target. */
export function hitTarget(state: CombatState, t: TargetHit, damage: number, knock: number, dirX: number, dirZ: number, steady = false): boolean {
  switch (t.kind) {
    case 'dummy':
      return hitDummy(state.dummies[t.index], damage, knock, dirX, dirZ);
    case 'turret':
      return hitTurret(state.turrets[t.index], damage);
    case 'enemy':
      // (Update 0.3.42 — where it landed: The Swarm's worms or its eye.)
      return hitEnemy(state.enemies[t.index], damage, knock, dirX, dirZ, steady, t.point);
    case 'hive':
      return hitHive(state, t.index, damage);
    case 'wormling': {
      if (!hitWormling(state.wormlings, t.index, damage)) return false;
      // (Killed, it takes a piece of The Swarm's bar.)
      const eye = state.enemies.find((e) => isLive(e) && e.kind === 'swarm');
      if (eye && !eye.swarm?.shield) eye.hp = Math.max(1, eye.hp - SWARM.v.bigWormBar);
      return true;
    }
    case 'chain': {
      const s = state.enemies[t.index].shark;
      if (s) s.chainHit = true;
      return false;
    }
    case 'head': {
      const o = state.orbs[t.index];
      o.alive = false;
      state.events.push('orbPop', 0, o.pos.x, o.pos.y, o.pos.z);
      return false;
    }
    case 'knee': {
      const r = state.enemies[t.index];
      r.flash = 0.12;
      if (r.roc && r.roc.knees[t.part] > 0) {
        r.roc.knees[t.part]--;
        r.roc.kneeHit++;
        r.ult.fill += 1;
      }
      return false;
    }
    case 'spine': {
      const k = state.enemies[t.index];
      k.flash = 0.12;
      k.ult.fill += 1;
      if (k.king) k.king.spineHit++;
      return false;
    }
  }
}

/** Lands a hit: applies it, reports it (`event`, with `value`, at the hit point), and on a kill reports that too, asks
 *  for the kill hit-stop, and lets a grunt drop a sword (seeded RNG). Returns true on a kill.
 *  Update 0.0.13 — every hit you land is stronger with each red ring you carry. Update 0.2.18 — `steady`: a bleed's or a
 *  burn's tick (no dodging it, no stagger, no Fire and Ice). */
export function landHit(state: CombatState, t: TargetHit, damage: number, knock: number, dirX: number, dirZ: number, event: CombatEvent, value: number, steady = false): boolean {
  // (Update 0.3.85 — Gravity Sean's Time Stop: it's held back, and they look unfazed. As it lands there's no dodging it.)
  const stop = state.grav.stop;
  if (stop && !stop.releasing) {
    const held = storeHit(state, t.kind, t.index, t.part, t.point, damage, knock, dirX, dirZ);
    // (Update 0.3.90 — once it's enough to kill it, the view shows it red. What it'll be when it lands, as below.)
    if (held && t.kind === 'enemy' && !held.doomed) {
      const e = state.enemies[t.index];
      const sum = holds(state, 'bloodPact') ? held.damage * (1 + CARDS.v.bloodPact) : held.damage;
      if (wouldDie(e, mercy(state, e, sum))) {
        held.doomed = true;
        state.events.push('seanDoomed', 0, held.point.x, held.point.y, held.point.z);
      }
    }
    return false;
  }
  if (t.kind === 'enemy' && !steady && !stop && dodges(state, t.index, dirX, dirZ)) return false;
  // (Update 0.2.16 — Mercy Kill, a Fate Card: a hit leaving it under the line finishes it.)
  // (Update 0.2.19 — Blood Pact, a Traitor Card: harder.)
  if (t.kind === 'enemy' && holds(state, 'bloodPact')) damage *= 1 + CARDS.v.bloodPact;
  if (t.kind === 'enemy') damage = mercy(state, state.enemies[t.index], damage);
  const killed = hitTarget(state, t, damage, knock, dirX, dirZ, steady);
  // (Update 0.2.18 — Fire and Ice, a Fate Card: a big hit throws a ring.)
  if (t.kind === 'enemy' && !steady) bigHit(state, t.point, damage);
  const p = t.point;
  state.events.push(event, value, p.x, p.y, p.z);
  // (Update 0.3.73 — the Playable Demon's heat. A burn's ticks don't feed it: it'd never go out.)
  if (state.demon && !steady) addHeat(state, DEMON.v.heatHit);
  // (Update 0.3.81 — Gravity Sean's meters.)
  if (state.sean && !steady && !stop) gravHit(state);
  if (!killed) return false;
  state.events.push('kill', 0, p.x, p.y, p.z);
  state.hitStop.request(FEEDBACK.v.stopKill);
  if (t.kind !== 'enemy') return true;
  state.kills++;
  if (state.sean) {
    const k = state.enemies[t.index].kind;
    gravKill(state, MINI_BOSSES.includes(k) || ENEMY_STATS[k]().boss);
  }
  // (Update 0.3.73 — its heat again, and Forged from the Fallen: every kill gives a little health back.)
  if (state.demon) {
    addHeat(state, DEMON.v.heatKill);
    state.blade.fallen++;
  }
  // Update 0.1.0 — every kill of yours fills the Execution Power meter. Update 0.1.13 — counted in whole kills: ten
  // tenths added up came to 0.9999999999999999, which looked full but couldn't execute (only the Lab's Meter, which sets
  // it to 1, could): the designer found executions "just in the Lab".
  // (Update 0.2.16 — Fate Cards: Air Butcher, Reaper's Rhythm; and what a kill sets off.)
  const { steps, worth } = meterStep(state);
  state.execution = Math.min(1, Math.round(state.execution * steps + worth) / steps);
  const e = state.enemies[t.index];
  onKill(state, e);
  // (Update 0.2.12 — ARE YOU EVEN HUMAN?: nothing comes of a kill but the meter.)
  if (state.bare) return true;
  // (Update 0.2.15 — Collector, a Fate Card: more uses.)
  if (e.kind === 'grunt' && state.rng() < ENEMIES.v.gruntDrop && !state.demon && !state.sean) dropWeapon(state.pickups, 'sword', e.pos, state.events, newUses(state, 'sword'));
  if (MINI_BOSSES.includes(e.kind) && state.keyDrops > 0) {
    state.keyDrops--;
    // Update 0.1.20 — a challenge room's is white or gold.
    // (On what it stood on: a perch's top, or the floor.)
    dropItem(state.drops, (state.betterKeys ? betterKeyFor : keyFor)(state.rng()), e.pos, state.events, false, Math.max(0, e.perch));
  }
  // Update 0.0.12 — its coins burst out (any the pool can't hold go straight to your money).
  const s = ENEMY_STATS[e.kind]();
  state.money += burstCoins(state.coins, e.pos, coinsFor(s.coins, state, state.rng), state.rng);
  const bonus = s.boss ? null : rollBonus(state, state.rng);
  if (bonus) dropItem(state.drops, bonus, e.pos, state.events, false, Math.max(0, e.perch));
  return true;
}
