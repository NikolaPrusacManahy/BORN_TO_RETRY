// Update 0.2.16 — the Fate Card screens, out of App.tsx (it's near its size): a chest's deal (FateDeal.tsx) and what you
// carry on TAB (Inventory.tsx). Each frees the mouse while the world holds still (the run); freeing it doesn't pause
// (`ref`, which App's lock change reads). Taking a card locks the mouse again from that click; the Inventory key closes
// the inventory and plays on, Esc closes it to the pause menu.
import { MutableRefObject, ReactNode, useCallback, useRef, useState } from 'react';
import type { Game } from '../engine/Game';
import type { CardView, InventoryView } from '../engine/fateView';
import type { Settings } from '../state/settings';
import { FateDeal } from './FateDeal';
import { Inventory } from './Inventory';

export interface FateScreens {
  /** A screen is up (the ref changes at once, before React re-renders). */
  ref: MutableRefObject<boolean>;
  onDeal(cards: CardView[]): void;
  onInventory(): void;
  /** The screen that's up, when `shown`. */
  view(shown: boolean): ReactNode;
}

export function useFate(getGame: () => Game | null, go: (p: 'playing' | 'paused') => void, settings: Settings): FateScreens {
  const ref = useRef(false);
  const [deal, setDeal] = useState<CardView[] | null>(null);
  const [inv, setInv] = useState<InventoryView | null>(null);

  const onDeal = useCallback(
    (cards: CardView[]) => {
      ref.current = true;
      setDeal(cards);
      getGame()?.unlock();
    },
    [getGame],
  );

  const pick = useCallback(
    (i: number) => {
      const g = getGame();
      g?.pickCard(i);
      void g?.lock();
    },
    [getGame],
  );

  const dealDone = useCallback(() => {
    const g = getGame();
    g?.endDeal();
    ref.current = false;
    setDeal(null);
    // If the browser wouldn't lock the mouse again yet, the pause menu's Resume will.
    go(g?.locked ? 'playing' : 'paused');
  }, [getGame, go]);

  const onInventory = useCallback(() => {
    const g = getGame();
    const v = g?.inventory();
    if (ref.current || !g || !v) return;
    ref.current = true;
    g.holdInventory(true);
    setInv(v);
    g.unlock();
  }, [getGame]);

  const closeInventory = useCallback(
    (play: boolean) => {
      const g = getGame();
      g?.holdInventory(false);
      ref.current = false;
      setInv(null);
      if (play && g) void g.lock().then((ok) => go(ok ? 'playing' : 'paused'));
      else go('paused');
    },
    [getGame, go],
  );

  const view = (shown: boolean) => {
    if (!shown) return null;
    if (deal) return <FateDeal cards={deal} onPick={pick} onDone={dealDone} />;
    if (inv) return <Inventory view={inv} closeKey={settings.bindings.inventory} onClose={closeInventory} />;
    return null;
  };

  return { ref, onDeal, onInventory, view };
}
