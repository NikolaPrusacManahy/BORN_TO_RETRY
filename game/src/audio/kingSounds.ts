// Update 0.2.3 — the Bone King's sounds: recorded clips where one fits (the Demon's slam, its crash, its roar, a crunch, the
// bosses' bursts; no new recordings: human-made only, the designer's rule), and placeholder synth for the rest.
// Update 0.3.53 — by the Boss Design Bible: each tell its own sound (the bones rattling, a crack in its chest for its ribs, dust
// sifting for its hands, a low creak for its arm held high, a rising rattle for its shatter, cracks for its cage), its Colossus's
// green drone and rumble.
import type { CombatEvent } from '../sim/combat/state';
import { CAGE, GRASP, RIBS, SHATTER, SLAM } from '../sim/enemies/boneKingMoves';
import { BONE_KING } from '../tuning/boneKing';
import type { AudioEngine } from './audio';
import { playFoes3 } from './foe3Sounds';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playKing(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  const v = BONE_KING.v;
  const boss = Math.max(0.45, far);
  switch (kind) {
    case 'kingWindup':
      if (value === RIBS) {
        // A hand in its chest, cracking.
        for (let k = 0; k < 3; k++) noise(a, { dur: 0.05, gain: 0.34 * boss, filter: 'bandpass', from: 2600 - k * 300, to: 1400, q: 6 });
        tone(a, { from: 120, to: 70, dur: 0.3, gain: 0.12 * boss, type: 'square' });
      } else if (value === GRASP) {
        noise(a, { dur: 0.7, gain: 0.16 * boss, filter: 'lowpass', from: 500, to: 200 });
      } else if (value === SLAM) {
        // Its arm going up, creaking, and the long pause.
        tone(a, { from: 60, to: 130, dur: 0.8, gain: 0.2 * boss, type: 'sawtooth' });
      } else if (value === SHATTER) {
        for (let k = 0; k < 8; k++) noise(a, { dur: 0.05 + k * 0.05, gain: 0.26 * boss, filter: 'bandpass', from: 1500 + k * 180, to: 900, q: 3 });
      } else if (value === CAGE) {
        for (let k = 0; k < 4; k++) noise(a, { dur: 0.08 + k * 0.08, gain: 0.3 * boss, filter: 'bandpass', from: 900, to: 400, q: 2 });
      }
      return true;
    case 'kingRibs':
      noise(a, { dur: 0.45, gain: 0.32 * boss, filter: 'bandpass', from: 500, to: 1800, q: 1.2 });
      return true;
    case 'kingRibBack':
      a.clips.play('blowCrush', boss);
      return playFoes3(a, 'skeletonCollapse', 0, boss);
    case 'kingDust':
      noise(a, { dur: 0.15, gain: 0.1 * boss, filter: 'lowpass', from: 700, to: 300 });
      return true;
    case 'kingHands':
      a.clips.play('blowCrush', boss);
      noise(a, { dur: 0.3, gain: 0.3 * boss, filter: 'bandpass', from: 1800, to: 700, q: 2 });
      return true;
    case 'kingGrab':
      a.clips.play('blowCrush', 1);
      tone(a, { from: 140, to: 60, dur: 0.4, gain: 0.25, type: 'sawtooth' });
      return true;
    case 'kingQteHit':
      tone(a, { from: 300 + 45 * value, to: 360 + 45 * value, dur: 0.08, gain: 0.12, type: 'triangle' });
      return true;
    case 'kingFree':
      a.clips.play('slamImpact', 0.8);
      tone(a, { from: 520, to: 880, dur: 0.25, gain: 0.16, type: 'triangle' });
      return true;
    case 'kingThrowYou':
      if (!a.clips.play('demonCrash', 1)) a.clips.play('bruteSlam', 1);
      return true;
    case 'kingSlam':
      return a.clips.play('demonSlam', boss) || playFoes3(a, 'skeletonCollapse', 0, boss);
    case 'kingArmUp':
      noise(a, { dur: 0.3, gain: 0.14 * boss, filter: 'bandpass', from: 800, to: 1600, q: 2 });
      return true;
    case 'kingSkull':
      tone(a, { from: 700, to: 420, dur: 0.12, gain: 0.14, type: 'square' });
      return true;
    case 'kingShatter':
      a.clips.play('bruteSlam', boss);
      for (let k = 0; k < 7; k++) noise(a, { dur: 0.08 + k * 0.06, gain: 0.3 * boss, filter: 'bandpass', from: 2800 - k * 280, to: 700, q: 3 });
      return true;
    case 'kingBoneHit':
      a.clips.play('blowCrush', 1);
      return true;
    case 'kingCracks':
      for (let k = 0; k < 3; k++) noise(a, { dur: 0.06, gain: 0.26 * boss, filter: 'bandpass', from: 1400 + k * 400, to: 800, q: 5 });
      return true;
    case 'kingCage':
      a.clips.play('bruteSlam', boss);
      return true;
    case 'kingCageShut':
      tone(a, { from: 200, to: 80, dur: 0.3, gain: 0.2, type: 'square' });
      return true;
    case 'kingCageBreak':
      a.clips.play('blowCrush', 1);
      return playFoes3(a, 'skeletonCollapse', 0, 1);
    case 'kingCrush':
      a.clips.play('demonCrash', 1);
      return true;
    case 'kingCollapse':
      a.clips.play('bruteSlam', boss);
      for (let k = 0; k < 7; k++) noise(a, { dur: 0.08 + k * 0.06, gain: 0.3 * boss, filter: 'bandpass', from: 2800 - k * 280, to: 700, q: 3 });
      return true;
    case 'kingRise':
      noise(a, { dur: v.kingRise, gain: 0.2 * boss, filter: 'bandpass', from: 600, to: 2400, q: 3 });
      tone(a, { from: 70, to: 160, dur: v.kingRise, gain: 0.14 * boss, type: 'sawtooth' });
      return true;
    case 'kingRoar':
      a.clips.play('demonRoar', boss);
      return true;
    case 'kingTremble':
      noise(a, { dur: 1.4, gain: 0.24, filter: 'lowpass', from: 140, to: 70 });
      for (let k = 0; k < 6; k++) noise(a, { dur: 0.05 + k * 0.05, gain: 0.14, filter: 'bandpass', from: 1500 + k * 120, to: 900, q: 4 });
      return true;
    case 'kingGather':
      noise(a, { dur: v.showBuild, gain: 0.3, filter: 'bandpass', from: 500, to: 2600, q: 2.5 });
      tone(a, { from: 45, to: 110, dur: v.showBuild, gain: 0.2, type: 'sawtooth' });
      return true;
    case 'kingStands':
      a.clips.play('bruteSlam', 1);
      return true;
    case 'kingSkullOn':
      a.clips.play('blowCrush', 1);
      tone(a, { from: 60, to: 420, dur: 1.2, gain: 0.22, type: 'sawtooth' });
      noise(a, { dur: 1.2, gain: 0.2, filter: 'bandpass', from: 1000, to: 3000, q: 1.5 });
      return true;
    case 'kingColossus':
      a.clips.play('demonRoar', 1);
      noise(a, { dur: v.colossusRise, gain: 0.26, filter: 'bandpass', from: 600, to: 2600, q: 3 });
      tone(a, { from: 45, to: 150, dur: v.colossusRise, gain: 0.26, type: 'sawtooth' });
      return true;
    case 'kingOpen':
      a.clips.play('bossRise', 1);
      tone(a, { from: 70, to: 90, dur: v.colossusWindow, gain: 0.16, type: 'sawtooth' });
      return true;
    case 'kingRumble':
      noise(a, { dur: 0.3, gain: (0.1 + 0.2 * value) * boss, filter: 'lowpass', from: 160, to: 80 });
      return true;
    case 'kingSpineHit':
      a.clips.play('blowCrush', 1);
      tone(a, { from: 900, to: 500, dur: 0.15, gain: 0.2, type: 'square' });
      return true;
    case 'kingSpine':
      a.clips.play('bossBurst', 1);
      return playFoes3(a, 'skeletonCollapse', 0, 1);
    case 'kingClubUp':
      noise(a, { dur: 0.45, gain: 0.4, filter: 'bandpass', from: 400, to: 1800, q: 1.2 });
      return true;
    case 'kingClub':
      a.clips.play('bossBurst', 1);
      a.clips.play('demonSlam', 1);
      return true;
    default:
      return false;
  }
}
