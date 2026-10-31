// M1 — everything the movement rules remember about the player between ticks.
import { Vector3 } from 'three';
import { EventQueue } from '../../core/eventQueue';
import { HEALTH } from '../../tuning/health';
import { DASH, WALL } from '../../tuning/movement';
import type { EnemyKind } from '../enemies/kinds';

export type MoveEvent =
  // Update 0.0.20 — fell into lava (sent back to the floor's start).
  | 'lavaBurn'
  | 'poisoned'
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
  | 'shieldBreak'
  // Update 0.2.11 — swimming: a kick, pushing off the floor.
  | 'swimKick'
  | 'swimPush';

/** Update 0.1.14 — what hurt you (the death screen names what killed you): an enemy's kind, or the world. */
export type Cause = EnemyKind | 'turret' | 'spikes' | 'lava' | 'fall';

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
  /** Update 0.0.13 — run speed times this (the blue rings; Update 0.0.17: and the blue potion). */
  speedMul: number;
  /** Update 0.0.17 — max health on top of the base (the red rings). */
  hpBonus: number;
  /** Update 0.0.18 — poisoned: seconds left, and damage a second meanwhile. */
  poison: number;
  poisonDps: number;
  /** Update 0.2.8 — the Velociraptor's: sand in your eyes (seconds left: the screen blurred), and no dashing (seconds
   *  left: its screech). */
  blind: number;
  dashLock: number;
  /** Update 0.2.10 — the Squidle's ink over your view (seconds left); the water dragging you along (m/s, flat: the
   *  Drowned King's whirlpool), set each tick by what drags you. */
  ink: number;
  current: Vector3;
  /** Update 0.2.11 — under water (floor 6): you swim (swim.ts) and this is the water's top over the floor (m); 0: on
   *  foot. Set by the run each tick. */
  swimTop: number;
  /** Update 0.1.14 — what last took your health (null: nothing yet), and who poisoned you. */
  hurtBy: Cause | null;
  poisonBy: Cause | null;
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
    hpBonus: 0,
    poison: 0,
    poisonDps: 0,
    blind: 0,
    ink: 0,
    current: new Vector3(),
    swimTop: 0,
    dashLock: 0,
    hurtBy: null,
    poisonBy: null,
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
  p.current.set(0, 0, 0);
  p.yaw = yaw;
  p.grounded = false;
  p.coyote = p.jumpBuffer = p.dashTime = p.slamBounce = p.slamImpact = p.invuln = p.slideTime = p.wallRunTime = p.wallRunCooldown = p.hurtTime = 0;
  p.hp = HEALTH.v.maxHp;
  p.shield = p.kneel = p.hpBonus = p.poison = p.poisonDps = p.blind = p.dashLock = p.ink = 0;
  p.dead = false;
  p.hurtBy = p.poisonBy = null;
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
