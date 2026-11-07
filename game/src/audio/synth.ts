// M1 — placeholder sounds made in code (no files yet): pitch-swept tones and filtered noise. Real samples
// replace them in M4; until then movement still needs to sound like something.
// Update 0.2.4 — either can start a moment later (`delay`, s): a sound in beats.
import type { AudioEngine } from './audio';

interface Tone {
  from: number;
  to: number;
  dur: number;
  gain: number;
  type?: OscillatorType;
  delay?: number;
  /** Update 0.3.60 — left (−1) to right (+1): for a sound that says where something is. */
  pan?: number;
}

interface Noise {
  dur: number;
  gain: number;
  filter: BiquadFilterType;
  from: number;
  to: number;
  q?: number;
  delay?: number;
  /** Update 0.3.60 — left (−1) to right (+1). */
  pan?: number;
}

/** Into the mix, panned if it's asked for. */
function out(a: AudioEngine, g: AudioNode, pan: number | undefined) {
  if (!pan || !a.ctx) {
    g.connect(a.sfx!);
    return;
  }
  const p = a.ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  g.connect(p).connect(a.sfx!);
}

export function tone(a: AudioEngine, t: Tone) {
  const ctx = a.ctx;
  if (!ctx || !a.sfx) return;
  const now = ctx.currentTime + (t.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = t.type ?? 'sine';
  osc.frequency.setValueAtTime(t.from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), now + t.dur);
  g.gain.setValueAtTime(t.gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + t.dur);
  osc.connect(g);
  out(a, g, t.pan);
  osc.start(now);
  osc.stop(now + t.dur + 0.02);
}

export function noise(a: AudioEngine, n: Noise) {
  const ctx = a.ctx;
  if (!ctx || !a.sfx || !a.noise) return;
  const now = ctx.currentTime + (n.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = a.noise;
  const f = ctx.createBiquadFilter();
  f.type = n.filter;
  f.Q.value = n.q ?? 1;
  f.frequency.setValueAtTime(n.from, now);
  f.frequency.exponentialRampToValueAtTime(Math.max(1, n.to), now + n.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(n.gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + n.dur);
  src.connect(f).connect(g);
  out(a, g, n.pan);
  src.start(now, Math.random() * 1.5);
  src.stop(now + n.dur + 0.02);
}

/** A looping filtered-noise bed whose loudness follows `setLevel` (the wall run's scrape). */
export class NoiseLoop {
  private gain: GainNode | null = null;

  constructor(
    private a: AudioEngine,
    private cutoff: number,
  ) {}

  setLevel(level: number) {
    const ctx = this.a.ctx;
    if (!ctx || !this.a.sfx || !this.a.noise) return;
    if (!this.gain) {
      const src = ctx.createBufferSource();
      src.buffer = this.a.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = this.cutoff;
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      src.connect(f).connect(this.gain).connect(this.a.sfx);
      src.start();
    }
    this.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.03);
  }
}
