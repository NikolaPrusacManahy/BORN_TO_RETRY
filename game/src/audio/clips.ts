// Update 0.1.17 — recorded sounds: clips cut from the designer's library (tools/sfx/cut_clips.py, into public/sounds,
// listed with their sources in manifest.json). Loaded once the sound engine starts (the first click). A sound plays one
// of its picks (clipPicks.ts) at random, a little higher or lower each time. A sound with no picks, or not loaded yet,
// isn't played here, so the one made in code plays instead.
import type { AudioEngine } from './audio';
import { ClipSound, MIX, PICKS } from './clipPicks';

export interface ClipEntry {
  file: string;
  /** The library file and the stretch of it (the licence log). */
  from: string;
  seconds: number;
}

export type ClipManifest = Partial<Record<ClipSound, ClipEntry[]>>;

export class ClipBank {
  /** The one loaded last (the Lab's Sounds list plays through it). */
  static current: ClipBank | null = null;
  manifest: ClipManifest = {};
  private readonly buffers = new Map<ClipSound, (AudioBuffer | null)[]>();
  private started = false;

  constructor(private readonly a: AudioEngine) {}

  /** The manifest and every clip in it, once (call when the context is made). */
  async load() {
    const ctx = this.a.ctx;
    if (this.started || !ctx) return;
    this.started = true;
    ClipBank.current = this;
    const base = import.meta.env?.BASE_URL ?? '/';
    try {
      this.manifest = (await (await fetch(`${base}sounds/manifest.json`)).json()) as ClipManifest;
    } catch {
      return;
    }
    const jobs: Promise<void>[] = [];
    for (const [sound, list] of Object.entries(this.manifest) as [ClipSound, ClipEntry[]][]) {
      const out: (AudioBuffer | null)[] = list.map(() => null);
      this.buffers.set(sound, out);
      list.forEach((c, k) => {
        jobs.push(
          fetch(base + c.file)
            .then((r) => r.arrayBuffer())
            .then((b) => ctx.decodeAudioData(b))
            .then((buf) => void (out[k] = buf))
            .catch(() => void (out[k] = null)),
        );
      });
    }
    await Promise.all(jobs);
  }

  /** Plays one of `sound`'s picks if it has any loaded: at its mix's loudness times `scale`, `rate` times as fast.
   *  False if it didn't (the caller plays its own). */
  play(sound: ClipSound, scale = 1, rate = 1): boolean {
    const mix = MIX[sound];
    const picks = PICKS[sound];
    const list = this.buffers.get(sound);
    if (!mix || !picks || picks.length === 0 || !list) return false;
    const buf = list[picks[Math.floor(Math.random() * picks.length)] - 1];
    if (!buf) return false;
    this.start(buf, mix.gain * scale, rate * (1 + (Math.random() * 2 - 1) * mix.vary));
    return true;
  }

  /** The Lab: candidate `n` (1-based) of `sound`, at its mix's loudness. */
  audition(sound: ClipSound, n: number, scale = 1) {
    const buf = this.buffers.get(sound)?.[n - 1];
    if (buf) this.start(buf, (MIX[sound]?.gain ?? 0.6) * scale, 1);
  }

  private start(buf: AudioBuffer, gain: number, rate: number) {
    const ctx = this.a.ctx;
    if (!ctx || !this.a.sfx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.a.sfx);
    src.start();
  }
}
