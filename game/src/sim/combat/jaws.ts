// Update 0.3.16 — caught in the Big Shark's jaws (the designer: "the shark try to eat the player in one shot, so the hands
// will hold the jaws and prevent it to close on the player -> left hand up -> right hand hold the bottom Jaw, as you have
// to press left click fast to then hit the sharks throat to escape"). Its swallow caught you: you're held at its mouth,
// your hands keeping its jaws apart (the view: engine/exec/jawHands.ts), and the world holds still (the Bone King's
// hold, grab.ts: the screen counts your clicks). Click Jaw hits times before Jaw time runs out and you punch its throat:
// it's hurt (Throat punch), stunned, and spits you out. Too slow: its jaws close (Swallowed: one shot). Pure.
import { Vector3 } from 'three';
import { BIG_SHARK } from '../../tuning/bigShark';
import { EnemyWorld, setPhase } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import { fishLength } from '../enemies/kinds6';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { CombatIntent } from './fists';
import type { CombatState } from './state';
import { emptyTargetHit, landHit } from './strike';

/** Held: your feet this far in front of its nose (m) and this far under its mouth (m). Your punch to its throat lasts
 *  this long (s) before it spits you out, this fast (m/s). Its throat is this far back in its mouth (m). */
const HELD_OUT = 0.6;
const HELD_DOWN = 2;
const PUNCH = 0.35;
const SPIT = 9;
const THROAT = 1.1;

type Holder = Pick<CombatState, 'enemies' | 'grab'>;

const at = new Vector3();
const hit = emptyTargetHit();

/** Its mouth (world): the tip of its nose, at its middle's height. */
export function mouthOf(state: Pick<CombatState, 'enemies'>, slot: number, out: Vector3): Vector3 {
  const k = state.enemies[slot];
  const s = ENEMY_STATS[k.kind]();
  const half = fishLength(k.kind, s.height) / 2;
  return out.set(k.pos.x - Math.sin(k.facing) * half, k.pos.y + s.height / 2, k.pos.z - Math.cos(k.facing) * half);
}

/** Your feet at its mouth, facing into it. */
export function jawsHeldAt(state: Holder, slot: number, out: Vector3): Vector3 {
  const k = state.enemies[slot];
  mouthOf(state, slot, out);
  return out.set(out.x - Math.sin(k.facing) * HELD_OUT, out.y - HELD_DOWN, out.z - Math.cos(k.facing) * HELD_OUT);
}

/** Where you look: down its throat. */
export function jawsEye(state: Holder, slot: number, out: Vector3): Vector3 {
  const k = state.enemies[slot];
  mouthOf(state, slot, out);
  return out.set(out.x + Math.sin(k.facing) * THROAT, out.y - 0.4, out.z + Math.cos(k.facing) * THROAT);
}

/** Its swallow caught you (slot `slot`). */
export function startJaws(w: EnemyWorld, slot: number, player: PlayerState) {
  const g = w.grab;
  g.on = true;
  g.slot = slot;
  g.t = 0;
  g.hits = 0;
  g.fly = -1;
  g.slam = false;
  setPhase(w.enemies[slot], 'grab');
  jawsHeldAt(w, slot, at);
  player.pos.copy(at);
  player.vel.set(0, 0, 0);
  player.grounded = false;
  w.events.push('bigSharkCatch', slot, at.x, at.y + 1.5, at.z);
}

/** One tick in its jaws (the world holds still): each attack you press forces them open; enough, and your punch to its
 *  throat; then it spits you out. Too slow, they close. */
export function stepJaws(state: CombatState, player: PlayerState, intent: CombatIntent, dt: number) {
  const g = state.grab;
  const v = BIG_SHARK.v;
  const k = state.enemies[g.slot];
  if (g.fly < 0 && (!k.alive || k.phase !== 'grab' || player.dead)) return letGo(state, player, 'free');
  jawsHeldAt(state, g.slot, at);
  player.pos.copy(at);
  player.vel.set(0, 0, 0);
  player.grounded = false;
  if (g.fly >= 0) {
    g.fly += dt;
    if (g.fly >= PUNCH) letGo(state, player, 'free');
    return;
  }
  g.t += dt;
  if (intent.attackPressed) {
    g.hits++;
    jawsEye(state, g.slot, hit.point);
    state.events.push('bigSharkPry', g.hits, hit.point.x, hit.point.y, hit.point.z);
    if (g.hits >= Math.round(v.holdHits)) {
      state.events.push('bigSharkThroat', g.slot, hit.point.x, hit.point.y, hit.point.z);
      hit.kind = 'enemy';
      hit.index = g.slot;
      landHit(state, hit, v.throatDamage, 0, 0, 0, 'hitHeavy', 1, true);
      if (k.alive && k.phase === 'grab') {
        k.shots = 0;
        setPhase(k, 'stun');
      }
      g.fly = 0;
      return;
    }
  }
  if (g.t < v.holdTime) return;
  // Its jaws close: one shot (no grace, no dash saves you).
  player.hurtTime = 0;
  player.invuln = 0;
  state.events.push('bigSharkGulp', g.slot, at.x, at.y + 1.5, at.z);
  damagePlayer(player, v.eaten, 'bigShark');
  k.shots = 0;
  k.cooldown = 1;
  setPhase(k, 'recover');
  letGo(state, player, 'thrown');
}

/** Out of its jaws: spat out in front of it. */
function letGo(state: CombatState, player: PlayerState, end: 'free' | 'thrown') {
  const g = state.grab;
  const k = state.enemies[g.slot];
  g.on = false;
  g.fly = -1;
  g.end = end;
  g.since = 0;
  if (k) player.vel.set(-Math.sin(k.facing) * SPIT, 0, -Math.cos(k.facing) * SPIT);
}
