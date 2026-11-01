// M1 — what the HUD shows, pushed by the game a few times a second (React never runs per frame). Hit markers
// and hurt flashes are counters: each new number restarts their animation.
import { createRaptorHud } from './raptorHud';
import type { MoveMode } from '../sim/player/state';
import type { KeyKind } from '../sim/items/items';
import type { WeaponKind } from '../sim/weapons/catalog';

/** Update 0.0.17 — a weapon slot's weapon and its uses. */
export interface HudSlot {
  kind: WeaponKind;
  uses: number;
}
import type { RoomKind } from '../world/dungeon/rooms';

export type MarkerKind = 'hit' | 'heavy' | 'kill';

/** Update 0.0.12 — the minimap: rooms and corridors in floor-grid cells. */
export interface MapRoom {
  x: number;
  z: number;
  w: number;
  h: number;
  /** Update 0.1.20 — or a challenge room. */
  kind: RoomKind | 'challenge';
  /** You're in it, you've been in it, or you only know of it. */
  state: 'here' | 'been' | 'known';
}

export interface MapView {
  size: number;
  rooms: MapRoom[];
  corridors: { x: number; z: number; w: number; h: number }[];
}

export interface HudState {
  dashCharges: number;
  dashMax: number;
  mode: MoveMode;
  /** M1 step 6 — counts hits; `marker` is the last one's kind. */
  hits: number;
  marker: MarkerKind;
  /** Counts hits on you. */
  hurts: number;
  /** M1 step 8 — health, rounded up (never shows 0 while alive). */
  hp: number;
  maxHp: number;
  /** M2 — the weapon in hand ('' barehanded) and its uses left (0: broken, the next attack throws it). */
  weapon: string;
  uses: number;
  /** Update 0.2.4 — a gun in hand: the bullets in its magazine (−1: no gun). */
  mag: number;
  /** Update 0.0.12 — your coins; the dungeon's minimap (null in the lab) and you on it (cells, facing). */
  money: number;
  /** Update 0.0.13 — the shield (rounded up) on the health bar's scale, hits on it (a counter, like `hurts`), and the
   *  keys and rings you carry. */
  shield: number;
  shields: number;
  keys: number;
  redRings: number;
  blueRings: number;
  /** Update 0.0.16 — white and gold keys, and the key you'll use at the chest in front of you ('': none). */
  whiteKeys: number;
  goldKeys: number;
  keyPick: KeyKind | '';
  /** Update 0.0.17 — the green and purple rings; the weapon slots after your fists (slot 2 on) and the one in your hand
   *  (0: fists), with a number that changes whenever they do; the kill bonuses that are on (share of their time left). */
  greenRings: number;
  tealRings: number;
  /** Update 0.2.16 — how many Fate Cards you carry (TAB shows them). */
  cards: number;
  slots: (HudSlot | null)[];
  slot: number;
  slotSig: number;
  bonusLeft: Record<string, number>;
  map: MapView | null;
  mapX: number;
  mapZ: number;
  mapYaw: number;
  /** Update 0.0.15 — the boss room's show: the letterbox (the view isn't yours; the rest of the HUD hides), the boss's
   *  name card, its health (0..1; −1: no bar), the black of the way down, and the next floor's name. */
  cine: boolean;
  card: boolean;
  bossName: string;
  bossTitle: string;
  bossHp: number;
  veil: boolean;
  floorName: string;
  /** Update 0.0.18 — poison is eating at you (a green edge). */
  poisoned: boolean;
  /** Update 0.0.21 — enemies left in the fight (−1: no count). */
  enemiesLeft: number;
  /** Update 0.2.0 — the room you're in has a chest to open ("CHEST IN CURRENT ROOM !" under the map). */
  chestHere: boolean;
  /** Update 0.1.0 — the Execution Power meter (0..1, in steps of a kill). */
  execution: number;
  /** Update 0.2.3 — where the boss bar's mark is (share of its health; −1: none). */
  bossMark: number;
  /** Update 0.2.3 — held in the Bone King's hand: your hits (−1: not held), the hits to break free, the time left
   *  (0..1), how the last hold ended ('' once its flash is over), and your attack's key. */
  grabHits: number;
  grabNeed: number;
  grabLeft: number;
  grabEnd: '' | 'free' | 'thrown';
  attackKey: string;
  /** Update 0.2.8 — the Velociraptor's sand in your eyes, its screech's dash lock and its pin (raptorHud.ts), and your
   *  dash's key. */
  blind: number;
  dashLocked: boolean;
  pinDodges: number;
  pinNeed: number;
  pinGlow: boolean;
  pinWasted: boolean;
  pinEnd: '' | 'free' | 'bitten';
  /** Update 0.2.10 — floor 5's Squidle's ink over your view (raptorHud.ts). */
  ink: number;
  dashKey: string;
}

export interface HudStore {
  get(): HudState;
  set(next: HudState): void;
  subscribe(fn: () => void): () => void;
}

export function createHudStore(): HudStore {
  let state: HudState = { dashCharges: 0, dashMax: 0, mode: 'ground', hits: 0, marker: 'hit', hurts: 0, hp: 0, maxHp: 0, weapon: '', uses: 0, mag: -1, money: 0, shield: 0, shields: 0, keys: 0, redRings: 0, blueRings: 0, whiteKeys: 0, goldKeys: 0, keyPick: '', greenRings: 0, tealRings: 0, cards: 0, slots: [], slot: 0, slotSig: 0, bonusLeft: {}, map: null, mapX: 0, mapZ: 0, mapYaw: 0, cine: false, card: false, bossName: '', bossTitle: '', bossHp: -1, veil: false, floorName: '', poisoned: false, enemiesLeft: -1, chestHere: false, execution: 0, bossMark: -1, grabHits: -1, grabNeed: 0, grabLeft: 0, grabEnd: '', attackKey: '', ...createRaptorHud(), dashKey: '' };
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      const same = (Object.keys(next) as (keyof HudState)[]).every((k) => next[k] === state[k]);
      if (same) return;
      state = next;
      subs.forEach((fn) => fn());
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** Live numbers for the F2 overlay, written every frame and read by the overlay's own loop. */
export interface DebugInfo {
  speed: number;
  vSpeed: number;
  mode: MoveMode;
  dashCharges: number;
  wallJumpsLeft: number;
  /** Raw (unadjusted) mouse input granted. */
  rawInput: boolean;
  keyboardLock: boolean;
  fullscreen: boolean;
  /** M1 step 6 — hit-stop left (ms). */
  hitStop: number;
  /** M1 step 8 — health, and invincible (F4). */
  hp: number;
  god: boolean;
}

export function createDebugInfo(): DebugInfo {
  return { speed: 0, vSpeed: 0, mode: 'ground', dashCharges: 0, wallJumpsLeft: 0, rawInput: false, keyboardLock: false, fullscreen: false, hitStop: 0, hp: 0, god: false };
}
