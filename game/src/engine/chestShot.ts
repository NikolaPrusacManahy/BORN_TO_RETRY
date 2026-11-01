// Update 0.2.0 — the view goes to a chest as it rises out of the floor (the designer: "the camera pans where the chest
// emerges from the ground and comes back to the player"): from your eyes it glides to a spot in front of the chest, a
// little above it, looking down at it; holds while the chest comes up; then glides back into your eyes. You don't move
// or fight meanwhile (the run reads `locked`). Not for the boss's chest: the wooden gate's shot shows that one. Pure
// maths on the camera (no rendering), so it's tested headless.
// Update 0.2.1 (the designer) — every room's chest rises once its room is won, so every one gets the shot.
// Update 0.2.21 — a tester died in lava: the last enemy, flying over a pit, died, the view went to the chest, and you fell
// on meanwhile. Now the shot waits for you to be on the ground (a chest that rose while you were in the air is shown
// when you land, if it's soon), and while it runs the world holds still (engine/run.ts: only the chest comes up), so
// you come back to just where and how you were.
import * as THREE from 'three';
import type { Treasure } from '../sim/dungeon/treasure';
import { ITEMS } from '../tuning/items';
import type { Shot } from './boss/cinema';

/** Seconds to glide there and back; to hold once the chest is up. */
export const GLIDE = 0.7;
const AFTER = 0.4;
/** The spot: this far in front of the chest and this high (m); it looks at this height over the chest's foot. */
const OUT = 4.2;
const UP = 2.4;
const AT = 0.45;
/** A chest that rose while you were off the ground is shown if you land within this long (s); later, not at all. */
export const WAIT = 4;

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

const dir = new THREE.Vector3();

export class ChestShot {
  /** The chest it's showing (−1: none), seconds into it, and the chests already shown (on this treasure). */
  private chest = -1;
  private t = 0;
  private treasure: Treasure | null = null;
  private readonly shown = new Set<number>();
  /** Chests seen rising and not shown yet, and the seconds since. */
  private readonly risen = new Map<number, number>();
  private readonly eye: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private readonly spot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private readonly out: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

  /** A shot is on: you don't move, look or fight. */
  get locked(): boolean {
    return this.chest >= 0;
  }

  /** How long a shot lasts (s). */
  static duration(): number {
    return GLIDE + ITEMS.v.chestRise + AFTER + GLIDE;
  }

  /** After the camera rig has put the view in your eyes: starts a shot for a chest that has begun rising, once you're
   *  `grounded`, and while one runs, takes the view. Returns true then (the arms aren't drawn). */
  update(real: number, t: Treasure, camera: THREE.PerspectiveCamera, grounded = true): boolean {
    if (t !== this.treasure) {
      this.treasure = t;
      this.shown.clear();
      this.risen.clear();
      this.chest = -1;
    }
    if (this.chest < 0) {
      t.chests.forEach((c, k) => {
        if (c.state === 'rising' && !c.boss && !this.shown.has(k) && !this.risen.has(k)) this.risen.set(k, 0);
      });
      let i = -1;
      for (const [k, s] of this.risen) {
        this.risen.set(k, s + real);
        if (s + real > WAIT) {
          this.risen.delete(k);
          this.shown.add(k);
        } else if (i < 0) i = k;
      }
      if (i < 0 || !grounded) return false;
      this.risen.delete(i);
      this.start(i, t, camera);
    }
    this.t += real;
    const total = ChestShot.duration();
    if (this.t >= total) {
      this.chest = -1;
      return false;
    }
    const s = this.t < GLIDE ? smooth(this.t / GLIDE) : this.t < total - GLIDE ? 1 : 1 - smooth((this.t - (total - GLIDE)) / GLIDE);
    this.out.pos.lerpVectors(this.eye.pos, this.spot.pos, s);
    this.out.look.lerpVectors(this.eye.look, this.spot.look, s);
    camera.position.copy(this.out.pos);
    camera.lookAt(this.out.look);
    return true;
  }

  private start(i: number, t: Treasure, camera: THREE.PerspectiveCamera) {
    const c = t.chests[i].spot;
    this.chest = i;
    this.t = 0;
    this.shown.add(i);
    camera.getWorldDirection(dir);
    this.eye.pos.copy(camera.position);
    this.eye.look.copy(camera.position).addScaledVector(dir, 20);
    this.spot.pos.set(c.x + c.fx * OUT, UP, c.z + c.fz * OUT);
    this.spot.look.set(c.x, AT, c.z);
  }
}
