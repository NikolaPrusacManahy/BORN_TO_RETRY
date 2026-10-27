// M1 — everything the movement rules remember about the player between ticks.
import { Vector3 } from 'three';
import { EventQueue } from '../../core/eventQueue';
import { DASH, WALL } from '../../tuning/movement';

export type MoveEvent =
  | 'none'
  | 'jump'
  | 'slideJump'
  | 'dashJump'
  | 'wallJump'
  | 'slamBounce'
  | 'pad'
  | 'land'
  | 'dash'
  | 'slideStart'
  | 'slideEnd'
  | 'slam'
  | 'slamLand';

export interface PlayerState {
  /** Feet position. */
  pos: Vector3;
  vel: Vector3;
  /** Facing (rad); 0 faces -z. Set from the mouse every tick. */
  yaw: number;
  grounded: boolean;
  /** Time left to still jump after walking off a ledge. */
  coyote: number;
  /** Time left on a jump pressed too early. */
  jumpBuffer: number;
  /** Dash charges, fractional while refilling. */
  dashCharges: number;
  /** Time left in the current dash (0 = not dashing). */
  dashTime: number;
  dashDir: Vector3;
  sliding: boolean;
  slideDir: Vector3;
  slideSpeed: number;
  wallJumpsLeft: number;
  /** Touching a wall after the last move, and its normal. */
  onWall: boolean;
  wallNormal: Vector3;
  slamming: boolean;
  /** Time left to bounce after a slam landing. */
  slamBounce: number;
  /** Time left invincible. */
  invuln: number;
  /** What happened this tick, for the camera, sound and HUD. */
  events: EventQueue<MoveEvent>;
}

export function createPlayer(x: number, y: number, z: number, yaw: number): PlayerState {
  return {
    pos: new Vector3(x, y, z),
    vel: new Vector3(),
    yaw,
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    dashCharges: DASH.v.charges,
    dashTime: 0,
    dashDir: new Vector3(0, 0, -1),
    sliding: false,
    slideDir: new Vector3(0, 0, -1),
    slideSpeed: 0,
    wallJumpsLeft: WALL.v.count,
    onWall: false,
    wallNormal: new Vector3(),
    slamming: false,
    slamBounce: 0,
    invuln: 0,
    events: new EventQueue<MoveEvent>(32, 'none'),
  };
}

/** Back to the start, standing still, everything refilled. */
export function resetPlayer(p: PlayerState, x: number, y: number, z: number, yaw: number) {
  p.pos.set(x, y, z);
  p.vel.set(0, 0, 0);
  p.yaw = yaw;
  p.grounded = false;
  p.coyote = p.jumpBuffer = p.dashTime = p.slamBounce = p.invuln = 0;
  p.dashCharges = DASH.v.charges;
  p.sliding = p.slamming = p.onWall = false;
  p.wallJumpsLeft = WALL.v.count;
  p.events.clear();
}

/** Horizontal speed (m/s). */
export function flatSpeed(p: PlayerState): number {
  return Math.hypot(p.vel.x, p.vel.z);
}

export type MoveMode = 'ground' | 'air' | 'slide' | 'dash' | 'slam' | 'wall';

/** For the debug overlay and camera. */
export function moveMode(p: PlayerState): MoveMode {
  if (p.dashTime > 0) return 'dash';
  if (p.slamming) return 'slam';
  if (p.sliding) return 'slide';
  if (p.grounded) return 'ground';
  return p.onWall ? 'wall' : 'air';
}
