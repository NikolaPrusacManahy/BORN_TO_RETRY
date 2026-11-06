// Update 0.3.72 — the Playable Demon's fire, heard: from the recordings already in the game (the boss's own), and made sounds under them.
// Returns true if `kind` is one of its.
// Update 0.3.73 — its sword thrown, called back and caught; its heat at full; Last Verdict: a hard cut to silence, the boss's own heartbeat, the cleave.
import type { AudioEngine } from './audio';
import type { CombatEvent } from '../sim/combat/state';
import { DEMON } from '../tuning/demon';
import { noise, tone } from './synth';

export function playDemon(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'demonWall':
      a.clips.play('hellSizzle', 0.6);
      noise(a, { dur: 0.4, gain: 0.2, filter: 'lowpass', from: 2400, to: 500 });
      return true;
    case 'emberWave':
      a.clips.play('hellWhoosh', 1, 0.95);
      return true;
    case 'emberPop':
      noise(a, { dur: 0.3, gain: 0.3 * far, filter: 'highpass', from: 700, to: 2400 });
      return true;
    case 'demonLunge':
      a.clips.play('hellWhoosh', 0.75, 1.7);
      return true;
    case 'demonLungeEnd':
      return true;
    case 'demonBrand':
      a.clips.play('demonSlam', value === 1 ? 1 : 0.85);
      noise(a, { dur: 0.3, gain: 0.26, filter: 'lowpass', from: 400, to: 1400 });
      return true;
    case 'demonErupt':
      noise(a, { dur: 0.3, gain: 0.26 * far, filter: 'highpass', from: 700, to: 2400 });
      tone(a, { from: 90, to: 50, dur: 0.2, gain: 0.2 * far });
      return true;
    case 'heatFull':
      a.clips.play('hellSizzle', 0.7, 1.15);
      tone(a, { from: 320, to: 960, dur: 0.4, gain: 0.1, type: 'triangle' });
      return true;
    case 'bladeThrown':
      a.clips.play('hellWhoosh', 0.85, 1.2);
      return true;
    case 'bladeStuck':
      a.clips.play('hellClamp', 0.8 * far, 1.2);
      return true;
    case 'bladeRecall':
      a.clips.play('hellWhoosh', 0.75, 1.55);
      tone(a, { from: 300, to: 780, dur: 0.3, gain: 0.08, type: 'triangle' });
      return true;
    case 'bladeCaught':
      a.clips.play('hellClamp', 0.9, 1.35);
      return true;
    case 'bladeBlink':
      a.clips.play('hellSnap', 1);
      noise(a, { dur: 0.25, gain: 0.3, filter: 'highpass', from: 1200, to: 4200 });
      return true;
    case 'demonVerdict': {
      // Silence, and one heartbeat. (The cut mutes all it covers, so it's over before the beat.)
      const beat = DEMON.v.verdictWindup * 0.45;
      a.hardCut(beat * 0.8);
      tone(a, { from: 66, to: 40, dur: 0.15, gain: 0.7, delay: beat });
      tone(a, { from: 58, to: 36, dur: 0.18, gain: 0.55, delay: beat + 0.2 });
      return true;
    }
    case 'demonCleave':
      a.clips.play('demonCrash', 1);
      a.clips.play('hellBoom', 1);
      noise(a, { dur: 0.6, gain: 0.7, filter: 'bandpass', from: 400, to: 3000, q: 0.7 });
      return true;
    default:
      return false;
  }
}
