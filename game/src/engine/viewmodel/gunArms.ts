// Update 0.2.4 — the right arm holding the Pistol (the designer: "hand holding it, we do not see left hand"; the left
// drops out of view as it does for a sword). The gun is posed (gunPoses.ts) and the arm follows it: its grip in the
// fist, the knuckles along the sights, so the wrist stays nearly straight. A shot: the muzzle kicks up about the wrist and the gun comes back (a spring), the slide
// blows back and returns (it stays back once the magazine's empty), the trigger is pulled, a flash, a case thrown out
// (gunFx.ts). The reload plays the sim's beats (sim/weapons/gun.ts): the magazine drops out and falls, the hand dips
// out of sight and the new one goes in, and from empty the slide goes home with a jolt. A throw draws it back by the
// ear first. The gun's parts and marks are the model's (tools/blender/export_pistol.py).
// Update 0.2.6 — no aiming down the sights (the designer): right click whips it (gunPoses.ts WHIP), drawn back and
// slammed forward on its side.
import * as THREE from 'three';
import { MAG_IN, MAG_OUT, SLIDE_HOME, WHIP_TIME, reloadTime } from '../../sim/weapons/gun';
import { ARMS } from '../../tuning/arms';
import { GUN } from '../../tuning/gun';
import { WEAPONS } from '../../tuning/weapons';
import type { ArmPose, ArmsRig, SwordPose } from './armsRig';
import { viewToModel } from './armsMath';
import { HIP, RELOAD, RELOAD_EMPTY, THROW, WHIP, blankKey, gunFrame, keyAt } from './gunPoses';
import { emptySword } from './swordPoses';
import { GunFx } from './gunFx';

/** The fingers close round its grip this thick (radius, m). */
export const GUN_GRIP = 0.022;
/** The recoil's springs (stiffness, damping) and a shot's kick into them: the muzzle up (rad/s), the gun back (m/s). */
const KICK = { k: 260, c: 26, up: 3.8, back: 1.1 };
/** The slide: how far back it goes (the gun's metres), how long it stays back after a shot (s), how fast it returns. */
const SLIDE = { travel: 0.028, hold: 0.025, rate: 70 };
const TRIGGER = { travel: 0.005, hold: 0.06 };
/** Its marks if the model has none (the gun's metres; the sights' line from its +x, rad). */
const REAR = new THREE.Vector3(-0.03, 0.117, 0);
const SLOPE = 0.32;

const smooth = (x: number) => x * x * (3 - 2 * x);
const VIEW_X = new THREE.Vector3(1, 0, 0);
const VIEW_Y = new THREE.Vector3(0, 1, 0);

interface Parts {
  slide: THREE.Object3D | null;
  trigger: THREE.Object3D | null;
  mag: THREE.Mesh | null;
  ejector: THREE.Object3D | null;
  rest: { slide: THREE.Vector3; trigger: THREE.Vector3; mag: THREE.Vector3 };
}

export class GunArms {
  readonly fx: GunFx;
  /** The arm's pole this frame (model space). */
  readonly elbow = new THREE.Vector3();
  private readonly sp: SwordPose = emptySword();
  private parts: Parts | null = null;
  private muzzle: THREE.Object3D | null = null;
  private readonly rear = REAR.clone();
  private slope = SLOPE;
  /** Along the sights, the gun's own way (the slide moves back along it). */
  private readonly line = new THREE.Vector3(Math.cos(SLOPE), Math.sin(SLOPE), 0);
  // From the sim each frame.
  private reload = -1;
  private empty = false;
  private mag = 0;
  // The recoil and the moving parts.
  private kick = 0;
  private kickV = 0;
  private back = 0;
  private backV = 0;
  private slide = 0;
  private sinceShot = 9;
  private locked = false;
  private throwing = -1;
  /** Update 0.2.6 — seconds into a whip (−1: none). */
  private whipping = -1;
  private time = 0;
  private readonly key = blankKey();
  private readonly sight = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly along = new THREE.Vector3();
  private readonly turn = new THREE.Quaternion();
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly c = new THREE.Vector3();
  private readonly d = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.fx = new GunFx(scene);
  }

  /** The gun model in hand (null: none): finds its parts and marks. */
  use(model: THREE.Object3D | null) {
    this.fx.clear();
    this.throwing = this.whipping = -1;
    this.kick = this.kickV = this.back = this.backV = this.slide = 0;
    this.muzzle = model?.getObjectByName('Muzzle') ?? null;
    if (!model) {
      this.parts = null;
      this.fx.mount(null, this.line);
      return;
    }
    const find = (n: string) => model.getObjectByName(n) ?? null;
    const rear = find('RearSight');
    const front = find('FrontSight');
    if (rear && front) {
      this.rear.copy(rear.position);
      this.line.subVectors(front.position, rear.position).normalize();
      this.slope = Math.atan2(this.line.y, this.line.x);
    }
    const slide = find('Slide');
    const trigger = find('Trigger');
    const mag = find('Magazine');
    this.parts = {
      slide,
      trigger,
      mag: mag instanceof THREE.Mesh ? mag : null,
      ejector: find('Ejector'),
      rest: { slide: slide?.position.clone() ?? new THREE.Vector3(), trigger: trigger?.position.clone() ?? new THREE.Vector3(), mag: mag?.position.clone() ?? new THREE.Vector3() },
    };
    this.fx.mount(this.muzzle, this.line);
  }

  /** Where its muzzle is on screen (the arms camera's NDC) into `out`; false with no gun. */
  muzzleNdc(camera: THREE.Camera, out: THREE.Vector3): boolean {
    if (!this.muzzle) return false;
    this.muzzle.updateWorldMatrix(true, false);
    out.setFromMatrixPosition(this.muzzle.matrixWorld).project(camera);
    return true;
  }

  /** The sim's state: seconds into a reload (−1: none) and whether it began empty, bullets in it. */
  sync(reload: number, empty: boolean, mag: number) {
    this.reload = reload;
    this.empty = empty;
    this.mag = mag;
  }

  private get reloadK(): number {
    return this.reload < 0 ? -1 : Math.min(1, this.reload / reloadTime(this.empty));
  }

  /** A shot left `left` bullets in it. */
  shot(left: number) {
    this.kickV += KICK.up * (0.85 + 0.3 * Math.random());
    this.backV += KICK.back;
    this.sinceShot = 0;
    this.slide = 1;
    this.locked = left === 0;
    const p = this.parts;
    if (!p?.ejector) return;
    p.ejector.updateWorldMatrix(true, false);
    p.ejector.getWorldPosition(this.a);
    const m = p.ejector.matrixWorld;
    // The gun's right (+z), up the grip (+y) and back along the sights, in the arms' scene.
    this.b.set(0, 0, 1).transformDirection(m);
    this.c.set(0, 1, 0).transformDirection(m);
    this.d.copy(this.line).transformDirection(m).negate();
    this.fx.shot(this.a, this.b, this.c, this.d);
  }

  /** The reload's beats. */
  magOut() {
    const mag = this.parts?.mag;
    if (!mag) return;
    mag.updateWorldMatrix(true, false);
    this.a.set(0, -1, 0).transformDirection(mag.matrixWorld);
    this.fx.dropMag(mag, this.a);
  }

  slideHome() {
    this.locked = false;
    this.kickV += KICK.up * 0.35;
  }

  throwStart() {
    this.throwing = 0;
  }

  /** Update 0.2.6 — right click: a whip begins. */
  whip() {
    this.whipping = 0;
  }

  /** The right arm's pose holding it (model space). */
  pose(rig: ArmsRig, out: ArmPose): ArmPose {
    this.sight.copy(HIP.sight);
    this.target.copy(HIP.aim);
    let roll = HIP.roll;
    this.a.copy(HIP.elbow);
    // Breathing.
    this.sight.y += Math.sin(this.time * 1.7) * 0.0025;
    roll += Math.sin(this.time * 1.1) * 0.012;
    this.along.subVectors(this.target, this.sight).normalize();
    const r = this.reloadK;
    const key =
      r >= 0
        ? keyAt(this.empty ? RELOAD_EMPTY : RELOAD, r, this.key)
        : this.throwing >= 0
          ? keyAt(THROW, Math.min(1, this.throwing / Math.max(0.01, WEAPONS.v.throwWindup)), this.key)
          : this.whipping >= 0
            ? keyAt(WHIP, Math.min(1, this.whipping / WHIP_TIME), this.key)
            : null;
    if (key) {
      this.sight.x += key.move[0];
      this.sight.y += key.move[1];
      this.sight.z += key.move[2];
      this.along.applyQuaternion(this.turn.setFromAxisAngle(VIEW_X, THREE.MathUtils.degToRad(key.up)));
      this.along.applyQuaternion(this.turn.setFromAxisAngle(VIEW_Y, THREE.MathUtils.degToRad(key.left)));
      roll += THREE.MathUtils.degToRad(key.roll);
    }
    const s = gunFrame(this.sight, this.along, roll, this.kick, this.back, this.rear, this.slope, this.scale, this.a, this.sp);
    viewToModel(s.grip, rig.eye);
    viewToModel(s.blade, null);
    viewToModel(s.edge, null);
    viewToModel(s.elbow, null);
    this.elbow.copy(s.elbow);
    return rig.gripPose(s, out);
  }

  /** Its size in the hand. */
  get scale(): number {
    return ARMS.v.weaponScale * GUN.v.pistolSize;
  }

  /** The gun's matrix under the hand's bone (once the arm is posed). */
  matrix(rig: ArmsRig, into: THREE.Matrix4): THREE.Matrix4 {
    return rig.holdMatrix(this.slope, this.scale, 0, into);
  }

  /** The fingers' lean round its grip (armsRig.openHand's tilt). */
  get tilt(): number {
    return this.slope;
  }

  /** Springs, parts and touches. */
  update(dt: number) {
    this.time += dt;
    this.sinceShot += dt;
    if (this.throwing >= 0) this.throwing += dt;
    if (this.whipping >= 0) this.whipping = this.whipping + dt >= WHIP_TIME ? -1 : this.whipping + dt;
    this.kickV += (-KICK.k * this.kick - KICK.c * this.kickV) * dt;
    this.kick += this.kickV * dt;
    this.backV += (-KICK.k * this.back - KICK.c * this.backV) * dt;
    this.back += this.backV * dt;
    const r = this.reloadK;
    // The slide stays back on an empty magazine until a reload from empty lets it go.
    const held = this.mag === 0 || (r >= 0 && this.empty && r < SLIDE_HOME) || this.locked;
    if (r >= SLIDE_HOME || (r < 0 && this.mag > 0)) this.locked = false;
    const back = held || this.sinceShot < SLIDE.hold;
    this.slide = back ? 1 : this.slide * Math.exp(-SLIDE.rate * dt);
    this.fx.update(dt);
    const p = this.parts;
    if (!p) return;
    p.slide?.position.copy(p.rest.slide).addScaledVector(this.line, -SLIDE.travel * this.slide);
    p.trigger?.position.copy(p.rest.trigger).addScaledVector(this.line, this.sinceShot < TRIGGER.hold ? -TRIGGER.travel : 0);
    if (p.mag) {
      // Out between its beats; going in, it slides up the grip.
      p.mag.visible = !(r >= MAG_OUT && r < MAG_IN);
      const seat = r >= MAG_IN ? Math.min(1, (r - MAG_IN) / 0.06) : 1;
      p.mag.position.copy(p.rest.mag).y -= 0.04 * (1 - smooth(seat));
    }
  }

  clear() {
    this.fx.clear();
    this.throwing = this.whipping = -1;
    this.kick = this.kickV = this.back = this.backV = 0;
  }
}
