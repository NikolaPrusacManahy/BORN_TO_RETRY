// M1 step 6 — one combat tick: the fists (and the punch they throw, and its blood heal), then the dummies, the
// turrets and the orbs. Each part lives in its own module; this file only decides the order.
// M2 — first the weapon in hand (E picks one up; Q throws it, and so does the next attack once it's broken), and its
// swings; after the targets, the grunts and the lab's waves of them, weapons in flight, and the lab's stands.
import { Vector3 } from 'three';
import type { Spot } from '../../world/arena';
import type { CollisionWorld } from '../collisionWorld';
import { separateGrunts, updateGrunt } from '../enemies/grunt';
import { updateWaves } from '../enemies/waves';
import { bloodHeal } from '../player/health';
import type { PlayerState } from '../player/state';
import { asCleave, updateSlashes, usesFor } from '../weapons/swing';
import { updateThrown } from '../weapons/thrown';
import { throwWeapon, tryPickup, updateStands } from '../weapons/weapons';
import { updateDummy } from './dummy';
import { CombatIntent, emptyPunch, updateFists } from './fists';
import { updateOrbs } from './orbs';
import { aim, resolvePunch } from './punch';
import type { CombatState } from './state';
import { updateTurret } from './turret';

const eye = new Vector3();
const dir = new Vector3();
const punch = emptyPunch();

/** `spawns`: where the lab's grunts may come from (none: no waves). */
export function stepCombat(state: CombatState, player: PlayerState, intent: CombatIntent, world: CollisionWorld, dt: number, spawns: readonly Spot[] = []) {
  const events = state.events;
  if (intent.interactPressed) state.weapon = tryPickup(state.weapon, state.pickups, state.stands, player, events);
  const held = state.weapon;
  if (held && (intent.throwPressed || (held.uses <= 0 && (intent.attackPressed || intent.heavyHeld)))) {
    aim(player, intent.yaw, intent.pitch, eye, dir);
    throwWeapon(held, state.thrown, eye, dir, events);
    state.weapon = null;
    state.fists.charging = state.fists.chargeReady = false;
  }

  const w = state.weapon;
  let swung = updateFists(state.fists, intent, events, dt, punch, w !== null);
  if (swung && punch.kind === 'cleave' && w) asCleave(w, punch);
  if (!swung && w && !state.fists.charging) swung = updateSlashes(w, intent, events, dt, punch);
  if (swung) {
    aim(player, intent.yaw, intent.pitch, eye, dir);
    const landed = resolvePunch(punch, state, eye, dir, world);
    if (landed >= 0) {
      bloodHeal(player, punch.damage, landed);
      if (w && (punch.kind === 'slash' || punch.kind === 'cleave')) {
        w.uses = Math.max(0, w.uses - usesFor(w, punch.kind));
        if (w.uses === 0) events.push('weaponBroken');
      }
    }
  }

  for (const d of state.dummies) updateDummy(d, events, dt);
  for (const t of state.turrets) updateTurret(t, player.pos, world, state.orbs, events, dt);
  updateOrbs(state.orbs, player, world, events, dt);
  for (let i = 0; i < state.grunts.length; i++) updateGrunt(state.grunts[i], i, player, world, events, dt);
  separateGrunts(state.grunts);
  updateWaves(state.waves, state.grunts, spawns, player, state.rng, events, dt);
  updateThrown(state, world, dt);
  updateStands(state.stands, state.pickups, events, dt);
}
