// Update 0.3.16 — the Big Shark, heard: made in code until recorded ones are picked (the Sonniss library). Its show: the
// sea pouring in and rumbling up the walls, the leap out of the water and the crash back in. Its warnings: a deep thrum
// as it lines up, a swish as it passes, its jaws creaking wide. Its blows: a huge snap, the tail's slap, a crunch into a
// wall. In its jaws: your shoves forcing them, your punch to its throat, or the gulp. Your escape: a rush of water.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** A rush of water (`dur` long). */
const rush = (a: AudioEngine, gain: number, dur: number, from = 500, to = 1800) => noise(a, { dur, gain, filter: 'bandpass', from, to, q: 1.2 });

/** Its jaws snapping shut (`big`: louder, lower). */
function snap(a: AudioEngine, far: number, big = 1) {
  tone(a, { from: 420 / big, to: 120 / big, dur: 0.12, gain: 0.4 * far, type: 'square' });
  noise(a, { dur: 0.18, gain: 0.35 * far, filter: 'highpass', from: 2200, to: 600 });
  tone(a, { from: 90, to: 40, dur: 0.3, gain: 0.35 * far });
}

/** Returns false for events it doesn't know. */
export function playShark(a: AudioEngine, kind: CombatEvent, _value: number, far: number): boolean {
  const boss = Math.max(0.5, far);
  switch (kind) {
    case 'bigSharkFlood':
      noise(a, { dur: 4, gain: 0.35, filter: 'lowpass', from: 300, to: 1100 });
      tone(a, { from: 45, to: 70, dur: 4, gain: 0.3 });
      return true;
    case 'bigSharkBreach':
      rush(a, 0.6, 0.9, 400, 2600);
      tone(a, { from: 70, to: 35, dur: 0.9, gain: 0.4 });
      return true;
    case 'bigSharkSplash':
      noise(a, { dur: 1.4, gain: 0.6, filter: 'lowpass', from: 2200, to: 200 });
      tone(a, { from: 80, to: 30, dur: 0.8, gain: 0.5 });
      return true;
    case 'bigSharkDrain':
      noise(a, { dur: 2.5, gain: 0.25, filter: 'lowpass', from: 900, to: 150 });
      return true;
    case 'bigSharkLunge':
    case 'bigSharkJaws':
      tone(a, { from: 55, to: 40, dur: kind === 'bigSharkJaws' ? 1.3 : 0.9, gain: 0.35 * boss, type: 'sawtooth' });
      if (kind === 'bigSharkJaws') tone(a, { from: 160, to: 90, dur: 1.2, gain: 0.12 * boss, type: 'square' });
      return true;
    case 'bigSharkPass':
    case 'bigSharkCharge':
      rush(a, 0.35 * boss, kind === 'bigSharkCharge' ? 0.8 : 0.5);
      return true;
    case 'bigSharkSnapWindup':
    case 'bigSharkTailWindup':
      tone(a, { from: 120, to: 200, dur: 0.3, gain: 0.15 * boss, type: 'triangle' });
      return true;
    case 'bigSharkSnap':
    case 'bigSharkBite':
      snap(a, boss, kind === 'bigSharkBite' ? 1.3 : 1);
      return true;
    case 'bigSharkTail':
      noise(a, { dur: 0.25, gain: 0.4 * boss, filter: 'bandpass', from: 900, to: 300, q: 1 });
      return true;
    case 'bigSharkEscape':
      rush(a, 0.3, 0.3, 900, 2600);
      return true;
    case 'bigSharkFumble':
      tone(a, { from: 300, to: 200, dur: 0.12, gain: 0.12, type: 'square' });
      return true;
    case 'bigSharkCatch':
      snap(a, 1, 1.6);
      rush(a, 0.4, 0.6);
      return true;
    case 'bigSharkPry':
      tone(a, { from: 140, to: 110, dur: 0.1, gain: 0.22, type: 'sawtooth' });
      noise(a, { dur: 0.08, gain: 0.12, filter: 'lowpass', from: 900, to: 300 });
      return true;
    case 'bigSharkThroat':
      tone(a, { from: 160, to: 50, dur: 0.35, gain: 0.55 });
      noise(a, { dur: 0.3, gain: 0.4, filter: 'lowpass', from: 1400, to: 200 });
      return true;
    case 'bigSharkGulp':
      snap(a, 1, 2);
      tone(a, { from: 60, to: 25, dur: 1, gain: 0.5 });
      return true;
    case 'bigSharkStuck':
      noise(a, { dur: 0.4, gain: 0.45 * boss, filter: 'lowpass', from: 1600, to: 200 });
      tone(a, { from: 110, to: 40, dur: 0.4, gain: 0.4 * boss });
      return true;
    case 'bigSharkFrenzy':
      tone(a, { from: 40, to: 80, dur: 1.2, gain: 0.4 * boss, type: 'sawtooth' });
      rush(a, 0.3 * boss, 1.2, 200, 900);
      return true;
    default:
      return false;
  }
}
