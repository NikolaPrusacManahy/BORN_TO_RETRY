// Update 0.0.19 — the Lab's panel (dev builds, F8 in the Lab; the designer: "pick what to do there and test stuff,
// spawn objects, fight actual enemies I pick, even bosses"). Click an enemy (×1, ×3 or ×5), an item, a bonus, a
// weapon or a chest and it's in front of you as the panel closes (shift-click keeps it open). A boss can come here,
// or you go to its boss room (its show and its fight). Clear, Heal, the Lab's waves, invincibility; Back leaves a boss
// room for the Lab. The world holds still while it's open.
// Update 0.0.20 — Floor 1, 2 or 3: a run from that floor's start (Back leaves it too).
// Update 0.1.17 — Sounds: the recorded clips to listen to and pick from (LabSounds.tsx), in place of the lists.
// Update 0.2.4 — reworked (the designer: "make this interface a bit more comfier to navigate"): three tabs, Enemies,
// Items and Sounds, the panel the same size on each and fitting the window. Enemies: a column a floor (labLists.ts),
// its Play (a run from its start), its enemies (mini bosses tinted, last) and its boss (here, or its Room). Items: a
// column a kind. Below, always: Clear, Heal, Back; Waves, God, Meter, and Stay (every pick keeps the panel open).
import { useState } from 'react';
import { LabSounds } from './LabSounds';
import { isMini, LAB_FLOORS, LAB_ITEMS, LabBoss, labName } from './labLists';
import type { LabCommand } from '../sim/lab/labCommands';

interface Props {
  /** In a boss room or on a floor started from the Lab. */
  away: boolean;
  waves: boolean;
  /** Update 0.1.1 — the Execution Power meter kept full. */
  meter: boolean;
  god: boolean;
  /** `stay`: keep the panel open (shift-click, or Stay on). */
  onCommand(cmd: LabCommand, stay: boolean): void;
  onBossRoom(kind: LabBoss): void;
  onFloor(floor: number): void;
  onBack(): void;
  onWaves(): void;
  onMeter(): void;
  onGod(): void;
}

type Tab = 'enemies' | 'items' | 'sounds';
const TABS: [Tab, string][] = [
  ['enemies', 'Enemies'],
  ['items', 'Items'],
  ['sounds', 'Sounds'],
];
const COUNTS = [1, 3, 5];

/** The tab, the count and Stay picked last (kept between openings). */
let lastTab: Tab = 'enemies';
let lastCount = 1;
let lastStay = false;

export function LabPanel({ away, waves, meter, god, onCommand, onBossRoom, onFloor, onBack, onWaves, onMeter, onGod }: Props) {
  const [tab, setTab] = useState(lastTab);
  const [count, setCount] = useState(lastCount);
  const [stay, setStay] = useState(lastStay);
  const show = (t: Tab) => {
    lastTab = t;
    setTab(t);
  };
  const pick = (n: number) => {
    lastCount = n;
    setCount(n);
  };
  const keep = () => {
    lastStay = !stay;
    setStay(!stay);
  };
  const run = (cmd: LabCommand) => (e: React.MouseEvent) => onCommand(cmd, stay || e.shiftKey);
  const toggle = (on: boolean) => `rb-lab-btn is-tool${on ? ' is-on' : ''}`;
  return (
    <div className="rb-lab">
      <div className="rb-panel rb-lab-panel">
        <header className="rb-lab-top">
          <h2 className="rb-lab-title">Lab</h2>
          <nav className="rb-lab-tabs">
            {TABS.map(([t, label]) => (
              <button key={t} className={`rb-lab-tab${t === tab ? ' is-on' : ''}`} onClick={() => show(t)}>
                {label}
              </button>
            ))}
          </nav>
          {tab === 'enemies' && (
            <span className="rb-lab-counts">
              {COUNTS.map((n) => (
                <button key={n} className={`rb-lab-count${n === count ? ' is-on' : ''}`} onClick={() => pick(n)}>
                  ×{n}
                </button>
              ))}
            </span>
          )}
        </header>
        <div className="rb-lab-body">
          {tab === 'enemies' && (
            <div className="rb-lab-cols is-floors">
              {LAB_FLOORS.map((f) => (
                <section key={f.floor} className="rb-lab-col">
                  <div className="rb-lab-col-head">
                    <h3 className="rb-lab-head">Floor {f.floor}</h3>
                    <button className="rb-lab-btn is-floor" onClick={() => onFloor(f.floor)}>
                      Play
                    </button>
                  </div>
                  <div className="rb-lab-list">
                    {f.enemies.map((kind) => (
                      <button key={kind} className={`rb-lab-btn${isMini(kind) ? ' is-mini' : ''}`} onClick={run({ kind: 'enemy', enemy: kind, count })}>
                        {labName(kind)}
                      </button>
                    ))}
                  </div>
                  {f.boss && (
                    <div className="rb-lab-boss">
                      <button className="rb-lab-btn is-boss" onClick={run({ kind: 'enemy', enemy: f.boss, count: 1 })}>
                        {labName(f.boss)}
                      </button>
                      <button className="rb-lab-btn is-boss" onClick={() => onBossRoom(f.boss!)}>
                        Room
                      </button>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
          {tab === 'items' && (
            <div className="rb-lab-cols is-items">
              {LAB_ITEMS.map(([head, picks]) => (
                <section key={head} className="rb-lab-col">
                  <h3 className="rb-lab-head">{head}</h3>
                  <div className="rb-lab-list">
                    {picks.map(([label, cmd]) => (
                      <button key={label} className="rb-lab-btn" onClick={run(cmd)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {tab === 'sounds' && <LabSounds />}
        </div>
        <footer className="rb-lab-foot">
          <div className="rb-lab-row">
            <button className="rb-lab-btn is-tool" onClick={run({ kind: 'clear' })}>
              Clear
            </button>
            <button className="rb-lab-btn is-tool" onClick={run({ kind: 'heal' })}>
              Heal
            </button>
            {away && (
              <button className="rb-lab-btn is-tool" onClick={onBack}>
                Back
              </button>
            )}
          </div>
          <div className="rb-lab-row">
            <button className={toggle(waves)} onClick={onWaves}>
              Waves
            </button>
            <button className={toggle(god)} onClick={onGod}>
              God
            </button>
            <button className={toggle(meter)} onClick={onMeter}>
              Meter
            </button>
            <button className={toggle(stay)} onClick={keep}>
              Stay
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
