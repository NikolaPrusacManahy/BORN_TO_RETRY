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
// Update 0.3.73 — thrown, it's out of the hand and the gauntlets take over, both of them; heat burns on it (bladeHeat.ts); Last Verdict grows it (bladeGrow.ts).
// Update 0.3.74 — and takes both hands. Update 0.3.79 — its ranged mode puts it away: the hand sign, the blade's pose now the fingers'.
import * as THREE from 'three';
import { ARMS } from '../../tuning/arms';
import { DEMON } from '../../tuning/demon';
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
import type { CharacterId } from '../../sim/characters';
import { ArmsWardrobe } from './armsWardrobe';
import { GravityArms, type GravityMode } from './gravityArms';
import { BladeTrail } from './bladeTrail';
import { BladeGrow } from './bladeGrow';
import { BladeHeat } from './bladeHeat';
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

export { ARMS_URL, DEMON_ARMS_URL, DEMON_BLADE_URL, SEAN_ARMS_URL } from './armsWardrobe';
/** How fast the charge draw-back follows the charge (per second). */
const CHARGE_EASE = 14;
/** Update 0.1.9 — how far a hand opens as it throws a dagger (0 … 1). */
const RELEASE = 0.6;
/** Update 0.3.74 — where the left hand closes on the hilt for Last Verdict: this far along it from the right fist (m; below it). */
const VERDICT_LEFT = -0.17;
/** Update 0.3.79 — the two fingers of its hand sign burning: at least this hot, from this far along them to this far (m from the palm), this far off their line, this big. */
const SIGN_FIRE = 0.45;
const SIGN_FROM = 0.08;
const SIGN_TO = 0.3;
const SIGN_EDGE = 0.025;
const SIGN_SMALL = 0.45;
/** Its slash's streak, off the fingertips: this share of a blade's length. */
const SIGN_TRAIL = 0.42;
const HEAT_GLOW = 0.55;

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
  /** Update 0.3.71 — the Demon's blade's burning trail, and the blade it's following (bladeTrail.ts). */
  trail: BladeTrail | null = null;
  private followed: THREE.Object3D | null = null;
  /** Update 0.3.73 — its sword out of your hand (and just caught: a jolt); its heat, on it; its growing. */
  private bladeOut = false;
  private catching = false;
  private heat = 0;
  fire: BladeHeat | null = null;
  private grow: BladeGrow | null = null;
  /** Update 0.3.81 — Gravity Sean's gravity on his arms (made the first time it's wanted). */
  gravity: GravityArms | null = null;
  private readonly eyeAt = new THREE.Vector3();

  /** `loadModel`: fetch the arms (tests attach a parsed model instead). `demon`: the Demon's (Update 0.3.70). */
  constructor(loadModel = true, who: CharacterId = 'adventurer') {
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
    this.wardrobe.dress(who);
  }

  /** Update 0.3.70 — whose arms: the Demon's with its blade, or Joseph's. Update 0.3.80 — or Gravity Sean's. */
  setCharacter(who: CharacterId) {
    if (who !== this.wardrobe.who) this.wardrobe.dress(who);
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
    // (Update 0.3.70 — nothing else in the hand: the Demon's blade. Update 0.3.73 — unless it's been thrown.)
    const model = given ?? (this.bladeOut ? null : this.wardrobe.blade);
    if (this.weapon === model) return;
    this.weapon?.removeFromParent();
    if (model) this.swordAnim.use(movesOf(model));
    // (Update 0.3.73 — caught: its weight in your hand, up and back; unless it's for Last Verdict, whose swing's already begun.)
    const verdict = this.swordAnim.inVerdict;
    if (model && !this.weapon && !verdict) this.swordAnim.reset();
    if (model && this.catching && !verdict) this.swordAnim.start('caught');
    this.catching = false;
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

  /** Update 0.3.71 — the Demon's left click: one of Blazing Arc starts (`step`: 0 slash, 1 backslash, 2 overhead). */
  arc(step: number) {
    this.swordAnim.arc(step);
  }

  /** How the Demon's swing turns the shoulders (rad): the view turns a little with them. */
  get swingLean(): THREE.Vector3 {
    return this.swordAnim.lean;
  }

  /** Right click pressed, the parry: the right fist snaps up. */
  guard() {
    this.block.raise();
  }

  /** Update 0.3.73 — the Demon's sword is out of your hand (the next `setWeapon` puts it away, or back). */
  setBladeOut(out: boolean) {
    if (this.bladeOut && !out) this.catching = true;
    this.bladeOut = out;
  }

  /** Update 0.3.78 — the Demon's Mode Switch: its ranged mode's stance. */
  setRanged(on: boolean) {
    this.swordAnim.setRanged(on);
  }

  /** Update 0.3.81 — Gravity Sean's stance (0: anyone else; 1: normal; 2: Unstable), and his Instability (0 … 1). */
  setGravity(mode: GravityMode, instab: number) {
    if (mode === 0 && !this.gravity) return;
    (this.gravity ??= new GravityArms(this.scene)).set(mode, instab);
  }

  /** Update 0.3.73 — how hot the Demon's sword is (0 … 1). */
  setHeat(heat: number) {
    this.heat = heat;
  }

  /** Update 0.3.72 — the Demon's Hellfire Lunge; its sword into the floor. */
  thrust() {
    if (this.bladed) this.swordAnim.thrust();
  }

  plant() {
    if (this.bladed) this.swordAnim.plant(false);
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
    // (Update 0.3.72 — the Demon's dive: its sword point down, all the way.)
    if (this.bladed && this.swordAnim.swordGoing < 1 && p.slamming) this.swordAnim.plant(true);
    else this.swordAnim.landed();
    this.slam.update(gameDt);
    this.block.update(gameDt);
    this.motion.update(gameDt, realDt, mouseDx, mouseDy, p, this.pivot, this.holder);
    // (Update 0.3.71 — the shoulders turning with the Demon's swing.)
    const lean = this.swordAnim.lean;
    this.pivot.rotation.x += lean.x;
    this.pivot.rotation.y += lean.y;
    this.pivot.rotation.z += lean.z;
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
    // (Update 0.3.74 — the Demon's Last Verdict takes both.)
    const two = held ? this.swordAnim.twoHanded : 0;
    const fixed = this.swordAnim.moves.hands();
    const hands = held && (fixed !== 0 || two > 0) ? armed * (1 - palm) * (fixed !== 0 ? 1 : two) : 0;
    // (Put away, the second dagger's arm eases back to the guard, as the hammer's left hand does.)
    const pair = held && this.swordAnim.moves.pair ? armed * (1 - palm) : 0;
    const left = fistArm(rig, this.anim, this.time, 'L', this.chargeVis, charge >= 1, (armed - book - hands - pair) * (1 - palm), this.live.L);
    this.gravity?.shake('L', left);
    if (book > 0) mixArm(left, this.book.pose(rig, 'L', this.bookPose), book, left);
    if (hands > 0) mixArm(left, leftGrip(rig, this.swordPose, fixed !== 0 ? fixed : VERDICT_LEFT, this.twoPose), hands, left);
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
    this.gravity?.shake('R', right);
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
    rig.openHand('R', Math.max(book * this.book.open('R'), this.grip.open('R'), held ? Math.max(RELEASE * this.swordAnim.letGo, turnOpen(moves, this.flip)) : 0), held ? wrapOf(moves, this.flip) : gun > 0 ? GUN_GRIP : ROPE, held ? armed : gun || this.grip.rope('R'), held ? this.swordPose.tilt : gun > 0 ? this.gun.tilt : undefined, held ? this.swordAnim.handSign : 0);
    if (this.weapon) {
      // (Update 0.3.79 — and not with the Demon's sword put away.)
      this.weapon.visible = reach < 0.2 && !this.swordAnim.empty && this.swordAnim.swordGoing < 1;
      if (book > 0) this.book.bookMatrix(rig, this.weapon.matrix);
      else if (gun > 0) this.gun.matrix(rig, this.weapon.matrix);
      else holdWeapon(rig, moves, this.swordPose.tilt, this.flip, this.weapon.matrix);
      this.weapon.matrixWorldNeedsUpdate = true;
    }
    this.off.place(rig, reach < 0.2 && palm < 0.2, this.flip);
    this.camera.updateMatrixWorld(true);
    this.burn(gameDt, realDt);
    this.gravity?.update(realDt, rig, this.camera.getWorldPosition(this.eyeAt));
    this.book.update(gameDt, book, rig, this.camera);
    this.palm.place(rig);
    if (this.chest.weight > 0) this.chest.settle(this.camera.worldToLocal(rig.knuckle('L', this.knuckleL)), this.camera.worldToLocal(rig.knuckle('R', this.knuckleR)));
  }

  /** Update 0.3.71 — the Demon's blade: its trail through the air, its flare. */
  private burn(gameDt: number, realDt: number) {
    const blade = this.wardrobe.blade;
    if (blade !== this.followed) {
      this.followed = blade;
      if (blade) {
        (this.trail ??= new BladeTrail(this.scene)).follow(blade);
        this.fire ??= new BladeHeat(this.scene);
        this.grow = new BladeGrow(blade);
      }
    }
    if (!this.trail) return;
    const d = DEMON.v;
    const grown = this.swordAnim.grown;
    const long = 1 + (d.verdictGrow - 1) * grown;
    // (Update 0.3.79 — going away, it draws back into its hilt; coming back, out of it.)
    this.grow?.set(long * (1 - this.swordAnim.swordGoing), 1 + (d.verdictBroad - 1) * grown);
    // (Update 0.3.73 — the trail as long as the blade is, and longer at high heat: it reaches further.)
    this.trail.stretch = long * (this.heat >= d.heatHigh ? d.hotArc : 1);
    const inHand = !!blade && this.bladed && blade.visible;
    // (Update 0.3.79 — put away, its pose is the two fingers': the trail streams from them, and they burn.)
    const signing = !!blade && this.bladed && !blade.visible && this.swordAnim.swordGoing >= 1;
    const cutting = (inHand || signing) && this.swordAnim.slicing && gameDt > 0;
    if (signing) this.trail.stretch = SIGN_TRAIL;
    // (Update 0.3.73 — and it burns brighter as it heats.)
    this.trail.update(realDt, cutting && blade ? blade.matrixWorld : null, this.bladed ? Math.max(this.swordAnim.flare, this.heat * HEAT_GLOW) : 0);
    if (signing && blade) this.fire?.update(realDt, blade.matrixWorld, Math.max(this.heat, SIGN_FIRE), SIGN_FROM, SIGN_TO, SIGN_EDGE, SIGN_SMALL);
    else this.fire?.update(realDt, inHand && blade ? blade.matrixWorld : null, this.heat, this.trail.root, this.trail.tip * long);
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
