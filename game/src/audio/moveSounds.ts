// M1 — placeholder movement sounds: jumps, landings, dashes, slams and pads (Update 0.3.20 — the slide's scrape gone
// with it). M1 step 8 — and
// getting hurt and dying.
// Update 0.1.17 — the landing from the designer's recording (clips.ts; louder the harder).
// (Footsteps came and went: the designer, "no need in this game". Update 0.3.75 — but the Playable Demon's bible asks for its own, low and heavy: only it has any.)
// Batch 5: every other move a clip first (MOVE_CLIPS: the jumps share one, as do the wall jumps), the made sound without.
import type { MoveEvent } from '../sim/player/state';
import type { ClipSound } from './clipPicks';
import { DEMON } from '../tuning/demon';
import { SOUND } from '../tuning/sound';
import type { AudioEngine } from './audio';
import { NoiseLoop, noise, tone } from './synth';

/** The ground slam's landing thud (Update 0.1.8 — also an execution's smash, execSounds.ts). */
export function slamThud(a: AudioEngine) {
  tone(a, { from: 95, to: 28, dur: 0.32, gain: 0.8 });
  noise(a, { dur: 0.22, gain: 0.45, filter: 'lowpass', from: 1400, to: 120 });
}

/** Update 0.1.17 — the clip each move plays, if it has one picked. */
const MOVE_CLIPS: Partial<Record<MoveEvent, ClipSound>> = {
  jump: 'jump',
  dashJump: 'jump',
  wallJump: 'wallJump',
  wallRunJump: 'wallJump',
  dash: 'dash',
  slam: 'slam',
  pad: 'pad',
  hurt: 'hurt',
  shieldHit: 'shieldHit',
  shieldBreak: 'shieldBreak',
  death: 'death',
  lavaBurn: 'lavaBurn',
};

/** Update 0.3.75 — the Demon's sword's forge hiss at this heat (0 … 1): nothing when it's cold, rising fast as it nears full. */
export const forgeLevel = (heat: number) => DEMON.v.hissVolume * heat * heat;

export class MoveSounds {
  private wallRun: NoiseLoop;
  /** Update 0.3.75 — high and thin: a hiss. */
  private forge: NoiseLoop;

  constructor(private a: AudioEngine) {
    this.wallRun = new NoiseLoop(a, 1600);
    this.forge = new NoiseLoop(a, 9000);
  }

  play(kind: MoveEvent, value: number) {
    const a = this.a;
    const clip = MOVE_CLIPS[kind];
    if (clip && a.clips.play(clip)) return;
    switch (kind) {
      case 'jump':
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
      // Update 0.3.75 — the landing, lower: the Demon's step. Made, if there's no recording.
      case 'demonStep': {
        const v = DEMON.v;
        if (a.clips.play('land', v.stepVolume, v.stepPitch)) break;
        tone(a, { from: 75, to: 38, dur: 0.12, gain: v.stepVolume });
        noise(a, { dur: 0.07, gain: v.stepVolume * 0.4, filter: 'lowpass', from: 500, to: 120 });
        break;
      }
      case 'land': {
        if (value < 3) break;
        const k = Math.min(1, value / 30);
        if (a.clips.play('land', SOUND.v.landVolume * (0.35 + 0.65 * k))) break;
        tone(a, { from: 130, to: 45, dur: 0.12, gain: 0.25 + 0.35 * k });
        noise(a, { dur: 0.06, gain: 0.1 + 0.2 * k, filter: 'lowpass', from: 900, to: 200 });
        break;
      }
      case 'dash':
        noise(a, { dur: 0.2, gain: 0.35, filter: 'bandpass', from: 600, to: 2600, q: 1.2 });
        break;
      // Update 0.2.11 — under water: a kick's push of water and its bubbles; pushing off the floor.
      case 'swimKick':
        noise(a, { dur: 0.32, gain: 0.4, filter: 'lowpass', from: 900, to: 180 });
        for (let i = 0; i < 4; i++) tone(a, { from: 260 + i * 70, to: 520 + i * 90, dur: 0.06, gain: 0.08, delay: 0.05 + i * 0.05 });
        break;
      case 'swimPush':
        noise(a, { dur: 0.22, gain: 0.25, filter: 'lowpass', from: 600, to: 150 });
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
      // Update 0.3.14 — into floor 6's sea: a heavy splash, then under.
      case 'seaFall':
        noise(a, { dur: 0.7, gain: 0.5, filter: 'bandpass', from: 1800, to: 300, q: 0.7 });
        tone(a, { from: 120, to: 50, dur: 0.4, gain: 0.35 });
        break;
      case 'death':
        tone(a, { from: 110, to: 22, dur: 0.9, gain: 0.8, type: 'sawtooth' });
        noise(a, { dur: 0.7, gain: 0.4, filter: 'lowpass', from: 900, to: 60 });
        break;
      default:
        break;
    }
  }

  /** Every frame: a lighter, brighter scrape while wall running. */
  setWallRunning(on: boolean) {
    this.wallRun.setLevel(on ? 0.1 : 0);
  }

  /** Update 0.3.75 — every frame: how hot the Demon's sword is (0: silent). */
  setForge(heat: number) {
    this.forge.setLevel(forgeLevel(heat));
  }
}
