// Update 0.3.73 — the Playable Demon's phase 3 (the bible; the designer: "start phase 3"). Its heat: hits, kills and parries heat the sword, it drains when you stop,
// high makes its moves bigger, full readies Last Verdict. Forged from the Fallen: every kill gives back a little health. Blade Throw: thrown through what it meets, E calls it back
// through what's on its way, twice quickly goes to it, the gauntlets meanwhile. Last Verdict: the world holds still, the sword grows, one cleave kills everything along your way.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { bladeWindup, landBlade, THROW, VERDICT } from '../src/sim/combat/bladeSwing';
import { bladeAway } from '../src/sim/combat/bladeThrow';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { addHeat, isHot } from '../src/sim/combat/heat';
import { verdictShade } from '../src/sim/combat/lastVerdict';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { dealable } from '../src/sim/cards/builds';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { BladeGrow } from '../src/engine/viewmodel/bladeGrow';
import { DEMON_HAND } from '../src/engine/viewmodel/handPose';
import { DEMON_ARCS } from '../src/engine/viewmodel/demonPoses';
import { DEMON_ARMS_URL, DEMON_BLADE_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { DemonFireView } from '../src/engine/demon/demonFireView';
import { DEMON } from '../src/tuning/demon';
import { DASH } from '../src/tuning/movement';
import type { Arena } from '../src/world/arena';

const d = DEMON.v;
const world = new FlatWorld();

/** The Demon at the origin facing −z, with dummies where you say. */
function room(dummies: { x: number; z: number }[], demon = true, w: FlatWorld = world) {
  const arena: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: dummies.map((q) => ({ x: q.x, y: 0, z: q.z })), turrets: [] };
  const c = createCombat({ ...arena, stands: [] });
  c.demon = demon;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  p.demon = demon;
  const seen: { kind: string; value: number }[] = [];
  const step = (intent: Partial<ReturnType<typeof emptyCombatIntent>>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, w, DT);
      for (let e = 0; e < c.events.length; e++) seen.push({ kind: c.events.at(e).kind, value: c.events.at(e).value });
      c.events.clear();
    }
  };
  const has = (kind: string) => seen.some((e) => e.kind === kind);
  const count = (kind: string) => seen.filter((e) => e.kind === kind).length;
  return { c, p, seen, step, has, count };
}
const EYE = () => new THREE.Vector3(0, 1.6, 0);
const AHEAD = () => new THREE.Vector3(0, 0, -1);
const hp = (c: CombatState, i = 0) => c.dummies[i].hp;
/** E, and let it fly. */
const thrown = (r: ReturnType<typeof room>) => {
  r.step({ interactPressed: true });
  r.step({}, bladeWindup(THROW) + DT);
};
const foe = (c: CombatState, x: number, z: number, kind: Parameters<typeof spawnEnemy>[1] = 'grunt') => c.enemies[spawnEnemy(c.enemies, kind, new THREE.Vector3(x, 0, z), 0)];

section('Heat (the bible: "hits, kills and parries heat the sword; heat drains when you stop attacking")');
{
  const r = room([{ x: 0, z: -3 }, { x: 1.5, z: -3 }]);
  check('it starts cold', r.c.blade.heat === 0);
  landBlade(r.c, 0, EYE(), AHEAD(), world);
  check(`each thing hit heats it (two: ${(2 * d.heatHit).toFixed(2)})`, near(r.c.blade.heat, 2 * d.heatHit, 1e-6));
  const kill = room([]);
  const e = foe(kill.c, 0, -3);
  e.hp = 1;
  landBlade(kill.c, 0, EYE(), AHEAD(), world);
  check(`a kill heats it more (${(d.heatHit + d.heatKill).toFixed(2)})`, near(kill.c.blade.heat, d.heatHit + d.heatKill, 1e-6));
  const hold = r.c.blade.heat;
  r.step({}, d.heatWait - 0.1);
  check('it holds a moment after your last hit', near(r.c.blade.heat, hold, 1e-9));
  r.step({}, 0.3);
  check('then it drains', r.c.blade.heat < hold && r.c.blade.heat > 0);
  r.step({}, 5);
  check('all the way', r.c.blade.heat === 0);
  const f = room([]);
  addHeat(f.c, 2);
  check('it stops at full, and says so', f.c.blade.heat === 1 && f.c.events.length === 1 && f.c.events.at(0).kind === 'heatFull');
  check('a burn’s ticks don’t feed it', (() => {
    const b = room([{ x: 0, z: -3.5 }]);
    b.step({});
    b.c.demonFire.walls.push({ ax: -2, az: -3.5, bx: 2, bz: -3.5, y: 0, left: 3, burn: 0 });
    b.step({}, 0.1);
    return hp(b.c) < 60 && b.c.blade.heat === 0;
  })());
  const j = room([{ x: 0, z: -2 }], false);
  j.step({ attackPressed: true }, DT);
  check('Joseph has none', j.c.blade.heat === 0);
}

section('High heat (the bible: "bigger arcs, longer fire walls, Hellfire Lunge leaves a burning trail")');
{
  // A dummy just past a cold swing's reach, and one just past its sweep.
  const far = { x: 0, z: -(d.reach + 0.9 + d.width) };
  const cold = room([far]);
  const was = hp(cold.c);
  landBlade(cold.c, 0, EYE(), AHEAD(), world);
  check('cold, it doesn’t reach this far', hp(cold.c) === was);
  const hot = room([far]);
  hot.c.blade.heat = d.heatHigh;
  check('high', isHot(hot.c));
  landBlade(hot.c, 0, EYE(), AHEAD(), world);
  check(`hot, it does (${d.hotArc} times)`, hp(hot.c) < was);
  const wall = room([]);
  landBlade(wall.c, 2, EYE(), AHEAD(), world);
  const coolWall = wall.c.demonFire.walls[0];
  const wall2 = room([]);
  wall2.c.blade.heat = 1;
  landBlade(wall2.c, 2, EYE(), AHEAD(), world);
  const hotWall = wall2.c.demonFire.walls[0];
  check(`a hot fire wall’s longer (${Math.abs(coolWall.bx - coolWall.ax).toFixed(1)} m, ${Math.abs(hotWall.bx - hotWall.ax).toFixed(1)} m)`, near(Math.abs(hotWall.bx - hotWall.ax), d.wallLong * d.hotWall, 0.01));
  const lunge = (heat: number) => {
    const l = room([]);
    l.c.blade.heat = heat;
    l.p.dashTime = d.lungeTime;
    l.p.dashDir.set(0, 0, -1);
    l.step({});
    l.p.pos.z = -10;
    l.p.dashTime = 0;
    l.step({});
    return l.c.demonFire.walls;
  };
  check('a cold Lunge leaves nothing', lunge(0).length === 0);
  const trail = lunge(0.9);
  check('a hot one leaves fire all along its way', trail.length === 1 && near(trail[0].bz - trail[0].az, -10, 0.01));
}

section('Forged from the Fallen (the bible: "every kill restores a little HP")');
{
  const r = room([]);
  r.p.hp = 50;
  const e = foe(r.c, 0, -3);
  e.hp = 1;
  r.c.fists.parryHeld = false;
  r.step({ attackPressed: true });
  // (It lands at the end of a tick; the health comes the next.)
  r.step({}, d.slashWindup + 2 * DT);
  check(`a kill gives back ${d.killHeal} HP`, near(r.p.hp, 50 + d.killHeal, 1e-6));
  const hit = room([]);
  hit.p.hp = 50;
  foe(hit.c, 0, -3);
  hit.step({ attackPressed: true });
  hit.step({}, d.slashWindup + DT);
  check('a hit gives none', hit.p.hp === 50);
  const j = room([], false);
  j.p.hp = 50;
  const je = foe(j.c, 0, -1.2);
  je.hp = 1;
  j.step({ attackPressed: true }, 0.1);
  check('Joseph’s kills give nothing: he heals at the shop', !je.alive || je.hp <= 1 ? j.p.hp === 50 : false);
}

section('Blade Throw (the bible: "throw the sword; it spins through enemies")');
{
  const r = room([{ x: 0, z: -8 }, { x: 0, z: -14 }, { x: 8, z: -8 }]);
  const a = hp(r.c, 0);
  const b = hp(r.c, 1);
  const off = hp(r.c, 2);
  r.step({ interactPressed: true });
  check('E: the arm draws back', r.seen.some((e) => e.kind === 'bladeSwing' && e.value === THROW) && !bladeAway(r.c));
  r.step({}, bladeWindup(THROW) + DT);
  check('and it’s gone', bladeAway(r.c) && r.c.blade.flying.stage === 'flying' && r.has('bladeThrown'));
  r.step({}, 0.1);
  check('it’s not there yet', hp(r.c, 0) === a);
  r.step({}, 0.6);
  check(`through the first and on to the second (${d.throwDamage} each)`, hp(r.c, 0) === a - d.throwDamage && hp(r.c, 1) === b - d.throwDamage);
  check('not what’s off to the side', hp(r.c, 2) === off);
  const before = hp(r.c, 0);
  r.step({}, d.throwRange / d.throwSpeed);
  check('it hangs at the end of its flight', r.c.blade.flying.stage === 'hanging' && near(r.c.blade.flying.pos.z, -d.throwRange - 1, 1.5));
  check('it’s not coming back by itself', bladeAway(r.c) && hp(r.c, 0) === before);
  // Hanging, it goes on cutting what's touching it.
  const hang = room([{ x: 0, z: -(d.throwRange + 1) }]);
  thrown(hang);
  hang.step({}, d.throwRange / d.throwSpeed + 0.1);
  const first = hp(hang.c);
  hang.step({}, d.hangTick * 1.5);
  check('hanging, it keeps cutting what touches it', hp(hang.c) < first);
  // A wall stops it.
  const w = new FlatWorld();
  w.walls.push({ x: 6, normalX: -1 });
  const s = room([], true, w);
  s.step({ interactPressed: true, yaw: -Math.PI / 2 });
  s.step({ yaw: -Math.PI / 2 }, bladeWindup(THROW) + DT);
  s.step({ yaw: -Math.PI / 2 }, 0.5);
  check('a wall stops it, its point in', s.c.blade.flying.stage === 'stuck' && s.c.blade.flying.pos.x < 6 && s.c.blade.flying.pos.x > 5 && s.has('bladeStuck'));
  // The floor too.
  const down = room([]);
  down.step({ interactPressed: true, pitch: -0.8 });
  down.step({ pitch: -0.8 }, bladeWindup(THROW) + DT);
  down.step({ pitch: -0.8 }, 0.4);
  check('so does the floor', down.c.blade.flying.stage === 'stuck' && down.c.blade.flying.pos.y > 0);
}

section('Its recall (the bible: "press E again to recall it, hits on the way back")');
{
  const r = room([{ x: 0, z: -8 }]);
  thrown(r);
  r.step({}, 0.7);
  const was = hp(r.c);
  r.step({ interactPressed: true });
  check('E: it waits a moment, for a second press', r.c.blade.flying.stage !== 'back' && r.c.blade.flying.tap > 0);
  r.step({}, d.throwTap + DT);
  check('then it’s called back', r.c.blade.flying.stage === 'back' && r.has('bladeRecall'));
  r.step({}, 0.4);
  // (A dummy has 60: the throw and this break it.)
  check(`and cuts what’s on its way (${d.recallDamage})`, hp(r.c) === Math.max(0, was - d.recallDamage));
  r.step({}, 1.5);
  check('caught', !bladeAway(r.c) && r.has('bladeCaught'));
  const again = r.count('bladeThrown');
  thrown(r);
  check('and you can throw it again', r.count('bladeThrown') === again + 1);
}

section('Going to it (the bible: "double-tap to teleport to it")');
{
  const r = room([]);
  thrown(r);
  r.step({}, 0.4);
  const at = r.c.blade.flying.pos.clone();
  r.step({ interactPressed: true });
  r.step({}, 0.05);
  r.step({ interactPressed: true });
  check('twice: you’re there', r.p.pos.distanceTo(new THREE.Vector3(at.x, 0, at.z)) < 3.5 && r.has('bladeBlink'));
  check('and it’s in your hand', !bladeAway(r.c));
  check('a moment nothing can touch you', r.p.invuln > 0);
  // Into a wall: short of it.
  const w = new FlatWorld();
  w.walls.push({ x: 6, normalX: -1 });
  const s = room([], true, w);
  const left = { yaw: -Math.PI / 2 };
  s.step({ interactPressed: true, ...left });
  s.step(left, bladeWindup(THROW) + DT);
  s.step(left, 0.5);
  s.step({ interactPressed: true, ...left });
  s.step({ interactPressed: true, ...left });
  check('stopped in a wall: you arrive short of it', s.has('bladeBlink') && s.p.pos.x < 6 - 0.3 && s.p.pos.x > 3);
  // In the air: you hang there, your eye at it.
  const up = room([]);
  const above = { pitch: 0.5 };
  up.step({ interactPressed: true, ...above });
  up.step(above, bladeWindup(THROW) + DT);
  up.step(above, 0.4);
  const y = up.c.blade.flying.pos.y;
  up.step({ interactPressed: true, ...above });
  up.step({ interactPressed: true, ...above });
  check('in the air: you’re up there with it', up.has('bladeBlink') && up.p.pos.y > 1 && up.p.pos.y < y && !up.p.grounded);
  // Under the floor it never puts you.
  const low = room([]);
  low.step({ interactPressed: true, pitch: -0.5 });
  low.step({ pitch: -0.5 }, bladeWindup(THROW) + DT);
  low.step({ pitch: -0.5 }, 0.5);
  low.step({ interactPressed: true, pitch: -0.5 });
  low.step({ interactPressed: true, pitch: -0.5 });
  check('stuck in the floor: you’re on the floor', low.has('bladeBlink') && near(low.p.pos.y, 0, 0.01));
  // Out of sight: no. (Thrown, and then a wall's up between: a gate shut.)
  const gate = new FlatWorld();
  const g = room([], true, gate);
  const way = { yaw: -Math.PI / 2 };
  g.step({ interactPressed: true, ...way });
  g.step(way, bladeWindup(THROW) + DT);
  g.step(way, 0.4);
  const start = g.p.pos.clone();
  gate.walls.push({ x: 4, normalX: -1 });
  g.step({ interactPressed: true, ...way });
  g.step({ interactPressed: true, ...way });
  check('out of sight, through a shut gate: no. It’s called back', g.p.pos.distanceTo(start) < 1e-6 && !g.has('bladeBlink') && g.c.blade.flying.stage === 'back');
  g.step(way, 2);
  check('it comes through the gate to you', !bladeAway(g.c));
}

section('While it’s out (the bible: "fight with the clawed gauntlets, reuse fist animations")');
{
  const r = room([{ x: 0, z: -2 }]);
  thrown(r);
  r.step({}, 0.05);
  check('your gauntlets: a plain dash', !r.p.demon);
  const was = hp(r.c);
  r.seen.length = 0;
  r.step({ attackPressed: true });
  check('left click punches', r.seen.some((e) => e.kind === 'hitJab' || e.kind === 'jabL' || e.kind === 'jabR') && hp(r.c) < was);
  check('no swing', !r.seen.some((e) => e.kind === 'bladeSwing'));
  r.seen.length = 0;
  r.step({ heavyHeld: true });
  check('right click’s a parry, no block', r.has('guard') && !r.c.blade.guard && r.p.guard === 0);
  r.step({}, 0.5);
  r.seen.length = 0;
  r.step({ slamPressed: true });
  check('Ctrl plants nothing', !r.has('demonBrand') && r.c.demonFire.brands.length === 0);
  const back = room([]);
  thrown(back);
  back.step({ interactPressed: true });
  back.step({}, 1.5);
  check('caught: the Demon’s again', back.p.demon && !bladeAway(back.c));
  const j = room([], false);
  j.step({ interactPressed: true }, 0.5);
  check('Joseph’s E throws nothing', !bladeAway(j.c) && !j.has('bladeThrown'));
}

section('Executions and its bar (the bible gives the Demon’s E and its bar to the sword)');
{
  const r = room([]);
  r.c.execution = 1;
  const e = foe(r.c, 0, -1.4);
  r.step({ interactPressed: true });
  check('E near one with the meter full throws: no execution', !r.c.exec.active && r.seen.some((s) => s.kind === 'bladeSwing' && s.value === THROW) && e.alive);
  check('no skull over it', r.c.execTarget === -1);
  r.c.fullMeter = true;
  r.step({});
  check('the Lab’s Meter keeps its heat full', r.c.blade.heat === 1);
  const j = room([]);
  j.c.demon = false;
  check('a weapon card’s no use to it, nor an execution’s', dealable(r.c, 'collector') === null && dealable(r.c, 'reapersRhythm') === null);
  check('Joseph’s still has them', dealable(j.c, 'collector') !== null);
  check('a fist card’s its as much as his', dealable(r.c, 'hairTrigger') !== null);
}

section('Last Verdict (the bible: "screen goes black and white, the sword grows huge, one cleave that kills everything in a line")');
{
  const r = room([{ x: 0, z: -30 }]);
  const near0 = foe(r.c, 0.5, -6);
  const far0 = foe(r.c, -1, -60);
  const beside = foe(r.c, 12, -6);
  const behind = foe(r.c, 0, 8);
  const high = foe(r.c, 0, -10);
  high.pos.y = 25;
  r.step({ throwPressed: true });
  check('not cold: nothing', !r.c.blade.verdict);
  r.c.blade.heat = 0.99;
  r.step({ throwPressed: true });
  check('not nearly full: nothing', !r.c.blade.verdict);
  r.c.blade.heat = 1;
  r.step({ throwPressed: true });
  check('full, Q: it starts', r.c.blade.verdict && r.has('demonVerdict') && r.seen.some((e) => e.kind === 'bladeSwing' && e.value === VERDICT));
  const x = near0.pos.x;
  near0.vel.set(0, 0, 0);
  // The world holds still.
  near0.pos.x = x;
  const clock = behind.t;
  r.step({}, d.verdictWindup * 0.5);
  check('the world holds still', behind.t === clock);
  check('the colour’s gone', near(verdictShade(r.c), 1, 1e-6));
  check('nothing’s hurt yet', near0.alive && near0.hp > 0);
  // You can still aim, up to the moment it lands: back to −z from where you've looked.
  r.step({ yaw: 0.5 });
  check('it follows your aim', near(r.c.blade.verdictYaw, 0.5, 1e-9));
  r.step({ yaw: 0 }, d.verdictWindup * 0.5);
  check('it lands', r.c.blade.verdictStruck && r.has('demonCleave'));
  check('near: dead', !near0.alive || near0.phase === 'dead');
  check('60 m away: dead', far0.phase === 'dead');
  check('high in the air: dead', high.phase === 'dead');
  check('the dummy in line: broken', r.c.dummies[0].broken);
  check('off to the side: alive', beside.alive && beside.phase !== 'dead');
  check('behind you: alive', behind.alive && behind.phase !== 'dead');
  check('heat’s spent', r.c.blade.heat === 0);
  check('it’s left fire along its way', r.c.demonFire.walls.length === 1 && r.c.demonFire.walls[0].bz < -50);
  check('the sheet shows', r.c.demonFire.cleave !== null);
  check('still held a moment', r.c.blade.verdict);
  r.step({}, d.verdictHold + DT);
  check('then it’s over, and the world goes on', !r.c.blade.verdict && r.p.invuln > 0);
  check('the colour’s coming back', verdictShade(r.c) > 0 && verdictShade(r.c) < 1.01);
  r.step({}, d.verdictFade + 0.1);
  check('and it’s back', verdictShade(r.c) === 0);
  check('the sheet’s gone', r.c.demonFire.cleave === null);
  // Boss: as the bible says, by its knob.
  const b = room([]);
  const boss = foe(b.c, 0, -6, 'hellwarden');
  const full = boss.hp;
  b.c.blade.heat = 1;
  b.step({ throwPressed: true });
  b.step({}, d.verdictWindup + DT);
  check('a boss in line dies, as the bible says', boss.phase === 'dead');
  const was = d.verdictBoss;
  DEMON.v.verdictBoss = 0.4;
  const b2 = room([]);
  const boss2 = foe(b2.c, 0, -6, 'hellwarden');
  b2.c.blade.heat = 1;
  b2.step({ throwPressed: true });
  b2.step({}, d.verdictWindup + DT);
  check('its knob can make it a share of its health instead', boss2.alive && near(boss2.hp, full * 0.6, 1));
  DEMON.v.verdictBoss = was;
  // A kill's a kill: you heal for each.
  const h = room([]);
  h.p.hp = 50;
  foe(h.c, 0, -5);
  foe(h.c, 0, -9);
  h.c.blade.heat = 1;
  h.step({ throwPressed: true });
  h.step({}, d.verdictWindup + DT);
  check(`it heals for each (${2 * d.killHeal})`, near(h.p.hp, 50 + 2 * d.killHeal, 1e-6));
  check('and whatever it killed, it’s still spent', h.c.blade.heat === 0);
  // With it thrown: it's back in your hand.
  const t = room([]);
  thrown(t);
  t.step({}, 0.3);
  t.c.blade.heat = 1;
  t.step({ throwPressed: true });
  check('thrown: it’s in your hand for it', !bladeAway(t.c) && t.c.blade.verdict && t.has('bladeCaught'));
  const j = room([], false);
  j.c.blade.heat = 1;
  j.step({ throwPressed: true });
  check('Joseph’s Q is his', !j.c.blade.verdict);
}

async function arms() {
  const a = await parseUntextured(new URL(`../public${DEMON_ARMS_URL}`, import.meta.url));
  const b = await parseUntextured(new URL(`../public${DEMON_BLADE_URL}`, import.meta.url));
  const rig = ArmsRig.fromScene(a.scene, DEMON_HAND);
  const vm = new Viewmodel(false);
  vm.holdBlade(b.scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const still = createPlayer(0, 0, 0, 0);
  still.grounded = true;
  const STEP = 1 / 120;
  const run = (s: number, c = -1) => {
    for (let t = 0; t < s - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, still, c);
  };
  vm.setWeapon(null);
  run(1.2);
  return { vm, rig, blade: b.scene, run };
}
function wrist(rig: ArmsRig): number {
  const r = rig.arms.R;
  const elbow = r.fore.bone.getWorldPosition(new THREE.Vector3());
  const at = r.hand.bone.getWorldPosition(new THREE.Vector3());
  const knuckle = r.knuckle.getWorldPosition(new THREE.Vector3());
  return (at.clone().sub(elbow).angleTo(knuckle.sub(at)) * 180) / Math.PI;
}

section('The sword’s heat, on it');
{
  const x = await arms();
  x.vm.setHeat(0);
  x.run(0.3);
  check('cold: no flames', x.vm.fire!.burning === 0 && x.vm.fire!.dripping === 0);
  x.vm.setHeat(0.5);
  x.run(0.3);
  const half = x.vm.fire!.burning;
  check(`half hot: half way up it (${half})`, half > 4 && half < 12);
  x.vm.setHeat(1);
  x.run(0.5);
  const all = x.vm.fire!.burning;
  check(`full: all the way (${all})`, all === 16);
  check('and it drips embers', x.vm.fire!.dripping > 3);
  let glowing: THREE.MeshStandardMaterial | null = null;
  x.blade.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material.emissive) glowing = o.material;
  });
  const hot = glowing!.emissiveIntensity;
  x.vm.setHeat(0);
  x.run(0.1);
  check(`and it burns brighter (${glowing!.emissiveIntensity.toFixed(2)} to ${hot.toFixed(2)})`, hot > glowing!.emissiveIntensity * 1.5);
  x.vm.setHeat(1);
  x.vm.setBladeOut(true);
  x.vm.setWeapon(null);
  x.run(0.1);
  check('thrown: nothing on the empty hand', x.vm.fire!.burning === 0);
}

section('The arms: thrown, the gauntlets, caught');
{
  const x = await arms();
  check('in the hand', x.vm.heldWeapon === x.blade);
  x.vm.arc(THROW);
  x.run(bladeWindup(THROW));
  x.vm.scene.updateMatrixWorld(true);
  check(`the throw: its wrist at ${Math.round(wrist(x.rig))}°`, wrist(x.rig) < 50);
  x.vm.setBladeOut(true);
  x.vm.setWeapon(null);
  check('gone from the hand', x.vm.heldWeapon === null);
  x.run(0.5);
  check('both fists up', !x.vm.armed);
  x.vm.setBladeOut(false);
  x.vm.setWeapon(null);
  check('caught', x.vm.heldWeapon === x.blade);
  check('its weight in your hand', x.vm.swordAnim.current === 'guard');
  x.run(0.6);
  check('then ready', x.vm.swordAnim.current === 'ready');
  // Q with it thrown: the swing's begun as it comes back.
  x.vm.setBladeOut(true);
  x.vm.setWeapon(null);
  x.run(0.3);
  x.vm.arc(VERDICT);
  x.vm.setBladeOut(false);
  x.vm.setWeapon(null);
  check('called back for Last Verdict: its swing goes on', x.vm.heldWeapon === x.blade && x.vm.swordAnim.current === 'arc');
  x.run(3);
}

section('The arms: its own punch');
{
  const x = await arms();
  x.vm.setBladeOut(true);
  x.vm.setWeapon(null);
  x.run(1);
  const fistAt = () => {
    x.vm.scene.updateMatrixWorld(true);
    return x.rig.arms.R.knuckle.getWorldPosition(new THREE.Vector3()).applyMatrix4(x.vm.camera.matrixWorldInverse);
  };
  const cuffAt = () => x.rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(x.vm.camera.matrixWorldInverse);
  x.vm.punch('R', 'jab');
  x.run(0.06);
  const fist = fistAt();
  const cuff = cuffAt();
  // Seen from the eye, the fist has to stand clear of the wrist: not straight behind it.
  const apart = Math.hypot(fist.x / -fist.z - cuff.x / -cuff.z, fist.y / -fist.z - cuff.y / -cuff.z);
  check(`the fist stands clear of the vambrace (${apart.toFixed(2)})`, apart > 0.1);
  check(`its wrist at ${Math.round(wrist(x.rig))}°`, wrist(x.rig) < 45);
}

section('The arms: Last Verdict');
{
  const x = await arms();
  check('seven swings', DEMON_ARCS.length === 7 && DEMON_ARCS[THROW].step === THROW && DEMON_ARCS[VERDICT].step === VERDICT);
  const tipOf = () => {
    let top = 0;
    x.blade.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const p = o.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) top = Math.max(top, p.getY(i));
    });
    return top;
  };
  const rest = tipOf();
  x.vm.arc(VERDICT);
  const rise = bladeWindup(VERDICT) - d.verdictStrike;
  let worst = 0;
  let grew = 0;
  for (let t = 0; t < rise; t += 0.02) {
    x.run(0.02);
    x.vm.scene.updateMatrixWorld(true);
    worst = Math.max(worst, wrist(x.rig));
    const now = x.vm.swordAnim.grown;
    check(`it only grows as it rises (${now.toFixed(2)})`, now >= grew - 1e-9);
    grew = now;
  }
  const top = tipOf();
  check(`it’s grown: its tip from ${rest.toFixed(1)} m to ${top.toFixed(1)} m (${d.verdictGrow} times)`, top > rest * 2.5);
  for (let t = 0; t < d.verdictStrike + d.verdictFollow; t += 0.01) {
    x.run(0.01);
    x.vm.scene.updateMatrixWorld(true);
    worst = Math.max(worst, wrist(x.rig));
  }
  check(`its wrist at ${Math.round(worst)}° at most`, worst < 50);
  x.run(d.verdictBack + 0.1);
  check('back to its size', near(tipOf(), rest, 1e-3) && x.vm.swordAnim.grown === 0);
  check('and ready', x.vm.swordAnim.current === 'ready');
}

section('It only grows above the guard (the hilt has to fit the fist)');
{
  const b = await parseUntextured(new URL(`../public${DEMON_BLADE_URL}`, import.meta.url));
  const mesh = (() => {
    let m: THREE.Mesh | null = null;
    b.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) m = o;
    });
    return m!;
  })() as THREE.Mesh;
  const p = mesh.geometry.getAttribute('position');
  const before = Float32Array.from(p.array as ArrayLike<number>);
  const g = new BladeGrow(b.scene);
  g.set(3, 2.4);
  let hilt = true;
  let longer = false;
  for (let i = 0; i < p.count; i++) {
    const y = before[i * 3 + 1];
    if (y <= 0.28 && (p.getX(i) !== before[i * 3] || p.getY(i) !== y || p.getZ(i) !== before[i * 3 + 2])) hilt = false;
    if (y > 2 && p.getY(i) > y * 2) longer = true;
  }
  check('the hilt’s as it was', hilt);
  check('the blade isn’t', longer);
  g.set(1, 1);
  let same = true;
  for (let i = 0; i < p.count * 3; i++) if (Math.abs((p.array as Float32Array)[i] - before[i]) > 1e-6) same = false;
  check('back, exactly as it was', same);
}

section('The view: its sword in the world, the cleave');
{
  const scene = new THREE.Scene();
  const view = new DemonFireView(scene, false);
  const b = await parseUntextured(new URL(`../public${DEMON_BLADE_URL}`, import.meta.url));
  view.thrown.hold(b.scene);
  const r = room([]);
  view.update(r.c, DT);
  view.update(r.c, DT);
  view.update(r.c, DT);
  check('in your hand: not in the world', !view.thrown.shown);
  thrown(r);
  r.step({}, 0.2);
  view.update(r.c, DT);
  check('thrown: there it is', view.thrown.shown && view.thrown.where.distanceTo(r.c.blade.flying.pos) < 1e-6);
  const a = view.thrown.pointing.clone();
  view.update(r.c, 0.03);
  check('spinning', a.angleTo(view.thrown.pointing) > 0.2);
  const w = new FlatWorld();
  w.walls.push({ x: 6, normalX: -1 });
  const s = room([], true, w);
  s.step({ interactPressed: true, yaw: -Math.PI / 2 });
  s.step({ yaw: -Math.PI / 2 }, bladeWindup(THROW) + DT);
  s.step({ yaw: -Math.PI / 2 }, 0.5);
  view.update(s.c, DT);
  const p1 = view.thrown.pointing.clone();
  view.update(s.c, 0.05);
  check('stuck: still', p1.angleTo(view.thrown.pointing) < 1e-6);
  check('its point in', view.thrown.pointing.distanceTo(new THREE.Vector3(1, 0, 0)) < 0.05);
  const l = room([]);
  l.c.blade.heat = 1;
  l.step({ throwPressed: true });
  l.step({}, 0.3);
  view.update(l.c, DT);
  check('rising: its line on the floor', view.verdict.lined && !view.verdict.flashing);
  l.step({}, d.verdictWindup);
  view.update(l.c, DT);
  check('landed: the sheet, no line', view.verdict.flashing && !view.verdict.lined);
  l.step({}, d.verdictHold + 0.5);
  view.update(l.c, DT);
  check('gone', !view.verdict.flashing && !view.verdict.lined);
  view.dispose();
}

section('Joseph keeps his own');
{
  const r = room([{ x: 0, z: -2 }], false);
  r.c.execution = 0;
  r.step({ attackPressed: true });
  check('his dash stays his', near(DASH.v.speed * DASH.v.duration, 5.6, 0.01));
  check('no heat, no fallen', r.c.blade.heat === 0 && r.c.blade.fallen === 0);
}
