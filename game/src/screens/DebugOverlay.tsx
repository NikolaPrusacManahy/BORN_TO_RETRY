// M1 — the F2 debug overlay (dev build only): FPS, a frame-time graph of the last 2 s, the worst frame, and
// movement state. It runs its own loop and writes straight to the DOM, so React never re-renders per frame.
import { useEffect, useRef } from 'react';
import type { Game } from '../engine/Game';

const W = 240;
const H = 70;
/** Frame-time scale of the graph (ms at the top). */
const GRAPH_MS = 33;

export function DebugOverlay({ getGame }: { getGame(): Game | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let raf = 0;
    let textTimer = 0;
    let last = performance.now();
    let median = 0; // refreshed with the text: sorting every frame would make garbage
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const game = getGame();
      const g = canvas.current?.getContext('2d');
      if (!game || !g) return;
      const s = game.stats;
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(0, H - (median / GRAPH_MS) * H, W, 1);
      g.fillStyle = 'rgba(255,90,40,0.35)';
      g.fillRect(0, H - ((median * 2) / GRAPH_MS) * H, W, 1); // the hitch line: twice the normal frame
      const n = Math.min(s.count, W);
      for (let i = 0; i < n; i++) {
        const ms = s.recent(i);
        const h = Math.min(H, (ms / GRAPH_MS) * H);
        g.fillStyle = ms > median * 2 ? '#ff5a28' : '#7fe0a0';
        g.fillRect(W - 1 - i, H - h, 1, h);
      }
      textTimer -= now - last;
      last = now;
      if (textTimer > 0 || !text.current) return;
      textTimer = 120;
      median = s.median();
      const d = game.debug;
      text.current.textContent = [
        `${s.fps().toFixed(0)} fps · ${median.toFixed(2)} ms · worst ${s.worst().toFixed(1)} ms`,
        `ticks/frame ${s.steps} · dropped ${s.dropped}`,
        `speed ${d.speed.toFixed(1)} m/s · vy ${d.vSpeed.toFixed(1)}`,
        `${d.mode} · dash ${d.dashCharges.toFixed(2)} · wall jumps ${d.wallJumpsLeft}`,
        `raw mouse ${d.rawInput ? 'yes' : 'no'} · fullscreen ${d.fullscreen ? 'yes' : 'no'} · kb lock ${d.keyboardLock ? 'yes' : 'no'}`,
      ].join('\n');
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [getGame]);

  return (
    <div className="rb-debug">
      <canvas ref={canvas} width={W} height={H} />
      <pre ref={text} />
    </div>
  );
}
