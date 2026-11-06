// M1 — the sound engine's buses (layout from Last Ward): master → compressor → speakers, with SFX and music
// buses feeding the master. The context starts on the first click (browsers require a gesture).
// Update 0.1.17 — and the recorded clips start loading then (clips.ts), and the music the screens want plays
// (music.ts). `AudioEngine.current`: the game's (the screens wake it on the first click or key).
// Update 0.2.11 — under water (floor 6) the sounds are muffled: a low-pass between the SFX bus and the master.
import { ClipBank } from './clips';
import { MusicPlayer } from './music';
import { UNDERWATER } from '../tuning/underwater';

/** Out of the water the low-pass lets everything through (Hz); it eases between the two this fast (s). */
const OPEN = 20000;
const MUFFLE_EASE = 0.25;

export interface Volumes {
  master: number;
  sfx: number;
  music: number;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  sfx: GainNode | null = null;
  private master: GainNode | null = null;
  music: GainNode | null = null;
  private muffler: BiquadFilterNode | null = null;
  private muffled = false;
  /** Two seconds of white noise, shared by every noise-based sound. */
  noise: AudioBuffer | null = null;
  /** Update 0.3.60 — left (−1) to right (+1), the way the event being played came from as you face; and your right (flat, length 1). */
  pan = 0;
  rightX = 1;
  rightZ = 0;
  /** Update 0.1.17 — the recorded clips, the music, and the game's engine. */
  readonly clips = new ClipBank(this);
  readonly tracks = new MusicPlayer(this);
  static current: AudioEngine | null = null;

  constructor(private volumes: Volumes) {
    AudioEngine.current = this;
  }

  /** Call from a click or key press. Safe to call often. */
  resume() {
    if (!this.ctx) this.build();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private build() {
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 5;
    this.master = ctx.createGain();
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.muffler = ctx.createBiquadFilter();
    this.muffler.type = 'lowpass';
    this.muffler.frequency.value = OPEN;
    this.sfx.connect(this.muffler).connect(this.master);
    this.music = ctx.createGain();
    this.music.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    this.setVolumes(this.volumes);
    void this.clips.load();
    this.tracks.apply();
  }

  setVolumes(v: Volumes) {
    this.volumes = v;
    if (!this.ctx) return;
    this.master!.gain.value = v.master;
    this.sfx!.gain.value = v.sfx;
    this.music!.gain.value = v.music;
  }

  /** Update 0.2.11 — under water or not (cheap to call every frame). */
  /** Update 0.3.65 — everything ringing cut dead, and nothing heard for `secs` (the designer: "Hard cut to silence"). */
  hardCut(secs: number) {
    if (!this.ctx || !this.sfx) return;
    const now = this.ctx.currentTime;
    const g = this.sfx.gain;
    const back = g.value;
    g.cancelScheduledValues(now);
    g.setValueAtTime(back, now);
    g.linearRampToValueAtTime(0, now + 0.012);
    g.setValueAtTime(0, now + secs);
    g.linearRampToValueAtTime(back, now + secs + 0.02);
  }

  muffle(on: boolean) {
    if (!this.ctx || !this.muffler || on === this.muffled) return;
    this.muffled = on;
    this.muffler.frequency.setTargetAtTime(on ? UNDERWATER.v.muffle : OPEN, this.ctx.currentTime, MUFFLE_EASE);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
