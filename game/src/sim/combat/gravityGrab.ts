// Update 0.3.82 — Gravity Sean's right click in normal mode, Grab (enemy_bibles/Born to Retry — Gravity Sean.docx: "pull a piece of the environment"). From the bible's rules: "never run out: with nothing loose nearby,
// rip a chunk out of the floor. It leaves a crater and RMB always works"; "hold it as a shield: while held, the piece blocks projectiles from the front"; "size matters: small debris throws fast; big chunks throw slow but
// hit hard"; "grabbable objects get a faint outline when you aim at them" (`g.aim`, which the view outlines). What's grabbable for now: a pillar, whole (a big chunk, its stump left), and the floor (a small one). The floor's
// other pieces have no rules of their own to tear them from: a placeholder.
// Update 0.3.86 — the designer: "rmb when holding gather more rocks up to 5 sec, you see rocks being gathered from random close area in the room and makes the attack bigger". Right click pressed takes a piece, as ever. Held, a
// rock tears out of the floor somewhere near you every half second, each with its crater, and flies in to join it, for up to 5 s: the mass grows, and so does all it does. Let go: it's thrown. That's the same rule as Black
// Hole's on right click in Unstable mode, in place of the bible's "RMB again". A tap throws what you took as soon as it's up.
// Update 0.3.89 — the designer, with three pictures: "make the RMB on normal mode look like" a great sphere of cracked stone, "it will float above the arena and hit the arena ... rocks start to assemble it from the hand holding and
// then he joins the palms as the ground shakes and screen shake at the power", "up to 10 sec if the player wants". So: in his hand first, rocks coming to it, and let go now it's a plain throw, the bible's. Held on, his palms join
// (`lifted`): it rises to float over the arena, ahead of him, growing as the rocks come, the ground shaking, for up to 10 s. Let go, or its time's up: it comes down where you're aiming, and it's as big a blow as it's grown, from
// the sky: no wall stops it. Lifted, it's no shield any more, and he has no fist free: that's what it costs. Pure.
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import { freeAt, wallBetween } from '../../world/navGrid';
import type { CollisionWorld } from '../collisionWorld';
import { launch } from '../enemies/flight';
import type { PlayerState } from '../player/state';
import { gravBlast } from './gravity';
import { crashBlast, CRATERS, gatherK, gatherMax, type HeldPiece, type Rock } from './gravityMeter';
import { floorUnder } from './gravityHole';
import { pillarBetween, PILLAR_CUT } from './pillars';
import { aim } from './punch';
import type { CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget } from './strike';

/** How far under the eye a held piece sits (m). */
const HELD_LOW = 0.15;
/** A tap: thrown once it's this share of the way up. */
const THROW_AT = 0.7;
/** In his hand: this much bigger for each rock (m). */
const IN_HAND_GROW = 0.05;
/** Lifted: how fast it grows to its size (per second); how much it grows early on, as a power of how far it's gathered; what it leaves under a roof (m). */
const GROW_RATE = 3;
const GROW_POWER = 0.7;
const ROOF_SPARE = 0.5;
/** The crater it leaves, a share of how far its landing reaches; how far into the floor it sinks as it lands, a share of its size. */
const CRATER_SHARE = 0.45;
const SINKS_TO = 0.4;
/** How hard the rocks are to place: how many spots to try; further above or below you than this, a spot's no use (m). */
const TRIES = 8;
const LEVEL = 3;
/** A rock on its way: how high its arc goes (m), how big a burst has to be to count (m). */
const ARC = 1.2;
const BURST_MIN = 1;
/** Thrown from his hand with rocks gathered: its burst, a share of the sphere's damage; how much slower, at the most. */
const BURST_SHARE = 0.4;
const HEAVIER = 0.5;
/** A rock on its way to his hand takes this share of the time one takes to the sphere. */
const TO_HAND = 0.35;
/** Rising, the eased share of the way it's come. */
const smooth = (x: number) => (x >= 1 ? 1 : x * x * (3 - 2 * x));
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const DOWN = new Vector3(0, -1, 0);
const UP = new Vector3(0, 1, 0);
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
  g.held = { big, r, base: r, t: 0, from: new Vector3(a.x, rise, a.z), at: new Vector3(a.x, rise, a.z), gathered: 0, torn: 0, next: v.gatherEvery, lifted: false, zone: new Vector3(a.x, a.y, a.z) };
  g.grabWait = v.grabWait;
  state.events.push('seanGrab', big ? 1 : 0, a.x, a.y, a.z);
}

/** In his hand: where it hangs, and what it stops. */
function inHand(state: CombatState, h: HeldPiece, world: CollisionWorld) {
  const v = SEAN.v;
  h.r = h.base + h.gathered * IN_HAND_GROW;
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

/** Lifted: over the arena ahead of you, heavy to turn, as big as it's gathered, and no bigger than a roof lets it be. Where it would come down, as you aim. */
function floatOver(h: HeldPiece, player: PlayerState, yaw: number, world: CollisionWorld, dt: number) {
  const v = SEAN.v;
  const p = player.pos;
  from.set(p.x, eye.y, p.z);
  const up = world.rayDistance(from, UP, 80);
  const roofed = Number.isFinite(up);
  const roof = roofed ? eye.y + up - p.y - ROOF_SPARE : Infinity;
  const size = Math.max(h.base, Math.min(mix(h.base, v.gatherSize, gatherK(h) ** GROW_POWER), roof / 2));
  h.r += (size - h.r) * (1 - Math.exp(-GROW_RATE * dt));
  flat.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  let ahead = v.floatAhead + h.r * 2;
  // (Under a roof you'd lose sight of it past the wall.)
  if (roofed) ahead = Math.max(h.r, Math.min(ahead, world.rayDistance(eye, flat, ahead) - h.r));
  end.set(p.x + flat.x * ahead, p.y + Math.min(v.floatGap, Math.max(0, roof - h.r * 2)) + h.r, p.z + flat.z * ahead);
  h.at.lerp(end, 1 - Math.exp(-v.floatLag * dt));
  const d = Math.min(v.crashRange, world.rayDistance(eye, dir, v.crashRange));
  const out = Number.isFinite(d) ? d : v.crashRange;
  const zx = eye.x + dir.x * out;
  const zz = eye.z + dir.z * out;
  h.zone.set(zx, floorUnder(world, zx, p.y + 0.5, zz), zz);
}

/** Each tick it's held. His palms join when it's been in his hand long enough. */
function holdPiece(state: CombatState, h: HeldPiece, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const v = SEAN.v;
  h.t += dt;
  aim(player, yaw, pitch, eye, dir);
  if (!h.lifted && h.t >= v.gatherJoin) {
    h.lifted = true;
    state.events.push('seanJoin', gatherK(h), player.pos.x, player.pos.y, player.pos.z);
  }
  if (h.lifted) floatOver(h, player, yaw, world, dt);
  else inHand(state, h, world);
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
  // (To his hand it's near: it has to get there before his palms join.)
  slot.fly = g.held?.lifted ? v.gatherFly : v.gatherFly * TO_HAND;
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
  for (const c of g.coming) {
    if (!c.on) continue;
    if (!g.held) {
      c.on = false;
      state.events.push('seanShatter', 0, c.at.x, c.at.y, c.at.z);
      continue;
    }
    c.t += dt;
    const k = Math.min(1, c.t / c.fly);
    c.at.lerpVectors(c.from, g.held.at, smooth(k));
    c.at.y += ARC * Math.sin(k * Math.PI);
    if (k < 1) continue;
    c.on = false;
    g.held.gathered++;
    state.events.push('seanGathered', gatherK(g.held), c.at.x, c.at.y, c.at.z);
  }
}

/** Thrown from his hand: along your aim from where it hung, at what you're looking at. The more it gathered, the harder and the slower, and it bursts. */
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
    r.blastDamage = mix(h.big ? v.bigBlastDamage : 0, v.gatherDamage * BURST_SHARE, k);
    r.drop = mix(h.big ? v.bigDrop : 0, v.bigDrop, k);
    r.pos.copy(h.at);
    r.vel.subVectors(end, h.at).normalize().multiplyScalar((h.big ? v.bigSpeed : v.smallSpeed) * (1 - HEAVIER * k));
  }
  g.held = null;
  g.grabWait = v.grabWait;
  state.events.push('seanThrow', h.big || k > 0.3 ? 1 : 0, h.at.x, h.at.y, h.at.z);
}

/** It lands. */
function crash(state: CombatState) {
  const g = state.grav;
  const f = g.fall;
  if (!f) return;
  g.fall = null;
  crater(state, f.to.x, f.to.y, f.to.z, f.blast * CRATER_SHARE);
  state.events.push('seanCrash', f.k, f.to.x, f.to.y, f.to.z);
  gravBlast(state, f.to.x, f.to.y, f.to.z, f.blast, f.damage, f.knock, true);
}

/** Let go of, lifted: it comes down where you aimed. */
function letFall(state: CombatState, h: HeldPiece) {
  const g = state.grav;
  const v = SEAN.v;
  const k = gatherK(h);
  // (Only if the knobs let you lift one so soon after another.)
  crash(state);
  g.fall = {
    t: 0,
    time: mix(v.crashFall, v.crashFallFull, k),
    from: h.at.clone(),
    at: h.at.clone(),
    to: h.zone.clone(),
    r: h.r,
    k,
    damage: mix(h.big ? v.bigDamage : v.smallDamage, v.gatherDamage, k),
    knock: mix(h.big ? v.bigKnock : v.smallKnock, v.gatherKnock, k),
    blast: crashBlast(k),
  };
  g.held = null;
  g.grabWait = v.grabWait;
  state.events.push('seanDrop', k, h.at.x, h.at.y, h.at.z);
}

/** The sphere on its way down, each tick. */
export function stepFall(state: CombatState, dt: number) {
  const f = state.grav.fall;
  if (!f) return;
  f.t += dt;
  const k = Math.min(1, f.t / f.time);
  const e = k * k;
  f.at.lerpVectors(f.from, f.to, e);
  f.at.y += f.r * SINKS_TO * e;
  if (k >= 1) crash(state);
}

/** Dropped, by going Unstable or an overload: it falls apart where it hung. */
export function dropPiece(state: CombatState) {
  const g = state.grav;
  const h = g.held;
  if (h) {
    g.held = null;
    // (Value: how big a sight it is: 0 a chunk, 1 big, 2 lifted.)
    state.events.push('seanShatter', h.lifted ? 2 : h.big ? 1 : 0, h.at.x, h.at.y, h.at.z);
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
    const h = g.held;
    holdPiece(state, h, player, yaw, pitch, world, dt);
    if (h.lifted) {
      if (heldDown) gatherMore(state, h, player, world, dt);
      // (Up to its time, and it comes down anyway.)
      if (!heldDown || h.t >= SEAN.v.gatherTime) letFall(state, h);
    } else if (heldDown) gatherMore(state, h, player, world, dt);
    else if (h.t >= SEAN.v.grabRise * THROW_AT) throwPiece(state, player, yaw, pitch, world);
    return;
  }
  aimGrab(state, player, yaw, pitch, world);
  if (pressed && g.grabWait <= 0) grab(state);
}

function shatter(state: CombatState, r: Rock) {
  r.alive = false;
  state.events.push('seanShatter', r.big ? 1 : 0, r.pos.x, r.pos.y, r.pos.z);
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
