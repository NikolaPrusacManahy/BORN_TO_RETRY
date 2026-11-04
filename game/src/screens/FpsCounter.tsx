// Update 0.3.45 — the frame-rate counter players can show (F2 by default, its key in Options → Graphics; the designer:
// for a playtest of how the game runs on players' PCs). Top left, small: frames a second over the last second, and the
// slowest frame of the last two seconds. Its own loop writes the text a few times a second straight to the page, so
// nothing else redraws for it.
import { useEffect, useRef } from 'react';
import type { Game } from '../engine/Game';

/** How often its text changes (ms). */
const EVERY = 250;

export function FpsCounter({ getGame }: { getGame(): Game | null }) {
  const text = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < EVERY || !text.current) return;
      last = now;
      const s = getGame()?.stats;
      if (!s) return;
      text.current.textContent = `${s.fps().toFixed(0)} FPS · worst ${s.worst().toFixed(1)} ms`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getGame]);
  return <div ref={text} className="rb-fps" />;
}
