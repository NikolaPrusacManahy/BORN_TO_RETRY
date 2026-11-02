// Update 0.1.2 — an execution played and drawn as the game does it each frame, without a browser: the rules
// (stepCombat), the enemies drawn (EnemiesView with the real model), the execution's scene (body, pieces, tongue), the
// camera turned where you look, your hands (followHeld) and the arms posed (Viewmodel with the real arms). For tests and
// tools/exec-shots.ts.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { parseUntextured } from './glb';
import { DT, FlatWorld } from './flatWorld';
import { OPEN_ARENA } from './enemyWorld';
import { EnemiesView } from '../../src/engine/enemiesView';
import { ExecScene } from '../../src/engine/exec/execScene';
import { followHeld } from '../../src/engine/execView';
import { Look } from '../../src/engine/look';
import { ArmsRig } from '../../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../../src/engine/viewmodel/viewmodel';
import { emptyCombatIntent } from '../../src/sim/combat/fists';
import { createCombat } from '../../src/sim/combat/state';
import { stepCombat } from '../../src/sim/combat/step';
import { spawnEnemy } from '../../src/sim/enemies/enemy';
import { EnemyKind, RADIUS } from '../../src/sim/enemies/kinds';
import { createPlayer } from '../../src/sim/player/state';
import { verticalFov } from '../../src/state/settings';
import { CAMERA } from '../../src/tuning/camera';
import { type Arena, boxAt } from '../../src/world/arena';

export const ASPECT = 16 / 9;
export const MODEL: Record<string, string> = { grunt: 'orc', spitter: 'wizard', brute: 'yeti', leaper: 'ninja', stinger: 'armabee', wraith: 'ghost', slime: 'slime', frog: 'frog', snake: 'snake', wasp: 'wasp', spider: 'spider', blueDemon: 'bluedemon', skeleton: 'skeleton', mushnub: 'mushnub', ninja: 'ninja', tribal: 'tribal', cactoro: 'cactoro', cactoroBig: 'cactoro_big', hywirl: 'hywirl', dinoBlob: 'dino', lizard: 'lizard', greenBlob: 'green_blob', blobling: 'green_blob', maskTribal: 'tribal_mask', skullOrc: 'skull_orc', dragonling: 'dragonling', skullWraith: 'skull_wraith', rabbit: 'rabbit', bigMushnub: 'mushroom_king', snapper: 'snapper', urchin: 'urchin', jelly: 'jelly', glub: 'glub', bigGlub: 'big_glub', squidle: 'squidle', spawnling: 'spawnling', deepOne: 'deep_one', bogBrute: 'bog_brute', clownfish: 'clownfish', tuna: 'tuna', angelfish: 'angelfish', dolphin: 'dolphin', drownedPrince: 'drowned_king', mantaRay: 'manta_ray', shark: 'shark' };
/** Fliers are met where they swoop to, a little above you. */
const UP: Partial<Record<EnemyKind, number>> = { stinger: 1.2, wraith: 1.2, wasp: 1.2 };

export async function armsModel() {
  const b = readFileSync(new URL('../../public/models/arms/adventurer.glb', import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

/** `kind` in front of you (its edge 1.4 m off), the meter full, ready to press E. Update 0.3.8 — `pinned`: its body
 *  pinned (as to a wall behind it), facing you, the meter empty: E is the wall finisher. Update 0.3.9 — 'pillar': pinned
 *  to a pillar behind it (a wall far beyond): the pillar finisher. */
export async function execRig(kind: EnemyKind, arena: Arena = OPEN_ARENA, pinned: boolean | 'pillar' = false) {
  if (pinned === 'pillar') arena = pillarArena(1.4 + 2 * RADIUS[kind]);
  const arms = await armsModel();
  const rig = ArmsRig.fromScene(arms.scene);
  const vm = new Viewmodel(false);
  vm.attach(rig);
  vm.setLens(ASPECT);
  const enemy = await parseUntextured(new URL(`../../public/models/enemies/${MODEL[kind]}.glb`, import.meta.url));
  const scene = new THREE.Scene();
  const view = new EnemiesView(scene as unknown as THREE.Scene, false);
  view.attach(kind, enemy.scene, enemy.animations);
  const exec = new ExecScene(scene);
  const c = createCombat(arena);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  c.execution = 1;
  const s = spawnEnemy(c.enemies, kind, new THREE.Vector3(0, UP[kind] ?? 0, -(1.4 + RADIUS[kind])), 0);
  if (pinned) {
    const e = c.enemies[s];
    e.phase = 'dead';
    e.hp = 0;
    e.pinned = 3;
    e.pos.y = 0.3;
    e.facing = Math.PI;
    e.wall.set(0, 1, e.pos.z - RADIUS[kind]);
    c.execution = 0;
  }
  const look = new Look();
  const cam = new THREE.PerspectiveCamera(verticalFov(100, ASPECT), ASPECT, 0.05, 100);
  const world = new FlatWorld();
  let pressed = false;
  /** Every combat event so far (kind:value). */
  const seen: string[] = [];
  /** One frame of `dt` (a sim tick): E pressed on the first. */
  const step = (dt = DT) => {
    const intent = emptyCombatIntent();
    intent.interactPressed = !pressed;
    pressed = true;
    stepCombat(c, p, intent, world, dt);
    for (let e = 0; e < c.events.length; e++) seen.push(`${c.events.at(e).kind}:${c.events.at(e).value}`);
    c.events.clear();
    c.hitStop.remaining = 0;
    cam.position.set(p.pos.x, p.pos.y + CAMERA.v.eyeHeight, p.pos.z);
    cam.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
    cam.updateMatrixWorld(true);
    view.update(c, 1, dt);
    exec.update(c, (i) => view.rootOf(i), dt);
    followHeld(c, look, vm, cam, dt);
    // (Update 0.2.21 — the fists follow the slam: a slam started here drops till it's landed.)
    p.slamming = vm.slam.dropping;
    vm.update(dt, dt, 0, 0, p, -1);
    scene.updateMatrixWorld(true);
  };
  return { c, p, s, scene, view, exec, vm, rig, arms: arms.scene, cam, look, step, seen };
}

/** Update 0.3.9 — a pillar (2 m, 4.9 high) behind a body `far` m ahead, and a wall 6 m beyond it. */
export function pillarArena(far: number): Arena {
  const z = -(far + 1);
  return { ...OPEN_ARENA, boxes: [boxAt(-1, 0, z - 1, 2, 4.9, 2, 'block'), boxAt(-10, 0, z - 8, 20, 6, 1, 'wall')], pillars: [{ x: 0, z, half: 1, h: 4.9 }] };
}
