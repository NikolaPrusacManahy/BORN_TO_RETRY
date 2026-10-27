// M1 step 6 — everything the combat rules remember between ticks, and the events they report.
import { EventQueue } from '../../core/eventQueue';
import type { Arena } from '../../world/arena';
import { FistState, createFists } from './fists';
import { HitStop } from './hitStop';
import { Dummy, Orb, Turret, createDummy, createOrbs, createTurret } from './targets';

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
  // What a punch did; x, y, z = where.
  | 'whiff'
  | 'hitJab'
  | 'hitFinisher'
  | 'hitHeavy'
  | 'hitQuick'
  | 'kill'
  // The targets.
  | 'telegraph'
  | 'orbFire'
  | 'orbPop'
  | 'orbHitPlayer'
  | 'respawn';

export interface CombatState {
  fists: FistState;
  dummies: Dummy[];
  turrets: Turret[];
  orbs: Orb[];
  hitStop: HitStop;
  events: EventQueue<CombatEvent>;
}

export function createCombat(arena: Arena): CombatState {
  return {
    fists: createFists(),
    dummies: arena.dummies.map(createDummy),
    turrets: arena.turrets.map(createTurret),
    orbs: createOrbs(),
    hitStop: new HitStop(),
    events: new EventQueue<CombatEvent>(64, 'none'),
  };
}

/** Everything back to fresh: targets whole and in place, no orbs, no punch in progress. */
export function resetCombat(state: CombatState, arena: Arena) {
  state.fists = createFists();
  state.dummies = arena.dummies.map(createDummy);
  state.turrets = arena.turrets.map(createTurret);
  for (const o of state.orbs) o.alive = false;
  state.hitStop.remaining = 0;
  state.events.clear();
}
