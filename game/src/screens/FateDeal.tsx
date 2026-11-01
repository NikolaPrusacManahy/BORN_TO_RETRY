// Update 0.2.16 — the deal screen (the designer: "open a chest, blurry background, smoothly present the cards, they are
// appearing one by one, like a deck card would be... hoover with the mouse and it reveals it by sliding it up a bit so
// you can read the effect. when selecting one, it slides out and nice animation that make it smaller and drags toward
// the Player HUD"). The world blurred behind; a deck at the bottom deals the cards one by one, each flipping face up
// into a row low on the screen, the lower half (what it does) below the edge. Hovering one lifts it so it reads
// whole; a click takes it: it lifts out, shrinks and flies to your coins (the card pile there), and the others drop
// away. You must take one. The world holds still meanwhile (the run). Update 0.2.19 — a bound Death Card can't be
// taken alone (while there's another): it flies to the pile with whatever you take.
import { CSSProperties, useEffect, useRef, useState } from 'react';
import type { CardView } from '../engine/fateView';
import { FateBack, FateCard } from './FateCard';

/** When the first card leaves the deck (s), then each next; how long one takes to land; the chosen card's flight. */
const FIRST = 0.25;
const EACH = 0.2;
const LAND = 0.55;
const FLY_MS = 750;

interface Props {
  cards: CardView[];
  /** A card was clicked (take it now: the mouse is locked again from this click). */
  onPick(i: number): void;
  /** Its flight is over: play on. */
  onDone(): void;
}

export function FateDeal({ cards, onPick, onDone }: Props) {
  const [picked, setPicked] = useState(-1);
  const [dealt, setDealt] = useState(false);
  /** Each card's flight to the pile (the ones taken). */
  const [fly, setFly] = useState<{ x: number; y: number }[]>([]);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const mid = (cards.length - 1) / 2;
  // (Update 0.2.19 — a bound Death Card comes with whatever you take, and can't be taken alone while there's another.)
  const free = cards.some((c) => !c.bound);
  const taken = (i: number) => picked >= 0 && (i === picked || cards[i].bound);

  useEffect(() => {
    const t = window.setTimeout(() => setDealt(true), (FIRST + EACH * (cards.length - 1) + LAND) * 1000);
    return () => window.clearTimeout(t);
  }, [cards.length]);

  const pick = (i: number) => {
    if (!dealt || picked >= 0 || (free && cards[i].bound)) return;
    // To the card pile by your coins (your coins, before your first card).
    const to = (document.querySelector('.rb-hud-cards') ?? document.querySelector('.rb-hud-money'))?.getBoundingClientRect();
    const tx = to ? to.left + to.width / 2 : 90;
    const ty = to ? to.top + to.height / 2 : window.innerHeight - 160;
    setFly(
      cards.map((_, j) => {
        const from = slots.current[j]?.getBoundingClientRect();
        return from ? { x: tx - (from.left + from.width / 2), y: ty - (from.top + from.height / 2) } : { x: 0, y: 0 };
      }),
    );
    setPicked(i);
    onPick(i);
    window.setTimeout(onDone, FLY_MS);
  };

  return (
    <div className={`rb-fate${dealt ? '' : ' is-dealing'}${picked >= 0 ? ' is-done' : ''}`}>
      <div className="rb-fate-deck">
        <FateBack />
        <FateBack />
      </div>
      <div className="rb-fate-row">
        {cards.map((c, i) => (
          <div
            key={c.kind}
            ref={(el) => (slots.current[i] = el)}
            className={`rb-fate-slot${taken(i) ? ' is-picked' : picked >= 0 ? ' is-gone' : ''}${free && c.bound ? ' is-bound' : ''}`}
            style={{ '--fx': `${fly[i]?.x ?? 0}px`, '--fy': `${fly[i]?.y ?? 0}px` } as CSSProperties}
            onClick={() => pick(i)}
          >
            <div className="rb-fate-deal" style={{ '--dx': `${mid - i}`, animationDelay: `${FIRST + EACH * i}s`, animationDuration: `${LAND}s` } as CSSProperties}>
              <div className="rb-fate-front">
                <FateCard card={c} />
              </div>
              <div className="rb-fate-rear">
                <FateBack />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
