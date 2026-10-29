// Update 0.1.6 — the hands' fingers (the designer: "the way the fist is closed isn't proper", with photos of a fist):
// posed live (handPose.ts) instead of the even hooks the arms were cut with. The punching fist has its fingers tucked
// into the palm and the thumb folded across the index and middle fingers; a hand opens straight; a hand on a weapon
// wraps its handle (every finger round it, none through it) however far the handle leans in the fist through a swing,
// the hammer's left hand too; a tail or a limb held in an execution is gripped tighter than a weapon's handle.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, section } from './harness';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { ROPE } from '../src/engine/viewmodel/heldGrip';
import { PUNCH } from '../src/engine/viewmodel/handPose';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { MOVES } from '../src/engine/viewmodel/weaponMoves';
import { WEAPON_URL } from '../src/engine/weaponsView';
import type { WeaponKind } from '../src/sim/weapons/catalog';
import { createPlayer } from '../src/sim/player/state';

const STEP = 1 / 120;

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

/** The arms (holding `kind`), settled, then `run`. */
async function arms(kind?: WeaponKind, run?: (vm: Viewmodel, play: (s: number, c?: number) => void) => void) {
  const a = await load('../public/models/arms/adventurer.glb');
  const rig = ArmsRig.fromScene(a.scene);
  const vm = new Viewmodel(false);
  vm.attach(rig);
  vm.setLens(16 / 9);
  let held: THREE.Object3D | null = null;
  if (kind) {
    held = (await load(`../public${WEAPON_URL[kind]}`)).scene.clone();
    held.userData.kind = kind;
    vm.setWeapon(held);
  }
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const play = (s: number, c = -1) => {
    for (let t = 0; t < s - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, p, c);
  };
  play(1.2);
  run?.(vm, play);
  vm.scene.updateMatrixWorld(true);
  const bone = (n: string) => a.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3());
  /** The thumb's tip on the mesh: the vertex of the right thumb's last bone furthest from its joint. */
  const thumbTip = () => {
    const joint = bone('Thumb3R');
    const tip = joint.clone();
    let far = 0;
    const v = new THREE.Vector3();
    a.scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      const bi = m.skeleton.bones.findIndex((x) => x.name === 'Thumb3R');
      if (bi < 0) return;
      const si = m.geometry.attributes.skinIndex;
      const sw = m.geometry.attributes.skinWeight;
      for (let i = 0; i < si.count; i++) {
        let w = 0;
        for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi) w += sw.getComponent(i, k);
        if (w < 0.6) continue;
        m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
        if (v.distanceTo(joint) > far) {
          far = v.distanceTo(joint);
          tip.copy(v);
        }
      }
    });
    return tip;
  };
  return { vm, rig, held, bone, thumbTip };
}

section('Hands — the punching fist');
{
  const { bone, thumbTip, rig } = await arms();
  // (How it lies across them was picked by eye from close-ups, tools/hand-shots.ts; here: its tip is on them.)
  const middle = bone('Middle3R').add(bone('Middle4R')).multiplyScalar(0.5);
  const thumb = thumbTip().distanceTo(middle);
  check('the thumb folded onto the front of the fingers, its tip on the middle finger', thumb < 0.03, `${(thumb * 100).toFixed(1)} cm from it`);
  rig.openHand('R', 1);
  rig.root.updateMatrixWorld(true);
  const out = thumbTip().distanceTo(bone('Middle3R').add(bone('Middle4R')).multiplyScalar(0.5));
  check('opened, the thumb comes out', out > thumb + 0.04, `${(out * 100).toFixed(1)} cm`);
  rig.openHand('R', 0);
  rig.root.updateMatrixWorld(true);
  check('every finger tucked: the middle joints bent past 95°', [1, 4, 7, 10].every((j) => PUNCH.curl[j] > 1.66));
  const wristR = bone('HandR');
  const tucked = ['Index4R', 'Middle4R', 'Ring4R', 'Pinky4R'].map((n) => bone(n).distanceTo(wristR));
  const knuckles = ['Index2R', 'Middle2R', 'Ring2R', 'Pinky2R'].map((n) => bone(n).distanceTo(wristR));
  check('the fingertips tucked into the palm (nearer the wrist than the knuckles)', tucked.every((d, i) => d < knuckles[i]), tucked.map((d) => (d * 100).toFixed(1)).join(' ') + ' cm');
}
{
  const { rig, bone } = await arms();
  const fist = bone('Middle4R').distanceTo(bone('HandR'));
  rig.openHand('R', 1);
  rig.root.updateMatrixWorld(true);
  const open = bone('Middle4R').distanceTo(bone('HandR'));
  check('opened, the fingers straighten', open > fist + 0.03, `${(fist * 100).toFixed(1)} → ${(open * 100).toFixed(1)} cm`);
}

section('Hands — round a handle');
{
  const moments: [string, (vm: Viewmodel, play: (s: number, c?: number) => void) => void][] = [
    ['ready', () => {}],
    ['mid-swing', (vm, play) => (vm.slash(), play(vm.swordAnim.moves.swing() * 0.2))],
    ['charged', (_vm, play) => play(0.6, 1)],
  ];
  for (const kind of ['sword', 'goldAxe', 'hammer'] as const) {
    for (const [name, run] of moments) {
      const { held, bone } = await arms(kind, run);
      const origin = new THREE.Vector3().setFromMatrixPosition(held!.matrixWorld);
      const axis = new THREE.Vector3(0, 1, 0).transformDirection(held!.matrixWorld);
      const off = (n: string) => {
        const r = bone(n).sub(origin);
        return r.addScaledVector(axis, -r.dot(axis)).length();
      };
      const r = MOVES[kind].grip();
      const sides = kind === 'hammer' ? ['R', 'L'] : ['R'];
      const d = sides.flatMap((s) => ['Index', 'Middle', 'Ring', 'Pinky'].flatMap((f) => [3, 4].map((j) => off(`${f}${j}${s}`))));
      check(`${kind} ${name}: every finger wraps the handle, none through it${kind === 'hammer' ? ' (both hands)' : ''}`, Math.min(...d) > r && Math.max(...d) < r + 0.035, `${(Math.min(...d) * 100).toFixed(1)} … ${(Math.max(...d) * 100).toFixed(1)} cm from its line (handle ${(r * 100).toFixed(1)} cm)`);
      // (The designer: "that first finger needs to be closed like the others": the index stood open over the handle.)
      // Folded: the tip joint's distance from the knuckle over the finger's length (1: straight). At a fencer's lean
      // the handle runs off towards the index knuckle, so there the index is folded like the rest without its tip
      // touching the handle's line: in the ready pose (the designer's look) its tip closes onto it too.
      const fold = (s: string, f: string) => bone(`${f}4${s}`).distanceTo(bone(`${f}2${s}`)) / (bone(`${f}3${s}`).distanceTo(bone(`${f}2${s}`)) + bone(`${f}4${s}`).distanceTo(bone(`${f}3${s}`)));
      const folds = sides.map((s) => ['Index', 'Middle', 'Ring', 'Pinky'].map((f) => fold(s, f)));
      check(`${kind} ${name}: the index folded like the other fingers`, folds.every((h) => h[0] <= Math.max(h[1], h[2], h[3]) + 0.05), folds.map((h) => h.map((x) => x.toFixed(2)).join(' ')).join(' | '));
      if (name === 'ready') {
        const tips = sides.flatMap((s) => ['Index', 'Middle', 'Ring', 'Pinky'].map((f) => off(`${f}4${s}`)));
        check(`${kind} ready: every finger's tip closed onto the handle, the index too`, Math.max(...tips) < r + 0.012, tips.map((t) => (t * 100).toFixed(1)).join(' ') + ' cm');
      }
    }
  }
}
{
  const { rig, bone } = await arms();
  rig.openHand('R', 0, MOVES.sword.grip(), 1, 0.4);
  rig.root.updateMatrixWorld(true);
  const weapon = bone('Middle4R').distanceTo(bone('HandR'));
  rig.openHand('R', 0, ROPE, 1, 0.4);
  rig.root.updateMatrixWorld(true);
  const rope = bone('Middle4R').distanceTo(bone('HandR'));
  check('a tail or limb held in an execution is gripped tighter than a weapon\'s handle', rope < weapon - 0.003, `${(weapon * 100).toFixed(1)} → ${(rope * 100).toFixed(1)} cm`);
}
