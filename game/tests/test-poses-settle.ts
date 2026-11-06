// Update 0.3.69 — a boss posed in code, played frame by frame, must end up in the pose it has if posed once at that moment. The mixer only writes a bone when its clip's value changes, so a
// relative turn on a bone its clip holds still was still there next frame, and turned again: the Bone King's torso, neck and hips and the Velociraptor's tail, right round. (Hellwarden's neck
// the same: 0.3.66.) The render tool poses one frame, so it never showed it; and the faster your frame rate, the faster it spun.
import * as THREE from 'three';
import { parseUntextured } from './fakes/glb';
import { check, section } from './harness';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { KingView } from '../src/engine/boss/kingView';
import { RaptorFx } from '../src/engine/boss/raptorFx';
import { EnemiesView } from '../src/engine/enemiesView';
import { createCombat } from '../src/sim/combat/state';
import { CAGE, GRASP, SLAM } from '../src/sim/enemies/boneKingMoves';
import { kingTell } from '../src/sim/enemies/boneKing';
import { dinoWindup } from '../src/sim/enemies/dino';
import { FEINT, PACK, SICKLE, TAIL } from '../src/sim/enemies/dinoMoves';
import { spawnEnemy, type Enemy, type EnemyPhase } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';

interface Stage {
  name: string;
  phase: EnemyPhase;
  move: number;
  stage: number;
  /** How long it's held there (s). */
  secs: number;
}

/** Plays `secs` of `s` at `fps`, and how each of `bones` sits (world), through the boss's real body and its real view. */
async function played(kind: EnemyKind, url: string, s: Stage, fps: number, bones: readonly string[], draw: (scene: THREE.Scene) => (combat: ReturnType<typeof createCombat>, view: EnemiesView, dt: number) => void) {
  const gltf = await parseUntextured(new URL(url, import.meta.url));
  const scene = new THREE.Scene();
  const view = new EnemiesView(scene, false, [kind]);
  view.attach(kind, gltf.scene, gltf.animations);
  const combat = createCombat(OPEN_ARENA, false);
  const slot = spawnEnemy(combat.enemies, kind, new THREE.Vector3(0, 0, 0), 0);
  const e: Enemy = combat.enemies[slot];
  e.phase = s.phase;
  e.move = s.move;
  e.stage = s.stage;
  e.t = 0;
  const step = draw(scene);
  const frames = Math.max(1, Math.round(s.secs * fps));
  const dt = s.secs / frames;
  for (let i = 0; i < frames; i++) {
    e.t += dt;
    view.update(combat, 1, dt);
    step(combat, view, dt);
  }
  const root = view.rootOf(slot)!;
  root.updateMatrixWorld(true);
  const out = new Map<string, THREE.Quaternion>();
  for (const b of bones) out.set(b, root.getObjectByName(b)!.getWorldQuaternion(new THREE.Quaternion()));
  view.dispose();
  return out;
}

const apart = (a: THREE.Quaternion, b: THREE.Quaternion) => a.angleTo(b);

/** The same moment reached three ways: at 60 frames a second, at 144, and in one frame. They must all agree. */
async function settled(kind: EnemyKind, url: string, s: Stage, bones: readonly string[], draw: Parameters<typeof played>[5]) {
  const once = await played(kind, url, s, 0, bones, draw);
  const slow = await played(kind, url, s, 60, bones, draw);
  const fast = await played(kind, url, s, 144, bones, draw);
  let most = 0;
  let which = '';
  for (const b of bones) {
    for (const q of [slow, fast]) {
      const d = apart(once.get(b)!, q.get(b)!);
      if (d > most) {
        most = d;
        which = b;
      }
    }
  }
  check(`${s.name}: no build-up, 60 fps, 144 fps or one frame (${which || 'none'} ${most.toFixed(3)} rad)`, most < 0.05);
}

const KING = '../public/models/enemies/skeleton.glb';
const KING_BONES = ['Hips', 'Torso', 'Neck', 'Head'];
const kingDraw = (scene: THREE.Scene) => {
  const king = new KingView(scene);
  return (combat: ReturnType<typeof createCombat>, view: EnemiesView, dt: number) => king.update(combat, dt, (i) => view.rootOf(i));
};

section('The Bone King — its pose, frame by frame');
{
  const k = (move: number, stage: number) => kingTell(move, stage);
  await settled('boneKing', KING, { name: 'its arm raised', phase: 'windup', move: SLAM, stage: 0, secs: k(SLAM, 0) * 0.9 }, KING_BONES, kingDraw);
  await settled('boneKing', KING, { name: 'rebuilt wrong, its spine crooked, its arm raised', phase: 'windup', move: SLAM, stage: 1, secs: k(SLAM, 1) * 0.9 }, KING_BONES, kingDraw);
  await settled('boneKing', KING, { name: 'its Grasp’s bow', phase: 'windup', move: GRASP, stage: 0, secs: k(GRASP, 0) * 0.9 }, KING_BONES, kingDraw);
  await settled('boneKing', KING, { name: 'rebuilt wrong, its Grasp’s bow', phase: 'windup', move: GRASP, stage: 1, secs: k(GRASP, 1) * 0.9 }, KING_BONES, kingDraw);
  await settled('boneKing', KING, { name: 'its Cage’s hands', phase: 'windup', move: CAGE, stage: 1, secs: k(CAGE, 1) * 0.9 }, KING_BONES, kingDraw);
}

const RAPTOR = '../public/models/enemies/velociraptor.glb';
const TAIL_BONES = ['Tail2', 'Tail3', 'Tail4'];
const raptorDraw = (scene: THREE.Scene) => {
  const fx = new RaptorFx(scene);
  return (combat: ReturnType<typeof createCombat>, view: EnemiesView, dt: number) => fx.update(combat, 1, dt, (i) => view.headOf(i), (i) => view.rootOf(i));
};

section('The Velociraptor — its tail, frame by frame');
{
  const w = (move: number) => dinoWindup(move, 0, false);
  await settled('dino', RAPTOR, { name: 'crouched for its Sickle', phase: 'windup', move: SICKLE, stage: 0, secs: w(SICKLE) * 0.9 }, TAIL_BONES, raptorDraw);
  await settled('dino', RAPTOR, { name: 'crouched for its Feint', phase: 'windup', move: FEINT, stage: 0, secs: w(FEINT) * 0.9 }, TAIL_BONES, raptorDraw);
  await settled('dino', RAPTOR, { name: 'flicking its tail for its Lash', phase: 'windup', move: TAIL, stage: 0, secs: w(TAIL) * 0.6 }, TAIL_BONES, raptorDraw);
  await settled('dino', RAPTOR, { name: 'rearing to bark', phase: 'windup', move: PACK, stage: 0, secs: w(PACK) * 0.5 }, TAIL_BONES, raptorDraw);
}
