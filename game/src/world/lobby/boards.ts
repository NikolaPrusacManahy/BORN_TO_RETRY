// Update 0.2.9 — what the lobby's boards say (hallDressing.ts places them): over the main gate, your difficulty and your
// character (the designer: "The main gate should display the settings of the player, difficulty and current character
// choice"); over each altar, its difficulty (lit when it's yours); on the south wall, the credits. Lines as text, a size
// (a share of the board's height) and a tone; engine/lobby/boardsView.ts paints them, tools/blender/render_dungeon.py
// writes them in its previews. Pure.
import { DIFFICULTIES, Difficulty, difficultyName } from '../../sim/lobby/difficulty';
import { CREDITS } from './credits';
import type { Board } from './hallDressing';

/** 'gold': lit (yours, a title); 'text': plain; 'dim': not chosen. */
export type Tone = 'gold' | 'text' | 'dim';

export interface BoardLine {
  text: string;
  size: number;
  tone: Tone;
}

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
  const c = CREDITS[b.index];
  return [{ text: c.title, size: 0.13, tone: 'gold' }, ...c.lines.map((text): BoardLine => ({ text, size: 0.072, tone: 'text' }))];
}
