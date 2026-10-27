// M1 — hosts the Three.js Game and the HUD. Rapier loads first; the Game is built once it's ready.
// Update 0.0.4 — ready once the main menu's scene has loaded too; the HUD only shows in play.
// M1 step 8 — passes the death and respawn calls through. Update 0.0.8 — and the run's start.
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

export const GameView = forwardRef<GameHandle, Props>(function GameView({ settings, showHud, onLockChange, onIntroFade, onIntroDone, onRunStart, onDeath, onRespawn, onReady, children }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const hud = useMemo(() => createHudStore(), []);
  const cbs = useRef({ onLockChange, onIntroFade, onIntroDone, onRunStart, onDeath, onRespawn, onReady, settings });
  cbs.current = { onLockChange, onIntroFade, onIntroDone, onRunStart, onDeath, onRespawn, onReady, settings };

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
