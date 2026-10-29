// Update 0.1.5 — the Gold Axe and the Hammer in the game's own arms (the real models): each weapon plays its own moves
// (weaponMoves.ts) and the right fist's grip stays on the haft (the left arm out of view for the one-handed axe).
// Update 0.1.6 (the designer: "these weapons have grip areas and you made the player hold none of them") — the right
// fist sits on each weapon's wrapped grip, no thicker there than the sword's (the fist is shaped round it: thicker, it
// pokes through the fingers), and the Hammer's left hand holds the plain handle below the right, well apart.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, section } from './harness';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { AXE_MOVES, HAMMER_MOVES, MOVES, SWORD_MOVES } from '../src/engine/viewmodel/weaponMoves';
import { WEAPON_URL } from '../src/engine/weaponsView';
import { createPlayer } from '../src/sim/player/state';
import type { WeaponKind } from '../src/sim/weapons/catalog';
import { ARMS } from '../src/tuning/arms';

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

const STEP = 1 / 120;
type Moment = 'ready' | 'contact' | 'through' | 'charged' | 'blow';

/** The arms holding `kind` at `moment`: the rig, the held model. */
async function pose(kind: WeaponKind, moment: Moment) {
  const arms = await load('../public/models/arms/adventurer.glb');
  const weapon = await load(`../public${WEAPON_URL[kind]}`);
  const rig = ArmsRig.fromScene(arms.scene);
  const vm = new Viewmodel(false);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const held = weapon.scene.clone();
  held.userData.kind = kind;
  vm.setWeapon(held);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const play = (s: number, c = -1) => {
    for (let t = 0; t < s - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, p, c);
  };
  const swing = (k: number) => (vm.slash(), play(vm.swordAnim.moves.swing() * (1 - Math.cbrt(1 - k))));
  play(1.2);
  if (moment === 'contact') swing(0.5);
  if (moment === 'through') swing(0.75);
  if (moment === 'charged') play(0.6, 1);
  if (moment === 'blow') (play(0.6, 1), vm.sword('pierce'), play(vm.swordAnim.moves.out()));
  vm.scene.updateMatrixWorld(true);
  return { rig, held, vm };
}

const at = new THREE.Vector3();
const through = new THREE.Vector3();
const axis = new THREE.Vector3();
const origin = new THREE.Vector3();

/** A fist's grip against the haft: how far along it from the model's middle, how far off its line (m), and how well
 *  the way through the fist runs along it (1: exactly). */
function onHaft(rig: ArmsRig, held: THREE.Object3D, side: 'L' | 'R') {
  rig.gripNow(side, at, through);
  origin.setFromMatrixPosition(held.matrixWorld);
  axis.set(0, 1, 0).transformDirection(held.matrixWorld);
  const rel = at.sub(origin);
  const along = rel.dot(axis);
  return { along, off: rel.addScaledVector(axis, -along).length(), line: Math.abs(through.normalize().dot(axis)) };
}

section('Axe and Hammer — their own moves');
{
  check('each weapon has its own moves (the sword\'s stay the sword\'s)', MOVES.goldAxe === AXE_MOVES && MOVES.hammer === HAMMER_MOVES && MOVES.sword === SWORD_MOVES && AXE_MOVES.slash !== SWORD_MOVES.slash && HAMMER_MOVES.heavyOut !== SWORD_MOVES.heavyOut);
  check('the axe in one hand, the hammer in both (the left lower on the handle)', AXE_MOVES.hands() === 0 && HAMMER_MOVES.hands() < 0);
  const axe = await pose('goldAxe', 'ready');
  check('holding the axe, the arms play its moves', axe.vm.swordAnim.moves === AXE_MOVES);
}

section('Axe and Hammer — the grip');
for (const kind of ['goldAxe', 'hammer'] as const) {
  for (const moment of ['ready', 'contact', 'charged', 'blow'] as const) {
    const { rig, held } = await pose(kind, moment);
    const r = onHaft(rig, held, 'R');
    const slide = MOVES[kind].slide();
    check(`${kind} ${moment}: the haft runs through the right fist where it holds it`, r.off < 0.005 && Math.abs(r.along - slide) < 0.01 && r.line > 0.9, `off ${r.off.toFixed(3)} along ${r.along.toFixed(3)}`);
  }
}
for (const moment of ['ready', 'contact', 'through', 'charged', 'blow'] as const) {
  const { rig, held } = await pose('hammer', moment);
  const l = onHaft(rig, held, 'L');
  const want = HAMMER_MOVES.slide() + HAMMER_MOVES.hands();
  check(`hammer ${moment}: the left hand closes on the plain handle below the right`, l.off < 0.025 && Math.abs(l.along - want) < 0.04 && l.line > 0.9, `off ${l.off.toFixed(3)} along ${l.along.toFixed(3)} (want ${want.toFixed(3)})`);
}

/** A weapon's wrapped grip (its 'LightWood' wraps on the haft: the first unbroken run of them up from the bottom, not
 *  the wood behind the head) and the haft's girth along it (model m). */
async function grip(kind: WeaponKind) {
  const g = await load(`../public${WEAPON_URL[kind]}`);
  g.scene.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const wraps: number[] = [];
  const haft: { y: number; r: number }[] = [];
  g.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const p = m.geometry.attributes.position;
    const groups = m.geometry.groups.length ? m.geometry.groups : [{ start: 0, count: m.geometry.index ? m.geometry.index.count : p.count, materialIndex: 0 }];
    for (const gr of groups) {
      const name = (mats[gr.materialIndex ?? 0] as THREE.Material).name;
      for (let k = gr.start; k < gr.start + gr.count; k++) {
        v.fromBufferAttribute(p, m.geometry.index ? m.geometry.index.getX(k) : k).applyMatrix4(m.matrixWorld);
        const r = Math.hypot(v.x, v.z);
        if (r > 0.05) continue;
        haft.push({ y: v.y, r });
        if (name === 'LightWood') wraps.push(v.y);
      }
    }
  });
  wraps.sort((a, b) => a - b);
  const lo = wraps[0];
  let hi = lo;
  for (const y of wraps) {
    if (y - hi > 0.04) break;
    hi = y;
  }
  /** The haft's girth within `d` of `y`. */
  const girth = (y: number, d = 0.04) => haft.reduce((r, q) => (Math.abs(q.y - y) <= d ? Math.max(r, q.r) : r), 0);
  return { lo, hi, girth };
}

section('Axe and Hammer — on the grip');
{
  const sword = await grip('sword');
  const scale = (kind: WeaponKind) => ARMS.v.weaponScale * MOVES[kind].scale();
  const swordGirth = sword.girth(MOVES.sword.slide() / scale('sword')) * scale('sword');
  for (const kind of ['goldAxe', 'hammer'] as const) {
    const g = await grip(kind);
    const at = MOVES[kind].slide() / scale(kind);
    check(`${kind}: the right fist on the wrapped grip (${g.lo.toFixed(2)} … ${g.hi.toFixed(2)} m up the haft)`, at - 0.04 >= g.lo && at + 0.04 <= g.hi, `at ${at.toFixed(3)}`);
    check(`${kind}: no thicker in the fist than the sword's grip (it doesn't poke through the fingers)`, g.girth(at) * scale(kind) <= swordGirth + 0.0005, `${(g.girth(at) * scale(kind) * 1000).toFixed(1)} mm vs ${(swordGirth * 1000).toFixed(1)} mm`);
  }
  const h = await grip('hammer');
  const low = (HAMMER_MOVES.slide() + HAMMER_MOVES.hands()) / scale('hammer');
  check('hammer: the left hand on the plain handle below the wraps, a hand\'s width and more from the right', low < h.lo && HAMMER_MOVES.hands() <= -0.15, `at ${low.toFixed(3)}`);
}
{
  const { rig } = await pose('goldAxe', 'ready');
  const l = new THREE.Vector3();
  rig.knuckle('L', l);
  check('with the one-handed axe, the left fist is dropped out of view (low)', l.y < rig.eye.y - 0.4, `${l.y.toFixed(2)}`);
}
