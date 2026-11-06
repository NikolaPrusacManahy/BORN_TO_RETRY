// Update 0.3.20 — the controls, bottom right (the designer: "display the controls like in the game Blood rush … display
// jab control, parry and it's cooldown like a filling effect - maybe just use the UI logo to make it looks like it is
// filling like a circle and shows how long you wait for a parry"; "Ground pound is now Control key by default and
// display it to bottom right"): a round badge each, its key on a cap under it. The jab: your fist, or the weapon in
// hand. The parry: drained of colour while it waits, its icon and its ring filling back round like a clock; a flash
// once it's ready; dimmed with a weapon in hand (no parry then). The ground pound: lit while you're high enough to pound.
// The weapon slots sit a row above (HudSlots.tsx).
import type { CSSProperties } from 'react';
import type { HudState } from '../engine/hudStore';
import { FistIcon, SlotIcon } from './HudSlots';

/** The parry: a buckler, a shot bouncing off it. */
function ParryIcon({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={`rb-ctl-icon${lit ? ' is-lit' : ' is-dim'}`}>
      <path d="M17 4l11 4v7c0 7-5 12-11 14-6-2-11-7-11-14V8z" fill="#b4bdd6" stroke="#2a2018" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17 7.5l8 3V15c0 5-3.4 8.8-8 10.6z" fill="#e6ebf6" />
      <path d="M2 3l7 7M9 10l-6 5" stroke="#ff7a3a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="9.5" cy="10.5" r="2.2" fill="#ffd27a" />
    </svg>
  );
}

/** The ground pound: down onto the ground, which cracks. */
function PoundIcon() {
  return (
    <svg viewBox="0 0 32 32" className="rb-ctl-icon">
      <path d="M16 2v10" stroke="#f0d58c" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M9.5 10.5L16 18l6.5-7.5z" fill="#f0d58c" stroke="#2a2018" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3 23.5h26" stroke="#8a7a66" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 23.5l-3 5.5M16 23.5l3.5 5.5M11 21l-4-3M21 21l4-3" stroke="#ffb04a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Controls({ s }: { s: HudState }) {
  const hand = s.slot > 0 ? s.slots[s.slot - 1] : null;
  const ready = !s.parryOff && s.parryFill >= 1;
  const parry = s.parryOff ? ' is-off' : ready ? ' is-ready' : ' is-wait';
  return (
    <div className="rb-ctls">
      <span className="rb-ctl is-jab">
        <span className="rb-ctl-badge">{hand ? <SlotIcon kind={hand.kind} /> : s.demon && !s.bladeOut ? <SlotIcon kind="sword" /> : <FistIcon />}</span>
        <i className="rb-cap">{s.attackKey}</i>
      </span>
      <span className={`rb-ctl is-parry${parry}`} style={{ '--ctl': s.parryOff ? 0 : s.parryFill } as CSSProperties}>
        <span className="rb-ctl-badge">
          <ParryIcon lit={false} />
          <ParryIcon lit />
          {ready && <i className="rb-ctl-flash" />}
        </span>
        <i className="rb-cap">{s.heavyKey}</i>
      </span>
      <span className={`rb-ctl is-pound${s.slamReady ? ' is-ready' : ''}`}>
        <span className="rb-ctl-badge">
          <PoundIcon />
        </span>
        <i className="rb-cap">{s.slamKey}</i>
      </span>
    </div>
  );
}
