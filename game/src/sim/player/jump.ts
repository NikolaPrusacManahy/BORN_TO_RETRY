// M1 — jumping from the ground, with coyote time and a jump buffer. What you were doing changes the jump:
// out of a dash or a slide you keep their speed, and right after a slam landing you bounce higher.
import { DASH, MOVE, SLAM, SLIDE } from '../../tuning/movement';
import { CARDS } from '../../tuning/cards';
import { bears } from '../cards/cards';
import type { PlayerState } from './state';
import { endSlide } from './slide';

/** Upward speed for a jump `mult` times the normal height. */
export function jumpSpeed(mult = 1): number {
  return Math.sqrt(2 * MOVE.v.gravity * MOVE.v.jumpHeight * mult);
}

/** Counts the jump timers down and banks a new press. */
export function updateJumpTimers(p: PlayerState, pressed: boolean, dt: number) {
  p.coyote = Math.max(0, p.coyote - dt);
  p.jumpBuffer = pressed ? MOVE.v.jumpBuffer : Math.max(0, p.jumpBuffer - dt);
}

/** Jumps if a jump is banked and you're on the ground (or just left it). Returns true if it did. */
export function tryGroundJump(p: PlayerState): boolean {
  if (p.jumpBuffer <= 0 || !(p.grounded || p.coyote > 0)) return false;
  let mult = 1;
  if (p.dashTime > 0) {
    p.vel.x = p.dashDir.x * DASH.v.speed * DASH.v.jumpKeep;
    p.vel.z = p.dashDir.z * DASH.v.speed * DASH.v.jumpKeep;
    p.dashTime = 0;
    p.events.push('dashJump');
  } else if (p.sliding) {
    // (Update 0.2.15 — Slingshot, a Fate Card: more of the slide's speed.)
    const keep = SLIDE.v.jumpKeep * (bears(p, 'slingshot') ? CARDS.v.slingshot : 1);
    p.vel.x = p.slideDir.x * p.slideCur * keep;
    p.vel.z = p.slideDir.z * p.slideCur * keep;
    endSlide(p);
    p.events.push('slideJump');
  } else if (p.slamBounce > 0) {
    mult = SLAM.v.bounceHeight;
    p.events.push('slamBounce');
  } else {
    p.events.push('jump');
  }
  p.vel.y = jumpSpeed(mult * lift(p));
  p.grounded = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  p.slamBounce = 0;
  return true;
}

/** Update 0.2.16 — Light Bones (a Fate Card): your jumps' height, times this. */
const lift = (p: PlayerState) => (bears(p, 'lightBones') ? 1 + CARDS.v.lightBones : 1);

/** Update 0.2.16 — Updraft (a Fate Card): a jump banked in the air jumps again, once until you land. Returns true if it
 *  did. */
export function tryAirJump(p: PlayerState): boolean {
  if (p.jumpBuffer <= 0 || p.grounded || p.airJumps <= 0 || !bears(p, 'updraft')) return false;
  p.airJumps--;
  p.vel.y = jumpSpeed(lift(p));
  p.jumpBuffer = 0;
  p.events.push('airJump');
  return true;
}
