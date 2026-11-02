// Update 0.3.14 — what floors 6–8's world sets off, seen and felt (out of combatFeedback.ts, which had reached its size):
// floor 7's icicle shattering (shards, a jolt near it); floor 8's press slamming down (grit off its plate, a jolt the
// bigger the press); floor 6's powder keg's blast (fire and debris, a hard jolt the nearer); a body sinking into a pit
// (spray). Update 0.3.15 — and Skull Cove's crew: a powder bomb's blast, a bomb batted back, a skull knocked off, the
// Tentacle bursting out and grabbing you, slamming you down (sand and a jolt), the sea round it, Mako's sand, Barbarossa's shot striking, his hook catching you.
// Update 0.3.17 — floor 8's meteor striking (moon dust and rock flung, a hard jolt the nearer). Update 0.3.18 — its
// crew's: a mine popping, a Leaper's and the Bee mech's landings, Barbara bursting out of her broken mech.
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import { FEEDBACK } from '../tuning/combat';
import type { FeedbackParts } from './combatFeedback';

const UP = new THREE.Vector3(0, 1, 0);

/** False: not one of these. */
export function depthsFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, near: (far: number) => number): boolean {
  const fb = FEEDBACK.v;
  switch (kind) {
    case 'icicleShatter':
      f.sparks.spawn(at, UP, 26, 1.2);
      f.rig.shake.add(fb.shakeJab * near(8));
      return true;
    case 'pressSlam':
      f.sparks.spawn(at, UP, 16, 1);
      f.rig.shake.add(fb.shakeJab * (0.3 + value / 10) * near(9));
      return true;
    case 'mineBlast':
      f.sparks.spawn(at, UP, 30, 1.4);
      f.chunks.spawn(at, UP, 6, 0.9);
      f.rig.shake.add(fb.shakeHeavy * 0.8 * near(10));
      return true;
    case 'hopperLand':
    case 'beeMechLand':
      f.chunks.spawn(at, UP, kind === 'beeMechLand' ? 14 : 8, kind === 'beeMechLand' ? 1.4 : 1);
      f.rig.shake.add(fb.shakeHeavy * (kind === 'beeMechLand' ? 1.1 : 0.6) * near(12));
      return true;
    case 'beeEject':
      f.chunks.spawn(at, UP, 12, 1.2);
      f.sparks.spawn(at, UP, 24, 1.2);
      return true;
    case 'meteorStrike':
      f.chunks.spawn(at, UP, 16, 1.5);
      f.sparks.spawn(at, UP, 30, 1.6);
      f.rig.shake.add(fb.shakeHeavy * 1.3 * near(18));
      return true;
    case 'kegBlast':
      f.sparks.spawn(at, UP, 60, 2.2);
      f.chunks.spawn(at, UP, 18, 1.4);
      f.rig.shake.add(fb.shakeHeavy * 1.5 * near(16));
      return true;
    case 'pitSink':
    case 'tentacleRise':
    case 'tentacleSink':
      f.sparks.spawn(at, UP, kind === 'pitSink' ? 14 : 24, 0.9);
      return true;
    case 'powderBlast':
      f.sparks.spawn(at, UP, 40, 1.8);
      f.chunks.spawn(at, UP, 8, 1.1);
      f.rig.shake.add(fb.shakeHeavy * near(14));
      return true;
    case 'bombBatted':
    case 'captainShot':
      f.sparks.spawn(at, UP, 10, 0.8);
      return true;
    case 'skullOff':
      f.chunks.spawn(at, UP, 4, 0.8);
      return true;
    case 'tentacleSlam':
      f.chunks.spawn(at, UP, 14, 1.2);
      f.rig.shake.add(fb.shakeHeavy * near(12));
      return true;
    case 'tentacleGrab':
      f.sparks.spawn(at, UP, 30, 1.4);
      f.rig.shake.add(fb.shakeHeavy);
      return true;
    case 'makoDive':
    case 'makoBite':
      f.chunks.spawn(at, UP, kind === 'makoBite' ? 16 : 10, 1.1);
      f.rig.shake.add(fb.shakeJab * near(8));
      return true;
    case 'hookCatch':
      f.rig.shake.add(fb.shakeJab * 0.6);
      return true;
    // (Update 0.3.16 — the Big Shark: its leap's spray, its bites, its teeth in a wall, its jaws on you.)
    case 'bigSharkBreach':
    case 'bigSharkSplash':
      f.sparks.spawn(at, UP, 70, 2.4);
      f.rig.shake.add(fb.shakeHeavy * near(30));
      return true;
    case 'bigSharkBite':
    case 'bigSharkSnap':
    case 'bigSharkTail':
      f.rig.shake.add(fb.shakeHeavy * near(10));
      return true;
    case 'bigSharkStuck':
      f.chunks.spawn(at, UP, 16, 1.2);
      f.rig.shake.add(fb.shakeHeavy * near(20));
      return true;
    case 'bigSharkCatch':
    case 'bigSharkThroat':
    case 'bigSharkGulp':
    case 'bigSharkFrenzy':
      f.rig.shake.add(fb.shakeHeavy * (kind === 'bigSharkFrenzy' ? near(30) : 1.2));
      return true;
    default:
      return false;
  }
}
