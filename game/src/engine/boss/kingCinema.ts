// Update 0.3.54 — the Bone King's show as you see it (sim/dungeon/kingShow.ts). The view lifts up off your eyes. High off the wall
// you came in by as its walls go and the bones lift all over the pit, pushing in. Down on the floor among them as they stream by,
// the body building. Low behind its skull on the floor, looking up as it stoops for it, and following it up to its neck. Close on
// its head on the left of the view and its name on the right, slowed, as its eyes catch. Pulled back for its roar and its arm
// coming down; and back into your eyes, facing it. Pure maths on Three.js vectors.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { kingBeats } from '../../sim/dungeon/kingShow';
import { BONE_KING } from '../../tuning/boneKing';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { Shot } from './cinema';

/** High off the wall: this far toward you from the middle (m), across, up; pushing in this far. */
const HIGH: readonly [number, number, number] = [30, 12, 18];
const HIGH_PUSH = 7;
/** This share through its building, the view drops to the floor: this far toward you (m), across, up. */
const BUILD_CUT = 0.45;
const LOW: readonly [number, number, number] = [10, 5, 0.7];
/** Behind its skull as it stoops, this far past where it lies (shares of its height), across (m), up (m, rising as it lifts). */
const STOOP_BACK = 0.95;
const STOOP_SIDE = 2.6;
const STOOP_UP: readonly [number, number] = [0.9, 2.2];
/** Close on its head: this far toward you (shares of its height), across (m), up; aimed this far off to its right as you see it. */
const EYES_AT: readonly [number, number, number] = [0.72, 0.7, 0.66];
const FRAME_LEFT = 1.3;
/** For its roar and its arm: this far toward you, across, up (m). */
const ROAR_AT: readonly [number, number, number] = [15, 6, 3];
const BACK = 1;
const EASE = 0.5;

const shot = (): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? (1 - age / life) ** 2 : 0);

const a = shot();
const b = shot();

/** How far its high shots push the haze out (0..1; the floor's view: dungeonView.ts). */
export function kingWide(run: BossRun): number {
  if (run.kind !== 'boneKing' || !run.ownShow || run.beat !== 'intro') return 0;
  const s = kingBeats();
  return smooth(run.t / 0.5) * (1 - smooth((run.t - s.standFrom) / 0.5));
}

export class KingCinema {
  private readonly eye = shot();
  private readonly rise = shot();
  private readonly mid = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly toYou = new THREE.Vector3();
  private readonly aside = new THREE.Vector3();
  endYaw = 0;
  endPitch = 0;

  constructor(level: DungeonLevel) {
    const e = level.boss.entrance;
    this.fwd.set(e === 'w' ? 1 : e === 'e' ? -1 : 0, 0, e === 'n' ? 1 : e === 's' ? -1 : 0);
    this.mid.set(level.boss.portal.x, 0, level.boss.portal.z);
  }

  start(eye: THREE.Vector3, look: THREE.Vector3) {
    this.eye.pos.copy(eye);
    this.eye.look.copy(eye).addScaledVector(look, 20);
    this.toYou.set(eye.x - this.mid.x, 0, eye.z - this.mid.z).normalize();
    this.aside.set(this.toYou.z, 0, -this.toYou.x);
    this.rise.pos.copy(eye).setY(eye.y + 3).addScaledVector(this.fwd, -2);
    this.rise.look.copy(this.mid).setY(0);
    const dx = this.mid.x - eye.x;
    const dz = this.mid.z - eye.z;
    this.endYaw = Math.atan2(-dx, -dz);
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(BONE_KING.v.kingHeight * 0.6 - eye.y, Math.hypot(dx, dz))));
  }

  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = kingBeats();
    const cut = s.buildFrom + (s.standFrom - s.buildFrom) * BUILD_CUT;
    if (t < s.pull) return blend(this.eye, this.rise, t / s.pull, out);
    if (t < s.pull + EASE) return blend(this.rise, this.high(t, a), (t - s.pull) / EASE, out);
    if (t < cut) return this.high(t, out);
    if (t < s.stoopFrom) return this.low(out);
    if (t < s.slowFrom) return this.stoop(t, out);
    if (t < s.roarFrom) return this.eyes(out);
    if (t < s.end - BACK) return this.roar(out);
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.roar(b), a, (t - (s.end - BACK)) / BACK, out);
  }

  static named(t: number): boolean {
    const s = kingBeats();
    return t >= s.slowFrom - 0.05 && t < s.roarFrom + 0.15;
  }

  /** The place heaving: the floor trembling, its bones arriving, its arm coming down. */
  shake(camera: THREE.Camera, t: number) {
    const s = kingBeats();
    let amp = 0;
    if (t >= s.wallsFrom && t < s.standFrom) amp += 0.18;
    amp += 0.7 * pulse(t - s.standFrom, 0.7);
    amp += 0.5 * pulse(t - s.slowFrom, 0.5);
    amp += 0.5 * pulse(t - s.roarFrom, 0.6);
    amp += 1.3 * pulse(t - s.slamAt, 1);
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.35;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.35;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.35;
    camera.rotateZ(amp * 0.03 * Math.sin(t * 53));
  }

  private high(t: number, out: Shot): Shot {
    const s = kingBeats();
    const k = smooth((t - s.wallsFrom) / Math.max(0.1, s.standFrom - s.wallsFrom));
    out.pos.copy(this.mid).addScaledVector(this.toYou, HIGH[0] - HIGH_PUSH * k).addScaledVector(this.aside, HIGH[1]).setY(HIGH[2]);
    out.look.copy(this.mid).setY(1);
    return out;
  }

  /** Low on the floor, the bones streaming by to the body building. */
  private low(out: Shot): Shot {
    out.pos.copy(this.mid).addScaledVector(this.toYou, LOW[0]).addScaledVector(this.aside, LOW[1]).setY(LOW[2]);
    out.look.copy(this.mid).setY(BONE_KING.v.kingHeight * 0.32);
    return out;
  }

  /** Behind its skull, following it up to its neck. */
  private stoop(t: number, out: Shot): Shot {
    const s = kingBeats();
    const h = BONE_KING.v.kingHeight;
    const k = smooth((t - s.liftFrom) / Math.max(0.1, s.slowFrom - s.liftFrom));
    out.pos.copy(this.mid).addScaledVector(this.toYou, STOOP_BACK * h).addScaledVector(this.aside, STOOP_SIDE).setY(STOOP_UP[0] + (STOOP_UP[1] - STOOP_UP[0]) * k);
    out.look.copy(this.mid).addScaledVector(this.toYou, 0.4 * h * (1 - k)).setY(0.5 + (0.72 * h - 0.5) * k);
    return out;
  }

  private eyes(out: Shot): Shot {
    const h = BONE_KING.v.kingHeight;
    out.pos.copy(this.mid).addScaledVector(this.toYou, EYES_AT[0] * h).addScaledVector(this.aside, EYES_AT[1]).setY(EYES_AT[2] * h);
    out.look.copy(this.mid).setY(0.84 * h).addScaledVector(this.aside, FRAME_LEFT);
    return out;
  }

  private roar(out: Shot): Shot {
    out.pos.copy(this.mid).addScaledVector(this.toYou, ROAR_AT[0]).addScaledVector(this.aside, ROAR_AT[1]).setY(ROAR_AT[2]);
    out.look.copy(this.mid).setY(BONE_KING.v.kingHeight * 0.45);
    return out;
  }
}

function blend(from: Shot, to: Shot, k: number, out: Shot): Shot {
  const e = smooth(k);
  out.pos.lerpVectors(from.pos, to.pos, e);
  out.look.lerpVectors(from.look, to.look, e);
  return out;
}
