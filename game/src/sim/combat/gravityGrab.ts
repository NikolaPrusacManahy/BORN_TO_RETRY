// Update 0.3.82 — Gravity Sean's right click in normal mode, Grab (enemy_bibles/Born to Retry — Gravity Sean.docx: "pull a piece of the environment"). From the bible's rules: "never run out: with nothing loose nearby,
// rip a chunk out of the floor. It leaves a crater and RMB always works"; "hold it as a shield: while held, the piece blocks projectiles from the front"; "size matters: small debris throws fast; big chunks throw slow but
// hit hard"; "grabbable objects get a faint outline when you aim at them" (`g.aim`, which the view outlines). What's grabbable for now: a pillar, whole (a big chunk, its stump left), and the floor (a small one). The floor's
// other pieces have no rules of their own to tear them from: a placeholder.
// Update 0.3.86 — the designer: "rmb when holding gather more rocks up to 5 sec, you see rocks being gathered from random close area in the room and makes the attack bigger". Right click pressed takes a piece, as ever. Held, a
// rock tears out of the floor somewhere near you every half second, each with its crater, and flies in to join it, for up to 5 s: the mass grows, and so does all it does. Let go: it's thrown. That's the same rule as Black
// Hole's on right click in Unstable mode, in place of the bible's "RMB again". A tap throws what you took as soon as it's up. Pure.
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import { freeAt, wallBetween } from '../../world/navGrid';
import type { CollisionWorld } from '../collisionWorld';
import { launch } from '../enemies/flight';
import type { PlayerState } from '../player/state';
import { gravBlast } from './gravity';
import { CRATERS, gatherK, gatherMax, type HeldPiece, type Rock } from './gravityMeter';
import { pillarBetween, PILLAR_CUT } from './pillars';
import { aim } from './punch';
import type { CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

/** How far under the eye a held piece sits (m). */
const HELD_LOW = 0.15;
/** A tap: thrown once it's this share of the way up. */
const THROW_AT = 0.7;
/** As it grows, this much further off and higher up for each metre of it, so you can still see where you're aiming. */
const GROW_OUT = 3.5;
const GROW_UP = 1.3;
/** How hard the rocks are to place: how many spots to try; further above or below you than this, a spot's no use (m). */
const TRIES = 8;
const LEVEL = 3;
/** A rock on its way: how high its arc goes (m), how big a burst has to be to count (m). */
const ARC = 1.2;
const BURST_MIN = 1;
/** Rising, the eased share of the way it's come. */
const smooth = (x: number) => (x >= 1 ? 1 : x * x * (3 - 2 * x));
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
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

/** The floor gets a hole. */
function crater(state: CombatState, x: number, y: number, z: number, r: number) {
  const g = state.grav;
  const c = g.craters[g.nextCrater++ % CRATERS];
  c.on = true;
  c.x = x;
  c.y = y;
  c.z = z;
  c.r = r;
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
  } else crater(state, a.x, a.y, a.z, v.craterSize);
  const r = big ? v.bigSize : v.smallSize;
  g.held = { big, r, base: r, t: 0, from: new Vector3(a.x, rise, a.z), at: new Vector3(a.x, rise, a.z), guard: new Vector3(a.x, rise, a.z), gathered: 0, torn: 0, next: v.gatherEvery };
  g.grabWait = v.grabWait;
  state.events.push('seanGrab', big ? 1 : 0, a.x, a.y, a.z);
}

/** Where it hangs, how big it's grown, and what it stops. */
function holdPiece(state: CombatState, h: HeldPiece, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const v = SEAN.v;
  h.t += dt;
  h.r = Math.max(h.base, mix(h.base, v.gatherSize, Math.sqrt(gatherK(h))));
  const grown = h.r - h.base;
  aim(player, yaw, pitch, eye, dir);
  const want = (h.big ? v.holdBig : v.holdSmall) + grown * GROW_OUT;
  const room = Math.max(h.r + 0.2, Math.min(want, world.rayDistance(eye, dir, want + h.r) - h.r));
  h.guard.copy(eye).addScaledVector(dir, room);
  h.guard.y -= HELD_LOW;
  end.copy(h.guard);
  end.y += grown * GROW_UP;
  h.at.lerpVectors(h.from, end, smooth(h.t / v.grabRise));
  // The shield: in front of you, however high it's drawn to leave you your aim.
  if (h.t < v.grabRise * 0.5) return;
  for (const o of state.orbs) {
    if (!o.alive || o.parried || o.pos.distanceTo(h.guard) > h.r + v.shieldMargin) continue;
    o.alive = false;
    state.events.push('orbPop', 0, o.pos.x, o.pos.y, o.pos.z);
    state.events.push('seanBlock', 0, o.pos.x, o.pos.y, o.pos.z);
  }
}

/** One more rock tears out somewhere near you, not through a wall, and starts on its way. There's always somewhere: at worst at your feet. */
function tear(state: CombatState, player: PlayerState, world: CollisionWorld) {
  const g = state.grav;
  const v = SEAN.v;
  const slot = g.coming.find((c) => !c.on);
  if (!slot) return;
  const p = player.pos;
  let x = p.x;
  let z = p.z;
  let y = p.y;
  for (let i = 0; i < TRIES; i++) {
    const a = state.rng() * Math.PI * 2;
    const d = mix(v.gatherNear, v.gatherFar, state.rng());
    const tx = p.x + Math.cos(a) * d;
    const tz = p.z + Math.sin(a) * d;
    if (!freeAt(state.nav.small, tx, tz) || wallBetween(state.nav.small, p.x, p.z, tx, tz)) continue;
    from.set(tx, p.y + 0.5, tz);
    const down = world.rayDistance(from, DOWN, LEVEL * 2);
    if (!Number.isFinite(down) || Math.abs(from.y - down - p.y) > LEVEL) continue;
    x = tx;
    z = tz;
    y = from.y - down;
    break;
  }
  crater(state, x, y, z, v.gatherCrater);
  slot.on = true;
  slot.t = 0;
  slot.from.set(x, y, z);
  slot.at.set(x, y, z);
  state.events.push('seanTear', 0, x, y, z);
}

/** Right click still held: on with it, up to its time. */
function gatherMore(state: CombatState, h: HeldPiece, player: PlayerState, world: CollisionWorld, dt: number) {
  if (h.torn >= gatherMax()) return;
  h.next -= dt;
  if (h.next > 0) return;
  h.next += SEAN.v.gatherEvery;
  h.torn++;
  tear(state, player, world);
}

/** The rocks on their way: they join what's held. With nothing held any more they fall apart where they are. */
function stepComing(state: CombatState, dt: number) {
  const g = state.grav;
  const v = SEAN.v;
  for (const c of g.coming) {
    if (!c.on) continue;
    if (!g.held) {
      c.on = false;
      state.events.push('seanShatter', 0, c.at.x, c.at.y, c.at.z);
      continue;
    }
    c.t += dt;
    const k = Math.min(1, c.t / v.gatherFly);
    c.at.lerpVectors(c.from, g.held.at, smooth(k));
    c.at.y += ARC * Math.sin(k * Math.PI);
    if (k < 1) continue;
    c.on = false;
    g.held.gathered++;
    state.events.push('seanGathered', gatherK(g.held), c.at.x, c.at.y, c.at.z);
  }
}

/** Thrown: along your aim from where it hung, at what you're looking at. The more it gathered, the slower and the harder, and the wider it bursts. */
function throwPiece(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld) {
  const g = state.grav;
  const h = g.held;
  if (!h) return;
  const v = SEAN.v;
  const r = g.rocks.find((k) => !k.alive);
  const k = gatherK(h);
  aim(player, yaw, pitch, eye, dir);
  const far = Math.min(v.throwSight, world.rayDistance(eye, dir, v.throwSight));
  end.copy(eye).addScaledVector(dir, far);
  if (r) {
    r.alive = true;
    r.big = h.big || k > 0;
    r.r = h.r;
    r.lumps = h.gathered;
    r.left = v.rockLife;
    r.damage = (h.big ? v.bigDamage : v.smallDamage) + v.gatherDamage * k;
    r.knock = mix(h.big ? v.bigKnock : v.smallKnock, v.gatherKnock, k);
    r.blast = mix(h.big ? v.bigBlast : 0, v.gatherBlast, k);
    r.blastDamage = mix(h.big ? v.bigBlastDamage : 0, v.gatherBlastDamage, k);
    r.drop = mix(h.big ? v.bigDrop : 0, v.bigDrop, k);
    r.pos.copy(h.at);
    r.vel.subVectors(end, h.at).normalize().multiplyScalar(mix(h.big ? v.bigSpeed : v.smallSpeed, v.gatherSpeed, k));
  }
  g.held = null;
  g.grabWait = v.grabWait;
  state.events.push('seanThrow', h.big || k > 0.3 ? 1 : 0, h.at.x, h.at.y, h.at.z);
}

/** Dropped, by going Unstable or an overload: it falls apart where it hung. */
export function dropPiece(state: CombatState) {
  const g = state.grav;
  const h = g.held;
  if (h) {
    g.held = null;
    state.events.push('seanShatter', h.big ? 1 : 0, h.at.x, h.at.y, h.at.z);
  }
  for (const c of g.coming) {
    if (!c.on) continue;
    c.on = false;
    state.events.push('seanShatter', 0, c.at.x, c.at.y, c.at.z);
  }
}

/** Right click in normal mode, each tick. */
export function stepSeanGrab(state: CombatState, player: PlayerState, pressed: boolean, heldDown: boolean, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const g = state.grav;
  stepComing(state, dt);
  if (g.held) {
    holdPiece(state, g.held, player, yaw, pitch, world, dt);
    if (heldDown) gatherMore(state, g.held, player, world, dt);
    else if (g.held.t >= SEAN.v.grabRise * THROW_AT) throwPiece(state, player, yaw, pitch, world);
    return;
  }
  aimGrab(state, player, yaw, pitch, world);
  if (pressed && g.grabWait <= 0) grab(state);
}

function shatter(state: CombatState, r: Rock) {
  r.alive = false;
  // (Value: how big a sight it is: 0 a chunk, 1 big, 2 what a long gathering makes.)
  state.events.push('seanShatter', r.lumps >= gatherMax() / 2 ? 2 : r.big ? 1 : 0, r.pos.x, r.pos.y, r.pos.z);
  // (From its underside: a big one breaks up well over the heads of what's under it.)
  if (r.blast >= BURST_MIN) gravBlast(state, r.pos.x, Math.max(0, r.pos.y - 1 - r.r), r.pos.z, r.blast, r.blastDamage, r.knock * 0.6);
}

/** What's been thrown, each tick. */
export function stepRocks(state: CombatState, world: CollisionWorld, dt: number) {
  for (const r of state.grav.rocks) {
    if (!r.alive) continue;
    r.left -= dt;
    r.vel.y -= r.drop * dt;
    const speed = r.vel.length();
    const len = speed * dt;
    seg.copy(r.vel).multiplyScalar(1 / Math.max(speed, 1e-6));
    const wall = world.rayDistance(r.pos, seg, len + r.r * 0.5);
    end.copy(r.pos).addScaledVector(seg, Math.min(len, wall));
    if (nearestTarget(state, r.pos, end, r.r, hit, false)) {
      const fl = Math.hypot(seg.x, seg.z) || 1;
      const killed = landHit(state, hit, r.damage, r.knock, seg.x / fl, seg.z / fl, 'hitPierce', 1);
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
