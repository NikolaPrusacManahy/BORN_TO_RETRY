// Update 0.3.45 — the frame-rate counter's key (input/fpsKey.ts): pressed, the counter shows or hides, kept in the save.
// Not while typing, and not while a key is being chosen (the Options rows catch that press first and stop it).
import { useEffect } from 'react';
import type { Settings } from '../state/settings';
import { togglesFps } from '../input/fpsKey';

export function useFpsKey(dev: boolean, settings: Settings, onToggle: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!togglesFps(e.code, e.repeat, settings.fpsKey, settings.bindings, dev)) return;
      e.preventDefault();
      onToggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dev, settings, onToggle]);
}
