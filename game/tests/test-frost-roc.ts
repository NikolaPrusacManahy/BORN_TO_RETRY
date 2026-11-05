// Update 0.3.26 — floor 4's boss, the Frost Roc (the designer: "Birb, the Frost Roc"): Frozen Depths' own, in the bosses' health
// range, named, its model and every clip.
// Update 0.3.56 — by the Boss Design Bible, "Ground or air?" (the designer: "Keep them, adapt"): what's on the floor you jump, what's
// in the air you stay under. Stomp Quake, Wing Clap, Ice Hurl; its belly slide and breath; phase 2: its torn-out pillar, Pillar
// Swing, Fault Line; its ultimate, Mountain Fall: both knees, or the boulders.
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { at, crew, run, until } from './fakes/crewMeet';
import { DT, ticks, run as walk } from './fakes/flatWorld';
import { bossOf, ENEMY_STATS, ownBossOf } from '../src/sim/enemies/kinds';
import { hitEnemy, setPhase } from '../src/sim/enemies/enemy';
import { rocWindup } from '../src/sim/enemies/frostRoc';
import { kneeAt, kneeRadius } from '../src/sim/enemies/rocBody';
import { BREATH, CLAP, FAULT, HURL, layCracks, ROAR, SLIDE, STOMP, SWING } from '../src/sim/enemies/rocMoves';
import { FALL_CUE } from '../src/sim/enemies/rocFall';
import { bossCoins, calledBy } from '../src/sim/dungeon/bossRoom';
import { addRime } from '../src/sim/combat/frost';
import { parry, stepParried } from '../src/sim/combat/parry';
import { emptyTargetHit, landHit, nearestTarget } from '../src/sim/combat/strike';
import { pillarsOf } from '../src/sim/combat/pillars';
import { maxHpOf } from '../src/sim/player/health';
import { initPhysics, RapierWorld } from '../src/physics/rapierWorld';
import { FROST_ROC } from '../src/tuning/frostRoc';
import { LOOKS } from '../src/engine/enemyLooks';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { causeName } from '../src/screens/deathText';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { Arena, boxAt } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { cliffWay, PLATEAU_ROOM } from '../src/world/dungeon/plateau';
import { bossRoomOf } from '../src/world/dungeon/rooms';

const v = FROST_ROC.v;
/** The Roc `dist` m off (north of you), its move `move` told now. */
const meet = (dist: number, move: number, stage = 0) => {
  const m = crew('frostRoc', [at(0, 0, -dist)]);
  m.e.stage = stage;
  m.e.ult.count = stage > 0 ? 1 : 0;
  m.e.move = move;
  m.e.shots = 0;
  setPhase(m.e, 'windup');
  return m;
};
/** Holds you at height `y` on the spot while it runs. */
const upAt = (m: ReturnType<typeof crew>, y: number) => () => {
  m.p.pos.y = y;
  m.p.vel.set(0, 0, 0);
};
const lost = (m: ReturnType<typeof crew>) => maxHpOf(m.p) - m.p.hp;
const tell = (move: number, stage = 0) => rocWindup(move, stage);

section('Frost Roc — floor 4’s boss');
{
  check('Frozen Depths’ boss, its own', bossOf(FLOOR.frozen) === 'frostRoc' && ownBossOf(FLOOR.frozen) === 'frostRoc');
  check(`never tankier: ${v.rocHp}, named, its chest 15 coins`, v.rocHp === 1190 && ENEMY_STATS.frostRoc().hp === v.rocHp && BOSS_NAMES.frostRoc !== undefined && bossCoins('frostRoc') === 15);
  check('it no longer calls the dead: its fight is it', calledBy('frostRoc') === null);
  check('named on the death screen', causeName('frostRoc') !== 'frostRoc');
  check('the bible’s tell for a fourth boss, quicker in phase 2', near(tell(STOMP), 0.9, 0.11) && tell(STOMP, 1) < tell(STOMP));
  const look = LOOKS.frostRoc!;
  const model = readFileSync(new URL('../public/models/enemies/frost_roc.glb', import.meta.url)).toString('latin1');
  const clips = [...Object.values(look.clips), ...Object.values(look.moveClips ?? {}).map((c) => c[0])];
  check('its model has every clip it plays', clips.every((c) => !c || model.includes(`"${c}"`)), clips.filter((c) => c && !model.includes(`"${c}"`)).join());
}

section('Frost Roc — Stomp Quake: be in the air as each ring passes');
{
  const m = meet(10, STOMP);
  const t = run(m, tell(STOMP) - 3 * DT);
  check('its knee high: nothing yet', !t.seen.includes('rocStomp') && t.lost === 0);
  const s = run(m, 3 * v.stompGap + 0.1);
  check('three stomps', s.seen.filter((x) => x === 'rocStomp').length === 3 && m.e.phase === 'recover');
  const r = run(m, v.stompRecover - 0.2);
  check(`stood still, its rings hit you`, r.lost + s.lost >= v.stompDamage);
  check(`slow after the third (${v.stompRecover} s): your opening`, m.e.phase === 'recover');
  const j = meet(10, STOMP);
  j.p.pos.y = 3;
  const over = run(j, tell(STOMP) + 3 * v.stompGap + 2, upAt(j, 3));
  check('in the air, they pass under you', over.lost === 0 && over.seen.includes('rocStomp'));
}

section('Frost Roc — Wing Clap: stay on the ground');
{
  const g = meet(10, CLAP);
  const r = run(g, tell(CLAP) + 0.2);
  check('on the ground, it’s only a clap', r.seen.includes('rocClap') && r.lost === 0);
  const a = meet(10, CLAP);
  const hit = run(a, tell(CLAP) + 0.05, upAt(a, 2));
  check('in the air in front of it, you’re hit', hit.lost === v.clapDamage && hit.seen.includes('rocClapHit'));
  const low = meet(10, CLAP);
  low.p.pos.set(0, 0, -30);
  const behind = run(low, tell(CLAP) + 0.05, () => {
    low.e.facing = 0;
    upAt(low, 2)();
  });
  check('behind it, or out of its reach, you’re not', behind.lost === 0);
}

section('Frost Roc — Ice Hurl: dodge it; parry a shard back');
{
  const m = meet(12, HURL);
  run(m, tell(HURL) + 0.05);
  const block = m.c.bombs.find((b) => b.alive && b.look === 'berg');
  check('its block of ice in flight, marked where you stood', !!block && near(block.to.x, 0, 0.01) && near(block.to.z, 0, 0.01));
  const land = run(m, v.hurlFall + 0.05);
  check('landing, it hurts you there', land.lost === v.hurlDamage || land.lost >= v.hurlDamage);
  const shards = m.c.orbs.filter((o) => o.alive && o.look === 'shard');
  check(`and shatters into ${Math.round(v.shards)} shards`, shards.length === Math.round(v.shards), `${shards.length}`);
  const q = meet(12, HURL);
  q.p.pos.set(15, 0, 15);
  run(q, tell(HURL) + v.hurlFall + 0.1);
  const shard = q.c.orbs.find((o) => o.alive && o.look === 'shard')!;
  const eye = shard.pos.clone().add(new Vector3(0, 0.2, 1));
  const dir = new Vector3(q.e.pos.x - eye.x, 3 - eye.y, q.e.pos.z - eye.z).normalize();
  check('a shard can be parried', parry(q.c, eye, dir) >= 0 && shard.parried);
  const hp = q.e.hp;
  for (let i = 0; i < ticks(2) && shard.alive; i++) stepParried(q.c, q.world, DT);
  q.c.events.clear();
  check('back at it: hurt, and it staggers', q.e.hp < hp && q.e.phase === 'stun');
  run(q, v.shardStagger - 0.1);
  check(`for ${v.shardStagger} s`, q.e.phase === 'stun');
}

section('Frost Roc — its belly slide and its breath, kept');
{
  const m = meet(10, SLIDE);
  const r = until(m, () => m.e.phase === 'recover' || m.e.phase === 'stun', tell(SLIDE) + 4);
  check('its slide reaches you', r.includes('rocSlide') && lost(m) >= v.slideDamage);
  const walled = crew('frostRoc', [at(0, 0, -8)], [boxAt(-30, 0, 8, 60, 8, 1, 'wall')]);
  walled.e.move = SLIDE;
  setPhase(walled.e, 'windup');
  walled.p.pos.set(0, 0, 5);
  const s = until(walled, () => walled.e.phase === 'stun' || walled.e.phase === 'recover', tell(SLIDE) + 4, () => walled.p.pos.set(0, 0, 5));
  check('fast into a wall, it’s stunned', s.includes('rocCrash') && walled.e.phase === 'stun');
  const b = meet(8, BREATH);
  const fan = run(b, tell(BREATH) + v.breathFor + 0.1);
  check('its breath catches you on the ground', fan.lost >= v.breathDamage && fan.seen.includes('rocBreathHit'));
  const j = meet(8, BREATH);
  const hop = run(j, tell(BREATH) + v.breathFor + 0.1, upAt(j, 2));
  check('along the floor: jumped, it doesn’t', hop.lost === 0);
  addRime(b.c.ground.frost, 0, 0, 2, 2);
}

section('Frost Roc — its picks punish what you overuse');
{
  const count = (air: number) => {
    let claps = 0;
    let stomps = 0;
    for (let s = 1; s <= 80; s++) {
      const m = crew('frostRoc', [at(0, 0, -5)], [], s);
      m.e.cooldown = 0;
      m.e.roc!.midSet = true;
      m.e.roc!.air = air;
      run(m, DT * 2);
      if (m.e.move === CLAP) claps++;
      if (m.e.move === STOMP) stomps++;
    }
    return { claps, stomps };
  };
  const inAir = count(1);
  const down = count(0);
  check(`much in the air, its clap comes more (${inAir.claps} of 80, against ${down.claps})`, inAir.claps > down.claps * 1.5, `${inAir.claps} ${down.claps}`);
  check(`rooted to the ground, its stomp (${down.stomps} against ${inAir.stomps})`, down.stomps > inAir.stomps * 1.5, `${down.stomps} ${inAir.stomps}`);
  const m = crew('frostRoc', [at(0, 0, -40)]);
  m.e.cooldown = 99;
  run(m, 3, upAt(m, 2));
  check('it’s watching you', m.e.roc!.air > 0.3);
  const seen: number[] = [];
  const f = crew('frostRoc', [at(0, 0, -5)]);
  for (let i = 0; i < 60; i++) {
    f.e.cooldown = 0;
    setPhase(f.e, 'chase');
    run(f, DT * 2);
    seen.push(f.e.move);
  }
  check('never one move three times running… four', !seen.some((x, i) => i >= 3 && x === seen[i - 1] && x === seen[i - 2] && x === seen[i - 3]));
}

section('Frost Roc — phase 2: it tears a pillar out');
{
  const m = crew('frostRoc', [at(0, 0, -10)], [boxAt(7.5, 0, -0.5, 1, 4.9, 1, 'block')]);
  m.c.pillars = pillarsOf({ pillars: [{ x: 8, z: 0, half: 0.5, h: 4.9, box: -1 }], boxes: [] } as unknown as Arena);
  run(m, DT);
  m.e.hp = ENEMY_STATS.frostRoc().hp * v.rageAt - 1;
  m.e.cooldown = 99;
  run(m, DT);
  check('below half: it roars', m.e.stage === 1 && m.e.move === ROAR && m.e.phase === 'windup');
  const r = run(m, rocWindup(ROAR, 1) + 1.1);
  check('and hops to a pillar, tears it out, and holds it', r.seen.includes('rocRoar') && r.seen.includes('rocRip') && m.c.pillars[0].broken && m.e.deeds === 1);
}

section('Frost Roc — Pillar Swing: reading the height is the test');
{
  const swing = (low: boolean, y: number) => {
    const m = meet(8, SWING, 1);
    const seeded = run(m, tell(SWING, 1) + DT * 2);
    m.e.roc!.swingLow = low;
    m.e.shots = 2; // (the last of them)
    m.e.t = 0;
    return { lost: seeded.lost + run(m, v.swingTell / v.ragePace + v.swingFor + 0.1, upAt(m, y)).lost, m };
  };
  check('a low swing hits you on the ground', swing(true, 0).lost === v.swingDamage);
  check('jump it, and it passes under you', swing(true, 2).lost === 0);
  check('a high swing passes over your head, if you stay down', swing(false, 0).lost === 0);
  check('jump into it, and it hits you', swing(false, 2).lost === v.swingDamage);
  const m = meet(8, SWING, 1);
  run(m, tell(SWING, 1) + DT * 2);
  const first = m.e.roc!.swingLow;
  m.p.pos.set(40, 0, 40);
  run(m, v.swingTell / v.ragePace + v.swingFor + 0.05);
  check('low, then high, then low', m.e.phase === 'dive' && m.e.roc!.swingLow !== first);
  run(m, 2 * (v.swingTell / v.ragePace + v.swingFor));
  check(`${Math.round(v.swings)} of them, then it stands`, m.e.phase === 'recover');
}

await initPhysics();

section('Frost Roc — Fault Line: slabs of real ground');
{
  const m = meet(12, FAULT, 1);
  layCracks(m.e, m.p, m.c);
  const r0 = m.e.roc!;
  check('cracks run out from its feet, past you', r0.cracks.length === 3 && r0.cracks.every((c) => c.long > 12));
  m.p.pos.set(50, 0, 50);
  const r = run(m, tell(FAULT, 1) + 1);
  check('its fist comes down: slabs erupt along them', r.seen.includes('rocFault') && r.seen.includes('rocSlab') && r0.boxes.length >= 10, `${r0.boxes.length}`);
  check('for the physics', r0.dirty && r0.boxes.every((b) => b.kind === 'block' && !!b.quat && b.h >= 1));
  check('their heights vary', new Set(r0.boxes.map((b) => b.h.toFixed(2))).size > 3);
  // Under one as it rises.
  const u = meet(12, FAULT, 1);
  layCracks(u.e, u.p, u.c);
  run(u, tell(FAULT, 1) + DT * 2);
  const slab = u.e.roc!.slabs.find((s) => !s.up)!;
  u.p.pos.set(slab.x, 0, slab.z);
  const hit = run(u, 1, () => {
    if (!slab.up) u.p.pos.set(slab.x, 0, slab.z);
  });
  check('under one as it rises: hurt, and thrown up on top', hit.lost === v.faultDamage && hit.seen.includes('rocSlabHit'));
  // Real ground, in Rapier.
  const room: Arena = { name: 'plateau', boxes: [boxAt(-30, -1, -30, 60, 1, 60, 'floor')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const physics = new RapierWorld(room);
  const b = r0.boxes[0];
  physics.setBody(r0.boxes);
  const p = crew('frostRoc', [at(0, 0, -40)]).p;
  p.pos.set(b.x, b.y + b.h / 2 + 0.3, b.z);
  p.grounded = false;
  walk(p, physics, ticks(0.4));
  check('you can stand on one', near(p.pos.y, b.h, 0.2), `${p.pos.y.toFixed(2)} on ${b.h.toFixed(2)}`);
  physics.dispose();
  // It breaks what it walks into; they don't last.
  const s0 = r0.slabs[0];
  const count = r0.slabs.length;
  m.e.pos.set(s0.x, 0, s0.z);
  const broken = run(m, DT);
  check('it breaks one it walks into', broken.seen.includes('rocSlabBreak') && r0.slabs.length < count);
  m.e.pos.set(50, 0, -50);
  m.e.cooldown = 1e9;
  setPhase(m.e, 'chase');
  run(m, v.faultLast + 2);
  check('and they go', r0.slabs.length === 0 && r0.boxes.length === 0);
  // Dead: all gone.
  const d = meet(12, FAULT, 1);
  layCracks(d.e, d.p, d.c);
  d.p.pos.set(50, 0, 50);
  run(d, tell(FAULT, 1) + 1);
  hitEnemy(d.e, 1e6, 0, 0, 0);
  run(d, 0.1);
  check('killed, nothing of it’s left standing', d.e.roc!.boxes.length === 0);
}

section('Frost Roc — Mountain Fall');
{
  const m = crew('frostRoc', [at(0, 0, -10)]);
  run(m, DT);
  m.e.stage = 1;
  m.e.deeds = 0;
  m.e.cooldown = 99;
  setPhase(m.e, 'chase');
  const t = run(m, DT * 2);
  check('once as phase 2 starts: it goes to its cliff', t.seen.includes('rocFallTell') && m.e.phase === 'blast' && m.e.roc!.cornice === 'cracking');
  const o = run(m, 1.3);
  const r = m.e.roc!;
  check(`“${FALL_CUE}”, ${v.fallWindow} s (the bible’s), its knees glowing`, o.seen.includes('rocFallOpen') && m.e.ult.on && m.e.ult.cue === FALL_CUE && near(m.e.ult.window, 6, 0.01) && r.knees[0] > 0 && r.knees[1] > 0);
  check('at the foot of its cliff, from its middle', near(m.e.pos.x, r.midX + r.cliffX * 12, 0.01) && near(m.e.pos.z, r.midZ + r.cliffZ * 12, 0.01));
  // Its knees: any blow that reaches, from the floor.
  const knee = kneeAt(m.e, 0, new Vector3());
  const from = new Vector3(knee.x, 1.6, knee.z + 2);
  const hit = emptyTargetHit();
  check('a blow from the floor reaches a knee, ahead of its body', nearestTarget(m.c, from, knee, 0.3, hit) && hit.kind === 'knee' && hit.part === 0);
  const hp = m.e.hp;
  for (let i = 0; i < Math.round(v.kneeHits); i++) landHit(m.c, hit, 10, 0, 0, 0, 'hitJab', 10);
  check('blows go to its knee, not its health', r.knees[0] === 0 && m.e.hp === hp && m.e.ult.fill === Math.round(v.kneeHits));
  check('its broken knee takes no more', !(nearestTarget(m.c, from, knee, 0.05, hit) && hit.kind === 'knee' && hit.part === 0));
  check('one knee isn’t enough', m.e.ult.on);
  const other = kneeAt(m.e, 1, new Vector3());
  const from2 = new Vector3(other.x + 2, 1.6, other.z + 0.5);
  nearestTarget(m.c, from2, other, 0.3, hit);
  check('the other, too', hit.kind === 'knee' && hit.part === 1 && near(kneeRadius(), 0.66, 0.2));
  for (let i = 0; i < Math.round(v.kneeHits); i++) landHit(m.c, hit, 10, 0, 0, 0, 'hitJab', 10);
  const hp2 = m.e.hp;
  const down = run(m, DT * 3);
  check('both broken: it collapses, and the cornice lands on its own back', down.seen.includes('rocKneesBroken') && m.e.phase === 'stun' && m.e.hp === hp2 - v.fallSelf && r.cornice === 'onIt' && down.lost === 0);
  run(m, v.fallStun - 0.1);
  check(`down ${v.fallStun} s`, m.e.phase === 'stun');
  const hp3 = m.e.hp;
  hitEnemy(m.e, 10, 0, 0, 0);
  check('hits do more', hp3 - m.e.hp > 10);

  // Not in time: boulders.
  const f = crew('frostRoc', [at(0, 0, -10)]);
  f.p.pos.set(4, 0, 4);
  run(f, DT);
  f.e.stage = 1;
  f.e.cooldown = 99;
  setPhase(f.e, 'chase');
  run(f, 1.4);
  const c = run(f, v.fallWindow + 0.1);
  check('not broken in time: the cornice smashes', c.seen.includes('rocCornice') && f.e.roc!.cornice === 'smashed');
  let most = 0;
  let total = 0;
  const hurt = until(f, () => f.e.phase !== 'blast', v.rainCount * v.rainEvery + v.rainFall + 3, () => {
    const n = f.c.bombs.filter((b) => b.alive && b.look === 'boulder').length;
    most = Math.max(most, n);
    total++;
    f.p.dead = false;
    f.p.hp = maxHpOf(f.p);
  });
  check(`boulders rain, each marked (${most} at once)`, most >= 3 && hurt.includes('boulderSmash'));
  check('then it’s over', f.e.phase !== 'blast' && f.e.roc!.rainLeft === 0 && total > 0);
  check('heavy, not an instant death: each far short of your health', v.rainDamage < maxHpOf(f.p) * 0.5);

  // Shelter at a pillar: it takes the hit, and snaps.
  const s = crew('frostRoc', [at(0, 0, -10)]);
  s.c.pillars = pillarsOf({ pillars: [{ x: 3, z: 3, half: 0.5, h: 4.9, box: -1 }], boxes: [] } as unknown as Arena);
  s.p.pos.set(3.5, 0, 4.5);
  run(s, DT);
  s.e.stage = 1;
  s.e.cooldown = 99;
  setPhase(s.e, 'chase');
  run(s, 1.4);
  run(s, v.fallWindow + 0.1);
  until(s, () => s.c.pillars[0].broken, v.rainCount * v.rainEvery + v.rainFall + 2, () => s.p.pos.set(3.5, 0, 4.5));
  check('at a pillar, the one that comes for you takes it, and it snaps', s.c.pillars[0].broken);

  // About every minute.
  const e = crew('frostRoc', [at(0, 0, -30)]);
  e.p.pos.set(40, 0, 40);
  run(e, DT);
  e.e.stage = 1;
  e.e.ult.count = 1;
  e.e.ult.since = 0;
  e.e.cooldown = 1e9;
  setPhase(e.e, 'chase');
  run(e, v.fallEvery - 1);
  check('not again before its time', e.e.phase !== 'blast');
  run(e, 1.1);
  check(`then again, every ${v.fallEvery} s`, e.e.phase === 'blast');
}

section('Frost Roc — a whole fight, 300 s (you run about; it does all it has)');
{
  const m = crew('frostRoc', [at(0, 0, -10)]);
  m.c.pillars = pillarsOf({ pillars: [{ x: 8, z: 8, half: 0.5, h: 4.9, box: -1 }, { x: -8, z: 8, half: 0.5, h: 4.9, box: -1 }, { x: 8, z: -8, half: 0.5, h: 4.9, box: -1 }], boxes: [] } as unknown as Arena);
  m.e.cooldown = 0;
  const moves = new Set<number>();
  let bad = '';
  let hurtTicks = 0;
  for (let i = 0; i < ticks(300) && !bad; i++) {
    const a = i * DT * 0.6;
    const r = run(m, DT, () => {
      m.p.pos.set(Math.cos(a) * 14, 0, Math.sin(a * 1.3) * 14);
      m.p.dead = false;
      m.p.hp = maxHpOf(m.p);
      if (m.e.hp < 300) m.e.hp = 300;
      if (i === ticks(40)) m.e.hp = ENEMY_STATS.frostRoc().hp * v.rageAt - 1;
    });
    if (r.lost > 0) hurtTicks++;
    if (m.e.phase === 'windup') moves.add(m.e.move);
    if (m.e.phase === 'blast') moves.add(7);
    if (!Number.isFinite(m.e.pos.x + m.e.pos.y + m.e.pos.z)) bad = `not finite at ${(i * DT).toFixed(1)}`;
    if (m.e.pos.y < -0.01 || m.e.pos.y > 12) bad = `y ${m.e.pos.y.toFixed(1)} at ${(i * DT).toFixed(1)}`;
    if (!m.e.alive) bad = 'gone';
  }
  check('it stands, the whole time', !bad, bad);
  check('it uses all it has: all seven moves and its ultimate', [STOMP, CLAP, HURL, SLIDE, BREATH, SWING, FAULT, 7].every((x) => moves.has(x)), [...moves].join());
  check('it hurts you', hurtTicks > 5, `${hurtTicks}`);
  check('its ultimate more than once', m.e.ult.count >= 3, `${m.e.ult.count}`);
}

section('The frozen plateau');
{
  check('Frozen Depths’ boss room is its own', bossRoomOf(FLOOR.frozen) === PLATEAU_ROOM);
  for (const seed of [41, 4242, 7]) {
    const level = buildDungeon(planFloor(seed, FLOOR.frozen));
    const b = level.boss;
    const room = level.rooms[b.room];
    const pillars = (level.arena.pillars ?? []).filter((p) => p.x > room.min.x && p.x < room.max.x && p.z > room.min.z && p.z < room.max.z);
    const solidAt = (x: number, y: number, z: number) => level.arena.boxes.some((q) => q.kind !== 'floor' && Math.abs(x - q.x) <= q.w / 2 && Math.abs(y - q.y) <= q.h / 2 && Math.abs(z - q.z) <= q.d / 2);
    let open = true;
    for (let x = -14; x <= 14; x += 2) for (let z = -14; z <= 14; z += 2) if (solidAt(b.portal.x + x, 1, b.portal.z + z)) open = false;
    const c = cliffWay(level.plan);
    const doors = [...level.plan.rooms[b.room].doors, level.plan.wayOut.side];
    const side = c.x > 0 ? 'e' : c.x < 0 ? 'w' : c.z > 0 ? 's' : 'n';
    check(`seed ${seed}: ${pillars.length} pillars, its middle clear, its cliff away from any door`, pillars.length === 16 && open && !doors.includes(side as never), `${pillars.length} ${open} ${side} ${doors.join()}`);
  }
}
