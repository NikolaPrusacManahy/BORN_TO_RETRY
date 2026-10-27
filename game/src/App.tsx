// M1 — the Feel Lab shell: title card → playing ⇄ paused, plus the dev panels (F1 tuning, F2 debug,
// F3 back to start). Opening the tuning panel frees the mouse without pausing.
import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHandle, GameView } from './screens/GameView';
import { TitleCard } from './screens/TitleCard';
import { PauseMenu } from './screens/PauseMenu';
import { TuningPanel } from './screens/TuningPanel';
import { DebugOverlay } from './screens/DebugOverlay';
import { Settings, loadSave, writeSave } from './state/settings';
import { devKeyAction, devToolsEnabled } from './state/devTools';

type Phase = 'title' | 'playing' | 'paused';

export default function App() {
  const [save, setSave] = useState(loadSave);
  const [phase, setPhase] = useState<Phase>('title');
  const [ready, setReady] = useState(false);
  const [tuning, setTuning] = useState(false);
  const [debug, setDebug] = useState(false);
  const [fullscreen, setFullscreen] = useState({ on: false, keyboardLock: false });
  const view = useRef<GameHandle>(null);
  const tuningRef = useRef(false);
  const phaseRef = useRef<Phase>('title');
  phaseRef.current = phase;
  const dev = devToolsEnabled(import.meta.env.DEV);
  const getGame = useCallback(() => view.current?.game() ?? null, []);

  const play = useCallback(async () => {
    const ok = await getGame()?.lock();
    if (ok) setPhase('playing');
  }, [getGame]);

  const onLockChange = useCallback((locked: boolean) => {
    if (locked) setPhase('playing');
    else if (!tuningRef.current && phaseRef.current === 'playing') setPhase('paused');
  }, []);

  const setTuningOpen = useCallback(
    (open: boolean) => {
      tuningRef.current = open;
      setTuning(open);
      if (open) getGame()?.unlock();
      else if (phaseRef.current === 'playing') void play();
    },
    [getGame, play],
  );

  useEffect(() => {
    if (!dev) return;
    const onKey = (e: KeyboardEvent) => {
      const action = devKeyAction(e.code);
      if (!action || e.repeat) return;
      if ((e.target as HTMLElement | null)?.tagName === 'TEXTAREA') return;
      e.preventDefault();
      if (action === 'tuning') setTuningOpen(!tuningRef.current);
      else if (action === 'debug') setDebug((d) => !d);
      else if (action === 'respawn') getGame()?.restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dev, getGame, setTuningOpen]);

  const changeSettings = (settings: Settings) => {
    const next = { ...save, settings };
    setSave(next);
    writeSave(next);
  };

  const toggleFullscreen = async () => {
    const st = await getGame()?.toggleFullscreen();
    if (st) setFullscreen({ on: st.fullscreen, keyboardLock: st.keyboardLock });
  };

  return (
    <GameView ref={view} settings={save.settings} onLockChange={onLockChange} onReady={() => setReady(true)}>
      {phase === 'title' && !tuning && <TitleCard ready={ready} bindings={save.settings.bindings} onPlay={() => void play()} />}
      {phase === 'paused' && !tuning && (
        <PauseMenu
          settings={save.settings}
          fullscreen={fullscreen}
          onChange={changeSettings}
          onResume={() => void play()}
          onRestart={() => {
            getGame()?.restart();
            void play();
          }}
          onFullscreen={() => void toggleFullscreen()}
        />
      )}
      {dev && tuning && <TuningPanel onClose={() => setTuningOpen(false)} />}
      {dev && debug && <DebugOverlay getGame={getGame} />}
    </GameView>
  );
}
