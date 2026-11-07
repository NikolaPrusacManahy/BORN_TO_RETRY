// Update 0.5.4 — floor 10's Bone Guard's guard broken (boneGuard.ts; out of it, so the parry, combat/meleeParry.ts, can break it without
// bringing in the fighters' rules): it reels, its sword down, and its guard stays down a while after. Pure.
import type { EventQueue } from '../../core/eventQueue';
import type { CombatEvent } from '../combat/state';
import { FOES_HELL } from '../../tuning/foesHell';
import { Enemy, isLive, setPhase } from './enemy';
import { BROKEN } from './hellShared';

/** Its guard is down (broken, and a while after). */
export const guardDown = (e: Enemy) => e.blink > 0;

/** Its guard breaks: it reels (the stagger, `stun`), and it's down for the knob's time. */
export function breakGuard(e: Enemy, index: number, events: EventQueue<CombatEvent>) {
  if (!isLive(e) || e.kind !== 'boneGuard') return;
  e.blink = FOES_HELL.v.guardBroken;
  e.stage = 0;
  e.move = BROKEN;
  // (Fresh: the blow's flinch becomes its reeling. Later blows flinch it as any.)
  e.shots = 1;
  setPhase(e, 'stun');
  events.push('guardBreak', index, e.pos.x - Math.sin(e.facing) * 0.6, e.pos.y + 1.3, e.pos.z - Math.cos(e.facing) * 0.6);
}
