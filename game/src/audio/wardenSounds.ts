// Update 0.3.63 — Hellwarden's sounds: the library's roars and crashes, synth for the rest. Its whoosh is panned to the side it'll arrive on:
// listen for it (the Velociraptor's lesson). Last Verdict: one heartbeat in the silence, a rising note through its charge, a high one at the
// flash, and the cleave.
import type { CombatEvent } from '../sim/combat/state';
import { HELLWARDEN } from '../tuning/hellwarden';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playWarden(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  const boss = Math.max(0.45, far);
  const v = HELLWARDEN.v;
  const pan = a.pan;
  switch (kind) {
    case 'wardenFlare':
      tone(a, { from: 400, to: 1600, dur: v.tell, gain: 0.26 * boss, type: 'sawtooth', pan });
      return true;
    case 'wardenArc':
      noise(a, { dur: 0.4, gain: 0.5 * boss, filter: 'bandpass', from: 700, to: 2400, q: 0.9, pan });
      a.clips.play('slash', boss);
      return true;
    case 'wardenEmbers':
    case 'wardenVanish':
      noise(a, { dur: 0.3, gain: 0.3 * boss, filter: 'highpass', from: 1200, to: 3200 });
      return true;
    case 'wardenWhoosh':
      // Where it'll arrive: on your left, your right, or (flat in the middle) behind you.
      noise(a, { dur: v.lungeTell, gain: 0.6, filter: 'bandpass', from: 500, to: 2600, q: 1.6, pan });
      return true;
    case 'wardenThrust':
      a.clips.play('slash', 1);
      return true;
    case 'wardenParried':
    case 'wardenDisarmed':
      a.clips.play('hitHeavy', 1);
      return a.clips.play('demonRoar', boss, 1.4) || true;
    case 'wardenRaise':
      tone(a, { from: 70, to: 150, dur: v.tell, gain: 0.32 * boss, type: 'sawtooth' });
      return true;
    case 'wardenBrand':
      a.clips.play('demonSlam', boss);
      noise(a, { dur: v.brandWarn, gain: 0.26, filter: 'lowpass', from: 400, to: 1400 });
      return true;
    case 'wardenErupt':
      noise(a, { dur: 0.3, gain: 0.26 * far, filter: 'highpass', from: 700, to: 2400 });
      tone(a, { from: 90, to: 50, dur: 0.2, gain: 0.2 * far });
      return true;
    case 'wardenCall':
      a.clips.play('demonRoar', boss, 0.7);
      return true;
    case 'wardenEcho':
      tone(a, { from: 180, to: 60, dur: 0.6, gain: 0.26, type: 'sawtooth', pan });
      // Each its own, as it was.
      if (value === 2) noise(a, { dur: 0.7, gain: 0.34, filter: 'highpass', from: 2400, to: 6400, pan });
      return true;
    case 'wardenEchoHit':
      a.clips.play('demonSlam', far);
      return true;
    case 'wardenCross':
      tone(a, { from: 300, to: 900, dur: v.tell, gain: 0.2 * boss, type: 'square' });
      return true;
    case 'wardenThrow':
      noise(a, { dur: v.twinFor, gain: 0.26, filter: 'bandpass', from: 900, to: 1500, q: 3 });
      return true;
    case 'wardenFetched':
      tone(a, { from: 500, to: 1100, dur: 0.3, gain: 0.2 * boss, type: 'triangle' });
      return true;
    case 'wardenRoar':
      a.clips.play('demonRoar', 1);
      a.clips.play('demonCrash', 1, 0.7);
      noise(a, { dur: 1.6, gain: 0.34, filter: 'lowpass', from: 1200, to: 200 });
      return true;
    case 'wardenVerdict':
      // Silence, and one heartbeat.
      tone(a, { from: 66, to: 40, dur: 0.15, gain: 0.7, delay: v.verdictTell * 0.5 });
      tone(a, { from: 58, to: 36, dur: 0.18, gain: 0.55, delay: v.verdictTell * 0.5 + 0.2 });
      return true;
    case 'wardenCharge':
      tone(a, { from: 50, to: 240, dur: v.verdictWindow, gain: 0.34, type: 'sawtooth' });
      noise(a, { dur: v.verdictWindow, gain: 0.2, filter: 'lowpass', from: 200, to: 2600 });
      return true;
    case 'wardenFlash':
      tone(a, { from: 2000, to: 2600, dur: v.verdictFlash, gain: 0.34, type: 'triangle' });
      return true;
    case 'wardenShatter':
      a.clips.play('demonCrash', 1, 1.3);
      noise(a, { dur: 1, gain: 0.5, filter: 'highpass', from: 3000, to: 900 });
      return a.clips.play('demonRoar', 1, 1.5) || true;
    case 'wardenCleave':
      a.clips.play('demonCrash', 1);
      noise(a, { dur: 0.6, gain: 0.7, filter: 'bandpass', from: 400, to: 3000, q: 0.7 });
      return true;
    case 'wardenRift':
      a.clips.play('demonCrash', 1, 0.7);
      noise(a, { dur: v.showRift + 1, gain: 0.34, filter: 'lowpass', from: 300, to: 1100 });
      return true;
    case 'wardenStep':
      a.clips.play('demonSlam', 0.5, 0.8);
      return true;
    case 'wardenIgnite':
      noise(a, { dur: 1.2, gain: 0.4, filter: 'bandpass', from: 300, to: 2200, q: 0.8 });
      return true;
    case 'wardenShowBlow':
      a.clips.play('demonSlam', 1);
      a.clips.play('demonCrash', 1);
      return true;
    default:
      return false;
  }
}
