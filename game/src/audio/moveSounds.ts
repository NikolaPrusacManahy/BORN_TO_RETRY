// M1 — placeholder movement sounds: jumps, landings, dashes, the slide scrape, slams and pads.
import type { MoveEvent } from '../sim/player/state';
import type { AudioEngine } from './audio';
import { NoiseLoop, noise, tone } from './synth';

export class MoveSounds {
  private slide: NoiseLoop;

  constructor(private a: AudioEngine) {
    this.slide = new NoiseLoop(a, 900);
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
      case 'wallJump':
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
        tone(a, { from: 95, to: 28, dur: 0.32, gain: 0.8 });
        noise(a, { dur: 0.22, gain: 0.45, filter: 'lowpass', from: 1400, to: 120 });
        break;
      default:
        break;
    }
  }

  /** Every frame: the scrape is on while sliding on the ground. */
  setSliding(on: boolean) {
    this.slide.setLevel(on ? 0.16 : 0);
  }
}
