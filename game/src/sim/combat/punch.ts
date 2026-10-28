// M1 step 6 — landing a punch: a sphere swept from the eye along the aim, up to the reach (or the first wall).
// The nearest target in the sweep takes the hit. Hits land the instant the punch is thrown, so they never feel
// late.
// M2 — sword swings land the same way (with their own reach and width), and grunts are targets too (strike.ts).
import { Vector3 } from 'three';
import { FEEDBACK } from '../../tuning/combat';
import { CAMERA } from '../../tuning/camera';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from '../player/state';
import type { Punch, PunchKind } from './fists';
import type { CombatEvent, CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

const end = new Vector3();
const hit = emptyTargetHit();

/** The eye and aim direction (length 1) from the player's feet, facing and look pitch. */
export function aim(p: PlayerState, yaw: number, pitch: number, eye: Vector3, dir: Vector3) {
  eye.set(p.pos.x, p.pos.y + (p.sliding ? CAMERA.v.slideEyeHeight : CAMERA.v.eyeHeight), p.pos.z);
  const c = Math.cos(pitch);
  dir.set(-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c);
}

const STOP: Record<PunchKind, () => number> = {
  jab: () => FEEDBACK.v.stopJab,
  finisher: () => FEEDBACK.v.stopFinisher,
  heavy: () => FEEDBACK.v.stopHeavy,
  slash: () => FEEDBACK.v.stopJab,
  pierce: () => FEEDBACK.v.stopHeavy,
};

const HIT_EVENT: Record<PunchKind, CombatEvent> = { jab: 'hitJab', finisher: 'hitFinisher', heavy: 'hitHeavy', slash: 'hitSlash', pierce: 'hitPierce' };

/** Resolves a thrown punch or swing: hit or whiff. Pushes events and hit-stop requests. Returns how far from the eye
 *  it landed (m), or −1 for a whiff. */
export function resolvePunch(punch: Punch, state: CombatState, eye: Vector3, dir: Vector3, world: CollisionWorld): number {
  const reach = Math.min(punch.reach, world.rayDistance(eye, dir, punch.reach) + punch.radius);
  end.copy(eye).addScaledVector(dir, reach);
  if (!nearestTarget(state, eye, end, punch.radius, hit)) {
    state.events.push('whiff', 0, end.x, end.y, end.z);
    return -1;
  }
  const flat = Math.hypot(dir.x, dir.z) || 1;
  const charged = punch.kind === 'heavy' || punch.kind === 'pierce';
  landHit(state, hit, punch.damage, punch.knock, dir.x / flat, dir.z / flat, HIT_EVENT[punch.kind], charged ? punch.charge : punch.damage);
  state.hitStop.request(STOP[punch.kind]() * (charged ? 0.5 + 0.5 * punch.charge : 1));
  return eye.distanceTo(hit.point);
}
