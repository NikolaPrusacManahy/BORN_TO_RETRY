// Update 0.3.33 — what floor 8's martial artists share (the designer: "make sure enemies are indeed martial art experts,
// dashing, side steps, etc etc... something challeging"; MD/FLOOR8_SHRINE_PLAN.md): a fighting stance, held at its own
// distance from you, side-stepping round you (now one way, now the other), backing off if you crowd it, running in if
// you're far; a dash in (sprinting) that ends in a blow; its strikes, each a clip whose blows land where the clip's
// fists, feet or blade do (shrineShared.ts), turning to you only till the first lands (a sideways dash slips the rest),
// lunging in (or back) through it; open after each (hit it then); its side-step of a blow coming (the more you've swung
// at it lately, the likelier), its block from in front (and the counter at once). It attacks only with its turn
// (tokens.ts), but keeps its stance meanwhile. Each fighter brings its style and its own tricks. Pure.
import { meleeHit } from '../combat/meleeParry';
import type { CombatEvent, CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { FOES_SHRINE } from '../../tuning/foesShrine';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, isLive, setPhase, turn, walk, yawTo } from './enemy';
import { slideAside } from './evade';
import { ENEMY_STATS } from './kinds';
import { BACK, BLOCK, CLIPS, DASH, DODGE_L, DODGE_R, STRAFE_L, STRAFE_R } from './shrineShared';
import { Vector3 } from 'three';

/** A strike: its move (its clip: shrineShared.ts), the distances it's started from, what each of its blows does, its
 *  lunge (m/s forward, negative back, up to a share of it), how long it's open after (s), its picks' weight. */
export interface Strike {
  move: number;
  from: number;
  to: number;
  reach: number;
  arc: number;
  damage: () => number;
  shove: number;
  lift?: number;
  lunge?: number;
  lungeTo?: number;
  recover: number;
  weight?: number;
  event: CombatEvent;
  /** Instead of a blow where it lands: what it throws or fires (a ninja's shuriken, a smoke bomb, the Sensei's ki). */
  fire?: (e: Enemy, index: number, player: PlayerState, w: EnemyWorld) => void;
  /** Facing away from you through it (a roll away); not turning at all (along its line: the dash cuts); its blow catching
   *  you as it passes, once, any time in its lunge (not where its clip lands). */
  away?: boolean;
  straight?: boolean;
  sweep?: boolean;
  /** Ready now (its own timer: the Sand Ninjas' smoke and caltrops); none: always. */
  ready?: (e: Enemy) => boolean;
}

/** A fighter's style: its strikes; the distances its stance keeps (m); its clips' pace; its dash in (sprinting from these
 *  distances, ending in that strike); between its attacks (s); its side-step and its block (the shares of blows) and its
 *  counter (a strike's move). */
export interface Style {
  strikes: readonly Strike[];
  stance: readonly [number, number];
  pace: number;
  dash?: { from: number; to: number; then: number };
  every: readonly [number, number];
  dodge?: () => number;
  block?: () => number;
  counter?: number;
  /** A strike's end: the next to run at once (its move; null: open, as usual), from a roll of 0..1. */
  after?: (move: number, roll: number) => number | null;
}

/** A side-step lasts this long (s), this far (m); a block, this long before the counter; a dash, at most this long. */
export const DODGE_TIME = 0.45;
const DODGE_FAR = 1.9;
export const BLOCK_TIME = 0.3;
const DASH_FOR = 1.2;
/** The blows you've swung at it lately: each one counts, wearing off at this a second. */
const PRESSURE_OFF = 0.5;
/** Its blows catch you this far past their reach (your body). */
const BODY = 0.45;

const way = new Vector3();
/** Its walk grid (the big ones', the masters, their own). */
const gridOf = (e: Enemy) => (ENEMY_STATS[e.kind]().size === 'large' ? 'large' : 'small');

/** A strike's whole time (s) at a pace. */
export const strikeTime = (move: number, pace: number) => (CLIPS[move]?.len ?? 0.5) / pace;

const strikeOf = (st: Style, move: number) => st.strikes.find((s) => s.move === move) ?? null;

/** Its strike starts (its clip plays from the top). */
export function startStrike(e: Enemy, index: number, w: EnemyWorld, s: Strike) {
  e.move = s.move;
  e.shots = 0;
  e.struck = false;
  setPhase(e, 'windup');
  w.events.push(s.event, index, e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height * 0.6, e.pos.z);
}

/** One tick of a martial artist's fight (after enemy.ts's beginTick): its strikes, dash, side-steps, block, stance.
 *  `armed`: it may start an attack. */
export function martial(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, st: Style, armed: boolean) {
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  e.near = Math.max(0, e.near - PRESSURE_OFF * dt);
  e.blink = Math.max(0, e.blink - dt);
  switch (e.phase) {
    case 'flinch':
      e.move = 0;
      if (e.t >= s.flinch) setPhase(e, 'chase');
      return;
    case 'dive':
      if (e.t >= DODGE_TIME) {
        e.move = 0;
        setPhase(e, 'chase');
      }
      return;
    case 'charge': {
      // Its dash: straight at you, sprinting; in reach, its blow.
      const then = st.dash ? strikeOf(st, st.dash.then) : null;
      e.facing = turn(e.facing, toward, 10 * dt);
      if (!then || e.t >= DASH_FOR || player.dead) {
        e.move = 0;
        setPhase(e, 'recover');
        return;
      }
      if (dist <= then.reach * 0.9) return startStrike(e, index, w, then);
      walk(e, (player.pos.x - e.pos.x) / dist, (player.pos.z - e.pos.z) / dist, Math.min(FOES_SHRINE.v.dashSpeed * dt, dist - then.reach * 0.8), w.nav[gridOf(e)]);
      return;
    }
    case 'windup': {
      if (e.move === BLOCK) {
        e.facing = turn(e.facing, toward, 12 * dt);
        const c = st.counter !== undefined ? strikeOf(st, st.counter) : null;
        if (e.t >= BLOCK_TIME) {
          if (c) startStrike(e, index, w, c);
          else setPhase(e, 'chase');
        }
        return;
      }
      const k = strikeOf(st, e.move);
      if (!k) return setPhase(e, 'recover');
      runStrike(e, index, player, w, dt, st, k, dist, toward);
      return;
    }
    case 'recover': {
      const k = strikeOf(st, e.move);
      if (e.t >= (k?.recover ?? 0.4)) {
        e.move = 0;
        setPhase(e, 'chase');
      }
      return;
    }
    case 'chase':
      break;
    default:
      return;
  }
  if (player.dead) {
    e.facing = turn(e.facing, toward, 6 * dt);
    e.move = 0;
    return;
  }
  // Its turn to attack: a dash in from further off (a trick of its own ready first), a strike from where it is.
  if (armed && e.cooldown <= 0 && inLine(e, player, w.nav[gridOf(e)], s.height * 0.75)) {
    const trick = st.strikes.some((k) => k.ready?.(e) && dist >= k.from && dist <= k.to);
    if (st.dash && !trick && dist >= st.dash.from && dist <= st.dash.to && w.rng() < 0.7) {
      e.move = DASH;
      setPhase(e, 'charge');
      w.events.push('martialDash', index, e.pos.x, e.pos.y + 1, e.pos.z);
      return;
    }
    const pick = pickStrike(e, st, dist, w.rng());
    if (pick) return startStrike(e, index, w, pick);
  }
  stance(e, player, w, dt, st, dist, toward);
}

/** One of its strikes that starts from here, by weight (null: none). */
function pickStrike(e: Enemy, st: Style, dist: number, r: number): Strike | null {
  const can = st.strikes.filter((k) => dist >= k.from && dist <= k.to && (k.ready?.(e) ?? true));
  if (can.length === 0) return null;
  const total = can.reduce((a, k) => a + (k.weight ?? 1), 0);
  let x = r * total;
  for (const k of can) {
    x -= k.weight ?? 1;
    if (x <= 0) return k;
  }
  return can[can.length - 1];
}

/** Its strike: lunging, turning to you till its first blow lands; each blow where its clip lands it; then open. */
function runStrike(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, st: Style, k: Strike, dist: number, toward: number) {
  const dur = strikeTime(k.move, st.pace);
  const lands = CLIPS[k.move]?.lands ?? [];
  if (k.away) e.facing = turn(e.facing, toward + Math.PI, 12 * dt);
  else if (!k.straight) e.facing = turn(e.facing, toward, (e.shots === 0 ? 5 : 1.2) * dt);
  const lunging = !!k.lunge && e.t < (k.lungeTo ?? 1) * dur;
  if (lunging && (k.lunge! < 0 || k.away || k.sweep || dist > 0.9)) {
    const sign = Math.sign(k.lunge!);
    walk(e, -Math.sin(e.facing) * sign, -Math.cos(e.facing) * sign, Math.abs(k.lunge!) * dt, w.nav[gridOf(e)]);
  }
  // (A sweep: as it passes you, once.)
  if (k.sweep) {
    if (lunging && !e.struck && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= k.reach + BODY) {
      e.struck = true;
      blow(e, index, player, w, k, 0, e.facing);
    }
  } else while (e.shots < lands.length && e.t >= lands[e.shots] * dur) {
    blow(e, index, player, w, k, Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z), yawTo(e, player.pos.x, player.pos.z));
    e.shots++;
  }
  if (e.t >= dur) {
    const next = st.after?.(k.move, w.rng());
    const n = next !== null && next !== undefined ? strikeOf(st, next) : null;
    if (n) return startStrike(e, index, w, n);
    const [a, b] = st.every;
    e.cooldown = a + (b - a) * w.rng();
    setPhase(e, 'recover');
  }
}

/** A blow: it lands if you're in its reach and its arc and nothing's between; you're shoved off it (and up). */
function blow(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, k: Strike, dist: number, toward: number) {
  if (k.fire) return k.fire(e, index, player, w);
  const s = ENEMY_STATS[e.kind]();
  w.events.push('martialBlow', index, e.pos.x - Math.sin(e.facing) * 0.8, e.pos.y + s.height * 0.55, e.pos.z - Math.cos(e.facing) * 0.8);
  const off = Math.abs(Math.atan2(Math.sin(toward - e.facing), Math.cos(toward - e.facing)));
  if (player.dead || dist > k.reach + BODY || off > (k.arc * Math.PI) / 180 || !inLine(e, player, w.nav[gridOf(e)], s.height * 0.75)) return;
  if (!meleeHit(player, w, e, index, k.damage())) return;
  const len = Math.max(dist, 1e-3);
  player.vel.x += ((player.pos.x - e.pos.x) / len) * k.shove;
  player.vel.z += ((player.pos.z - e.pos.z) / len) * k.shove;
  player.vel.y = Math.max(player.vel.y, k.lift ?? 3);
  player.grounded = false;
  w.events.push('martialHit', index, player.pos.x, player.pos.y + 1.2, player.pos.z);
}

/** Its stance: facing you, in at you from afar, off if you crowd it, else side-stepping round you (now one way, now the
 *  other; off a wall the other way). */
function stance(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number, st: Style, dist: number, toward: number) {
  const s = ENEMY_STATS[e.kind]();
  const [near, far] = st.stance;
  e.facing = turn(e.facing, toward, 9 * dt);
  if (dist > far + 0.6 || !inLine(e, player, w.nav[gridOf(e)], s.height * 0.75)) {
    e.move = 0;
    const how = chaseDir(w.flow[gridOf(e)], w.nav[gridOf(e)], e.pos, player.pos.x, player.pos.z, way);
    if (how === 'none') return;
    if (how !== 'straight') e.facing = turn(e.facing, Math.atan2(-way.x, -way.z), 9 * dt);
    walk(e, way.x, way.z, s.speed * dt, w.nav[gridOf(e)]);
    return;
  }
  const ux = (player.pos.x - e.pos.x) / Math.max(dist, 1e-3);
  const uz = (player.pos.z - e.pos.z) / Math.max(dist, 1e-3);
  if (dist < near) {
    e.move = BACK;
    walk(e, -ux, -uz, s.speed * 0.55 * dt, w.nav[gridOf(e)]);
    return;
  }
  e.strafeTime -= dt;
  if (e.strafeTime <= 0 || e.strafe === 0) {
    e.strafe = w.rng() < 0.5 ? -1 : 1;
    e.strafeTime = 0.7 + 1.6 * w.rng();
  }
  // Round you, and toward the middle of its band.
  const mid = (near + far) / 2;
  const pull = Math.max(-0.6, Math.min(0.6, (dist - mid) * 0.8));
  const mx = -uz * e.strafe + ux * pull;
  const mz = ux * e.strafe + uz * pull;
  const ml = Math.hypot(mx, mz);
  const step = FOES_SHRINE.v.strafeSpeed * dt;
  const x0 = e.pos.x;
  const z0 = e.pos.z;
  walk(e, mx / ml, mz / ml, step, w.nav[gridOf(e)]);
  if (Math.hypot(e.pos.x - x0, e.pos.z - z0) < step * 0.4) e.strafe = -e.strafe;
  // (Its right: across where it faces.)
  const rightward = (e.pos.x - x0) * Math.cos(e.facing) - (e.pos.z - z0) * Math.sin(e.facing);
  e.move = rightward >= 0 ? STRAFE_R : STRAFE_L;
}

/** A blow about to land on it (evade.ts): its block from in front (and the counter next), or a side-step; each blow
 *  thrown at it counts (it's likelier to slip the next). True: the blow misses. */
export function martialDodges(state: CombatState, i: number, dirX: number, dirZ: number, st: Style): boolean {
  const e = state.enemies[i];
  if (!isLive(e) || e.phase === 'held' || e.frozen > 0) return false;
  e.near = Math.min(6, e.near + 1);
  if (e.phase !== 'chase') return false;
  const front = Math.sin(e.facing) * dirX + Math.cos(e.facing) * dirZ;
  if (st.block && front > 0.5 && state.rng() < st.block()) {
    e.move = BLOCK;
    setPhase(e, 'windup');
    state.events.push('martialBlock', i, e.pos.x - Math.sin(e.facing) * 0.6, e.pos.y + 1.3, e.pos.z - Math.cos(e.facing) * 0.6);
    return true;
  }
  if (!st.dodge || e.blink > 0 || state.rng() >= Math.min(0.85, st.dodge() + FOES_SHRINE.v.dodgeMore * (e.near - 1))) return false;
  const sign = state.rng() < 0.5 ? -1 : 1;
  slideAside(e, e.pos.x - dirX, e.pos.z - dirZ, DODGE_FAR, sign);
  const rightward = e.vel.x * Math.cos(e.facing) - e.vel.z * Math.sin(e.facing);
  e.move = rightward >= 0 ? DODGE_R : DODGE_L;
  e.blink = FOES_SHRINE.v.dodgeRest;
  setPhase(e, 'dive');
  state.events.push('martialDodge', i, e.pos.x, e.pos.y + 1, e.pos.z);
  return true;
}
