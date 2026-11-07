// Update 0.5.2 — the lobby's records screen, woken (the designer: "press E near the screen and it becomes a computer desktop and you can follow your stats"; "desktop apps that matchs the vibes of the lobby
// designs"): the manor's own desktop, dark stone and brass, its apps as icons down the left, each opening a window you can drag by its title, a taskbar along the bottom with the open ones and the time.
// The Ledger opens with it. Esc or the power mark puts it to sleep again. Its size is the HUD's (`--rb-hud`: the same share of the screen at any size, times the UI size setting): everything in it is in em.
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SaveData } from '../../state/settings';
import { AppBody, APPS } from './RecordApps';
import { AppId, RecordIcon } from './recordIcons';
import { recordsOf } from './recordsData';

interface Win {
  app: AppId;
  x: number;
  y: number;
}

/** Its type's size at 1080p (px): the desktop's em. */
const EM = 19;
/** Where the n-th window opens, each a step on from the last (em). */
const FIRST = { x: 8, y: 1.6 };
const STEP = 1.6;
/** A window can't be dragged so far off that you can't get it back (em of its title bar kept on screen). */
const KEEP = 4;

/** The desktop's em now (px). */
function emNow(): number {
  if (typeof document === 'undefined') return EM;
  const k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rb-hud'));
  return EM * (Number.isFinite(k) && k > 0 ? k : 1);
}

const clockNow = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function Records({ save, onClose }: { save: SaveData; onClose(): void }) {
  const r = useMemo(() => recordsOf(save), [save]);
  // (Last is on top.)
  const em = useMemo(emNow, []);
  const [wins, setWins] = useState<Win[]>([{ app: 'ledger', x: FIRST.x * em, y: FIRST.y * em }]);
  const [clock, setClock] = useState(clockNow);
  const drag = useRef<{ app: AppId; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setClock(clockNow()), 10000);
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', key);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('keydown', key);
    };
  }, [onClose]);

  const raise = useCallback((app: AppId) => setWins((w) => [...w.filter((x) => x.app !== app), ...w.filter((x) => x.app === app)]), []);
  const open = useCallback(
    (app: AppId) =>
      setWins((w) => {
        if (w.some((x) => x.app === app)) return [...w.filter((x) => x.app !== app), ...w.filter((x) => x.app === app)];
        const k = w.length % 6;
        return [...w, { app, x: (FIRST.x + STEP * (k + 1)) * em, y: (FIRST.y + STEP * (k + 1)) * em }];
      }),
    [em],
  );
  const close = useCallback((app: AppId) => setWins((w) => w.filter((x) => x.app !== app)), []);

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, win: Win) => {
    raise(win.app);
    drag.current = { app: win.app, dx: e.clientX - win.x, dy: e.clientY - win.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const x = Math.min(window.innerWidth - KEEP * em, Math.max(KEEP * em - 20 * em, e.clientX - d.dx));
    const y = Math.min(window.innerHeight - 6 * em, Math.max(0, e.clientY - d.dy));
    setWins((w) => w.map((v) => (v.app === d.app ? { ...v, x, y } : v)));
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="rb-desk" role="dialog" aria-label="Records">
      <div className="rb-desk-mark" aria-hidden="true">
        <RecordIcon of="seal" size={8 * em} />
        <span>The Manor’s Records</span>
      </div>
      <nav className="rb-desk-icons">
        {APPS.map((a) => (
          <button className="rb-desk-icon" key={a.id} onClick={() => open(a.id)}>
            <RecordIcon of={a.id} size={2.3 * em} />
            <span>{a.name}</span>
          </button>
        ))}
      </nav>
      {wins.map((w, i) => {
        const app = APPS.find((a) => a.id === w.app)!;
        return (
          <section className={`rb-win${i === wins.length - 1 ? ' is-top' : ''}`} key={w.app} style={{ left: w.x, top: w.y, width: `${app.width}em`, zIndex: 10 + i }} onPointerDown={() => raise(w.app)}>
            <div className="rb-win-bar" onPointerDown={(e) => startDrag(e, w)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
              <RecordIcon of={w.app} size={1.15 * em} />
              <span className="rb-win-title">{app.name}</span>
              <button className="rb-win-close" aria-label={`Close ${app.name}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => close(w.app)}>
                ×
              </button>
            </div>
            <div className="rb-win-body">
              <AppBody app={w.app} r={r} />
            </div>
          </section>
        );
      })}
      <footer className="rb-desk-bar">
        <span className="rb-desk-start">
          <RecordIcon of="seal" size={1.2 * em} />
          Records
        </span>
        <span className="rb-desk-tasks">
          {wins.map((w) => (
            <button className={`rb-desk-task${w === wins[wins.length - 1] ? ' is-top' : ''}`} key={w.app} onClick={() => raise(w.app)}>
              {APPS.find((a) => a.id === w.app)!.name}
            </button>
          ))}
        </span>
        <span className="rb-desk-clock">{clock}</span>
        <button className="rb-desk-leave" onClick={onClose} aria-label="Leave the records">
          <RecordIcon of="leave" size={1.1 * em} />
          <span>
            Leave <kbd className="rb-cap">Esc</kbd>
          </span>
        </button>
      </footer>
    </div>
  );
}
