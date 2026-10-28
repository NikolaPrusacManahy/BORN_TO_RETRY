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
import { createFlow, Flow } from '../enemies/chase';
import { createEnemies, Enemy } from '../enemies/enemy';
import { Coin, createCoins } from './coins';
import { Quake, clearQuakes, createQuakes } from './quakes';
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

export type CombatEvent =
  | 'none'
  // Punches thrown (for the arms): value = combo step for jabs, charge (0..1) for heavy.
  | 'jabL'
  | 'jabR'
  | 'chargeStart'
  | 'chargeReady'
  | 'chargeCancel'
  | 'heavy'
  // M2 — sword swings (for the arms).
  | 'slash'
  | 'pierce'
  // What a punch or swing did; x, y, z = where.
  | 'whiff'
  | 'hitJab'
  | 'hitFinisher'
  | 'hitHeavy'
  | 'hitSlash'
  | 'hitPierce'
  | 'hitThrown'
  | 'kill'
  // The targets.
  | 'telegraph'
  | 'orbFire'
  | 'orbPop'
  | 'orbHitPlayer'
  | 'respawn'
  // M2 — enemies (value = which enemy): one arriving, each kind's warning and attack.
  | 'enemySpawn'
  | 'gruntWindup'
  | 'gruntStrike'
  | 'spitterWindup'
  | 'spit'
  | 'bruteWindup'
  | 'bruteSlam'
  // Update 0.0.13 — the leaper's crouch, its leap and its landing; the stinger's warning and its dive; the wraith's
  // warning and its cast.
  | 'leaperWindup'
  | 'leaperLeap'
  | 'leaperLand'
  | 'stingerWindup'
  | 'stingerDive'
  | 'wraithWindup'
  | 'wraithCast'
  // Update 0.0.15 — the Demon (value = which enemy, or the move for its warning: 0 charge, 1 leap, 2 volley): its
  // warning, its charge running into you or into a wall (stunned), its leap and landing, its volley, its roar; a quake
  // ring rolling under you (value = damage).
  | 'demonWindup'
  | 'demonCharge'
  | 'demonGore'
  | 'demonCrash'
  | 'demonLeap'
  | 'demonSlam'
  | 'demonVolley'
  | 'demonRoar'
  | 'quakeHit'
  // Update 0.0.15 — the boss room (value = the boss's slot): its show starts, the boss rises out of the portal, it's
  // killed, its body bursts, what it leaves you (value = the item), the wooden gate swings open.
  | 'bossIntro'
  | 'bossRise'
  | 'bossDown'
  | 'bossBurst'
  | 'bossLoot'
  | 'woodGateOpen'
  // Update 0.0.12 — your ground slam landing (value = its radius), and what it hit. A coin reaching you (value = your
  // money after).
  | 'slamImpact'
  | 'hitSlam'
  | 'coin'
  // Update 0.0.12 — the dungeon's room loop (value = the room; x, y, z = its middle): its gates slam shut, they open
  // (cleared); you take the way down (value = the floor you leave).
  | 'gatesShut'
  | 'gatesOpen'
  | 'floorExit'
  // Update 0.0.13 — an item is yours (value = its index in ITEM_KINDS); bought (value = the same), or not (value = the
  // offer); a chest begins opening, is locked (no key), lets out its loot (value = its item, −1: coins).
  | 'item'
  | 'buy'
  | 'buyFail'
  | 'chestOpen'
  | 'chestLocked'
  | 'chestLoot'
  // Update 0.0.16 — the key to use switched (value = its item), a chest's rarity as its lid is up (value = its index in
  // RARITIES), an item falling to the floor (value = the item: a Yeti's key).
  | 'keySwitch'
  | 'chestRarity'
  | 'itemDrop'
  // Update 0.0.17 — a kill bonus taken (value = its index in BONUS_KINDS), a hit that froze (value = the enemy), a
  // weapon slot picked (value = the slot).
  | 'bonus'
  | 'freeze'
  | 'weaponSwap'
  // Update 0.0.18 — floor 2's enemies (value = which enemy; the Blue Demon's warning: its move): the slime swelling and
  // bursting, the frog's warning and its tongue (x, y, z = the tongue's end), the snake's warning and bite, the wasp's
  // warning and sting, the spider's warning, leap, landing and bite, the Blue Demon's warning and fireball (its charge
  // is the Demon's: 'demonCharge', 'demonCrash', 'demonGore').
  | 'slimeWindup'
  | 'slimeBlast'
  | 'frogWindup'
  | 'frogTongue'
  | 'snakeWindup'
  | 'snakeBite'
  | 'waspWindup'
  | 'waspSting'
  | 'spiderWindup'
  | 'spiderLeap'
  | 'spiderLand'
  | 'spiderBite'
  | 'blueWindup'
  | 'blueFireball'
  // Update 0.0.18 — the Dragon: a warning (value = its move), the beam starting, a fireball, the wing and the tail
  // swinging, its scream (rising in its show, and raging), an enemy burnt away by the beam (value = its slot).
  | 'dragonWindup'
  | 'dragonBreath'
  | 'dragonFireball'
  | 'dragonWing'
  | 'dragonTail'
  | 'dragonScream'
  | 'burnt'
  // M2 — weapons: picked up (value = its uses), dropped, worn out, a throw begun and let go, broken on impact, back
  // on the stand.
  | 'pickup'
  | 'weaponDrop'
  | 'weaponBroken'
  | 'throwStart'
  | 'throw'
  | 'thrownBreak'
  | 'standRespawn';

export interface CombatState {
  fists: FistState;
  dummies: Dummy[];
  turrets: Turret[];
  orbs: Orb[];
  enemies: Enemy[];
  waves: Waves;
  /** Update 0.0.15 — quake rings rolling over the floor. */
  quakes: Quake[];
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
  rng: Rng;
  /** Update 0.0.12 — your coins, and the ones still flying. */
  money: number;
  coins: Coin[];
  /** Update 0.0.13 — keys and rings you carry. */
  items: Inventory;
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
    rng: createRng(LAB_SEED),
    money: 0,
    coins: createCoins(),
    items: createInventory(),
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
  state.flow.small.target = state.flow.large.target = state.flow.air.target = -1;
  state.weapon = null;
  state.bag = createBag();
  state.slot = 0;
  state.bonuses = createBonuses();
  state.bonusDrops = Infinity;
  for (const p of state.pickups) p.alive = false;
  for (const t of state.thrown) t.alive = false;
  state.stands = createStands(arena.stands);
  state.rng = createRng(LAB_SEED);
  state.money = 0;
  for (const c of state.coins) c.alive = false;
  state.items = createInventory();
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
}
