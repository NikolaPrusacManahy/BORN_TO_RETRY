// Update 0.2.5 — the designer's fixes after playing 0.2.4: the Pistol's bullet streaks stayed in the air for good; the
// hand sat low on its grip; Tribals on a high spot "just run on the spot and remain stuck"; Cactoros "stay up too
// little"; "a golden aura chest and … no keys in the room".
import * as THREE from 'three';
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { GunView } from '../src/engine/gunView';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { takeKeys } from '../src/sim/dungeon/reward';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { dropItem } from '../src/sim/items/drops';
import { createPlayer } from '../src/sim/player/state';
import { FOES4 } from '../src/tuning/foes4';
import { Arena, boxAt } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';

const v = FOES4.v;
const ROOM: Arena = {
  name: 'desert',
  boxes: [boxAt(-25, -1, -25, 50, 1, 50, 'floor'), boxAt(-25, 0, -26, 50, 8, 1, 'wall'), boxAt(-25, 0, 25, 50, 8, 1, 'wall'), boxAt(-26, 0, -25, 1, 8, 50, 'wall'), boxAt(25, 0, -25, 1, 8, 50, 'wall')],
  pads: [],
  playerStart: { x: 0, y: 0, z: 0, yaw: 0 },
  spawns: [],
  dummies: [],
  turrets: [],
};
const world = new FlatWorld();

/** A Tribal on a perch `high` m up at `at`, you at `you`. */
function perched(at: Vector3, high: number, you: Vector3) {
  const c = createCombat(ROOM);
  c.rng = createRng(5);
  const p = createPlayer(you.x, 0, you.z, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, 'tribal', new Vector3(at.x, high, at.z), 0);
  const e = c.enemies[slot];
  e.perch = high;
  e.cooldown = 0;
  return { c, p, e };
}
function run(f: ReturnType<typeof perched>, secs: number, intent: Partial<CombatIntent> = {}) {
  const seen: string[] = [];
  for (let i = 0; i < ticks(secs); i++) {
    stepCombat(f.c, f.p, { ...emptyCombatIntent(), ...intent }, world, DT);
    for (let k = 0; k < f.c.events.length; k++) seen.push(f.c.events.at(k).kind);
    f.c.events.clear();
  }
  return seen;
}

section('Tribal on a perch — it throws from far, or comes down to find you');
{
  const far = perched(new Vector3(0, 0, -20), 2.5, new Vector3(0, 0, 10));
  const seen = run(far, 1);
  check(`from a perch 30 m off it throws (Tribal perch range ${v.tribalPerchFar} m; the ground's ${v.tribalFar + 4})`, seen.includes('tribalThrow') && far.e.perch > 0);
  const out = perched(new Vector3(0, 0, -22), 2.5, new Vector3(0, 0, 22));
  let jumped = -1;
  let landed = -1;
  for (let i = 0; i < ticks(v.tribalPerchWait + 2) && landed < 0; i++) {
    const s = run(out, DT);
    if (jumped < 0 && s.includes('tribalJump')) jumped = i * DT;
    if (s.includes('tribalLand')) landed = i * DT;
  }
  check(`you out of its reach: after Tribal perch patience (${v.tribalPerchWait} s) it jumps down…`, jumped >= v.tribalPerchWait - DT && jumped < v.tribalPerchWait + 0.1, `${jumped.toFixed(2)} s`);
  check('…lands on the floor, out towards you, off its perch for good', landed > jumped && out.e.perch === 0 && out.e.pos.y === 0 && out.e.pos.z > -22);
  const z = out.e.pos.z;
  run(out, 1.5);
  check('and comes on to where it can throw, as one on the ground does', out.e.pos.z > z + 3);
  const near = perched(new Vector3(0, 0, -10), 2.5, new Vector3(0, 0, 5));
  check('in its sight and reach it stays up there', !run(near, v.tribalPerchWait + 1).includes('tribalJump') && near.e.perch > 0);
}

section('Cactoro — up long enough to hit');
{
  check('it stays up 0.8 s longer (the designer): 2.6 s', Math.abs(v.cactoroUp - 2.6) < 1e-9);
}

section('Keys — a won room’s keys are yours');
{
  const level = buildDungeon(planFloor(4242, FLOOR.desert));
  const i = level.rooms.findIndex((r) => r.kind === 'fight' && !r.challenge && r.chest >= 0 && !r.challenge);
  const room = level.rooms[i];
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  stepRooms(run, p, c, createRng(1), DT);
  // A key lying where the chest will rise (out of your reach), and one owed by a mini boss that never dropped it.
  const chest = level.chests[room.chest];
  dropItem(c.drops, 'key', new Vector3(chest.x, 0, chest.z), c.events);
  c.keyDrops = 1;
  const before = c.items.keys;
  for (const e of c.enemies) e.alive = false;
  run.rooms[i].sent = run.rooms[i].total;
  for (let k = 0; k < ticks(0.2) && run.rooms[i].state !== 'cleared'; k++) stepRooms(run, p, c, createRng(1), DT);
  check('won: the key lying in it (under the chest) and the one owed are yours', run.rooms[i].state === 'cleared' && c.items.keys === before + 2 && c.keyDrops === 0 && !c.drops.some((d) => d.alive && d.kind === 'key'), `${c.items.keys - before} keys`);
  check('(takeKeys is the challenge room’s own: the same rule everywhere)', typeof takeKeys === 'function');
}
{
  const c = createCombat(ROOM);
  dropItem(c.drops, 'key', new Vector3(1, 0, 1), c.events);
  for (let k = 0; k < c.drops.length + 3; k++) dropItem(c.drops, 'snowflake', new Vector3(k, 0, 0), c.events);
  check('every drop slot in use: a new one never takes a key’s place', c.drops.some((d) => d.alive && d.kind === 'key'));
  const e = spawnEnemy(c.enemies, 'skullOrc', new Vector3(3, 2.5, 3), 0);
  c.enemies[e].perch = 2.5;
  c.keyDrops = 1;
  const hit = emptyTargetHit();
  hit.kind = 'enemy';
  hit.index = e;
  hit.point.copy(c.enemies[e].pos);
  for (const d of c.drops) d.alive = false;
  // (From behind it: its guard turns blows from in front.)
  landHit(c, hit, 1e6, 0, 0, -1, 'hitJab', 1);
  const key = c.drops.find((d) => d.alive && /key/i.test(d.kind));
  check('a mini boss killed up on something drops its key on top of it, not inside it', !!key && key.pos.y === 2.5);
}

section('Pistol — its streaks go');
{
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 500);
  const view = new GunView(scene, new Viewmodel(false), camera);
  const c = createCombat(ROOM);
  c.events.push('gunShot', 7, 0, 1.6, 0);
  c.events.push('gunTrace', 0, 0, 1.6, -30);
  view.update(c, 1 / 60);
  c.events.clear();
  const streaks = () => scene.children.filter((o) => o instanceof THREE.Mesh && o.visible && (o.geometry as THREE.BufferGeometry).type === 'CylinderGeometry').length;
  const at = streaks();
  for (let i = 0; i < 30; i++) view.update(c, 1 / 60);
  check('a bullet’s streak races to where it ended and is gone (it stayed for good)', at === 1 && streaks() === 0);
}
