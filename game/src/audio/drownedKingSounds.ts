// Update 0.2.10 — the Drowned King's sounds (drownedSounds.ts passes its events here): the library's roar (the Demon's)
// as it takes its stance and as it rises for good (with the water rushing up), and its crash bursting up; placeholder
// synth for the rest — its dive's splash, the water bubbling where it'll come up, its undertow's pull, surfacing, its
// jet's hiss, its tidal wall's rumble and roll, its surf, its growl before a bite and its jaws, its geysers' rumble and
// burst.
import type { CombatEvent } from '../sim/combat/state';
import { DROWNED } from '../tuning/drowned';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** A big splash: a burst of filtered noise and a low thud. */
function splash(a: AudioEngine, far: number, big: number) {
  noise(a, { dur: 0.35 * big, gain: 0.32 * far * Math.min(1.5, big), filter: 'lowpass', from: 2600, to: 300 });
  tone(a, { from: 140 / big, to: 40, dur: 0.25 * big, gain: 0.3 * far });
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
      noise(a, { dur: v.lungeWarn, gain: 0.26 * boss, filter: 'bandpass', from: 300, to: 1600, q: 5 });
      tone(a, { from: 50, to: 120, dur: v.lungeWarn, gain: 0.25 * boss, type: 'sawtooth' });
      return true;
    case 'drownedRise':
      a.clips.play('demonCrash', boss);
      splash(a, boss, 2.6);
      return true;
    case 'drownedUndertow':
      noise(a, { dur: v.undertowTime, gain: 0.26 * boss, filter: 'bandpass', from: 1400, to: 250, q: 2 });
      tone(a, { from: 70, to: 45, dur: v.undertowTime, gain: 0.2 * boss, type: 'triangle' });
      return true;
    case 'drownedSurface':
      splash(a, boss, 1.8);
      return true;
    case 'drownedSpoutWindup':
      noise(a, { dur: v.spoutWindup, gain: 0.18 * boss, filter: 'bandpass', from: 300, to: 2400, q: 1.5 });
      return true;
    case 'drownedSpout':
      noise(a, { dur: v.spoutTime, gain: 0.34 * boss, filter: 'highpass', from: 1800, to: 3200 });
      tone(a, { from: 110, to: 90, dur: v.spoutTime, gain: 0.15 * boss, type: 'sawtooth' });
      return true;
    case 'drownedTideWindup':
      tone(a, { from: 40, to: 70, dur: v.tideWindup, gain: 0.35 * boss, type: 'sawtooth' });
      noise(a, { dur: v.tideWindup, gain: 0.2 * boss, filter: 'lowpass', from: 300, to: 1200 });
      return true;
    case 'drownedTide':
      noise(a, { dur: v.tideReach / v.tideSpeed, gain: 0.3, filter: 'lowpass', from: 1600, to: 500 });
      splash(a, boss, 2);
      return true;
    case 'drownedSurfWindup':
      tone(a, { from: 60, to: 130, dur: v.surfWindup, gain: 0.3 * boss, type: 'sawtooth' });
      return true;
    case 'drownedSurf':
      noise(a, { dur: 1.4, gain: 0.3 * boss, filter: 'bandpass', from: 600, to: 1500, q: 1.1 });
      return true;
    case 'drownedBiteWindup':
      tone(a, { from: 70, to: 130, dur: v.biteWindup, gain: 0.3 * boss, type: 'sawtooth' });
      return true;
    case 'drownedBite':
      tone(a, { from: 420, to: 120, dur: 0.1, gain: 0.4 * boss, type: 'square' });
      noise(a, { dur: 0.12, gain: 0.3 * boss, filter: 'highpass', from: 2000, to: 700 });
      return true;
    case 'drownedGeyserCall':
      tone(a, { from: 45, to: 80, dur: 0.9, gain: 0.35 * boss, type: 'sawtooth' });
      return true;
    case 'geyserBurst':
      noise(a, { dur: 0.7, gain: 0.35 * far, filter: 'highpass', from: 1500, to: 4000 });
      splash(a, far, 1.4);
      return true;
    default:
      return false;
  }
}
