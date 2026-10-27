// M1 step 6 — one combat tick: the fists (and the punch they throw, and its blood heal), then the dummies, the
// turrets and the orbs. Each part lives in its own module; this file only decides the order.
import { Vector3 } from 'three';
import type { CollisionWorld } from '../collisionWorld';
import { bloodHeal } from '../player/health';
import type { PlayerState } from '../player/state';
import { updateDummy } from './dummy';
import { CombatIntent, Punch, updateFists } from './fists';
import { updateOrbs } from './orbs';
import { aim, resolvePunch } from './punch';
import type { CombatState } from './state';
import { updateTurret } from './turret';

const eye = new Vector3();
const dir = new Vector3();
const punch: Punch = { kind: 'jab', damage: 0, knock: 0, charge: 0 };

export function stepCombat(state: CombatState, player: PlayerState, intent: CombatIntent, world: CollisionWorld, dt: number) {
  if (updateFists(state.fists, intent, state.events, dt, punch)) {
    aim(player, intent.yaw, intent.pitch, eye, dir);
    const landed = resolvePunch(punch, state, eye, dir, world);
    if (landed >= 0) bloodHeal(player, punch.damage, landed);
  }
  for (const d of state.dummies) updateDummy(d, state.events, dt);
  for (const t of state.turrets) updateTurret(t, player.pos, world, state.orbs, state.events, dt);
  updateOrbs(state.orbs, player, world, state.events, dt);
}
