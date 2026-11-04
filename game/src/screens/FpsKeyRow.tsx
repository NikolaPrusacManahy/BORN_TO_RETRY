// Update 0.3.45 — Options → Graphics, under Frame rate: the key that shows the frame-rate counter (F2 by default). Click
// it, press a key; Esc cancels. A key a control already uses (or Esc, the system's or the browser's own) isn't taken:
// it keeps listening.
import { useEffect, useState } from 'react';
import type { Bindings } from '../input/bindings';
import { fpsKeyAllowed } from '../input/fpsKey';
import { keyLabel } from '../input/keyLabel';

interface Props {
  value: string;
  bindings: Bindings;
  onChange(code: string): void;
}

export function FpsKeyRow({ value, bindings, onChange }: Props) {
  const [listening, setListening] = useState(false);
  useEffect(() => {
    if (!listening) return;
    // Caught first and stopped, so the menus, the game and the counter's own key never see it.
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.code === 'Escape') setListening(false);
      else if (fpsKeyAllowed(e.code, bindings)) {
        onChange(e.code);
        setListening(false);
      }
    };
    const id = window.setTimeout(() => window.addEventListener('keydown', onKey, true));
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [listening, bindings, onChange]);
  return (
    <div className="rb-toggle">
      <span>Show FPS</span>
      <button type="button" className={`rb-bind-key${listening ? ' is-listening' : ''}`} onClick={() => setListening(!listening)}>
        {listening ? '…' : keyLabel(value)}
      </button>
    </div>
  );
}
