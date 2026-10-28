// Update 0.0.15 — the boss room's show as drawn (the designer: the view leaves your eyes, the walls slide back, the
// boss rises out of a portal beside its name, the view glides back; killed, it hangs and bursts; a wooden gate onto
// the dark). The Demon's model has every clip the game plays and is drawn at its size; the view's path starts and
// ends in your eyes (facing the boss), stays in the room and never jumps, and frames the boss left of the middle for
// its name; the sliding walls fill the room's edges at first and are gone at the end; the wooden gate swings out, into
// the dark; the run is held still during the show, slowed as the boss dies, and goes down once the dark is black.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { parseUntextured } from './fakes/glb';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { BossShow } from '../src/engine/boss/bossShow';
import { Cinema, Shot } from '../src/engine/boss/cinema';
import { DEMON_CLIPS, DemonView } from '../src/engine/boss/demonView';
import { Shell } from '../src/engine/boss/shell';
import { WoodGate } from '../src/engine/boss/woodGate';
import { Look } from '../src/engine/look';
import { createCombat } from '../src/sim/combat/state';
import { introBeats } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { hitEnemy, spawnEnemy } from '../src/sim/enemies/enemy';
import { doomTime } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { BOSS } from '../src/tuning/boss';
import { CINEMA } from '../src/tuning/cinema';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

section('Boss show — the Demon drawn');
{
  const gltf = await parseUntextured(new URL('../public/models/enemies/demon.glb', import.meta.url));
  const names = gltf.animations.map((a) => a.name.split('|').pop());
  const missing = Object.values(DEMON_CLIPS).filter((c) => !names.includes(c));
  check('demon.glb has every clip it plays', missing.length === 0, missing.join(', '));
  const scene = new THREE.Scene();
  const view = new DemonView(scene, false);
  view.attach(gltf.scene, gltf.animations);
  const combat = createCombat({ name: 'x', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] }, false);
  spawnEnemy(combat.enemies, 'demon', new THREE.Vector3(0, 0, -10), 0);
  view.update(combat, new THREE.Vector3(0, 1.6, 0), 1, DT);
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) {
      o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));
    }
  });
  check(`drawn ${BOSS.v.demonHeight} m tall, feet on the floor`, near(box.max.y - box.min.y, BOSS.v.demonHeight, 0.6) && near(box.min.y, 0, 0.3), `${(box.max.y - box.min.y).toFixed(2)} m, feet at ${box.min.y.toFixed(2)}`);
  // (Update 0.0.18 — the aura is a group of its own inside the view: aura.ts.)
  let lit = false;
  view.group.traverse((o) => (lit ||= o instanceof THREE.PointLight && o.intensity > 0));
  check('with its aura round it', view.group.visible && lit);
  const e = combat.enemies[0];
  hitEnemy(e, 1e6, 0, 0, 1);
  const w = { ...combat };
  for (let i = 0; i < ticks(doomTime() + 0.05); i++) updateEnemies(combat.enemies, createPlayer(0, 0, 0, 0), w, OPEN_WORLD, DT);
  view.update(combat, new THREE.Vector3(0, 1.6, 0), 1, DT);
  check('gone once its body has burst', !view.group.visible);
  view.dispose();
}

section('Boss show — the view');
{
  const level = buildDungeon(planFloor(4242, 1));
  const b = level.boss;
  const room = level.rooms[b.room];
  const cin = new Cinema(b);
  const [ex, ez] = b.entrance === 'n' ? [0, -1] : b.entrance === 's' ? [0, 1] : b.entrance === 'w' ? [-1, 0] : [1, 0];
  const half = (room.max.x - room.min.x) / 2;
  const eye = new THREE.Vector3((room.min.x + room.max.x) / 2 + ex * (half - 3), 1.6, (room.min.z + room.max.z) / 2 + ez * (half - 3));
  const dir = new THREE.Vector3(-ex, 0, -ez);
  cin.start(eye, dir);
  const s = introBeats();
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  cin.intro(0, shot);
  check('it starts in your eyes', shot.pos.distanceTo(eye) < 1e-6);
  let inside = true;
  let jump = 0;
  const last = new THREE.Vector3().copy(shot.pos);
  for (let t = 0; t <= s.end; t += 1 / 60) {
    cin.intro(t, shot);
    inside &&= shot.pos.x > room.min.x && shot.pos.x < room.max.x && shot.pos.z > room.min.z && shot.pos.z < room.max.z && shot.pos.y > 0.5 && shot.pos.y < CINEMA.v.height + 5;
    jump = Math.max(jump, shot.pos.distanceTo(last));
    last.copy(shot.pos);
  }
  check('it stays in the room (over it, never in the floor)', inside);
  check(`and glides: never more than ${(jump * 60).toFixed(0)} m/s`, jump * 60 < 40);
  cin.intro(s.end, shot);
  const facing = new THREE.Vector3().subVectors(shot.look, shot.pos).normalize();
  const toBoss = new THREE.Vector3(b.portal.x - eye.x, 0, b.portal.z - eye.z).normalize();
  check('it ends in your eyes, facing the boss', shot.pos.distanceTo(eye) < 1e-6 && facing.x * toBoss.x + facing.z * toBoss.z > 0.9 && near(Math.atan2(-toBoss.x, -toBoss.z), cin.endYaw, 1e-6));
  // The stance: the boss is in the shot, left of the middle (its name goes to its right).
  cin.intro((s.riseTo + s.stanceTo) / 2, shot);
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 400);
  cam.position.copy(shot.pos);
  cam.lookAt(shot.look);
  cam.updateMatrixWorld(true);
  const chest = new THREE.Vector3(b.portal.x, BOSS.v.demonHeight * 0.55, b.portal.z).project(cam);
  check('at its stance the boss stands left of the middle, in the shot', chest.x < -0.05 && chest.x > -0.8 && Math.abs(chest.y) < 0.8 && chest.z < 1, `${chest.x.toFixed(2)}, ${chest.y.toFixed(2)}`);
  // The gate shot looks at the gate, then hands the view back.
  const g = b.gateAt;
  check('the gate shot looks at the gate', cin.gateShot(CINEMA.v.gateShotTime / 2, eye, dir, shot) && new THREE.Vector3().subVectors(shot.look, shot.pos).normalize().dot(new THREE.Vector3(g.x - shot.pos.x, 2 - shot.pos.y, g.z - shot.pos.z).normalize()) > 0.95);
  check('and is over after its time', !cin.gateShot(CINEMA.v.gateShotTime + 0.01, eye, dir, shot));
}

section('Boss show — the walls and the gate');
{
  const level = buildDungeon(planFloor(4242, 1));
  const b = level.boss;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const shell = new Shell(b.start, b.end, new THREE.MeshBasicMaterial(), box);
  const cores = shell.group.children[0] as THREE.InstancedMesh;
  const m = new THREE.Matrix4();
  const solid = (x: number, z: number) => {
    for (let i = 0; i < cores.count; i++) {
      cores.getMatrixAt(i, m);
      const p = new THREE.Vector3();
      const sc = new THREE.Vector3();
      m.decompose(p, new THREE.Quaternion(), sc);
      if (sc.x > 0 && Math.abs(x - p.x) <= sc.x / 2 && Math.abs(z - p.z) <= sc.z / 2) return true;
    }
    return false;
  };
  // Before the show: every spot of the room outside the small room is solid wall.
  let holes = 0;
  let blocked = 0;
  for (let x = b.end.min.x + 0.5; x < b.end.max.x; x += 2) {
    for (let z = b.end.min.z + 0.5; z < b.end.max.z; z += 2) {
      const inStart = x > b.start.min.x && x < b.start.max.x && z > b.start.min.z && z < b.start.max.z;
      const edge = x > b.start.min.x - 0.5 && x < b.start.max.x + 0.5 && z > b.start.min.z - 0.5 && z < b.start.max.z + 0.5;
      if (!inStart && !edge && !solid(x, z)) holes++;
      if (inStart && solid(x, z)) blocked++;
    }
  }
  check('before the show the room’s edges are solid wall, the small room clear', holes === 0 && blocked === 0, `${holes} holes, ${blocked} blocked`);
  shell.set(0.5);
  check('half way, the walls have slid half way back', shell.group.visible);
  shell.set(1);
  check('slid all the way back, they are gone', !shell.group.visible);

  const scene = new THREE.Scene();
  const gate = new WoodGate(scene, b, 'FLOOR 2');
  const g = b.gateAt;
  const edge = (door: number) => {
    const p = new THREE.Vector3();
    gate.group.updateMatrixWorld(true);
    const d = gate.group.children.filter((o) => o instanceof THREE.Group)[door] as THREE.Group;
    // Its free edge: the plank furthest from its hinge.
    d.children[d.children.length - 4].getWorldPosition(p);
    return p;
  };
  gate.update(0);
  const shut = [edge(0), edge(1)];
  gate.update(1);
  const open = [edge(0), edge(1)];
  const out = (a: THREE.Vector3, z: THREE.Vector3) => (z.x - a.x) * g.ox + (z.z - a.z) * g.oz;
  check('the wooden gate swings open outward, into the dark', out(shut[0], open[0]) > 0.5 && out(shut[1], open[1]) > 0.5);
  const black = scene.children.find((o) => o instanceof THREE.Mesh && (o.material as THREE.MeshBasicMaterial).color?.getHex() === 0) as THREE.Mesh;
  const dk = b.dark;
  check('behind it, the dark: pure black, unlit, filling the dead end', !!black && (black.material as THREE.MeshBasicMaterial).fog === false && near(black.position.x, (Math.min(dk.min.x, g.x) + Math.max(dk.max.x, g.x)) / 2, 1.2));
  gate.dispose();
}

section('Boss show — the run');
{
  const level = buildDungeon(planFloor(4242, 1));
  const run = createDungeonRun(level);
  const show = new BossShow(run);
  const combat = createCombat(level.arena, false);
  const room = level.rooms[level.boss.room];
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  const cam = new THREE.PerspectiveCamera();
  cam.position.set(p.pos.x, 1.6, p.pos.z);
  const look = new Look();
  const rng = createRng(1);
  const step = (secs: number) => {
    for (let i = 0; i < ticks(secs); i++) {
      stepRooms(run, p, combat, rng, DT);
      combat.events.clear();
      show.update(DT, cam, look, combat);
    }
  };
  step(DT);
  check('the show holds you still and takes the view', show.locked && show.hud.cine);
  step(introBeats().end + 0.05);
  check('then lets go, the boss’s bar showing', !show.locked && !show.hud.cine && show.hud.bossHp === 1);
  hitEnemy(combat.enemies[run.boss.slot], 1e6, 0, 0, 1);
  step(DT);
  check(`its death slows the world (to ${CINEMA.v.slow}×), easing back`, show.timeScale < 0.5);
  step(CINEMA.v.slowTime + 0.05);
  check('then full speed', show.timeScale === 1);
  // Regression (the designer, 0.0.15: the screen froze after the boss died and the gate shot never came): through the
  // burst to the gate, then the whole gate shot, as the run steps it.
  let shotAt = -1;
  let moved = 0;
  for (let i = 0; i < ticks(doomTime() + CINEMA.v.gateDelay + 1) && shotAt < 0; i++) {
    stepRooms(run, p, combat, rng, DT);
    updateEnemies(combat.enemies, p, combat, OPEN_WORLD, DT);
    combat.events.clear();
    if (show.update(DT, cam, look, combat).cinematic) shotAt = i;
  }
  check('the boss bursts and the view turns to the gate', run.boss.beat === 'open' && shotAt >= 0 && show.locked);
  const eye = new THREE.Vector3(p.pos.x, 1.6, p.pos.z);
  for (let i = 0; i < ticks(CINEMA.v.gateShotTime / 2); i++) {
    cam.position.copy(eye);
    stepRooms(run, p, combat, rng, DT);
    show.update(DT, cam, look, combat);
    moved = Math.max(moved, cam.position.distanceTo(eye));
  }
  check('the view goes to the gate (it leaves your eyes)', moved > 3, `${moved.toFixed(1)} m`);
  for (let i = 0; i < ticks(CINEMA.v.gateShotTime / 2 + 0.1); i++) {
    cam.position.copy(eye);
    stepRooms(run, p, combat, rng, DT);
    show.update(DT, cam, look, combat);
  }
  check('then gives it back: you move and look again', !show.locked && !show.hud.cine);
  run.exited = true;
  step(DT);
  check('the dark: black, still', show.hud.veil && show.locked);
  let down = false;
  for (let i = 0; i < ticks(CINEMA.v.floorFade + 0.05) && !down; i++) down = show.update(DT, cam, look, combat).descend;
  check('once black, down to the next floor', down);
  show.arrive(2);
  check('whose name shows', show.hud.floorName === 'FLOOR 2');
}
