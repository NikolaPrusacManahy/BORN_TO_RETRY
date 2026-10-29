// Update 0.1.14 — going into a run, moved out of App.tsx (it had reached its size): Play on the character select, or the
// main menu's Lab, locks the mouse inside the click (browsers require one) and fades to black. From the character select
// the loader (RetryArrow.tsx) then shows bottom right while the level is built under the black, for at least LOAD_MIN,
// and the black clears with it (the designer: "a little 1s loading screen after selecting a character").
import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '../engine/Game';
import { PRISON } from '../engine/menu/prisonScene';
import type { CharacterId } from '../sim/characters';

/** The loader shows at least this long once it's black (s). **(placeholder)** */
export const LOAD_MIN = 1;

export interface RunStart {
  /** Play or Lab was pressed: until you're in, nothing else starts. */
  busy: MutableRefObject<boolean>;
  /** The screen it was pressed on slides away. */
  starting: boolean;
  /** The loader is up (until the black has cleared). */
  loading: boolean;
  playSelected(id: CharacterId): void;
  startLab(): void;
  /** The Game is in the run (its onRunStart). */
  onRunStart(locked: boolean): void;
}

/** `enter`: into the run (the black clears, playing or paused); `fadeOut`: how long the black takes to clear (s). */
export function useRunStart(getGame: () => Game | null, setBlack: (secs: number | null) => void, enter: (locked: boolean) => void, fadeOut: number): RunStart {
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  /** When the loader came up (ms; 0: no loader). */
  const loadFrom = useRef(0);
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
      setBlack(PRISON.fade);
      later(PRISON.fade, () => then(g));
    },
    [getGame, setBlack, later],
  );

  const playSelected = useCallback(
    (id: CharacterId) =>
      begin((g) => {
        loadFrom.current = performance.now();
        setLoading(true);
        // Built once the loader is on screen (it keeps turning while the level is built).
        requestAnimationFrame(() => later(0, () => g.startRun(id)));
      }),
    [begin, later],
  );

  const startLab = useCallback(() => begin((g) => g.startLab()), [begin]);

  const onRunStart = useCallback(
    (locked: boolean) => {
      const done = (lockedNow: boolean) => {
        busy.current = false;
        setStarting(false);
        enter(lockedNow);
      };
      if (!loadFrom.current) return done(locked);
      const left = Math.max(0, LOAD_MIN - (performance.now() - loadFrom.current) / 1000);
      loadFrom.current = 0;
      // (Esc meanwhile frees the mouse: then it's paused.)
      later(left, () => {
        done(document.pointerLockElement !== null);
        later(fadeOut, () => setLoading(false));
      });
    },
    [enter, later, fadeOut],
  );

  return { busy, starting, loading, playSelected, startLab, onRunStart };
}
