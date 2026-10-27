// M1 — the sound engine's buses (layout from Last Ward): master → compressor → speakers, with SFX and music
// buses feeding the master. The context starts on the first click (browsers require a gesture).

export interface Volumes {
  master: number;
  sfx: number;
  music: number;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  sfx: GainNode | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  /** Two seconds of white noise, shared by every noise-based sound. */
  noise: AudioBuffer | null = null;

  constructor(private volumes: Volumes) {}

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
    this.sfx.connect(this.master);
    this.music = ctx.createGain();
    this.music.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    this.setVolumes(this.volumes);
  }

  setVolumes(v: Volumes) {
    this.volumes = v;
    if (!this.ctx) return;
    this.master!.gain.value = v.master;
    this.sfx!.gain.value = v.sfx;
    this.music!.gain.value = v.music;
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
