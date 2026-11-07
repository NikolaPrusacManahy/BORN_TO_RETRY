// Update 0.5.2 — what the lobby's records screen shows (Records.tsx draws it): your save's record, the bestiary's every enemy with what you've killed of it, every card with how often you took it, each
// character with how often you've played them, and what's still locked with how far you've got. Words and numbers only. Pure.
import { CARD, CARD_KINDS, familyOf, type CardKind } from '../../sim/cards/cards';
import { ROSTER, type CharacterId } from '../../sim/characters';
import type { EnemyKind } from '../../sim/enemies/kinds';
import { collection } from '../../sim/lobby/collection';
import { DIFFICULTIES } from '../../sim/lobby/difficulty';
import { sumOf } from '../../sim/stats';
import { DEMON_CLEARS, unlocksOf } from '../../sim/unlocks';
import type { SaveData } from '../../state/settings';
import { floorName } from '../../world/dungeon/floorNames';
import { clockText } from '../deathText';
import { labName } from '../labLists';

export interface LedgerLine {
  label: string;
  value: string;
  /** Under it, smaller (none: ''). */
  note: string;
}

export interface BeastRow {
  kind: EnemyKind;
  name: string;
  kills: number;
  boss: boolean;
}

export interface BeastShelf {
  title: string;
  rows: BeastRow[];
  kills: number;
}

export interface CardRow {
  kind: CardKind;
  name: string;
  /** Its rarity, or Traitor or Death. */
  tag: string;
  taken: number;
}

export interface CardShelf {
  title: string;
  rows: CardRow[];
}

export interface RosterRow {
  id: CharacterId;
  name: string;
  runs: number;
  open: boolean;
  /** How to open them ('': open). */
  how: string;
}

export interface UnlockRow {
  name: string;
  open: boolean;
  how: string;
  /** How far you've got, of `need`. */
  have: number;
  need: number;
}

export interface Records {
  ledger: LedgerLine[];
  beasts: BeastShelf[];
  kills: number;
  /** Every enemy kind the bestiary lists, killed or not. */
  kinds: number;
  slain: number;
  cards: CardShelf[];
  taken: number;
  found: number;
  deck: number;
  roster: RosterRow[];
  unlocks: UnlockRow[];
}

const RARITY_NAME: Record<string, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', mythic: 'Mythic' };
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'mythic'];

/** Played time, as long as it's grown: "45 s", "12 min", "3 h 05 min". */
export function longTime(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

const n = (v: number) => v.toLocaleString('en-US');

function ledger(save: SaveData): LedgerLine[] {
  const s = save.stats;
  const c = save.clears;
  const byDifficulty = (of: (id: 'weakling' | 'real' | 'human') => number) =>
    DIFFICULTIES.map((d) => `${d.id === 'weakling' ? 'Weakling' : d.id === 'real' ? 'Real' : 'Human'} ${n(of(d.id))}`).join(' · ');
  return [
    { label: 'Time played', value: longTime(s.time), note: 'In runs, not counting pauses' },
    { label: 'Runs', value: n(sumOf(s.runs)), note: byDifficulty((d) => s.played[d] ?? 0) },
    { label: 'Runs cleared', value: n(c.weakling + c.real + c.human), note: byDifficulty((d) => c[d]) },
    { label: 'Deaths', value: n(save.deaths), note: '' },
    { label: 'Enemies killed', value: n(sumOf(s.kills)), note: '' },
    { label: 'Executions', value: n(s.executions), note: '' },
    { label: 'Chests opened', value: n(s.chests), note: '' },
    { label: 'Cards taken', value: n(sumOf(s.cards)), note: '' },
    { label: 'Deepest floor', value: s.deepest > 0 ? String(s.deepest) : '—', note: s.deepest > 0 ? floorName(s.deepest) : 'No run yet' },
    { label: 'Fastest clear', value: s.fastest > 0 ? clockText(s.fastest) : '—', note: s.fastest > 0 ? '' : 'No run cleared yet' },
  ];
}

function beasts(save: SaveData): BeastShelf[] {
  const kills = save.stats.kills;
  const row = (kind: EnemyKind, boss: boolean): BeastRow => ({ kind, name: labName(kind), kills: kills[kind] ?? 0, boss });
  const listed = new Set<EnemyKind>();
  const out: BeastShelf[] = [];
  for (const f of collection()) {
    const rows = f.enemies.map((k) => row(k, false));
    if (f.boss) rows.push(row(f.boss, true));
    rows.forEach((r) => listed.add(r.kind));
    if (rows.length) out.push({ title: `${f.floor} · ${floorName(f.floor)}`, rows, kills: rows.reduce((a, r) => a + r.kills, 0) });
  }
  // (What you've killed that the bestiary doesn't show: a boss's helpers, a stand-in.)
  const others = (Object.keys(kills) as EnemyKind[]).filter((k) => !listed.has(k) && (kills[k] ?? 0) > 0).map((k) => row(k, false));
  if (others.length) out.push({ title: 'Others', rows: others, kills: others.reduce((a, r) => a + r.kills, 0) });
  return out;
}

function cards(save: SaveData): CardShelf[] {
  const taken = save.stats.cards;
  const row = (k: CardKind): CardRow => ({ kind: k, name: CARD[k].name, tag: familyOf(k) === 'fate' ? RARITY_NAME[CARD[k].rarity] : familyOf(k) === 'traitor' ? 'Traitor' : 'Death', taken: taken[k] ?? 0 });
  const of = (sean: boolean, family: string) =>
    CARD_KINDS.filter((k) => !!CARD[k].sean === sean && familyOf(k) === family).sort((a, b) => RARITY_ORDER.indexOf(CARD[a].rarity) - RARITY_ORDER.indexOf(CARD[b].rarity));
  return [
    { title: 'Fate Cards', rows: of(false, 'fate').map(row) },
    { title: 'Traitor Cards', rows: of(false, 'traitor').map(row) },
    { title: 'Death Cards', rows: of(false, 'death').map(row) },
    { title: 'Gravity Sean’s Fate Cards', rows: of(true, 'fate').map(row) },
    { title: 'Gravity Sean’s Traitor Cards', rows: of(true, 'traitor').map(row) },
    { title: 'Gravity Sean’s Death Cards', rows: of(true, 'death').map(row) },
  ];
}

const HOW = {
  human: 'Clear the game once, on any difficulty.',
  sean: 'Clear the game on THE REAL EXPERIENCE or harder.',
  demon: `Clear the game ${DEMON_CLEARS} times on WEAKLING or THE REAL EXPERIENCE, or once on ARE YOU EVEN HUMAN?.`,
};

export function recordsOf(save: SaveData): Records {
  const open = unlocksOf(save);
  const c = save.clears;
  const all = c.weakling + c.real + c.human;
  const beastShelves = beasts(save);
  const listed = beastShelves.flatMap((s) => s.rows);
  const cardShelves = cards(save);
  const opened: Record<CharacterId, boolean> = { adventurer: true, spacesuit: open.sean, demon: open.demon };
  const how: Record<CharacterId, string> = { adventurer: '', spacesuit: HOW.sean, demon: HOW.demon };
  return {
    ledger: ledger(save),
    beasts: beastShelves,
    kills: sumOf(save.stats.kills),
    kinds: listed.length,
    slain: listed.filter((r) => r.kills > 0).length,
    cards: cardShelves,
    taken: sumOf(save.stats.cards),
    found: CARD_KINDS.filter((k) => (save.stats.cards[k] ?? 0) > 0).length,
    deck: CARD_KINDS.length,
    roster: ROSTER.map((r) => ({ id: r.id, name: r.name, runs: save.stats.runs[r.id] ?? 0, open: opened[r.id], how: opened[r.id] ? '' : how[r.id] })),
    unlocks: [
      { name: 'ARE YOU EVEN HUMAN?', open: open.human, how: HOW.human, have: open.human ? 1 : Math.min(all, 1), need: 1 },
      { name: 'Gravity Sean', open: open.sean, how: HOW.sean, have: open.sean ? 1 : Math.min(c.real + c.human, 1), need: 1 },
      { name: 'The Demon', open: open.demon, how: HOW.demon, have: open.demon ? DEMON_CLEARS : Math.min(c.weakling + c.real, DEMON_CLEARS), need: DEMON_CLEARS },
    ],
  };
}
