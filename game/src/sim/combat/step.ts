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
// Update 0.2.3 — held in the Bone King's hand (grab.ts), nothing else moves: your attacks are hits on it.
// Update 0.2.8 — pinned by the Velociraptor (pin.ts), nothing else moves either: your dash is a twist out of its bite.
// Its sandstorm blows itself out (or ends with it).
import { damagePlayer, healPlayer } from '../player/health';
import { updatePuddles } from './puddles';
import { stepGrab, tickGrab } from './grab';
import { stepPin, tickPin } from './pin';
import { isLive } from '../enemies/enemy';
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
import { landBlade, startThrow, switchMode, updateBlade } from './bladeSwing';
import { bladeAway, blinkToBlade, regainBlade, stepThrown } from './bladeThrow';
import { stepDemonFire } from './demonFire';
import { feedOnFallen, landPlunge, stepLunge, tickCleave, tickDemon, tryBrand } from './demonMoves';
import { addHeat } from './heat';
import { landPlunge as landSeanPlunge, punchRate, punchWaves, shapePunch, stepDashPull, switchStance, tickGravity, trySeanSlam } from './gravity';
import { dropPiece, stepFall, stepRocks, stepSeanGrab } from './gravityGrab';
import { dropPalm, slowBosses, stepHole, stepPalm } from './gravityHole';
import { stepShock, tryShock } from './gravityShock';
import { escapeStop, endStop, stepStop } from './gravityStop';
import { stepMeteor, tryUltimate } from './gravityUlt';
import { stepVerdict, tryVerdict } from './lastVerdict';
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
import { parry, stepParried } from './parry';
import { wallSplats } from './splat';
import { execHeld, execTarget, stepExecution, tryExecute } from './execution';
import { stepFlood } from '../enemies/drownedKingMoves';
import { DROWNED } from '../../tuning/drowned';
import { breakCage } from '../enemies/boneKingMoves';
import { updateTurret } from './turret';
import { bumpEnemies, chargeRate, fistFactor, frenzyFactor, parryTimes, pogo, tickCards } from '../cards/cardMoves';
import { splinter, tickPowers } from '../cards/cardPowers';
import { staticStep, tremors } from '../cards/buildPowers';
import { holds } from '../cards/cards';
import { CARDS } from '../../tuning/cards';
import { stepFrost } from './frost';
import { stepSmoke } from './smoke';
import { stepHellfire } from './hellfire';
import { stepSpores } from './spores';

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
/** The presses with a click (one made in a slam, let go as you land). */
const CLICK = emptyCombatIntent();
/** Update 0.3.71 — the Demon's: the fists' rules keep only its parry. */
const NO_SWING = emptyCombatIntent();

/** `spawns`: where the lab's grunts may come from (none: no waves). */
export function stepCombat(state: CombatState, player: PlayerState, intent: CombatIntent, world: CollisionWorld, dt: number, spawns: readonly Spot[] = []) {
  const events = state.events;
  // Update 0.0.13 — kneeling at a chest, you don't fight.
  if (player.kneel > 0) intent = IDLE;
  // (Update 0.2.10 — the water drags you only while something drags you: the Drowned King's whirlpool, each tick.)
  player.current.set(0, 0, 0);
  // (Update 0.2.15 — Air Butcher's kills in the air. Update 0.2.16 — the Fate Cards' clocks.)
  state.inAir = !player.grounded;
  tickCards(state, player, dt);
  settleHand(state);
  // (Update 0.3.73 — the Demon's Last Verdict: the world holds still for it.)
  if (state.blade.verdict) {
    stepVerdict(state, player, dt);
    feedOnFallen(state, player);
    tickCleave(state, dt);
    return;
  }
  // (Update 0.3.83 — Gravity Sean's Meteor: so it does for that.)
  if (state.grav.meteor) {
    stepMeteor(state, player, intent.yaw, intent.pitch, world, dt);
    return;
  }
  tickGrab(state.grab, dt);
  if (state.grab.on) {
    stepGrab(state, player, intent, dt);
    return;
  }
  tickPin(state.pin, dt);
  if (state.pin.on) {
    stepPin(state, player, intent, dt);
    return;
  }
  // (Update 0.3.53 — shut in the Bone King's cage, a swing breaks a bar.)
  if (intent.attackPressed) breakCage(state);
  const throwing = state.weapon !== null && state.weapon.throwing >= 0;
  if (state.fullMeter) state.execution = 1;
  // (Update 0.3.73 — the Demon executes nothing: E is its own, and the bar's its heat. The Lab's Meter keeps that full instead.)
  if (state.fullMeter && state.demon) addHeat(state, 1);
  // (Update 0.3.81 — nor does Gravity Sean: E's his stance, and the bar's the meter his ultimates share.)
  if (state.fullMeter && state.sean) state.grav.ult = 1;
  const ownKit = state.demon || state.sean;
  state.execTarget = ownKit ? -1 : execTarget(state, player, intent.yaw);
  if (state.execTarget >= 0) {
    if (state.execAway >= EXEC_QUIET) {
      const e = state.enemies[state.execTarget];
      events.push('execReady', state.execTarget, e.pos.x, e.pos.y, e.pos.z);
    }
    state.execAway = 0;
  } else state.execAway += dt;
  const executing = !ownKit && intent.interactPressed && !throwing && tryExecute(state, player, intent.yaw, intent.pitch);
  if (execHeld(state.exec)) {
    // The world holds still while you hold it (and a Grimoire's charge or a volley is dropped).
    dropKi(state.ki);
    dropVolley(state);
    stepExecution(state, dt, player);
    state.money = updateCoins(state.coins, player, state.money, events, dt);
    return;
  }
  stepExecution(state, dt, player);
  // (Update 0.2.18 — wave 2's bleeds, burns, bolts and blasts: not while an execution holds the world.)
  // (Update 0.3.85 — nor through Gravity Sean's Time Stop.)
  if (!state.grav.stop) tickPowers(state, player, dt);
  // (Update 0.3.70 — the Demon takes no other weapon.)
  if (intent.interactPressed && !throwing && !executing && !ownKit) {
    const got = tryPickup(state.pickups, state.stands, player, events);
    if (got) giveWeapon(state, got, player.pos);
  }
  if (intent.slotPressed >= 0 && !throwing && !state.fists.charging && !state.ki.charging) selectSlot(state, intent.slotPressed);
  const held = state.weapon;
  // (A charge that has burnt the book's last use is still let go as a cast, not a throw.)
  // (Update 0.3.36 — a tester: "if you are holding attack and pick up a weapon you can use it infinitely as long as you
  // hold click": a broken one held swinging is thrown too, not swung on at no uses.)
  const spent = held !== null && held.uses <= 0 && !state.ki.charging && (intent.attackPressed || intent.attackHeld || intent.heavyHeld);
  if (held && !throwing && (intent.throwPressed || spent)) {
    held.throwing = 0;
    state.fists.charging = state.fists.chargeReady = false;
    events.push('throwStart');
  }
  if (held && held.throwing >= 0) {
    held.throwing += dt;
    if (held.throwing >= WEAPONS.v.throwWindup) {
      aim(player, intent.yaw, intent.pitch, eye, dir);
      // (Update 0.2.18 — Splinter, a Fate Card: in three.)
      splinter(state, throwWeapon(held, state.thrown, eye, dir, events));
      emptyHand(state);
    }
  }

  // While a throw winds up, nothing else attacks.
  const w = state.weapon;
  const busy = w !== null && w.throwing >= 0;
  // (Update 0.2.16 — and Killing Spree, a Fate Card.)
  // (Update 0.2.19 — Cramp: slower; Berserker: quicker.)
  const rate = attackRate(state.items) * frenzyFactor(state) * (holds(state, 'cramp') ? 1 - CARDS.v.cramp : 1) * (holds(state, 'berserker') ? 1 + CARDS.v.berserk : 1);
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
  // Update 0.2.21 — barehanded, a slam clasps the fists (a tester: the hands stuck up after a click in one): as it drops
  // they do nothing (a charge held, a cooldown paused); a click then is kept and punches as you land.
  const clasped = w === null && player.slamming;
  if (clasped && intent.attackPressed) state.fists.slamClick = true;
  if (!clasped && state.fists.slamClick) {
    state.fists.slamClick = false;
    fistIntent = Object.assign(CLICK, fistIntent);
    CLICK.attackPressed = true;
  }
  // (Update 0.3.71 — the Demon's left click is its blade's, not the fists': Blazing Arc, below.)
  const demon = state.demon && w === null;
  const b = state.blade;
  const swingPressed = fistIntent.attackPressed;
  const swingHeld = fistIntent.attackHeld;
  if (demon) {
    tickDemon(state, player, dt);
    // (Update 0.3.73 — Q: Last Verdict, and the world holds still from the next tick.)
    tryVerdict(state, player, intent.throwPressed);
    // (Update 0.3.74 — the designer: right click throws it and regains it; with it out, E goes to it. No parry: the fists' rules never see right click.)
    if (bladeAway(state)) {
      if (intent.heavyPressed) regainBlade(state);
      if (intent.interactPressed) blinkToBlade(state, player, intent.yaw, intent.pitch, world);
      if (bladeAway(state)) stepThrown(state, player, intent.yaw, intent.pitch, world, dt);
    } else {
      if (intent.heavyPressed && (b.step < 0 || b.struck) && !clasped && b.plant <= 0 && !b.verdict) {
        // (Update 0.3.79 — ranged mode has it put away: it's out again to be thrown.)
        if (b.ranged) switchMode(state);
        startThrow(state);
      }
      // (Update 0.3.78 — with it in hand, E's Mode Switch.)
      if (intent.interactPressed && !clasped && !b.verdict) switchMode(state);
    }
    fistIntent = Object.assign(NO_HEAVY, fistIntent);
    NO_HEAVY.heavyHeld = false;
  }
  // (Update 0.3.73 — with it out of your hand you've your gauntlets, by the fists' rules: a plain dash, a plain slam.)
  // (Update 0.3.79 — so too in ranged mode, the sword put away, but for what left click does.)
  const inHand = demon && !bladeAway(state);
  const sworded = inHand && !b.ranged;
  if (demon) player.demon = sworded;
  if (inHand) {
    fistIntent = Object.assign(NO_SWING, fistIntent);
    NO_SWING.attackPressed = NO_SWING.attackHeld = false;
  }
  if (sworded) {
    stepLunge(state, player);
    tryBrand(state, player, intent.slamPressed && !clasped);
  }
  // (Update 0.3.81 — Gravity Sean: E's his stance, right click's his own, not the parry; Ctrl on the ground's his slam; his fists keep their combo.)
  const sean = state.sean && w === null;
  if (sean) {
    // (Update 0.5.0 — Escape Velocity has just saved him; Bulwark asks if he's holding a piece.)
    if (player.rescued) escapeStop(state, player);
    player.holding = state.grav.held !== null;
    tickGravity(state, player, dt);
    // (Update 0.3.88 — what his kills in Unstable mode gave back.)
    if (state.grav.mend > 0) {
      healPlayer(player, state.grav.mend);
      state.grav.mend = 0;
      events.push('seanMend', 0, player.pos.x, player.pos.y, player.pos.z);
    }
    // (Update 0.3.83 — Q: an ultimate.)
    tryUltimate(state, player, intent.throwPressed, intent.yaw, intent.pitch, world);
    if (intent.interactPressed && !clasped) switchStance(state, player);
    player.unstable = state.grav.unstable;
    stepDashPull(state, player);
    // (Update 0.3.84 — by his stance. Right click: Grab, or Black Hole in his palm. Ctrl: Ground Slam, or Shockwave Punch. Switching drops what the other had.)
    if (state.grav.unstable) {
      dropPiece(state);
      stepPalm(state, player, intent.heavyPressed, intent.heavyHeld, intent.yaw, intent.pitch, dt);
      tryShock(state, player, intent.slamPressed && !clasped);
    } else {
      dropPalm(state);
      stepSeanGrab(state, player, intent.heavyPressed, intent.heavyHeld, intent.yaw, intent.pitch, world, dt);
      trySeanSlam(state, player, intent.slamPressed && !clasped);
    }
    stepShock(state, player, intent.yaw, intent.pitch, dt);
    // (Update 0.3.85 — a Black Hole he's thrown stops with everything else.)
    if (state.grav.stop) stepStop(state, player, dt);
    else stepHole(state, world, dt);
    fistIntent = Object.assign(NO_HEAVY, fistIntent);
    NO_HEAVY.heavyHeld = false;
    // (Update 0.3.89 — his palms joined, he's no fist free.)
    if (state.grav.held?.lifted) NO_HEAVY.attackPressed = NO_HEAVY.attackHeld = false;
  } else endStop(state, player);
  // (Update 0.3.5 — barehanded, right click is the parry: Hair Trigger's longer window, Giant Killer's no wait.)
  const times = parryTimes(state);
  let swung = axe || volley || clasped ? false : updateFists(state.fists, busy || casts ? IDLE : fistIntent, events, dt, punch, w !== null, sean ? rate * punchRate(state.grav) : rate, chargeRate(state), times);
  // (With the fists not in play — a weapon's own right click, the slam's clasp — the window shuts; a click held meanwhile
  // isn't a press after.)
  if (axe || volley || clasped) state.fists.parryHeld = intent.heavyHeld;
  if (axe || volley || clasped) state.fists.parryWindow = 0;
  if (state.fists.parryWindow > 0) {
    aim(player, intent.yaw, intent.pitch, eye, dir);
    // (Update 0.3.6 — one that lands: the long wait, Parry cooldown.)
    if (parry(state, eye, dir) >= 0) {
      state.fists.parryWindow = 0;
      // (Update 0.3.58 — a Drowned King's head: its short wait, or you could parry only one in a volley.)
      state.fists.parryCooldown = state.fists.quick ? Math.min(times.cooldown, DROWNED.v.headWait) : times.cooldown;
      state.fists.quick = false;
    }
  }
  // (Update 0.3.71 — a swing lands when its blade gets there.)
  if (inHand) {
    if (updateBlade(b, swingPressed, swingHeld, clasped || b.plant > 0 || player.dashTime > 0, events, dt, rate)) {
      aim(player, intent.yaw, intent.pitch, eye, dir);
      landBlade(state, b.step, eye, dir, world, fistFactor(state));
    }
  }
  if (swung && sean) shapePunch(state, punch);
  // (Update 0.2.16 — All In, a Fate Card: your fists hit twice as hard.)
  if (swung) punch.damage *= fistFactor(state);
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
    // (Update 0.3.86 — Gravity Sean's: you see it go, and land.)
    if (sean) punchWaves(state, player, punch, landed, eye, dir, world);
    const smash = w !== null && punch.kind === 'pierce' && SMASHES[w.kind];
    if (smash) startWave(state, player, dir, world);
    if ((landed >= 0 || smash) && w && (punch.kind === 'slash' || punch.kind === 'pierce')) {
      // (Update 0.2.19 — Rotten Grip, a Death Card: twice the wear.)
      w.uses = Math.max(0, w.uses - usesFor(w, punch.kind) * (holds(state, 'rottenGrip') ? 2 : 1));
      if (w.uses === 0) events.push('weaponBroken');
    }
  }

  const still = state.grav.stop !== null;
  if (!still) {
    for (const d of state.dummies) updateDummy(d, events, dt);
    for (const t of state.turrets) updateTurret(t, player.pos, world, state.orbs, events, dt);
    updateOrbs(state.orbs, player, world, events, dt, state.puddles);
    // (Update 0.3.3 — shots you punched back.)
    stepParried(state, world, dt);
  }
  if (player.slamImpact > 0) {
    // (Update 0.3.72 — the Demon's dive: Brand of Ruin, from however far it fell.)
    if (sworded) landPlunge(state, player, player.slamImpact);
    // (Update 0.3.81 — Gravity Sean's plunge knocks back as it lands, with or without Tremor.)
    else if (sean) landSeanPlunge(state, player, player.slamImpact);
    // (Update 0.2.15 — Pogo: a slam that kills bounces you back up. Update 0.2.22 — its blast: Tremor's.)
    else if (tremors(state)) pogo(state, player, slamImpact(state, player.pos, player.slamImpact));
    player.slamImpact = 0;
  }
  // (Update 0.3.85 — Gravity Sean's Time Stop: he and what he's thrown go on, and your coins come to you; nothing else does.)
  if (still) {
    stepRocks(state, world, dt);
    stepFall(state, dt);
    state.money = updateCoins(state.coins, player, state.money, events, dt);
    updateDrops(state, player, dt);
    return;
  }
  stepDemonFire(state, world, dt);
  // (Update 0.2.10 — an Urchin's thorns: your blows on it with its spikes out hurt you.)
  if (state.thorns > 0) {
    damagePlayer(player, state.thorns, 'urchin');
    state.thorns = 0;
  }
  // (Update 0.2.15 — Shoulder Charge and Bowling.)
  bumpEnemies(state, player);
  staticStep(state, player);
  updateEnemies(state.enemies, player, state, world, dt);
  // (Update 0.3.82 — what Gravity Sean's thrown.)
  if (state.sean) {
    stepRocks(state, world, dt);
    stepFall(state, dt);
    slowBosses(state);
  }
  // (Update 0.3.10 — a melee blow parried: the long wait, as after a shot.)
  if (state.fists.parried) {
    state.fists.parried = false;
    state.fists.parryCooldown = times.cooldown;
  }
  // (Update 0.3.7 — bodies thrown into walls.)
  wallSplats(state);
  if (state.storm > 0) state.storm = state.enemies.some((e) => e.kind === 'dino' && isLive(e)) ? Math.max(0, state.storm - dt) : 0;
  stepFlood(state, dt);
  updateQuakes(state.quakes, player, events, dt);
  updateBombs(state.bombs, player, events, dt, state.puddles, state.ground.frost);
  stepFrost(state.ground.frost, dt);
  stepSmoke(state.ground.smoke, player, events, dt);
  stepHellfire(state.ground.hellfire, player, events, dt);
  stepSpores(state, player, dt);
  updatePuddles(state.puddles, player, dt);
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
