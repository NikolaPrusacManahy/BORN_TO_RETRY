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
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuView } from './engine/Game';
import { CAMP_FADE } from './engine/menu/campScene';
import { PRISON } from './engine/menu/prisonScene';
import { ROSTER, stepCell } from './sim/characters';
import { INTRO } from './engine/menu/introTimeline';
import { HEALTH } from './tuning/health';
import { LAB } from './tuning/lab';
import { setKnob } from './tuning/schema';
import { CampMenu } from './screens/CampMenu';
import { CharacterSelect } from './screens/CharacterSelect';
import { GameHandle, GameView } from './screens/GameView';
import { MainMenu } from './screens/MainMenu';
import { PauseMenu } from './screens/PauseMenu';
import { TuningPanel } from './screens/TuningPanel';
import { LabPanel } from './screens/LabPanel';
import type { LabCommand } from './sim/lab/labCommands';
import { DebugOverlay } from './screens/DebugOverlay';
import { Settings, loadSave, writeSave } from './state/settings';
import { devKeyAction, devToolsEnabled } from './state/devTools';

type Phase = 'menu' | 'intro' | 'select' | 'playing' | 'paused';

/** How long the black takes to clear off the lab (s). */
const FADE_OUT = 0.5;

export default function App() {
  const [save, setSave] = useState(loadSave);
  const [phase, setPhase] = useState<Phase>('menu');
  const [ready, setReady] = useState(false);
  /** The fade to black: how long it takes to go black (s), or null when clear. */
  const [black, setBlack] = useState<number | null>(null);
  const [tuning, setTuning] = useState(false);
  const [debug, setDebug] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>('gate');
  /** Going between the gate and the camp: the screen is fading to black. */
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef(0);
  /** Character select: the selected cell, and Play pressed (fading into the lab). */
  const [cell, setCell] = useState(0);
  const cellRef = useRef(0);
  const [startingRun, setStartingRun] = useState(false);
  const runTimer = useRef(0);
  /** Update 0.0.19 — the Lab's panel is open; the Lab's waves (shown on its panel). */
  const [labOpen, setLabOpen] = useState(false);
  const labRef = useRef(false);
  const [labWaves, setLabWaves] = useState(false);
  /** Re-draws the panel when invincibility is switched (it's a knob, not React state). */
  const [, setGodTick] = useState(0);
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
    g.startIntro();
  }, [getGame, go]);

  const stepSelect = useCallback(
    (step: number) => {
      const next = stepCell(cellRef.current, step);
      if (next === cellRef.current) return;
      cellRef.current = next;
      setCell(next);
      getGame()?.selectCell(next);
    },
    [getGame],
  );

  const playSelected = useCallback(() => {
    const g = getGame();
    const c = ROSTER[cellRef.current];
    if (!g || runTimer.current) return;
    if (!c.available) return g.rattleCell();
    setStartingRun(true);
    // Lock now, inside the click / key press (browsers require one); the fade ignores the mouse.
    void g.lock();
    setBlack(PRISON.fade);
    runTimer.current = window.setTimeout(() => {
      runTimer.current = 0;
      setStartingRun(false);
      g.startRun(c.id);
    }, PRISON.fade * 1000);
  }, [getGame]);
  useEffect(() => () => window.clearTimeout(runTimer.current), []);

  /** Update 0.0.19 — the main menu's Lab: lock now (inside the click), fade, into the Lab. */
  const startLab = useCallback(() => {
    const g = getGame();
    if (!g || runTimer.current || phaseRef.current !== 'menu') return;
    setStartingRun(true);
    void g.lock();
    setBlack(PRISON.fade);
    runTimer.current = window.setTimeout(() => {
      runTimer.current = 0;
      setStartingRun(false);
      g.startLab();
    }, PRISON.fade * 1000);
  }, [getGame]);

  /** Update 0.0.19 — the Lab's panel: opening frees the mouse and holds the world still; closing plays on. */
  const setLabPanel = useCallback(
    (open: boolean) => {
      const g = getGame();
      if (!g || (open && !g.lab)) return;
      labRef.current = open;
      setLabOpen(open);
      g.setLabHold(open);
      if (open) {
        setLabWaves(g.labWavesOn);
        g.unlock();
        return;
      }
      // If the browser won't lock the mouse again yet, the pause menu's Resume will.
      void g.lock().then((ok) => go(ok ? 'playing' : 'paused'));
    },
    [getGame, go],
  );

  const labCommand = useCallback(
    (cmd: LabCommand, stay: boolean) => {
      getGame()?.labCommand(cmd);
      if (!stay) setLabPanel(false);
    },
    [getGame, setLabPanel],
  );

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
      if (ph === 'menu' || ph === 'intro' || ph === 'select') return;
      if (locked) go('playing');
      else if (!tuningRef.current && !labRef.current && ph === 'playing') go('paused');
    },
    [go],
  );

  /** Through the gate: the corridor shows under the black. */
  const onIntroDone = useCallback(() => {
    cellRef.current = 0;
    setCell(0);
    setMenuView('prison');
    setBlack(null);
    go('select');
  }, [go]);

  const onRunStart = useCallback(
    (locked: boolean) => {
      setBlack(null);
      setMenuView('gate');
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
      else if (action === 'god') setKnob(LAB, 'god', LAB.v.god >= 1 ? 0 : 1);
      else if (action === 'lab') getGame()?.toggleLab();
      else if (action === 'labPanel' && (phaseRef.current === 'playing' || labRef.current)) setLabPanel(!labRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dev, getGame, setTuningOpen, setLabPanel]);

  // Update 0.0.19 — Esc closes the Lab's panel first (the mouse is already free, so it reaches the page).
  useEffect(() => {
    if (!labOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      setLabPanel(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [labOpen, setLabPanel]);

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
  return (
    <GameView
      ref={view}
      settings={save.settings}
      showHud={inGame}
      onLockChange={onLockChange}
      onIntroFade={() => setBlack(INTRO.fade)}
      onIntroDone={onIntroDone}
      onRunStart={onRunStart}
      onDeath={() => setBlack(HEALTH.v.deathFade)}
      onRespawn={() => setBlack(null)}
      onReady={() => setReady(true)}
    >
      {onMenu && menuView === 'gate' && !tuning && <MainMenu ready={ready} leaving={phase === 'intro' || switching || startingRun} onStart={start} onSettings={() => switchMenu('camp')} onLab={dev ? startLab : undefined} />}
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
      {phase === 'select' && !tuning && (
        <CharacterSelect
          index={cell}
          bindings={save.settings.bindings}
          leaving={switching || startingRun}
          onStep={stepSelect}
          onPlay={playSelected}
          onBack={() => switchMenu('gate', () => go('menu'))}
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
            setBlack(null);
            setMenuView('gate');
            go('menu');
          }}
        />
      )}
      <div className="rb-fade" style={{ opacity: black !== null ? 1 : 0, transitionDuration: `${black ?? FADE_OUT}s` }} />
      {dev && labOpen && !tuning && (
        <LabPanel
          away={getGame()?.labAway ?? false}
          waves={labWaves}
          god={LAB.v.god >= 1}
          onCommand={labCommand}
          onBossRoom={(kind) => {
            getGame()?.labBoss(kind);
            setLabPanel(false);
          }}
          onFloor={(floor) => {
            getGame()?.labFloor(floor);
            setLabPanel(false);
          }}
          onBack={() => {
            getGame()?.backToLab();
            setLabPanel(false);
          }}
          onWaves={() => {
            getGame()?.setLabWaves(!labWaves);
            setLabWaves(!labWaves);
          }}
          onGod={() => {
            setKnob(LAB, 'god', LAB.v.god >= 1 ? 0 : 1);
            setGodTick((t) => t + 1);
          }}
        />
      )}
      {dev && tuning && <TuningPanel onClose={() => setTuningOpen(false)} />}
      {dev && debug && <DebugOverlay getGame={getGame} />}
    </GameView>
  );
}
