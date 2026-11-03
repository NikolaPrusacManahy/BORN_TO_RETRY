// Update 0.2.20 — the cards' marks, shared by the cards on the page (screens/FateCard.tsx) and the shop's card painted in
// the world (engine/shopCardView.ts): simple line drawings on a 64 × 64 grid, one a move, and the Death Cards' skull.
// (Were in FateCard.tsx.)

/** Each move's mark (an SVG path). */
export const MARK: Record<string, string> = {
  Dash: 'M10 32h28M26 18l14 14-14 14M38 18l14 14-14 14',
  Slam: 'M32 6v32M20 26l12 14 12-14M8 54h48M14 46l-6 8M50 46l6 8',
  Fists: 'M18 28h28v18a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8zM18 28v-4a4 4 0 0 1 8 0v4M26 24a4 4 0 0 1 8 0v4M34 24a4 4 0 0 1 8 0v4M42 26a4 4 0 0 1 4 2',
  Weapons: 'M46 8h10v10L30 44l-10-10zM18 36l10 10M10 54l10-10M14 40l10 10',
  Executions: 'M32 8c-12 0-20 9-20 20 0 7 3 12 8 15v9h24v-9c5-3 8-8 8-15 0-11-8-20-20-20zM24 28h4M36 28h4M28 52v-6M36 52v-6',
  Bonuses: 'M32 6l7 17 18 1-14 12 5 18-16-10-16 10 5-18-14-12 18-1z',
  Body: 'M32 54L12 34a11 11 0 0 1 20-14 11 11 0 0 1 20 14z',
  Jump: 'M16 36l16-16 16 16M16 52l16-16 16 16M32 8v4',
  Kills: 'M32 8C24 22 16 30 16 40a16 16 0 0 0 32 0c0-10-8-18-16-32z',
  Coins: 'M32 8a24 24 0 1 0 0.1 0zM32 18a14 14 0 1 0 0.1 0z',
  Luck: 'M12 12h40v40H12zM22 22h.1M42 22h.1M32 32h.1M22 42h.1M42 42h.1',
};

/** A move's mark (Bonuses' star for one it doesn't know). */
export const markOf = (move: string) => MARK[move] ?? MARK.Bonuses;

/** A skull, behind a Death Card's mark. */
export const SKULL = 'M32 6c-14 0-24 10-24 23 0 8 4 14 10 17v10h28V46c6-3 10-9 10-17C56 16 46 6 32 6zM21 28a5 5 0 1 0 10 0 5 5 0 1 0-10 0zM33 28a5 5 0 1 0 10 0 5 5 0 1 0-10 0zM28 46v8M36 46v8';

/** Each rarity's colour on a card's frame (the page's: theme-33). */
export const RARITY_HEX: Record<string, string> = { common: '#9a9a9a', uncommon: '#3dff6a', rare: '#5c9dff', epic: '#c27aff', mythic: '#ff3a3a' };
