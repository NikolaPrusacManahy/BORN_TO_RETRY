// Update 0.3.57 — the Frost Roc's show as you see it (sim/dungeon/rocShow.ts). The view lifts up off your eyes. High off the wall you
// came in by as its walls go, the peaks and the glacier in the middle, pushing in. Low before the ice through its thumps, cracks
// running by. Close on the ice as its eyes open in it. Low again, looking up as it bursts out and hangs, it on the left of the view
// and its name on the right, slowed. Following it down to its stomp. Off to the side for its scream; and back into your eyes, facing
// it. Its shots stay clear of the pillars. Pure maths on Three.js vectors.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { rocBeats, rocShowY } from '../../sim/dungeon/rocShow';
import { FROST_ROC } from '../../tuning/frostRoc';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { Shot } from '../boss/cinema';

/** High off the wall: this far toward you from the middle (m), across, up; pushing in this far. */
const HIGH: readonly [number, number, number] = [27, 12, 15];
const HIGH_PUSH = 6;
/** Low before the ice: this far toward you (m, closing to the second), across, up. */
const LOW: readonly [number, number] = [15, 10];
const LOW_SIDE = 3;
const LOW_UP = 1;
/** Close on the ice as its eyes open: this far toward you (m), across, up; aimed this high. */
const EYES_AT: readonly [number, number, number] = [8.5, 0.8, 3.4];
const EYES_LOOK = 3.4;
/** Looking up as it bursts out: this far toward you, across, up (m); aimed this far off to its right as you see it. */
const UP_AT: readonly [number, number, number] = [11, 4, 1.1];
const FRAME_LEFT = 3.6;
/** For its scream: this far toward you, across (to the other side), up. Back into your eyes over this long (s). */
const SCREAM_AT: readonly [number, number, number] = [12, -6, 2.2];
const BACK = 1;
const EASE = 0.5;
const CLEAR = 1.6;
/** Its middle's this share up it, for the camera. */
const BODY_MID = 0.5;

const shot = (): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? (1 - age / life) ** 2 : 0);

const a = shot();
const b = shot();

/** How far its high shots push the haze out (0..1; the floor's view: dungeonView.ts). */
export function rocWide(run: BossRun): number {
  if (run.kind !== 'frostRoc' || !run.ownShow || run.beat !== 'intro') return 0;
  const s = rocBeats();
  return smooth(run.t / 0.5) * (1 - smooth((run.t - s.thumps[0]) / 0.5));
}

export class RocCinema {
  private readonly eye = shot();
  private readonly rise = shot();
  private readonly mid = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly toYou = new THREE.Vector3();
  private readonly aside = new THREE.Vector3();
  endYaw = 0;
  endPitch = 0;

  constructor(private readonly level: DungeonLevel) {
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
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(FROST_ROC.v.rocHeight * 0.6 - eye.y, Math.hypot(dx, dz))));
  }

  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = rocBeats();
    if (t < s.pull) return blend(this.eye, this.rise, t / s.pull, out);
    if (t < s.pull + EASE) return blend(this.rise, this.high(t, a), (t - s.pull) / EASE, out);
    if (t < s.thumps[0]) return this.high(t, out);
    if (t < s.thumps[2]) return this.low(t, out);
    if (t < s.burstAt) return this.eyes(out);
    if (t < s.landAt + 0.3) return this.up(t, out);
    if (t < s.end - BACK) return this.scream(out);
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.scream(b), a, (t - (s.end - BACK)) / BACK, out);
  }

  static named(t: number): boolean {
    const s = rocBeats();
    return t >= s.slowFrom - 0.05 && t < s.slowTo + 0.05;
  }

  /** The place heaving: the gale, its thumps, its burst, its stomp, its scream. */
  shake(camera: THREE.Camera, t: number) {
    const s = rocBeats();
    let amp = 0;
    if (t >= s.wallsFrom && t < s.thumps[0]) amp += 0.12;
    s.thumps.forEach((th, i) => {
      amp += (0.5 + 0.25 * i) * pulse(t - th, 0.5);
    });
    amp += 1.2 * pulse(t - s.burstAt, 0.8);
    amp += 1.4 * pulse(t - s.landAt, 1);
    amp += 0.5 * pulse(t - s.screamAt, 0.8);
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.35;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.35;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.35;
    camera.rotateZ(amp * 0.03 * Math.sin(t * 53));
  }

  private high(t: number, out: Shot): Shot {
    const s = rocBeats();
    const k = smooth((t - s.wallsFrom) / Math.max(0.1, s.thumps[0] - s.wallsFrom));
    out.pos.copy(this.mid).addScaledVector(this.toYou, HIGH[0] - HIGH_PUSH * k).addScaledVector(this.aside, HIGH[1]).setY(HIGH[2]);
    out.look.copy(this.mid).setY(3);
    return out;
  }

  private low(t: number, out: Shot): Shot {
    const s = rocBeats();
    const k = smooth((t - s.thumps[0]) / Math.max(0.1, s.thumps[2] - s.thumps[0]));
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, LOW[0] + (LOW[1] - LOW[0]) * k).addScaledVector(this.aside, LOW_SIDE).setY(LOW_UP));
    out.look.copy(this.mid).setY(3.2);
    return out;
  }

  private eyes(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, EYES_AT[0]).addScaledVector(this.aside, EYES_AT[1]).setY(EYES_AT[2]));
    out.look.copy(this.mid).setY(EYES_LOOK);
    return out;
  }

  /** Looking up at it, and following it. */
  private up(t: number, out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, UP_AT[0]).addScaledVector(this.aside, UP_AT[1]).setY(UP_AT[2]));
    const s = rocBeats();
    const named = smooth((t - s.burstAt) / Math.max(0.1, s.slowFrom - s.burstAt)) * (1 - smooth((t - s.slowTo) / 0.3));
    out.look.copy(this.mid).setY(rocShowY(t) + FROST_ROC.v.rocHeight * BODY_MID).addScaledVector(this.aside, FRAME_LEFT * named);
    return out;
  }

  private scream(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, SCREAM_AT[0]).addScaledVector(this.aside, SCREAM_AT[1]).setY(SCREAM_AT[2]));
    out.look.copy(this.mid).setY(FROST_ROC.v.rocHeight * 0.55);
    return out;
  }

  private clear(pos: THREE.Vector3) {
    for (const c of this.level.arena.pillars ?? []) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const r = c.half + CLEAR;
      if (Math.abs(dx) >= r || Math.abs(dz) >= r) continue;
      if (Math.abs(dx) > Math.abs(dz)) pos.x = c.x + Math.sign(dx || 1) * r;
      else pos.z = c.z + Math.sign(dz || 1) * r;
    }
  }
}

function blend(from: Shot, to: Shot, k: number, out: Shot): Shot {
  const e = smooth(k);
  out.pos.lerpVectors(from.pos, to.pos, e);
  out.look.lerpVectors(from.look, to.look, e);
  return out;
}
