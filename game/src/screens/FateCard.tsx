// Update 0.2.16 — a Fate Card's face (the deal screen's, the inventory's): its rarity's colour round a dark card, the
// rarity and the move it changes at the top, its mark in the middle on a glow, its name, what it does. And its back.
// Drawn in code (no art to load): the marks are simple line drawings, one a move.
import type { CardView } from '../engine/fateView';

/** Each move's mark (a 64 × 64 line drawing). */
const MARK: Record<string, string> = {
  Dash: 'M10 32h28M26 18l14 14-14 14M38 18l14 14-14 14',
  Slide: 'M8 44h34c8 0 12-6 12-14M44 22l10 8-10 8M14 34l6-8',
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

export function FateMark({ move }: { move: string }) {
  return (
    <svg className="rb-card-mark" viewBox="0 0 64 64" aria-hidden>
      <path d={MARK[move] ?? MARK.Bonuses} />
    </svg>
  );
}

const RARITY_NAME: Record<string, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', mythic: 'Mythic' };

/** A card's face. */
export function FateCard({ card }: { card: CardView }) {
  return (
    <div className={`rb-card is-${card.rarity}`}>
      <div className="rb-card-top">
        <span>{RARITY_NAME[card.rarity]}</span>
        <span>{card.move}</span>
      </div>
      <div className="rb-card-art">
        <FateMark move={card.move} />
      </div>
      <div className="rb-card-name">{card.name}</div>
      <div className="rb-card-does">{card.does}</div>
    </div>
  );
}

/** A card's back (the deck, a card dealt face down). */
export function FateBack() {
  return (
    <div className="rb-card-back">
      <svg viewBox="0 0 64 64" aria-hidden>
        <path d="M32 6l26 26-26 26L6 32zM32 16l16 16-16 16-16-16zM32 26l6 6-6 6-6-6z" />
      </svg>
    </div>
  );
}
