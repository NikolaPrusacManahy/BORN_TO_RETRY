// Update 0.2.9 — what the lobby's boards say (hallDressing.ts places them): over the main gate, your difficulty and your
// character (the designer: "The main gate should display the settings of the player, difficulty and current character
// choice"); over each altar, its difficulty (lit when it's yours); on the south wall, the credits. Lines as text, a size
// (a share of the board's height) and a tone; engine/lobby/boardsView.ts paints them, tools/blender/render_dungeon.py
// writes them in its previews. Pure.
// Update 0.3.21 — the manor (MD/LOBBY_MANOR_PLAN.md): each floor's painting (its number and name, till 0.3.23 paints its
// picture), each bestiary row's floor (its name; COMING SOON where it has none of its own yet); the credits upstairs.
import { collection } from '../../sim/lobby/collection';
import { DIFFICULTIES, Difficulty, difficultyName } from '../../sim/lobby/difficulty';
import { floorName } from '../dungeon/floorNames';
import { CREDITS } from './credits';
import type { Board } from './hallDressing';

/** 'gold': lit (yours, a title); 'text': plain; 'dim': not chosen. */
export type Tone = 'gold' | 'text' | 'dim';

export interface BoardLine {
  text: string;
  size: number;
  tone: Tone;
}

/** The floors with none of their own in the bestiary yet. */
const EMPTY = new Set(collection().filter((s) => s.enemies.length === 0).map((s) => s.floor));

export function boardLines(b: Board, difficulty: Difficulty, character: string): BoardLine[] {
  if (b.kind === 'gate') {
    return [
      { text: difficultyName(difficulty), size: 0.4, tone: 'gold' },
      { text: character.toUpperCase(), size: 0.26, tone: 'text' },
    ];
  }
  if (b.kind === 'difficulty') {
    const d = DIFFICULTIES[b.index];
    return [{ text: d.name, size: 0.34, tone: d.id === difficulty ? 'gold' : 'dim' }];
  }
  if (b.kind === 'floor') {
    return [
      { text: String(b.index + 1), size: 0.42, tone: 'gold' },
      { text: floorName(b.index + 1), size: 0.13, tone: 'text' },
    ];
  }
  if (b.kind === 'row') {
    const floor = b.index + 1;
    const lines: BoardLine[] = [{ text: `${floor} · ${floorName(floor)}`, size: 0.36, tone: 'gold' }];
    if (EMPTY.has(floor)) lines.push({ text: 'COMING SOON', size: 0.24, tone: 'dim' });
    return lines;
  }
  const c = CREDITS[b.index];
  return [{ text: c.title, size: 0.13, tone: 'gold' }, ...c.lines.map((text): BoardLine => ({ text, size: 0.072, tone: 'text' }))];
}
