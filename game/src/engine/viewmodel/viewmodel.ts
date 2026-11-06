// M1 step 6 — the first-person arms: their own little scene and camera (drawn over the world after a depth clear,
// so they never poke into walls and FOV kicks never stretch them), the guard, punches, mouse sway, run bob,
// landing dip, and the dash and slide poses.
// M2 — holding a weapon, the arms change over: the left drops out of view and the right holds the sword, its grip through the curled fingers, posed from where the sword should be
// (swordAnim.ts: ready, slashes, the pierce and its charge, the throw).
// Update 0.0.13 — kneeling at a chest, both fists reach for the lid and lift it (chestReach.ts); a held weapon is put
// out of sight meanwhile.
// Update 0.0.16 — in front of a chest, the left hand comes up palm open with the key you'll use (palm.ts).
// Update 0.1.4 — holding the Grimoire, both hands hold it: the book open on the right palm, fire on the left (bookArms.ts).
// Update 0.1.1 — in an execution, the hands do its moves (heldGrip.ts: gripping, punching, pressing, open or shut),
// wrists bent to the grip. (Update 0.1.2: every execution's.)
// Update 0.1.5 — each weapon plays its own moves (weaponMoves.ts); the Hammer is held in both hands (twoHand.ts). The
// fists' pose moved to fistArm.ts.
// Update 0.1.9 — the Dual Daggers: one in each hand; the left plays its own moves and holds the second (offHand.ts).
// The sway, bob and dips moved to armsMotion.ts.
// Update 0.2.4 — the Pistol: the right arm follows the gun's pose (gunArms.ts), the left out of view.
// Update 0.3.5 — barehanded, right click raises the fists into a block (blockArms.ts): the parry. Update 0.3.6 — the
// right fist only, a quick move.
// Update 0.3.70 — the Playable Demon (design bible): its own arms, its blade in the hand whenever nothing else is. They're
// fetched only for it (armsWardrobe.ts), so nobody else pays for them. Left click swings the blade, right click raises it.
import * as THREE from 'three';
import { ARMS } from '../../tuning/arms';
import { WEAPONS } from '../../tuning/weapons';
import type { PlayerState } from '../../sim/player/state';
import type { ArmsRig } from './armsRig';
import { ArmsAnim, PunchStyle } from './armsAnim';
import { mixArm, pose } from './armsMath';
import { ArmsMotion } from './armsMotion';
import { swordArm } from './swordArm';
import { fistArm } from './fistArm';
import { leftGrip } from './twoHand';
import { SlamArms } from './slamArms';
import { BlockArms } from './blockArms';
import { movesOf } from './weaponMoves';
import { ArmsWardrobe } from './armsWardrobe';
import { ChestReach } from './chestReach';
import { BookArms } from './bookArms';
import { HeldGrip, ROPE } from './heldGrip';
import { GUARD, Side } from './guard';
import { KeyPalm } from './palm';
import { OffHand } from './offHand';
import { holdWeapon, turnOpen, wrapOf } from './tipHold';
import { SwordAnim, SwordMove } from './swordAnim';
import { GUN_GRIP, GunArms } from './gunArms';
import { emptySword } from './swordPoses';

export { ARMS_URL, DEMON_ARMS_URL, DEMON_BLADE_URL } from './armsWardrobe';
/** How fast the charge draw-back follows the charge (per second). */
const CHARGE_EASE = 14;
/** Update 0.1.9 — how far a hand opens as it throws a dagger (0 … 1). */
const RELEASE = 0.6;

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
  readonly book = new BookArms(this.scene);
  /** Update 0.1.7 — the ground slam's clasped fists. */
  readonly slam = new SlamArms();
  readonly block = new BlockArms(this.anim);
  /** Update 0.1.9 — the left hand's own weapon (the Dual Daggers' second). */
  readonly off = new OffHand();
  readonly gun = new GunArms(this.scene);
  private readonly gunPose = pose();
  private readonly slamPose = { L: pose(), R: pose() };
  private readonly bookPose = pose();
  private readonly knuckleL = new THREE.Vector3();
  private readonly knuckleR = new THREE.Vector3();
  private readonly pivot = new THREE.Object3D();
  private readonly holder = new THREE.Object3D();
  private rig: ArmsRig | null = null;
  private readonly live = { L: pose(), R: pose() };
  private readonly swordArm = pose();
  /** The right hand's weapon's pose this frame (model space, once posed). */
  readonly swordPose = emptySword();
  private readonly twoPose = pose();
  private readonly elbow = new THREE.Vector3();
  private readonly elbowL = new THREE.Vector3();
  private readonly toStrike = new THREE.Vector3();
  private readonly motion = new ArmsMotion();
  private chargeVis = 0;
  /** M2 — 0 barehanded … 1 holding a weapon (the arms changing over in between). */
  private armedVis = 0;
  /** Update 0.1.9 — 0 … 1: the daggers turned over to be held by the tip (while a volley charges and throws); the arms'
   *  clock until which they're held still (a volley being thrown: the designer, no trembling then). */
  private flip = 0;
  private steadyUntil = 0;
  private time = 0;
  private weapon: THREE.Object3D | null = null;
  /** Update 0.3.70 — whose arms you have on (armsWardrobe.ts). */
  private readonly wardrobe: ArmsWardrobe;

  /** `loadModel`: fetch the arms (tests attach a parsed model instead). `demon`: the Demon's (Update 0.3.70). */
  constructor(loadModel = true, demon = false) {
    this.scene.add(new THREE.HemisphereLight(0xcfc6dd, 0x2a2026, 1.1));
    const key = new THREE.DirectionalLight(0xffe2c8, 1.6);
    key.position.set(-1, 2, 1.5);
    this.scene.add(key, this.camera, this.palm.holder);
    this.camera.add(this.pivot);
    this.pivot.add(this.holder);
    // The model faces +z; the camera looks down −z.
    this.holder.rotation.y = Math.PI;
    this.wardrobe = new ArmsWardrobe(
      loadModel,
      (rig) => this.attach(rig),
      (old) => this.setWeapon(this.weapon === old ? null : this.weapon),
    );
    this.wardrobe.dress(demon);
  }

  /** Update 0.3.70 — whose arms: the Demon's with its blade (`on`) or Joseph's. */
  setDemon(on: boolean) {
    if (on !== this.wardrobe.demon) this.wardrobe.dress(on);
  }

  get isDemon() {
    return this.wardrobe.demon;
  }

  /** Update 0.3.70 — the Demon's blade, in the hand whenever nothing else is (tests give it parsed). */
  holdBlade(model: THREE.Object3D) {
    this.wardrobe.hold(model);
  }

  attach(rig: ArmsRig) {
    if (this.rig && this.rig !== rig) this.rig.root.removeFromParent();
    this.rig = rig;
    this.wardrobe.keep(rig);
    this.holder.add(rig.root);
    if (this.weapon) rig.holdBone().add(this.weapon);
    this.off.attach(rig);
  }

  /** M2 — the weapon in the right fist (null: barehanded). A new one starts in the ready pose. */
  setWeapon(given: THREE.Object3D | null) {
    // (Update 0.3.70 — nothing else in the hand: the Demon's blade.)
    const model = given ?? this.wardrobe.blade;
    if (this.weapon === model) return;
    this.weapon?.removeFromParent();
    if (model) this.swordAnim.use(movesOf(model));
    if (model && !this.weapon) this.swordAnim.reset();
    this.off.take(model?.userData.pair ?? null, model ? movesOf(model).pair : null);
    this.gun.use(model?.userData.hold === 'gun' ? model : null);
    this.weapon = model;
    if (!model) return;
    model.matrixAutoUpdate = false;
    this.rig?.holdBone().add(model);
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
    return this.rig !== null && this.wardrobe.ready;
  }

  /** The Demon's blade is in the hand (its fists' moves are the blade's). */
  private get bladed() {
    return this.wardrobe.blade !== null && this.weapon === this.wardrobe.blade;
  }

  /** A punch was thrown. (Update 0.3.70 — with the Demon's blade in the hand, a swing.) */
  punch(side: Side, style: PunchStyle) {
    if (this.bladed) this.slash();
    else this.anim.punch(side, style);
  }

  /** Right click pressed, the parry: the right fist snaps up (Update 0.3.70 — or the Demon's blade). */
  guard() {
    if (this.bladed) this.swordAnim.start('guard');
    else this.block.raise();
  }

  /** M2 — the sword arm's next move. */
  sword(move: SwordMove) {
    if (move === 'throw' && this.weapon?.userData.hold === 'gun') this.gun.throwStart();
    this.swordAnim.start(move);
    if (this.off.active) this.off.start(move);
  }

  /** Update 0.1.9 — a dagger of the volley thrown by `hand` (0 right, 1 left). */
  toss(hand: number) {
    // (Still till the next throw is well due, either hand's: the stream is on.)
    this.steadyUntil = this.time + 2 * WEAPONS.v.volleyInterval + 0.1;
    if (hand === 1) this.off.start('toss');
    else this.swordAnim.start('toss');
  }

  /** M2 — a slash: the arm picks forehand or backhand from where the sword is. (Update 0.1.9 — a pair's hands take
   *  turns.) */
  slash() {
    if (!this.off.active || !this.off.slash()) this.swordAnim.slash();
  }

  /** A landing at `speed` m/s dips the arms. */
  land(speed: number) {
    this.motion.land(speed);
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
    this.off.anim.update(gameDt, realDt);
    this.slam.follow(p.slamming);
    this.slam.update(gameDt);
    this.block.update(gameDt);
    this.motion.update(gameDt, realDt, mouseDx, mouseDy, p, this.pivot, this.holder);
    this.gun.update(gameDt);
    this.armedVis = Math.max(0, Math.min(1, this.armedVis + ((this.weapon ? 1 : -1) * gameDt) / v.armedSwap));
    this.flip = Math.max(0, Math.min(1, this.flip + ((charge >= 0 ? 1 : -1) * gameDt) / v.daggerFlip));

    // Update 0.0.3 — the charge draw-back eases in and out, so a cancelled charge glides back to the guard.
    this.chargeVis += ((charge >= 0 ? charge : 0) - this.chargeVis) * ease(CHARGE_EASE, gameDt);
    const rig = this.rig;
    if (!rig) return;
    // The holder puts the model's eye at the camera.
    this.holder.position.add(this.toStrike.set(rig.eye.x, -rig.eye.y, rig.eye.z));
    const reach = Math.max(this.chest.weight, this.grip.weight);
    if (this.chest.weight > 0) this.chest.aimed();
    const armed = smooth(this.armedVis) * (1 - reach);
    const book = this.weapon?.userData.hold === 'book' ? armed : 0;
    const gun = this.weapon?.userData.hold === 'gun' ? armed : 0;
    const palm = this.palm.mix;
    // A weapon in the right fist (posed first: a two-handed one's haft is where the left hand goes).
    const tremble = this.time < this.steadyUntil ? 0 : charge >= 1 ? 2 : 1;
    const held = book === 0 && gun === 0 && armed > 0 ? swordArm(rig, this.swordAnim, this.chargeVis, tremble, this.time, this.swordPose, this.swordArm) : null;
    const hands = held && this.swordAnim.moves.hands() !== 0 ? armed * (1 - palm) : 0;
    // (Put away, the second dagger's arm eases back to the guard, as the hammer's left hand does.)
    const pair = held && this.swordAnim.moves.pair ? armed * (1 - palm) : 0;
    const left = fistArm(rig, this.anim, this.time, 'L', this.chargeVis, charge >= 1, (armed - book - hands - pair) * (1 - palm), this.live.L);
    if (book > 0) mixArm(left, this.book.pose(rig, 'L', this.bookPose), book, left);
    if (hands > 0) mixArm(left, leftGrip(rig, this.swordPose, this.swordAnim.moves.hands(), this.twoPose), hands, left);
    if (pair > 0) mixArm(left, this.off.pose(rig, this.chargeVis, tremble, this.time), pair, left);
    // (Update 0.1.7 — barehanded, a slam's clasped fists.)
    const clasp = this.slam.weight * (1 - armed) * (1 - reach);
    if (clasp > 0) mixArm(left, this.slam.pose(rig, 'L', this.slamPose.L), clasp, left);
    const blocking = (1 - armed) * (1 - palm) * (1 - reach) * (1 - clasp);
    if (palm > 0) mixArm(left, this.palm.pose(rig), palm, left);
    if (reach > 0) this.chest.pull(rig, 'L', left, reach, this.grip, this.holder, this.camera);
    rig.apply('L', left, v.wristBend + (1 - v.wristBend) * Math.max(palm, book, hands, pair, clasp, this.grip.bend('L')), this.off.pole(pair, this.elbowL));
    // (Update 0.1.6 — a fist, or the fingers round a two-handed haft, its own handle or something an execution holds:
    // handPose.ts.)
    const moves = this.swordAnim.moves;
    const wrap = pair > 0 ? wrapOf(this.off.moves, this.flip) : hands > 0 ? moves.grip() : ROPE;
    rig.openHand('L', Math.max(palm, book * this.book.open('L'), this.grip.open('L'), pair * Math.max(RELEASE * this.off.anim.letGo, turnOpen(this.off.moves, this.flip))), wrap, Math.max(hands, pair) || this.grip.rope('L'), pair > 0 ? this.off.sword.tilt : this.swordPose.tilt);
    const right = fistArm(rig, this.anim, this.time, 'R', this.chargeVis, charge >= 1, armed, this.live.R);
    if (book > 0) {
      mixArm(right, this.book.pose(rig, 'R', this.bookPose), book, right);
      rig.apply('R', right, v.wristBend + (1 - v.wristBend) * book);
    } else if (held) {
      mixArm(right, held, armed, right);
      this.elbow.copy(GUARD.R.pole).lerp(this.swordPose.elbow, armed);
      rig.apply('R', right, v.wristBend + (1 - v.wristBend) * armed, this.elbow);
    } else if (gun > 0) {
      mixArm(right, this.gun.pose(rig, this.gunPose), gun, right);
      rig.apply('R', right, v.wristBend + (1 - v.wristBend) * gun, this.elbow.copy(GUARD.R.pole).lerp(this.gun.elbow, gun));
    } else {
      if (clasp > 0) mixArm(right, this.slam.pose(rig, 'R', this.slamPose.R), clasp, right);
      if (reach > 0) this.chest.pull(rig, 'R', right, reach, this.grip, this.holder, this.camera);
      this.block.mix(rig, right, blocking);
      rig.apply('R', right, v.wristBend + (1 - v.wristBend) * Math.max(clasp, this.grip.bend('R')), this.block.pole(this.elbow.copy(GUARD.R.pole), blocking));
    }
    rig.openHand('R', Math.max(book * this.book.open('R'), this.grip.open('R'), held ? Math.max(RELEASE * this.swordAnim.letGo, turnOpen(moves, this.flip)) : 0), held ? wrapOf(moves, this.flip) : gun > 0 ? GUN_GRIP : ROPE, held ? armed : gun || this.grip.rope('R'), held ? this.swordPose.tilt : gun > 0 ? this.gun.tilt : undefined);
    if (this.weapon) {
      this.weapon.visible = reach < 0.2 && !this.swordAnim.empty;
      if (book > 0) this.book.bookMatrix(rig, this.weapon.matrix);
      else if (gun > 0) this.gun.matrix(rig, this.weapon.matrix);
      else holdWeapon(rig, moves, this.swordPose.tilt, this.flip, this.weapon.matrix);
      this.weapon.matrixWorldNeedsUpdate = true;
    }
    this.off.place(rig, reach < 0.2 && palm < 0.2, this.flip);
    this.camera.updateMatrixWorld(true);
    this.book.update(gameDt, book, rig, this.camera);
    this.palm.place(rig);
    if (this.chest.weight > 0) this.chest.settle(this.camera.worldToLocal(rig.knuckle('L', this.knuckleL)), this.camera.worldToLocal(rig.knuckle('R', this.knuckleR)));
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
    this.off.reset();
    this.book.clear();
    this.slam.reset();
    this.block.reset();
    this.gun.clear();
    this.armedVis = this.weapon ? 1 : 0;
    this.motion.reset();
    this.chargeVis = this.flip = this.steadyUntil = 0;
  }
}
