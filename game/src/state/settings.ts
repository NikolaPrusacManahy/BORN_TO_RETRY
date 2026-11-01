// Settings saved in localStorage (pattern from Last Ward). Every saved field needs a default here, or old
// saves lose it on load.
// Update 0.2.9 — and what you chose in the lobby: your difficulty and character.
// Update 0.2.26 — Blood: on, less or off (engine/bloodFx.ts).
import { Bindings, DEFAULT_BINDINGS, hydrateBindings } from '../input/bindings';
import { CharacterId, ROSTER } from '../sim/characters';
import { DEFAULT_DIFFICULTY, Difficulty, isDifficulty } from '../sim/lobby/difficulty';

export interface Settings {
  /** Mouse sensitivity multiplier, 0.1 – 5. */
  sensitivity: number;
  invertY: boolean;
  /** Horizontal field of view in degrees (shooters show it this way). */
  fov: number;
  /** Master volume 0 – 1. */
  volume: number;
  /** Sound effects 0 – 1. */
  sfxVolume: number;
  /** Music 0 – 1. */
  musicVolume: number;
  /** Update 0.2.21 — the in-play HUD's size, times its fit to the screen (ui/uiScale.ts), UI_SIZE_MIN – UI_SIZE_MAX. */
  uiSize: number;
  /** Update 0.2.26 — how much enemies bleed. */
  blood: BloodLevel;
  bindings: Bindings;
}

export type BloodLevel = 'on' | 'less' | 'off';
export const BLOOD_LEVELS: readonly BloodLevel[] = ['on', 'less', 'off'];

export interface SaveData {
  version: 1;
  settings: Settings;
  /** Update 0.2.9 — chosen in the lobby (a character only if they're playable). Update 0.2.17 — and whether runs deal
   *  Fate Cards (the lobby's stand). */
  difficulty: Difficulty;
  character: CharacterId;
  cards: boolean;
}

/** Named after the working title; kept when the game became Born To Retry so saved settings carry over. */
export const SAVE_KEY = 'ruinbreaker-save';
export const FOV_MIN = 80;
export const FOV_MAX = 130;
export const SENS_MIN = 0.1;
export const SENS_MAX = 5;
export const UI_SIZE_MIN = 0.7;
export const UI_SIZE_MAX = 1.4;

export const DEFAULT_SETTINGS: Settings = { sensitivity: 1, invertY: false, fov: 100, volume: 0.8, sfxVolume: 1, musicVolume: 0.7, uiSize: 1, blood: 'on', bindings: DEFAULT_BINDINGS };

export function defaultSave(): SaveData {
  return { version: 1, settings: { ...DEFAULT_SETTINGS, bindings: { ...DEFAULT_BINDINGS } }, difficulty: DEFAULT_DIFFICULTY, character: DEFAULT_CHARACTER, cards: true };
}

/** Update 0.2.9 — the character a new save has (the first playable one). */
export const DEFAULT_CHARACTER: CharacterId = ROSTER.find((c) => c.available)!.id;
const playable = (v: unknown): v is CharacterId => ROSTER.some((c) => c.id === v && c.available);

const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

/** Hydrate: accepts anything, always returns a complete, valid save. */
export function hydrateSave(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const s: Partial<Settings> = (raw as { settings?: Partial<Settings> }).settings ?? {};
  const { difficulty, character, cards } = raw as Partial<Record<'difficulty' | 'character' | 'cards', unknown>>;
  return {
    version: 1,
    difficulty: isDifficulty(difficulty) ? difficulty : DEFAULT_DIFFICULTY,
    character: playable(character) ? character : DEFAULT_CHARACTER,
    cards: typeof cards === 'boolean' ? cards : true,
    settings: {
      sensitivity: clamp(s.sensitivity, SENS_MIN, SENS_MAX, DEFAULT_SETTINGS.sensitivity),
      invertY: typeof s.invertY === 'boolean' ? s.invertY : DEFAULT_SETTINGS.invertY,
      fov: Math.round(clamp(s.fov, FOV_MIN, FOV_MAX, DEFAULT_SETTINGS.fov)),
      volume: clamp(s.volume, 0, 1, DEFAULT_SETTINGS.volume),
      sfxVolume: clamp(s.sfxVolume, 0, 1, DEFAULT_SETTINGS.sfxVolume),
      musicVolume: clamp(s.musicVolume, 0, 1, DEFAULT_SETTINGS.musicVolume),
      uiSize: clamp(s.uiSize, UI_SIZE_MIN, UI_SIZE_MAX, DEFAULT_SETTINGS.uiSize),
      blood: BLOOD_LEVELS.includes(s.blood as BloodLevel) ? (s.blood as BloodLevel) : DEFAULT_SETTINGS.blood,
      bindings: hydrateBindings(s.bindings),
    },
  };
}

export function loadSave(): SaveData {
  try {
    return hydrateSave(JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null'));
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* private mode / storage blocked — play on without saving */
  }
}

/** Horizontal FOV (degrees) → the vertical FOV Three.js cameras use, for a screen of this aspect. */
export function verticalFov(horizontalDeg: number, aspect: number): number {
  const h = (horizontalDeg * Math.PI) / 180;
  return (2 * Math.atan(Math.tan(h / 2) / Math.max(aspect, 0.01)) * 180) / Math.PI;
}
