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
// Update 0.3.12 — the pause menu pauses the game (no time passes); the dev keys moved to screens/useDevKeys.ts.
// Update 0.3.23 — the loader on black whenever a level's being made ready (the Game's onLoading: after Lab, after
// Start, a new floor, the Lab's floors, a Retry), clearing once it is.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuView } from './engine/Game';
import { CAMP_FADE } from './engine/menu/campScene';
import { INTRO } from './engine/menu/introTimeline';
import { HEALTH } from './tuning/health';
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
import { useFate } from './screens/useFate';
import { useRunStart } from './screens/useRunStart';
import { RunLoader } from './screens/RetryArrow';
import { useMusic } from './screens/useMusic';
import { DebugOverlay } from './screens/DebugOverlay';
import { FpsCounter } from './screens/FpsCounter';
import { useFpsKey } from './screens/useFpsKey';
import { CreditIntro } from './screens/CreditIntro';
import { Settings, loadSave, saveRunEnd, writeSave } from './state/settings';
import { unlocksOf } from './sim/unlocks';
import { setUiSize } from './ui/uiScale';
import { setBloodLevel } from './engine/bloodFx';
import { setEffectsLow } from './engine/effectsLevel';
import { setGlowOn } from './engine/halos';
import { devToolsEnabled } from './state/devTools';
import { useDevKeys } from './screens/useDevKeys';

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
  /** Update 0.3.23 — a level is being made ready: the loader covers the screen. */
  const [loading, setLoading] = useState(false);
  /** Going between the gate and the camp: the screen is fading to black. */
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef(0);
  const view = useRef<GameHandle>(null);
  const tuningRef = useRef(false);
  const phaseRef = useRef<Phase>('menu');
  const dev = devToolsEnabled(import.meta.env.DEV);
  const getGame = useCallback(() => view.current?.game() ?? null, []);
  // The ref changes at once: a lock change can land before React re-renders. (Update 0.3.12 — paused, the game waits.)
  const go = useCallback(
    (p: Phase) => {
      phaseRef.current = p;
      setPhase(p);
      getGame()?.setPaused(p === 'paused' || p === 'lobbyPaused');
    },
    [getGame],
  );
  /** Update 0.0.19 — the Lab's panel (useLabDock.tsx). */
  const lab = useLabDock(getGame, go);
  /** Update 0.2.16 — the Fate Cards' screens: a deal, TAB (useFate.tsx). */
  const fate = useFate(getGame, go, save.settings);

  /** Into a run (useRunStart.ts): the black clears, playing or paused. */
  const enterRun = useCallback(
    (locked: boolean) => {
      setBlack(null);
      setMenuView('gate');
      go(locked ? 'playing' : 'paused');
    },
    [go],
  );
  const run = useRunStart(getGame, setBlack, enterRun);
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

  /** A run's end, for good (Update 0.3.65: a death counted, Hellwarden's forged from them; Update 0.5.1: a win counted by
   *  its difficulty: sim/unlocks.ts). */
  const runEnded = useCallback((info: DeathInfo) => {
    setSave((old) => {
      const next = saveRunEnd(old, !!info.won, info.difficulty, info.lab);
      if (next !== old) writeSave(next);
      return next;
    });
  }, []);

  /** Update 0.1.14 — the death screen: up over the black, the mouse freed. */
  const onDeathScreen = useCallback(
    (info: DeathInfo) => {
      setDeath(info);
      runEnded(info);
      go('dead');
      getGame()?.unlock();
    },
    [getGame, go, runEnded],
  );

  /** Update 0.3.80 — in the Lab, played as Gravity Sean: he's yours on the dais too (Update 0.5.1 — a win it isn't). */
  const onSeanEarned = useCallback(() => {
    setSave((old) => {
      if (old.won) return old;
      const next = { ...old, won: true };
      writeSave(next);
      return next;
    });
  }, []);

  /** Update 0.3.70 — the Demon's yours, for good: since 0.5.1, only from the Lab's Play as (runs open it now: sim/unlocks.ts). */
  const onDemonEarned = useCallback(() => {
    setSave((old) => {
      if (old.demon) return old;
      const next = { ...old, demon: true };
      writeSave(next);
      return next;
    });
  }, []);

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
    // (Update 0.5.1 — what the save has opened.)
    const open = unlocksOf(save);
    g.startIntro({ difficulty: save.difficulty, character: save.character, cards: save.cards, demon: open.demon, won: open.sean, human: open.human });
  }, [getGame, go, save]);

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
      else if (!tuningRef.current && !lab.ref.current && !fate.ref.current && ph === 'playing') go('paused');
    },
    [go, lab.ref, fate.ref, run.busy],
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

  const toggleDebug = useCallback(() => setDebug((d) => !d), []);
  useDevKeys({ dev, getGame, phase: phaseRef, tuning: tuningRef, setTuningOpen, toggleDebug, lab, retry });

  const changeSettings = (settings: Settings) => {
    const next = { ...save, settings };
    setUiSize(settings.uiSize);
    setBloodLevel(settings.blood);
    setEffectsLow(settings.effects === 'low');
    setGlowOn(settings.glow);
    setSave(next);
    writeSave(next);
  };

  // (Update 0.3.45 — the frame-rate counter's key: F2, or the one chosen in Graphics.)
  useFpsKey(dev, save.settings, () => changeSettings({ ...save.settings, showFps: !save.settings.showFps }));

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
      onDeal={fate.onDeal}
      onInventory={fate.onInventory}
      onLoading={setLoading}
      onRunStart={run.onRunStart}
      onDeath={() => setBlack(HEALTH.v.deathFade)}
      onRespawn={() => setBlack(null)}
      onDeathScreen={onDeathScreen}
      onLobbyPick={gate.onPick}
      onDemonEarned={onDemonEarned}
      onSeanEarned={onSeanEarned}
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
      {fate.view(phase === 'playing' && !tuning)}
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
          averageFps={() => getGame()?.stats.averageFps() ?? 0}
        />
      )}
      <div className="rb-fade" style={{ opacity: black !== null || loading ? 1 : 0, transitionDuration: loading ? '0s' : `${black ?? FADE_OUT}s` }}>
        {loading && <RunLoader />}
      </div>
      {phase === 'dead' && death && !tuning && <DeathScreen info={death} onRetry={retry} onMenu={toMenu} />}
      {lab.panel(dev && !tuning)}
      {dev && tuning && <TuningPanel onClose={() => setTuningOpen(false)} />}
      {dev && debug && <DebugOverlay getGame={getGame} />}
      {save.settings.showFps && !onMenu && <FpsCounter getGame={getGame} />}
      {credits && <CreditIntro onDone={() => setCredits(false)} />}
    </GameView>
  );
}
