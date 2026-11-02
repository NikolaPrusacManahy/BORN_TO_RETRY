// Update 0.3.18 — the Moon's crew, heard: made in code until recorded ones are picked (the Sonniss library). Each
// warning its own: a gun charging (a rising whine), a Flanker's crouch (a sharp hiss: you hear it at your side), a
// Leaper's crouch (a spring winding), a pass's line (a falling beep), a Diver's spin (a whirr winding up), the Bee
// ship's bombing line (an alarm), the Bee mech's jets (a roar up). Their blows: blaster pew-pews, punches, a landing's
// thump, a ram, a mine's drop (a bleep), a salvo's whoosh, a mech's landing, Barbara climbing out (a hatch). A mine's
// and a bomb's blast are a keg's, smaller.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { kegBoom } from './soundLayers';
import { noise, tone } from './synth';

/** A blaster's pew. */
const pew = (a: AudioEngine, far: number, low = 1) => tone(a, { from: 1700 / low, to: 380 / low, dur: 0.13, gain: 0.16 * far, type: 'square' });

/** A thump on the moon dust (`big`: heavier). */
function thump(a: AudioEngine, far: number, big = 1) {
  tone(a, { from: 95 / big, to: 34, dur: 0.32 * big, gain: 0.42 * far });
  noise(a, { dur: 0.3 * big, gain: 0.22 * far, filter: 'lowpass', from: 900, to: 120 });
}

/** Returns false for events it doesn't know. */
export function playMoon(a: AudioEngine, kind: CombatEvent, _value: number, far: number): boolean {
  switch (kind) {
    case 'gunnerAim':
      tone(a, { from: 300, to: 1400, dur: 0.5, gain: 0.1 * far, type: 'sawtooth' });
      return true;
    case 'gunnerShot':
    case 'strafeShot':
      pew(a, far);
      return true;
    case 'beeShipShot':
      pew(a, far, 1.3);
      pew(a, far * 0.8, 1.15);
      return true;
    case 'gunnerWindup':
      noise(a, { dur: 0.2, gain: 0.12 * far, filter: 'bandpass', from: 600, to: 1200, q: 2 });
      return true;
    case 'gunnerKick':
    case 'flankerPunch':
      thump(a, far, 0.5);
      return true;
    case 'flankerCrouch':
      // Loud even off to your side: the warning you hear where you don't look.
      noise(a, { dur: 0.3, gain: 0.3 * Math.max(0.6, far), filter: 'highpass', from: 3200, to: 5200 });
      return true;
    case 'flankerDart':
      noise(a, { dur: 0.22, gain: 0.2 * far, filter: 'bandpass', from: 900, to: 2600, q: 1.2 });
      return true;
    case 'hopperCrouch':
      tone(a, { from: 120, to: 420, dur: 0.45, gain: 0.14 * far, type: 'triangle' });
      return true;
    case 'hopperLeap':
      noise(a, { dur: 0.35, gain: 0.18 * far, filter: 'lowpass', from: 1400, to: 300 });
      return true;
    case 'hopperLand':
      thump(a, far, 1.2);
      return true;
    case 'strafeLine':
      tone(a, { from: 1500, to: 900, dur: 0.18, gain: 0.12 * far, type: 'square' });
      tone(a, { from: 1500, to: 900, dur: 0.18, gain: 0.12 * far, type: 'square', delay: 0.22 });
      return true;
    case 'diverSpin':
      tone(a, { from: 200, to: 1200, dur: 0.5, gain: 0.12 * far, type: 'sawtooth' });
      return true;
    case 'diverRam':
      noise(a, { dur: 0.4, gain: 0.22 * far, filter: 'bandpass', from: 2400, to: 600, q: 1.5 });
      return true;
    case 'mineDrop':
      tone(a, { from: 900, to: 1200, dur: 0.08, gain: 0.12 * far, type: 'sine' });
      return true;
    case 'mineBlast':
      kegBoom(a);
      return true;
    case 'beeBombLine':
      for (let k = 0; k < 3; k++) tone(a, { from: 880, to: 660, dur: 0.16, gain: 0.18 * Math.max(0.5, far), type: 'square', delay: k * 0.2 });
      return true;
    case 'beeBombDrop':
      tone(a, { from: 1200, to: 300, dur: 0.5, gain: 0.1 * far, type: 'sine' });
      return true;
    case 'beeShipLow':
      tone(a, { from: 400, to: 120, dur: 0.8, gain: 0.16 * far, type: 'sawtooth' });
      return true;
    case 'beeMechJump':
      tone(a, { from: 80, to: 220, dur: 0.5, gain: 0.2 * far, type: 'sawtooth' });
      return true;
    case 'beeMechUp':
      noise(a, { dur: 0.9, gain: 0.3 * far, filter: 'lowpass', from: 600, to: 2400 });
      return true;
    case 'beeMissiles':
      for (let k = 0; k < 4; k++) noise(a, { dur: 0.3, gain: 0.16 * far, filter: 'bandpass', from: 1200, to: 3000, q: 2, delay: k * 0.06 });
      return true;
    case 'beeMechLand':
      thump(a, far, 1.6);
      return true;
    case 'beeEject':
      tone(a, { from: 600, to: 200, dur: 0.25, gain: 0.2 * far, type: 'square' });
      noise(a, { dur: 0.4, gain: 0.2 * far, filter: 'highpass', from: 1500, to: 4000, delay: 0.1 });
      return true;
    default:
      return false;
  }
}
