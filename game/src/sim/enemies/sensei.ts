// Update 0.3.33 — floor 8's mini boss, the Sensei (the More-enemies pack's karate master, half again as tall, a bo staff
// made in code; the Universal Animation Library's sword clips swung with it: MD/FLOOR8_SHRINE_PLAN.md). Far off, he waits
// with his arms folded, then walks at you. In his guard every blow from in front of him is turned on his staff (not
// while he's moving: hit him from the side or behind, or as a combo ends, when he's open a while); after a few turned,
// he counters at once (an uppercut of his staff that throws you up). His staff's combos (three blows, and four, coming
// on), his slam into the floor (a ring of force out round him: jump it), his palm's wave of ki from range (it throws
// you). Pure.
import { Vector3 } from 'three';
import { FOES_SHRINE_B } from '../../tuning/foesShrineB';
import { fireOrb } from '../combat/orbs';
import { startQuake } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, isLive, setPhase } from './enemy';
import { martial, Style } from './martial';
import { BLOCK, FOLDED, KI, SLAM, STAFF, STAFF_COUNTER, STAFF_HEAVY } from './shrineShared';
import { armed } from './tokens';

const v = () => FOES_SHRINE_B.v;
/** Further than this he waits, arms folded (m); his slam's ring runs out this fast (m/s) and clears this high (m); his
 *  ki flies this fast (m/s). */
const FAR = 9;
const RING_SPEED = 13;
const RING_CLEAR = 0.9;
const KI_SPEED = 11;

const from = new Vector3();
const dir = new Vector3();

function slam(e: Enemy, index: number, _p: PlayerState, w: EnemyWorld) {
  const x = e.pos.x - Math.sin(e.facing) * 1.6;
  const z = e.pos.z - Math.cos(e.facing) * 1.6;
  startQuake(w.quakes, x, 0, z, RING_SPEED, v().slamReach, v().slam, RING_CLEAR, 'sensei');
  w.events.push('staffSlam', v().slamReach, x, 0.1, z);
  void index;
}

function ki(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  from.set(e.pos.x - Math.sin(e.facing) * 1, e.pos.y + 1.9, e.pos.z - Math.cos(e.facing) * 1);
  dir.set(player.pos.x - from.x, player.pos.y + BODY.height * 0.55 - from.y, player.pos.z - from.z).normalize();
  fireOrb(w.orbs, from, dir, KI_SPEED, v().ki, 'sensei', 'ki');
  w.events.push('kiPalm', index, from.x, from.y, from.z);
}

export const SENSEI: Style = {
  stance: [2.8, 4.2],
  pace: 1,
  every: [0.6, 1.4],
  counter: STAFF_COUNTER,
  strikes: [
    { move: STAFF, from: 0, to: 3.8, reach: 3, arc: 80, damage: () => v().staff, shove: 7, lunge: 1.5, lungeTo: 0.55, recover: v().senseiOpen, weight: 1.4, event: 'staffCombo' },
    { move: STAFF_HEAVY, from: 0, to: 4.2, reach: 3.2, arc: 80, damage: () => v().staff * 1.2, shove: 9, lunge: 2.5, lungeTo: 0.6, recover: v().senseiOpen, event: 'staffCombo' },
    { move: SLAM, from: 2, to: 7, reach: 0, arc: 0, damage: () => 0, shove: 0, recover: 0.8, event: 'staffSlam', fire: slam },
    { move: KI, from: 6, to: 15, reach: 0, arc: 0, damage: () => 0, shove: 0, recover: 0.6, event: 'kiPalm', fire: ki },
    // (His counter, after his guard's turned enough: never picked.)
    { move: STAFF_COUNTER, from: 99, to: 0, reach: 3, arc: 90, damage: () => v().staff * 1.6, shove: 5, lift: 10, recover: 0.6, event: 'senseiCounter' },
  ],
};

export function updateSensei(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  // Far off: waiting, arms folded (still, facing you), till you come.
  if (e.phase === 'chase' && dist > FAR && e.cooldown > 0) {
    e.move = FOLDED;
    return;
  }
  if (e.move === FOLDED) e.move = 0;
  martial(e, index, player, w, dt, SENSEI, armed(e));
}

/** A blow about to land on him (evade.ts): from in front, not mid-move, turned on his guard; enough turned, the counter
 *  at once. True: the blow misses. */
export function senseiGuards(state: CombatState, i: number, dirX: number, dirZ: number): boolean {
  const e = state.enemies[i];
  if (!isLive(e) || e.phase === 'held' || e.frozen > 0 || e.phase !== 'chase') return false;
  const front = Math.sin(e.facing) * dirX + Math.cos(e.facing) * dirZ;
  if (front < Math.cos((v().guardArc * Math.PI) / 180)) return false;
  state.events.push('senseiGuard', i, e.pos.x - Math.sin(e.facing) * 0.9, e.pos.y + 1.9, e.pos.z - Math.cos(e.facing) * 0.9);
  e.stage++;
  if (e.stage >= Math.round(v().counterAfter)) {
    e.stage = 0;
    e.move = BLOCK;
    setPhase(e, 'windup');
  }
  return true;
}
