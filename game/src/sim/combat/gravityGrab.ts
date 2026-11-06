// Update 0.3.82 — Gravity Sean's right click in normal mode, Grab (enemy_bibles/Born to Retry — Gravity Sean.docx: "pull a piece of the environment … RMB again to throw it"). From
// the bible's rules: "never run out: with nothing loose nearby, rip a chunk out of the floor. It leaves a crater and RMB always works"; "hold it as a shield: while held, the
// piece blocks projectiles from the front"; "size matters: small debris throws fast; big chunks throw slow but hit hard"; "grabbable objects get a faint outline when you aim
// at them" (`g.aim`, which the view outlines). What's grabbable for now: a pillar, whole (a big chunk, its stump left), and the floor (a small one). The floor's other pieces
// have no rules of their own to tear them from: a placeholder. Pure.
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import type { CollisionWorld } from '../collisionWorld';
import { launch } from '../enemies/flight';
import type { PlayerState } from '../player/state';
import { gravBlast } from './gravity';
import { CRATERS, type Rock } from './gravityMeter';
import { pillarBetween, PILLAR_CUT } from './pillars';
import { aim } from './punch';
import type { CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

/** How far under the eye a held piece sits (m). */
const HELD_LOW = 0.15;
/** Rising, the eased share of the way it's come. */
const smooth = (x: number) => (x >= 1 ? 1 : x * x * (3 - 2 * x));
const DOWN = new Vector3(0, -1, 0);
const LOW_ENOUGH = 0.7;

const eye = new Vector3();
const dir = new Vector3();
const end = new Vector3();
const flat = new Vector3();
const from = new Vector3();
const seg = new Vector3();
const hit = emptyTargetHit();

/** What right click would take if pressed now, written to `g.aim`: the pillar on your line of sight, or the floor where you look, or just ahead. */
export function aimGrab(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld) {
  const a = state.grav.aim;
  const v = SEAN.v;
  aim(player, yaw, pitch, eye, dir);
  const d = Math.min(v.grabRange, world.rayDistance(eye, dir, v.grabRange));
  end.copy(eye).addScaledVector(dir, d);
  const p = pillarBetween(state.pillars, eye.x, eye.z, end.x + dir.x * 0.6, end.z + dir.z * 0.6, v.grabMargin);
  if (p >= 0) {
    a.pillar = p;
    a.x = state.pillars[p].x;
    a.y = player.pos.y;
    a.z = state.pillars[p].z;
    return;
  }
  a.pillar = -1;
  if (d < v.grabRange && end.y <= player.pos.y + LOW_ENOUGH) {
    a.x = end.x;
    a.z = end.z;
  } else {
    // At a wall or the sky: the floor a little ahead of you (never through a wall).
    flat.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    const ahead = Math.max(0.5, Math.min(v.grabAhead, world.rayDistance(eye, flat, v.grabAhead) - 0.5));
    a.x = player.pos.x + flat.x * ahead;
    a.z = player.pos.z + flat.z * ahead;
  }
  from.set(a.x, player.pos.y + 0.5, a.z);
  const down = world.rayDistance(from, DOWN, 60);
  a.y = Number.isFinite(down) ? from.y - down : player.pos.y;
}

/** Takes what `g.aim` says. */
function grab(state: CombatState) {
  const g = state.grav;
  const a = g.aim;
  const v = SEAN.v;
  const big = a.pillar >= 0;
  let rise = a.y;
  if (big) {
    // Torn out whole, its stump left: engine/pillarEvents.ts swaps its collision and takes it out of the floor's view.
    const p = state.pillars[a.pillar];
    p.broken = true;
    p.stump = p.box ? { ...p.box, y: (p.h * PILLAR_CUT) / 2, h: p.h * PILLAR_CUT } : null;
    p.top = null;
    rise = a.y + p.h * 0.6;
    state.events.push('seanPillar', a.pillar, p.x, p.h * PILLAR_CUT, p.z);
  } else {
    const c = g.craters[g.nextCrater++ % CRATERS];
    c.on = true;
    c.x = a.x;
    c.y = a.y;
    c.z = a.z;
    c.r = v.craterSize;
  }
  g.held = { big, r: big ? v.bigSize : v.smallSize, t: 0, from: new Vector3(a.x, rise, a.z), at: new Vector3(a.x, rise, a.z) };
  g.grabWait = v.grabWait;
  state.events.push('seanGrab', big ? 1 : 0, a.x, a.y, a.z);
}

/** Where it hangs, and what it stops. */
function holdPiece(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const g = state.grav;
  const h = g.held;
  if (!h) return;
  const v = SEAN.v;
  h.t += dt;
  aim(player, yaw, pitch, eye, dir);
  const want = h.big ? v.holdBig : v.holdSmall;
  const room = Math.max(h.r + 0.2, Math.min(want, world.rayDistance(eye, dir, want + h.r) - h.r));
  end.copy(eye).addScaledVector(dir, room);
  end.y -= HELD_LOW;
  h.at.lerpVectors(h.from, end, smooth(h.t / v.grabRise));
  // The shield: from the front, because that's where it is.
  if (h.t < v.grabRise * 0.5) return;
  for (const o of state.orbs) {
    if (!o.alive || o.parried || o.pos.distanceTo(h.at) > h.r + v.shieldMargin) continue;
    o.alive = false;
    state.events.push('orbPop', 0, o.pos.x, o.pos.y, o.pos.z);
    state.events.push('seanBlock', 0, o.pos.x, o.pos.y, o.pos.z);
  }
}

/** Thrown: along your aim from where it hung, at what you're looking at. */
function throwPiece(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld) {
  const g = state.grav;
  const h = g.held;
  if (!h) return;
  const v = SEAN.v;
  const r = g.rocks.find((k) => !k.alive);
  aim(player, yaw, pitch, eye, dir);
  const far = Math.min(v.throwSight, world.rayDistance(eye, dir, v.throwSight));
  end.copy(eye).addScaledVector(dir, far);
  if (r) {
    r.alive = true;
    r.big = h.big;
    r.r = h.r;
    r.left = v.rockLife;
    r.pos.copy(h.at);
    r.vel.subVectors(end, h.at).normalize().multiplyScalar(h.big ? v.bigSpeed : v.smallSpeed);
  }
  g.held = null;
  g.grabWait = v.grabWait;
  state.events.push('seanThrow', h.big ? 1 : 0, h.at.x, h.at.y, h.at.z);
}

/** Dropped, by going Unstable or an overload: it falls apart where it hung. */
export function dropPiece(state: CombatState) {
  const g = state.grav;
  const h = g.held;
  if (!h) return;
  g.held = null;
  state.events.push('seanShatter', h.big ? 1 : 0, h.at.x, h.at.y, h.at.z);
}

/** Right click in normal mode, each tick. */
export function stepSeanGrab(state: CombatState, player: PlayerState, pressed: boolean, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const g = state.grav;
  g.grabWait = Math.max(0, g.grabWait - dt);
  if (g.held) {
    if (pressed && g.grabWait <= 0) throwPiece(state, player, yaw, pitch, world);
    else holdPiece(state, player, yaw, pitch, world, dt);
    return;
  }
  aimGrab(state, player, yaw, pitch, world);
  if (pressed && g.grabWait <= 0) grab(state);
}

function shatter(state: CombatState, r: Rock) {
  const v = SEAN.v;
  r.alive = false;
  state.events.push('seanShatter', r.big ? 1 : 0, r.pos.x, r.pos.y, r.pos.z);
  if (r.big) gravBlast(state, r.pos.x, Math.max(0, r.pos.y - 1), r.pos.z, v.bigBlast, v.bigBlastDamage, v.bigKnock * 0.6);
}

/** What's been thrown, each tick. */
export function stepRocks(state: CombatState, world: CollisionWorld, dt: number) {
  const v = SEAN.v;
  for (const r of state.grav.rocks) {
    if (!r.alive) continue;
    r.left -= dt;
    if (r.big) r.vel.y -= v.bigDrop * dt;
    const speed = r.vel.length();
    const len = speed * dt;
    seg.copy(r.vel).multiplyScalar(1 / Math.max(speed, 1e-6));
    const wall = world.rayDistance(r.pos, seg, len + r.r * 0.5);
    end.copy(r.pos).addScaledVector(seg, Math.min(len, wall));
    if (nearestTarget(state, r.pos, end, r.r, hit, false)) {
      const fl = Math.hypot(seg.x, seg.z) || 1;
      const killed = landHit(state, hit, r.big ? v.bigDamage : v.smallDamage, r.big ? v.bigKnock : v.smallKnock, seg.x / fl, seg.z / fl, 'hitPierce', 1);
      if (killed && hit.kind === 'enemy') launch(state.enemies[hit.index], seg.x / fl, seg.z / fl);
      r.pos.copy(hit.point);
      shatter(state, r);
      continue;
    }
    if (wall <= len + r.r * 0.5 || r.left <= 0) {
      r.pos.copy(end);
      shatter(state, r);
      continue;
    }
    r.pos.copy(end);
  }
}
