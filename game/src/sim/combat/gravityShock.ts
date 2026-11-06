// Update 0.3.84 — Gravity Sean's Ctrl in Unstable mode, Shockwave Punch (the designer: "CTRL is a massing shockwave punch forward capable of hitting a good amount of enemies that has a 5 sec cooldown.
// mid air is the same"). His right fist drawn back an instant, then driven out: everything in a wide cone along your aim takes it, walls stopping it, hardest close to, and is thrown away along your aim. The same on
// the ground or in the air, so Unstable mode has no plunge; in the air it holds you up a moment. Like every hit of the fists it lands the instant it's thrown. Pure.
import { Vector3 } from 'three';
import { FEEDBACK } from '../../tuning/combat';
import { SEAN } from '../../tuning/sean';
import { wallBetween } from '../../world/navGrid';
import { isLive, radiusOf } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { ENEMY_STATS } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import { instabFactor } from './gravityMeter';
import { aim } from './punch';
import type { CombatState } from './state';
import { emptyTargetHit, landHit, type TargetKind } from './strike';
import { TARGET_SHAPES } from './targets';

const eye = new Vector3();
const dir = new Vector3();
const to = new Vector3();
const dummyAt = new Vector3();
const hit = emptyTargetHit();

/** Ctrl in Unstable mode, if it's been long enough. */
export function tryShock(state: CombatState, player: PlayerState, pressed: boolean): boolean {
  const g = state.grav;
  if (!pressed || g.shock >= 0 || g.shockWait > 0) return false;
  g.shockWait = SEAN.v.shockWait;
  g.shock = 0;
  state.events.push('seanShockUp', 0, player.pos.x, player.pos.y, player.pos.z);
  return true;
}

/** One target in it: whether it was. */
function strike(state: CombatState, player: PlayerState, kind: TargetKind, index: number, pos: Vector3, r: number, height: number, fx: number, fz: number): boolean {
  const v = SEAN.v;
  to.set(pos.x, pos.y + height * 0.5, pos.z).sub(eye);
  const along = to.dot(dir);
  if (along < -r || along > v.shockRange + r) return false;
  const off = to.addScaledVector(dir, -along).length();
  const wide = Math.max(v.shockNear, Math.max(0, along) * Math.tan((v.shockCone * Math.PI) / 180));
  if (off > wide + r || wallBetween(state.nav.small, player.pos.x, player.pos.z, pos.x, pos.z)) return false;
  hit.kind = kind;
  hit.index = index;
  hit.part = 0;
  hit.s = 0;
  hit.point.set(pos.x, pos.y + height * 0.5, pos.z);
  const far = Math.min(1, Math.max(0, along) / v.shockRange);
  const damage = Math.round(v.shockDamage * instabFactor(state.grav) * (1 + (v.shockFar - 1) * far));
  const killed = landHit(state, hit, damage, v.shockKnock, fx, fz, 'hitSlam', damage);
  if (killed && kind === 'enemy') launch(state.enemies[index], fx, fz);
  return true;
}

/** It goes. */
function fire(state: CombatState, player: PlayerState, yaw: number, pitch: number) {
  const v = SEAN.v;
  aim(player, yaw, pitch, eye, dir);
  // (Straight down there's no way along the floor: then the way you face.)
  const flat = Math.hypot(dir.x, dir.z);
  const fx = flat > 0.05 ? dir.x / flat : -Math.sin(yaw);
  const fz = flat > 0.05 ? dir.z / flat : -Math.cos(yaw);
  let struck = false;
  state.dummies.forEach((d, i) => {
    if (d.broken) return;
    dummyAt.set(d.home.x + d.offset.x, d.home.y, d.home.z + d.offset.z);
    struck = strike(state, player, 'dummy', i, dummyAt, TARGET_SHAPES.dummy.radius, TARGET_SHAPES.dummy.height, fx, fz) || struck;
  });
  state.enemies.forEach((e, i) => {
    if (isLive(e)) struck = strike(state, player, 'enemy', i, e.pos, radiusOf(e), ENEMY_STATS[e.kind]().height, fx, fz) || struck;
  });
  // It throws you back; in the air it holds you up as well.
  player.vel.x -= fx * v.shockRecoil;
  player.vel.z -= fz * v.shockRecoil;
  if (!player.grounded) player.vel.y = Math.max(player.vel.y, v.shockLift);
  state.grav.clash = v.clashFor;
  state.events.push('seanShock', player.grounded ? 1 : 0, eye.x + dir.x * v.shockRange, eye.y + dir.y * v.shockRange, eye.z + dir.z * v.shockRange);
  if (struck) state.hitStop.request(FEEDBACK.v.stopHeavy);
}

/** Its wind-up, each tick. */
export function stepShock(state: CombatState, player: PlayerState, yaw: number, pitch: number, dt: number) {
  const g = state.grav;
  if (g.shock < 0) return;
  g.shock += dt;
  if (g.shock < SEAN.v.shockWindup) return;
  g.shock = -1;
  fire(state, player, yaw, pitch);
}
