// Update 0.2.11 — floor 6's sounds (the Sunken Grove's fish), made in code until recorded ones are picked (and muffled
// under water like everything: audio.ts): each warning its own (a Clownfish's chirp, a Tuna's rising hum as its tail
// beats, a click behind you as an Angelfish flashes, a Dolphin's whistle and the bubbles rising under you, the Prince's
// gurgle, the Manta's whoosh, the Shark's thrum, the Whale's deep breath) and their blows (nips, rams, bites, shakes,
// jets, a long moaning song, a crash). The Whale's roar is the library's (the Demon's), slowed.
import type { CombatEvent } from '../sim/combat/state';
import { WHALE } from '../tuning/whale';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** A thud through the water (`big` scales it). */
function thud(a: AudioEngine, far: number, big = 1) {
  tone(a, { from: 120 / big, to: 40, dur: 0.3 * big, gain: 0.35 * far });
  noise(a, { dur: 0.3 * big, gain: 0.25 * far, filter: 'lowpass', from: 1200, to: 150 });
}

/** A bite's snap. */
function snap(a: AudioEngine, far: number, low = 1) {
  tone(a, { from: 700 / low, to: 260 / low, dur: 0.06, gain: 0.3 * far, type: 'square' });
  noise(a, { dur: 0.08, gain: 0.2 * far, filter: 'highpass', from: 2500, to: 900 });
}

/** A rush of water (`dur` long). */
const rush = (a: AudioEngine, far: number, dur: number, gain = 0.25) => noise(a, { dur, gain: gain * far, filter: 'bandpass', from: 500, to: 1800, q: 1.2 });

/** Returns false for events it doesn't know. */
export function playFish(a: AudioEngine, kind: CombatEvent, _value: number, far: number): boolean {
  const boss = Math.max(0.45, far);
  switch (kind) {
    case 'clownWindup':
      tone(a, { from: 900, to: 1300, dur: 0.12, gain: 0.08 * far, type: 'triangle' });
      return true;
    case 'clownDart':
    case 'tunaCharge':
    case 'sharkLunge':
      rush(a, far, kind === 'clownDart' ? 0.18 : 0.4);
      return true;
    case 'clownBite':
    case 'angelBite':
      snap(a, far);
      return true;
    case 'tunaWindup':
      tone(a, { from: 90, to: 260, dur: 0.8, gain: 0.16 * far, type: 'sawtooth' });
      return true;
    case 'tunaRam':
    case 'dolphinHit':
      thud(a, far);
      return true;
    case 'tunaStun':
    case 'sharkStun':
      tone(a, { from: 300, to: 120, dur: 0.25, gain: 0.25 * far, type: 'triangle' });
      return true;
    case 'angelWindup':
      tone(a, { from: 1800, to: 1500, dur: 0.05, gain: 0.18 * far, type: 'square' });
      tone(a, { from: 1800, to: 1500, dur: 0.05, gain: 0.18 * far, type: 'square', delay: 0.12 });
      return true;
    case 'dolphinRise':
      tone(a, { from: 1400, to: 2600, dur: 0.25, gain: 0.12 * far, type: 'sine' });
      noise(a, { dur: 0.6, gain: 0.22 * far, filter: 'bandpass', from: 400, to: 1500, q: 5 });
      return true;
    case 'dolphinRam':
    case 'mantaGust':
      rush(a, far, 0.45, 0.32);
      return true;
    case 'princeWindup':
      noise(a, { dur: 0.8, gain: 0.18 * far, filter: 'bandpass', from: 300, to: 900, q: 4 });
      return true;
    case 'princeJet':
      noise(a, { dur: 1, gain: 0.28 * far, filter: 'bandpass', from: 1600, to: 900, q: 1.5 });
      return true;
    case 'princeGeysers':
      tone(a, { from: 60, to: 110, dur: 0.6, gain: 0.2 * far, type: 'sawtooth' });
      return true;
    case 'mantaShadow':
    case 'mantaGustWindup':
      noise(a, { dur: 0.9, gain: 0.22 * boss, filter: 'lowpass', from: 300, to: 900 });
      return true;
    case 'mantaDrop':
      thud(a, boss, 2);
      return true;
    case 'mantaBarbWindup':
      tone(a, { from: 500, to: 900, dur: 0.4, gain: 0.12 * far, type: 'square' });
      return true;
    case 'mantaBarb':
      noise(a, { dur: 0.15, gain: 0.3 * far, filter: 'highpass', from: 3000, to: 1200 });
      return true;
    case 'sharkWindup':
      tone(a, { from: 55, to: 80, dur: 0.5, gain: 0.3 * boss, type: 'sawtooth' });
      return true;
    case 'sharkBite':
    case 'sharkRoll':
      snap(a, boss, 1.6);
      thud(a, boss, 0.8);
      return true;
    case 'sharkShake':
      noise(a, { dur: 0.25, gain: 0.3 * boss, filter: 'lowpass', from: 1600, to: 200 });
      return true;
    case 'sharkFree':
      rush(a, boss, 0.3, 0.35);
      return true;
    default:
      return playWhale(a, kind, boss);
  }
}

function playWhale(a: AudioEngine, kind: CombatEvent, boss: number): boolean {
  const v = WHALE.v;
  switch (kind) {
    case 'whaleRoar':
      a.clips.play('demonRoar', boss, 0.6);
      tone(a, { from: 70, to: 40, dur: 2.2, gain: 0.3 * boss, type: 'sawtooth' });
      return true;
    case 'whaleRamWarn':
      tone(a, { from: 40, to: 95, dur: v.ramWarn, gain: 0.3 * boss, type: 'sawtooth' });
      return true;
    case 'whaleRam':
      rush(a, boss, 0.9, 0.4);
      return true;
    case 'whaleCrash':
    case 'whaleCrashDown':
      a.clips.play('demonCrash', boss);
      thud(a, boss, 2.5);
      return true;
    case 'whaleSongWindup':
    case 'whaleInhale':
      noise(a, { dur: kind === 'whaleInhale' ? v.inhaleWindup + v.inhaleTime : v.songWindup, gain: 0.25 * boss, filter: 'bandpass', from: 1200, to: 250, q: 1.5 });
      return true;
    case 'whaleSong':
      // (A long moan, falling and rising.)
      tone(a, { from: 180, to: 95, dur: 1.4, gain: 0.3 * boss, type: 'triangle' });
      tone(a, { from: 95, to: 230, dur: 1.2, gain: 0.22 * boss, type: 'triangle', delay: 1.2 });
      return true;
    case 'whaleSongHit':
    case 'whaleSwallow':
      thud(a, 1, 1.4);
      return true;
    case 'whaleBreach':
      rush(a, boss, v.breachRise, 0.3);
      return true;
    case 'whaleBreachWarn':
      tone(a, { from: 50, to: 130, dur: v.breachWarn, gain: 0.3 * boss, type: 'sawtooth' });
      return true;
    default:
      return false;
  }
}
