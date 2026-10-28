// Update 0.1.1 — the hands in the snake execution (the designer: "the player's arms are doing that cross arms stance,
// let's make it accurate and make it grab the snake's tail"). Update 0.1.2 — played and drawn as
// the game does it (tests/fakes/execRig.ts, the real models): while you hold it, both fists sit on the line they hold
// (on screen), it lies across each fist's curled fingers (never out through the back of the hand), leaning in the grip
// no more than a sword's blade does, and your arms never cross.
import * as THREE from 'three';
import { check, section } from './harness';
import { ASPECT, execRig } from './fakes/execRig';
import { drawn } from '../src/engine/exec/execScene';
import { execHeld } from '../src/sim/combat/execution';

/** A fist's width on screen (the same units as its height). */
const FIST = 0.05;

for (const kind of ['snake'] as const) {
  section('Execution — your hands on the snake’s tail');
  const r = await execRig(kind);
  // On screen, x in the same units as y.
  const screen = (v: THREE.Vector3, camera: THREE.Camera) => {
    v.project(camera);
    v.x *= ASPECT;
    v.z = 0;
    return v;
  };
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const at = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  const through = { L: new THREE.Vector3(), R: new THREE.Vector3() };
  const rod = new THREE.Vector3();
  const wrist = new THREE.Vector3();
  const knuckle = new THREE.Vector3();
  const back = new THREE.Vector3();
  let worstOff = 0;
  let worstOut = 0;
  let worstLean = 0;
  let crossed = 0;
  let held = 0;
  for (let k = 0; k < 200; k++) {
    r.step();
    const ex = r.c.exec;
    // Once the hands have hold of it, until they let go.
    if (!execHeld(ex) || ex.t < 0.3) continue;
    held++;
    const t0 = screen(a.copy(drawn.tip), r.cam).clone();
    const dir = screen(b.copy(drawn.tip).addScaledVector(drawn.line, 0.3), r.cam).sub(t0).normalize();
    // The way it runs, as the arms are drawn.
    rod.copy(r.vm.grip.along).transformDirection(r.vm.camera.matrixWorld);
    for (const side of ['L', 'R'] as const) {
      r.rig.gripNow(side, at[side], through[side]);
      r.rig.handFrame(side, wrist, knuckle, back);
      // Out of the fingers' plane (towards the back of the hand or the palm), and its lean in the grip.
      worstOut = Math.max(worstOut, THREE.MathUtils.radToDeg(Math.asin(Math.min(1, Math.abs(rod.dot(back.normalize()))))));
      worstLean = Math.max(worstLean, THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(rod.dot(through[side]))))));
      // How far the fist's grip is from the line on screen.
      const rel = screen(at[side], r.vm.camera).sub(t0);
      worstOff = Math.max(worstOff, Math.abs(rel.x * dir.y - rel.y * dir.x));
    }
    const elbowL = screen(r.arms.getObjectByName('LowerArmL')!.getWorldPosition(a), r.vm.camera).x;
    const elbowR = screen(r.arms.getObjectByName('LowerArmR')!.getWorldPosition(b), r.vm.camera).x;
    // (Fists one above the other on an upright stretch aren't crossed: a fist's width of slack.)
    if (at.L.x > at.R.x + FIST || elbowL >= elbowR) crossed++;
  }
  r.exec.dispose();
  check('you hold it for the whole of the moves', held > 100, `${held} frames`);
  check('both fists sit on the line they hold (on screen)', worstOff < 0.06, `${worstOff.toFixed(3)} off its line at worst`);
  check('it lies across each fist’s curled fingers', worstOut < 10, `${worstOut.toFixed(1)}° out of them at worst`);
  check('leaning in the grip no more than a sword does', worstLean < 60, `${worstLean.toFixed(0)}° at worst`);
  check('your arms never cross (left fist and elbow on the left)', crossed === 0, `${crossed} frames crossed`);
}
