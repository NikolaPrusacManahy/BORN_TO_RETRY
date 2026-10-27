// M1 step 6 — the first-person arms: their own little scene and camera (drawn over the world after a depth clear,
// so they never poke into walls and FOV kicks never stretch them), the guard, punches, mouse sway, run bob,
// landing dip, and the dash and slide poses.
// M2 — a held weapon in the right fist (hung off the hand bone, held as the Arms tab's weapon knobs say), and its
// slashes: the fist sweeps across the view (forehand: from up right down to the left; backhand: back).
import * as THREE from 'three';
import { ARMS } from '../../tuning/arms';
import type { PlayerState } from '../../sim/player/state';
import { flatSpeed } from '../../sim/player/state';
import { ArmPose, ArmsRig } from './armsRig';
import { ArmsAnim, PunchStyle } from './armsAnim';
import { FORWARD, REST_BACK, Side } from './guard';

export const ARMS_URL = '/models/arms/adventurer.glb';
/** The approved previews looked ~10° down at the guard; the arms tilt up by the same so the game frames it alike. */
const PREVIEW_PITCH = Math.atan(0.18);
/** Punches aim a little below the eye line and spread apart so the two fists don't meet in the middle (m). */
const STRIKE_DROP = 0.06;
const STRIKE_SPREAD = 0.05;
const MAX_SWAY = 0.08;
/** How fast the charge draw-back follows the charge (per second). */
const CHARGE_EASE = 14;

const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

function pose(): ArmPose {
  return { fist: new THREE.Vector3(), knuckles: new THREE.Vector3(), back: new THREE.Vector3() };
}

export class Viewmodel {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.01, 10);
  readonly anim = new ArmsAnim();
  private readonly pivot = new THREE.Object3D();
  private readonly holder = new THREE.Object3D();
  private rig: ArmsRig | null = null;
  private readonly guardPose = { L: pose(), R: pose() };
  private readonly live = { L: pose(), R: pose() };
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
  private time = 0;
  private weapon: THREE.Object3D | null = null;
  private readonly sweep = new THREE.Vector3();

  /** `loadModel`: fetch the arms (tests attach a parsed model instead). */
  constructor(loadModel = true) {
    this.scene.add(new THREE.HemisphereLight(0xcfc6dd, 0x2a2026, 1.1));
    const key = new THREE.DirectionalLight(0xffe2c8, 1.6);
    key.position.set(-1, 2, 1.5);
    this.scene.add(key, this.camera);
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

  /** M2 — the weapon in the right fist (null: barehanded). */
  setWeapon(model: THREE.Object3D | null) {
    if (this.weapon === model) return;
    this.weapon?.removeFromParent();
    this.weapon = model;
    if (!model) return;
    model.matrixAutoUpdate = false;
    this.rig?.holdBone.add(model);
  }

  get armed() {
    return this.weapon !== null;
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

    this.pivot.rotation.set(PREVIEW_PITCH + this.swayY, this.swayX, 0);
    const bob = Math.sin(this.bobPhase) * v.bob * this.bobAmount;
    this.holder.position.set(v.viewX + bob * 0.5, v.viewY - Math.abs(bob) + this.dipY - this.dropY, v.viewZ + this.pullZ);

    // Update 0.0.3 — the charge draw-back eases in and out, so a cancelled charge glides back to the guard.
    this.chargeVis += ((charge >= 0 ? charge : 0) - this.chargeVis) * ease(CHARGE_EASE, gameDt);
    const rig = this.rig;
    if (!rig) return;
    // The holder puts the model's eye at the camera.
    this.holder.position.add(this.toStrike.set(rig.eye.x, -rig.eye.y, rig.eye.z));
    for (const side of ['L', 'R'] as const) this.poseArm(rig, side, this.chargeVis, charge >= 1);
    if (this.weapon) {
      // holdMatrix leans back and out (towards the back of the hand); forward and right are the opposite ways.
      rig.holdMatrix(-THREE.MathUtils.degToRad(v.weaponLeanForward), -THREE.MathUtils.degToRad(v.weaponLeanRight), v.weaponScale, this.weapon.matrix);
      this.weapon.matrixWorldNeedsUpdate = true;
    }
    this.camera.updateMatrixWorld(true);
  }

  /** `charge`: how far the right fist is drawn back (0..1); `ready`: the charge is full (it trembles harder). */
  private poseArm(rig: ArmsRig, side: Side, charge: number, ready: boolean) {
    const g = this.guardPose[side];
    const out = this.live[side];
    rig.guard(side, g);
    const e = this.anim.extension(side);
    // Where a punch aims: at the crosshair (the arms are tilted up by PREVIEW_PITCH, so aim that much lower in
    // the model), a little low, a little to this fist's side.
    const d = ARMS.v.strikeDistance;
    this.strike.copy(rig.eye).addScaledVector(FORWARD, d * Math.cos(PREVIEW_PITCH));
    this.strike.y -= d * Math.sin(PREVIEW_PITCH) + STRIKE_DROP;
    this.strike.x += side === 'L' ? STRIKE_SPREAD : -STRIKE_SPREAD;
    const style = this.anim.style(side);
    if (side === 'R' && (style === 'slashL' || style === 'slashR') && e > 0) return this.slash(rig, g, out, style === 'slashL', e);
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
    rig.apply(side, out);
  }

  /** M2 — a slash: the fist runs along a sweep across the view (screen right is model −x) as the swing goes out, its
   *  knuckles turned into the sweep so the blade cuts across. `forehand`: from up right down to the left. */
  private slash(rig: ArmsRig, g: ArmPose, out: ArmPose, forehand: boolean, e: number) {
    const w = ARMS.v.slashWidth;
    const k = Math.min(1, e);
    const fromX = forehand ? -w : w;
    const fromY = forehand ? 0.16 : -0.14;
    this.sweep.set(fromX + (-2 * fromX) * k, fromY + (-fromY - 0.02) * k, 0);
    this.strike.add(this.sweep);
    out.fist.copy(g.fist).lerp(this.strike, k);
    out.knuckles.copy(FORWARD).addScaledVector(this.sweep.set(forehand ? 1 : -1, forehand ? -0.4 : 0.4, 0), 0.9 * k).normalize();
    out.back.copy(g.back).normalize().lerp(REST_BACK, k);
    rig.apply('R', out);
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
  static styleFor(kind: 'jabL' | 'jabR' | 'heavy' | 'quick' | 'slashL' | 'slashR' | 'cleave'): [Side, PunchStyle] {
    if (kind === 'jabL') return ['L', 'jab'];
    if (kind === 'jabR') return ['R', 'jab'];
    if (kind === 'heavy' || kind === 'cleave') return ['R', 'heavy'];
    if (kind === 'slashL' || kind === 'slashR') return ['R', kind];
    return ['L', 'quick'];
  }

  reset() {
    this.anim.reset();
    this.swayX = this.swayY = this.dipY = this.dipV = this.pullZ = this.dropY = this.chargeVis = 0;
  }
}
