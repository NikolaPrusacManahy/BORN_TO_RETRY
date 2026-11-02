// Update 0.3.15 — Skull Cove's crew, heard: made in code until recorded ones are picked (the Sonniss library). Each
// warning its own: the Corsair's hook whirring round her head, the Shanty Man's lute (a note a beat, round a tune), the
// Bomber's fuse hissing, a skull popping off and rattling, a gull's cry, a bat's shriek, the sea surging where a
// Tentacle bursts out and its groan as it rears back, the sand rumbling where Mako comes up, Barbarossa cocking his
// pistol. Their blows: a rope's zip and a hook's clink, cutlass and cleaver swishes, a bomb batted back (a tock), coins
// snatched and spilling, the Tentacle's grip and your blows on it, slams, bites, a shot. A powder bomb's blast is a keg's, smaller.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { kegBoom } from './soundLayers';
import { noise, tone } from './synth';

/** A blade's swish. */
const swish = (a: AudioEngine, far: number, low = 1) => noise(a, { dur: 0.16, gain: 0.2 * far, filter: 'bandpass', from: 2400 / low, to: 900 / low, q: 1.5 });

/** A heavy thud on sand. */
function thud(a: AudioEngine, far: number, big = 1) {
  tone(a, { from: 110 / big, to: 38, dur: 0.3 * big, gain: 0.4 * far });
  noise(a, { dur: 0.35 * big, gain: 0.3 * far, filter: 'lowpass', from: 1600, to: 180 });
}

/** A bite's snap (`low`: bigger jaws). */
function snap(a: AudioEngine, far: number, low = 1) {
  tone(a, { from: 700 / low, to: 240 / low, dur: 0.07, gain: 0.3 * far, type: 'square' });
  noise(a, { dur: 0.09, gain: 0.22 * far, filter: 'highpass', from: 2500, to: 800 });
}

/** Bones clattering (`n` clicks). */
function rattle(a: AudioEngine, far: number, n: number) {
  for (let k = 0; k < n; k++) tone(a, { from: 1500 - k * 90, to: 1100 - k * 60, dur: 0.025, gain: 0.12 * far, type: 'square', delay: k * 0.045 });
}

/** Coins: `n` bright clinks. */
function coins(a: AudioEngine, far: number, n: number, down = false) {
  for (let k = 0; k < n; k++) {
    const f = down ? 3100 - k * 140 : 2500 + ((k * 397) % 700);
    tone(a, { from: f, to: f * 0.97, dur: 0.09, gain: 0.08 * far, type: 'triangle', delay: k * 0.05 });
  }
}

/** The Shanty Man's tune (a pentatonic run, Hz), a note a beat. */
const TUNE = [392, 440, 523, 587, 523, 440, 392, 330];
let note = 0;

/** Returns false for events it doesn't know. */
export function playCove(a: AudioEngine, kind: CombatEvent, _value: number, far: number): boolean {
  const mini = Math.max(0.45, far);
  switch (kind) {
    case 'hookTwirl':
      for (let k = 0; k < 3; k++) noise(a, { dur: 0.16, gain: 0.14 * far, filter: 'bandpass', from: 700, to: 1500, q: 3, delay: k * 0.24 });
      return true;
    case 'hookThrow':
      noise(a, { dur: 0.3, gain: 0.18 * far, filter: 'highpass', from: 1800, to: 4200 });
      return true;
    case 'hookCatch':
      tone(a, { from: 1300, to: 900, dur: 0.08, gain: 0.22, type: 'square' });
      thud(a, 0.6, 0.6);
      return true;
    case 'hookMiss':
      tone(a, { from: 700, to: 380, dur: 0.1, gain: 0.14 * far, type: 'square' });
      return true;
    case 'corsairWindup':
    case 'bomberWindup':
    case 'crewmanWindup':
    case 'headlessWindup':
    case 'makoWindup':
    case 'captainWindup':
      tone(a, { from: 140, to: 210, dur: 0.25, gain: 0.1 * far, type: 'sawtooth' });
      if (kind === 'bomberWindup') noise(a, { dur: 0.6, gain: 0.12 * far, filter: 'highpass', from: 5000, to: 3500 });
      if (kind === 'crewmanWindup' || kind === 'headlessWindup') rattle(a, far, 3);
      return true;
    case 'corsairStrike':
    case 'crewmanStrike':
    case 'headlessStrike':
    case 'shantyStrike':
      swish(a, far);
      return true;
    case 'bomberStrike':
    case 'makoStrike':
    case 'captainSweep':
      swish(a, kind === 'bomberStrike' ? far : mini, 1.4);
      return true;
    case 'shantyNote': {
      const f = TUNE[note++ % TUNE.length];
      tone(a, { from: f, to: f * 0.995, dur: 0.4, gain: 0.11 * far, type: 'triangle' });
      tone(a, { from: f * 1.5, to: f * 1.49, dur: 0.3, gain: 0.05 * far, type: 'triangle', delay: 0.02 });
      return true;
    }
    case 'bomberThrow':
      noise(a, { dur: 0.25, gain: 0.14 * far, filter: 'bandpass', from: 600, to: 1600, q: 1.5 });
      return true;
    case 'bombBatted':
      tone(a, { from: 950, to: 520, dur: 0.07, gain: 0.3, type: 'triangle' });
      thud(a, 0.5, 0.5);
      return true;
    case 'powderBlast':
      kegBoom(a);
      return true;
    case 'skullOff':
      tone(a, { from: 480, to: 950, dur: 0.07, gain: 0.2 * far, type: 'square' });
      rattle(a, far, 6);
      return true;
    case 'gullDive':
    case 'gullEscape':
      tone(a, { from: 1500, to: 1050, dur: 0.22, gain: (kind === 'gullEscape' ? 0.06 : 0.11) * far, type: 'sawtooth' });
      tone(a, { from: 1350, to: 900, dur: 0.3, gain: (kind === 'gullEscape' ? 0.05 : 0.09) * far, type: 'sawtooth', delay: 0.18 });
      return true;
    case 'gullSteal':
      coins(a, 1, 5);
      return true;
    case 'gullDrop':
      coins(a, far, 7, true);
      return true;
    case 'batDive':
      tone(a, { from: 3200, to: 4300, dur: 0.12, gain: 0.06 * far, type: 'square' });
      return true;
    case 'batBite':
      snap(a, far, 0.7);
      return true;
    case 'tentacleRise':
    case 'tentacleSink':
      noise(a, { dur: 0.9, gain: 0.3 * mini, filter: 'lowpass', from: kind === 'tentacleRise' ? 300 : 1400, to: kind === 'tentacleRise' ? 1400 : 250 });
      tone(a, { from: 60, to: 45, dur: 0.8, gain: 0.2 * mini });
      return true;
    case 'tentacleWindup':
      tone(a, { from: 75, to: 55, dur: 1, gain: 0.2 * mini, type: 'sawtooth' });
      return true;
    case 'tentacleSlam':
      thud(a, mini, 1.6);
      noise(a, { dur: 0.5, gain: 0.25 * mini, filter: 'bandpass', from: 900, to: 300, q: 1 });
      return true;
    case 'tentacleGrab':
      noise(a, { dur: 0.5, gain: 0.35, filter: 'lowpass', from: 400, to: 1800 });
      tone(a, { from: 90, to: 140, dur: 0.35, gain: 0.3, type: 'sawtooth' });
      return true;
    case 'tentacleQteHit':
      tone(a, { from: 220, to: 120, dur: 0.08, gain: 0.3, type: 'square' });
      noise(a, { dur: 0.08, gain: 0.2, filter: 'lowpass', from: 1200, to: 300 });
      return true;
    case 'tentacleFree':
      tone(a, { from: 160, to: 60, dur: 0.6, gain: 0.3, type: 'sawtooth' });
      return true;
    case 'makoDive':
      noise(a, { dur: 0.35, gain: 0.25 * mini, filter: 'bandpass', from: 1800, to: 500, q: 1 });
      return true;
    case 'makoRise':
      tone(a, { from: 45, to: 95, dur: 0.65, gain: 0.3 * mini, type: 'sawtooth' });
      noise(a, { dur: 0.65, gain: 0.2 * mini, filter: 'lowpass', from: 300, to: 900 });
      return true;
    case 'makoBite':
      snap(a, mini, 2);
      thud(a, mini, 1.3);
      return true;
    case 'makoCharge':
      tone(a, { from: 95, to: 60, dur: 0.6, gain: 0.25 * mini, type: 'sawtooth' });
      noise(a, { dur: 0.5, gain: 0.18 * mini, filter: 'bandpass', from: 500, to: 1200, q: 1 });
      return true;
    case 'captainAim':
      tone(a, { from: 2200, to: 1800, dur: 0.03, gain: 0.16 * mini, type: 'square' });
      tone(a, { from: 1700, to: 1300, dur: 0.04, gain: 0.16 * mini, type: 'square', delay: 0.09 });
      return true;
    case 'captainShot':
      noise(a, { dur: 0.3, gain: 0.45 * mini, filter: 'bandpass', from: 2400, to: 400, q: 0.7 });
      tone(a, { from: 160, to: 55, dur: 0.22, gain: 0.35 * mini });
      return true;
    default:
      return false;
  }
}
