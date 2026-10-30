// Update 0.1.17 — background music (the designer's own tracks, ASSETS/BGM; the designer: "put the BGM for the main
// menu"). One track at a time on the music bus (its volume: Settings → Music), looping; a new one fades in, the old one
// out. Which one is wanted is kept here (setMusic): the screens say it, the sound engine plays it once it has started
// (browsers start sound only after a click or a key).
import type { AudioEngine } from './audio';

export type TrackName = 'menu';

interface Track {
  file: string;
  /** Its loudness (the menu's track: 3 for a file mixed quiet, then 65% quieter, the designer). **(placeholder)** */
  gain: number;
}

export const TRACKS: Record<TrackName, Track> = {
  menu: { file: 'music/menu.mp3', gain: 1.05 },
};

/** Fading in and out (s). */
export const FADE_IN = 1.5;
export const FADE_OUT = 0.8;

/** The track the screens want (null: silence). */
let wanted: TrackName | null = null;
let engine: AudioEngine | null = null;

/** The track to play now (null: fade it out). Applied as soon as the sound engine runs. */
export function setMusic(name: TrackName | null) {
  wanted = name;
  engine?.tracks.apply();
}

export class MusicPlayer {
  private playing: { name: TrackName; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private readonly loads = new Map<TrackName, Promise<AudioBuffer | null>>();
  /** Bumped by every change: a load that finishes late doesn't start a track no longer wanted. */
  private turn = 0;

  constructor(private readonly a: AudioEngine) {
    engine = a;
  }

  /** Plays the wanted track (fading the old one out). Called by setMusic and once the context is made. */
  apply() {
    const ctx = this.a.ctx;
    if (!ctx || !this.a.music || this.playing?.name === wanted) return;
    const turn = ++this.turn;
    this.fadeOut();
    const name = wanted;
    if (!name) return;
    void this.load(name).then((buf) => {
      if (!buf || turn !== this.turn || !this.a.ctx || !this.a.music) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(TRACKS[name].gain, now + FADE_IN);
      src.connect(gain).connect(this.a.music);
      src.start();
      this.playing = { name, src, gain };
    });
  }

  private fadeOut() {
    const p = this.playing;
    const ctx = this.a.ctx;
    this.playing = null;
    if (!p || !ctx) return;
    const now = ctx.currentTime;
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(p.gain.gain.value, now);
    p.gain.gain.linearRampToValueAtTime(0, now + FADE_OUT);
    p.src.stop(now + FADE_OUT + 0.05);
  }

  private load(name: TrackName): Promise<AudioBuffer | null> {
    const ctx = this.a.ctx;
    if (!ctx) return Promise.resolve(null);
    let p = this.loads.get(name);
    if (!p) {
      const base = import.meta.env?.BASE_URL ?? '/';
      p = fetch(base + TRACKS[name].file)
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b))
        .catch(() => null);
      this.loads.set(name, p);
    }
    return p;
  }
}

/** Update 0.1.17 — the menus' track plays on the menus (the gate, the camp; Update 0.2.9 — and the lobby, paused or
 *  asked at its gate, where the character select was) and fades out as a run starts (through the lobby's gate). Pure. */
const MENU_PHASES = ['menu', 'intro', 'lobby', 'lobbyPaused', 'confirm'];
export const menuMusicOn = (phase: string, starting: boolean) => !starting && MENU_PHASES.includes(phase);
