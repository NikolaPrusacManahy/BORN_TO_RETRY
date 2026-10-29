// M1 step 6 — everything the combat rules remember between ticks, and the events they report.
// M2 — and the grunts and their waves, the weapon you hold, weapons on the ground and in flight, and the seeded RNG
// that drops and spawns use.
// Update 0.0.15 — the Demon's quake rings, and the boss's events (its moves, its show, its death, the wooden gate).
// Update 0.0.16 — items on the floor (the Yeti's key) and how many keys the room you're in still holds.
// Update 0.0.17 — weapon slots (your fists and the weapons you carry), kill bonuses (on, and how many the room still
// gives).
import { EventQueue } from '../../core/eventQueue';
import { Rng, createRng } from '../../core/rng';
import { Vector3 } from 'three';
import type { Arena } from '../../world/arena';
import { WEAPON_STATS } from '../weapons/catalog';
import { HeldWeapon, Pickup, Stand, Thrown, createPickups, createStands, createThrown, placePickup } from '../weapons/weapons';
import { Fireball, createFireballs } from '../weapons/fireballs';
import { KiCharge, createKi } from '../weapons/kiCharge';
import { SmashWave, createSmashWaves } from '../weapons/smashWaves';
import type { CombatEvent } from './events';
import { createFlow, Flow } from '../enemies/chase';
import { createEnemies, Enemy } from '../enemies/enemy';
import { Coin, createCoins } from './coins';
import { Quake, clearQuakes, createQuakes } from './quakes';
import { Bomb, clearBombs, createBombs } from './bombs';
import { createExecution, Execution } from './execution';
import { createDrops, Drop } from '../items/drops';
import { Bonuses, createBonuses } from '../items/bonuses';
import { createBag } from '../weapons/slots';
import { createInventory, Inventory } from '../items/items';
import { GRID_RADIUS, SizeClass } from '../enemies/kinds';
import { AIR, buildNavGrid, NavGrid } from '../../world/navGrid';
import { Waves, createWaves } from '../enemies/waves';
import { FistState, createFists } from './fists';
import { HitStop } from './hitStop';
import { Dummy, Orb, Turret, createDummy, createOrbs, createTurret } from './targets';

/** The lab's RNG seed: the same seed, the same drops and waves. */
export const LAB_SEED = 1;

export type { CombatEvent } from './events';

export interface CombatState {
  fists: FistState;
  dummies: Dummy[];
  turrets: Turret[];
  orbs: Orb[];
  enemies: Enemy[];
  waves: Waves;
  /** Update 0.0.15 — quake rings rolling over the floor. */
  quakes: Quake[];
  /** Update 0.0.21 — the Dragon's fire bombs falling. */
  bombs: Bomb[];
  /** Update 0.0.11 — where enemies can walk (built once from the arena, one grid per size), and the way from anywhere
   *  to the player. */
  nav: Record<SizeClass, NavGrid>;
  flow: Record<SizeClass, Flow>;
  /** The weapon in your hand (null: barehanded). */
  weapon: HeldWeapon | null;
  /** Update 0.0.17 — your weapon slots (index 0: your fists, always empty) and the one picked. */
  bag: (HeldWeapon | null)[];
  slot: number;
  /** Update 0.0.17 — kill bonuses on (seconds left) and how many the room you're in still drops. */
  bonuses: Bonuses;
  bonusDrops: number;
  pickups: Pickup[];
  stands: Stand[];
  thrown: Thrown[];
  /** Update 0.1.4 — the Grimoire's fireballs in flight, and its charge (right click held). */
  fireballs: Fireball[];
  ki: KiCharge;
  /** Update 0.1.5 — the Hammer's shockwaves rolling over the floor; right click still held from calling the axe back
   *  (it charges nothing until let go). Update 0.1.7 — a full smash let go in the air, held till you land. */
  smashWaves: SmashWave[];
  recallHeld: boolean;
  smashHeld: boolean;
  rng: Rng;
  /** Update 0.0.12 — your coins, and the ones still flying. */
  money: number;
  coins: Coin[];
  /** Update 0.0.13 — keys and rings you carry. */
  items: Inventory;
  /** Update 0.1.0 — the Execution Power meter (0..1: kills fill it). Update 0.1.1 — an execution under way, and the
   *  enemy you could execute now (−1: none). */
  execution: number;
  exec: Execution;
  execTarget: number;
  /** Update 0.1.1 — the Lab's Meter: the Execution Power meter kept full. */
  fullMeter: boolean;
  /** Update 0.0.16 — items on the floor, and the keys the room you're fighting in still gives (a Yeti drops one). */
  drops: Drop[];
  keyDrops: number;
  hitStop: HitStop;
  events: EventQueue<CombatEvent>;
}

const at = new Vector3();

/** The lab stands each hold a full weapon. */
function stockStands(state: CombatState) {
  state.stands.forEach((s, i) => {
    s.timer = 0;
    placePickup(state.pickups, s.kind, WEAPON_STATS[s.kind]().uses, at.copy(s.pos), i);
  });
}

/** `walkGrid`: build the enemies' walk grids for the whole arena (the lab). The dungeon gives each room its own when
 *  you go in (Update 0.0.12), so it passes false: a whole floor's grid would take seconds to build. */
export function createCombat(arena: Arena, walkGrid = true): CombatState {
  const ground = walkGrid ? arena : { ...arena, boxes: [] };
  const nav = { small: buildNavGrid(ground, GRID_RADIUS.small), large: buildNavGrid(ground, GRID_RADIUS.large), air: buildNavGrid(ground, GRID_RADIUS.air, 0, 0.5, AIR) };
  const state: CombatState = {
    fists: createFists(),
    dummies: arena.dummies.map(createDummy),
    turrets: arena.turrets.map(createTurret),
    orbs: createOrbs(),
    enemies: createEnemies(),
    waves: createWaves(),
    quakes: createQuakes(),
    bombs: createBombs(),
    nav,
    flow: { small: createFlow(nav.small), large: createFlow(nav.large), air: createFlow(nav.air) },
    weapon: null,
    bag: createBag(),
    slot: 0,
    bonuses: createBonuses(),
    bonusDrops: Infinity,
    pickups: createPickups(),
    stands: createStands(arena.stands),
    thrown: createThrown(),
    fireballs: createFireballs(),
    ki: createKi(),
    smashWaves: createSmashWaves(),
    recallHeld: false,
    smashHeld: false,
    rng: createRng(LAB_SEED),
    money: 0,
    coins: createCoins(),
    items: createInventory(),
    execution: 0,
    exec: createExecution(),
    execTarget: -1,
    fullMeter: false,
    drops: createDrops(),
    keyDrops: 0,
    hitStop: new HitStop(),
    events: new EventQueue<CombatEvent>(64, 'none'),
  };
  stockStands(state);
  return state;
}

/** Everything back to fresh: targets whole and in place, no orbs, no grunts (the first wave comes after the delay),
 *  barehanded, the stands stocked, no punch in progress. */
export function resetCombat(state: CombatState, arena: Arena) {
  state.fists = createFists();
  state.dummies = arena.dummies.map(createDummy);
  state.turrets = arena.turrets.map(createTurret);
  for (const o of state.orbs) o.alive = false;
  for (const e of state.enemies) e.alive = false;
  state.waves = createWaves();
  clearQuakes(state.quakes);
  clearBombs(state.bombs);
  state.flow.small.target = state.flow.large.target = state.flow.air.target = -1;
  state.weapon = null;
  state.bag = createBag();
  state.slot = 0;
  state.bonuses = createBonuses();
  state.bonusDrops = Infinity;
  for (const p of state.pickups) p.alive = false;
  for (const t of state.thrown) t.alive = false;
  for (const f of state.fireballs) f.alive = false;
  state.ki = createKi();
  for (const w of state.smashWaves) w.alive = false;
  state.recallHeld = false;
  state.smashHeld = false;
  state.stands = createStands(arena.stands);
  state.rng = createRng(LAB_SEED);
  state.money = 0;
  for (const c of state.coins) c.alive = false;
  state.items = createInventory();
  state.execution = 0;
  state.exec.active = false;
  state.execTarget = -1;
  for (const d of state.drops) d.alive = false;
  state.keyDrops = 0;
  stockStands(state);
  state.hitStop.remaining = 0;
  state.events.clear();
}

/** Update 0.0.17 — what comes down to the next floor with you: your weapons (and the one in your hand), your coins,
 *  your keys and rings. */
export function carryOver(from: CombatState, to: CombatState) {
  to.weapon = from.weapon;
  to.bag = from.bag;
  to.slot = from.slot;
  to.money = from.money;
  to.items = from.items;
  to.execution = from.execution;
}
