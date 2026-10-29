// M1 step 6 — one combat tick: the fists (and the punch they throw), then the dummies, the turrets and the orbs. Each
// part lives in its own module; this file only decides the order. (Update 0.0.13 — no blood heal any more: the
// designer.)
// M2 — first the weapon in hand (E picks one up; Q throws it, and so does the next attack once it's broken: a short
// wind-up, then it flies), and its swings; after the targets, the grunts and the lab's waves of them, weapons in
// flight, and the lab's stands.
// Update 0.0.15 — quake rings roll after the enemies move (a landing starts one).
// Update 0.0.16 — you take an item on the floor by walking over it.
// Update 0.0.17 — weapon slots (the number keys; a weapon picked up goes into the next free one), green rings' quicker
// attacks, kill bonuses counting down.
// Update 0.1.1 — E near an enemy you can execute (the meter full) executes it (before picking up a weapon); while you
// hold it, nothing else moves.
// Update 0.1.4 — the Grimoire casts fireballs instead of swinging: left click, and right click held charges one
// (kiCharge.ts) cast as it's let go; fireballs fly after the enemies move.
// Update 0.1.5 — the Gold Axe: thrown, it comes back when right click is held with your fists out (recall.ts; no
// charged punch while it's out). The Hammer: its charged blow smashes the floor, a shockwave rolling out
// (smashWaves.ts), and takes its uses hit or miss.
// Update 0.1.6 — the axe's right click charges a throw that comes back (axeThrow.ts); Q throws it to break.
// Update 0.1.7 — the Hammer's smash waits for the ground: a full charge let go in the air is held till you land.
// Update 0.1.12 — an enemy you can execute coming into reach after a while with none: a sting (the skull over it is
// engine/execMarkView.ts's).
// Update 0.1.9 — the Dual Daggers: right click held charges a volley of thrown daggers (knives.ts; no cuts meanwhile);
// the daggers fly after the enemies move.
import { Vector3 } from 'three';
import type { Spot } from '../../world/arena';
import type { CollisionWorld } from '../collisionWorld';
import { updateEnemies } from '../enemies/update';
import { updateWaves } from '../enemies/waves';
import type { PlayerState } from '../player/state';
import { asPierce, updateSlashes, usesFor } from '../weapons/swing';
import { updateThrown } from '../weapons/thrown';
import { castFireball, updateCasts, updateFireballs } from '../weapons/fireballs';
import { dropKi, updateKi } from '../weapons/kiCharge';
import { CASTS, RETURNS, SMASHES, VOLLEYS } from '../weapons/catalog';
import { dropVolley, updateKnives, updateVolley, volleyBusy } from '../weapons/knives';
import { updateAxeCharge } from '../weapons/axeThrow';
import { axeOut, callBack } from '../weapons/recall';
import { startWave, updateSmashWaves } from '../weapons/smashWaves';
import { throwWeapon, tryPickup, updateStands } from '../weapons/weapons';
import { WEAPONS } from '../../tuning/weapons';
import { updateDummy } from './dummy';
import { CombatIntent, emptyCombatIntent, emptyPunch, updateFists } from './fists';
import { updateOrbs } from './orbs';
import { aim, resolvePunch } from './punch';
import { slamImpact } from './slamHit';
import { updateCoins } from './coins';
import { updateQuakes } from './quakes';
import { updateBombs } from './bombs';
import { updateDrops } from '../items/drops';
import { updateBonuses } from '../items/bonuses';
import { attackRate } from '../items/items';
import { emptyHand, giveWeapon, selectSlot, settleHand } from '../weapons/slots';
import type { CombatState } from './state';
import { execHeld, execTarget, stepExecution, tryExecute } from './execution';
import { updateTurret } from './turret';

/** Update 0.1.12 — seconds with no enemy you could execute before a new one stings again. */
const EXEC_QUIET = 0.75;

const eye = new Vector3();
const dir = new Vector3();
const punch = emptyPunch();
/** No presses (a throw winding up takes no other attack). */
const IDLE = emptyCombatIntent();
/** The presses without right click (the axe out: right click calls it back). */
const NO_HEAVY = emptyCombatIntent();
/** The presses with right click held (a smash held till the ground). */
const HOLD_HEAVY = emptyCombatIntent();

/** `spawns`: where the lab's grunts may come from (none: no waves). */
export function stepCombat(state: CombatState, player: PlayerState, intent: CombatIntent, world: CollisionWorld, dt: number, spawns: readonly Spot[] = []) {
  const events = state.events;
  // Update 0.0.13 — kneeling at a chest, you don't fight.
  if (player.kneel > 0) intent = IDLE;
  settleHand(state);
  const throwing = state.weapon !== null && state.weapon.throwing >= 0;
  if (state.fullMeter) state.execution = 1;
  state.execTarget = execTarget(state, player, intent.yaw);
  if (state.execTarget >= 0) {
    if (state.execAway >= EXEC_QUIET) {
      const e = state.enemies[state.execTarget];
      events.push('execReady', state.execTarget, e.pos.x, e.pos.y, e.pos.z);
    }
    state.execAway = 0;
  } else state.execAway += dt;
  const executing = intent.interactPressed && !throwing && tryExecute(state, player, intent.yaw, intent.pitch);
  if (execHeld(state.exec)) {
    // The world holds still while you hold it (and a Grimoire's charge or a volley is dropped).
    dropKi(state.ki);
    dropVolley(state);
    stepExecution(state, dt);
    state.money = updateCoins(state.coins, player, state.money, events, dt);
    return;
  }
  stepExecution(state, dt);
  if (intent.interactPressed && !throwing && !executing) {
    const got = tryPickup(state.pickups, state.stands, player, events);
    if (got) giveWeapon(state, got, player.pos);
  }
  if (intent.slotPressed >= 0 && !throwing && !state.fists.charging && !state.ki.charging) selectSlot(state, intent.slotPressed);
  const held = state.weapon;
  // (A charge that has burnt the book's last use is still let go as a cast, not a throw.)
  const spent = held !== null && held.uses <= 0 && !state.ki.charging && (intent.attackPressed || intent.heavyHeld);
  if (held && !throwing && (intent.throwPressed || spent)) {
    held.throwing = 0;
    state.fists.charging = state.fists.chargeReady = false;
    events.push('throwStart');
  }
  if (held && held.throwing >= 0) {
    held.throwing += dt;
    if (held.throwing >= WEAPONS.v.throwWindup) {
      aim(player, intent.yaw, intent.pitch, eye, dir);
      throwWeapon(held, state.thrown, eye, dir, events);
      emptyHand(state);
    }
  }

  // While a throw winds up, nothing else attacks.
  const w = state.weapon;
  const busy = w !== null && w.throwing >= 0;
  const rate = attackRate(state.items);
  const casts = w !== null && CASTS[w.kind];
  const axe = w !== null && RETURNS[w.kind] && !busy && w.uses > 0;
  // Fists out with the axe out there: right click calls it back (and, caught, charges nothing till it's let go).
  let fistIntent = intent;
  const out = w === null && axeOut(state);
  if (out && intent.heavyHeld) {
    callBack(state);
    state.recallHeld = true;
  }
  if (!intent.heavyHeld) state.recallHeld = false;
  if (out || state.recallHeld) {
    fistIntent = Object.assign(NO_HEAVY, intent);
    NO_HEAVY.heavyHeld = false;
    state.fists.charging = state.fists.chargeReady = false;
  }
  // The Hammer's smash only on the ground (the designer): let go in the air at full charge, it's held, and comes down
  // the tick you land.
  const smasher = w !== null && SMASHES[w.kind] && !busy;
  if (smasher && !player.grounded && state.fists.chargeReady && !intent.heavyHeld) state.smashHeld = true;
  if (!smasher || player.grounded) state.smashHeld = false;
  if (state.smashHeld) {
    fistIntent = Object.assign(HOLD_HEAVY, fistIntent);
    HOLD_HEAVY.heavyHeld = true;
  }
  // (The Grimoire's right click is its own charge, not the fists'; the axe's charges its throw; the daggers' a volley.)
  const volley = w !== null && VOLLEYS[w.kind] && !busy;
  if (volley && w) updateVolley(state, w, player, intent.heavyHeld && player.kneel <= 0, intent.yaw, intent.pitch, dt, rate);
  else dropVolley(state);
  let swung = axe || volley ? false : updateFists(state.fists, busy || casts ? IDLE : fistIntent, events, dt, punch, w !== null, rate);
  if (axe && w) {
    const power = updateAxeCharge(state, intent.heavyHeld && !state.recallHeld, dt);
    if (power >= 0) {
      aim(player, intent.yaw, intent.pitch, eye, dir);
      throwWeapon(w, state.thrown, eye, dir, events, true, power);
      emptyHand(state);
    }
  }
  if (casts && w && !busy) {
    const ki = state.ki;
    if (updateKi(state, w, intent, dt)) {
      // Let go: a quick tap is a plain fireball (a use); a charge has paid as it built.
      aim(player, intent.yaw, intent.pitch, eye, dir);
      castFireball(state, w, eye, dir, ki.paid > 0 ? ki.t : 0, ki.paid > 0 ? 0 : 1);
      dropKi(ki);
    } else if (!ki.charging && w.uses > 0 && updateCasts(w, intent, dt, rate)) {
      aim(player, intent.yaw, intent.pitch, eye, dir);
      castFireball(state, w, eye, dir, 0, 1);
    }
  } else dropKi(state.ki);
  if (swung && punch.kind === 'pierce' && w) asPierce(w, punch);
  if (!swung && w && state.weapon === w && !casts && !busy && !state.fists.charging && !volleyBusy(state.volley)) swung = updateSlashes(w, intent, events, dt, punch, rate);
  if (swung) {
    aim(player, intent.yaw, intent.pitch, eye, dir);
    const landed = resolvePunch(punch, state, eye, dir, world);
    const smash = w !== null && punch.kind === 'pierce' && SMASHES[w.kind];
    if (smash) startWave(state, player, dir, world);
    if ((landed >= 0 || smash) && w && (punch.kind === 'slash' || punch.kind === 'pierce')) {
      w.uses = Math.max(0, w.uses - usesFor(w, punch.kind));
      if (w.uses === 0) events.push('weaponBroken');
    }
  }

  for (const d of state.dummies) updateDummy(d, events, dt);
  for (const t of state.turrets) updateTurret(t, player.pos, world, state.orbs, events, dt);
  updateOrbs(state.orbs, player, world, events, dt);
  if (player.slamImpact > 0) {
    slamImpact(state, player.pos, player.slamImpact);
    player.slamImpact = 0;
  }
  updateEnemies(state.enemies, player, state, world, dt);
  updateQuakes(state.quakes, player, events, dt);
  updateBombs(state.bombs, player, events, dt);
  updateWaves(state.waves, state.enemies, spawns, player, state.rng, events, dt);
  updateThrown(state, world, player, dt);
  updateFireballs(state, world, dt);
  updateKnives(state, world, dt);
  updateSmashWaves(state, dt);
  state.money = updateCoins(state.coins, player, state.money, events, dt);
  updateDrops(state, player, dt);
  updateBonuses(state.bonuses, dt);
  updateStands(state.stands, state.pickups, events, dt);
}
