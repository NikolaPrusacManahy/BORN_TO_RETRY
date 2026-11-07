// Update 0.5.2 — what each of the records desktop's apps shows inside its window (recordsData.ts has the words). The long ones, the Bestiary and the Deck, show one shelf at a time, picked from tabs
// along the top (the designer: "a bit cleaner please, a lot s impossible to even read").
import { useState } from 'react';
import type { CardShelf, BeastShelf, Records } from './recordsData';
import type { AppId } from './recordIcons';

const num = (n: number) => n.toLocaleString('en-US');

function Ledger({ r }: { r: Records }) {
  return (
    <div className="rb-app-ledger">
      {r.ledger.map((l) => (
        <div className="rb-app-stat" key={l.label}>
          <span className="rb-app-stat-label">{l.label}</span>
          <span className="rb-app-stat-value">{l.value}</span>
          {l.note && <span className="rb-app-stat-note">{l.note}</span>}
        </div>
      ))}
    </div>
  );
}

function Tabs({ tabs, at, pick }: { tabs: readonly string[]; at: number; pick(i: number): void }) {
  return (
    <div className="rb-app-tabs" role="tablist">
      {tabs.map((t, i) => (
        <button key={t} role="tab" aria-selected={i === at} className={`rb-app-tab${i === at ? ' is-on' : ''}`} onClick={() => pick(i)}>
          {t}
        </button>
      ))}
    </div>
  );
}

function Shelf({ title, count, children }: { title: string; count: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="rb-app-shelf">
        <span>{title}</span>
        <span>{count}</span>
      </h3>
      <div className="rb-app-rows">{children}</div>
    </section>
  );
}

/** A floor's tab: its number (Others: all else). */
const floorTab = (s: BeastShelf) => (s.title === 'Others' ? 'Others' : s.title.split(' · ')[0]);

function Bestiary({ r }: { r: Records }) {
  const [at, setAt] = useState(0);
  const s = r.beasts[Math.min(at, r.beasts.length - 1)];
  return (
    <div className="rb-app-list">
      <p className="rb-app-head">
        <b>{num(r.kills)}</b> killed · <b>{r.slain}</b> of {r.kinds} kinds
      </p>
      <Tabs tabs={r.beasts.map(floorTab)} at={at} pick={setAt} />
      {s && (
        <Shelf title={s.title} count={num(s.kills)}>
          {s.rows.map((b) => (
            <div className={`rb-app-row${b.kills === 0 ? ' is-none' : ''}`} key={b.kind}>
              <span className="rb-app-name">
                {b.name}
                {b.boss && <em className="rb-app-tag is-boss">Boss</em>}
              </span>
              <span className="rb-app-count">{b.kills > 0 ? num(b.kills) : '—'}</span>
            </div>
          ))}
        </Shelf>
      )}
    </div>
  );
}

/** A card shelf's tab: its family, Gravity Sean's marked. */
const cardTab = (s: CardShelf) => (s.title.startsWith('Gravity Sean') ? `Sean: ${s.title.split(' ')[2]}` : s.title.split(' ')[0]);

function Deck({ r }: { r: Records }) {
  const [at, setAt] = useState(0);
  const s = r.cards[at];
  return (
    <div className="rb-app-list">
      <p className="rb-app-head">
        <b>{num(r.taken)}</b> taken · <b>{r.found}</b> of {r.deck} found
      </p>
      <Tabs tabs={r.cards.map(cardTab)} at={at} pick={setAt} />
      <Shelf title={s.title} count={`${s.rows.filter((c) => c.taken > 0).length} / ${s.rows.length}`}>
        {s.rows.map((c) => (
          <div className={`rb-app-row${c.taken === 0 ? ' is-none' : ''}`} key={c.kind}>
            <span className="rb-app-name">
              {c.name}
              <em className={`rb-app-tag is-${c.tag.toLowerCase()}`}>{c.tag}</em>
            </span>
            <span className="rb-app-count">{c.taken > 0 ? `×${c.taken}` : '—'}</span>
          </div>
        ))}
      </Shelf>
    </div>
  );
}

function Roster({ r }: { r: Records }) {
  return (
    <div className="rb-app-list">
      {r.roster.map((c) => (
        <div className={`rb-app-card${c.open ? '' : ' is-locked'}`} key={c.id}>
          <div className="rb-app-card-top">
            <span className="rb-app-card-name">{c.name}</span>
            <span className="rb-app-card-runs">
              {num(c.runs)} {c.runs === 1 ? 'run' : 'runs'}
            </span>
          </div>
          {c.how && <div className="rb-app-card-how">Locked. {c.how}</div>}
        </div>
      ))}
    </div>
  );
}

function Unlocks({ r }: { r: Records }) {
  return (
    <div className="rb-app-list">
      {r.unlocks.map((u) => (
        <div className={`rb-app-card${u.open ? ' is-open' : ' is-locked'}`} key={u.name}>
          <div className="rb-app-card-top">
            <span className="rb-app-card-name">{u.name}</span>
            <em className={`rb-app-tag ${u.open ? 'is-open' : 'is-shut'}`}>{u.open ? 'Unlocked' : 'Locked'}</em>
          </div>
          <div className="rb-app-card-how">{u.how}</div>
          <div className="rb-app-progress">
            <div className="rb-app-bar">
              <i style={{ width: `${Math.round((u.have / u.need) * 100)}%` }} />
            </div>
            <span className="rb-app-bar-count">
              {u.have} / {u.need}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Each app, and its window's width (em: it grows with the desktop). */
export const APPS: readonly { id: AppId; name: string; width: number }[] = [
  { id: 'ledger', name: 'Ledger', width: 27 },
  { id: 'bestiary', name: 'Bestiary', width: 25 },
  { id: 'deck', name: 'Deck', width: 27 },
  { id: 'roster', name: 'Roster', width: 23 },
  { id: 'unlocks', name: 'Unlocks', width: 27 },
];

export function AppBody({ app, r }: { app: AppId; r: Records }) {
  if (app === 'ledger') return <Ledger r={r} />;
  if (app === 'bestiary') return <Bestiary r={r} />;
  if (app === 'deck') return <Deck r={r} />;
  if (app === 'roster') return <Roster r={r} />;
  return <Unlocks r={r} />;
}
