// Update 0.1.14 — going into a run, moved out of App.tsx (it had reached its size): Play on the character select, or the
// main menu's Lab, locks the mouse inside the click (browsers require one) and fades to black. From the character select
// the loader (RetryArrow.tsx) then shows bottom right while the level is built under the black, for at least LOAD_MIN,
// and the black clears with it (the designer: "a little 1s loading screen after selecting a character").
// Update 0.2.9 — the character select is gone: the lobby's main gate starts the run (on your difficulty).
// Update 0.3.23 — the loader is the Game's now, for every level (engine/levelLoad.ts: up till the level's models are in,
// at least its LOAD_MIN): here only the fade to black into it.
import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '../engine/Game';
import type { CharacterId } from '../sim/characters';
import type { Difficulty } from '../sim/lobby/difficulty';

/** The fade to black into a run (s). */
export const RUN_FADE = 0.45;

export interface RunStart {
  /** Through the lobby's gate, or Lab pressed: until you're in, nothing else starts. */
  busy: MutableRefObject<boolean>;
  /** The screen it was pressed on slides away. */
  starting: boolean;
  playSelected(id: CharacterId, difficulty: Difficulty, cards: boolean): void;
  startLab(): void;
  /** The Game is in the run (its onRunStart). */
  onRunStart(locked: boolean): void;
}

/** `enter`: into the run (the black clears off it, playing or paused: the Game's loader holds the screen till it's
 *  ready). */
export function useRunStart(getGame: () => Game | null, setBlack: (secs: number | null) => void, enter: (locked: boolean) => void): RunStart {
  const [starting, setStarting] = useState(false);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const later = useCallback((secs: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, secs * 1000));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /** Lock, fade to black, then `then` once it's black. */
  const begin = useCallback(
    (then: (g: Game) => void) => {
      const g = getGame();
      if (!g || busy.current) return;
      busy.current = true;
      setStarting(true);
      void g.lock();
      setBlack(RUN_FADE);
      later(RUN_FADE, () => then(g));
    },
    [getGame, setBlack, later],
  );

  const playSelected = useCallback((id: CharacterId, difficulty: Difficulty, cards: boolean) => begin((g) => g.startRun(id, difficulty, cards)), [begin]);

  const startLab = useCallback(() => begin((g) => g.startLab()), [begin]);

  const onRunStart = useCallback(
    (locked: boolean) => {
      busy.current = false;
      setStarting(false);
      enter(locked);
    },
    [enter],
  );

  return { busy, starting, playSelected, startLab, onRunStart };
}
