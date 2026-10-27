// A stand-in for Rapier in rule tests: a flat floor at y = 0 (optionally ending at a ledge), optional walls
// along x, and an optional ceiling.
import type { Vector3 } from 'three';
import type { CollisionWorld, MoveResult } from '../../src/sim/collisionWorld';
import { BODY } from '../../src/sim/player/body';
import { PlayerState } from '../../src/sim/player/state';
import { PlayerIntent, emptyIntent } from '../../src/sim/player/intent';
import { stepPlayer } from '../../src/sim/player/step';
import type { JumpPad } from '../../src/world/arena';

export interface FakeWall {
  /** The wall's surface is the plane x = this. */
  x: number;
  /** Which way it faces: -1 (wall on your +x side) or 1 (wall on your -x side). */
  normalX: -1 | 1;
}

export class FlatWorld implements CollisionWorld {
  walls: FakeWall[] = [];
  /** The floor only exists where z >= this (a ledge). */
  floorFromZ = -Infinity;
  /** A ceiling's height, if any. */
  ceiling: number | null = null;
  /** The crouched flag from the last move. */
  lastCrouched = false;

  movePlayer(pos: Vector3, delta: Vector3, crouched: boolean, out: MoveResult) {
    this.lastCrouched = crouched;
    out.grounded = out.hitCeiling = out.wall = false;
    out.wallNormal.set(0, 0, 0);
    const wasAbove = pos.y >= -1e-9;
    pos.add(delta);
    if (wasAbove && pos.z >= this.floorFromZ && pos.y <= 0) {
      pos.y = 0;
      out.grounded = delta.y <= 0;
    }
    for (const w of this.walls) {
      const limit = w.x + w.normalX * BODY.radius;
      if ((w.normalX < 0 && pos.x > limit) || (w.normalX > 0 && pos.x < limit)) {
        pos.x = limit;
        out.wall = true;
        out.wallNormal.set(w.normalX, 0, 0);
      }
    }
    const h = crouched ? BODY.crouchHeight : BODY.height;
    if (this.ceiling !== null && pos.y + h > this.ceiling) {
      pos.y = this.ceiling - h;
      out.hitCeiling = true;
    }
  }

  probeWall(pos: Vector3, reach: number, outNormal: Vector3): boolean {
    for (const w of this.walls) {
      if (Math.abs(pos.x - w.x) - BODY.radius <= reach) {
        outNormal.set(w.normalX, 0, 0);
        return true;
      }
    }
    return false;
  }

  canStand(pos: Vector3): boolean {
    return this.ceiling === null || pos.y + BODY.height <= this.ceiling;
  }

  /** The floor (y = 0) and the walls' planes. */
  rayDistance(origin: Vector3, dir: Vector3, max: number): number {
    let best = Infinity;
    if (dir.y < 0) best = Math.min(best, -origin.y / dir.y);
    for (const w of this.walls) {
      if (dir.x === 0) continue;
      const t = (w.x - origin.x) / dir.x;
      if (t >= 0) best = Math.min(best, t);
    }
    return best <= max ? best : Infinity;
  }
}

export const DT = 1 / 120;

/** Runs `ticks` movement ticks; `intent(i)` gives tick i's input (default: nothing pressed). Returns every
 *  event kind seen, in order. */
export function run(p: PlayerState, world: CollisionWorld, ticks: number, intent: (i: number) => Partial<PlayerIntent> = () => ({}), pads: JumpPad[] = []): string[] {
  const seen: string[] = [];
  for (let i = 0; i < ticks; i++) {
    stepPlayer(p, { ...emptyIntent(p.yaw), ...intent(i) }, world, pads, DT);
    for (let e = 0; e < p.events.length; e++) seen.push(p.events.at(e).kind);
    p.events.clear();
  }
  return seen;
}

/** Ticks in `seconds`. */
export const ticks = (seconds: number) => Math.round(seconds / DT);
