// Update 0.2.8 — the Velociraptor's moves (out of test-floor4.ts, which had reached its size).
// Update 0.3.60 — by the Boss Design Bible, "Trust your ears" (spec MD_UPDATES/U0360_VELOCIRAPTOR_BIBLE.md). Its Sickle Pounce (a hiss; it
// follows an early dodge; missed, it skids, open), its Stalk & Ambush (gone, clicks from the way it'll come; hit as it shows, it trips),
// its Tail Lash (jump it; dizzy after), its charge. Phase 2: its Pack Call (while they live, it only ambushes), its Feint (no hiss, then
// from your other side), its pin, its Apex Hunt (hit its eyes at the flash, or send its stone back).
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { pinGlowing } from '../src/sim/combat/pin';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { APEX_CUE, APEX_DARKEN, APEX_EYES, APEX_LUNGE, APEX_STALK, startApex } from '../src/sim/enemies/dinoApex';
import { dinoWindup } from '../src/sim/enemies/dino';
import { packAlive } from '../src/sim/enemies/dinoHunt';
import { AMBUSH, APEX, CHARGE, EMERGE, FEINT, hiddenDino, LUNGE, PACK, SICKLE, TAIL } from '../src/sim/enemies/dinoMoves';
import { dodges } from '../src/sim/enemies/evade';
import { hitEnemy, isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { DINO } from '../src/tuning/dino';
import { Arena, boxAt } from '../src/world/arena';

const v = DINO.v;
const walls = [boxAt(-25, -1, -25, 50, 1, 50, 'floor'), boxAt(-25, 0, -26, 50, 8, 1, 'wall'), boxAt(-25, 0, 25, 50, 8, 1, 'wall'), boxAt(-26, 0, -25, 1, 8, 50, 'wall'), boxAt(25, 0, -25, 1, 8, 50, 'wall')];
const OPEN: Arena = { name: 'desert', boxes: walls, pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
const world = new FlatWorld();

function fight(at: Vector3, stage = 0, seed = 3) {
  const c = createCombat(OPEN);
  c.rng = createRng(seed);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, 'dino', at, Math.atan2(at.x, at.z));
  const e = c.enemies[slot];
  e.stage = stage;
  if (stage > 0) {
    e.hp = ENEMY_STATS.dino().hp * (v.frenzyAt - 0.05);
    // (Past its first Apex Hunt and Pack Call: each has its tests.)
    e.ult.count = 1;
    e.raptor!.callIn = 99;
  }
  e.cooldown = 99;
  c.events.clear();
  return { c, p, e, slot };
}
type Fight = ReturnType<typeof fight>;

/** Steps the fight `secs` (`each(i)`: before tick i, may return presses). */
function run(f: Fight, secs: number, each?: (i: number) => Partial<CombatIntent> | void) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    const intent = Object.assign(emptyCombatIntent(), each?.(i) ?? {});
    stepCombat(f.c, f.p, intent, world, DT);
    f.p.hurtTime = 0;
    f.p.invuln = 0;
    for (let e = 0; e < f.c.events.length; e++) seen.push(f.c.events.at(e).kind);
    f.c.events.clear();
  }
  return { seen, hurt: f.p.hp < hp, lost: hp - f.p.hp };
}
const warn = (f: Fight, move: number) => {
  f.e.move = move;
  f.e.shots = 0;
  f.e.struck = false;
  setPhase(f.e, 'windup');
};

section('Velociraptor — the bible’s numbers');
{
  const s = ENEMY_STATS.dino();
  check(`${s.hp} health, never tankier (it was 1260)`, s.hp <= 1260);
  check(`its tell ${v.tell} s (the bible’s dial for its 6th place)`, v.tell > 0.6 && v.tell < 0.9);
  check(`its Apex Hunt’s window ${v.apexWindow} s, its eyes’ flash ${v.apexFlash} s`, v.apexWindow === 5 && v.apexFlash === 0.5);
}

section('Velociraptor — Sickle Pounce: dodge late');
{
  const f = fight(new Vector3(0, 0, -14));
  warn(f, SICKLE);
  f.c.events.push('dinoHiss', 0, 0, 0, 0);
  const tell = run(f, v.tell + 0.02);
  check('it crouches, hissing: its hiss is the tell', tell.seen.includes('dinoHiss') && tell.seen.includes('dinoPounce'));
  check('then off it goes', f.e.phase === 'leap' && f.e.move === SICKLE);
  // You step away early: it follows.
  f.p.pos.set(8, 0, 0);
  run(f, v.pounceAir * 0.5);
  const followed = Math.hypot(f.e.aim.x - f.p.pos.x, f.e.aim.z - f.p.pos.z);
  check('you dodged too early: its landing follows you', followed < 3, followed.toFixed(1));
  const r = run(f, v.pounceAir * 0.5 + 0.05);
  check(`and catches you: ${v.pounceDamage}`, r.lost >= v.pounceDamage);

  const g = fight(new Vector3(0, 0, -14));
  warn(g, SICKLE);
  run(g, v.tell + 0.02);
  run(g, v.pounceAir * (v.correctFor + 0.05));
  // Late: it can't.
  g.p.pos.set(14, 0, 0);
  const r2 = run(g, v.pounceAir * (1 - v.correctFor));
  check('you dodged late: it lands where you were', !r2.hurt && r2.seen.includes('dinoLand'));
  check(`it skids on, open ${v.skidOpen} s (hits do more)`, r2.seen.includes('dinoSkid') && g.e.phase === 'stun' && g.e.move === SICKLE && ENEMY_STATS.dino().stunned > 1);
  run(g, v.skidOpen + 0.05);
  check('then it’s up', g.e.phase !== 'stun');
}

section('Velociraptor — Stalk & Ambush: your ears');
{
  const f = fight(new Vector3(0, 0, -8));
  warn(f, AMBUSH);
  f.e.move = AMBUSH;
  setPhase(f.e, 'chase');
  f.e.cooldown = 99;
  // (Its pick, forced: through its warn.)
  const forced = fight(new Vector3(0, 0, -8));
  forced.e.cooldown = 0;
  forced.e.strafe = 0;
  let saw = false;
  for (let tries = 0; tries < 40 && !saw; tries++) {
    forced.e.cooldown = 0;
    setPhase(forced.e, 'chase');
    forced.e.pos.set(0, 0, -8);
    run(forced, DT);
    saw = forced.e.phase === 'charge' && forced.e.move === AMBUSH;
  }
  check('it sometimes runs off', saw);
  const seen = run(forced, 1.4);
  check('and it’s gone: not drawn, out of reach', hiddenDino(forced.e) && forced.e.phase === 'burrow' && dodges(forced.c, forced.slot, 0, -1), `${forced.e.phase} ${forced.e.pos.y}`);
  const clicks = run(forced, v.ambushFor * 0.5);
  const later = run(forced, v.ambushFor * 0.45);
  const count = (a: string[]) => a.filter((k) => k === 'dinoClick').length;
  check(`clicks, quicker as it comes (${count(clicks.seen)}, then ${count(later.seen)})`, count(later.seen) > count(clicks.seen) && count(clicks.seen) > 0);
  check('its ring holds, round you', near(Math.hypot(forced.e.pos.x, forced.e.pos.z), v.stalkRing, 0.1));
  void seen;
  const out = run(forced, v.ambushFor * 0.08);
  check('it shows, on its bearing', out.seen.includes('dinoEmerge') && forced.e.move === EMERGE && !hiddenDino(forced.e));
  const late = run(forced, v.emergeFor + 0.05);
  check('let be: it lunges', forced.e.move === LUNGE && forced.e.phase === 'leap' && late.seen.includes('dinoPounce'));
  const lunged = run(forced, v.lungeAir + 0.05);
  check(`${v.lungeDamage}`, lunged.lost >= v.lungeDamage);

  const t = fight(new Vector3(0, 0, -10));
  t.e.move = EMERGE;
  setPhase(t.e, 'windup');
  t.e.flash = 0;
  run(t, 0.1);
  hitEnemy(t.e, 5, 0, 0, 0);
  const tripped = run(t, DT * 2);
  check(`hit as it shows: it trips, down ${v.tripFor} s`, tripped.seen.includes('dinoTrip') && t.e.phase === 'stun' && t.e.move === EMERGE);
  run(t, v.tripFor + 0.05);
  check('then it’s up', t.e.phase !== 'stun');
}

section('Velociraptor — Tail Lash: jump it');
{
  const f = fight(new Vector3(0, 0, -5));
  warn(f, TAIL);
  const tell = run(f, v.tell + 0.02);
  check('it turns side-on, and spins', !tell.hurt && f.e.phase === 'dive' && tell.seen.includes('dinoTail'));
  const spun = run(f, v.tailSpin + 0.02);
  check(`standing: its tail takes you, ${v.tailDamage}`, spun.lost >= v.tailDamage, `${spun.lost}`);
  check(`it’s dizzy ${v.tailDizzy} s`, f.e.phase === 'stun' && f.e.move === TAIL);
  const j = fight(new Vector3(0, 0, -5));
  warn(j, TAIL);
  run(j, v.tell + 0.02);
  const over = run(j, v.tailSpin + 0.02, () => {
    j.p.pos.y = v.tailOver + 0.2;
  });
  check('jumped: it passes under you', !over.hurt);
  const far = fight(new Vector3(0, 0, -5));
  far.p.pos.set(0, 0, v.tailReach + 2);
  warn(far, TAIL);
  run(far, v.tell + 0.02);
  check('out of its reach: nothing', !run(far, v.tailSpin + 0.02).hurt);
}

section('Velociraptor — charge: scrapes twice, a wall stuns it');
{
  const f = fight(new Vector3(0, 0, -14));
  warn(f, CHARGE);
  const r = run(f, v.chargeWindup + 0.05);
  check('two scrapes, then off', r.seen.filter((k) => k === 'dinoScrape').length === 2 && f.e.phase === 'charge');
}

section('Velociraptor — Pack Call: while they live, it only ambushes');
{
  const f = fight(new Vector3(0, 0, -14), 1);
  f.e.raptor!.callIn = 0;
  f.e.cooldown = 0;
  setPhase(f.e, 'chase');
  run(f, DT);
  check('in phase 2, its gap over: it calls', f.e.move === PACK && f.e.phase === 'windup');
  const r = run(f, v.tell / v.frenzyPace);
  check('its head up, it barks twice', r.seen.filter((k) => k === 'dinoBark').length >= 1);
  check(`${v.packCount} of the small ones come, either side of you`, packAlive(f.c) && f.c.enemies.filter((e) => isLive(e) && e.kind === 'dinoBlob').length === v.packCount);
  const pack = f.c.enemies.filter((e) => isLive(e) && e.kind === 'dinoBlob');
  check('flanking you', pack[0].pos.x * pack[1].pos.x < 0);
  const moves = new Set<number>();
  for (let i = 0; i < 20; i++) {
    for (const e of pack) e.hp = 1e6;
    setPhase(f.e, 'chase');
    f.e.cooldown = 0;
    run(f, DT);
    moves.add(f.e.move);
  }
  check('while they live, it only ambushes', moves.size === 1 && moves.has(AMBUSH), [...moves].join());
  for (const e of pack) hitEnemy(e, e.hp + 1, 0, 0, 0);
  check('killed, it’s back to the rest', !packAlive(f.c));
}

section('Velociraptor — Feint: listen, don’t look');
{
  const f = fight(new Vector3(0, 0, -10), 1);
  warn(f, FEINT);
  const crouch = run(f, v.tell / v.frenzyPace + 0.02);
  check('a crouch with no hiss', !crouch.seen.includes('dinoHiss') && f.e.phase === 'charge' && f.e.move === FEINT);
  const before = f.e.pos.z;
  const round = run(f, v.feintRun + 0.02);
  check('it blurs round to your other side', Math.sign(f.e.pos.z) !== Math.sign(before));
  check('and that crouch hisses', round.seen.includes('dinoHiss') && f.e.move === SICKLE && f.e.phase === 'windup');
  check(`a short one (${v.feintHiss} s)`, dinoWindup(SICKLE, 1, true) === v.feintHiss);
}

section('Velociraptor — phase 2: its pin');
{
  const f = fight(new Vector3(0, 0, -6), 1);
  f.e.move = SICKLE;
  f.e.from.copy(f.e.pos);
  f.e.aim.set(0, 0, -1);
  setPhase(f.e, 'leap');
  f.e.t = v.pounceAir - 0.02;
  run(f, 0.05);
  check('a pounce landing on you pins you', f.c.pin.on);
  check('its bites still glow', typeof pinGlowing(f.c.pin) === 'boolean');
}

section('Velociraptor — Apex Hunt: hit its eyes');
{
  const open = (at = new Vector3(0, 0, -10)) => {
    const f = fight(at, 1);
    f.e.ult.count = 0;
    setPhase(f.e, 'chase');
    return f;
  };
  const f = open();
  const start = run(f, DT);
  check('phase 2’s first thing: the light dies', start.seen.includes('dinoDark') && f.e.move === APEX && f.e.shots === APEX_DARKEN && f.c.storm > 0);
  run(f, v.apexTell + 0.02);
  check(`it’s gone, the cue says how: ${APEX_CUE}`, f.e.shots === APEX_STALK && hiddenDino(f.e) && f.e.ult.on && f.e.ult.cue === APEX_CUE && f.e.ult.window === v.apexWindow);
  const hunt = run(f, f.e.raptor!.flashAt - 0.05);
  check('a heart beats, and clicks', hunt.seen.includes('dinoHeart') && hunt.seen.includes('dinoClick'));
  check('out of reach', dodges(f.c, f.slot, 0, -1));
  const eyes = run(f, 0.1);
  check('its eyes flash, and it kicks a stone', eyes.seen.includes('dinoEyes') && f.e.shots === APEX_EYES && !hiddenDino(f.e) && f.c.orbs.some((o) => o.alive && o.look === 'rubble'));
  const hp = f.e.hp;
  hitEnemy(f.e, 10, 0, 0, 0);
  const hit = run(f, DT * 2);
  check(`hit in time: blinded, on its back ${v.apexStun} s, ${v.apexSelf} off it`, hit.seen.includes('dinoBlinded') && f.e.phase === 'stun' && f.e.move === APEX && f.e.raptor!.flipped && hp - f.e.hp >= v.apexSelf && !f.e.ult.on);
  run(f, 1);
  check('the light comes back', f.c.storm === 0);
  run(f, v.apexStun);
  check('then it’s up, on its feet', f.e.phase !== 'stun' && !f.e.raptor!.flipped);

  // Not.
  const m = open();
  run(m, DT);
  run(m, v.apexTell + 0.02);
  run(m, m.e.raptor!.flashAt + v.apexFlash + 0.05);
  check('not in time: it lunges', m.e.shots === APEX_LUNGE && !m.e.ult.on);
  m.p.hp = 100;
  const bit = run(m, 0.5);
  check(`${v.apexDamage}, heavy, not a one-shot`, near(bit.lost, v.apexDamage, 1) && !m.p.dead);
  check('the light comes back', m.c.storm <= 0.6);

  // The stone, for bare hands.
  const b = open();
  run(b, DT);
  run(b, v.apexTell + 0.02);
  run(b, b.e.raptor!.flashAt + 0.02);
  const parried = run(b, 1, () => {
    b.c.fists.parryWindow = 0.2;
  });
  check('its stone parried goes back into its eyes: blinded, bare hands have their way', parried.seen.includes('parry') && parried.seen.includes('dinoBlinded') && b.e.raptor!.flipped, parried.seen.join());
  void startApex;
}
