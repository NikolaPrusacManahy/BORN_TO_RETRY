// Update 0.3.40 — the Orc's execution reworked (the designer: "make stuff more accurate", the animation library; then
// "the right hand looks absolutly crazy bad when lifting the body"), played and drawn as the game does it
// (tests/fakes/execRig.ts, the real models): it moves as a body does (its own Exec_ clips, baked by tools/ual_exec.py)
// and hangs from the face in your claw, the wrist straight, the back of your hand to you; the uppercut lands knuckles
// up, the palm towards you; it bursts where you hold it. Those sharing its moves without the clips (the Tribal) are as
// they were.
import * as THREE from 'three';
import { check, section } from './harness';
import { ASPECT, execRig } from './fakes/execRig';
import { EXEC_LOOKS } from '../src/engine/exec/looks';
import { execHeld } from '../src/sim/combat/execution';

section('Execution — the Orc held, lifted and burst (Update 0.3.40)');
const r = await execRig('grunt');
r.step();
const root = r.view.rootOf(0)!;
check('the Orc’s model has every clip its execution plays', root.userData.execClips === true, (EXEC_LOOKS.grunt?.clips ?? []).map((c) => c.name).join(', '));

const screen = (v: THREE.Vector3, camera: THREE.Camera) => {
  v.project(camera);
  v.x *= ASPECT;
  v.z = 0;
  return v;
};
const wrist = new THREE.Vector3();
const knuckle = new THREE.Vector3();
const back = new THREE.Vector3();
const elbow = new THREE.Vector3();
const head = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const rest = new THREE.Vector3();
let held = 0;
let worstOff = 0;
let worstWrist = 0;
let backAway = 0;
let moved = 0;
let upper: { up: number; back: number } | null = null;
let burstY = -1;
let heldY = 0;
for (let k = 0; k < 400 && burstY < 0; k++) {
  r.step();
  const ex = r.c.exec;
  r.vm.camera.updateMatrixWorld(true);
  r.rig.handFrame('R', wrist, knuckle, back);
  r.arms.getObjectByName('LowerArmR')!.getWorldPosition(elbow);
  const view = r.vm.camera.matrixWorldInverse;
  // In its claw (from the grip till it's tossed).
  if (execHeld(ex) && ex.t >= 0.28 && ex.t <= 0.45) {
    held++;
    // Its head under your hand on screen: the hand's middle (wrist to knuckles) against its brow (the head bone, a fifth
    // of a metre up your view).
    const h = r.view.rootOf(0)!.getObjectByName('Head')!.getWorldPosition(head).addScaledVector(b.setFromMatrixColumn(r.cam.matrixWorld, 1), 0.2);
    const hand = screen(a.copy(wrist).lerp(knuckle, 0.5), r.vm.camera);
    worstOff = Math.max(worstOff, hand.distanceTo(screen(h.clone(), r.cam)));
    // (As tools/view-shots.ts measures it: the forearm's line to the hand's, wrist to the middle finger.)
    const at = (n: string) => r.arms.getObjectByName(n)!.getWorldPosition(new THREE.Vector3());
    worstWrist = Math.max(worstWrist, THREE.MathUtils.radToDeg(at('HandR').sub(at('LowerArmR')).normalize().angleTo(at('Middle2R').sub(at('HandR')).normalize())));
    if (back.clone().transformDirection(view).z <= 0) backAway++;
    // Its clip moves it: the head about its hips isn't where it is at rest.
    const g = r.view.rootOf(0)!.userData.grip;
    const hips = r.view.rootOf(0)!.getObjectByName('Hips')!;
    rest.copy(g.axis);
    const now = r.view.rootOf(0)!.worldToLocal(hips.getWorldPosition(b)).sub(r.view.rootOf(0)!.worldToLocal(head.clone())).normalize();
    if (now.angleTo(rest) > 0.2) moved++;
    heldY = Math.max(heldY, ex.middle.y);
  }
  // The uppercut as it lands.
  if (!upper && ex.t >= 0.85) {
    const up = a.subVectors(knuckle, wrist).transformDirection(view).y;
    upper = { up, back: back.clone().transformDirection(view).z };
  }
  const n = r.exec.pieces.group.children.length;
  if (n > 0) {
    let y = 0;
    for (const p of r.exec.pieces.group.children) y += new THREE.Box3().setFromObject(p).getCenter(a).y;
    burstY = y / n;
  }
}
r.exec.dispose();
check('you hold it by the face for the lift', held > 10, `${held} frames`);
check('its face stays under your hand (on screen, within its head)', worstOff < 0.15, `${worstOff.toFixed(3)} off at worst`);
check('your wrist stays straight as you hold it up', worstWrist < 40, `${worstWrist.toFixed(0)}° at worst`);
check('the back of your hand faces you (the palm on its face)', backAway === 0, `${backAway} frames turned away`);
check('it moves as a body as it hangs (its clip, not its rest pose)', moved > held / 2, `${moved} of ${held} frames`);
check('the uppercut lands knuckles up', !!upper && upper.up > 0.5, upper ? `${upper.up.toFixed(2)} up` : 'not reached');
check('…the palm towards you, the back of the hand to it', !!upper && upper.back < 0, upper ? `${upper.back.toFixed(2)}` : 'not reached');
check('it bursts where you held it (not dropped to the floor)', burstY > heldY - 0.8 && burstY > 1, `pieces at ${burstY.toFixed(2)} m, held at ${heldY.toFixed(2)} m`);

section('Execution — those sharing the Orc’s moves, without its clips');
const t = await execRig('tribal');
t.step();
check('the Tribal has no clips of its own for it: it thrashes as before', t.view.rootOf(0)!.userData.execClips === false);
t.exec.dispose();
