// Update 0.1.14 — the Lab's panel, moved out of App.tsx (it had grown past its size; no change in behaviour): opening
// frees the mouse and holds the world still; closing plays on; a pick closes it (shift keeps it open); Esc closes it
// before it pauses.
import { MutableRefObject, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '../engine/Game';
import type { LabCommand } from '../sim/lab/labCommands';
import { LAB } from '../tuning/lab';
import { setKnob } from '../tuning/schema';
import { LabPanel } from './LabPanel';

export interface LabDock {
  /** Open (the ref changes at once, before React re-renders). */
  ref: MutableRefObject<boolean>;
  setPanel(open: boolean): void;
  /** The panel, when it's open and `shown`. */
  panel(shown: boolean): ReactNode;
}

export function useLabDock(getGame: () => Game | null, go: (p: 'playing' | 'paused') => void): LabDock {
  const [open, setOpen] = useState(false);
  const ref = useRef(false);
  const [waves, setWaves] = useState(false);
  const [meter, setMeter] = useState(true);
  /** Re-draws the panel when invincibility is switched (it's a knob, not React state). */
  const [, setGodTick] = useState(0);

  const setPanel = useCallback(
    (on: boolean) => {
      const g = getGame();
      if (!g || (on && !g.lab)) return;
      ref.current = on;
      setOpen(on);
      g.setLabHold(on);
      if (on) {
        setWaves(g.labWavesOn);
        setMeter(g.labMeterOn);
        g.unlock();
        return;
      }
      // If the browser won't lock the mouse again yet, the pause menu's Resume will.
      void g.lock().then((ok) => go(ok ? 'playing' : 'paused'));
    },
    [getGame, go],
  );

  const command = useCallback(
    (cmd: LabCommand, stay: boolean) => {
      getGame()?.labCommand(cmd);
      if (!stay) setPanel(false);
    },
    [getGame, setPanel],
  );

  // Esc closes the panel first (the mouse is already free, so it reaches the page).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      setPanel(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setPanel]);

  const panel = (shown: boolean) =>
    shown &&
    open && (
      <LabPanel
        away={getGame()?.labAway ?? false}
        waves={waves}
        meter={meter}
        god={LAB.v.god >= 1}
        onCommand={command}
        onBossRoom={(kind) => {
          getGame()?.labBoss(kind);
          setPanel(false);
        }}
        onFloor={(floor) => {
          getGame()?.labFloor(floor);
          setPanel(false);
        }}
        onBack={() => {
          getGame()?.backToLab();
          setPanel(false);
        }}
        onWaves={() => {
          getGame()?.setLabWaves(!waves);
          setWaves(!waves);
        }}
        onMeter={() => {
          getGame()?.setLabMeter(!meter);
          setMeter(!meter);
        }}
        onGod={() => {
          setKnob(LAB, 'god', LAB.v.god >= 1 ? 0 : 1);
          setGodTick((t) => t + 1);
        }}
      />
    );

  return { ref, setPanel, panel };
}
