// M1 — hosts the Three.js Game and the HUD. Rapier loads first; the Game is built once it's ready.
import { ReactNode, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Game } from '../engine/Game';
import { createHudStore } from '../engine/hudStore';
import { RapierWorld, initPhysics } from '../physics/rapierWorld';
import type { Settings } from '../state/settings';
import { FEEL_LAB } from '../world/arenas/feelLab';
import { Hud } from './Hud';

export interface GameHandle {
  /** The running game, or null while Rapier is still loading. */
  game(): Game | null;
}

interface Props {
  settings: Settings;
  onLockChange(locked: boolean): void;
  onReady(): void;
  children?: ReactNode;
}

export const GameView = forwardRef<GameHandle, Props>(function GameView({ settings, onLockChange, onReady, children }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const hud = useMemo(() => createHudStore(), []);
  const cbs = useRef({ onLockChange, onReady, settings });
  cbs.current = { onLockChange, onReady, settings };

  useEffect(() => {
    let disposed = false;
    void initPhysics().then(() => {
      if (disposed || !host.current) return;
      game.current = new Game(host.current, cbs.current.settings, hud, { onLockChange: (l) => cbs.current.onLockChange(l) }, new RapierWorld(FEEL_LAB), FEEL_LAB);
      cbs.current.onReady();
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
      <Hud store={hud} />
      {children}
    </div>
  );
});
