// Update 0.3.12 — the dev keys (dev builds), moved out of App.tsx (it had grown to its size; no change in behaviour):
// F1 / ` the tuning panel, F2 the debug overlay, F3 back to the start (Retry on the death screen), F4 invincible, F9 the
// Feel Lab, F8 the Lab's panel.
// Update 0.3.37 — F7 (or \) the capture kit; while it's on, its keys are its (engine/capture/capture.ts).
import { MutableRefObject, useEffect } from 'react';
import type { Game } from '../engine/Game';
import { devKeyAction } from '../state/devTools';
import { capture } from '../engine/capture/capture';
import { LAB } from '../tuning/lab';
import { setKnob } from '../tuning/schema';
import type { LabDock } from './useLabDock';

export interface DevKeys {
  dev: boolean;
  getGame(): Game | null;
  /** The App's phase, as it is now. */
  phase: MutableRefObject<string>;
  tuning: MutableRefObject<boolean>;
  setTuningOpen(open: boolean): void;
  toggleDebug(): void;
  lab: LabDock;
  retry(): void;
}

export function useDevKeys({ dev, getGame, phase, tuning, setTuningOpen, toggleDebug, lab, retry }: DevKeys) {
  useEffect(() => {
    if (!dev) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'TEXTAREA') return;
      if (capture.key(e.code, e.repeat)) {
        e.preventDefault();
        if (capture.takeBoss() && phase.current === 'playing') getGame()?.restart(true);
        return;
      }
      const action = devKeyAction(e.code);
      if (!action || e.repeat) return;
      e.preventDefault();
      if (action === 'tuning') setTuningOpen(!tuning.current);
      else if (action === 'debug') toggleDebug();
      else if (action === 'respawn' && phase.current === 'dead') retry();
      else if (action === 'respawn' && phase.current !== 'intro' && phase.current !== 'confirm' && phase.current !== 'records') getGame()?.restart();
      else if (action === 'god') setKnob(LAB, 'god', LAB.v.god >= 1 ? 0 : 1);
      else if (action === 'capture') capture.toggle();
      else if (action === 'lab') getGame()?.toggleLab();
      else if (action === 'labPanel' && (phase.current === 'playing' || lab.ref.current)) lab.setPanel(!lab.ref.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dev, getGame, phase, tuning, setTuningOpen, toggleDebug, lab.ref, lab.setPanel, retry]);
}
