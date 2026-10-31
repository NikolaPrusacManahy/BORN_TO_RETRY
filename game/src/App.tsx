// M1 — the Feel Lab shell: playing ⇄ paused, plus the dev panels (F1 tuning, F2 debug, F3 back to start).
// Opening the tuning panel frees the mouse without pausing.
// Update 0.0.4 — opens on the main menu. Start locks the mouse and opens the gate; it fades to black, then the
// black fades off the lab. The pause menu can go back to the main menu.
// M1 step 8 — dying fades to black too, and the black clears when you're back at the start. F4: invincible.
// Update 0.0.7 — Settings fades through black to the night camp (the settings screen, controls included); Back
// fades back to the gate.
// Update 0.0.8 — Start opens the gate onto the prison corridor, the character select. Play locks the mouse (its click
// is the gesture browsers need) and fades into the lab; Esc fades back to the gate.
// Update 0.0.19 — the Lab (dev builds): the main menu's Lab fades straight into it; F8 there opens its panel (the
// mouse freed, the world held still); a pick closes it (shift keeps it open); Esc closes it before it pauses.
// Update 0.1.14 — dead in the dungeon, the death screen over the black (the mouse freed): Retry is a new run, Menu the
// main menu. The Lab's panel moved to screens/useLabDock.tsx.
// Update 0.1.14 — going into a run moved to screens/useRunStart.ts; after the character select, the loader (the logo's
// retry arrow) bottom right on the black while the level loads.
// Update 0.2.9 — the character select is gone (the designer: "scrap it"): Start locks the mouse and the gate opens onto
// the lobby, a hall you walk round (its own phases: walking, paused, asked at its main gate). Its altars and dais
// choose your difficulty and character (saved); its main gate asks your difficulty's questions (useLobbyGate.ts,
// GateConfirm.tsx), then the run starts with the loader as before.
// Update 0.2.12 — the boot screens over the main menu first (CreditIntro.tsx: the studio's logo, the tips; the menu
// waits for them).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuView } from './engine/Game';
import { CAMP_FADE } from './engine/menu/campScene';
import { INTRO } from './engine/menu/introTimeline';
import { HEALTH } from './tuning/health';
import { LAB } from './tuning/lab';
import { setKnob } from './tuning/schema';
import { CampMenu } from './screens/CampMenu';
import { GameHandle, GameView } from './screens/GameView';
import { GateConfirm } from './screens/GateConfirm';
import { useLobbyGate } from './screens/useLobbyGate';
import { MainMenu } from './screens/MainMenu';
import { PauseMenu } from './screens/PauseMenu';
import { DeathScreen } from './screens/DeathScreen';
import type { DeathInfo } from './engine/runLinks';
import { TuningPanel } from './screens/TuningPanel';
import { useLabDock } from './screens/useLabDock';
import { useRunStart } from './screens/useRunStart';
import { RunLoader } from './screens/RetryArrow';
import { useMusic } from './screens/useMusic';
import { DebugOverlay } from './screens/DebugOverlay';
import { CreditIntro } from './screens/CreditIntro';
import { Settings, loadSave, writeSave } from './state/settings';
import { devKeyAction, devToolsEnabled } from './state/devTools';

/** Update 0.2.9 — 'lobby': walking round the lobby; 'lobbyPaused': its pause menu; 'confirm': its gate's questions. */
type Phase = 'menu' | 'intro' | 'lobby' | 'lobbyPaused' | 'confirm' | 'playing' | 'paused' | 'dead';

/** How long the black takes to clear off the lab (s). */
const FADE_OUT = 0.5;

export default function App() {
  const [save, setSave] = useState(loadSave);
  /** Update 0.2.12 — the boot screens (the studio's logo, the tips) are up. */
  const [credits, setCredits] = useState(true);
  const [phase, setPhase] = useState<Phase>('menu');
  const [ready, setReady] = useState(false);
  /** The fade to black: how long it takes to go black (s), or null when clear. */
  const [black, setBlack] = useState<number | null>(null);
  const [tuning, setTuning] = useState(false);
  const [debug, setDebug] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>('gate');
  /** Update 0.1.14 — what the death screen shows. */
  const [death, setDeath] = useState<DeathInfo | null>(null);
  /** Going between the gate and the camp: the screen is fading to black. */
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef(0);
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
  /** Update 0.0.19 — the Lab's panel (useLabDock.tsx). */
  const lab = useLabDock(getGame, go);

  /** Into a run (useRunStart.ts): the black clears, playing or paused. */
  const enterRun = useCallback(
    (locked: boolean) => {
      setBlack(null);
      setMenuView('gate');
      go(locked ? 'playing' : 'paused');
    },
    [go],
  );
  const run = useRunStart(getGame, setBlack, enterRun, FADE_OUT);
  /** Update 0.1.17 — the menus' music (useMusic.ts). */
  useMusic(phase, run.starting);
  /** Update 0.2.9 — the lobby's main gate and its questions (useLobbyGate.ts). */
  const gate = useLobbyGate(getGame, run, save, setSave, go);

  /** Back into play from the pause menu (the lobby's, or a run's). */
  const play = useCallback(async () => {
    const ok = await getGame()?.lock();
    const ph = phaseRef.current;
    if (ok) go(ph === 'lobbyPaused' || ph === 'lobby' ? 'lobby' : 'playing');
  }, [getGame, go]);

  /** Update 0.1.14 — the death screen: up over the black, the mouse freed. */
  const onDeathScreen = useCallback(
    (info: DeathInfo) => {
      setDeath(info);
      go('dead');
      getGame()?.unlock();
    },
    [getGame, go],
  );

  /** The death screen's Retry: a new run (it clears the black); if the browser won't lock the mouse yet, paused. */
  const retry = useCallback(() => {
    const g = getGame();
    if (!g) return;
    g.restart();
    void g.lock().then((ok) => go(ok ? 'playing' : 'paused'));
  }, [getGame, go]);

  /** Back to the main menu (the pause menu's, the death screen's). */
  const toMenu = useCallback(() => {
    getGame()?.toMenu();
    setBlack(null);
    setMenuView('gate');
    go('menu');
  }, [getGame, go]);

  /** Start: the mouse locked in its click or key (the lobby is walked in at once), the gate opening. */
  const start = useCallback(() => {
    const g = getGame();
    if (!g || phaseRef.current !== 'menu') return;
    go('intro');
    void g.lock();
    g.startIntro({ difficulty: save.difficulty, character: save.character });
  }, [getGame, go, save.difficulty, save.character]);

  /** Update 0.0.19 — the main menu's Lab: straight into the Lab. */
  const startLab = useCallback(() => {
    if (phaseRef.current === 'menu') run.startLab();
  }, [run.startLab]);

  /** Fade to black, swap the menu's scene (and run `then`), fade back in. */
  const switchMenu = useCallback(
    (to: MenuView, then?: () => void) => {
      if (switchTimer.current) return;
      setSwitching(true);
      setBlack(CAMP_FADE);
      switchTimer.current = window.setTimeout(() => {
        switchTimer.current = 0;
        getGame()?.showMenuView(to);
        setMenuView(to);
        then?.();
        setSwitching(false);
        setBlack(null);
      }, CAMP_FADE * 1000);
    },
    [getGame],
  );
  useEffect(() => () => window.clearTimeout(switchTimer.current), []);

  const onLockChange = useCallback(
    (locked: boolean) => {
      const ph = phaseRef.current;
      if (ph === 'menu' || ph === 'intro' || ph === 'confirm') return;
      // The lobby: Esc pauses it (not while the tuning panel has the mouse, nor once you're going through the gate).
      if (ph === 'lobby' || ph === 'lobbyPaused') {
        if (!run.busy.current) go(locked || tuningRef.current ? 'lobby' : 'lobbyPaused');
        return;
      }
      if (locked) go('playing');
      else if (!tuningRef.current && !lab.ref.current && ph === 'playing') go('paused');
    },
    [go, lab.ref, run.busy],
  );

  /** Through the gate: the lobby shows under the black (paused if the mouse isn't locked). */
  const onIntroDone = useCallback(() => {
    setMenuView('gate');
    setBlack(null);
    go(getGame()?.locked ? 'lobby' : 'lobbyPaused');
  }, [getGame, go]);

  const setTuningOpen = useCallback(
    (open: boolean) => {
      tuningRef.current = open;
      setTuning(open);
      if (open) getGame()?.unlock();
      else if (phaseRef.current === 'playing' || phaseRef.current === 'lobby') void play();
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
      else if (action === 'respawn' && phaseRef.current === 'dead') retry();
      else if (action === 'respawn' && phaseRef.current !== 'intro' && phaseRef.current !== 'confirm') getGame()?.restart();
      else if (action === 'god') setKnob(LAB, 'god', LAB.v.god >= 1 ? 0 : 1);
      else if (action === 'lab') getGame()?.toggleLab();
      else if (action === 'labPanel' && (phaseRef.current === 'playing' || lab.ref.current)) lab.setPanel(!lab.ref.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dev, getGame, setTuningOpen, lab.ref, lab.setPanel, retry]);

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
  const inGame = phase === 'playing' || phase === 'paused';
  const paused = phase === 'paused' || phase === 'lobbyPaused';
  return (
    <GameView
      ref={view}
      settings={save.settings}
      showHud={inGame}
      onLockChange={onLockChange}
      onIntroFade={() => setBlack(INTRO.fade)}
      onIntroDone={onIntroDone}
      onRunStart={run.onRunStart}
      onDeath={() => setBlack(HEALTH.v.deathFade)}
      onRespawn={() => setBlack(null)}
      onDeathScreen={onDeathScreen}
      onLobbyPick={gate.onPick}
      onLobbyGate={gate.onGate}
      onReady={() => setReady(true)}
    >
      {onMenu && menuView === 'gate' && !tuning && <MainMenu ready={ready && !credits} leaving={phase === 'intro' || switching || run.starting} onStart={start} onSettings={() => switchMenu('camp')} onLab={dev ? startLab : undefined} />}
      {phase === 'menu' && menuView === 'camp' && !tuning && (
        <CampMenu
          settings={save.settings}
          fullscreen={fullscreen}
          leaving={switching}
          onChange={changeSettings}
          onFullscreen={() => void toggleFullscreen()}
          onBack={() => switchMenu('gate')}
        />
      )}
      {phase === 'confirm' && gate.ask && !tuning && <GateConfirm ask={gate.ask} onYes={gate.yes} onNo={gate.no} />}
      {paused && !tuning && (
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
          onMainMenu={toMenu}
        />
      )}
      <div className="rb-fade" style={{ opacity: black !== null ? 1 : 0, transitionDuration: `${black ?? FADE_OUT}s` }}>
        {run.loading && <RunLoader />}
      </div>
      {phase === 'dead' && death && !tuning && <DeathScreen info={death} onRetry={retry} onMenu={toMenu} />}
      {lab.panel(dev && !tuning)}
      {dev && tuning && <TuningPanel onClose={() => setTuningOpen(false)} />}
      {dev && debug && <DebugOverlay getGame={getGame} />}
      {credits && <CreditIntro onDone={() => setCredits(false)} />}
    </GameView>
  );
}
