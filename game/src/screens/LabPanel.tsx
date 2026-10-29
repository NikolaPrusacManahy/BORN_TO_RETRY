// Update 0.0.19 — the Lab's panel (dev builds, F8 in the Lab; the designer: "pick what to do there and test stuff,
// spawn objects, fight actual enemies I pick, even bosses"). Click an enemy (×1, ×3 or ×5), an item, a bonus, a
// weapon or a chest and it's in front of you as the panel closes (shift-click keeps it open). A boss can come here,
// or you go to its boss room (its show and its fight). Clear, Heal, the Lab's waves, invincibility; Back leaves a boss
// room for the Lab. The world holds still while it's open.
// Update 0.0.20 — Floor 1, 2 or 3: a run from that floor's start (Back leaves it too).
// Update 0.1.17 — Sounds: the recorded clips to listen to and pick from (LabSounds.tsx), in place of the lists.
import { useState } from 'react';
import { LabSounds } from './LabSounds';
import type { EnemyKind } from '../sim/enemies/kinds';
import type { DropKind } from '../sim/items/drops';
import type { LabCommand } from '../sim/lab/labCommands';
import type { WeaponKind } from '../sim/weapons/catalog';

interface Props {
  /** In a boss room or on a floor started from the Lab. */
  away: boolean;
  waves: boolean;
  /** Update 0.1.1 — the Execution Power meter kept full. */
  meter: boolean;
  god: boolean;
  /** `stay`: keep the panel open (shift-click). */
  onCommand(cmd: LabCommand, stay: boolean): void;
  onBossRoom(kind: 'demon' | 'dragon'): void;
  onFloor(floor: number): void;
  onBack(): void;
  onWaves(): void;
  onMeter(): void;
  onGod(): void;
}

const ENEMIES: [EnemyKind, string][] = [
  ['grunt', 'Grunt'],
  ['spitter', 'Spitter'],
  ['brute', 'Yeti'],
  ['leaper', 'Leaper'],
  ['stinger', 'Stinger'],
  ['wraith', 'Wraith'],
  ['slime', 'Slime'],
  ['frog', 'Frog'],
  ['snake', 'Snake'],
  ['wasp', 'Wasp'],
  ['spider', 'Spider'],
  ['blueDemon', 'Blue Demon'],
  ['skeleton', 'Skeleton'],
  ['mushnub', 'Mushnub'],
  ['ninja', 'Ninja'],
];
const ITEMS: [DropKind, string][] = [
  ['heart', 'Heart'],
  ['greatHeart', 'Great heart'],
  ['plate', 'Plate'],
  ['goldPlate', 'Gold armour'],
  ['redRing', 'Red ring'],
  ['purpleRing', 'Purple ring'],
  ['greenRing', 'Green ring'],
  ['blueRing', 'Blue ring'],
  ['key', 'Key'],
  ['whiteKey', 'White key'],
  ['goldKey', 'Gold key'],
  ['snowflake', 'Snowflake'],
  ['goldIngots', 'Gold ingots'],
  ['bluePotion', 'Blue potion'],
];
const WEAPONS: [WeaponKind, string][] = [
  ['sword', 'Sword'],
  ['goldSword', 'Gold sword'],
  ['grimoire', 'Grimoire'],
  ['goldAxe', 'Gold axe'],
  ['hammer', 'Hammer'],
  ['daggers', 'Dual daggers'],
  ['goldHammer', 'Gold hammer'],
  ['goldDaggers', 'Gold daggers'],
];
const COUNTS = [1, 3, 5];
const FLOORS = [1, 2, 3];

/** The count picked last, and the Sounds list showing (kept between openings). */
let lastCount = 1;
let lastSounds = false;

export function LabPanel({ away, waves, meter, god, onCommand, onBossRoom, onFloor, onBack, onWaves, onMeter, onGod }: Props) {
  const [count, setCount] = useState(lastCount);
  const [sounds, setSounds] = useState(lastSounds);
  const showSounds = () => {
    lastSounds = !sounds;
    setSounds(!sounds);
  };
  const pick = (n: number) => {
    lastCount = n;
    setCount(n);
  };
  const run = (cmd: LabCommand) => (e: React.MouseEvent) => onCommand(cmd, e.shiftKey);
  return (
    <div className="rb-lab">
      <div className="rb-panel rb-lab-panel">
        <h2 className="rb-lab-title">Lab</h2>
        {sounds ? (
          <section className="rb-lab-sec">
            <h3 className="rb-lab-head">Sounds</h3>
            <LabSounds />
          </section>
        ) : (
          <>
            <section className="rb-lab-sec">
              <h3 className="rb-lab-head">
                Enemies
                <span className="rb-lab-counts">
                  {COUNTS.map((n) => (
                    <button key={n} className={`rb-lab-count${n === count ? ' is-on' : ''}`} onClick={() => pick(n)}>
                      ×{n}
                    </button>
                  ))}
                </span>
              </h3>
              <div className="rb-lab-grid">
                {ENEMIES.map(([kind, label]) => (
                  <button key={kind} className="rb-lab-btn" onClick={run({ kind: 'enemy', enemy: kind, count })}>
                    {label}
                  </button>
                ))}
              </div>
            </section>
            <section className="rb-lab-sec">
              <h3 className="rb-lab-head">Bosses</h3>
              <div className="rb-lab-grid">
                <button className="rb-lab-btn is-boss" onClick={run({ kind: 'enemy', enemy: 'demon', count: 1 })}>
                  Demon
                </button>
                <button className="rb-lab-btn is-boss" onClick={() => onBossRoom('demon')}>
                  Demon room
                </button>
                <button className="rb-lab-btn is-boss" onClick={run({ kind: 'enemy', enemy: 'dragon', count: 1 })}>
                  Dragon
                </button>
                <button className="rb-lab-btn is-boss" onClick={() => onBossRoom('dragon')}>
                  Dragon room
                </button>
              </div>
            </section>
            <section className="rb-lab-sec">
              <h3 className="rb-lab-head">Floors</h3>
              <div className="rb-lab-grid">
                {FLOORS.map((n) => (
                  <button key={n} className="rb-lab-btn is-floor" onClick={() => onFloor(n)}>
                    Floor {n}
                  </button>
                ))}
              </div>
            </section>
            <section className="rb-lab-sec">
              <h3 className="rb-lab-head">Items</h3>
              <div className="rb-lab-grid">
                {ITEMS.map(([kind, label]) => (
                  <button key={kind} className="rb-lab-btn" onClick={run({ kind: 'item', item: kind })}>
                    {label}
                  </button>
                ))}
                {WEAPONS.map(([kind, label]) => (
                  <button key={kind} className="rb-lab-btn" onClick={run({ kind: 'weapon', weapon: kind })}>
                    {label}
                  </button>
                ))}
                <button className="rb-lab-btn" onClick={run({ kind: 'chest' })}>
                  Chest
                </button>
              </div>
            </section>
          </>
        )}
        <section className="rb-lab-sec">
          <div className="rb-lab-grid">
            <button className="rb-lab-btn is-tool" onClick={run({ kind: 'clear' })}>
              Clear
            </button>
            <button className="rb-lab-btn is-tool" onClick={run({ kind: 'heal' })}>
              Heal
            </button>
            <button className={`rb-lab-btn is-tool${waves ? ' is-on' : ''}`} onClick={onWaves}>
              Waves
            </button>
            <button className={`rb-lab-btn is-tool${god ? ' is-on' : ''}`} onClick={onGod}>
              God
            </button>
            <button className={`rb-lab-btn is-tool${meter ? ' is-on' : ''}`} onClick={onMeter}>
              Meter
            </button>
            <button className={`rb-lab-btn is-tool${sounds ? ' is-on' : ''}`} onClick={showSounds}>
              Sounds
            </button>
            {away && (
              <button className="rb-lab-btn is-tool" onClick={onBack}>
                Back
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
