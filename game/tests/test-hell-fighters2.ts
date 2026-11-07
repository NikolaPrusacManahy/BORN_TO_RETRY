// Update 0.5.5 — floor 10's second batch (MD/FLOOR10_HELL_PLAN.md; the designer: "Yes, batch 2", "they need Hell design yeah?"): the Cinder
// Chicken, the Brimstone Bee, the Pit Fiend (floor 1's old Demon, a mini boss now) and the Spore Lord. Their roster and numbers (never tankier),
// their models in Hell's colours (every clip each plays in it), and their rules, by real blows through the fight's step where a blow is what
// matters: a jab lighting a Chicken and knocking it into a crowd, a Chicken killed close bursting on you, the Bee punched as it dips to drop,
// the Pit Fiend shrugging off a jab but hit harder stunned against a wall; the Spore Lord's clouds blowing near lava, a vent, a fireball, a
// Chicken's burst.
import { readFileSync } from 'node:fs';
import { check, section } from './harness';
import { at, crew, Crew, ready, run, until } from './fakes/crewMeet';
import { DT, ticks } from './fakes/flatWorld';
import { ENEMY_STATS, EnemyKind, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { percherOf, rosterOf } from '../src/sim/dungeon/wavePlan';
import { ROLE } from '../src/sim/enemies/tokens';
import { EXEC_MOVES } from '../src/sim/combat/execMoves';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { LOOKS } from '../src/engine/enemyLooks';
import { causeName } from '../src/screens/deathText';
import { LAB_FLOORS } from '../src/screens/labLists';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { stepCombat } from '../src/sim/combat/step';
import { holding } from '../src/sim/weapons/weapons';
import { fireOrb } from '../src/sim/combat/orbs';
import { puffSpores } from '../src/sim/combat/spores';
import { startCharge } from '../src/sim/enemies/charge';
import { lit } from '../src/sim/enemies/cinderChicken';
import { BITE, FIEND_CHARGE, FIEND_LEAP, FIEND_VOLLEY, FUSE, PUFF, SPORE_SLAM } from '../src/sim/enemies/hellShared';
import { createMachinery, stepMachinery, ventAt } from '../src/sim/dungeon/machinery';
import { boxAt } from '../src/world/arena';
import { CAMERA } from '../src/tuning/camera';
import { FISTS } from '../src/tuning/combat';
import { FOES_HELL_B } from '../src/tuning/foesHellB';
import { Vector3 } from 'three';

const F = FLOOR.hell;
const v = FOES_HELL_B.v;
const NEW: EnemyKind[] = ['cinderChicken', 'brimBee', 'pitFiend', 'sporeLord'];
const index = (m: Crew) => m.c.enemies.indexOf(m.e);

/** Your aim at it (its chest), from where you are. */
function aimAt(m: Crew): Pick<CombatIntent, 'yaw' | 'pitch'> {
  const dx = m.e.pos.x - m.p.pos.x;
  const dz = m.e.pos.z - m.p.pos.z;
  const chest = m.e.pos.y + ENEMY_STATS[m.e.kind]().height * 0.5;
  const yaw = Math.atan2(-dx, -dz);
  m.p.yaw = yaw;
  return { yaw, pitch: Math.atan2(chest - (m.p.pos.y + CAMERA.v.eyeHeight), Math.hypot(dx, dz)) };
}
/** Ticks of the fight with your input, aimed at it (you held where you are; your grace after a hit taken away; no hit-stop): what was seen,
 *  and what you lost. */
function fight(m: Crew, intent: Partial<CombatIntent>, secs = DT, each?: () => void) {
  const seen: string[] = [];
  const spot = m.p.pos.clone();
  const hp = m.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    each?.();
    m.c.hitStop.remaining = 0;
    stepCombat(m.c, m.p, { ...emptyCombatIntent(), ...aimAt(m), ...intent }, m.world, DT);
    m.p.hurtTime = 0;
    m.p.invuln = 0;
    m.p.pos.copy(spot);
    m.p.vel.set(0, 0, 0);
    m.p.events.clear();
    for (let k = 0; k < m.c.events.length; k++) seen.push(m.c.events.at(k).kind);
    m.c.events.clear();
  }
  return { seen, lost: hp - m.p.hp };
}
const jab = (m: Crew, each?: () => void) => {
  const a = fight(m, { attackPressed: true, attackHeld: true }, DT, each);
  const b = fight(m, {}, FISTS.v.jabInterval + 0.02, each);
  return { seen: [...a.seen, ...b.seen], lost: a.lost + b.lost };
};
/** One of `kind` that holds still where it's put (frozen: nothing it does moves on), to be caught in a blast. */
function bystander(m: Crew, kind: EnemyKind, x: number, z: number) {
  const e = m.c.enemies[spawnEnemy(m.c.enemies, kind, at(x, 0, z), 0)];
  e.frozen = 99;
  return e;
}

section('Floor 10 — its second batch');
{
  const roster = rosterOf(F);
  check('its roster all its own: the four of 0.5.4, the Cinder Chicken, the Brimstone Bee; the Pit Fiend and the Spore Lord its mini bosses', roster.join() === 'imp,puglin,boneAxeman,boneGuard,cinderChicken,brimBee,pitFiend,sporeLord' && MINI_BOSSES.includes('pitFiend') && MINI_BOSSES.includes('sporeLord'), roster.join(', '));
  check('none of them on any other floor; its percher the Brimstone Bee', NEW.every((k) => ![1, 2, 3, 4, 5, 6, 7, 8, 9].some((f) => rosterOf(f).includes(k))) && percherOf(F) === 'brimBee');
  const earlier = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((f) => [...rosterOf(f)]);
  const regular = Math.max(...earlier.filter((k) => !MINI_BOSSES.includes(k) && !ENEMY_STATS[k]().boss).map((k) => ENEMY_STATS[k]().hp));
  const minis = Math.max(...MINI_BOSSES.filter((k) => !NEW.includes(k)).map((k) => ENEMY_STATS[k]().hp));
  check(`never tankier: its regulars within the floors before’s (${regular}), its mini bosses within theirs (${minis})`, NEW.every((k) => ENEMY_STATS[k]().hp <= (MINI_BOSSES.includes(k) ? minis : regular)), NEW.map((k) => `${k} ${ENEMY_STATS[k]().hp}`).join(', '));
  check('each its turn (the Chickens never wait; the Bee from range; the mini bosses heavies); every one can be executed', ROLE.cinderChicken === null && ROLE.brimBee === 'ranged' && ROLE.pitFiend === 'heavy' && ROLE.sporeLord === 'heavy' && NEW.every((k) => !!EXEC_MOVES[k]));
  let missing = '';
  let white = '';
  for (const k of NEW) {
    const look = LOOKS[k]!;
    const glb = readFileSync(`public${look.url}`);
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { animations?: { name: string }[] };
    const clips = new Set((json.animations ?? []).map((a) => a.name));
    for (const c of [...Object.values(look.clips), ...Object.values(look.moveClips ?? {}).map((x) => x[0])]) if (!clips.has(c)) missing ||= `${k}: ${c}`;
  }
  // (Hell's colours: each one's palette the repainted one, tools/hell_paint.py's, added after the pack's.)
  for (const k of ['cinder_chicken', 'brimstone_bee', 'spore_lord']) {
    const glb = readFileSync(`public/models/enemies/${k}.glb`);
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { images: { bufferView: number }[]; bufferViews: unknown[] };
    if (json.images[0].bufferView !== json.bufferViews.length - 1) white ||= `${k}: its palette the pack's`;
  }
  check('each its model, every clip it plays in it; the Pit Fiend the old Demon’s (its charge, leap and thrust)', missing === '' && ['Duck', 'Run', 'Jump_Land', 'Weapon', 'No'].every((c) => Object.values(LOOKS.pitFiend!.moveClips ?? {}).some((x) => x[0] === c)), missing);
  check('the three Ultimate Monsters in Hell’s colours (each its palette repainted: tools/hell_paint.py)', white === '', white);
  check('on the death screen and in the Lab under floor 10', causeName('cinderChicken') === 'A Cinder Chicken' && causeName('pitFiend') === 'The Pit Fiend' && NEW.every((k) => LAB_FLOORS.find((f) => f.floor === F)!.enemies.includes(k)));
}

section('Floor 10 — the Cinder Chicken');
{
  // It sprints at you; close, its fuse burns, then it bursts on you; it's gone, and leaves no coins.
  const m = crew('cinderChicken', [at(0, 0, -7)]);
  const seen = until(m, () => m.e.phase === 'windup', 3);
  const closeAt = Math.hypot(m.e.pos.x, m.e.pos.z);
  const fusing = m.e.move === FUSE;
  const burst = run(m, v.chickenFuse + DT * 3);
  check(`it sprints at you squawking; ${closeAt.toFixed(1)} m off it stops, its fuse burning`, seen.includes('chickenSquawk') && seen.includes('chickenFuse') && fusing && closeAt <= v.chickenFrom + 0.1);
  check(`then it bursts on you (${burst.lost}); gone, no body, no coins`, burst.seen.includes('chickenBurst') && burst.lost === v.chickenBurst && m.e.phase === 'dead' && m.e.struck && m.c.money === 0 && !m.c.coins.some((c) => c.alive));
  // Stepped away as its fuse burns, it misses you.
  const s = crew('cinderChicken', [at(0, 0, -7)]);
  until(s, () => s.e.phase === 'windup', 3);
  s.p.pos.set(6, 0, 0);
  const away = run(s, v.chickenFuse + DT * 3);
  check('stepped away as its fuse burns, its burst misses you', away.seen.includes('chickenBurst') && away.lost === 0);
  // A real jab lights it and knocks it off; it bursts where it lands, on the enemy behind it.
  const j = crew('cinderChicken', [at(0, 0, -1.8)]);
  const guard = bystander(j, 'boneGuard', 0, -4.2);
  const ghp = guard.hp;
  const z0 = j.e.pos.z;
  let flew = 0;
  const hit = jab(j, () => (flew = Math.max(flew, z0 - j.e.pos.z, j.e.pos.y)));
  const lit0 = lit(j.e) || j.e.phase === 'dead';
  const after = fight(j, {}, v.chickenLit + DT * 4, () => (flew = Math.max(flew, z0 - j.e.pos.z, j.e.pos.y)));
  check(`a real jab lights it and knocks it off (${flew.toFixed(2)} m)`, hit.seen.includes('chickenLit') && lit0 && flew > 0.6);
  check(`lit, it tumbles where it’s flown (it won’t come back at you) and bursts there, on the enemy behind it (${(ghp - guard.hp).toFixed(0)} of its ${ghp})`, after.seen.includes('chickenBurst') && guard.hp < ghp && Math.hypot(j.e.pos.x, j.e.pos.z) > 1.8);
  // Killed (a sword's slash), its body's flung with the blow and bursts where it lands, on the enemy behind it; killed by you, its coins come.
  const k = crew('cinderChicken', [at(0, 0, -1.8)]);
  k.c.weapon = holding('sword', 10);
  const kg = bystander(k, 'boneGuard', 0, -4.2);
  const kghp = kg.hp;
  fight(k, { attackPressed: true, attackHeld: true }, DT);
  const dead = !isLive(k.e);
  const flung = Math.hypot(k.e.pos.x, k.e.pos.z);
  const late = fight(k, {}, v.chickenLit + DT * 4);
  check(`killed by a sword’s slash, its body’s flung with the blow and bursts there, on the enemy behind it (${(kghp - kg.hp).toFixed(0)}); its coins come`, dead && late.seen.includes('chickenBurst') && kg.hp < kghp && !k.e.alive && Math.hypot(k.e.pos.x, k.e.pos.z) > flung && (k.c.money > 0 || k.c.coins.some((c) => c.alive)));
  // One's burst sets off the next.
  const c = crew('cinderChicken', [at(0, 0, -8), at(1.5, 0, -8)]);
  c.p.pos.set(0, 0, 12);
  c.es[0].move = FUSE;
  setPhase(c.es[0], 'windup');
  c.es[0].t = v.chickenFuse;
  const chain = run(c, v.chickenLit + DT * 6, () => {});
  check(`one’s burst sets off the next (${chain.seen.filter((x) => x === 'chickenBurst').length} bursts)`, chain.seen.filter((x) => x === 'chickenBurst').length === 2 && c.es.every((e) => !isLive(e)));
}

section('Floor 10 — the Brimstone Bee');
{
  const m = crew('brimBee', [at(0, 2, -7)]);
  run(m, 2.5, () => {
    m.e.token = false;
    m.e.cooldown = 9;
  });
  check(`it hovers high (${m.e.pos.y.toFixed(1)} m), circling you a way off (${Math.hypot(m.e.pos.x, m.e.pos.z).toFixed(1)} m)`, Math.abs(m.e.pos.y - v.beeAlt) < 0.25 && Math.hypot(m.e.pos.x, m.e.pos.z) > v.beeNear - 1.5);
  const seen = until(m, () => m.c.bombs.some((b) => b.alive && b.by === 'brimBee'), 4, () => ready(m.e));
  const bomb = m.c.bombs.find((b) => b.alive && b.by === 'brimBee')!;
  check('it rears back and drops a fire bomb at you, ringed where it’ll land', seen.includes('beeWindup') && seen.includes('beeBomb') && !!bomb && bomb.look === 'ember' && Math.hypot(bomb.to.x - m.p.pos.x, bomb.to.z - m.p.pos.z) < 0.6);
  const lands = run(m, v.beeFall + DT * 2);
  check(`stood there, its burst catches you (${lands.lost}), and leaves a pool of fire`, lands.seen.includes('bombBlast') && lands.lost >= v.beeBomb && m.c.puddles.some((p) => p.alive && p.fire));
  // A step aside and it misses.
  const d = crew('brimBee', [at(0, 2, -7)]);
  until(d, () => d.c.bombs.some((b) => b.alive && b.by === 'brimBee'), 6, () => ready(d.e));
  d.p.pos.set(4, 0, 0);
  const missed = run(d, v.beeFall + DT * 2);
  check('a step aside and its bomb misses you', missed.seen.includes('bombBlast') && missed.lost === 0);
  // It dips as it drops: a real jab from under it lands then.
  const p = crew('brimBee', [at(0, 2, -1.6)]);
  until(p, () => p.e.phase === 'recover', 4, () => ready(p.e));
  run(p, 0.4, () => {
    p.e.pos.x = 0;
    p.e.pos.z = -1.6;
  });
  const low = p.e.pos.y;
  const hp = p.e.hp;
  jab(p);
  check(`it dips as it drops (${low.toFixed(1)} m, its hover ${v.beeAlt}): a real jab from under it lands (${hp - p.e.hp})`, low < v.beeAlt - 0.6 && p.e.hp < hp);
}

section('Floor 10 — the Pit Fiend');
{
  check(`a mini boss, smaller than the Demon was (${v.fiendHeight} m, 6.5 then), its health a mini boss’s (${ENEMY_STATS.pitFiend().hp})`, MINI_BOSSES.includes('pitFiend') && v.fiendHeight < 6.5 && ENEMY_STATS.pitFiend().hp <= 340 && ENEMY_STATS.pitFiend().stunned > 1);
  // Its charge throws you.
  const c = crew('pitFiend', [at(0, 0, -14)]);
  c.e.move = FIEND_CHARGE;
  setPhase(c.e, 'windup');
  const ch = run(c, v.fiendChargeWindup + 1.2);
  check(`its charge, warned, runs into you and throws you (${ch.lost})`, ch.seen.includes('demonCharge') && ch.seen.includes('demonGore') && ch.lost === v.fiendChargeDamage);
  // Into a wall it's stunned, and your real jabs do more.
  const w = crew('pitFiend', [at(0, 0, 14)]);
  w.p.pos.set(-15, 0, 0);
  w.e.facing = Math.PI;
  startCharge(w.e, index(w), w.c);
  const crash = until(w, () => w.e.phase === 'stun', 3);
  w.p.pos.set(w.e.pos.x - 2.6, 0, w.e.pos.z);
  const shp = w.e.hp;
  jab(w);
  const stunnedJab = shp - w.e.hp;
  check(`into a wall it’s stunned: a real jab does more (${stunnedJab.toFixed(1)}, ${FISTS.v.jabDamage} as ever)`, crash.includes('demonCrash') && w.e.phase === 'stun' && stunnedJab > FISTS.v.jabDamage * 1.4);
  // Its leap comes down where you were: the blow, and a ring rolling out.
  const l = crew('pitFiend', [at(0, 0, -7)]);
  l.e.move = FIEND_LEAP;
  setPhase(l.e, 'windup');
  const leap = run(l, v.fiendLeapWindup + v.fiendLeapAir + DT * 3);
  check(`its leap comes down where you stand: its landing (${leap.lost}) and a quake ring rolling out`, leap.seen.includes('fiendLeap') && leap.seen.includes('fiendSlam') && leap.lost >= v.fiendSlam && l.c.quakes.some((q) => q.alive));
  // Its fan of fire; at half health it roars, and fires two.
  const f = crew('pitFiend', [at(0, 0, -9)]);
  f.e.move = FIEND_VOLLEY;
  setPhase(f.e, 'windup');
  run(f, v.fiendVolleyWindup + DT * 2);
  const one = f.c.orbs.filter((o) => o.alive && o.by === 'pitFiend').length;
  const r = crew('pitFiend', [at(0, 0, -9)]);
  r.e.hp = ENEMY_STATS.pitFiend().hp * 0.4;
  const roar = run(r, DT * 2);
  r.e.move = FIEND_VOLLEY;
  setPhase(r.e, 'windup');
  run(r, v.fiendVolleyWindup * v.fiendRageWindup + 0.4);
  const two = r.c.orbs.filter((o) => o.alive && o.by === 'pitFiend').length;
  // (Its warning: what it'll do, its sound and glow: once it picks a move itself.)
  const p = crew('pitFiend', [at(0, 0, -9)]);
  const picked = until(p, () => p.e.phase === 'windup', 3, () => ready(p.e));
  check('it picks its move by how far you are and warns', picked.includes('fiendWindup') && [FIEND_CHARGE, FIEND_LEAP, FIEND_VOLLEY].includes(p.e.move));
  check(`its fan of fire (${one}); at half health it roars, and fires two (${two})`, one === Math.round(v.fiendVolleyOrbs) && roar.seen.includes('fiendRoar') && r.e.stage === 1 && two === 2 * one);
  // Only a hard blow staggers it.
  const s = crew('pitFiend', [at(0, 0, -2.6)]);
  let flinched = false;
  jab(s, () => {
    s.e.token = false;
    s.e.cooldown = 9;
    flinched ||= s.e.phase === 'flinch';
  });
  check('a real jab doesn’t stagger it', !flinched && s.e.hp < ENEMY_STATS.pitFiend().hp);
}

section('Floor 10 — the Spore Lord and its spores');
{
  const hold = (m: Crew) => () => {
    m.e.token = false;
    m.e.cooldown = 9;
  };
  // It shakes out its spores: clouds round it, drifting your way.
  const m = crew('sporeLord', [at(0, 0, -9)]);
  m.e.move = PUFF;
  setPhase(m.e, 'windup');
  const puff = run(m, v.sporeWindup + DT * 2);
  const clouds = m.c.ground.spores.clouds.filter((c) => c.alive);
  const near0 = Math.min(...clouds.map((c) => Math.hypot(c.x, c.z)));
  run(m, 2, hold(m));
  const near1 = Math.min(...m.c.ground.spores.clouds.filter((c) => c.alive).map((c) => Math.hypot(c.x, c.z)));
  check(`it shakes out ${clouds.length} spore clouds round it, drifting your way (${near0.toFixed(1)} m, then ${near1.toFixed(1)})`, puff.seen.includes('sporePuff') && clouds.length === Math.round(v.sporeClouds) && near1 < near0 - 1);
  // In one, you burn.
  const b = crew('sporeLord', [at(0, 0, -14)]);
  puffSpores(b.c.ground.spores, 0, 0, 0, 1, b.c.rng);
  const cl = b.c.ground.spores.clouds.find((c) => c.alive)!;
  cl.x = 0;
  cl.z = 0;
  const burn = run(b, 1.5, hold(b));
  check(`standing in one burns you now and then (${burn.lost})`, burn.seen.includes('sporeBurn') && burn.lost >= v.sporeBurn * 2 && burn.lost % v.sporeBurn === 0);
  // Over lava, a cloud blows: you and the Spore Lord in it hurt.
  const lava = crew('sporeLord', [at(1.5, 0, -1)]);
  puffSpores(lava.c.ground.spores, 0, 0, 0, 1, lava.c.rng);
  const lc = lava.c.ground.spores.clouds.find((c) => c.alive)!;
  lc.x = 0;
  lc.z = 0;
  const lhp = lava.e.hp;
  lava.c.ground.pits.push(boxAt(-0.5, -1, -0.5, 1, 1, 1, 'floor'));
  const blew = run(lava, DT * 2, hold(lava));
  check(`over lava a cloud blows: you in it (${blew.lost}), the Spore Lord too (${(lhp - lava.e.hp).toFixed(0)})`, blew.seen.includes('sporeBlast') && blew.lost === v.sporeBlast && lava.e.hp < lhp && !lava.c.ground.spores.clouds.some((c) => c.alive));
  // A fireball through one blows it.
  const fb = crew('sporeLord', [at(0, 0, -16)]);
  puffSpores(fb.c.ground.spores, 0, 0, -8, 1, fb.c.rng);
  const fc = fb.c.ground.spores.clouds.find((c) => c.alive)!;
  fc.x = 0;
  fc.z = -8;
  fireOrb(fb.c.orbs, new Vector3(-6, 1.2, -8), new Vector3(1, 0, 0), 15, 10, 'imp', 'fire');
  const fired = until(fb, () => !fc.alive, 1.5, hold(fb));
  check('an Imp’s fireball flying through a cloud blows it', fired.includes('sporeBlast'));
  // A Cinder Chicken's burst beside one blows it.
  const cb = crew('cinderChicken', [at(0, 0, -10)]);
  cb.p.pos.set(0, 0, 10);
  puffSpores(cb.c.ground.spores, 0, 0, -10, 1, cb.c.rng);
  const cc = cb.c.ground.spores.clouds.find((c) => c.alive)!;
  cc.x = 2.5;
  cc.z = -10;
  cb.e.move = FUSE;
  setPhase(cb.e, 'windup');
  cb.e.t = v.chickenFuse;
  const chained = run(cb, DT * 4, () => {});
  check('a Cinder Chicken’s burst beside a cloud blows it', chained.seen.includes('chickenBurst') && chained.seen.includes('sporeBlast') && !cc.alive);
  // A fire vent jetting under one blows it.
  const vt = crew('sporeLord', [at(0, 0, -16)]);
  const spot = { x: 4, z: -4, room: 0, beat: 0 };
  const mach = createMachinery({ presses: [], vents: [spot], belts: [], beltAt: new Int16Array(0) });
  puffSpores(vt.c.ground.spores, 0, 0, 0, 1, vt.c.rng);
  const vc = vt.c.ground.spores.clouds.find((c) => c.alive)!;
  vc.x = 4;
  vc.z = -4;
  vc.life = vc.full = 99;
  let jetted = false;
  const vs = until(vt, () => !vc.alive, 12, () => {
    stepMachinery(mach, vt.p, vt.c, DT);
    jetted ||= ventAt(spot, mach.t) === 'burn';
    hold(vt)();
  });
  check('a fire vent jetting under a cloud blows it', jetted && vs.includes('sporeBlast'));
  // Its slam: a hop, the blow close by, a ring rolling out. Its bite.
  const s = crew('sporeLord', [at(0, 0, -3)]);
  s.e.move = SPORE_SLAM;
  setPhase(s.e, 'windup');
  const slam = run(s, v.sporeSlamWindup + 0.45 + DT * 3);
  check(`its slam: a hop, its landing close by (${slam.lost}), a ring rolling out`, slam.seen.includes('sporeSlam') && slam.lost >= v.sporeSlam && s.c.quakes.some((q) => q.alive));
  const bt = crew('sporeLord', [at(0, 0, -2.6)]);
  bt.e.move = BITE;
  setPhase(bt.e, 'windup');
  const bite = run(bt, 0.45 + DT * 2);
  check(`close in front of it, its bite (${bite.lost})`, bite.seen.includes('sporeBite') && bite.lost === v.sporeBite);
  const j = crew('sporeLord', [at(0, 0, -2.6)]);
  let flinched = false;
  jab(j, () => {
    hold(j)();
    flinched ||= j.e.phase === 'flinch';
  });
  check('a real jab doesn’t stagger it', !flinched && j.e.hp < ENEMY_STATS.sporeLord().hp);
}

section('Floor 10 — its rooms, the second batch');
{
  let rooms = 0;
  let perchBees = 0;
  let perchRooms = 0;
  const seen = new Set<EnemyKind>();
  let minisOff = 0;
  for (let seed = 1; seed <= 30; seed++) {
    for (const r of planFloor(seed, F).rooms) {
      if (r.kind !== 'fight') continue;
      rooms++;
      for (const k of r.waves.flat()) seen.add(k);
      if (r.waves.flat().some((k) => MINI_BOSSES.includes(k) && k !== 'pitFiend' && k !== 'sporeLord')) minisOff++;
      if (r.layout.perches.length > 0) {
        perchRooms++;
        if (r.waves.every((w) => w.includes('brimBee'))) perchBees++;
      }
    }
  }
  check(`its rooms bring all eight (${[...seen].join(', ')}), its mini bosses only its own`, rosterOf(F).every((k) => seen.has(k)) && minisOff === 0 && rooms > 0);
  check(`a room with perches has Brimstone Bees in every wave (${perchBees} of ${perchRooms})`, perchBees === perchRooms);
}
