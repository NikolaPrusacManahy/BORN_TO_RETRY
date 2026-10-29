// Update 0.1.4 — the Grimoire held (the designer: "the right hand holding the book open and the second hand showing
// the palm with fire on it"; spec MD_UPDATES/U014_GRIMOIRE.md). The right hand low on the right, palm up under the
// book's spine, the book lying open on it, its pages turned towards you; the left hand low on the left, palm up, its
// fingers curled round a fireball (the designer: "almost a closed fist, like holding that fire ball"), flames licking up
// from it, embers drifting, an orange light on your hands. A cast thrusts the left palm out, fingers up (the designer's
// second image), the ball leaving it, and back; a new ball kindles in the hand. Holding right click (the charge,
// kiCharge.ts) puts the palm out in that same stance and holds it there, trembling, the ball before it growing with each
// second held (a pulse at each charge); letting go pushes it off. Poses are in the arms camera's view and carried into
// the model (armsMath.ts `viewToModel`).
import * as THREE from 'three';
import type { ArmPose, ArmsRig } from './armsRig';
import { mixArm, pose, viewToModel } from './armsMath';
import type { Side } from './guard';
import { EMBERS, FIRE, Flames } from '../fx/flames';
import { kiFull, kiMid } from '../../sim/weapons/kiCharge';

type V3 = readonly [number, number, number];
interface Stance {
  at: V3;
  knuckles: V3;
  back: V3;
}
/** In the arms camera's view (x right, y up, −z ahead; m from the eye). */
const BOOK_HAND: Stance = { at: [0.19, -0.22, -0.44], knuckles: [-0.35, 0.45, -0.82], back: [0.15, -0.65, -0.75] };
const FIRE_HAND: Stance = { at: [-0.19, -0.21, -0.42], knuckles: [0.3, 0.35, -0.88], back: [-0.1, -0.85, -0.5] };
/** The cast, and the charge held: palm out, fingers up, under the crosshair, turned a little in towards it (so the ball
 *  before it shows beside the hand). */
const THRUST: Stance = { at: [-0.09, -0.15, -0.6], knuckles: [0.1, 1, -0.15], back: [-0.4, 0.15, 0.9] };
/** A charged ball let go: the palm pushed on after it. */
const PUSH: Stance = { at: [-0.08, -0.14, -0.68], knuckles: [0.1, 1, -0.15], back: [-0.4, 0.15, 0.9] };
/** A cast's thrust out, its hold, and its way back (s); the charge stance easing in (s). */
const OUT = 0.07;
const HOLD = 0.05;
const BACK = 0.22;
const READY = 0.12;
/** How open the left hand is holding the ball (0: a fist); the right hand under the book. */
const CUP = 0.3;
const OPEN_R = 0.55;
/** The ball's size (m, in the arms' view): held, at the big charge, at the full charge; a new one kindling (s). */
const BALL = 0.022;
const BALL_MID = 0.07;
const BALL_FULL = 0.12;
const KINDLE = 0.35;
/** The trembling while charging (m): at the start and at the full charge. */
const SHAKE = 0.0015;
const SHAKE_FULL = 0.006;
/** Flames a second on the ball (more as it grows), embers a second. */
const FLAME_RATE = 70;
const EMBER_RATE = 12;
/** The palm light: how far it sits off the ball towards your eye (m), and how bright, held and at the full charge.
 *  (Close to the hand it washed it out white.) */
const LIGHT_OFF = 0.18;
const LIGHT = 0.06;
const LIGHT_FULL = 0.3;
/** The book held this much smaller than it lies about (0.36 m open: at arm's length it filled the corner). */
const BOOK_SCALE = 0.62;

const a = new THREE.Vector3();
const b = new THREE.Vector3();
const k = new THREE.Vector3();
const wrist = new THREE.Vector3();
const knuckle = new THREE.Vector3();
const back = new THREE.Vector3();
const up = new THREE.Vector3();
const x = new THREE.Vector3();
const y = new THREE.Vector3();
const z = new THREE.Vector3();
const book = new THREE.Matrix4();
const inv = new THREE.Matrix4();
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export class BookArms {
  readonly fire = new Flames(160, FIRE);
  readonly embers = new Flames(60, EMBERS);
  readonly light = new THREE.PointLight(0xff8a3a, 0, 1.4, 2);
  /** The ball held (its middle, in the arms' scene), for the fireball leaving it. */
  readonly palm = new THREE.Vector3();
  /** The charge held now (s), or −1: set each frame from the rules (fireView.ts). */
  ki = -1;
  private readonly core: THREE.Mesh;
  private readonly halo: THREE.Mesh;
  private castT = -1;
  private pushed = false;
  private ready = 0;
  private kindle = 1;
  private pulseT = 1;
  private time = 0;
  private flameDebt = 0;
  private emberDebt = 0;
  private readonly stance = { thrust: pose(), push: pose() };

  constructor(scene: THREE.Object3D) {
    const geo = new THREE.SphereGeometry(1, 16, 12);
    this.core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfff1c8, toneMapped: false }));
    this.halo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.core.visible = this.halo.visible = false;
    scene.add(this.fire.mesh, this.embers.mesh, this.light, this.core, this.halo);
  }

  /** A fireball cast (charged `charge` s): the thrust; the ball has left the hand. */
  cast(charge: number) {
    this.castT = 0;
    this.pushed = charge > 0;
    this.kindle = 0;
  }

  /** A charge reached (each burns a use): the ball swells for a moment. */
  pulse() {
    this.pulseT = 0;
  }

  /** How far out the thrust is now (0 … 1). */
  private thrust(): number {
    const t = this.castT;
    if (t < 0) return 0;
    if (t < OUT) return ease(t / OUT);
    if (t < OUT + HOLD) return 1;
    return 1 - ease((t - OUT - HOLD) / BACK);
  }

  /** How far the charge has come (0 … 1). */
  private level(): number {
    return this.ki > 0 ? clamp01(this.ki / Math.max(1e-3, kiFull())) : 0;
  }

  /** One arm's pose holding the Grimoire (model space). */
  pose(rig: ArmsRig, side: Side, out: ArmPose): ArmPose {
    if (side === 'R') return place(BOOK_HAND, rig, out);
    place(FIRE_HAND, rig, out);
    const t = this.thrust();
    const held = Math.max(t, ease(this.ready));
    if (held > 0) mixArm(out, place(THRUST, rig, this.stance.thrust), held, out);
    if (this.pushed && t > 0) mixArm(out, place(PUSH, rig, this.stance.push), t, out);
    if (this.ki >= 0) {
      // Trembling with the power held.
      const s = (SHAKE + (SHAKE_FULL - SHAKE) * this.level()) * this.ready;
      out.fist.x += Math.sin(this.time * 71) * s;
      out.fist.y += Math.sin(this.time * 89 + 1) * s;
      out.fist.z += Math.sin(this.time * 53 + 2) * s * 0.5;
    }
    return out;
  }

  /** How open each hand is: the left curled round its ball, open with the palm out. */
  open(side: Side): number {
    if (side === 'R') return OPEN_R;
    return CUP + (1 - CUP) * Math.max(this.thrust(), ease(this.ready));
  }

  /** The book's matrix under the right hand's bone: lying open on the palm, its spine along the fingers. */
  bookMatrix(rig: ArmsRig, into: THREE.Matrix4): THREE.Matrix4 {
    rig.handFrame('R', wrist, knuckle, back);
    z.subVectors(knuckle, wrist);
    a.copy(wrist).addScaledVector(z, 0.5).addScaledVector(back, -0.025);
    y.copy(back).negate().normalize();
    z.addScaledVector(y, -z.dot(y)).normalize();
    x.crossVectors(y, z);
    book.makeBasis(x.multiplyScalar(BOOK_SCALE), y.multiplyScalar(BOOK_SCALE), z.multiplyScalar(BOOK_SCALE)).setPosition(a);
    rig.holdBone().updateWorldMatrix(true, false);
    return into.multiplyMatrices(inv.copy(rig.holdBone().matrixWorld).invert(), book);
  }

  /** The ball's size now (m). */
  private ballSize(): number {
    let r = BALL * ease(this.kindle);
    if (this.ki >= 0) {
      const full = kiFull();
      const mid = kiMid();
      r = Math.max(r, BALL + (BALL_MID - BALL) * clamp01(this.ki / Math.max(1e-3, mid)) + (BALL_FULL - BALL_MID) * clamp01((this.ki - mid) / Math.max(1e-3, full - mid)));
    }
    return r * (1 + 0.3 * (1 - ease(this.pulseT / 0.2)));
  }

  /** Each frame, after the arms are posed: the ball and its fire on the left palm (`weight`: how far the book is out,
   *  0 … 1), the thrust's and charge's clocks. */
  update(dt: number, weight: number, rig: ArmsRig, camera: THREE.Camera) {
    this.time += dt;
    if (this.castT >= 0) {
      this.castT += dt;
      if (this.castT > OUT + HOLD + BACK) this.castT = -1;
    }
    this.ready = clamp01(this.ready + (this.ki >= 0 ? dt : -dt) / READY);
    if (this.castT < 0 || this.castT > OUT) this.kindle = Math.min(1, this.kindle + dt / KINDLE);
    const pulsing = this.pulseT === 0;
    this.pulseT = Math.min(1, this.pulseT + dt);
    const r = this.ballSize();
    rig.handFrame('L', wrist, knuckle, back);
    back.normalize();
    k.subVectors(knuckle, wrist);
    // The ball sits in the palm (in the curled fingers), or before it with the palm out.
    this.palm.copy(wrist).addScaledVector(k, 0.5).addScaledVector(back, -(r + 0.012 + 0.01 * this.ready));
    const lit = weight > 0.5 && r > 0.004;
    this.core.visible = this.halo.visible = lit;
    if (lit) {
      this.core.position.copy(this.palm);
      this.core.scale.setScalar(r * (0.55 + 0.06 * Math.sin(this.time * 37)));
      this.halo.position.copy(this.palm);
      this.halo.scale.setScalar(r * (1.05 + 0.08 * Math.sin(this.time * 23)));
      const grow = r / BALL;
      // Flames lick up off the ball (straight up in the scene: the camera's up).
      up.set(0, 0.18, 0).addScaledVector(back, -0.05);
      this.flameDebt += FLAME_RATE * Math.min(3, grow) * dt;
      const n = Math.floor(this.flameDebt);
      this.flameDebt -= n;
      this.fire.emit(n, this.palm, up, 0.05 * grow, 0.6 * grow, r * 0.7);
      this.emberDebt += EMBER_RATE * Math.min(3, grow) * dt;
      const m = Math.floor(this.emberDebt);
      this.emberDebt -= m;
      b.set(0, 0.2, 0);
      this.embers.emit(m, this.palm, b, 0.12 * Math.min(3, grow), 1, r);
      // A charge reached: a ring of embers flung off it.
      if (pulsing) this.embers.emit(14, this.palm, null, 0.5, 1.4, r);
    }
    // The cast: a gout of flame thrown forward off the palm as it reaches full stretch.
    if (weight > 0.5 && this.castT >= OUT && this.castT - dt < OUT) {
      b.copy(back).multiplyScalar(-2.5);
      this.fire.emit(this.pushed ? 24 : 12, this.palm, b, 0.2, this.pushed ? 1.3 : 0.9, 0.02);
    }
    this.fire.update(dt, camera);
    this.embers.update(dt, camera);
    this.light.position.copy(camera.position).sub(this.palm).normalize().multiplyScalar(LIGHT_OFF).add(this.palm);
    const glow = LIGHT + (LIGHT_FULL - LIGHT) * this.level();
    this.light.intensity = lit ? glow * (1 + 0.25 * Math.sin(this.time * 31) + 0.15 * Math.sin(this.time * 17.3)) * weight * Math.min(1, ease(this.kindle) + this.ready) : 0;
  }

  clear() {
    this.castT = -1;
    this.ki = -1;
    this.ready = 0;
    this.kindle = 1;
    this.pulseT = 1;
    this.fire.clear();
    this.embers.clear();
    this.light.intensity = 0;
    this.core.visible = this.halo.visible = false;
  }
}

/** A stance carried into the model (`rig`'s eye; directions turned with the arms' tilt). */
function place(s: Stance, rig: ArmsRig, out: ArmPose): ArmPose {
  viewToModel(out.fist.set(s.at[0], s.at[1], s.at[2]), rig.eye);
  viewToModel(out.knuckles.set(s.knuckles[0], s.knuckles[1], s.knuckles[2]).normalize(), null);
  viewToModel(out.back.set(s.back[0], s.back[1], s.back[2]), null);
  out.back.addScaledVector(out.knuckles, -out.back.dot(out.knuckles)).normalize();
  return out;
}
