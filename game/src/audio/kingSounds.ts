// Update 0.2.3 — the Bone King's sounds: recorded clips where one fits (the Demon's slam for each landing and its crash
// for you hitting the wall, its roar for the King's, a crunch as it grabs you, the bombs' and the bosses' bursts for its
// blast; no new recordings: human-made only, the designer's rule), and placeholder synth for the rest (bones rattling
// as it winds up, a whoosh for each throw and jump, a rising drone as its blast charges, a rumble as the floor shakes, a
// note climbing with each of your hits held).
import type { CombatEvent } from '../sim/combat/state';
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
      for (let k = 0; k < 4; k++) noise(a, { dur: 0.07 + k * 0.04, gain: 0.22 * boss, filter: 'bandpass', from: 1800 - k * 250, to: 900, q: 3 });
      tone(a, { from: 90, to: 140, dur: 0.5, gain: 0.12 * boss, type: 'square' });
      return true;
    case 'kingThrow':
    case 'kingJump':
      noise(a, { dur: 0.35, gain: 0.3 * boss, filter: 'bandpass', from: 500, to: 1800, q: 1.2 });
      return true;
    case 'boneCrash':
      a.clips.play('blowCrush', 0.8 * far);
      return playFoes3(a, 'skeletonCollapse', 0, far);
    case 'kingSmash':
      return a.clips.play('demonSlam', boss) || playFoes3(a, 'skeletonCollapse', 0, boss);
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
    case 'kingSummon':
      a.clips.play('bossRise', boss);
      return true;
    case 'kingCharge':
      tone(a, { from: 50, to: 190, dur: v.blastCharge, gain: 0.22 * boss, type: 'sawtooth' });
      noise(a, { dur: v.blastCharge, gain: 0.14 * boss, filter: 'lowpass', from: 200, to: 900 });
      return true;
    case 'kingRumble':
      noise(a, { dur: 0.3, gain: (0.1 + 0.2 * value) * boss, filter: 'lowpass', from: 160, to: 80 });
      return true;
    case 'kingBlast':
      a.clips.play('bossBurst', 1);
      a.clips.play('bombBlast', 1);
      return true;
    default:
      return false;
  }
}
