// Update 0.1.1 — what you see of an execution's blows: each slam into the floor (dust, chips, a ring, a hard jolt: the
// second harder), the landing (a burst of dust).
// Update 0.1.2 — every enemy's: a punch, a chop, a tear, a crush or a smash (execMoves.ts BLOWS: sparks, chips, a jolt
// as heavy as the blow), and its burst (a great ring, chunks and sparks, the hardest jolt). (Moved out of foeFeedback.ts.)
import * as THREE from 'three';
import type { CombatEvent } from '../sim/combat/state';
import { BLOWS } from '../sim/combat/execMoves';
import type { FeedbackParts } from './combatFeedback';
import { kiFull, KiPower, kiPower } from '../sim/weapons/kiCharge';
import { waveTime } from '../sim/weapons/smashWaves';
import { WEAPONS } from '../tuning/weapons';

const UP = new THREE.Vector3(0, 1, 0);
const power: KiPower = { damage: 0, splash: 0, burst: 0, size: 0, speed: 0, knock: 0 };

/** Returns false for events it doesn't know. `back`: from `at` towards the camera; `near`: 1 at the camera. */
export function execFeedback(f: FeedbackParts, kind: CombatEvent, value: number, at: THREE.Vector3, back: THREE.Vector3, near: (far: number) => number): boolean {
  switch (kind) {
    case 'execSlam':
      f.waves.spawn(at, 2.2, 0xffe0c0);
      f.chunks.spawn(at, UP, 18, 1.1);
      f.sparks.spawn(at, UP, 14, 1.2);
      f.rig.shake.add(value >= 2 ? 0.75 : 0.55);
      f.rig.kick(value >= 2 ? 2.6 : 1.8);
      return true;
    case 'execLand':
      f.chunks.spawn(at, UP, 20, 1.2);
      f.waves.spawn(at, 3, 0xff8060);
      f.rig.shake.add(0.3 * near(20));
      return true;
    case 'execBlow':
      switch (BLOWS[value]) {
        case 'punch':
          f.sparks.spawn(at, back, 8, 1);
          f.rig.shake.add(0.12);
          break;
        case 'chop':
          // Update 0.1.3 — harder.
          f.sparks.spawn(at, back, 20, 1.5);
          f.chunks.spawn(at, UP, 14, 1.1);
          f.rig.shake.add(0.5);
          f.rig.kick(1.6);
          break;
        case 'tear':
          f.chunks.spawn(at, back, 16, 1.1);
          f.rig.shake.add(0.45);
          f.rig.kick(1.4);
          break;
        case 'crush':
          f.chunks.spawn(at, UP, 10, 0.7);
          f.rig.shake.add(0.3);
          break;
        case 'smash':
          f.waves.spawn(at, 2.6, 0xffe0c0);
          f.chunks.spawn(at, UP, 22, 1.2);
          f.sparks.spawn(at, UP, 16, 1.2);
          f.rig.shake.add(0.7);
          f.rig.kick(2.4);
          break;
      }
      return true;
    // Update 0.1.4 — the Grimoire (value: the charge, s): a cast nudges the view (a charged one harder); each charge
    // shakes it a little more; a fireball's burst throws a fiery ring as wide as its burst, sparks, a shake and (charged)
    // a jolt, all growing with the charge. (Its flames are fireView.ts's.)
    case 'cast':
      f.rig.kick(0.4 + 0.12 * Math.min(value, kiFull()));
      return true;
    case 'kiCharge':
      f.rig.shake.add(0.03 + 0.012 * value);
      return true;
    case 'fireballBurst': {
      const reach = kiPower(value, power).burst;
      const c = Math.min(1, value / Math.max(1e-3, kiFull()));
      f.waves.spawn(at, reach, 0xff8a3a);
      f.sparks.spawn(at, back, Math.round(12 + 30 * c), 1.1 + 1.5 * c);
      f.rig.shake.add((0.18 + 0.9 * c) * near(25 + reach));
      if (value >= WEAPONS.v.kiStep) f.rig.kick(0.8 + 2.2 * c);
      return true;
    }
    // Update 0.1.5 — the Hammer's smash: a ring rolling out as far and as fast as its shockwave (the same ease), a dust
    // ring close in, chunks of floor, the hardest shake and a jolt; the Gold Axe biting into a wall or the floor (chips),
    // and caught (a nudge).
    case 'smash':
      // (value: the way it rolls; Update 0.1.6 — a half ring, before you only.)
      f.waves.spawn(at, WEAPONS.v.waveReach, 0xffd9a0, waveTime(), value);
      f.waves.spawn(at, 3.5, 0xbfa080, undefined, value);
      f.chunks.spawn(at, UP, 26, 1.4);
      f.rig.shake.add(0.9 * near(30));
      f.rig.kick(2.4);
      return true;
    case 'axeStick':
      f.chunks.spawn(at, back, 6, 0.6);
      return true;
    case 'catch':
      f.rig.kick(0.5);
      return true;
    case 'execBurst':
      f.waves.spawn(at, 3.5, 0xff8060);
      f.chunks.spawn(at, UP, 30, 1.5);
      f.sparks.spawn(at, UP, 30, 1.6);
      f.rig.shake.add(0.8 * near(20));
      f.rig.kick(2.8);
      return true;
    default:
      return false;
  }
}
