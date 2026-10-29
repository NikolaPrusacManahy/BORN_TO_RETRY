// Update 0.0.17 — the weapon slots and the kill bonuses on screen (the designer). Bottom right, a box per slot you have
// something in: your fists in slot 1, then each weapon with its uses (red once it's broken), the one in your hand raised
// and lit, its number on it. Bottom left above your coins, each bonus that's on with its time draining away.
import type { CSSProperties } from 'react';
import type { HudSlot } from '../engine/hudStore';

function FistIcon() {
  return (
    <svg viewBox="0 0 32 32" className="rb-slot-icon">
      <path d="M8 13h16a3 3 0 0 1 3 3v5a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6v-7a1 1 0 0 1 1-1z" fill="#d9c2a2" stroke="#2a2018" strokeWidth="1.5" />
      <path d="M10 13v-3a2 2 0 0 1 4 0v3M14 13v-4a2 2 0 0 1 4 0v4M18 13v-3a2 2 0 0 1 4 0v3" fill="#d9c2a2" stroke="#2a2018" strokeWidth="1.5" />
    </svg>
  );
}

/** Update 0.1.4 — the Grimoire: an open book, a flame over it. */
function BookIcon() {
  return (
    <svg viewBox="0 0 32 32" className="rb-slot-icon">
      <path d="M3 10l13 3 13-3v16l-13 3-13-3z" fill="#6a4628" stroke="#2a2018" strokeWidth="1.5" />
      <path d="M5 11l11 2.5V27L5 24.5zM27 11l-11 2.5V27l11-2.5z" fill="#f1e2c0" />
      <path d="M16 2c3 3 4 5 1 8 0-2-1-3-2-3 1 2 0 3-1 4-2-3 0-6 2-9z" fill="#ff8a3a" />
    </svg>
  );
}

/** Update 0.1.5 — the Gold Axe: a gold blade on a short haft. */
function AxeIcon() {
  return (
    <svg viewBox="0 0 32 32" className="rb-slot-icon">
      <path d="M8 29L21 8" stroke="#7a4a36" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 6c5-3 11 0 12 6-3 3-8 4-12 1z" fill="#f0c43a" stroke="#6a4a10" strokeWidth="1.2" />
    </svg>
  );
}

/** Update 0.1.5 — the Hammer: a great double head on a long handle. (Update 0.1.10 — gold for the Gold Hammer.) */
function HammerIcon({ gold }: { gold: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className="rb-slot-icon">
      <path d="M16 13v17" stroke="#7a4a36" strokeWidth="3" strokeLinecap="round" />
      <rect x="4" y="4" width="24" height="10" rx="2" fill={gold ? '#f0c43a' : '#b4bdd6'} stroke={gold ? '#6a4a10' : '#3a4050'} strokeWidth="1.5" />
    </svg>
  );
}

/** Update 0.1.9 — the Dual Daggers: two short blades crossed. (Update 0.1.10 — gold for the Gold Daggers.) */
function DaggersIcon({ gold }: { gold: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className="rb-slot-icon">
      <path d="M6 4l3-1 11 13-2.5 2.5zM26 4l-3-1-11 13 2.5 2.5z" fill={gold ? '#ffcf4a' : '#d6dde6'} stroke="#2a2018" strokeWidth="1.3" />
      <path d="M13 21l-6 6M19 21l6 6" stroke="#6a3a3a" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M10 17l5 5M22 17l-5 5" stroke="#8a8a80" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SwordIcon({ gold }: { gold: boolean }) {
  const blade = gold ? '#ffcf4a' : '#d6dde6';
  return (
    <svg viewBox="0 0 32 32" className="rb-slot-icon">
      <path d="M24 3l5 0 0 5-13 13-5-5z" fill={blade} stroke="#2a2018" strokeWidth="1.5" />
      <path d="M8 15l9 9M10 22l-5 5" stroke="#5a3a20" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function WeaponSlots({ slots, slot }: { slots: (HudSlot | null)[]; slot: number }) {
  return (
    <div className="rb-slots">
      <span className={`rb-slot${slot === 0 ? ' is-on' : ''}`}>
        <i className="rb-slot-n">1</i>
        <FistIcon />
      </span>
      {slots.map((s, i) =>
        s ? (
          <span key={i} className={`rb-slot${slot === i + 1 ? ' is-on' : ''}${s.uses <= 0 ? ' is-broken' : ''}`}>
            <i className="rb-slot-n">{i + 2}</i>
            {s.kind === 'grimoire' ? <BookIcon /> : s.kind === 'goldAxe' ? <AxeIcon /> : s.kind === 'hammer' || s.kind === 'goldHammer' ? <HammerIcon gold={s.kind === 'goldHammer'} /> : s.kind === 'daggers' || s.kind === 'goldDaggers' ? <DaggersIcon gold={s.kind === 'goldDaggers'} /> : <SwordIcon gold={s.kind === 'goldSword'} />}
            <b className="rb-slot-uses">{s.uses}</b>
          </span>
        ) : null,
      )}
    </div>
  );
}

const BONUS_ICON: Record<string, JSX.Element> = {
  snowflake: (
    <svg viewBox="0 0 32 32">
      <path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13M12 5l4 4 4-4M12 27l4-4 4 4" stroke="#bfe6ff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  ),
  goldIngots: (
    <svg viewBox="0 0 32 32">
      <path d="M4 26l3-7h10l3 7zM14 26l3-7h10l3 7zM9 19l3-7h10l3 7z" fill="#ffc83a" stroke="#7a5a10" strokeWidth="1.2" />
    </svg>
  ),
  bluePotion: (
    <svg viewBox="0 0 32 32">
      <path d="M13 4h6v6l6 8a7 7 0 0 1-5 10h-8a7 7 0 0 1-5-10l6-8z" fill="#3d7bff" stroke="#bcd4ff" strokeWidth="1.5" />
      <rect x="12" y="2" width="8" height="4" rx="1" fill="#6b4a2a" />
    </svg>
  ),
};

/** The bonuses that are on: how much of each one's time is left (0..1). */
export function Bonuses({ left }: { left: Record<string, number> }) {
  return (
    <div className="rb-bonuses">
      {Object.entries(left).map(([kind, k]) =>
        k > 0 ? (
          <span key={kind} className={`rb-bonus is-${kind}`} style={{ '--left': k } as CSSProperties}>
            {BONUS_ICON[kind]}
            <i className="rb-bonus-time" />
          </span>
        ) : null,
      )}
    </div>
  );
}
