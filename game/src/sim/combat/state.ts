// M1 step 6 — everything the combat rules remember between ticks, and the events they report.
// M2 — and the grunts and their waves, the weapon you hold, weapons on the ground and in flight, and the seeded RNG
// that drops and spawns use.
// Update 0.0.15 — the Demon's quake rings, and the boss's events (its moves, its show, its death, the wooden gate).
// Update 0.0.16 — items on the floor (the Yeti's key) and how many keys the room you're in still holds.
// Update 0.0.17 — weapon slots (your fists and the weapons you carry), kill bonuses (on, and how many the room still
// gives).
import { Ground, noGround } from '../dungeon/ground';
import { EventQueue } from '../../core/eventQueue';
import { Rng, createRng } from '../../core/rng';
import { Vector3 } from 'three';
import type { Arena, Spot } from '../../world/arena';
import { WEAPON_STATS } from '../weapons/catalog';
import { HeldWeapon, Pickup, Stand, Thrown, createPickups, createStands, createThrown, placePickup } from '../weapons/weapons';
import { Fireball, createFireballs } from '../weapons/fireballs';
import { KiCharge, createKi } from '../weapons/kiCharge';
import { SmashWave, createSmashWaves } from '../weapons/smashWaves';
import { Knife, Volley, createKnives, createVolley } from '../weapons/knives';
import { GunState, createGun } from '../weapons/gun';
import type { CombatEvent } from './events';
import { createFlow, Flow } from '../enemies/chase';
import { createEnemies, Enemy } from '../enemies/enemy';
import { Coin, createCoins } from './coins';
import { Quake, clearQuakes, createQuakes } from './quakes';
import { Bomb, clearBombs, createBombs } from './bombs';
import { createExecution, Execution } from './execution';
import { createGrab, Grab } from './grab';
import { createPin, Pin } from './pin';
import { clearPuddles, createPuddles, Puddle } from './puddles';
import { createDrops, Drop } from '../items/drops';
import { Bonuses, createBonuses } from '../items/bonuses';
import { createBag } from '../weapons/slots';
import { createInventory, Inventory } from '../items/items';
import type { Deal } from '../cards/deal';
import { clearPowers, createPowers, Powers } from '../cards/cardHits';
import { GRID_RADIUS, SizeClass } from '../enemies/kinds';
import { AIR, buildNavGrid, NavGrid } from '../../world/navGrid';
import { Waves, createWaves } from '../enemies/waves';
import { FistState, createFists } from './fists';
import { BladeSwing, createBladeSwing } from './bladeSwing';
import { createDemonFire, DemonFire } from './demonFire';
import { createGravity, GravityState } from './gravityMeter';
import { HitStop } from './hitStop';
import { Dummy, Orb, Turret, createDummy, createOrbs, createTurret } from './targets';
import { Hive, resetHives } from '../dungeon/hives';
import { clearWormlings, createWormlings, type Wormling } from '../enemies/wormlings';
import { Pillar, pillarsOf } from './pillars';

/** The lab's RNG seed: the same seed, the same drops and waves. */
export const LAB_SEED = 1;

export type { CombatEvent } from './events';

export interface CombatState {
  fists: FistState;
  /** Update 0.3.71 — the Demon's Blazing Arc. Update 0.3.72 — and its moves' fire; the real seconds the world's still slowed for (its
   *  counter-slash: the Run slows it). */
  blade: BladeSwing;
  demonFire: DemonFire;
  dummies: Dummy[];
  turrets: Turret[];
  orbs: Orb[];
  enemies: Enemy[];
  waves: Waves;
  /** Update 0.0.15 — quake rings rolling over the floor. */
  quakes: Quake[];
  /** Update 0.0.21 — the Dragon's fire bombs falling. */
  bombs: Bomb[];
  /** Update 0.2.4 — the Lizards' poison puddles. Update 0.2.23 — floor 2's wasps' hives (sim/dungeon/hives.ts).
   *  Update 0.2.24 — the crystals of the room you're fighting in (floor 3's: Skull Wraiths blink to them). */
  puddles: Puddle[];
  hives: Hive[];
  /** Update 0.3.51 — The Swarm's big worms. */
  wormlings: Wormling[];
  /** Update 0.3.11 — floor 7's ice; Update 0.3.15 — and every pit, floor 6's boardwalks (dungeon/ground.ts). */
  ground: Ground;
  crystals: Spot[];
  /** Update 0.0.11 — where enemies can walk (from the arena, a grid per size), and the way from anywhere to you. */
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
  /** Update 0.1.9 — the Dual Daggers' volley (right click held) and its daggers in flight or stuck in walls. */
  volley: Volley;
  knives: Knife[];
  /** Update 0.2.4 — the Pistol's aim, reload and spread (gun.ts). */
  gun: GunState;
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
  /** Update 0.2.3 — the Bone King holding you (grab.ts). */
  grab: Grab;
  /** Update 0.2.8 — the Velociraptor pinning you (pin.ts), and its sandstorm (seconds left; 0: none). */
  pin: Pin;
  storm: number;
  /** Update 0.2.10 — the water's level where the fight is (floor 5's tide, or the Drowned King's flood; 0: dry), and
   *  the thorns' damage owed to you this tick (an Urchin hit with its spikes out: urchin.ts). The Drowned King's room's
   *  water (m: drownedKing.ts floods and drains it; Run makes it the tide while its fight is on). */
  tide: number;
  thorns: number;
  flood: number;
  /** Update 0.3.17 — gravity, this share of the usual (floor 8's moon; none: 1). */
  gravity?: number;
  /** Update 0.1.12 — seconds since there was last an enemy you could execute (the sting plays only after a while). */
  execAway: number;
  /** Update 0.1.1 — the Lab's Meter: the Execution Power meter kept full. */
  fullMeter: boolean;
  /** Update 0.1.14 — enemies you've killed this run (the death screen). */
  kills: number;
  /** Update 0.0.16 — items on the floor, and the keys the room you're fighting in still gives (a Yeti drops one). */
  drops: Drop[];
  keyDrops: number;
  /** Update 0.1.20 — they're a challenge room's: white or gold, never a normal key. */
  betterKeys: boolean;
  /** Update 0.2.12 — ARE YOU EVEN HUMAN? (the designer: "just fists and nothing else"): nothing is dropped or found (no
   *  swords, coins, keys, bonuses, chests, rewards); executions still heal (the designer: "executions always heals"). */
  bare: boolean;
  /** Update 0.3.70 — you're the Playable Demon: the sword's always in hand, so no other weapon's yours. And Hellwarden's
   *  just fallen (for the Run to tell the App: the Demon's earned, whatever the difficulty). */
  demon: boolean;
  /** Update 0.3.81 — you're Gravity Sean: his hands are his moves, so no other weapon's yours and E's his stance; and his gravity. */
  sean: boolean;
  grav: GravityState;
  wardenBeaten: boolean;
  /** Update 0.2.17 — Fate Cards are on this run (the lobby's stand): chests deal them. */
  fate: boolean;
  /** Update 0.2.15 — the Scars'. Update 0.2.16 — the Fate Cards' (sim/cards/): you're off the ground this tick (Air
   *  Butcher); the enemies your dash or slide has bumped, and which of them it is (Shoulder Charge, Bowling); a deal up
   *  (null: none; the world holds still while it is); the fight's clock (s); seconds of Bloodrush, Killing Spree and
   *  Giant Killer left; the last kills' times (Killing Spree); your hits counted so far (Blood Money). */
  inAir: boolean;
  bumped: number[];
  bumpMove: number;
  deal: Deal | null;
  clock: number;
  rush: number;
  frenzy: number;
  giant: number;
  spree: number[];
  hitsSeen: number;
  /** Update 0.2.18 — wave 2's: bleeds, burns, bolts, blasts (sim/cards/cardPowers.ts). */
  powers: Powers;
  /** Update 0.3.9 — the floor's pillars, whole or broken (pillars.ts). */
  pillars: Pillar[];
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
    blade: createBladeSwing(),
    demonFire: createDemonFire(),
    dummies: arena.dummies.map(createDummy),
    turrets: arena.turrets.map(createTurret),
    orbs: createOrbs(),
    enemies: createEnemies(),
    waves: createWaves(),
    quakes: createQuakes(),
    bombs: createBombs(),
    puddles: createPuddles(),
    hives: [],
    wormlings: createWormlings(),
    ground: noGround(),
    crystals: [],
    nav,
    flow: { small: createFlow(nav.small), large: createFlow(nav.large), air: createFlow(nav.air) },
    weapon: null,
    bag: createBag(),
    slot: 0,
    bonuses: createBonuses(),
    bonusDrops: Infinity,
    pickups: createPickups(),
    stands: createStands(arena.stands),
    pillars: pillarsOf(arena),
    thrown: createThrown(),
    fireballs: createFireballs(),
    ki: createKi(),
    smashWaves: createSmashWaves(),
    volley: createVolley(),
    gun: createGun(),
    knives: createKnives(),
    recallHeld: false,
    smashHeld: false,
    rng: createRng(LAB_SEED),
    money: 0,
    coins: createCoins(),
    items: createInventory(),
    execution: 0,
    exec: createExecution(),
    execTarget: -1,
    grab: createGrab(),
    pin: createPin(),
    storm: 0,
    tide: 0,
    thorns: 0,
    flood: 0,
    execAway: Infinity,
    fullMeter: false,
    kills: 0,
    drops: createDrops(),
    keyDrops: 0,
    betterKeys: false,
    bare: false,
    demon: false,
    sean: false,
    grav: createGravity(),
    wardenBeaten: false,
    fate: true,
    inAir: false,
    bumped: [],
    bumpMove: 0,
    deal: null,
    clock: 0,
    rush: 0,
    frenzy: 0,
    giant: 0,
    spree: [],
    hitsSeen: 0,
    powers: createPowers(),
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
  state.blade = createBladeSwing();
  state.demonFire = createDemonFire();
  state.grav = createGravity();
  state.dummies = arena.dummies.map(createDummy);
  state.turrets = arena.turrets.map(createTurret);
  for (const o of state.orbs) o.alive = false;
  for (const e of state.enemies) e.alive = false;
  state.waves = createWaves();
  clearQuakes(state.quakes);
  clearBombs(state.bombs);
  clearPuddles(state.puddles);
  resetHives(state.hives);
  clearWormlings(state.wormlings);
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
  state.volley = createVolley();
  state.gun = createGun();
  for (const k of state.knives) k.alive = false;
  state.recallHeld = state.smashHeld = false;
  state.stands = createStands(arena.stands);
  state.pillars = pillarsOf(arena);
  state.rng = createRng(LAB_SEED);
  state.money = 0;
  for (const c of state.coins) c.alive = false;
  state.items = createInventory();
  state.execution = 0;
  state.exec.active = false;
  state.execTarget = -1;
  state.grab = createGrab();
  state.pin = createPin();
  state.storm = 0;
  state.tide = state.thorns = state.flood = 0;
  state.execAway = Infinity;
  state.kills = 0;
  for (const d of state.drops) d.alive = false;
  state.keyDrops = 0;
  state.betterKeys = false;
  state.bumped.length = 0;
  state.bumpMove = 0;
  state.deal = null;
  state.clock = state.rush = state.frenzy = state.giant = state.hitsSeen = 0;
  state.spree.length = 0;
  clearPowers(state.powers);
  stockStands(state);
  state.hitStop.remaining = 0;
  state.events.clear();
}

export { carryOver } from './carry';
