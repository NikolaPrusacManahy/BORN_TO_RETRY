// M1 — what the movement rules need from collision. physics/rapierWorld.ts implements it with Rapier;
// tests use a flat-floor fake. sim/ never imports Rapier.
import type { Vector3 } from 'three';

export interface MoveResult {
  grounded: boolean;
  /** Bumped a ceiling on the way up. */
  hitCeiling: boolean;
  /** Touched a wall; `wallNormal` points away from it (horizontal). */
  wall: boolean;
  wallNormal: Vector3;
}

export interface CollisionWorld {
  /** Moves the player's capsule (feet at `pos`) by `delta`, sliding along what it hits. Updates `pos`. */
  movePlayer(pos: Vector3, delta: Vector3, crouched: boolean, out: MoveResult): void;
  /** Is a wall within `reach` of the capsule's side? Writes the wall's normal (pointing away from it). */
  probeWall(pos: Vector3, reach: number, outNormal: Vector3): boolean;
  /** Is there room to stand up at `pos`? */
  canStand(pos: Vector3): boolean;
}
