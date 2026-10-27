// M1 step 6 — everything the combat rules remember between ticks, and the events they report.
// M2 — and the grunts and their waves, the weapon you hold, weapons on the ground and in flight, and the seeded RNG
// that drops and spawns use.
import { EventQueue } from '../../core/eventQueue';
import { Rng, createRng } from '../../core/rng';
import { Vector3 } from 'three';
import type { Arena } from '../../world/arena';
import { WEAPON_STATS } from '../weapons/catalog';
import { HeldWeapon, Pickup, Stand, Thrown, createPickups, createStands, createThrown, placePickup } from '../weapons/weapons';
import { Grunt, createGrunts } from '../enemies/grunt';
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
  | 'quick'
  // M2 — sword swings (for the arms).
  | 'slashL'
  | 'slashR'
  | 'cleave'
  // What a punch or swing did; x, y, z = where.
  | 'whiff'
  | 'hitJab'
  | 'hitFinisher'
  | 'hitHeavy'
  | 'hitQuick'
  | 'hitSlash'
  | 'hitCleave'
  | 'hitThrown'
  | 'kill'
  // The targets.
  | 'telegraph'
  | 'orbFire'
  | 'orbPop'
  | 'orbHitPlayer'
  | 'respawn'
  // M2 — grunts (value = which grunt).
  | 'gruntSpawn'
  | 'gruntWindup'
  | 'gruntStrike'
  // M2 — weapons: picked up (value = its uses), dropped, worn out, thrown, broken on impact, back on the stand.
  | 'pickup'
  | 'weaponDrop'
  | 'weaponBroken'
  | 'throw'
  | 'thrownBreak'
  | 'standRespawn';

export interface CombatState {
  fists: FistState;
  dummies: Dummy[];
  turrets: Turret[];
  orbs: Orb[];
  grunts: Grunt[];
  waves: Waves;
  /** The weapon in your hand (null: barehanded). */
  weapon: HeldWeapon | null;
  pickups: Pickup[];
  stands: Stand[];
  thrown: Thrown[];
  rng: Rng;
  hitStop: HitStop;
  events: EventQueue<CombatEvent>;
}

const at = new Vector3();

/** The lab stands each hold a full weapon. */
function stockStands(state: CombatState) {
  state.stands.forEach((s, i) => {
    s.timer = 0;
    placePickup(state.pickups, s.kind, WEAPON_STATS[s.kind]().standUses, at.copy(s.pos), i);
  });
}

export function createCombat(arena: Arena): CombatState {
  const state: CombatState = {
    fists: createFists(),
    dummies: arena.dummies.map(createDummy),
    turrets: arena.turrets.map(createTurret),
    orbs: createOrbs(),
    grunts: createGrunts(),
    waves: createWaves(),
    weapon: null,
    pickups: createPickups(),
    stands: createStands(arena.stands),
    thrown: createThrown(),
    rng: createRng(LAB_SEED),
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
  for (const g of state.grunts) g.alive = false;
  state.waves = createWaves();
  state.weapon = null;
  for (const p of state.pickups) p.alive = false;
  for (const t of state.thrown) t.alive = false;
  state.stands = createStands(arena.stands);
  state.rng = createRng(LAB_SEED);
  stockStands(state);
  state.hitStop.remaining = 0;
  state.events.clear();
}
