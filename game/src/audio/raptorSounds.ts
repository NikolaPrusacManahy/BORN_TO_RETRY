// Update 0.2.8 — the Velociraptor's sounds (desertSounds.ts passes its events here): recorded clips where the library has them, synth for
// the rest.
// Update 0.3.60 — by the Boss Design Bible, "Trust your ears": its tells are sounds, and those that say where it is are panned left and
// right (a.pan: where the event was, as you face). Its hiss, sharp and rising, is what tells a real pounce from a feint's silent crouch;
// its clicks, quicker and louder as it comes; its heart in the dark, its eyes' sting.
import type { CombatEvent } from '../sim/combat/state';
import { DINO } from '../tuning/dino';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

export function playRaptor(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  const boss = Math.max(0.45, far);
  const v = DINO.v;
  const pan = a.pan;
  switch (kind) {
    case 'dinoWindup':
      tone(a, { from: 70, to: 120, dur: 0.6, gain: 0.18 * boss, type: 'sawtooth', pan });
      return true;
    case 'dinoCharge':
      return a.clips.play('demonCharge', boss) || true;
    case 'dinoCrash':
      return a.clips.play('demonCrash', boss) || true;
    case 'dinoScrape':
      noise(a, { dur: 0.22, gain: 0.45 * boss, filter: 'bandpass', from: 1200, to: 400, q: 1.4, pan });
      return true;
    case 'dinoHiss': {
      // Sharp, rising to its peak: dodge as it peaks.
      const long = value === 1 ? v.feintHiss : value === 2 ? v.showHiss * 0.8 : v.tell;
      noise(a, { dur: long, gain: 0.46 * boss, filter: 'highpass', from: 2400, to: 6400, pan });
      noise(a, { dur: 0.1, gain: 0.5 * boss, filter: 'highpass', from: 5200, to: 7600, delay: long - 0.1, pan });
      return true;
    }
    case 'dinoClick': {
      // Two dry taps, louder as it comes.
      const loud = 0.28 + 0.5 * value;
      for (let i = 0; i < 2; i++) {
        tone(a, { from: 2100, to: 1400, dur: 0.028, gain: loud, type: 'square', delay: i * 0.06, pan });
        noise(a, { dur: 0.025, gain: loud * 0.8, filter: 'highpass', from: 3600, to: 5200, delay: i * 0.06, pan });
      }
      return true;
    }
    case 'dinoFlick':
      noise(a, { dur: 0.12, gain: 0.36 * boss, filter: 'bandpass', from: 1500, to: 600, q: 1.5, delay: v.tell * 0.4, pan });
      return true;
    case 'dinoTail':
      noise(a, { dur: v.tailSpin, gain: 0.42 * boss, filter: 'bandpass', from: 500, to: 1800, q: 1.1, pan });
      return true;
    case 'dinoBark':
      tone(a, { from: 520, to: 260, dur: 0.18, gain: 0.34 * boss, type: 'sawtooth', pan });
      noise(a, { dur: 0.15, gain: 0.2 * boss, filter: 'bandpass', from: 900, to: 500, q: 2, pan });
      return true;
    case 'dinoPackIn':
      a.clips.play('leaperWindup', boss, 1.2);
      return true;
    case 'dinoFeint':
      // (Only feet: no hiss.)
      noise(a, { dur: 0.2, gain: 0.26 * boss, filter: 'lowpass', from: 700, to: 200, pan });
      return true;
    case 'dinoSprint':
    case 'dinoPounce':
    case 'pinTwist':
    case 'pinDone':
      noise(a, { dur: 0.35, gain: 0.35 * boss, filter: 'bandpass', from: 400, to: 1400, q: 1.2, pan });
      return true;
    case 'dinoEmerge':
      a.clips.play('leaperWindup', Math.max(0.7, far), 0.8);
      tone(a, { from: 900, to: 1500, dur: 0.2, gain: 0.3, type: 'sawtooth', pan });
      return true;
    case 'dinoTrip':
      a.clips.play('hitHeavy', boss);
      return a.clips.play('demonRoar', boss * 0.6, 1.4) || true;
    case 'dinoSkid':
      noise(a, { dur: v.skidOpen * 0.3, gain: 0.4 * boss, filter: 'lowpass', from: 1400, to: 300, pan });
      return true;
    case 'dinoLand':
      return a.clips.play('demonSlam', boss) || true;
    case 'dinoDark':
      tone(a, { from: 120, to: 30, dur: v.apexTell, gain: 0.42, type: 'sawtooth' });
      noise(a, { dur: v.apexTell, gain: 0.2, filter: 'lowpass', from: 1500, to: 120 });
      return true;
    case 'dinoHeart':
      tone(a, { from: 72, to: 46, dur: 0.13, gain: 0.46 + 0.2 * value });
      tone(a, { from: 62, to: 40, dur: 0.15, gain: 0.34 + 0.2 * value, delay: 0.17 });
      return true;
    case 'dinoEyes':
      tone(a, { from: 1500, to: 2200, dur: v.apexFlash, gain: 0.3, type: 'sawtooth', pan });
      a.clips.play('dragonScream', 0.7, 1.5);
      return true;
    case 'dinoBlinded':
      a.clips.play('hitHeavy', 1);
      return a.clips.play('demonRoar', 1, 1.5) || true;
    case 'dinoSand':
      noise(a, { dur: v.showHigh, gain: 0.26, filter: 'bandpass', from: 500, to: 1100, q: 0.8 });
      return true;
    case 'dinoShowLand':
      a.clips.play('demonSlam', 1);
      noise(a, { dur: 0.8, gain: 0.34, filter: 'lowpass', from: 1500, to: 300 });
      return true;
    case 'pinFree':
      a.clips.play('hitHeavy', boss);
      return a.clips.play('demonRoar', boss * 0.6, 1.4) || true;
    case 'dinoPin':
      a.clips.play('execLand', 1);
      return a.clips.play('demonRoar', 0.8, 1.2) || true;
    case 'pinCue':
      tone(a, { from: 300, to: 700, dur: DINO.v.pinCue, gain: 0.12, type: 'triangle' });
      return true;
    case 'pinWasted':
      tone(a, { from: 140, to: 90, dur: 0.15, gain: 0.15, type: 'square' });
      return true;
    case 'pinSnap':
      return a.clips.play('bite', 0.5, 1.3) || true;
    case 'pinBite':
      return a.clips.play('bite', 1) || true;
    case 'dinoRoar':
      return a.clips.play('demonRoar', boss) || true;
    default:
      return false;
  }
}
