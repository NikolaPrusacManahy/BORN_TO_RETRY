// M1 step 6 — landing a punch: a sphere swept from the eye along the aim, up to the reach (or the first wall).
// The nearest target in the sweep takes the hit. Hits land the instant the punch is thrown, so they never feel
// late.
import { Vector3 } from 'three';
import { FEEDBACK, FISTS } from '../../tuning/combat';
import { CAMERA } from '../../tuning/camera';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from '../player/state';
import { hitDummy } from './dummy';
import type { Punch } from './fists';
import { segmentDistance } from './geometry';
import type { CombatState } from './state';
import { TARGET_SHAPES, dummyAxis, turretAxis } from './targets';
import { hitTurret } from './turretDamage';

const end = new Vector3();
const a = new Vector3();
const b = new Vector3();
const at = new Vector3();
const best = new Vector3();
const sOut = { s: 0 };

/** The eye and aim direction (length 1) from the player's feet, facing and look pitch. */
export function aim(p: PlayerState, yaw: number, pitch: number, eye: Vector3, dir: Vector3) {
  eye.set(p.pos.x, p.pos.y + (p.sliding ? CAMERA.v.slideEyeHeight : CAMERA.v.eyeHeight), p.pos.z);
  const c = Math.cos(pitch);
  dir.set(-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c);
}

const STOP: Record<Punch['kind'], () => number> = {
  jab: () => FEEDBACK.v.stopJab,
  finisher: () => FEEDBACK.v.stopFinisher,
  heavy: () => FEEDBACK.v.stopHeavy,
  quick: () => FEEDBACK.v.stopJab,
};

const HIT_EVENT = { jab: 'hitJab', finisher: 'hitFinisher', heavy: 'hitHeavy', quick: 'hitQuick' } as const;

/** Resolves a thrown punch: hit or whiff. Pushes events and hit-stop requests. Returns how far from the eye it
 *  landed (m), or -1 for a whiff (M1 step 8: blood heal needs the distance). */
export function resolvePunch(punch: Punch, state: CombatState, eye: Vector3, dir: Vector3, world: CollisionWorld): number {
  const v = FISTS.v;
  const events = state.events;
  const reach = Math.min(v.reach, world.rayDistance(eye, dir, v.reach) + v.radius);
  end.copy(eye).addScaledVector(dir, reach);
  let nearest = Infinity;
  let dummyIndex = -1;
  let turretIndex = -1;
  for (let i = 0; i < state.dummies.length; i++) {
    const d = state.dummies[i];
    if (d.broken) continue;
    dummyAxis(d, a, b);
    if (segmentDistance(eye, end, a, b, at, sOut) > v.radius + TARGET_SHAPES.dummy.radius || sOut.s >= nearest) continue;
    nearest = sOut.s;
    dummyIndex = i;
    turretIndex = -1;
    best.copy(at);
  }
  for (let i = 0; i < state.turrets.length; i++) {
    const t = state.turrets[i];
    if (t.broken) continue;
    turretAxis(t, a, b);
    if (segmentDistance(eye, end, a, b, at, sOut) > v.radius + TARGET_SHAPES.turret.radius || sOut.s >= nearest) continue;
    nearest = sOut.s;
    turretIndex = i;
    dummyIndex = -1;
    best.copy(at);
  }

  if (dummyIndex < 0 && turretIndex < 0) {
    events.push('whiff', 0, end.x, end.y, end.z);
    return -1;
  }
  const flat = Math.hypot(dir.x, dir.z) || 1;
  const killed = dummyIndex >= 0 ? hitDummy(state.dummies[dummyIndex], punch.damage, punch.knock, dir.x / flat, dir.z / flat) : hitTurret(state.turrets[turretIndex], punch.damage);
  events.push(HIT_EVENT[punch.kind], punch.kind === 'heavy' ? punch.charge : punch.damage, best.x, best.y, best.z);
  state.hitStop.request(STOP[punch.kind]() * (punch.kind === 'heavy' ? 0.5 + 0.5 * punch.charge : 1));
  if (killed) {
    events.push('kill', 0, best.x, best.y, best.z);
    state.hitStop.request(FEEDBACK.v.stopKill);
  }
  return eye.distanceTo(best);
}
