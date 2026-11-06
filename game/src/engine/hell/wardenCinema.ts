// Update 0.3.64 — Hellwarden's show as you see it (sim/dungeon/wardenShow.ts). The view lifts up off your eyes. High over its throne room as
// the walls go back, the throne and the void past them; the floor splitting. Down at the rift's end, low, looking along it at the lava as it
// walks up out of it, closing on it. Close on its sword catching fire. Low and looking up as it raises it, it on the left of the view, its
// name on the right, slowed. Its blow: the view thrown back. Off to the side for its roar; and back into your eyes, facing it. Its shots
// stay clear of its columns. Pure maths on Three.js vectors.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { wardenAt, wardenBeats } from '../../sim/dungeon/wardenShow';
import { HELLWARDEN } from '../../tuning/hellwarden';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { Shot } from '../boss/cinema';

/** High: this far toward you from the middle (m), across, up; pushing in this far. */
const HIGH: readonly [number, number, number] = [28, 12, 22];
const HIGH_PUSH = 6;
/** Down low, this far toward you from it (m, closing to the second), across, up. */
const LOW: readonly [number, number] = [16, 11];
const LOW_SIDE = 2.5;
const LOW_UP = 1.2;
/** Close on its sword: this far toward you, across, up; aimed this high. */
const SWORD_AT: readonly [number, number, number] = [7.5, 3, 2.2];
const SWORD_LOOK = 2.4;
/** Looking up as it raises it: this far toward you, across, up (m); aimed this far off to its right as you see it. */
const UP_AT: readonly [number, number, number] = [9.5, 3, 1.1];
const FRAME_LEFT = 3.2;
/** For its roar: this far toward you, across, up. Back into your eyes over this long (s). */
const ROAR_AT: readonly [number, number, number] = [11, -5, 2.4];
const BACK = 1;
const EASE = 0.5;
const CLEAR = 1.6;

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
export function wardenWide(run: BossRun): number {
  if (run.kind !== 'hellwarden' || !run.ownShow || run.beat !== 'intro') return 0;
  const s = wardenBeats();
  return smooth(run.t / 0.5) * (1 - smooth((run.t - s.walkFrom) / 0.5));
}

export class WardenCinema {
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
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(HELLWARDEN.v.height * 0.5 - eye.y, Math.hypot(dx, dz))));
  }

  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = wardenBeats();
    if (t < s.pull) return blend(this.eye, this.rise, t / s.pull, out);
    if (t < s.pull + EASE) return blend(this.rise, this.high(t, a), (t - s.pull) / EASE, out);
    if (t < s.walkFrom) return this.high(t, out);
    if (t < s.walkFrom + EASE) return blend(this.high(t, a), this.low(t, b), (t - s.walkFrom) / EASE, out);
    if (t < s.igniteAt) return this.low(t, out);
    if (t < s.slowFrom) return this.sword(out);
    if (t < s.roarAt) return this.up(t, out);
    if (t < s.end - BACK) return this.roar(out);
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.roar(b), a, (t - (s.end - BACK)) / BACK, out);
  }

  static named(t: number): boolean {
    const s = wardenBeats();
    return t >= s.slowFrom - 0.05 && t < s.slowTo + 0.05;
  }

  /** The place heaving: the rift opening, its steps, its blow, its roar. */
  shake(camera: THREE.Camera, t: number) {
    const s = wardenBeats();
    let amp = 0;
    if (t >= s.riftFrom && t < s.riftTo) amp += 0.3;
    if (t >= s.walkFrom && t < s.walkTo) amp += 0.12;
    amp += 1.6 * pulse(t - s.blowAt, 1.1);
    amp += 0.7 * pulse(t - s.roarAt, 0.9);
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.35;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.35;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.35;
    camera.rotateZ(amp * 0.03 * Math.sin(t * 53));
  }

  private high(t: number, out: Shot): Shot {
    const s = wardenBeats();
    const k = smooth((t - s.wallsFrom) / Math.max(0.1, s.walkFrom - s.wallsFrom));
    out.pos.copy(this.mid).addScaledVector(this.toYou, HIGH[0] - HIGH_PUSH * k).addScaledVector(this.aside, HIGH[1]).setY(HIGH[2]);
    out.look.copy(this.mid).addScaledVector(this.toYou, -8).setY(2);
    return out;
  }

  private low(t: number, out: Shot): Shot {
    const s = wardenBeats();
    const k = smooth((t - s.walkFrom) / Math.max(0.1, s.walkTo - s.walkFrom));
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, LOW[0] + (LOW[1] - LOW[0]) * k).addScaledVector(this.aside, LOW_SIDE).setY(LOW_UP));
    wardenAt(this.mid.x, this.mid.z, t, this.toYou.x, this.toYou.z, at);
    out.look.copy(at).setY(Math.max(1.5, at.y + HELLWARDEN.v.height * 0.55));
    return out;
  }

  private sword(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, SWORD_AT[0]).addScaledVector(this.aside, SWORD_AT[1]).setY(SWORD_AT[2]));
    out.look.copy(this.mid).setY(SWORD_LOOK);
    return out;
  }

  /** Looking up at it. */
  private up(t: number, out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, UP_AT[0]).addScaledVector(this.aside, UP_AT[1]).setY(UP_AT[2]));
    const s = wardenBeats();
    const named = smooth((t - s.slowFrom) / 0.3) * (1 - smooth((t - s.slowTo) / 0.3));
    out.look.copy(this.mid).setY(HELLWARDEN.v.height * 0.6).addScaledVector(this.aside, FRAME_LEFT * named);
    return out;
  }

  private roar(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, ROAR_AT[0]).addScaledVector(this.aside, ROAR_AT[1]).setY(ROAR_AT[2]));
    out.look.copy(this.mid).setY(HELLWARDEN.v.height * 0.6);
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
