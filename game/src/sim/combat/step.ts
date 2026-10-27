// M1 step 6 — one combat tick: the fists (and the punch they throw, and its blood heal), then the dummies, the
// turrets and the orbs. Each part lives in its own module; this file only decides the order.
// M2 — first the weapon in hand (E picks one up; Q throws it, and so does the next attack once it's broken: a short
// wind-up, then it flies), and its swings; after the targets, the grunts and the lab's waves of them, weapons in
// flight, and the lab's stands.
import { Vector3 } from 'three';
import type { Spot } from '../../world/arena';
import type { CollisionWorld } from '../collisionWorld';
import { updateFlow } from '../enemies/chase';
import { separateGrunts, updateGrunt } from '../enemies/grunt';
import { updateWaves } from '../enemies/waves';
import { bloodHeal } from '../player/health';
import type { PlayerState } from '../player/state';
import { asPierce, updateSlashes, usesFor } from '../weapons/swing';
import { updateThrown } from '../weapons/thrown';
import { throwWeapon, tryPickup, updateStands } from '../weapons/weapons';
import { WEAPONS } from '../../tuning/weapons';
import { updateDummy } from './dummy';
import { CombatIntent, emptyCombatIntent, emptyPunch, updateFists } from './fists';
import { updateOrbs } from './orbs';
import { aim, resolvePunch } from './punch';
import type { CombatState } from './state';
import { updateTurret } from './turret';

const eye = new Vector3();
const dir = new Vector3();
const punch = emptyPunch();
/** No presses (a throw winding up takes no other attack). */
const IDLE = emptyCombatIntent();

/** `spawns`: where the lab's grunts may come from (none: no waves). */
export function stepCombat(state: CombatState, player: PlayerState, intent: CombatIntent, world: CollisionWorld, dt: number, spawns: readonly Spot[] = []) {
  const events = state.events;
  const throwing = state.weapon !== null && state.weapon.throwing >= 0;
  if (intent.interactPressed && !throwing) state.weapon = tryPickup(state.weapon, state.pickups, state.stands, player, events);
  const held = state.weapon;
  if (held && !throwing && (intent.throwPressed || (held.uses <= 0 && (intent.attackPressed || intent.heavyHeld)))) {
    held.throwing = 0;
    state.fists.charging = state.fists.chargeReady = false;
    events.push('throwStart');
  }
  if (held && held.throwing >= 0) {
    held.throwing += dt;
    if (held.throwing >= WEAPONS.v.throwWindup) {
      aim(player, intent.yaw, intent.pitch, eye, dir);
      throwWeapon(held, state.thrown, eye, dir, events);
      state.weapon = null;
    }
  }

  // While a throw winds up, nothing else attacks.
  const w = state.weapon;
  const busy = w !== null && w.throwing >= 0;
  let swung = updateFists(state.fists, busy ? IDLE : intent, events, dt, punch, w !== null);
  if (swung && punch.kind === 'pierce' && w) asPierce(w, punch);
  if (!swung && w && !busy && !state.fists.charging) swung = updateSlashes(w, intent, events, dt, punch);
  if (swung) {
    aim(player, intent.yaw, intent.pitch, eye, dir);
    const landed = resolvePunch(punch, state, eye, dir, world);
    if (landed >= 0) {
      bloodHeal(player, punch.damage, landed);
      if (w && (punch.kind === 'slash' || punch.kind === 'pierce')) {
        w.uses = Math.max(0, w.uses - usesFor(w, punch.kind));
        if (w.uses === 0) events.push('weaponBroken');
      }
    }
  }

  for (const d of state.dummies) updateDummy(d, events, dt);
  for (const t of state.turrets) updateTurret(t, player.pos, world, state.orbs, events, dt);
  updateOrbs(state.orbs, player, world, events, dt);
  updateFlow(state.flow, state.nav, player.pos.x, player.pos.z);
  for (let i = 0; i < state.grunts.length; i++) updateGrunt(state.grunts[i], i, player, state.nav, state.flow, events, dt);
  separateGrunts(state.grunts, state.nav);
  updateWaves(state.waves, state.grunts, spawns, player, state.rng, events, dt);
  updateThrown(state, world, dt);
  updateStands(state.stands, state.pickups, events, dt);
}
