// Update 0.3.59 — the Drowned King's show as you see it (sim/dungeon/drownedShow.ts). The view lifts up off your eyes. High, as the walls
// burst and the water falls and spreads across the floor. Down on the water, following its fin round you; holding on the silence. Close
// and low on its middle as its crown comes up. Back and looking up as it bursts out and hangs, it on the left of the view, its name on
// the right, slowed. Following it down, the wave rolling out at you. Close for its heads snapping; and back into your eyes, facing it.
// Its shots stay clear of its columns and stones. Pure maths on Three.js vectors.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { drownedBeats, drownedShowY, finSpot, RING_OUT } from '../../sim/dungeon/drownedShow';
import { DROWNED } from '../../tuning/drowned';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { Shot } from '../boss/cinema';

/** High: this far toward you from the middle (m), across, up; pushing in this far. */
const HIGH: readonly [number, number, number] = [24, 11, 19];
const HIGH_PUSH = 5;
/** Down on the water with its fin, in the middle of its ring: this far up (m). */
const FIN_UP = 1.15;
/** Close on its crown: this far toward you, across, up; aimed this high. */
const CROWN_AT: readonly [number, number, number] = [7.5, 1.2, 1.2];
const CROWN_LOOK = 1.2;
/** Looking up as it bursts out: this far toward you, across, up (m); aimed this far off to its right as you see it. */
const UP_AT: readonly [number, number, number] = [12, 3, 1.15];
const FRAME_LEFT = 3.4;
/** Close for its heads: this far toward you, across, up; aimed this share up it. */
const SNAP_AT: readonly [number, number, number] = [9.5, -3, 3];
const SNAP_LOOK = 0.45;
/** Back into your eyes over this long (s). */
const BACK = 1;
const EASE = 0.5;
const CLEAR = 1.6;
/** Off the floor of a shot, whatever's under it: its stones (m). */
const OVER_STONE = 1.1;

const shot = (): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? (1 - age / life) ** 2 : 0);

const a = shot();
const b = shot();

/** How far its high shots push the haze out (0..1; the floor's view: dungeonView.ts). */
export function drownedWide(run: BossRun): number {
  if (run.kind !== 'drownedKing' || !run.ownShow || run.beat !== 'intro') return 0;
  const s = drownedBeats();
  return smooth(run.t / 0.5) * (1 - smooth((run.t - s.finFrom) / 0.5));
}

export class DrownedCinema {
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
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(DROWNED.v.kingHeight * 0.5 - eye.y, Math.hypot(dx, dz))));
  }

  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = drownedBeats();
    if (t < s.pull) return blend(this.eye, this.rise, t / s.pull, out);
    if (t < s.pull + EASE) return blend(this.rise, this.high(t, a), (t - s.pull) / EASE, out);
    if (t < s.finFrom) return this.high(t, out);
    if (t < s.finFrom + EASE) return blend(this.high(t, a), this.fin(t, b), (t - s.finFrom) / EASE, out);
    if (t < s.crownFrom) return this.fin(t, out);
    if (t < s.upAt) return this.crown(out);
    if (t < s.landAt + 0.3) return this.up(t, out);
    if (t < s.end - BACK) return this.snap(out);
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.snap(b), a, (t - (s.end - BACK)) / BACK, out);
  }

  static named(t: number): boolean {
    const s = drownedBeats();
    return t >= s.slowFrom - 0.05 && t < s.slowTo + 0.05;
  }

  /** The place heaving: the walls bursting, it coming up, its landing. */
  shake(camera: THREE.Camera, t: number) {
    const s = drownedBeats();
    let amp = 0;
    amp += 0.9 * pulse(t - s.burstAt, 0.8);
    if (t >= s.burstAt && t < s.floodTo) amp += 0.12;
    amp += 1.2 * pulse(t - s.upAt, 0.8);
    amp += 1.4 * pulse(t - s.landAt, 1);
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.35;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.35;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.35;
    camera.rotateZ(amp * 0.03 * Math.sin(t * 53));
  }

  private high(t: number, out: Shot): Shot {
    const s = drownedBeats();
    const k = smooth((t - s.burstAt) / Math.max(0.1, s.finFrom - s.burstAt));
    out.pos.copy(this.mid).addScaledVector(this.toYou, HIGH[0] - HIGH_PUSH * k).addScaledVector(this.aside, HIGH[1]).setY(HIGH[2]);
    out.look.copy(this.mid).setY(0);
    return out;
  }

  /** Low over the water, turning to keep its fin in the shot. */
  private fin(t: number, out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, RING_OUT).setY(FIN_UP));
    finSpot(t, this.mid.x, this.mid.z, this.toYou.x, this.toYou.z, out.look);
    out.look.y = 0.7;
    return out;
  }

  private crown(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, CROWN_AT[0]).addScaledVector(this.aside, CROWN_AT[1]).setY(CROWN_AT[2]));
    out.look.copy(this.mid).setY(CROWN_LOOK);
    return out;
  }

  /** Looking up at it, and following it. */
  private up(t: number, out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, UP_AT[0]).addScaledVector(this.aside, UP_AT[1]).setY(UP_AT[2]));
    const s = drownedBeats();
    const named = smooth((t - s.upAt) / Math.max(0.1, s.slowFrom - s.upAt)) * (1 - smooth((t - s.slowTo) / 0.3));
    out.look.copy(this.mid).setY(Math.max(1, drownedShowY(t) + DROWNED.v.kingHeight * 0.5)).addScaledVector(this.aside, FRAME_LEFT * named);
    return out;
  }

  private snap(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, SNAP_AT[0]).addScaledVector(this.aside, SNAP_AT[1]).setY(SNAP_AT[2]));
    out.look.copy(this.mid).setY(DROWNED.v.kingHeight * SNAP_LOOK);
    return out;
  }

  private clear(pos: THREE.Vector3) {
    for (const c of this.level.arena.boxes) {
      if (c.kind === 'floor' || c.y + c.h / 2 <= 0.05 || c.y + c.h / 2 > 7) continue;
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const rx = c.w / 2 + CLEAR;
      const rz = c.d / 2 + CLEAR;
      if (Math.abs(dx) >= rx || Math.abs(dz) >= rz) continue;
      const top = c.y + c.h / 2;
      // (A low one: over it; a tall one: round it.)
      if (top < 2) pos.y = Math.max(pos.y, top + OVER_STONE);
      else if (Math.abs(dx) / rx > Math.abs(dz) / rz) pos.x = c.x + Math.sign(dx || 1) * rx;
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
