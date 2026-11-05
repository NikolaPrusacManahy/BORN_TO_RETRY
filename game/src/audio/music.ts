// Update 0.1.17 — background music (the designer's own tracks, ASSETS/BGM; the designer: "put the BGM for the main
// menu"). One track at a time on the music bus (its volume: Settings → Music), looping; a new one fades in, the old one
// out. Which one is wanted is kept here (setMusic): the screens say it, the sound engine plays it once it has started
// (browsers start sound only after a click or a key).
// Update 0.3.19 — the floors' fight music (the designer's three tracks, ASSETS/AUDIO/COMBAT, encoded to Ogg:
// tools/blender/encode_music.py; the designer: "Combat ost start when you enter the first room of a floor and is played
// and looped until you finish the Boss of the floor, the music stops and will be replayed on the first room of the
// next floor"; "Random each floor"). Two wishes now: the screens' (the menus' track, or none) and the floor's (its
// fight track, or none); the menus' wins, so pausing keeps the fight's music on. Then (the designer: "let's only play
// the BGM when on room fights, challenge room, boss room -> when a fight done, BGM fades away"): only while a fight is
// on, fading away slowly as it's won; each fight goes on where the floor's track left off.
import type { DungeonRun } from '../sim/dungeon/roomLoop';
import type { AudioEngine } from './audio';

export type TrackName = 'menu' | 'combat1' | 'combat2' | 'combat3';

interface Track {
  file: string;
  /** Its loudness (the menu's track: 3 for a file mixed quiet, then 65% quieter, the designer). **(placeholder)** */
  gain: number;
}

export const TRACKS: Record<TrackName, Track> = {
  menu: { file: 'music/menu.mp3', gain: 1.05 },
  // (Mixed loud, about −12 dB RMS: a third of that, under the fight's sounds. **(placeholder)**)
  combat1: { file: 'music/combat1.ogg', gain: 0.32 },
  combat2: { file: 'music/combat2.ogg', gain: 0.29 },
  combat3: { file: 'music/combat3.ogg', gain: 0.33 },
};

/** Update 0.3.19 — the fight tracks a floor picks from. */
export const COMBAT: readonly TrackName[] = ['combat1', 'combat2', 'combat3'];

/** Fading in and out (s). Update 0.3.19 — a fight's track fades away slower as the fight is won. **(placeholder)** */
export const FADE_IN = 1.5;
export const FADE_OUT = 0.8;
export const FIGHT_FADE_OUT = 3;

/** The track to play (null: silence): the screens' wish, else the floor's. */
let wanted: TrackName | null = null;
let screen: TrackName | null = null;
let floor: TrackName | null = null;
let engine: AudioEngine | null = null;
/** Update 0.3.49 — a boss's ultimate has cut the fight's music. */
let cut = false;
/** Cut, it's gone in this long (s). */
export const CUT_OUT = 0.15;

function want() {
  const w = screen ?? (cut ? null : floor);
  if (w === wanted) return;
  wanted = w;
  engine?.tracks.apply();
}

/** The screens' track (the menus'; null: none). Applied as soon as the sound engine runs. */
export function setMusic(name: TrackName | null) {
  screen = name;
  want();
}

/** Update 0.3.19 — the floor's track (its fight music; null: none), each frame from the run. */
export function setFloorMusic(name: TrackName | null) {
  if (name === floor) return;
  floor = name;
  want();
}

/** Update 0.3.49 — the Boss Design Bible: a boss's ultimate cuts the music, and it comes back where it was left. */
export function cutMusic(on: boolean) {
  if (on === cut) return;
  cut = on;
  want();
}

/** Update 0.3.19 — the fight track after `prev` (its index; −1: none yet), from a roll in [0, 1): any of them, never
 *  the same twice running. Pure. */
export function pickCombat(prev: number, roll: number): number {
  const n = COMBAT.length;
  if (prev < 0 || n < 2) return Math.min(n - 1, Math.floor(roll * n));
  const k = Math.min(n - 2, Math.floor(roll * (n - 1)));
  return k >= prev ? k + 1 : k;
}

let pickedFor: object | null = null;
let last = -1;

/** Update 0.3.19 — floor `run`'s fight track: picked once, when the floor starts (a new run, a Retry, the way down: a
 *  new floor, a new pick). */
export function floorTrack(run: object, roll = Math.random()): TrackName {
  if (run !== pickedFor) {
    pickedFor = run;
    last = pickCombat(last, roll);
  }
  return COMBAT[last];
}

/** Update 0.3.19 — the floor's fight music plays while a fight is on: a fight room's or a challenge room's (from its
 *  gates shutting till its last foe falls), the boss's (its show and its fight); not once you're dead. Pure. */
export function combatMusicOn(run: DungeonRun, dead: boolean): boolean {
  if (dead || run.exited) return false;
  const beat = run.boss.beat;
  return beat === 'intro' || beat === 'fight' || run.rooms.some((r) => r.state === 'fighting');
}

/** Update 0.3.19 — where a looping track is, `played` seconds on from `from` (s; its length `length`). Pure. */
export function loopAt(from: number, played: number, length: number): number {
  return length > 0 ? (from + played) % length : 0;
}

export class MusicPlayer {
  /** `from`: where in the track it started (s); `at`: when (the context's clock). */
  private playing: { name: TrackName; src: AudioBufferSourceNode; gain: GainNode; from: number; at: number } | null = null;
  /** Update 0.3.19 — where each fight track was left (s): the next fight goes on from there. */
  private readonly left = new Map<TrackName, number>();
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
      const from = this.left.get(name) ?? 0;
      src.start(now, from);
      this.playing = { name, src, gain, from, at: now };
    });
  }

  private fadeOut() {
    const p = this.playing;
    const ctx = this.a.ctx;
    this.playing = null;
    if (!p || !ctx) return;
    const now = ctx.currentTime;
    const fight = COMBAT.includes(p.name);
    const out = cut ? CUT_OUT : fight ? FIGHT_FADE_OUT : FADE_OUT;
    if (fight) this.left.set(p.name, loopAt(p.from, now - p.at + out, p.src.buffer?.duration ?? 0));
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(p.gain.gain.value, now);
    p.gain.gain.linearRampToValueAtTime(0, now + out);
    p.src.stop(now + out + 0.05);
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

/** Update 0.1.17 — the menus' track plays on the menus (the gate, the camp) and fades out as a run starts. Update 0.2.9
 *  — it played on in the lobby; Update 0.2.13 — no more (the designer: "remove the main menu music that is played in
 *  the lobby"): it fades out as the gate opens onto the lobby. Pure. */
const MENU_PHASES = ['menu', 'intro'];
export const menuMusicOn = (phase: string, starting: boolean) => !starting && MENU_PHASES.includes(phase);
