// Update 0.2.9 — the lobby's rules (the designer: "a fully main lobby where your character can move around"; the hall is
// world/lobby/). Its stations, used with E: a difficulty's altar chooses it, a character chooses them if they're
// playable (a locked one stays locked: "no other characters available"), and the main gate takes you through; so does
// walking into its gateway. What's in reach gets a card (sim/items/focus.ts, drawn by engine/promptView.ts). Pure: the
// run steps it (engine/run.ts) and passes on what happened (its events) to the App, which asks the gate's questions.
// Update 0.2.17 — the Fate Cards' stand (the designer: "asking if the player wants the Cards in their run"): E turns them
// on or off for your runs (saved, as a difficulty is).
// Update 0.3.21 — the manor's galleries (world/lobby/galleries.ts; the designer: "put their name and effect as player get
// closer"): each weapon's and each item's pedestal, each card on the cards gallery's walls, a station that only shows
// its card (its name, rarity and what it does) as you come near, on its own floor (upstairs or down); E does nothing
// there.
// Update 0.3.70 — the Demon, on the dais with the rest: a silhouette till you've beaten the final boss (`Lobby.demon`), and
// its card says so.
import type { CardKind } from '../cards/cards';
import type { CharacterId } from '../characters';
import type { InfoKind } from '../items/itemInfo';
import { isPlayable, ROSTER } from '../characters';
import type { Focus } from '../items/focus';
import type { PlayerState } from '../player/state';
import { ALTAR_H, ALTARS, CARD_FLOAT, CARD_STAND, DAIS, FIGURES, GATE, GATE_LINE } from '../../world/lobby/spots';
import { CARD_SIZE, cardSlots, ITEM_STANDS, WEAPON_STANDS } from '../../world/lobby/galleries';
import { PEDESTAL } from '../../world/lobby/furniture';
import { DIFFICULTIES, Difficulty } from './difficulty';

export type StationKind = 'difficulty' | 'character' | 'gate' | 'cards' | 'exhibit' | 'gallery';

export interface Station {
  kind: StationKind;
  /** The difficulty's or the character's (the roster's) index. */
  index: number;
  x: number;
  z: number;
  /** Where its card hangs (m). */
  y: number;
  /** E reaches it from this far across (m). */
  reach: number;
  /** Update 0.3.21 — the floor it stands on (m: you're only in its reach on it), and a gallery's exhibit: an item or a
   *  weapon (its pedestal's), or a card (on the cards gallery's wall). */
  level: number;
  item?: InfoKind;
  card?: CardKind;
}

/** 'pick': a difficulty or a character was chosen (or Fate Cards turned on or off); 'locked': a locked character was
 *  tried; 'gate': through the gate. */
export type LobbyEvent = 'pick' | 'locked' | 'gate';

export interface Lobby {
  stations: Station[];
  difficulty: Difficulty;
  character: CharacterId;
  /** Update 0.2.17 — your runs deal Fate Cards. */
  cards: boolean;
  /** Update 0.3.70 — you've beaten the final boss. */
  demon: boolean;
  /** The station in reach (−1: none). */
  near: number;
  /** You stand in the gateway (walking in sends you through once each time). */
  inGate: boolean;
  /** You're going through: the portcullis rises. */
  opening: boolean;
  /** What happened since the run last read them. */
  events: LobbyEvent[];
}

/** How far E reaches each kind of station (m, across). */
export const REACH: Readonly<Record<StationKind, number>> = { difficulty: 2.6, character: 3.4, gate: 3.5, cards: 2.6, exhibit: 1.9, gallery: 1.4 };
/** You're on a station's floor within this much of its level (m). */
const SAME_FLOOR = 2.5;
/** Where the gate's card hangs, and a character's over their head (m). */
const GATE_CARD = 3.2;
const HEAD = 2.55;

export function createLobby(difficulty: Difficulty, character: CharacterId, cards = true, demon = false): Lobby {
  const stations: Station[] = [
    ...ALTARS.map((a, i): Station => ({ kind: 'difficulty', index: i, x: a.x, z: a.z, y: ALTAR_H + 0.95, reach: REACH.difficulty, level: 0 })),
    ...FIGURES.map((f, i): Station => ({ kind: 'character', index: i, x: f.x, z: f.z, y: DAIS.h + HEAD, reach: REACH.character, level: 0 })),
    { kind: 'gate', index: 0, x: 0, z: GATE.barsZ + 0.9, y: GATE_CARD, reach: REACH.gate, level: 0 },
    { kind: 'cards', index: 0, x: CARD_STAND.x, z: CARD_STAND.z, y: CARD_FLOAT + 0.75, reach: REACH.cards, level: 0 },
    ...[...WEAPON_STANDS, ...ITEM_STANDS].map((s, i): Station => ({ kind: 'exhibit', index: i, x: s.x, z: s.z, y: PEDESTAL.top + 1.25, reach: REACH.exhibit, level: 0, item: s.kind })),
    ...cardSlots().map((c, i): Station => ({ kind: 'gallery', index: i, x: c.x, z: c.z, y: c.y + 0.75, reach: REACH.gallery, level: c.y - CARD_SIZE.y, card: c.kind })),
  ];
  return { stations, difficulty, character, cards, demon, near: -1, inGate: false, opening: false, events: [] };
}

/** The nearest station in its reach (−1: none). */
function nearest(l: Lobby, p: PlayerState): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < l.stations.length; i++) {
    const s = l.stations[i];
    const d = Math.hypot(p.pos.x - s.x, p.pos.z - s.z);
    if (d > s.reach || d >= bestD || Math.abs(p.pos.y - s.level) > SAME_FLOOR) continue;
    bestD = d;
    best = i;
  }
  return best;
}

/** One tick: what's in reach, E used on it, walking into the gateway. Returns whether E was used. */
export function stepLobby(l: Lobby, p: PlayerState, interact: boolean): boolean {
  l.near = p.dead || l.opening ? -1 : nearest(l, p);
  const inside = Math.abs(p.pos.x) < GATE.halfW && p.pos.z < GATE_LINE;
  if (inside && !l.inGate && !l.opening) l.events.push('gate');
  l.inGate = inside;
  if (!interact || l.near < 0) return false;
  const s = l.stations[l.near];
  if (s.kind === 'exhibit' || s.kind === 'gallery') return false;
  if (s.kind === 'gate') l.events.push('gate');
  else if (s.kind === 'cards') {
    l.cards = !l.cards;
    l.events.push('pick');
  } else if (s.kind === 'difficulty') {
    const d = DIFFICULTIES[s.index].id;
    if (d !== l.difficulty) {
      l.difficulty = d;
      l.events.push('pick');
    }
  } else {
    const c = ROSTER[s.index];
    if (!isPlayable(c, l.demon)) l.events.push('locked');
    else if (c.id !== l.character) {
      l.character = c.id;
      l.events.push('pick');
    }
  }
  return true;
}

/** Fills `out` with the card for the station in reach: a difficulty's or a playable character's name and whether E
 *  chooses it (or it's already yours), a locked character's "Locked", the gate's "[E] to enter"; the Fate Cards' stand,
 *  on or off and E to turn them the other way. */
export function lobbyFocus(l: Lobby, out: Focus): Focus {
  out.item = null;
  out.uses = -1;
  out.act = null;
  out.label = null;
  out.card = null;
  if (l.near < 0) return out;
  const s = l.stations[l.near];
  out.at.set(s.x, s.y, s.z);
  if (s.kind === 'exhibit') {
    out.item = s.item ?? null;
  } else if (s.kind === 'gallery') {
    out.card = s.card ?? null;
  } else if (s.kind === 'gate') {
    out.label = '';
    out.act = 'enter';
  } else if (s.kind === 'cards') {
    out.label = l.cards ? 'FATE CARDS: ON' : 'FATE CARDS: OFF';
    out.act = l.cards ? 'turnOff' : 'turnOn';
  } else if (s.kind === 'difficulty') {
    const d = DIFFICULTIES[s.index];
    out.label = d.name;
    out.act = d.id === l.difficulty ? 'chosen' : 'choose';
  } else {
    const c = ROSTER[s.index];
    const playable = isPlayable(c, l.demon);
    out.label = playable ? c.name : '';
    out.act = !playable ? (c.earned ? 'sealed' : 'unavailable') : c.id === l.character ? 'chosen' : 'choose';
  }
  return out;
}
