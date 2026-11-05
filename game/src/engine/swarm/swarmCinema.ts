// Update 0.3.52 — The Swarm's show as you see it (sim/dungeon/swarmShow.ts). The view lifts up off your eyes. High off the wall
// you came in by as the walls are forced back and the floor beyond them is alive. Down on the floor in the middle of it, low,
// its worms pouring past you. Low in front of its heap as it closes, pushing in. Close, its eye on the left of the view and its
// name on the right, slowed, as it opens. Pulling back as its laser goes round the room; and back into your eyes, facing it.
// Its shots stay clear of the pillars. Pure maths on Three.js vectors.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { swarmBeats } from '../../sim/dungeon/swarmShow';
import { swarmEyeHeight } from '../../sim/enemies/swarmHits';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { Shot } from '../boss/cinema';

/** High off the wall you came in by: this far back past the middle (m), across, up; pushing in this far. */
const HIGH: readonly [number, number, number] = [17, 6, 31];
const HIGH_PUSH = 5;
/** This share through its pour, the view drops to the floor: this far from the middle toward you (m), across, up. */
const POUR_CUT = 0.5;
const LOW: readonly [number, number, number] = [9, 6, 0.55];
/** In front of its heap as it closes: this far toward you (m, closing to the second), this far across, up. */
const HEAP: readonly [number, number] = [11, 7];
const HEAP_SIDE = 1.5;
const HEAP_UP = 1.1;
/** Close on its eye: this far toward you (m), across, up; aimed this far off to its right as you see it (it on the left). */
const EYE_AT: readonly [number, number, number] = [4.2, 0.8, 1.5];
const FRAME_LEFT = 1.6;
/** Through its laser's sweep: this far toward you, across, up. Back into your eyes over this long (s). */
const SWEEP_AT: readonly [number, number, number] = [13, 5, 3.2];
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

/** How far its high shots push the haze out (0..1; the floor's view: dungeonView.ts). */
export function swarmWide(run: BossRun): number {
  if (run.kind !== 'swarm' || !run.ownShow || run.beat !== 'intro') return 0;
  const s = swarmBeats();
  return smooth(run.t / 0.5) * (1 - smooth((run.t - s.heapFrom) / 0.5));
}

export class SwarmCinema {
  private readonly eye = shot();
  private readonly rise = shot();
  private readonly mid = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly toYou = new THREE.Vector3();
  private readonly aside = new THREE.Vector3();
  endYaw = 0;
  endPitch = 0;

  constructor(private readonly level: DungeonLevel) {
    const e = level.boss.entrance;
    this.fwd.set(e === 'w' ? 1 : e === 'e' ? -1 : 0, 0, e === 'n' ? 1 : e === 's' ? -1 : 0);
    this.right.set(-this.fwd.z, 0, this.fwd.x);
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
    this.endPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(swarmEyeHeight() - eye.y, Math.hypot(dx, dz))));
  }

  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = swarmBeats();
    const pourLong = s.heapFrom - s.pourFrom;
    const cut = s.pourFrom + pourLong * POUR_CUT;
    if (t < s.pull) return blend(this.eye, this.rise, t / s.pull, out);
    if (t < s.pull + EASE) return blend(this.rise, this.high(t, a), (t - s.pull) / EASE, out);
    if (t < cut) return this.high(t, out);
    if (t < s.heapFrom) return this.low(out);
    if (t < s.openFrom) return this.heap(t, out);
    if (t < s.sweepFrom) return this.opening(out);
    if (t < s.end - BACK) return this.sweep(out);
    a.pos.copy(eye);
    a.look.set(eye.x - Math.sin(this.endYaw) * 20, eye.y + Math.tan(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * 20);
    return blend(this.sweep(b), a, (t - (s.end - BACK)) / BACK, out);
  }

  static named(t: number): boolean {
    const s = swarmBeats();
    return t >= s.slowFrom - 0.05 && t < s.slowTo + 0.2;
  }

  /** The place heaving: its walls going, its heap closing, its eye opening, its laser. */
  shake(camera: THREE.Camera, t: number) {
    const s = swarmBeats();
    let amp = 0;
    if (t >= s.pourFrom && t < s.heapFrom) amp += 0.22;
    amp += 1.2 * pulse(t - s.heapFrom, 1);
    if (t >= s.openFrom && t < s.slowTo) amp += 0.1;
    if (t >= s.sweepFrom && t < s.sweepTo) amp += 0.2;
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.35;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.35;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.35;
    camera.rotateZ(amp * 0.03 * Math.sin(t * 53));
  }

  private high(t: number, out: Shot): Shot {
    const s = swarmBeats();
    const k = smooth((t - s.pourFrom) / Math.max(0.1, (s.heapFrom - s.pourFrom) * POUR_CUT));
    out.pos.copy(this.mid).addScaledVector(this.fwd, -(HIGH[0] - HIGH_PUSH * k)).addScaledVector(this.right, HIGH[1]).setY(HIGH[2]);
    out.look.copy(this.mid);
    return out;
  }

  /** Low on the floor, worms pouring past, looking out at where they're coming from. */
  private low(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.fwd, -LOW[0]).addScaledVector(this.right, LOW[1]).setY(LOW[2]));
    out.look.copy(this.mid).addScaledVector(this.right, 2).setY(1.2);
    return out;
  }

  private heap(t: number, out: Shot): Shot {
    const s = swarmBeats();
    const k = smooth((t - s.heapFrom) / Math.max(0.1, s.openFrom - s.heapFrom));
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, HEAP[0] + (HEAP[1] - HEAP[0]) * k).addScaledVector(this.aside, HEAP_SIDE).setY(HEAP_UP));
    out.look.copy(this.mid).setY(swarmEyeHeight());
    return out;
  }

  private opening(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, EYE_AT[0]).addScaledVector(this.aside, EYE_AT[1]).setY(EYE_AT[2]));
    out.look.copy(this.mid).setY(swarmEyeHeight()).addScaledVector(this.aside, FRAME_LEFT);
    return out;
  }

  private sweep(out: Shot): Shot {
    this.clear(out.pos.copy(this.mid).addScaledVector(this.toYou, SWEEP_AT[0]).addScaledVector(this.aside, SWEEP_AT[1]).setY(SWEEP_AT[2]));
    out.look.copy(this.mid).setY(swarmEyeHeight());
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
