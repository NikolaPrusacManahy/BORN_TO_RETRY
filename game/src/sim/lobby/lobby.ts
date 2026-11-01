// Update 0.2.9 — the lobby's rules (the designer: "a fully main lobby where your character can move around"; the hall is
// world/lobby/). Its stations, used with E: a difficulty's altar chooses it, a character chooses them if they're
// playable (a locked one stays locked: "no other characters available"), and the main gate takes you through; so does
// walking into its gateway. What's in reach gets a card (sim/items/focus.ts, drawn by engine/promptView.ts). Pure: the
// run steps it (engine/run.ts) and passes on what happened (its events) to the App, which asks the gate's questions.
// Update 0.2.17 — the Fate Cards' stand (the designer: "asking if the player wants the Cards in their run"): E turns them
// on or off for your runs (saved, as a difficulty is).
import type { CharacterId } from '../characters';
import { ROSTER } from '../characters';
import type { Focus } from '../items/focus';
import type { PlayerState } from '../player/state';
import { ALTAR_H, ALTARS, CARD_FLOAT, CARD_STAND, DAIS, FIGURES, GATE, GATE_LINE } from '../../world/lobby/spots';
import { DIFFICULTIES, Difficulty } from './difficulty';

export type StationKind = 'difficulty' | 'character' | 'gate' | 'cards';

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
export const REACH: Readonly<Record<StationKind, number>> = { difficulty: 2.6, character: 3.4, gate: 3.5, cards: 2.6 };
/** Where the gate's card hangs, and a character's over their head (m). */
const GATE_CARD = 3.2;
const HEAD = 2.55;

export function createLobby(difficulty: Difficulty, character: CharacterId, cards = true): Lobby {
  const stations: Station[] = [
    ...ALTARS.map((a, i): Station => ({ kind: 'difficulty', index: i, x: a.x, z: a.z, y: ALTAR_H + 0.95, reach: REACH.difficulty })),
    ...FIGURES.map((f, i): Station => ({ kind: 'character', index: i, x: f.x, z: f.z, y: DAIS.h + HEAD, reach: REACH.character })),
    { kind: 'gate', index: 0, x: 0, z: GATE.barsZ + 0.9, y: GATE_CARD, reach: REACH.gate },
    { kind: 'cards', index: 0, x: CARD_STAND.x, z: CARD_STAND.z, y: CARD_FLOAT + 0.75, reach: REACH.cards },
  ];
  return { stations, difficulty, character, cards, near: -1, inGate: false, opening: false, events: [] };
}

/** The nearest station in its reach (−1: none). */
function nearest(l: Lobby, p: PlayerState): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < l.stations.length; i++) {
    const s = l.stations[i];
    const d = Math.hypot(p.pos.x - s.x, p.pos.z - s.z);
    if (d > s.reach || d >= bestD) continue;
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
    if (!c.available) l.events.push('locked');
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
  if (l.near < 0) return out;
  const s = l.stations[l.near];
  out.at.set(s.x, s.y, s.z);
  if (s.kind === 'gate') {
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
    out.label = c.available ? c.name : '';
    out.act = !c.available ? 'unavailable' : c.id === l.character ? 'chosen' : 'choose';
  }
  return out;
}
