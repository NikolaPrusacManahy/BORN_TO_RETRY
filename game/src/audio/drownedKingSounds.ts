// Update 0.2.10 — the Drowned King's sounds (drownedSounds.ts passes its events here): the library's roar (the Demon's)
// as it takes its stance and as it rises for good (with the water rushing up), and its crash bursting up; placeholder
// synth for the rest.
// Update 0.3.58 — by the Boss Design Bible, each tell its own: its heads' jaws snapping, its fin cutting and gone, its shoulders' growl,
// the water rushing in, its Maw's scream, its pull, the bright note of its flash, and the clang of its jaw jamming.
import type { CombatEvent } from '../sim/combat/state';
import { DROWNED } from '../tuning/drowned';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** A big splash: a burst of filtered noise and a low thud. */
function splash(a: AudioEngine, far: number, big: number) {
  noise(a, { dur: 0.35 * big, gain: 0.32 * far * Math.min(1.5, big), filter: 'lowpass', from: 2600, to: 300 });
  tone(a, { from: 140 / big, to: 40, dur: 0.25 * big, gain: 0.3 * far });
}

/** A jaw's snap. */
function snap(a: AudioEngine, far: number, delay = 0) {
  tone(a, { from: 520, to: 140, dur: 0.07, gain: 0.34 * far, type: 'square', delay });
  noise(a, { dur: 0.06, gain: 0.26 * far, filter: 'highpass', from: 2400, to: 900, delay });
}

/** Returns false for events it doesn't know. */
export function playDrownedKing(a: AudioEngine, kind: CombatEvent, far: number): boolean {
  const boss = Math.max(0.45, far);
  const v = DROWNED.v;
  switch (kind) {
    case 'drownedRoar':
      return a.clips.play('demonRoar', boss) || true;
    case 'drownedRisen':
      a.clips.play('demonRoar', boss, 0.85);
      noise(a, { dur: 2.6, gain: 0.22, filter: 'lowpass', from: 300, to: 1400, delay: 0.3 });
      return true;
    case 'drownedDive':
      splash(a, boss, 2.2);
      return true;
    case 'drownedRiseWarn':
      noise(a, { dur: v.finGone - v.finLock, gain: 0.26 * boss, filter: 'bandpass', from: 300, to: 1600, q: 5 });
      tone(a, { from: 50, to: 120, dur: v.finGone - v.finLock, gain: 0.25 * boss, type: 'sawtooth' });
      return true;
    case 'drownedRise':
      a.clips.play('demonCrash', boss);
      splash(a, boss, 2.6);
      return true;
    case 'drownedLand':
      splash(a, boss, 2);
      return true;
    case 'drownedSurface':
      splash(a, boss, 1.8);
      return true;
    case 'drownedSurfWindup':
      tone(a, { from: 60, to: 130, dur: v.surfWindup, gain: 0.3 * boss, type: 'sawtooth' });
      return true;
    case 'drownedSurf':
      noise(a, { dur: 1.4, gain: 0.3 * boss, filter: 'bandpass', from: 600, to: 1500, q: 1.1 });
      return true;
    case 'drownedSnap':
      snap(a, boss);
      snap(a, boss, 0.09);
      snap(a, boss, 0.17);
      return true;
    case 'drownedHead':
      noise(a, { dur: 0.18, gain: 0.26 * far, filter: 'bandpass', from: 1800, to: 500, q: 2 });
      snap(a, far * 0.8, 0.03);
      return true;
    case 'drownedHeadBack':
      a.clips.play('demonCrash', Math.max(0.5, far), 1.5);
      snap(a, boss);
      return true;
    case 'drownedFinCut':
      splash(a, boss, 1.3);
      noise(a, { dur: 1.6, gain: 0.15 * boss, filter: 'bandpass', from: 900, to: 2200, q: 3 });
      return true;
    case 'drownedFinGone':
      // (Everything stops: then a low swell.)
      tone(a, { from: 90, to: 38, dur: v.finGone, gain: 0.3 * boss, type: 'triangle' });
      return true;
    case 'drownedHunch':
      tone(a, { from: 58, to: 92, dur: v.tell, gain: 0.34 * boss, type: 'sawtooth' });
      snap(a, boss * 0.8, v.tell * 0.6);
      return true;
    case 'drownedClaw':
      noise(a, { dur: 0.16, gain: 0.32 * boss, filter: 'highpass', from: 3400, to: 1100 });
      tone(a, { from: 240, to: 90, dur: 0.1, gain: 0.2 * boss, type: 'sawtooth' });
      return true;
    case 'drownedClawParried':
      a.clips.play('demonCrash', boss, 1.25);
      return true;
    case 'drownedRiptideTell':
      noise(a, { dur: v.tell, gain: 0.3 * boss, filter: 'bandpass', from: 1500, to: 300, q: 2 });
      tone(a, { from: 90, to: 44, dur: v.tell, gain: 0.26 * boss, type: 'triangle' });
      return true;
    case 'drownedRiptide':
      noise(a, { dur: v.riptideReach / v.riptideSpeed, gain: 0.3, filter: 'lowpass', from: 1700, to: 500 });
      splash(a, boss, 2.2);
      return true;
    case 'drownedMarked':
      tone(a, { from: 200, to: 70, dur: 0.5, gain: 0.3, type: 'sawtooth' });
      noise(a, { dur: 0.5, gain: 0.16, filter: 'lowpass', from: 700, to: 200 });
      return true;
    case 'drownedMawTell':
      a.clips.play('demonRoar', boss, 1.3);
      for (let i = 0; i < 5; i++) snap(a, boss * 0.8, i * 0.16);
      return true;
    case 'drownedMawOpen':
      noise(a, { dur: v.mawWindow, gain: 0.34, filter: 'bandpass', from: 400, to: 1900, q: 1.2 });
      tone(a, { from: 44, to: 76, dur: v.mawWindow, gain: 0.32, type: 'sawtooth' });
      return true;
    case 'drownedMawFlash':
      tone(a, { from: 1250, to: 1500, dur: v.mawFlash, gain: 0.3, type: 'triangle' });
      return true;
    case 'drownedMawJam':
      a.clips.play('demonCrash', boss, 0.8);
      tone(a, { from: 900, to: 220, dur: 0.5, gain: 0.3, type: 'square' });
      return true;
    case 'drownedMawBite':
      a.clips.play('demonCrash', boss);
      snap(a, 1);
      return true;
    case 'drownedWeep':
      noise(a, { dur: 0.6, gain: 0.16, filter: 'highpass', from: 1800, to: 3200 });
      return true;
    case 'drownedWalls':
      a.clips.play('demonCrash', 1);
      noise(a, { dur: v.showFlood + 0.5, gain: 0.36, filter: 'lowpass', from: 2400, to: 700 });
      return true;
    case 'drownedCrown':
      tone(a, { from: 46, to: 68, dur: v.showCrown, gain: 0.3, type: 'sawtooth' });
      noise(a, { dur: v.showCrown, gain: 0.12, filter: 'bandpass', from: 300, to: 900, q: 4 });
      return true;
    case 'drownedShowWave':
      a.clips.play('demonRoar', boss);
      return true;
    case 'geyserBurst':
      noise(a, { dur: 0.7, gain: 0.35 * far, filter: 'highpass', from: 1500, to: 4000 });
      splash(a, far, 1.4);
      return true;
    default:
      return false;
  }
}
