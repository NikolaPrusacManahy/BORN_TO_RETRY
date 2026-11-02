// M1 — one movement tick: timers → actions (dash, slide, wall run, jumps) → velocity → collision → landing.
// Each mechanic lives in its own module; this file only decides the order.
// Update 0.2.11 — under water (floor 6) you swim instead (swim.ts): no dash, slide, wall run or wall jump, the slam
// still dives; kicks come back slower; your eyes never leave the water.
import { Vector3 } from 'three';
import { MOVE, WALL } from '../../tuning/movement';
import { SWIM } from '../../tuning/swim';
import type { JumpPad } from '../../world/arena';
import type { CollisionWorld, MoveResult } from '../collisionWorld';
import { airMove, applyGravity } from './air';
import { refillDash, tryStartDash, updateDash } from './dash';
import { groundMove } from './ground';
import type { PlayerIntent } from './intent';
import { updateKneel } from './kneel';
import { tryAirJump, tryGroundJump, updateJumpTimers } from './jump';
import { checkPads } from './jumpPad';
import { landSlam, tryStartSlam, updateSlam } from './slam';
import { armSlide, canStartSlide, endSlide, slideOver, startSlide, updateSlide } from './slide';
import type { PlayerState } from './state';
import { swim, swimCeiling } from './swim';
import { applyWallSlide, tryWallJump } from './wallJump';
import { endWallRun, tryStartWallRun, updateWallRun, wallRunJump } from './wallRun';

/** While on the ground, each tick asks to move this far down so ground contact is never lost (m). */
export const GROUND_STICK = 0.02;

// Scratch objects: one tick makes no garbage.
const wish = new Vector3();
const wallN = new Vector3();
const delta = new Vector3();
const move: MoveResult = { grounded: false, hitCeiling: false, wall: false, wallNormal: new Vector3() };

/** The wanted direction on the ground plane (length 1, or 0 with no input). */
export function wishDirection(moveX: number, moveZ: number, yaw: number, out: Vector3): Vector3 {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  // Forward is (-sin, -cos); right is (cos, -sin).
  out.set(-s * moveZ + c * moveX, 0, -c * moveZ - s * moveX);
  const len = Math.hypot(out.x, out.z);
  if (len > 1e-6) out.multiplyScalar(1 / len);
  else out.set(0, 0, 0);
  return out;
}

export function stepPlayer(p: PlayerState, intent: PlayerIntent, world: CollisionWorld, pads: readonly JumpPad[], dt: number) {
  // Update 0.0.13 — kneeling at a chest, nothing else moves you.
  if (updateKneel(p, world, dt)) return;
  p.yaw = intent.yaw;
  updateJumpTimers(p, intent.jumpPressed, dt);
  p.slamBounce = Math.max(0, p.slamBounce - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.wallRunCooldown = Math.max(0, p.wallRunCooldown - dt);
  refillDash(p, p.swimTop > 0 ? dt / SWIM.v.kickRefill : dt);
  wishDirection(intent.moveX, intent.moveZ, p.yaw, wish);
  if (p.swimTop > 0) {
    if (tryStartSlam(p, intent.slamPressed, world)) endWallRun(p);
    if (p.slamming) updateSlam(p);
    else swim(p, intent, dt);
  } else steer(p, intent, world, dt);
  checkPads(p, pads);
  collide(p, intent, world, dt);
}

/** On foot: the actions, then the velocity. */
function steer(p: PlayerState, intent: PlayerIntent, world: CollisionWorld, dt: number) {
  // Actions. Update 0.0.3 — the slide key no longer slams in the air: a slide pressed in the air waits for the
  // landing. Update 0.0.12 — the slam has its own key (F).
  if (tryStartDash(p, intent.dashPressed, wish)) endWallRun(p);
  if (tryStartSlam(p, intent.slamPressed, world)) endWallRun(p);
  armSlide(p, intent.slidePressed, intent.slideHeld);
  if (canStartSlide(p, intent.slideHeld)) startSlide(p, wish);
  if (!p.grounded && !p.wallRunning) tryStartWallRun(p, intent, wish, world);
  if (p.jumpBuffer > 0 && !tryGroundJump(p)) {
    if (p.wallRunning) wallRunJump(p);
    // (Update 0.2.16 — Updraft, a Fate Card: else a jump in the air.)
    else if (!tryWallJump(p, world, wallN)) tryAirJump(p);
  }

  // Velocity.
  if (p.dashTime > 0) updateDash(p, dt);
  else if (p.slamming) updateSlam(p);
  else if (!(p.wallRunning && updateWallRun(p, intent, world, dt))) {
    if (p.sliding) updateSlide(p, wish, dt);
    else if (p.grounded) groundMove(p.vel, wish.x, wish.z, dt, p.speedMul, p.grip);
    else airMove(p.vel, wish.x, wish.z, dt, p.speedMul);
    if (!p.grounded) {
      applyGravity(p.vel, dt);
      applyWallSlide(p, wish);
    }
  }
}

/** Moves you as far as the world lets you, then what that did: walls, the ceiling, landing. */
function collide(p: PlayerState, intent: PlayerIntent, world: CollisionWorld, dt: number) {
  const wasGrounded = p.grounded;
  const fallSpeed = -p.vel.y;
  delta.copy(p.vel).multiplyScalar(dt);
  // (Update 0.2.10 — and the water dragging you.)
  delta.x += p.current.x * dt;
  delta.z += p.current.z * dt;
  if (p.grounded && p.vel.y <= 0) delta.y = -GROUND_STICK;
  world.movePlayer(p.pos, delta, p.sliding, move);

  p.onWall = move.wall;
  if (move.wall) {
    p.wallNormal.copy(move.wallNormal);
    // Speed into the wall is lost; speed along it is kept.
    const into = p.vel.x * move.wallNormal.x + p.vel.z * move.wallNormal.z;
    if (into < 0) {
      p.vel.x -= move.wallNormal.x * into;
      p.vel.z -= move.wallNormal.z * into;
    }
  }
  if (move.hitCeiling && p.vel.y > 0) p.vel.y = 0;
  // (Update 0.2.11 — swimming, never out of the water.)
  const ceiling = swimCeiling(p.swimTop);
  if (p.swimTop > 0 && p.pos.y > ceiling) {
    p.pos.y = ceiling;
    p.vel.y = Math.min(0, p.vel.y);
  }

  p.grounded = move.grounded && p.vel.y <= 0;
  if (wasGrounded && !p.grounded && p.vel.y <= 0) p.coyote = MOVE.v.coyoteTime; // walked off a ledge
  if (!wasGrounded && p.grounded) {
    endWallRun(p);
    p.lastWallSet = false; // any wall can be run on again
    p.wallJumpsLeft = WALL.v.count;
    p.airJumps = 1;
    if (p.slamming) landSlam(p, fallSpeed);
    else p.events.push('land', Math.max(0, fallSpeed));
  }
  if (p.grounded) p.vel.y = 0;
  if (p.sliding && slideOver(p, intent.slideHeld, world)) endSlide(p);
}
