// Update 0.1.5 — a look at a held weapon's own moves without a browser (the Gold Axe's, the Hammer's, the sword's): the
// game's own arms (Viewmodel, weaponMoves.ts) hold the real model at a few moments (ready, a swing's wind, contact and
// end, the charge, the charged blow, a throw's draw), and the posed meshes are written out for Blender
// (tools/blender/render_view.py). Shots are only as true as the code they run; the motion needs the game.
// Update 0.1.9 — a pair (the Dual Daggers) holds its second in the left fist; the left hand's cut and the volley's
// throws are shot too.
// Update 0.3.70 — another character's arms, another model in hand, and their texture (the Playable Demon's: the shots
// carry UVs, and render_view.py `--image` draws them textured).
//   npx tsx tools/weapon-shots.ts <goldAxe|hammer|sword|daggers|demon> <out folder> [arms.glb] [weapon.glb]
//   blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { parseUntextured } from '../tests/fakes/glb';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { DEMON_HAND } from '../src/engine/viewmodel/handPose';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { MOVES } from '../src/engine/viewmodel/weaponMoves';
import { WEAPON_URL } from '../src/engine/weaponsView';
import type { WeaponKind } from '../src/sim/weapons/catalog';
import { createPlayer } from '../src/sim/player/state';
import { ARMS } from '../src/tuning/arms';
import { DEMON } from '../src/tuning/demon';
import { WEAPONS } from '../src/tuning/weapons';

const ASPECT = 16 / 9;
const STEP = 1 / 120;
const demon = process.argv[2] === 'demon';
/** (A combo's next swing starts this long after the last one's contact.) */
const d1 = 0.16;
const d2 = 0.3;
if (process.env.DEMON_HANDS) ARMS.v.demonHands = Number(process.env.DEMON_HANDS);
const kind = (demon ? 'sword' : process.argv[2]) as WeaponKind;
const out = process.argv[3];
if (!kind || !out) throw new Error('usage: npx tsx tools/weapon-shots.ts <kind> <out folder>');
mkdirSync(out, { recursive: true });

const ARMS_FILE = process.argv[4];
const WEAPON_FILE = process.argv[5];

const load = (path: string | URL) => parseUntextured(typeof path === 'string' ? pathToFileURL(path) : path);

type Mesh = { color: number[]; pos: number[]; idx: number[]; uv?: number[]; smooth?: boolean; colors?: number[] };
const v = new THREE.Vector3();

/** The arms' scene in its camera's space. */
function grab(vm: Viewmodel): Mesh[] {
  vm.scene.updateMatrixWorld(true);
  vm.camera.updateMatrixWorld(true);
  const toCam = vm.camera.matrixWorldInverse;
  const meshes: Mesh[] = [];
  vm.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return;
    for (let a: THREE.Object3D | null = o; a; a = a.parent) if (!a.visible) return;
    const g = o.geometry as THREE.BufferGeometry;
    const pos: number[] = [];
    for (let i = 0; i < g.attributes.position.count; i++) {
      o.getVertexPosition(i, v);
      v.applyMatrix4(o.matrixWorld).applyMatrix4(toCam);
      pos.push(+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5));
    }
    let idx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    // (Update 0.3.71 — the Demon's trail: only what it's burning, in its fire's colour.)
    if (o.userData.trail) {
      idx = idx.slice(0, g.drawRange.count);
      if (idx.length === 0) return;
    }
    const col = o.userData.trail ? new THREE.Color(1, 0.45, 0.1) : (o.material as THREE.MeshStandardMaterial).color;
    const uv = g.attributes.uv ? Array.from(g.attributes.uv.array, (n) => +n.toFixed(5)) : undefined;
    const colors = o.userData.trail ? Array.from(g.attributes.color.array, (n) => +n.toFixed(3)) : undefined;
    meshes.push({ color: [col.r, col.g, col.b], pos, idx, uv, smooth: !!uv, colors });
  });
  return meshes;
}

type P = ReturnType<typeof createPlayer>;
function play(vm: Viewmodel, p: P, secs: number, charge = -1) {
  for (let t = 0; t < secs - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, p, charge);
}
/** Into a swing until its path is `k` of the way (the swing eases out: 1 − (1 − x)³). */
const swingTo = (k: number) => (vm: Viewmodel, p: P) => (vm.slash(), play(vm, p, vm.swordAnim.moves.swing() * (1 - Math.cbrt(1 - k))));
/** A pair's second cut (the left hand's) until its path is `k` of the way, a cut after the right's. */
const leftTo = (k: number) => (vm: Viewmodel, p: P) => (vm.slash(), play(vm, p, WEAPONS.v.daggerInterval), vm.slash(), play(vm, p, vm.off.moves.swing() * (1 - Math.cbrt(1 - k))));

const MOMENTS: { name: string; run: (vm: Viewmodel, p: P) => void }[] = [
  { name: 'ready', run: () => {} },
  { name: 'swing_wind', run: swingTo(0.25) },
  { name: 'swing_contact', run: swingTo(0.5) },
  { name: 'swing_end', run: swingTo(1) },
  { name: 'charged', run: (vm, p) => play(vm, p, 0.6, 1) },
  { name: 'blow', run: (vm, p) => (play(vm, p, 0.6, 1), vm.sword('pierce'), play(vm, p, vm.swordAnim.moves.out())) },
  { name: 'throw_draw', run: (vm, p) => (vm.sword('throw'), play(vm, p, WEAPONS.v.throwWindup * 0.6)) },
];
if (MOVES[kind].pair) {
  MOMENTS.push({ name: 'left_wind', run: leftTo(0.25) }, { name: 'left_contact', run: leftTo(0.5) }, { name: 'left_end', run: leftTo(1) });
  // The volley: a throw from the right (the dagger gone from it), then the left's a beat later.
  const toss = (vm: Viewmodel, p: P) => (play(vm, p, 0.6, 1), vm.toss(0), play(vm, p, vm.swordAnim.moves.out(), 1));
  // (Right click going down: each dagger half-way through turning over to be held by the tip.)
  MOMENTS.push({ name: 'flip_half', run: (vm, p) => play(vm, p, ARMS.v.daggerFlip * 0.5, 1) });
  MOMENTS.push({ name: 'toss_right', run: toss }, { name: 'toss_left', run: (vm, p) => (toss(vm, p), play(vm, p, WEAPONS.v.volleyInterval - vm.swordAnim.moves.out(), 1), vm.toss(1), play(vm, p, vm.off.moves.out(), 1)) });
}

if (demon) {
  // (In between the keys, a swing's wrist; and the gauntlets alone, the blade thrown.)
  MOMENTS.push({ name: 'swing_12', run: swingTo(0.12) }, { name: 'swing_38', run: swingTo(0.38) }, { name: 'swing_62', run: swingTo(0.62) }, { name: 'swing_80', run: swingTo(0.8) });
  // (Update 0.3.71 — Blazing Arc, each hit in six moments, flowing from the one before.)
  const arcTime = (step: number, at: number) => {
    const d = DEMON.v;
    const big = step === 2;
    const windup = big ? d.overheadWindup : d.slashWindup;
    const strike = big ? d.overheadStrike : d.slashStrike;
    const follow = big ? d.overheadFollow : d.slashFollow;
    return [windup - strike, windup - strike * 0.5, windup, windup + follow * 0.35, windup + follow, windup + follow + (big ? d.overheadBack : d.slashBack) * 0.5][at];
  };
  for (const step of [0, 1, 2]) {
    for (let at = 0; at < 6; at++) {
      MOMENTS.push({
        name: `arc${step}_${at}`,
        run: (vm, p) => {
          for (let s = 0; s < step; s++) {
            vm.arc(s);
            play(vm, p, arcTime(s, 2) + (s === 2 ? d2 : d1));
          }
          vm.arc(step);
          play(vm, p, arcTime(step, at));
        },
      });
    }
  }
  const bare = (vm: Viewmodel, p: P) => (vm.setWeapon(null), play(vm, p, 1.2));
  MOMENTS.push({ name: 'fists', run: bare }, { name: 'punch_r', run: (vm, p) => (bare(vm, p), vm.punch('R', 'jab'), play(vm, p, 0.05)) }, { name: 'punch_l', run: (vm, p) => (bare(vm, p), vm.punch('L', 'jab'), play(vm, p, 0.05)) });
}

const shots = [];
for (const moment of MOMENTS) {
  const arms = await load(ARMS_FILE ?? new URL('../public/models/arms/adventurer.glb', import.meta.url));
  const weapon = await load(WEAPON_FILE ?? new URL(`../public${WEAPON_URL[kind]}`, import.meta.url));
  const vm = new Viewmodel(false);
  const rig = ArmsRig.fromScene(arms.scene, demon ? DEMON_HAND : undefined);
  const held = weapon.scene.clone();
  held.userData.kind = kind;
  if (demon) vm.holdBlade(held);
  vm.attach(rig);
  vm.setLens(ASPECT);
  if (MOVES[kind].pair) held.userData.pair = weapon.scene.clone();
  vm.setWeapon(held);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  play(vm, p, 1.2);
  moment.run(vm, p);
  const meshes = grab(vm);
  shots.push({ name: `${process.argv[2]}_${moment.name}`, meshes });
  // (How far the wrist bends from the forearm's line: the designer's rule is under about 40°.)
  const r = rig.arms.R;
  const elbowAt = r.fore.bone.getWorldPosition(new THREE.Vector3());
  const wristAt = r.hand.bone.getWorldPosition(new THREE.Vector3());
  const knuckleAt = r.knuckle.getWorldPosition(new THREE.Vector3());
  const bend = wristAt.clone().sub(elbowAt).angleTo(knuckleAt.sub(wristAt));
  const view = (b: THREE.Object3D) => b.getWorldPosition(new THREE.Vector3()).applyMatrix4(vm.camera.matrixWorldInverse);
  const show = (o: THREE.Vector3) => `${o.x.toFixed(2)},${o.y.toFixed(2)},${o.z.toFixed(2)}`;
  const fore = view(r.hand.bone).sub(view(r.fore.bone)).normalize();
  console.log(`posed ${process.argv[2]}_${moment.name}: wrist ${Math.round((bend * 180) / Math.PI)}°  shoulder ${show(view(r.upper.bone))} elbow ${show(view(r.fore.bone))} wrist ${show(view(r.hand.bone))} forearm ${show(fore)}`);
}
writeFileSync(join(out, 'shots.json'), JSON.stringify({ aspect: ASPECT, fov: ARMS.v.fov, shots }));
console.log(`wrote ${join(out, 'shots.json')}`);
