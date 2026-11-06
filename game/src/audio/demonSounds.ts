// Update 0.3.72 — the Playable Demon's fire, heard: from the recordings already in the game (the boss's own), and made sounds under them.
// Returns true if `kind` is one of its.
import type { AudioEngine } from './audio';
import type { CombatEvent } from '../sim/combat/state';
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
    default:
      return false;
  }
}
