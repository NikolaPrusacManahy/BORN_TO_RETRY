// Update 0.5.4 — floor 10's Bone Guard (the Bestiary pack's Skeleton B: a helm, armour, a sword; the Universal Animation Library's sword clips:
// MD/FLOOR10_HELL_PLAN.md). It walks at you and stands its ground with its guard up, its sword across it, turning to you only so fast: every
// blow from in front of it glances off (circle it, or hit it as it swings, or while it's open after); a couple turned and it ripostes at once
// (a rising cut that throws you up). A heavy blow (the axe's, the hammer's, a charged one, the Demon's overhead: the knob's hard) or your
// parry of one of its cuts breaks its guard (the parry's counter mostly kills it outright): it reels, and its guard stays down a while. Its
// cut, its three-cut combo. Pure.
import { FOES_HELL } from '../../tuning/foesHell';
import type { CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { plod } from './boneAxeman';
import { Enemy, EnemyWorld, isLive, setPhase } from './enemy';
import { breakGuard, guardDown } from './guardBreak';
import { BROKEN, CUT, GUARD, GUARD_COMBO, HELL_CLIPS, RIPOSTE, STAND } from './hellShared';
import { BLOCK } from './shrineShared';
import { martial, Style } from './martial';
import { armed } from './tokens';

const v = () => FOES_HELL.v;

export const BONE_GUARD: Style = {
  stance: [0, 2.2],
  pace: 1,
  every: [0.7, 1.4],
  counter: RIPOSTE,
  stand: (e, player, w, dt, dist, toward) => plod(e, player, w, dt, dist, toward, BONE_GUARD.stance[1], v().guardTurn, guardDown(e) ? STAND : GUARD),
  strikes: [
    { move: CUT, from: 0, to: 2.9, reach: 2.2, arc: 60, damage: () => v().guardCut, shove: 6, lunge: 3.5, lungeTo: 0.6, recover: 0.45, weight: 1.6, event: 'guardCut' },
    { move: GUARD_COMBO, from: 0, to: 3, reach: 2.3, arc: 70, damage: () => v().guardCut * 0.9, shove: 5, lunge: 2, lungeTo: 0.8, recover: 0.9, event: 'guardCombo' },
    // (Its riposte, after your blows turned: never picked.)
    { move: RIPOSTE, from: 99, to: 0, reach: 2.3, arc: 80, damage: () => v().guardRiposte, shove: 5, lift: 7, lunge: 3, lungeTo: 0.4, recover: 0.6, event: 'guardRiposte' },
  ],
};

export function updateBoneGuard(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  // (Broken by a blow, the blow's flinch is its reeling; a blow while it reels, a flinch as any, its guard still down.)
  if (e.phase === 'flinch' && e.move === BROKEN && e.shots === 1) {
    e.shots = 0;
    setPhase(e, 'stun');
  }
  if (e.phase === 'stun') {
    e.move = BROKEN;
    e.blink = Math.max(0, e.blink - dt);
    if (e.t >= HELL_CLIPS[BROKEN].len) {
      e.move = 0;
      setPhase(e, 'chase');
    }
    return;
  }
  martial(e, index, player, w, dt, BONE_GUARD, armed(e));
}

/** A blow about to land on it (evade.ts), `damage` hard: from in front with its guard up, turned (enough turned, its riposte at once); hard
 *  enough, its guard breaks (and the blow lands). True: the blow misses. */
export function boneGuardGuards(state: CombatState, i: number, dirX: number, dirZ: number, damage: number): boolean {
  const e = state.enemies[i];
  if (!isLive(e) || e.phase !== 'chase' || e.move !== GUARD || guardDown(e)) return false;
  const front = Math.sin(e.facing) * dirX + Math.cos(e.facing) * dirZ;
  if (front < Math.cos((v().guardArc * Math.PI) / 180)) return false;
  if (damage >= v().guardBreak) {
    breakGuard(e, i, state.events);
    return false;
  }
  state.events.push('guardTurn', i, e.pos.x - Math.sin(e.facing) * 0.6, e.pos.y + 1.3, e.pos.z - Math.cos(e.facing) * 0.6);
  e.stage++;
  if (e.stage >= Math.round(v().guardCounter)) {
    e.stage = 0;
    e.move = BLOCK;
    setPhase(e, 'windup');
  }
  return true;
}
