// M1 step 6 — the first-person arms: their own little scene and camera (drawn over the world after a depth clear,
// so they never poke into walls and FOV kicks never stretch them), the guard, punches, mouse sway, run bob,
// landing dip, and the dash and slide poses.
// M2 — holding a weapon, the arms change over: the left drops out of view and the right holds the sword, its grip through the curled fingers, posed from where the sword should be
// (swordAnim.ts: ready, slashes, the pierce and its charge, the throw).
// Update 0.0.13 — kneeling at a chest, both fists reach for the lid and lift it (chestReach.ts); a held weapon is put
// out of sight meanwhile.
// Update 0.0.16 — in front of a chest, the left hand comes up palm open with the key you'll use (palm.ts).
// Update 0.1.1 — in an execution, both hands hold the tail (heldGrip.ts), wrists bent to the grip.
import * as THREE from 'three';
import { ARMS } from '../../tuning/arms';
import type { PlayerState } from '../../sim/player/state';
import { flatSpeed } from '../../sim/player/state';
import { ArmPose, ArmsRig } from './armsRig';
import { ArmsAnim, PunchStyle } from './armsAnim';
import { mixArm, pose, PREVIEW_PITCH, viewToModel } from './armsMath';
import { ChestReach } from './chestReach';
import { HeldGrip } from './heldGrip';
import { FORWARD, GUARD, REST_BACK, Side } from './guard';
import { KeyPalm } from './palm';
import { SwordAnim, SwordMove } from './swordAnim';
import { emptySword } from './swordPoses';

export const ARMS_URL = '/models/arms/adventurer.glb';
/** Punches aim a little below the eye line and spread apart so the two fists don't meet in the middle (m). */
const STRIKE_DROP = 0.06;
const STRIKE_SPREAD = 0.05;
const MAX_SWAY = 0.08;
/** How fast the charge draw-back follows the charge (per second). */
const CHARGE_EASE = 14;
/** M2 — the left arm out of view: its fist this far down and back from the guard (model space), pointing down. */
const LOWERED = new THREE.Vector3(0.04, -0.42, -0.12);
const LOWERED_KNUCKLES = new THREE.Vector3(0, -1, 0.25).normalize();

const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const smooth = (x: number) => x * x * (3 - 2 * x);

export class Viewmodel {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.01, 10);
  readonly anim = new ArmsAnim();
  readonly swordAnim = new SwordAnim();
  readonly chest = new ChestReach();
  readonly grip = new HeldGrip();
  readonly palm = new KeyPalm();
  private readonly reachPose = pose();
  private readonly knuckleL = new THREE.Vector3();
  private readonly knuckleR = new THREE.Vector3();
  private readonly pivot = new THREE.Object3D();
  private readonly holder = new THREE.Object3D();
  private rig: ArmsRig | null = null;
  private readonly guardPose = { L: pose(), R: pose() };
  private readonly live = { L: pose(), R: pose() };
  private readonly swordArm = pose();
  private readonly swordPose = emptySword();
  private readonly elbow = new THREE.Vector3();
  private readonly strike = new THREE.Vector3();
  private readonly toStrike = new THREE.Vector3();
  private swayX = 0;
  private swayY = 0;
  private bobPhase = 0;
  private bobAmount = 0;
  private dipY = 0;
  private dipV = 0;
  private pullZ = 0;
  private dropY = 0;
  private chargeVis = 0;
  /** M2 — 0 barehanded … 1 holding a weapon (the arms changing over in between). */
  private armedVis = 0;
  private time = 0;
  private weapon: THREE.Object3D | null = null;

  /** `loadModel`: fetch the arms (tests attach a parsed model instead). */
  constructor(loadModel = true) {
    this.scene.add(new THREE.HemisphereLight(0xcfc6dd, 0x2a2026, 1.1));
    const key = new THREE.DirectionalLight(0xffe2c8, 1.6);
    key.position.set(-1, 2, 1.5);
    this.scene.add(key, this.camera, this.palm.holder);
    this.camera.add(this.pivot);
    this.pivot.add(this.holder);
    // The model faces +z; the camera looks down −z.
    this.holder.rotation.y = Math.PI;
    if (loadModel) {
      void ArmsRig.load(ARMS_URL)
        .then((rig) => this.attach(rig))
        .catch((err) => console.error('arms failed to load', err));
    }
  }

  attach(rig: ArmsRig) {
    this.rig = rig;
    this.holder.add(rig.root);
    if (this.weapon) rig.holdBone.add(this.weapon);
  }

  /** M2 — the weapon in the right fist (null: barehanded). A new one starts in the ready pose. */
  setWeapon(model: THREE.Object3D | null) {
    if (this.weapon === model) return;
    this.weapon?.removeFromParent();
    if (model && !this.weapon) this.swordAnim.reset();
    this.weapon = model;
    if (!model) return;
    model.matrixAutoUpdate = false;
    this.rig?.holdBone.add(model);
  }

  get armed() {
    return this.weapon !== null;
  }

  /** M2 — the held weapon (in this scene, which is the arms camera's space), or null. */
  get heldWeapon(): THREE.Object3D | null {
    return this.weapon;
  }

  /** The arms camera's lens for a screen of this aspect (vertical FOV from the Arms tuning). */
  setLens(aspect: number) {
    const fov = ARMS.v.fov;
    if (this.camera.fov !== fov || this.camera.aspect !== aspect) {
      this.camera.fov = fov;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
  }

  get loaded() {
    return this.rig !== null;
  }

  /** A punch was thrown. */
  punch(side: Side, style: PunchStyle) {
    this.anim.punch(side, style);
  }

  /** M2 — the sword arm's next move. */
  sword(move: SwordMove) {
    this.swordAnim.start(move);
  }

  /** M2 — a slash: the arm picks forehand or backhand from where the sword is. */
  slash() {
    this.swordAnim.slash();
  }

  /** A landing at `speed` m/s dips the arms. */
  land(speed: number) {
    this.dipV -= Math.min(0.12, speed * ARMS.v.landDip) * 18;
  }

  /**
   * `gameDt` stops during hit-stop (the fist freezes on impact); `realDt` never does (sway follows the mouse).
   * `mouseDx/Dy`: this frame's mouse movement (px). `charge`: the right fist's charge, 0..1 (−1 when not charging).
   */
  update(gameDt: number, realDt: number, mouseDx: number, mouseDy: number, p: PlayerState, charge: number) {
    this.time += gameDt;
    const v = ARMS.v;
    this.anim.update(gameDt);
    this.swordAnim.update(gameDt, realDt);

    // Sway: the arms trail the mouse a little, then catch up. Turning right swings them left (+y turn);
    // looking up drops them (−x turn; mouse up is negative movementY).
    this.swayX = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, (this.swayX + mouseDx * v.sway) * (1 - ease(v.swayReturn, realDt))));
    this.swayY = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, (this.swayY + mouseDy * v.sway) * (1 - ease(v.swayReturn, realDt))));
    // Bob while running on the ground.
    const speed = flatSpeed(p);
    const running = p.grounded && !p.sliding && p.dashTime <= 0 && speed > 1;
    this.bobAmount += ((running ? Math.min(1, speed / 12) : 0) - this.bobAmount) * ease(8, gameDt);
    this.bobPhase += speed * gameDt * v.bobRate * Math.PI;
    // Landing dip spring, dash pull and slide drop.
    this.dipV += (-140 * this.dipY - 16 * this.dipV) * gameDt;
    this.dipY += this.dipV * gameDt;
    this.pullZ += ((p.dashTime > 0 ? v.dashPull : 0) - this.pullZ) * ease(14, gameDt);
    this.dropY += ((p.sliding ? v.slideDrop : 0) - this.dropY) * ease(10, gameDt);
    this.armedVis = Math.max(0, Math.min(1, this.armedVis + ((this.weapon ? 1 : -1) * gameDt) / v.armedSwap));

    this.pivot.rotation.set(PREVIEW_PITCH + this.swayY, this.swayX, 0);
    const bob = Math.sin(this.bobPhase) * v.bob * this.bobAmount;
    this.holder.position.set(v.viewX + bob * 0.5, v.viewY - Math.abs(bob) + this.dipY - this.dropY, v.viewZ + this.pullZ);

    // Update 0.0.3 — the charge draw-back eases in and out, so a cancelled charge glides back to the guard.
    this.chargeVis += ((charge >= 0 ? charge : 0) - this.chargeVis) * ease(CHARGE_EASE, gameDt);
    const rig = this.rig;
    if (!rig) return;
    // The holder puts the model's eye at the camera.
    this.holder.position.add(this.toStrike.set(rig.eye.x, -rig.eye.y, rig.eye.z));
    const reach = Math.max(this.chest.weight, this.grip.weight);
    if (this.chest.weight > 0) this.chest.aimed();
    const armed = smooth(this.armedVis) * (1 - reach);
    const palm = this.palm.mix;
    const left = this.poseArm(rig, 'L', this.chargeVis, charge >= 1, armed * (1 - palm));
    if (palm > 0) mixArm(left, this.palm.pose(rig), palm, left);
    if (reach > 0) this.toChest(rig, 'L', left, reach);
    rig.apply('L', left, v.wristBend + (1 - v.wristBend) * Math.max(palm, this.grip.weight));
    rig.openHand('L', palm);
    const right = this.poseArm(rig, 'R', this.chargeVis, charge >= 1, armed);
    if (armed > 0) {
      mixArm(right, this.poseSword(rig, charge >= 1), armed, right);
      this.elbow.copy(GUARD.R.pole).lerp(this.swordPose.elbow, armed);
      rig.apply('R', right, v.wristBend + (1 - v.wristBend) * armed, this.elbow);
    } else {
      if (reach > 0) this.toChest(rig, 'R', right, reach);
      rig.apply('R', right, v.wristBend + (1 - v.wristBend) * this.grip.weight);
    }
    if (this.weapon) {
      this.weapon.visible = reach < 0.2;
      rig.holdMatrix(this.swordPose.tilt, v.weaponScale, v.swordGripSlide, this.weapon.matrix);
      this.weapon.matrixWorldNeedsUpdate = true;
    }
    this.camera.updateMatrixWorld(true);
    this.palm.place(rig);
    if (this.chest.weight > 0) this.chest.settle(this.camera.worldToLocal(rig.knuckle('L', this.knuckleL)), this.camera.worldToLocal(rig.knuckle('R', this.knuckleR)));
  }

  /** The fists' pose for one arm. `charge`: how far the right fist is drawn back (0..1); `ready`: the charge is full
   *  (it trembles harder). `armed`: how far the left arm has dropped out of view (M2). */
  private poseArm(rig: ArmsRig, side: Side, charge: number, ready: boolean, armed: number): ArmPose {
    const g = this.guardPose[side];
    const out = this.live[side];
    rig.guard(side, g);
    if (side === 'L' && armed > 0) {
      g.fist.addScaledVector(LOWERED, armed);
      g.knuckles.lerp(LOWERED_KNUCKLES, armed).normalize();
    }
    const e = this.anim.extension(side);
    // Where a punch aims: at the crosshair (the arms are tilted up by PREVIEW_PITCH, so aim that much lower in
    // the model), a little low, a little to this fist's side.
    const d = ARMS.v.strikeDistance;
    this.strike.copy(rig.eye).addScaledVector(FORWARD, d * Math.cos(PREVIEW_PITCH));
    this.strike.y -= d * Math.sin(PREVIEW_PITCH) + STRIKE_DROP;
    this.strike.x += side === 'L' ? STRIKE_SPREAD : -STRIKE_SPREAD;
    out.fist.copy(g.fist).lerp(this.strike, Math.max(e, 0));
    if (e < 0) out.fist.addScaledVector(this.toStrike.subVectors(g.fist, this.strike).normalize(), -e * 0.1);
    out.knuckles.copy(g.knuckles).lerp(this.toStrike.subVectors(this.strike, rig.between).normalize(), Math.max(e, 0)).normalize();
    out.back.copy(g.back).normalize().lerp(REST_BACK, Math.max(e, 0));
    // A charging right fist draws back and trembles, harder once the charge is full.
    if (side === 'R' && charge > 0.001) {
      const t = this.time * 60;
      const shake = ARMS.v.chargeTremble * charge * (ready ? 2 : 1);
      out.fist.addScaledVector(this.toStrike.subVectors(g.fist, this.strike).normalize(), ARMS.v.chargePull * charge);
      out.fist.x += Math.sin(t * 1.7) * shake;
      out.fist.y += Math.sin(t * 2.3 + 1) * shake;
    }
    return out;
  }

  /** Update 0.0.13 — one fist towards its spot on the chest's lid by `k`: knuckles ahead, the back of the hand up. The
   *  spot is on screen, so it's carried into the model exactly (through the camera, the tilt and the holder). */
  private toChest(rig: ArmsRig, side: Side, out: ArmPose, k: number) {
    const r = this.reachPose;
    this.camera.updateMatrixWorld(true);
    if (this.grip.weight > 0) return mixArm(out, this.grip.pose(rig, side, this.holder, this.camera, r), smooth(k), out);
    this.holder.worldToLocal(this.camera.localToWorld(r.fist.copy(this.chest.aim[side])));
    r.knuckles.subVectors(r.fist, rig.between).normalize();
    r.back.set(0, 1, 0);
    mixArm(out, r, smooth(k), out);
  }

  /** M2 — the right arm holding the sword where the sword arm's move has it (a charging pierce trembles too). */
  private poseSword(rig: ArmsRig, ready: boolean): ArmPose {
    const v = ARMS.v;
    const s = this.swordAnim.pose(this.chargeVis, this.swordPose);
    s.grip.x += v.swordSide;
    s.grip.y += v.swordUp;
    s.grip.z -= v.swordForward;
    if (this.chargeVis > 0.001 && this.swordAnim.current === 'ready') {
      const t = this.time * 60;
      const shake = v.chargeTremble * this.chargeVis * (ready ? 2 : 1);
      s.grip.x += Math.sin(t * 1.7) * shake;
      s.grip.y += Math.sin(t * 2.3 + 1) * shake;
    }
    viewToModel(s.grip, rig.eye);
    viewToModel(s.blade, null);
    viewToModel(s.edge, null);
    viewToModel(s.elbow, null);
    return rig.gripPose(s, this.swordArm);
  }

  /** Draws the arms over the world already on screen: depth cleared, colour kept. */
  render(renderer: THREE.WebGLRenderer, aspect: number) {
    this.setLens(aspect);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = autoClear;
  }

  /** Reacts to a punch event by kind. */
  static styleFor(kind: 'jabL' | 'jabR' | 'heavy'): [Side, PunchStyle] {
    if (kind === 'jabL') return ['L', 'jab'];
    if (kind === 'jabR') return ['R', 'jab'];
    return ['R', 'heavy'];
  }

  reset() {
    this.anim.reset();
    this.swordAnim.reset();
    this.armedVis = this.weapon ? 1 : 0;
    this.swayX = this.swayY = this.dipY = this.dipV = this.pullZ = this.dropY = this.chargeVis = 0;
  }
}
