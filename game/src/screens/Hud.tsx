// M1 — the HUD: a crosshair, the hit marker around it, the dash charges (bottom centre), and a red edge flash when
// you're hurt. M1 step 8 — health bottom left: the number and a bar, with a pale trail showing what a hit took; it
// pulses when low.
// M2 — the weapon in hand bottom right: its name and uses left (red and pulsing at 0: the next attack throws it).
// Update 0.0.12 — your coins, just above the health (the designer); the number pops when it goes up. In the dungeon, the
// minimap top right.
// Update 0.0.13 — the shield: a blue bar just above the health bar (a hit on it flashes the edge blue); keys and rings
// you carry beside your coins.
// Update 0.0.15 — the boss room's show (BossHud.tsx); while it has the view, the rest fades out.
// Update 0.2.3 — the Bone King's grab QTE (GrabQte.tsx).
// Update 0.0.16 — white and gold keys beside the normal ones; at a chest, the key picker (KeyPicker.tsx).
// Update 0.0.17 — four rings (red, blue, green, purple); the weapon slots in place of the weapon's name and uses; the
// kill bonuses that are on (HudSlots.tsx).
import { CSSProperties, useSyncExternalStore } from 'react';
import type { HudStore } from '../engine/hudStore';
import { BossHud } from './BossHud';
import { GrabQte } from './GrabQte';
import { KeyIcon, KeyPicker } from './KeyPicker';
import { Bonuses, WeaponSlots } from './HudSlots';
import { Minimap } from './Minimap';

/** At or below this share of max health the bar pulses. */
const LOW_HEALTH = 0.25;

/** A gold ring with its gem; Update 0.2.0 — or a plain band in its own colour (the teal ring). */
function RingIcon({ gem, band }: { gem?: string; band?: string }) {
  return (
    <svg viewBox="0 0 32 32">
      <circle cx="16" cy={band ? 16 : 19} r="9" fill="none" stroke={band ?? '#e8b931'} strokeWidth={band ? 5 : 3.5} />
      {gem && <path d="M11 9l5-6 5 6-5 4z" fill={gem} stroke="#7a5a10" strokeWidth="1" />}
    </svg>
  );
}

/** Update 0.0.21 — the enemies-left count's mark. */
function Skull() {
  return (
    <svg className="rb-hud-skull" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2C6.5 2 3 5.8 3 10.4c0 2.8 1.3 4.7 3 5.9V20a1 1 0 0 0 1 1h2v-2h2v2h2v-2h2v2h2a1 1 0 0 0 1-1v-3.7c1.7-1.2 3-3.1 3-5.9C21 5.8 17.5 2 12 2z" fill="currentColor" />
      <circle cx="8.6" cy="11" r="2.3" fill="#120c10" />
      <circle cx="15.4" cy="11" r="2.3" fill="#120c10" />
      <path d="M12 13.6l-1.4 2.4h2.8z" fill="#120c10" />
    </svg>
  );
}

function Carried({ n, children }: { n: number; children: JSX.Element }) {
  if (n <= 0) return null;
  return (
    <span className="rb-hud-item">
      {children}
      {n > 1 && <span className="rb-hud-item-n">{n}</span>}
    </span>
  );
}

export function Hud({ store }: { store: HudStore }) {
  const s = useSyncExternalStore(store.subscribe, store.get);
  return (
    <div className={`rb-hud${s.cine ? ' is-cine' : ''}`}>
      <div className="rb-hud-cross" />
      {s.hits > 0 && <div key={`m${s.hits}`} className={`rb-hud-marker is-${s.marker}`} />}
      {s.hurts > 0 && <div key={`h${s.hurts}`} className="rb-hud-hurt" />}
      {s.shields > 0 && <div key={`s${s.shields}`} className="rb-hud-shieldhit" />}
      {s.poisoned && <div className="rb-hud-poison" />}
      {s.enemiesLeft >= 0 && s.bossHp < 0 && (
        <div className="rb-hud-left">
          <Skull />
          <span key={s.enemiesLeft} className="rb-hud-left-n">
            {s.enemiesLeft}
          </span>
        </div>
      )}
      {s.map && <Minimap map={s.map} x={s.mapX} z={s.mapZ} yaw={s.mapYaw} chest={s.chestHere} />}
      <div className="rb-hud-money">
        <i className="rb-hud-coin" />
        <span key={s.money} className="rb-hud-money-n">{s.money}</span>
        <span className="rb-hud-items">
          <Carried n={s.keys}>
            <KeyIcon kind="key" />
          </Carried>
          <Carried n={s.whiteKeys}>
            <KeyIcon kind="whiteKey" />
          </Carried>
          <Carried n={s.goldKeys}>
            <KeyIcon kind="goldKey" />
          </Carried>
          <Carried n={s.redRings}>
            <RingIcon gem="#e2321e" />
          </Carried>
          <Carried n={s.blueRings}>
            <RingIcon gem="#3d6bff" />
          </Carried>
          <Carried n={s.greenRings}>
            <RingIcon gem="#2ecc40" />
          </Carried>
          <Carried n={s.tealRings}>
            <RingIcon band="#21b9c6" />
          </Carried>
        </span>
      </div>
      <div className={`rb-hud-health${s.hp <= s.maxHp * LOW_HEALTH ? ' is-low' : ''}`}>
        <span className="rb-hud-hp">{s.hp}</span>
        <div className="rb-hud-bars">
          {s.shield > 0 && (
            <div className="rb-hud-shield" style={{ '--fill': s.maxHp > 0 ? Math.min(1, s.shield / s.maxHp) : 0 } as CSSProperties}>
              <i className="rb-hud-shield-fill" />
            </div>
          )}
          <div className="rb-hud-bar" style={{ '--fill': s.maxHp > 0 ? s.hp / s.maxHp : 0 } as CSSProperties}>
            <i className="rb-hud-bar-trail" />
            <i className="rb-hud-bar-fill" />
          </div>
        </div>
      </div>
      {s.mag >= 0 && (
        <div className="rb-ammo">
          <b className={s.mag === 0 ? 'is-empty' : ''}>{s.mag}</b>
          <span>{Math.max(0, s.uses - s.mag)}</span>
        </div>
      )}
      <WeaponSlots slots={s.slots} slot={s.slot} />
      <Bonuses left={s.bonusLeft} />
      <div className={`rb-hud-exec${s.execution >= 1 ? ' is-full' : ''}`} style={{ '--fill': s.execution } as CSSProperties}>
        <i className="rb-hud-exec-fill" />
      </div>
      <div className="rb-hud-dash">
        {Array.from({ length: s.dashMax }, (_, i) => (
          <span key={i} className="rb-hud-pip" style={{ '--fill': Math.max(0, Math.min(1, s.dashCharges - i)) } as CSSProperties} />
        ))}
      </div>
      <KeyPicker counts={{ key: s.keys, whiteKey: s.whiteKeys, goldKey: s.goldKeys }} pick={s.keyPick} />
      <BossHud s={s} />
      <GrabQte s={s} />
    </div>
  );
}
