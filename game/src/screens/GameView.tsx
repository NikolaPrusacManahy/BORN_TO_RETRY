// M1 — hosts the Three.js Game and the HUD. Rapier loads first; the Game is built once it's ready.
// Update 0.0.4 — ready once the main menu's scene has loaded too; the HUD only shows in play.
// M1 step 8 — passes the death and respawn calls through. Update 0.0.8 — and the run's start. Update 0.1.14 — and the
// death screen's. Update 0.2.9 — and the lobby's (a choice made, the main gate reached). Update 0.2.16 — and the Fate
// Cards' (a deal, TAB).
import { ReactNode, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Game, GameCallbacks } from '../engine/Game';
import { createHudStore } from '../engine/hudStore';
import { initPhysics } from '../physics/rapierWorld';
import type { Settings } from '../state/settings';
import { Hud } from './Hud';

export interface GameHandle {
  /** The running game, or null while Rapier is still loading. */
  game(): Game | null;
}

interface Props extends GameCallbacks {
  settings: Settings;
  showHud: boolean;
  onReady(): void;
  children?: ReactNode;
}

export const GameView = forwardRef<GameHandle, Props>(function GameView({ settings, showHud, onLockChange, onIntroFade, onIntroDone, onRunStart, onDeath, onRespawn, onDeathScreen, onLobbyPick, onLobbyGate, onDeal, onInventory, onReady, children }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const hud = useMemo(() => createHudStore(), []);
  const cbs = useRef({ onLockChange, onIntroFade, onIntroDone, onRunStart, onDeath, onRespawn, onDeathScreen, onLobbyPick, onLobbyGate, onDeal, onInventory, onReady, settings });
  cbs.current = { onLockChange, onIntroFade, onIntroDone, onRunStart, onDeath, onRespawn, onDeathScreen, onLobbyPick, onLobbyGate, onDeal, onInventory, onReady, settings };

  useEffect(() => {
    let disposed = false;
    void initPhysics().then(async () => {
      if (disposed || !host.current) return;
      const callbacks: GameCallbacks = {
        onLockChange: (l) => cbs.current.onLockChange(l),
        onIntroFade: () => cbs.current.onIntroFade(),
        onIntroDone: () => cbs.current.onIntroDone(),
        onRunStart: (l) => cbs.current.onRunStart(l),
        onDeath: () => cbs.current.onDeath(),
        onRespawn: () => cbs.current.onRespawn(),
        onDeathScreen: (info) => cbs.current.onDeathScreen(info),
        onLobbyPick: (d, c, f) => cbs.current.onLobbyPick(d, c, f),
        onLobbyGate: () => cbs.current.onLobbyGate(),
        onDeal: (cards) => cbs.current.onDeal(cards),
        onInventory: () => cbs.current.onInventory(),
      };
      const g = new Game(host.current, cbs.current.settings, hud, callbacks);
      game.current = g;
      await g.menuLoaded;
      if (!disposed) cbs.current.onReady();
    });
    return () => {
      disposed = true;
      game.current?.dispose();
      game.current = null;
    };
  }, [hud]);

  useEffect(() => game.current?.setSettings(settings), [settings]);

  useImperativeHandle(ref, () => ({ game: () => game.current }), []);

  return (
    <div className="rb-game" ref={host}>
      {showHud && <Hud store={hud} />}
      {children}
    </div>
  );
});
