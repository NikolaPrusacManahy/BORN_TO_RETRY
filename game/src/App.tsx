// M1 — the Feel Lab shell: playing ⇄ paused, plus the dev panels (F1 tuning, F2 debug, F3 back to start).
// Opening the tuning panel frees the mouse without pausing.
// Update 0.0.4 — opens on the main menu. Start locks the mouse and opens the gate; it fades to black, then the
// black fades off the lab. The pause menu can go back to the main menu.
import { useCallback, useEffect, useRef, useState } from 'react';
import { INTRO } from './engine/menu/introTimeline';
import { GameHandle, GameView } from './screens/GameView';
import { MainMenu } from './screens/MainMenu';
import { PauseMenu } from './screens/PauseMenu';
import { TuningPanel } from './screens/TuningPanel';
import { DebugOverlay } from './screens/DebugOverlay';
import { Settings, loadSave, writeSave } from './state/settings';
import { devKeyAction, devToolsEnabled } from './state/devTools';

type Phase = 'menu' | 'intro' | 'playing' | 'paused';

/** How long the black takes to clear off the lab (s). */
const FADE_OUT = 0.5;

export default function App() {
  const [save, setSave] = useState(loadSave);
  const [phase, setPhase] = useState<Phase>('menu');
  const [ready, setReady] = useState(false);
  const [black, setBlack] = useState(false);
  const [tuning, setTuning] = useState(false);
  const [debug, setDebug] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const view = useRef<GameHandle>(null);
  const tuningRef = useRef(false);
  const phaseRef = useRef<Phase>('menu');
  const dev = devToolsEnabled(import.meta.env.DEV);
  const getGame = useCallback(() => view.current?.game() ?? null, []);
  // The ref changes at once: a lock change can land before React re-renders.
  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const play = useCallback(async () => {
    const ok = await getGame()?.lock();
    if (ok) go('playing');
  }, [getGame, go]);

  const start = useCallback(() => {
    const g = getGame();
    if (!g || phaseRef.current !== 'menu') return;
    go('intro');
    // Lock now, inside the click / key press (browsers require one); the gate opening ignores the mouse.
    void g.lock();
    g.startIntro();
  }, [getGame, go]);

  const onLockChange = useCallback(
    (locked: boolean) => {
      const ph = phaseRef.current;
      if (ph === 'menu' || ph === 'intro') return;
      if (locked) go('playing');
      else if (!tuningRef.current && ph === 'playing') go('paused');
    },
    [go],
  );

  const onIntroDone = useCallback(
    (locked: boolean) => {
      setBlack(false);
      go(locked ? 'playing' : 'paused');
    },
    [go],
  );

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
      else if (action === 'respawn' && phaseRef.current !== 'intro') getGame()?.restart();
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
    if (st) setFullscreen(st.fullscreen);
  };

  const onMenu = phase === 'menu' || phase === 'intro';
  return (
    <GameView
      ref={view}
      settings={save.settings}
      showHud={!onMenu}
      onLockChange={onLockChange}
      onIntroFade={() => setBlack(true)}
      onIntroDone={onIntroDone}
      onReady={() => setReady(true)}
    >
      {onMenu && !tuning && (
        <MainMenu
          ready={ready}
          leaving={phase === 'intro'}
          settings={save.settings}
          fullscreen={fullscreen}
          onChange={changeSettings}
          onStart={start}
          onFullscreen={() => void toggleFullscreen()}
        />
      )}
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
          onMainMenu={() => {
            getGame()?.toMenu();
            go('menu');
          }}
        />
      )}
      <div className="rb-fade" style={{ opacity: black ? 1 : 0, transitionDuration: `${black ? INTRO.fade : FADE_OUT}s` }} />
      {dev && tuning && <TuningPanel onClose={() => setTuningOpen(false)} />}
      {dev && debug && <DebugOverlay getGame={getGame} />}
    </GameView>
  );
}
