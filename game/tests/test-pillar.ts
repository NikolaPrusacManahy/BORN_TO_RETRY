// Update 0.3.9 (the designer: "when the humanoid monster is pinned there [a pillar], another animation is played: right
// jab, left jab, right heavy hit punch and the enemy go through the pillar and it breaks the pillar and it send the
// monster flying until it reaches a wall and explode there … simply break in half and the upper part fly and rest fixed
// once landed … Not just that kind of pillar") — a body pinned to a pillar gets the pillar finisher: three blows, the
// pillar broken, the body bursting at the wall beyond (its blood on it), +5 HP; on the stump left, the wall finisher.
// Every column of a dungeon floor is a pillar. The break: the kit's column cut cleanly in two at half its height, the
// upper half landing the way it fell (or across, near a wall) and staying. Update 0.3.10 (the designer: "fix collision
// with pillar") — broken, its box is the stump's and its fallen top has one where it lies (enemies walk round it); a
// body pinned to a pillar hangs against its stone; the stone columns' boxes are as wide as their stone.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { parseUntextured } from './fakes/glb';
import { PillarBreaks, splitAt } from '../src/engine/pillarBreak';
import { emptyCombatIntent, type Punch } from '../src/sim/combat/fists';
import { execTarget } from '../src/sim/combat/execution';
import { PILLARED } from '../src/sim/combat/execPin';
import { breakPillar, PILLAR_CUT, STONE } from '../src/sim/combat/pillars';
import { freeAt } from '../src/world/navGrid';
import { initPhysics, RapierWorld } from '../src/physics/rapierWorld';
import { resolvePunch } from '../src/sim/combat/punch';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer, type PlayerState } from '../src/sim/player/state';
import { FISTS } from '../src/tuning/combat';
import { EXECUTION } from '../src/tuning/execution';
import { type Arena, boxAt } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const world = new FlatWorld();
/** A pillar (2 m, 4.9 high) whose face is 3 m ahead, and a wall 12 m ahead, on a floor. */
const ROOM: Arena = { ...OPEN_ARENA, boxes: [boxAt(-1, 0, -5, 2, 4.9, 2, 'block'), boxAt(-10, 0, -13, 20, 6, 1, 'wall'), boxAt(-10, -1, -14, 20, 1, 17, 'floor')], pillars: [{ x: 0, z: -4, half: 1, h: 4.9, box: 0 }] };
const JAB: Punch = { kind: 'jab', damage: FISTS.v.jabDamage, knock: FISTS.v.jabKnock, charge: 0, reach: 2.9, radius: 0.6 };

interface Fight {
  c: CombatState;
  p: PlayerState;
  seen: string[];
}

function run(f: Fight, secs: number, interact = false) {
  for (let k = 0; k < ticks(secs); k++) {
    const intent = emptyCombatIntent();
    intent.interactPressed = interact && k === 0;
    stepCombat(f.c, f.p, intent, world, DT);
    for (let j = 0; j < f.c.events.length; j++) f.seen.push(f.c.events.at(j).kind);
    f.c.events.clear();
  }
}

/** A Grunt 1.5 m ahead killed by a jab and flung at the pillar (`c`: a fight to add it to). */
function fling(c = createCombat(ROOM)): Fight & { i: number } {
  const p = createPlayer(0, 0, 0, 0);
  const i = spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(0, 0, -1.5), 0);
  c.enemies[i].phase = 'chase';
  c.enemies[i].hp = 1;
  resolvePunch(JAB, c, new THREE.Vector3(0, 1.62, 0), new THREE.Vector3(0, 0, -1), world);
  const f = { c, p, i, seen: [] as string[] };
  run(f, 1);
  return f;
}

section('Pillar finisher — through the pillar');
{
  const f = fling();
  const e = f.c.enemies[f.i];
  check('a Grunt flung dead into a pillar is pinned to it, against its stone', e.pinned > 0 && near(e.pos.z, -4 + STONE + 0.45, 0.1) && near(e.wall.z, -4 + STONE, 0.05), `at ${e.pos.z.toFixed(2)}`);
  f.p.pos.set(0, 0, -1);
  f.p.hp = 50;
  f.seen.length = 0;
  check('it can be executed, free', execTarget(f.c, f.p, 0) === f.i);
  run(f, 0.1, true);
  const ex = f.c.exec;
  check('E: the pillar finisher', ex.active && ex.pinned && ex.pillar === 0);
  run(f, PILLARED.endAt + 1.2);
  check('a right jab, a left, a heavy', f.seen.filter((k) => k === 'execBlow').length === 3);
  const pillar = f.c.pillars[0];
  check('the heavy breaks the pillar, its top to fall the way it was punched, with room before the wall', f.seen.includes('pillarBreak') && pillar.broken && near(pillar.yaw, 0, 0.05) && pillar.room > 5, `room ${pillar.room.toFixed(1)} m`);
  check('the body flies on to the wall beyond and bursts there, its blood on the wall', f.seen.includes('execBurst') && f.seen.includes('wallSplat') && near(ex.land.z, -11.5, 0.6) && !ex.active, `landed at ${ex.land.z.toFixed(2)}`);
  check(`it heals ${EXECUTION.v.pinHeal}`, f.p.hp === 50 + EXECUTION.v.pinHeal);
  const cut = pillar.h * PILLAR_CUT;
  const box = pillar.stump;
  check('its stump’s box is as high as the break (the floor’s own box left as it was)', !!box && near(box.h, cut, 1e-9) && near(box.y + box.h / 2, cut, 1e-9) && pillar.box?.h === 4.9);
  const top = pillar.top;
  check('its upper half has a box where it lies, along the way it fell', !!top && top.y === STONE && top.z < -4 - STONE && near(top.d, pillar.h - cut, 1e-6) && near(top.w, 2 * STONE, 1e-6));
  check('enemies walk round it', !!top && !freeAt(f.c.nav.small, top.x, top.z) && !freeAt(f.c.nav.large, top.x, top.z));
  // Another flung onto the stump: the wall finisher.
  const g = fling(f.c);
  g.p.pos.set(0, 0, -1);
  run(g, 0.1, true);
  check('one pinned to the broken stump gets the wall finisher', g.c.exec.active && g.c.exec.pinned && g.c.exec.pillar === -1);
}

section('Pillar finisher — every column a pillar');
{
  const level = buildDungeon(planFloor(77, 1));
  const pillars = level.arena.pillars ?? [];
  check('a dungeon floor’s columns are its pillars, each its own box', pillars.length > 0 && pillars.every((p) => p.half === 1 && p.h === 4.9 && level.arena.boxes[p.box].w === 2), `${pillars.length} pillars`);
  const stone = buildDungeon(planFloor(77, 3)).arena;
  const stones = stone.pillars ?? [];
  check('floor 3’s stacked stone columns: boxes as wide as their stone (the Throne Hall’s with its skulls)', stones.length > 0 && stones.every((p) => (p.half === 0.55 || p.half === 0.85) && stone.boxes[p.box].w === 2 * p.half), `${[...new Set(stones.map((p) => p.half))].join(', ')}`);
}

section('Pillar finisher — the break');
{
  const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  kit.scene.updateMatrixWorld(true);
  const root = kit.scene.getObjectByName('kit_p2_Column');
  let src: THREE.Mesh | null = null;
  root?.traverse((o) => {
    if (!src && o instanceof THREE.Mesh) src = o;
  });
  check('the kit’s column', !!src);
  if (src) {
    const mesh = src as THREE.Mesh;
    const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, 1);
    inst.setMatrixAt(0, new THREE.Matrix4().makeTranslation(4, 0, 6).multiply(root!.matrixWorld.clone().invert().multiply(mesh.matrixWorld)));
    // (Broken by the rules: where its top lies.)
    const fight = createCombat({ ...OPEN_ARENA, pillars: [{ x: 4, z: 6, half: 1, h: 4.9, box: -1 }] });
    breakPillar(fight, 0, 0, 8);
    const p = fight.pillars[0];
    const cut = p.h * PILLAR_CUT;
    const m = new THREE.Matrix4();
    inst.getMatrixAt(0, m);
    const whole = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(m);
    const [low, high, reach] = splitAt(whole, cut, p.x, p.z);
    const box = (g: THREE.BufferGeometry | null) => (g ? (g.computeBoundingBox(), g.boundingBox!) : null);
    const lb = box(low);
    const hb = box(high);
    check('cut in two at half its height: nothing of the lower half above it, nothing of the upper below', !!lb && !!hb && lb.max.y <= cut + 1e-4 && hb.min.y >= cut - 1e-4, `${lb?.max.y.toFixed(3)} / ${hb?.min.y.toFixed(3)}`);
    check('as wide where it’s cut as the stone is there', reach > 0.2 && reach < 1, `${reach.toFixed(2)} m`);
    const breaks = new PillarBreaks();
    breaks.add(0, inst, 0);
    breaks.break(0, p);
    inst.getMatrixAt(0, m);
    check('the column’s instance hidden, a stump and a top in its place', m.elements[0] === 0 && breaks.group.children.length === 2);
    const top = breaks.group.children[1];
    for (let k = 0; k < ticks(1.2); k++) breaks.update(DT);
    const along = new THREE.Vector3(0, 1, 0).applyQuaternion(top.quaternion);
    // (Its pivot is the break: it lies on from there, clear of the stump.)
    check('the top flies off the way it fell and lies where the rules have it, fixed', !breaks.busy && near(along.z, -1, 0.02) && near(top.position.x, p.lie.x, 1e-6) && near(top.position.z, p.lie.z, 1e-6) && near(top.position.y, reach, 0.05), `at ${top.position.toArray().map((n) => n.toFixed(2))}`);
    const across = new PillarBreaks();
    const inst2 = new THREE.InstancedMesh(mesh.geometry, mesh.material, 1);
    inst2.setMatrixAt(0, m.identity());
    across.add(0, inst2, 0);
    const near2 = createCombat({ ...OPEN_ARENA, pillars: [{ x: 0, z: 0, half: 1, h: 4.9, box: -1 }] });
    breakPillar(near2, 0, 0, 1);
    across.break(0, near2.pillars[0]);
    for (let k = 0; k < ticks(1.2); k++) across.update(DT);
    const way = new THREE.Vector3(0, 1, 0).applyQuaternion(across.group.children[1].quaternion);
    check('with a wall close behind, it lies across', near(Math.abs(way.x), 1, 0.02));
  }
}

section('Pillar finisher — your collision');
{
  await initPhysics();
  const arena: Arena = { ...ROOM, boxes: ROOM.boxes.map((b) => ({ ...b })) };
  const physics = new RapierWorld(arena);
  // (Its queries see the colliders once it has stepped, as the game's does every frame.)
  physics.world.step();
  const fight = createCombat(arena);
  const ahead = new THREE.Vector3(0, 0, -1);
  const high = new THREE.Vector3(0, 2.5, 0);
  const low = new THREE.Vector3(0, 0.6, 0);
  check('whole, it stops you at its side, high up too', near(physics.rayDistance(high, ahead, 20), 3, 0.01), `${physics.rayDistance(high, ahead, 20).toFixed(2)} m`);
  breakPillar(fight, 0, 0, 8);
  const p = fight.pillars[0];
  physics.swap(p.box!, [p.stump!, p.top!]);
  check('broken: above the stump the way is clear to the wall', near(physics.rayDistance(high, ahead, 20), 12, 0.01), `${physics.rayDistance(high, ahead, 20).toFixed(2)} m`);
  check('the stump still stops you low down', near(physics.rayDistance(low, ahead, 20), 3, 0.01));
  const side = new THREE.Vector3(3, 0.6, p.top!.z);
  check('and you bump into its fallen top', physics.rayDistance(side, new THREE.Vector3(-1, 0, 0), 10) < 3 - STONE + 0.01, `${physics.rayDistance(side, new THREE.Vector3(-1, 0, 0), 10).toFixed(2)} m`);
  physics.dispose();
}
