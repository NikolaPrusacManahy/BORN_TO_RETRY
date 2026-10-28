// M1 — everything the movement rules remember about the player between ticks.
import { Vector3 } from 'three';
import { EventQueue } from '../../core/eventQueue';
import { HEALTH } from '../../tuning/health';
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
  | 'slamLand'
  | 'wallRunStart'
  | 'wallRunEnd'
  | 'wallRunJump'
  // M1 step 8 — health: value = the amount.
  | 'hurt'
  | 'death'
  // Update 0.0.13 — the shield took a hit (value = how much), and it's gone.
  | 'shieldHit'
  | 'shieldBreak';

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
  /** The speed the slide is heading for (never below the slide speed at the start; friction lowers it). */
  slideSpeed: number;
  /** The slide's actual speed, easing up to `slideSpeed`. */
  slideCur: number;
  /** Seconds into the current slide (it ends at the max). */
  slideTime: number;
  /** Update 0.0.3 — the slide key was pressed and is still held, and no slide has used that press yet. A slide
   *  needs a fresh press; one pressed in the air starts on landing. */
  slideArmed: boolean;
  wallJumpsLeft: number;
  /** Touching a wall after the last move, and its normal (also the wall being run on). */
  onWall: boolean;
  wallNormal: Vector3;
  /** Update 0.0.3 — wall running, for how long, and the run's direction along the wall. */
  wallRunning: boolean;
  wallRunTime: number;
  wallRunDir: Vector3;
  /** Time before another wall run may start (just after a wall-run jump). */
  wallRunCooldown: number;
  /** The last wall run on; it can't be run on again until you land. */
  lastWallNormal: Vector3;
  lastWallSet: boolean;
  slamming: boolean;
  /** Time left to bounce after a slam landing. */
  slamBounce: number;
  /** Update 0.0.12 — the height a slam started from, and the drop of the slam that just landed (> 0 until combat
   *  has dealt its blast). */
  slamFrom: number;
  slamImpact: number;
  /** Time left invincible (dashing). */
  invuln: number;
  /** M1 step 8 — health, the time left before something can hurt you again, and dead (until the respawn). */
  hp: number;
  hurtTime: number;
  dead: boolean;
  /** Update 0.0.13 — the shield (armour plates) that takes a hit before your health does. */
  shield: number;
  /** Update 0.0.13 — run speed times this (the blue rings). */
  speedMul: number;
  /** Update 0.0.13 — kneeling at a chest: seconds left (0: not), the spot you're eased onto, and the way you face. */
  kneel: number;
  kneelAt: Vector3;
  kneelYaw: number;
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
    slideCur: 0,
    slideTime: 0,
    slideArmed: false,
    wallJumpsLeft: WALL.v.count,
    onWall: false,
    wallNormal: new Vector3(),
    wallRunning: false,
    wallRunTime: 0,
    wallRunDir: new Vector3(0, 0, -1),
    wallRunCooldown: 0,
    lastWallNormal: new Vector3(),
    lastWallSet: false,
    slamming: false,
    slamBounce: 0,
    slamFrom: 0,
    slamImpact: 0,
    invuln: 0,
    hp: HEALTH.v.maxHp,
    hurtTime: 0,
    dead: false,
    shield: 0,
    speedMul: 1,
    kneel: 0,
    kneelAt: new Vector3(),
    kneelYaw: 0,
    events: new EventQueue<MoveEvent>(32, 'none'),
  };
}

/** Back to the start, standing still, everything refilled (health too; no shield). */
export function resetPlayer(p: PlayerState, x: number, y: number, z: number, yaw: number) {
  p.pos.set(x, y, z);
  p.vel.set(0, 0, 0);
  p.yaw = yaw;
  p.grounded = false;
  p.coyote = p.jumpBuffer = p.dashTime = p.slamBounce = p.slamImpact = p.invuln = p.slideTime = p.wallRunTime = p.wallRunCooldown = p.hurtTime = 0;
  p.hp = HEALTH.v.maxHp;
  p.shield = p.kneel = 0;
  p.dead = false;
  p.dashCharges = DASH.v.charges;
  p.sliding = p.slamming = p.onWall = p.slideArmed = p.wallRunning = p.lastWallSet = false;
  p.wallJumpsLeft = WALL.v.count;
  p.events.clear();
}

/** Horizontal speed (m/s). */
export function flatSpeed(p: PlayerState): number {
  return Math.hypot(p.vel.x, p.vel.z);
}

export type MoveMode = 'ground' | 'air' | 'slide' | 'dash' | 'slam' | 'wall' | 'wallrun';

/** For the debug overlay and camera. */
export function moveMode(p: PlayerState): MoveMode {
  if (p.dashTime > 0) return 'dash';
  if (p.slamming) return 'slam';
  if (p.wallRunning) return 'wallrun';
  if (p.sliding) return 'slide';
  if (p.grounded) return 'ground';
  return p.onWall ? 'wall' : 'air';
}
