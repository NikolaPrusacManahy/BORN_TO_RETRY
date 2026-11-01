// Update 0.2.16 — what you carry (the designer: "Press TAB to display what does the player has currently equiped, like
// a invetory where they can inspect what they have on them"). The world blurred and held still behind: your Fate Cards
// small, the one you hover (the first, to start) shown whole beside them (the designer found a card grown in place cut
// off and over its neighbours: "little visual discomfort"), then your weapons and their uses, your rings, keys, the
// kill bonuses on, your health, armour, dashes and coins. The Inventory key (TAB) closes it and plays on; Esc closes
// it to the pause menu.
import { useEffect, useState } from 'react';
import type { CarriedView, InventoryView } from '../engine/fateView';
import { FateCard } from './FateCard';

interface Props {
  view: InventoryView;
  /** The Inventory key's code (KeyboardEvent.code). */
  closeKey: string;
  /** Closed: `play` (the key) plays on; else (Esc) to the pause menu. */
  onClose(play: boolean): void;
}

function List({ head, rows, unit }: { head: string; rows: CarriedView[]; unit?: string }) {
  if (rows.length === 0) return null;
  return (
    <section className="rb-inv-list">
      <h3>{head}</h3>
      {rows.map((r) => (
        <div key={r.name} className={`rb-inv-row${r.rarity ? ` is-${r.rarity}` : ''}`}>
          <b>{r.name}</b>
          <span className="rb-inv-n">{unit ? `${r.n} ${unit}` : r.n > 1 ? `×${r.n}` : ''}</span>
          <span className="rb-inv-does">{r.does}</span>
        </div>
      ))}
    </section>
  );
}

export function Inventory({ view, closeKey, onClose }: Props) {
  const [look, setLook] = useState(0);
  const shown = view.cards[Math.min(look, view.cards.length - 1)];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === closeKey || e.code === 'Tab') {
        e.preventDefault();
        onClose(true);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeKey, onClose]);

  return (
    <div className="rb-inv">
      <div className="rb-inv-panel">
        <section className="rb-inv-cards">
          <h3>Fate Cards</h3>
          {view.cards.length === 0 ? (
            <p className="rb-inv-none">None yet</p>
          ) : (
            <div className="rb-inv-grid">
              {view.cards.map((c, i) => (
                <div key={c.kind} className={`rb-inv-card${c === shown ? ' is-shown' : ''}`} onMouseEnter={() => setLook(i)}>
                  <FateCard card={c} />
                </div>
              ))}
            </div>
          )}
        </section>
        <div className="rb-inv-look">{shown && <FateCard card={shown} />}</div>
        <aside className="rb-inv-side">
          <section className="rb-inv-stats">
            <div>
              <b>{view.hp}</b>
              <span>/ {view.maxHp} health</span>
            </div>
            {view.shield > 0 && (
              <div>
                <b>{view.shield}</b>
                <span>armour</span>
              </div>
            )}
            <div>
              <b>{view.dashes}</b>
              <span>dashes</span>
            </div>
            <div>
              <b>{view.money}</b>
              <span>coins</span>
            </div>
          </section>
          {view.weapons.length > 0 && (
            <section className="rb-inv-list">
              <h3>Weapons</h3>
              {view.weapons.map((w, i) => (
                <div key={i} className={`rb-inv-row${w.inHand ? ' is-hand' : ''}`}>
                  <b>{w.name}</b>
                  <span className="rb-inv-n">{w.uses} uses</span>
                </div>
              ))}
            </section>
          )}
          <List head="Rings" rows={view.rings} />
          <List head="Keys" rows={view.keys} />
          <List head="Bonuses" rows={view.bonuses} unit="s" />
        </aside>
      </div>
    </div>
  );
}
