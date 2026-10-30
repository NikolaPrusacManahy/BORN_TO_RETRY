// Update 0.2.8 — the Velociraptor's new moves (the designer: "move sets that were not in the game yet … make a
// challenging boss"; Claude's proposal, "Build all of them"; out of test-floor4.ts, which had reached its size). The
// hunt: a real charge scrapes twice, a feint stops and pounces where you went; the sand kick blinds you (step aside and
// it misses), then it charges; the wall launch. The frenzy: its sandstorm (it circles out of sight and lunges), its
// screech (no dash, unless a wall's between you), its pin (dash in each bite's glow; too soon wastes it). The blitz:
// three images, only it real; hit it and it reels. Its picks by stage, the HUD's share.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { pinGlowing } from '../src/sim/combat/pin';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { blitzRun, blitzSpot } from '../src/sim/enemies/dinoBlitz';
import { dinoWindup } from '../src/sim/enemies/dino';
import { BLITZ, CHARGE, FEINT, KICK, LUNGE, POUNCE, SCREECH, STORM, STORM_CALL, WALL } from '../src/sim/enemies/dinoMoves';
import { hitEnemy, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { tryStartDash } from '../src/sim/player/dash';
import { createPlayer } from '../src/sim/player/state';
import { createRaptorHud, raptorHud } from '../src/engine/raptorHud';
import { DINO } from '../src/tuning/dino';
import { Arena, boxAt } from '../src/world/arena';

const v = DINO.v;
const walls = [boxAt(-25, -1, -25, 50, 1, 50, 'floor'), boxAt(-25, 0, -26, 50, 8, 1, 'wall'), boxAt(-25, 0, 25, 50, 8, 1, 'wall'), boxAt(-26, 0, -25, 1, 8, 50, 'wall'), boxAt(25, 0, -25, 1, 8, 50, 'wall')];
const arena = (extra: ReturnType<typeof boxAt>[] = []): Arena => ({ name: 'desert', boxes: [...walls, ...extra], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] });
const OPEN = arena();
/** A column between you (at the middle) and it (north of you). */
const COVER = arena([boxAt(-1.5, 0, -7, 3, 6, 2, 'wall')]);
const world = new FlatWorld();

function fight(at: Vector3, room = OPEN, seed = 3) {
  const c = createCombat(room);
  c.rng = createRng(seed);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, 'dino', at, Math.atan2(at.x, at.z));
  const e = c.enemies[slot];
  // (No sandstorm unless a test wants one.)
  e.blink = 99;
  c.events.clear();
  return { c, p, e, slot };
}
type Fight = ReturnType<typeof fight>;

/** Steps the fight `secs` (`each(i)`: before tick i, may return presses). */
function run(f: Fight, secs: number, each?: (i: number) => Partial<CombatIntent> | void) {
  const seen: string[] = [];
  const values: number[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    const intent = Object.assign(emptyCombatIntent(), each?.(i) ?? {});
    stepCombat(f.c, f.p, intent, world, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    for (let e = 0; e < f.c.events.length; e++) {
      seen.push(f.c.events.at(e).kind);
      values.push(f.c.events.at(e).value);
    }
    f.c.events.clear();
  }
  return { seen, values, hurt: f.p.hp < hp, lost: hp - f.p.hp };
}
const count = (seen: string[], kind: string) => seen.filter((s) => s === kind).length;
/** It warns of `move` now. */
function warnOf(f: Fight, move: number, feint = 0) {
  f.e.move = move;
  f.e.near = feint;
  f.e.shots = 0;
  setPhase(f.e, 'windup');
}

section('Velociraptor — the hunt: its charge, the feint, the sand kick, the wall launch');
{
  const s = ENEMY_STATS.dino();
  check(`a boss, ${s.height} m, never flinches`, s.boss && s.stagger === Infinity);
  const real = fight(new Vector3(0, 0, -14));
  warnOf(real, CHARGE);
  const rr = run(real, v.chargeWindup + 0.05);
  check('a real charge scrapes the sand twice in its warning, then charges', count(rr.seen, 'dinoScrape') === 2 && rr.seen.indexOf('dinoScrape') < rr.seen.indexOf('dinoCharge') && real.e.phase === 'charge');
  real.p.pos.set(8, 0, 0);
  run(real, 0.4);
  check('charging, it turns after you', real.e.phase === 'charge' && real.e.aim.x > 0.15);
  const feint = fight(new Vector3(0, 0, -14));
  warnOf(feint, CHARGE, 1);
  const rf = run(feint, v.chargeWindup + 0.02);
  check('a feint: no scrapes; it stops dead instead of charging', count(rf.seen, 'dinoScrape') === 0 && rf.seen.includes('dinoFeint') && feint.e.move === FEINT && feint.e.phase === 'windup');
  // You dodge aside meanwhile: it pounces where you went.
  feint.p.pos.set(6, 0, 0);
  const rp = run(feint, v.feintStop + v.feintAir + 0.1);
  check('then it pounces where you went', rp.seen.includes('dinoPounce') && rp.seen.includes('dinoLand') && Math.hypot(feint.e.pos.x - 6, feint.e.pos.z) < 1 && rp.hurt);
  // Its odds of a feint.
  const odds = fight(new Vector3(0, 0, -20), OPEN, 11);
  let charges = 0;
  let feints = 0;
  for (let i = 0; i < 200; i++) {
    setPhase(odds.e, 'chase');
    odds.e.cooldown = 0;
    odds.e.strafe = 0;
    odds.e.move = -1;
    run(odds, DT);
    if (odds.e.move !== CHARGE) continue;
    charges++;
    if (odds.e.near > 0) feints++;
  }
  check(`about ${v.feintChance * 100}% of its charges are feints (${feints} of ${charges})`, charges > 40 && Math.abs(feints / charges - v.feintChance) < 0.15);
  // The sand kick.
  const kick = fight(new Vector3(0, 0, -8));
  warnOf(kick, KICK);
  const rk = run(kick, v.kickWindup + 0.02);
  check('the sand kick: it turns its back to you, kicks, and your view’s blurred with sand; then it charges', rk.seen.includes('dinoKick') && kick.p.blind === v.kickBlind && kick.e.move === CHARGE && kick.e.near === 0);
  const aside = fight(new Vector3(0, 0, -8));
  warnOf(aside, KICK);
  run(aside, v.kickWindup * 0.7);
  aside.p.pos.set(9, 0, -6);
  const ra = run(aside, v.kickWindup * 0.3 + 0.02);
  check('step aside once it’s turned and the sand misses you', ra.seen.includes('dinoKick') && aside.p.blind === 0 && aside.e.phase === 'recover');
  const dashed = fight(new Vector3(0, 0, -8));
  warnOf(dashed, KICK);
  run(dashed, v.kickWindup - 0.02);
  dashed.p.invuln = 0.2;
  run(dashed, 0.05);
  check('a dash gets you through the sand', dashed.p.blind === 0);
  // The wall launch.
  const wl = fight(new Vector3(0, 0, -14));
  warnOf(wl, WALL);
  let high = 0;
  const rw = run(wl, v.wallWindup + 2.5, () => {
    if (wl.e.phase === 'sky') high = Math.max(high, wl.e.pos.y);
  });
  check('the wall launch: it sprints to the nearest wall, claws up it and dives at you', rw.seen.indexOf('dinoSprint') < rw.seen.indexOf('dinoClaws') && rw.seen.indexOf('dinoClaws') < rw.seen.lastIndexOf('dinoPounce') && high > v.wallHigh * 0.9 && rw.hurt);
  const none = fight(new Vector3(0, 0, -3));
  warnOf(none, WALL);
  run(none, v.wallWindup + 0.02);
  check('with no wall in reach it charges instead', none.e.move === CHARGE);
}

section('Velociraptor — its frenzy: the sandstorm, the screech, the pin');
{
  const st = fight(new Vector3(0, 0, -6));
  st.e.hp = ENEMY_STATS.dino().hp * (v.frenzyAt - 0.01);
  st.e.blink = 0;
  setPhase(st.e, 'chase');
  run(st, DT);
  check(`at ${v.frenzyAt * 100}% its frenzy starts: it rears up to call a sandstorm`, st.e.stage === 1 && st.e.move === STORM && st.e.phase === 'windup');
  const rs = run(st, STORM_CALL / v.frenzyPace + 0.02);
  check(`the sandstorm: ${v.stormTime} s, your sight down to ${v.stormSight} m`, rs.seen.includes('dinoStorm') && st.c.storm > v.stormTime - 0.1);
  run(st, 1.6);
  const off = Math.hypot(st.e.pos.x, st.e.pos.z);
  check(`in it, it circles you ${v.stalkRing} m off (out of sight): ${off.toFixed(1)} m`, off > v.stormSight && Math.abs(off - v.stalkRing) < 2.5);
  let lunged = false;
  const rl = run(st, v.lungeGap + 1, () => {
    if (st.e.move === LUNGE) lunged = true;
  });
  check('it hisses, and lunges out of the storm at you', lunged && rl.seen.includes('dinoPounce') && rl.hurt);
  run(st, v.stormTime);
  check(`the storm blows itself out; the next only after ${v.stormGap} s`, st.c.storm === 0 && st.e.blink > 0);
  const dies = fight(new Vector3(0, 0, -10));
  dies.c.storm = 5;
  hitEnemy(dies.e, 1e6, 0, 0, 0);
  run(dies, DT);
  check('killed, its sandstorm ends', dies.c.storm === 0);
  // The screech.
  const sc = fight(new Vector3(0, 0, -12));
  sc.e.stage = 1;
  warnOf(sc, SCREECH);
  const rsc = run(sc, v.screechWindup / v.frenzyPace + 0.02);
  check(`its screech, in the open: no dash for ${v.screechLock} s, then it charges`, rsc.seen.includes('dinoScreech') && sc.p.dashLock === v.screechLock && sc.e.move === CHARGE && sc.e.near === 0);
  check('no dash while it lasts', !tryStartDash(sc.p, true, new Vector3(1, 0, 0)));
  sc.p.dashLock = 0;
  check('…and back after', tryStartDash(sc.p, true, new Vector3(1, 0, 0)));
  const cv = fight(new Vector3(0, 0, -12), COVER);
  cv.e.stage = 1;
  warnOf(cv, SCREECH);
  run(cv, v.screechWindup / v.frenzyPace + 0.02);
  check('behind a column it doesn’t catch you', cv.p.dashLock === 0);
  // The pin.
  const pinned = () => {
    const f = fight(new Vector3(0, 0, -8));
    f.e.stage = 1;
    warnOf(f, POUNCE);
    run(f, v.pounceWindup / v.frenzyPace + v.pounceAir + 0.05);
    return f;
  };
  const pn = pinned();
  check('in its frenzy its pounce landing on you pins you (it stands over you)', pn.c.pin.on && pn.e.phase === 'grab' && Math.hypot(pn.e.pos.x, pn.e.pos.z) > ENEMY_STATS.dino().radius);
  const held = pn.p.pos.clone();
  const rb = run(pn, v.pinGap * Math.round(v.pinBites) + 0.1);
  check(`no dodges: ${Math.round(v.pinBites)} bites (${v.pinDamage} each), then it lets you go`, count(rb.seen, 'pinBite') === Math.round(v.pinBites) && Math.abs(rb.lost - v.pinDamage * Math.round(v.pinBites)) < 0.5 && !pn.c.pin.on && pn.c.pin.end === 'bitten' && pn.p.pos.distanceTo(held) < 0.5);
  const dg = pinned();
  let pressed = -1;
  const rd = run(dg, v.pinGap * Math.round(v.pinDodges) + 0.1, () => {
    if (!pinGlowing(dg.c.pin) || pressed === dg.c.pin.bites) return;
    pressed = dg.c.pin.bites;
    return { dodgePressed: true };
  });
  check(`dash in each bite’s glow: ${Math.round(v.pinDodges)} dodges kick it off (stunned), unhurt`, count(rd.seen, 'pinTwist') === Math.round(v.pinDodges) && !rd.hurt && !dg.c.pin.on && dg.c.pin.end === 'free' && dg.e.phase === 'stun');
  const early = pinned();
  const re = run(early, v.pinGap + 0.02, (i) => (i === 2 ? { dodgePressed: true } : pinGlowing(early.c.pin) ? { dodgePressed: true } : undefined));
  check('a dash before the glow wastes that bite’s dodge: it lands', re.seen.includes('pinWasted') && re.seen.includes('pinBite') && !re.seen.includes('pinTwist'));
  const dash = fight(new Vector3(0, 0, -8));
  dash.e.stage = 1;
  warnOf(dash, POUNCE);
  run(dash, v.pounceWindup / v.frenzyPace + v.pounceAir - 0.05);
  dash.p.invuln = 0.3;
  run(dash, 0.1);
  check('dashing as it lands: no pin', !dash.c.pin.on);
  const hunt = fight(new Vector3(0, 0, -8));
  warnOf(hunt, POUNCE);
  run(hunt, v.pounceWindup + v.pounceAir + 0.05);
  check('before its frenzy a pounce only hurts', !hunt.c.pin.on);
}

section('Velociraptor — the blitz: two afterimages, only it real');
{
  const bz = fight(new Vector3(0, 0, -12));
  bz.e.stage = 1;
  bz.e.hp = ENEMY_STATS.dino().hp * (v.blitzAt - 0.01);
  setPhase(bz.e, 'chase');
  run(bz, DT);
  check(`at ${v.blitzAt * 100}% it blitzes at once`, bz.e.stage === 2 && bz.e.move === BLITZ && bz.e.phase === 'windup');
  run(bz, v.blitzWindup / v.frenzyPace + 0.02);
  const lanes = [-1, 0, 1].map((l) => blitzSpot(bz.e, l, 1, new Vector3()));
  const apart = Math.min(lanes[0].distanceTo(lanes[1]), lanes[1].distanceTo(lanes[2]));
  check(`its three images end round where you stood, ${apart.toFixed(1)} m apart`, apart > 2.5 && lanes.every((p) => p.length() < ENEMY_STATS.dino().radius + 2));
  const rb = run(bz, blitzRun() + v.blitzSlashGap * Math.round(v.blitzSlashes) + 0.05);
  const at = blitzSpot(bz.e, bz.e.near, 1, new Vector3());
  check(`it ends on its own lane, then slashes ${Math.round(v.blitzSlashes)} times, each landing`, at.distanceTo(new Vector3(bz.e.pos.x, at.y, bz.e.pos.z)) < 0.3 && count(rb.seen, 'dinoSlash') === Math.round(v.blitzSlashes) && Math.abs(rb.lost - v.blitzDamage * Math.round(v.blitzSlashes)) < 0.5);
  const hit = fight(new Vector3(0, 0, -12));
  hit.e.stage = 2;
  warnOf(hit, BLITZ);
  const rh = run(hit, v.blitzWindup / v.frenzyPace + blitzRun() + 1, (i) => {
    if (hit.e.phase === 'charge' && hit.e.t > 0.1 && i % 5 === 0) hitEnemy(hit.e, 10, 0, 0, 0);
  });
  check('hit it mid-blitz: it reels, stunned; no slashes', rh.seen.includes('dinoReel') && !rh.seen.includes('dinoSlash') && hit.e.phase === 'stun');
}

section('Velociraptor — what it picks, and the screen');
{
  const picks = (stage: number, seed: number) => {
    const f = fight(new Vector3(0, 0, -10), OPEN, seed);
    f.e.stage = stage;
    const got = new Set<number>();
    for (let i = 0; i < 60; i++) {
      setPhase(f.e, 'chase');
      f.e.cooldown = 0;
      f.e.blink = 99;
      run(f, DT);
      got.add(f.e.move);
    }
    return got;
  };
  const hunt = picks(0, 5);
  check('on the hunt: charges, kicks, wall launches only', [...hunt].every((m) => m === CHARGE || m === KICK || m === WALL) && hunt.size === 3);
  const frenzy = picks(1, 6);
  check('in its frenzy: its screech and pounce too (no blitz yet)', frenzy.has(SCREECH) && frenzy.has(POUNCE) && !frenzy.has(BLITZ));
  check('below its blitz mark: blitzes too', picks(2, 7).has(BLITZ));
  const gap = fight(new Vector3(0, 0, -10));
  gap.e.stage = 1;
  gap.e.blink = 0;
  gap.e.cooldown = 0;
  run(gap, DT);
  check('its gap over, its next pick is a sandstorm', gap.e.move === STORM);
  check('each warning’s length', dinoWindup(CHARGE) === v.chargeWindup && dinoWindup(KICK) === v.kickWindup && dinoWindup(LUNGE) === v.lungeHiss && dinoWindup(STORM) === STORM_CALL);
  const hud = createRaptorHud();
  const f = fight(new Vector3(0, 0, -10));
  f.p.blind = v.kickBlind / 2;
  f.p.dashLock = 1;
  raptorHud(f.p, f.c, hud);
  check('the HUD: sand half gone, the dash locked, not pinned', hud.blind === 0.5 && hud.dashLocked && hud.pinDodges === -1);
}
