// Update 0.0.16 — the keys on screen (the designer: white and gold keys; at a chest, an interface to pick the key to
// use): the key icon in each key's colour (the white and gold keys glow blue and yellow), and in front of a chest the
// keys you carry in a row low in the middle, the one you'll use raised and lit.
import type { KeyKind } from '../sim/items/items';
import { KEY_KINDS } from '../sim/items/items';

const COLOUR: Record<KeyKind, string> = { key: '#c9a57a', whiteKey: '#eef3fa', goldKey: '#ffc23a' };

export function KeyIcon({ kind }: { kind: KeyKind }) {
  const c = COLOUR[kind];
  return (
    <svg viewBox="0 0 32 32" className={`rb-key-icon is-${kind}`}>
      <circle cx="9" cy="16" r="6" fill="none" stroke={c} strokeWidth="3.5" />
      <path d="M15 16h14M24 16v5M28 16v4" stroke={c} strokeWidth="3.5" fill="none" />
    </svg>
  );
}

export function KeyPicker({ counts, pick }: { counts: Record<KeyKind, number>; pick: KeyKind | '' }) {
  if (!pick) return null;
  return (
    <div className="rb-keys-pick">
      {KEY_KINDS.filter((k) => counts[k] > 0).map((k) => (
        <span key={k} className={`rb-keys-pick-slot${k === pick ? ' is-picked' : ''}`}>
          <KeyIcon kind={k} />
          {counts[k] > 1 && <span className="rb-keys-pick-n">{counts[k]}</span>}
        </span>
      ))}
    </div>
  );
}
