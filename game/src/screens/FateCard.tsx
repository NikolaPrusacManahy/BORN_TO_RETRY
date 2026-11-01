// Update 0.2.16 — a Fate Card's face (the deal screen's, the inventory's): its rarity's colour round a dark card, the
// rarity and the move it changes at the top, its mark in the middle on a glow, its name, what it does. And its back.
// Drawn in code (no art to load): the marks are simple line drawings, one a move (Update 0.2.20: ui/cardMarks.ts).
// Update 0.2.19 (the designer: "change the cards design so they look a bit different from the Fate cards") — a Death
// Card's: black, a cracked bone frame, a sickly green glow, a skull behind its mark, "Death"; a Traitor Card's: split
// gold and purple, "Traitor", its gift in gold, its price in red. All share the one back: the deal's flip is the reveal.
// Update 0.2.22 — a card as II: a gold edge inside its frame.
import type { CardView } from '../engine/fateView';
import { markOf, SKULL } from '../ui/cardMarks';

export function FateMark({ move }: { move: string }) {
  return (
    <svg className="rb-card-mark" viewBox="0 0 64 64" aria-hidden>
      <path d={markOf(move)} />
    </svg>
  );
}

const RARITY_NAME: Record<string, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', mythic: 'Mythic' };

/** A card's face (Update 0.2.19 — a Fate, a Traitor or a Death Card's). */
export function FateCard({ card }: { card: CardView }) {
  const fate = card.family === 'fate';
  const label = fate ? RARITY_NAME[card.rarity] : card.family === 'death' ? 'Death' : 'Traitor';
  return (
    <div className={`rb-card ${fate ? `is-${card.rarity}` : `is-${card.family}`}${card.ii ? ' is-ii' : ''}`}>
      <div className="rb-card-top">
        <span>{label}</span>
        <span>{card.move}</span>
      </div>
      <div className="rb-card-art">
        {card.family === 'death' && (
          <svg className="rb-card-skull" viewBox="0 0 64 64" aria-hidden>
            <path d={SKULL} />
          </svg>
        )}
        <FateMark move={card.move} />
      </div>
      <div className="rb-card-name">{card.name}</div>
      <div className="rb-card-does">{card.does}</div>
      {card.cost && <div className="rb-card-cost">{card.cost}</div>}
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
