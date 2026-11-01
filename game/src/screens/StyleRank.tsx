// Update 0.3.4 — the style rank on the HUD (engine/styleMeter.ts; the designer: "make it look aggressive and very very
// matching the fast pace energy"): right of centre, a huge slanted letter in its rank's colour with a hard shadow and
// glow, its word on a black slash under it, a bar draining towards losing it, and the feed of what you just did
// slamming in beside it. A new rank slams in (big, turned, white-hot, then into place); from S up it trembles and splits
// in colour. Gone when there's nothing to show (theme-39-style.css).
import type { CSSProperties } from 'react';
import { RANKS } from '../engine/styleMeter';

interface Props {
  rank: number;
  fill: number;
  feed: readonly { id: number; text: string }[];
}

export function StyleRank({ rank, fill, feed }: Props) {
  if (rank < 0 && feed.length === 0) return null;
  const r = rank >= 0 ? RANKS[rank] : null;
  return (
    <div className={`rb-style is-r${rank}`} style={{ '--rank': r?.color ?? '#8a8580', '--fill': fill } as CSSProperties}>
      {r && (
        <div key={rank} className="rb-style-rank">
          <b className="rb-style-letter" data-text={r.letter}>
            {r.letter}
          </b>
          <span className="rb-style-word">{r.word}</span>
        </div>
      )}
      <i className="rb-style-bar">
        <i className="rb-style-bar-fill" />
      </i>
      <ul className="rb-style-feed">
        {feed.map((l) => (
          <li key={l.id}>+ {l.text}</li>
        ))}
      </ul>
    </div>
  );
}
