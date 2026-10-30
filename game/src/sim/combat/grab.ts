// Update 0.2.3 — the Bone King's grab (the designer: "close range grab, grab the player with their hand and player has to
// hit the boss 10 times in a row other wise they get thrown at the wall"). Caught, you're held up in its hand in front
// of its skull and the world holds still (as in an execution); each attack you press is a hit on it (your fists punch,
// left and right; a weapon's hand strikes), counted against Grab hits before Grab time runs out. Land them all and you
// break free: you drop and it reels (stunned). Run out of time and it throws you at the nearest wall, hard. The screen
// shows the count (engine: the QTE). Pure.
import { Vector3 } from 'three';
import { BONE_KING } from '../../tuning/boneKing';
import { wallBetween } from '../../world/navGrid';
import { hitEnemy, setPhase } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { CombatIntent } from './fists';
import type { CombatState } from './state';

export interface Grab {
  /** You're in its hand. */
  on: boolean;
  /** Its slot; seconds held; hits landed. */
  slot: number;
  t: number;
  hits: number;
  /** How the last one ended ('': none yet), and seconds since (the screen's flash). */
  end: '' | 'free' | 'thrown';
  since: number;
}

export function createGrab(): Grab {
  return { on: false, slot: -1, t: 0, hits: 0, end: '', since: Infinity };
}

/** Where you're held: in front of it, this share of its height up (your feet), this far out from its body (m): its
 *  face in front of you, its arm reaching to you. */
const HELD_UP = 0.4;
const HELD_OUT = 2.8;
/** Thrown: how far it looks for a wall (m), in how many ways; and how hard you go up (m/s). */
const WALL_REACH = 24;
const WALL_WAYS = 16;
const THROW_UP = 5;
/** Broken free, you drop away from it (m/s). */
const DROP_BACK = 3;

const at = new Vector3();

/** What a grab works with (the fight's state, or the enemies' world: they're the same). */
type Holder = Pick<CombatState, 'enemies' | 'grab' | 'events'>;

/** Your feet in its hand (world). */
export function heldAt(state: Holder, slot: number, out: Vector3): Vector3 {
  const k = state.enemies[slot];
  const s = ENEMY_STATS[k.kind]();
  const out2 = s.radius + HELD_OUT;
  return out.set(k.pos.x - Math.sin(k.facing) * out2, k.pos.y + s.height * HELD_UP, k.pos.z - Math.cos(k.facing) * out2);
}

/** Its skull (world): where you look while it holds you, and where your hits land. */
export function skullOf(state: Holder, slot: number, out: Vector3): Vector3 {
  const k = state.enemies[slot];
  const s = ENEMY_STATS[k.kind]();
  return out.set(k.pos.x - Math.sin(k.facing) * s.radius * 0.6, k.pos.y + s.height * 0.76, k.pos.z - Math.cos(k.facing) * s.radius * 0.6);
}

/** It has you. */
export function startGrab(state: Holder, slot: number, player: PlayerState) {
  const g = state.grab;
  g.on = true;
  g.slot = slot;
  g.t = 0;
  g.hits = 0;
  heldAt(state, slot, at);
  player.pos.copy(at);
  player.vel.set(0, 0, 0);
  player.grounded = false;
  state.events.push('kingGrab', slot, at.x, at.y, at.z);
}

/** One tick held (the world holds still): you're kept in its hand; each attack pressed is a hit; free, or thrown. */
export function stepGrab(state: CombatState, player: PlayerState, intent: CombatIntent, dt: number) {
  const g = state.grab;
  const v = BONE_KING.v;
  const k = state.enemies[g.slot];
  // It's gone to pieces (or died) under your hits: you drop.
  if (!k.alive || k.phase !== 'grab' || player.dead) {
    release(state, player, 'free');
    return;
  }
  g.t += dt;
  heldAt(state, g.slot, at);
  player.pos.copy(at);
  player.vel.set(0, 0, 0);
  player.grounded = false;
  if (intent.attackPressed) {
    g.hits++;
    const ev = state.events;
    // Your fists, left and right in turn (a weapon's hand: the right).
    ev.push(state.weapon || g.hits % 2 === 0 ? 'jabR' : 'jabL', 0);
    skullOf(state, g.slot, at);
    ev.push('hitJab', g.slot, at.x, at.y, at.z);
    ev.push('kingQteHit', g.hits, at.x, at.y, at.z);
    hitEnemy(k, v.grabHitDamage, 0, 0, 0);
    if (k.phase !== 'grab') {
      // (Its first life ended under your hits: it falls to pieces, and you with it.)
      release(state, player, 'free');
      return;
    }
    if (g.hits >= Math.round(v.grabHits)) {
      release(state, player, 'free');
      setPhase(k, 'stun');
      ev.push('kingFree', g.slot, k.pos.x, k.pos.y + ENEMY_STATS[k.kind]().height * 0.6, k.pos.z);
      return;
    }
  }
  if (g.t >= v.grabTime) throwYou(state, player);
}

/** Out of time: thrown at the nearest wall (or straight ahead of it, with none in reach), hurt. */
function throwYou(state: CombatState, player: PlayerState) {
  const v = BONE_KING.v;
  const g = state.grab;
  const k = state.enemies[g.slot];
  let yaw = k.facing;
  let best = Infinity;
  const nav = state.nav.small;
  for (let w = 0; w < WALL_WAYS; w++) {
    const y = k.facing + (w / WALL_WAYS) * Math.PI * 2;
    const fx = -Math.sin(y);
    const fz = -Math.cos(y);
    if (!wallBetween(nav, player.pos.x, player.pos.z, player.pos.x + fx * WALL_REACH, player.pos.z + fz * WALL_REACH)) continue;
    let lo = 0;
    let hi = WALL_REACH;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      if (wallBetween(nav, player.pos.x, player.pos.z, player.pos.x + fx * mid, player.pos.z + fz * mid)) hi = mid;
      else lo = mid;
    }
    if (lo < best) {
      best = lo;
      yaw = y;
    }
  }
  release(state, player, 'thrown');
  player.vel.set(-Math.sin(yaw) * v.grabThrowSpeed, THROW_UP, -Math.cos(yaw) * v.grabThrowSpeed);
  damagePlayer(player, v.grabThrowDamage, k.kind);
  setPhase(k, 'recover');
  state.events.push('kingThrowYou', g.slot, player.pos.x, player.pos.y + 1, player.pos.z);
}

function release(state: CombatState, player: PlayerState, end: 'free' | 'thrown') {
  const g = state.grab;
  const k = state.enemies[g.slot];
  g.on = false;
  g.end = end;
  g.since = 0;
  if (end === 'free' && k) player.vel.set(-Math.sin(k.facing) * DROP_BACK, 0, -Math.cos(k.facing) * DROP_BACK);
}

/** Seconds since the last grab ended (the screen's flash), counted while you're free. */
export function tickGrab(g: Grab, dt: number) {
  if (!g.on) g.since += dt;
}
