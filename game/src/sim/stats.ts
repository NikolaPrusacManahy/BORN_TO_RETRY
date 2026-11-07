// Update 0.5.2 — your record across every run, kept in the save (the designer: "playtime, death counts, cards collected in total, how to unlock, how many times you used a character, tracks how many Grunts, spitter,
// snakes.... you killed. the whole list, how many executions in total etc etc"). A run keeps its own tally as it's played (CombatState.tally, carried down with you) and hands it in once, as it ends or is left
// (engine/runBase.ts, `report`); a Lab run hands in nothing. Pure.
import { CARD_KINDS, type CardKind } from './cards/cards';
import { ROSTER, type CharacterId } from './characters';
import { ENEMY_KINDS, type EnemyKind } from './enemies/kinds';
import { DIFFICULTIES, type Difficulty } from './lobby/difficulty';

type Counts<K extends string> = Partial<Record<K, number>>;

/** What a run's been through so far: kills by kind, executions, cards taken by card, chests opened, and (WEAKLING EXPERIENCE) the falls that sent you back to a checkpoint. */
export interface Tally {
  kills: Counts<EnemyKind>;
  executions: number;
  cards: Counts<CardKind>;
  chests: number;
  falls: number;
}

export const newTally = (): Tally => ({ kills: {}, executions: 0, cards: {}, chests: 0, falls: 0 });

/** One more of `k`. */
export function countOne<K extends string>(m: Counts<K>, k: K) {
  m[k] = (m[k] ?? 0) + 1;
}

/** A run handed in: who and on what, how long it was played, the deepest floor it reached, whether it was won, and its tally. */
export interface RunReport {
  character: CharacterId;
  difficulty: Difficulty;
  time: number;
  floor: number;
  won: boolean;
  tally: Tally;
}

/** Every run's, added up. `runs`: by character; `played`: by difficulty; `fastest`: the quickest run won (s; 0: none yet). */
export interface Stats {
  time: number;
  runs: Counts<CharacterId>;
  played: Counts<Difficulty>;
  kills: Counts<EnemyKind>;
  executions: number;
  cards: Counts<CardKind>;
  chests: number;
  deepest: number;
  fastest: number;
}

export const noStats = (): Stats => ({ time: 0, runs: {}, played: {}, kills: {}, executions: 0, cards: {}, chests: 0, deepest: 0, fastest: 0 });

function merge<K extends string>(into: Counts<K>, from: Counts<K>): Counts<K> {
  const out: Counts<K> = { ...into };
  for (const k of Object.keys(from) as K[]) out[k] = (out[k] ?? 0) + (from[k] ?? 0);
  return out;
}

/** The record, with run `r` added. */
export function addRun(s: Stats, r: RunReport): Stats {
  const quicker = r.won && r.time > 0 && (s.fastest === 0 || r.time < s.fastest);
  return {
    time: s.time + Math.max(0, r.time),
    runs: merge(s.runs, { [r.character]: 1 } as Counts<CharacterId>),
    played: merge(s.played, { [r.difficulty]: 1 } as Counts<Difficulty>),
    kills: merge(s.kills, r.tally.kills),
    executions: s.executions + r.tally.executions,
    cards: merge(s.cards, r.tally.cards),
    chests: s.chests + r.tally.chests,
    deepest: Math.max(s.deepest, r.floor),
    fastest: quicker ? r.time : s.fastest,
  };
}

/** All of a count's. */
export const sumOf = (m: Counts<string>) => Object.values(m).reduce<number>((a, n) => a + (n ?? 0), 0);

const whole = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(Math.min(v, 1e9)) : 0);
const seconds = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(v, 1e9) : 0);

/** Only the keys `known` has, each a whole count over 0. */
function counts<K extends string>(raw: unknown, known: readonly K[]): Counts<K> {
  const out: Counts<K> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k of known) {
    const n = whole((raw as Record<string, unknown>)[k]);
    if (n > 0) out[k] = n;
  }
  return out;
}

/** A saved record, whatever was saved: what isn't a count of something the game has is dropped. */
export function hydrateStats(raw: unknown): Stats {
  if (!raw || typeof raw !== 'object') return noStats();
  const r = raw as Record<string, unknown>;
  return {
    time: seconds(r.time),
    runs: counts(r.runs, ROSTER.map((c) => c.id)),
    played: counts(r.played, DIFFICULTIES.map((d) => d.id)),
    kills: counts(r.kills, ENEMY_KINDS),
    executions: whole(r.executions),
    cards: counts(r.cards, CARD_KINDS),
    chests: whole(r.chests),
    deepest: whole(r.deepest),
    fastest: seconds(r.fastest),
  };
}
