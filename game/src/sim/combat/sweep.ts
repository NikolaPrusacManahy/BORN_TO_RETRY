// Update 0.3.72 — everything a sweep passes through, not just the nearest (the Playable Demon's fire: its Ember Wave, its Hellfire
// Lunge): each target within `radius` of a segment, for a blow that doesn't stop at the first. Dummies, turrets and enemies. Pure.
import { Vector3 } from 'three';
import { enemyAxis, isLive, radiusOf } from '../enemies/enemy';
import { segmentDistance } from './geometry';
import type { CombatState } from './state';
import { emptyTargetHit, TargetHit } from './strike';
import { TARGET_SHAPES, dummyAxis, turretAxis } from './targets';

const a = new Vector3();
const b = new Vector3();
const at = new Vector3();
const sOut = { s: 0 };
const hit = emptyTargetHit();

/** A name for a target, to hit it only once. */
export const targetId = (t: TargetHit) => `${t.kind}${t.index}`;

/** Calls `visit` with each target `from`→`to` passes within `radius` of. (The hit it's given is reused: read it, don't keep it.)
 *  Update 0.3.73 — `anyHeight`: a wall of it, not a line: how high a target is doesn't count (Last Verdict). */
export function sweepTargets(state: CombatState, from: Vector3, to: Vector3, radius: number, visit: (t: TargetHit) => void, anyHeight = false) {
  const consider = (kind: TargetHit['kind'], index: number, r: number) => {
    if (anyHeight) from.y = to.y = (a.y + b.y) / 2;
    if (segmentDistance(from, to, a, b, at, sOut) > radius + r) return;
    hit.kind = kind;
    hit.index = index;
    hit.s = sOut.s;
    hit.part = 0;
    hit.point.copy(at);
    visit(hit);
  };
  for (let i = 0; i < state.dummies.length; i++) {
    if (state.dummies[i].broken) continue;
    dummyAxis(state.dummies[i], a, b);
    consider('dummy', i, TARGET_SHAPES.dummy.radius);
  }
  for (let i = 0; i < state.turrets.length; i++) {
    if (state.turrets[i].broken) continue;
    turretAxis(state.turrets[i], a, b);
    consider('turret', i, TARGET_SHAPES.turret.radius);
  }
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!isLive(e)) continue;
    enemyAxis(e, a, b);
    consider('enemy', i, radiusOf(e));
  }
}
