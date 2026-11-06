// Update 0.3.61 — the Velociraptor's show as you see it (sim/dungeon/dinoShow.ts). The view lifts up off your eyes. High over its ruins as
// the walls go back, sand blowing. Down low in the middle: at each click the view turns that way, and something crosses the gap. Then
// close under the far wall, looking up as it hisses, crouched on top. Following it off the wall: it hangs, slowed, it on the left of the
// view, its name on the right. Down to its landing, the sand flying at you. Off to the side for its roar; and back into your eyes, facing
// it. Its shots stay clear of its walls and columns. Pure maths on Three.js vectors.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { BY_SIDE, dinoAt, dinoBeats } from '../../sim/dungeon/dinoShow';
import { DINO } from '../../tuning/dino';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { Shot } from './cinema';

/** High: this far toward you from the middle (m), across, up; pushing in this far. */
const HIGH: readonly [number, number, number] = [26, 10, 22];
const HIGH_PUSH = 6;
/** Down low for its clicks: this far toward you from the middle, this far up (m); turning over this long (s). */
const LOW_OUT = 6;
const LOW_UP = 1.3;
const TURN = 0.3;
/** Under the wall: this far away from you past the middle (m), across, up. */
const UNDER: readonly [number, number, number] = [10, 3, 1.3];
/** Following its leap: this far toward you from the middle, across, up (m); aimed this far off to its right as you see it. */
const LEAP_AT: readonly [number, number, number] = [10, 3.5, 1.15];
const FRAME_LEFT = 3.4;
/** For its roar: this far toward you, across, up. Back into your eyes over this long (s). */
const ROAR_AT: readonly [number, number, number] = [11, -5, 2];
const BACK = 1;
const EASE = 0.5;
const CLEAR = 1.6;
/** Its middle's this share up it, for the camera. */
const BODY_MID = 0.45;

const shot = (): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? (1 - age / life) ** 2 : 0);

const a = shot();
const b = shot();
const at = new THREE.Vector3();

/** How far its high shots push the haze out (0..1; the floor's view: dungeonView.ts). */
export function dinoWide(run: BossRun): number {
  if (run.kind !== 'dino' || !run.ownShow || run.beat !== 'intro') return 0;
  const s = dinoBeats();
  return smooth(run.t / 0.5) * (1 - smooth((run.t - s.clickA) / 0.5));
}

export class DinoCinema {
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
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(DINO.v.dinoHeight * 0.5 - eye.y, Math.hypot(dx, dz))));
  }

  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = dinoBeats();
    if (t < s.pull) return blend(this.eye, this.rise, t / s.pull, out);
    if (t < s.pull + EASE) return blend(this.rise, this.high(t, a), (t - s.pull) / EASE, out);
    if (t < s.clickA) return this.high(t, out);
    if (t < s.hissAt) return this.clicks(t, out);
    if (t < s.hissAt + TURN) return blend(this.clicks(t, a), this.under(b), (t - s.hissAt) / TURN, out);
    if (t < s.leapAt) return this.under(out);
    if (t < s.leapAt + EASE) return blend(this.under(a), this.leap(t, b), (t - s.leapAt) / EASE, out);
    if (t < s.landAt + 0.3) return this.leap(t, out);
    if (t < s.end - BACK) return this.roar(out);
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.roar(b), a, (t - (s.end - BACK)) / BACK, out);
  }

  static named(t: number): boolean {
    const s = dinoBeats();
    return t >= s.slowFrom - 0.05 && t < s.slowTo + 0.05;
  }

  /** The place heaving: its walls going, its landing, its roar. */
  shake(camera: THREE.Camera, t: number) {
    const s = dinoBeats();
    let amp = 0;
    if (t >= s.wallsFrom && t < s.wallsTo) amp += 0.1;
    amp += 1.4 * pulse(t - s.landAt, 1);
    amp += 0.5 * pulse(t - s.roarAt, 0.8);
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.35;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.35;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.35;
    camera.rotateZ(amp * 0.03 * Math.sin(t * 53));
  }

  private high(t: number, out: Shot): Shot {
    const s = dinoBeats();
    const k = smooth((t - s.wallsFrom) / Math.max(0.1, s.clickA - s.wallsFrom));
    out.pos.copy(this.mid).addScaledVector(this.toYou, HIGH[0] - HIGH_PUSH * k).addScaledVector(this.aside, HIGH[1]).setY(HIGH[2]);
    out.look.copy(this.mid).setY(0);
    return out;
  }

  /** Low in the middle, turning to each click as it comes. */
  private clicks(t: number, out: Shot): Shot {
    const s = dinoBeats();
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, LOW_OUT).setY(LOW_UP));
    // (Ahead, then to the first click's side, then the second's.)
    const toA = smooth((t - s.clickA) / TURN);
    const toB = smooth((t - s.clickB) / TURN);
    const side = toA * (1 - 2 * toB);
    const ahead = 1 - Math.abs(side);
    out.look.copy(this.mid).addScaledVector(this.toYou, LOW_OUT - ahead * 20).addScaledVector(this.aside, side * BY_SIDE).setY(2);
    return out;
  }

  private under(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, -UNDER[0]).addScaledVector(this.aside, UNDER[1]).setY(UNDER[2]));
    dinoAt(this.level, dinoBeats().hissAt + 0.1, this.toYou.x, this.toYou.z, at);
    out.look.copy(at).setY(at.y + 1.5);
    return out;
  }

  /** Looking up at it, and following it. */
  private leap(t: number, out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, LEAP_AT[0]).addScaledVector(this.aside, LEAP_AT[1]).setY(LEAP_AT[2]));
    const s = dinoBeats();
    dinoAt(this.level, t, this.toYou.x, this.toYou.z, at);
    const named = smooth((t - s.leapAt) / Math.max(0.1, s.slowFrom - s.leapAt)) * (1 - smooth((t - s.slowTo) / 0.3));
    out.look.copy(at).setY(at.y + DINO.v.dinoHeight * BODY_MID).addScaledVector(this.aside, FRAME_LEFT * named);
    return out;
  }

  private roar(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, ROAR_AT[0]).addScaledVector(this.aside, ROAR_AT[1]).setY(ROAR_AT[2]));
    out.look.copy(this.mid).setY(DINO.v.dinoHeight * 0.55);
    return out;
  }

  private clear(pos: THREE.Vector3) {
    for (const c of this.level.arena.boxes) {
      if (c.kind === 'floor' || c.y + c.h / 2 <= 0.05) continue;
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const rx = c.w / 2 + CLEAR;
      const rz = c.d / 2 + CLEAR;
      if (Math.abs(dx) >= rx || Math.abs(dz) >= rz || pos.y > c.y + c.h / 2 + 0.5) continue;
      if (Math.abs(dx) / rx > Math.abs(dz) / rz) pos.x = c.x + Math.sign(dx || 1) * rx;
      else pos.z = c.z + Math.sign(dz || 1) * rz;
    }
  }
}

function blend(from: Shot, to: Shot, k: number, out: Shot): Shot {
  const e = smooth(k);
  out.pos.lerpVectors(from.pos, to.pos, e);
  out.look.lerpVectors(from.look, to.look, e);
  return out;
}
