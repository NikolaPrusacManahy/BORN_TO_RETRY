// M1 — placeholder movement sounds: jumps, landings, dashes, the slide scrape, slams and pads. M1 step 8 — and
// getting hurt and dying.
import type { MoveEvent } from '../sim/player/state';
import type { AudioEngine } from './audio';
import { NoiseLoop, noise, tone } from './synth';

/** The ground slam's landing thud (Update 0.1.8 — also an execution's smash, execSounds.ts). */
export function slamThud(a: AudioEngine) {
  tone(a, { from: 95, to: 28, dur: 0.32, gain: 0.8 });
  noise(a, { dur: 0.22, gain: 0.45, filter: 'lowpass', from: 1400, to: 120 });
}

export class MoveSounds {
  private slide: NoiseLoop;
  private wallRun: NoiseLoop;

  constructor(private a: AudioEngine) {
    this.slide = new NoiseLoop(a, 900);
    this.wallRun = new NoiseLoop(a, 1600);
  }

  play(kind: MoveEvent, value: number) {
    const a = this.a;
    switch (kind) {
      case 'jump':
      case 'slideJump':
      case 'dashJump':
        tone(a, { from: 230, to: 430, dur: 0.07, gain: 0.12 });
        noise(a, { dur: 0.08, gain: 0.12, filter: 'highpass', from: 1500, to: 3500 });
        break;
      case 'wallRunStart':
        noise(a, { dur: 0.08, gain: 0.18, filter: 'bandpass', from: 1200, to: 700, q: 1.5 });
        break;
      case 'wallJump':
      case 'wallRunJump':
        tone(a, { from: 300, to: 560, dur: 0.07, gain: 0.13 });
        noise(a, { dur: 0.05, gain: 0.2, filter: 'bandpass', from: 2500, to: 1800, q: 2 });
        break;
      case 'slamBounce':
        tone(a, { from: 180, to: 620, dur: 0.12, gain: 0.18, type: 'triangle' });
        break;
      case 'pad':
        tone(a, { from: 160, to: 900, dur: 0.28, gain: 0.2, type: 'triangle' });
        break;
      case 'land': {
        if (value < 3) break;
        const k = Math.min(1, value / 30);
        tone(a, { from: 130, to: 45, dur: 0.12, gain: 0.25 + 0.35 * k });
        noise(a, { dur: 0.06, gain: 0.1 + 0.2 * k, filter: 'lowpass', from: 900, to: 200 });
        break;
      }
      case 'dash':
        noise(a, { dur: 0.2, gain: 0.35, filter: 'bandpass', from: 600, to: 2600, q: 1.2 });
        break;
      case 'slam':
        noise(a, { dur: 0.25, gain: 0.25, filter: 'bandpass', from: 2400, to: 300, q: 1.5 });
        break;
      case 'slamLand':
        slamThud(a);
        break;
      case 'hurt':
        tone(a, { from: 210, to: 70, dur: 0.16, gain: 0.45, type: 'square' });
        noise(a, { dur: 0.12, gain: 0.35, filter: 'lowpass', from: 2200, to: 300 });
        break;
      // Update 0.0.13 — a hit on the shield rings like plate; losing it cracks.
      case 'shieldHit':
        tone(a, { from: 1250, to: 900, dur: 0.18, gain: 0.18, type: 'triangle' });
        noise(a, { dur: 0.08, gain: 0.25, filter: 'highpass', from: 4000, to: 2000 });
        break;
      case 'shieldBreak':
        noise(a, { dur: 0.3, gain: 0.4, filter: 'highpass', from: 6000, to: 1200 });
        tone(a, { from: 700, to: 180, dur: 0.25, gain: 0.15, type: 'square' });
        break;
      // Update 0.0.20 — a burst of steam and a roar of fire as the lava takes you.
      case 'lavaBurn':
        noise(a, { dur: 0.6, gain: 0.5, filter: 'highpass', from: 3000, to: 900 });
        tone(a, { from: 140, to: 40, dur: 0.5, gain: 0.5, type: 'sawtooth' });
        break;
      case 'death':
        tone(a, { from: 110, to: 22, dur: 0.9, gain: 0.8, type: 'sawtooth' });
        noise(a, { dur: 0.7, gain: 0.4, filter: 'lowpass', from: 900, to: 60 });
        break;
      default:
        break;
    }
  }

  /** Every frame: the scrape is on while sliding on the ground. */
  setSliding(on: boolean) {
    this.slide.setLevel(on ? 0.16 : 0);
  }

  /** Every frame: a lighter, brighter scrape while wall running. */
  setWallRunning(on: boolean) {
    this.wallRun.setLevel(on ? 0.1 : 0);
  }
}
