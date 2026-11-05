// Update 0.3.56 — the Frost Roc's moves, by the Boss Design Bible ("Ground or air?"; frostRoc.ts picks and tells them). What's on
// the floor you jump; what's in the air you stay under. Stomp Quake: three stomps, each a ring along the ground; slow after the
// third. Wing Clap (the bible's Sky Clap): it hits anyone in the air in front of it. Ice Hurl (Boulder Hurl): a block torn out and
// thrown, shattering into shards: parry one back and it staggers. Its belly slide and frost breath, its own. Phase 2: Pillar Swing:
// low is jumped, high passes over your head if you stay down. Fault Line: slabs erupt along cracks from its feet, and stand a while
// as real ground. Pure.
import { Vector3 } from 'three';
import { FOES_NORSE } from '../../tuning/foesNorse';
import { BOSS } from '../../tuning/boss';
import { FROST_ROC } from '../../tuning/frostRoc';
import { freeAt } from '../../world/navGrid';
import { dropBomb } from '../combat/bombs';
import { addRime, chillYou } from '../combat/frost';
import { fireOrb } from '../combat/orbs';
import { startQuake } from '../combat/quakes';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import type { Crack, Slab } from './rocBody';

/** Its moves (`move`). */
export const STOMP = 0;
export const CLAP = 1;
export const HURL = 2;
export const SLIDE = 3;
export const BREATH = 4;
export const SWING = 5;
export const FAULT = 6;
export const FALL = 7;
export const ROAR = 8;
/** Up in the air above this (m), you're in the air to its clap and its high swing; on the ground under this, to its low one. */
export const AIR_FROM = 0.7;
export const LOW_UNDER = 0.9;
/** A high swing's and a clap's height, as you see them (m); a low swing's. */
export const HIGH_AT = 2.7;
export const LOW_AT = 0.8;
/** Its clap's arc (rad, either side); above this (m) you've cleared it. */
export const CLAP_ARC = 1.2;
const CLAP_TOP = 9;
/** It comes down this hard on one it claps (m/s). */
const CLAP_DOWN = -12;
/** Its swing crosses this far either side of its front (rad); it hits this close to its pillar's line (rad); above this you've
 *  cleared a high one. */
export const SWING_ARC = 1.5;
const SWING_NEAR = 0.3;
const SWING_TOP = 6;
/** A shard's height over the floor (m). */
const SHARD_UP = 1;
/** Its breath catches you this near its line (rad), this low (m); it lays rime this often along it (s), this far out (m). */
const NARROW = 0.28;
const BREATH_OVER = 1.2;
const RIME_EVERY = 0.5;
const RIME_OUT = 6;
/** Its slide: higher than this (m) you're over it; thrown along, up (m/s); faster than this a wall stuns it, slower it's stopped. */
const SLIDE_OVER = 3;
const SLIDE_THROW = [16, 7] as const;
const STUNS = 6;
const STOPPED = 0.8;
/** Thrown by a swing: up (m/s). */
const SWING_UP = 7;
/** Its cracks: how many, how far apart (rad), how long; a slab's side (m), how far along the first and next stand (m), how many a
 *  crack; how high (m); it breaks one it walks into this far past its side. */
const CRACKS = [-0.55, 0, 0.55];
const CRACK_LONG = 26;
const SLAB = 3.6;
const SLAB_FROM = 6;
const SLAB_GAP = 4.6;
const SLABS = 5;
const SLAB_LOW = 1.2;
const SLAB_MORE = 1.4;
const SLAB_BREAK = 1.8;
/** Under a rising slab you're thrown up this fast (m/s). */
const SLAB_UP = 8;

const way = new Vector3();
const mouth = new Vector3();
const spot = new Vector3();

/** How far round from `yaw` you are (rad). */
function offFrom(d: Enemy, yaw: number, player: PlayerState): number {
  const a = yawTo(d, player.pos.x, player.pos.z) - yaw;
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
}

/** One tick of its stomps: each a hop, its landing a ring; true once the third is down. */
export function stepStomp(d: Enemy, player: PlayerState, w: EnemyWorld, gap: number, dt: number): boolean {
  const v = FROST_ROC.v;
  const k = Math.min(1, d.t / gap);
  d.pos.y = 4 * v.stompHop * k * (1 - k);
  way.set(player.pos.x - d.pos.x, 0, player.pos.z - d.pos.z);
  const far = way.length();
  if (far > radiusOf(d) + 2) walk(d, way.x / far, way.z / far, v.stompStep * dt, w.nav.large);
  d.facing = turn(d.facing, yawTo(d, player.pos.x, player.pos.z), v.rocTurn * dt);
  if (k < 1) return false;
  d.pos.y = 0;
  d.shots++;
  d.t = 0;
  w.events.push('rocStomp', d.shots, d.pos.x, 0.1, d.pos.z);
  startQuake(w.quakes, d.pos.x, 0, d.pos.z, v.stompSpeed, v.stompReach, v.stompDamage, BOSS.v.quakeClear, d.kind);
  return d.shots >= 3;
}

/** Its wings come together: anyone in the air in front of it is hit, and slammed down. */
export function clap(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FROST_ROC.v;
  w.events.push('rocClap', index, d.pos.x, d.pos.y + v.rocHeight * 0.6, d.pos.z);
  const up = player.pos.y - d.pos.y;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  if (player.dead || up < AIR_FROM || up > CLAP_TOP || dist > v.clapReach || offFrom(d, d.facing, player) > CLAP_ARC) return;
  if (!damagePlayer(player, v.clapDamage, d.kind)) return;
  player.vel.y = CLAP_DOWN;
  w.events.push('rocClapHit', index, player.pos.x, player.pos.y + 1, player.pos.z);
}

/** Its block of ice thrown at where you stand. */
export function hurl(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FROST_ROC.v;
  const r = d.roc!;
  mouth.set(d.pos.x - Math.sin(d.facing) * radiusOf(d), d.pos.y + v.rocHeight * 0.6, d.pos.z - Math.cos(d.facing) * radiusOf(d));
  spot.set(player.pos.x, d.pos.y, player.pos.z);
  if (!dropBomb(w.bombs, mouth, spot, v.hurlFall, v.hurlRadius, v.hurlDamage, v.hurlShove, d.kind, 'berg')) return;
  r.hurlIn = v.hurlFall;
  r.hurlX = spot.x;
  r.hurlZ = spot.z;
  w.events.push('rocHurl', index, mouth.x, mouth.y, mouth.z);
}

/** One tick of its block in flight: landing, it shatters into shards, flying out all ways. */
export function stepHurl(d: Enemy, w: EnemyWorld, dt: number) {
  const v = FROST_ROC.v;
  const r = d.roc!;
  if (r.hurlIn < 0) return;
  r.hurlIn -= dt;
  if (r.hurlIn > 0) return;
  r.hurlIn = -1;
  const n = Math.round(v.shards);
  const from = w.rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = from + (i / n) * Math.PI * 2;
    way.set(Math.cos(a), 0, Math.sin(a));
    // (From the edge of its burst: what its burst caught, these don't.)
    spot.set(r.hurlX + way.x * v.hurlRadius, SHARD_UP, r.hurlZ + way.z * v.hurlRadius);
    fireOrb(w.orbs, spot, way, v.shardSpeed, v.shardDamage, d.kind, 'shard');
  }
}

/** A shard parried back at it: it staggers (not out of what holds it up already). */
export function shardStruck(d: Enemy, index: number, w: Pick<EnemyWorld, 'events'>) {
  if (d.phase !== 'chase' && d.phase !== 'windup' && d.phase !== 'recover') return;
  d.move = HURL;
  setPhase(d, 'stun');
  w.events.push('rocStagger', index, d.pos.x, d.pos.y + FROST_ROC.v.rocHeight * 0.8, d.pos.z);
}

/** Its belly slide starts, at where you stand. */
export function startSlide(d: Enemy, player: PlayerState, dist: number) {
  d.aim.set(player.pos.x - d.pos.x, 0, player.pos.z - d.pos.z).normalize();
  d.facing = yawTo(d, player.pos.x, player.pos.z);
  d.near = FROST_ROC.v.slideSpeed;
  d.shots = dist;
  d.struck = false;
  setPhase(d, 'charge');
}

/** On along its way, slowing as the ground lets it; into you once; a wall stops it, stunned. */
export function stepSlide(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FROST_ROC.v;
  // (Update 0.3.27 — on ice as on stone.)
  const brake = (v.slideSpeed * v.slideSpeed) / (2 * (d.shots + v.slidePast));
  const step = d.near * dt;
  const x = d.pos.x;
  const z = d.pos.z;
  walk(d, d.aim.x, d.aim.z, step, w.nav.large);
  const moved = Math.hypot(d.pos.x - x, d.pos.z - z);
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  if (!d.struck && !player.dead && dist <= radiusOf(d) + 0.8 && player.pos.y - d.pos.y < SLIDE_OVER) {
    d.struck = true;
    if (damagePlayer(player, v.slideDamage, 'frostRoc')) throwYou(player, d, d.aim.x, d.aim.z, 1, SLIDE_THROW[0], SLIDE_THROW[1]);
  }
  if (d.near > STUNS && moved < step * 0.5) {
    setPhase(d, 'stun');
    w.events.push('rocCrash', index, d.pos.x, d.pos.y + v.rocHeight * 0.5, d.pos.z);
    return;
  }
  d.near = Math.max(0, d.near - brake * dt);
  if (d.near <= STOPPED) setPhase(d, 'recover');
}

/** Its breath sweeps along the floor: it catches you near its line and low enough, and lays rime along it. */
export function stepBreath(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FROST_ROC.v;
  const k = Math.min(1, d.t / v.breathFor);
  d.facing = d.aim.x + v.breathSweep * (2 * k - 1);
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  if (!player.dead && d.blink <= 0 && dist <= v.breathReach && offFrom(d, d.facing, player) <= NARROW && player.pos.y - d.pos.y < BREATH_OVER && damagePlayer(player, v.breathDamage, 'frostRoc')) {
    d.blink = v.breathEvery;
    if (w.ground) chillYou(w.ground.frost, w.events, player.pos.x, player.pos.y + 1, player.pos.z);
    w.events.push('rocBreathHit', index, player.pos.x, player.pos.y + 1, player.pos.z);
  }
  if (w.ground && d.t >= d.shots * RIME_EVERY) {
    d.shots++;
    addRime(w.ground.frost, d.pos.x - Math.sin(d.facing) * RIME_OUT, d.pos.z - Math.cos(d.facing) * RIME_OUT, FOES_NORSE.v.rimeSize * 1.3, FOES_NORSE.v.rimeLast);
  }
  if (k >= 1) setPhase(d, 'recover');
}

/** Its next swing told: the pillar drawn back at hip or shoulder height. */
function nextSwing(d: Enemy, w: EnemyWorld) {
  const r = d.roc!;
  r.swingHit = false;
  r.swingSide = -r.swingSide;
  setPhase(d, 'dive');
  w.events.push('rocSwingTell', r.swingLow ? 1 : 0, d.pos.x, d.pos.y + FROST_ROC.v.rocHeight * 0.6, d.pos.z);
}

/** Its swings start: the first's height by chance, then turn about. */
export function startSwing(d: Enemy, w: EnemyWorld) {
  d.roc!.swingLow = w.rng() < 0.5;
  d.shots = 0;
  nextSwing(d, w);
}

/** Where a swing's pillar is across its front (rad from its facing), `k` of the way through it. */
export const swingAngle = (side: number, k: number) => side * SWING_ARC * (1 - 2 * k);

/** One tick of its swings: drawn back, crossing, on to the next. True once they're done. */
export function stepSwing(d: Enemy, player: PlayerState, w: EnemyWorld, tell: number, dt: number): boolean {
  const v = FROST_ROC.v;
  const r = d.roc!;
  if (d.t < tell) {
    d.facing = turn(d.facing, yawTo(d, player.pos.x, player.pos.z), v.rocTurn * dt);
    return false;
  }
  if (d.t - dt < tell) w.events.push('rocSwing', r.swingLow ? 1 : 0, d.pos.x, d.pos.y + v.rocHeight * 0.5, d.pos.z);
  const k = Math.min(1, (d.t - tell) / v.swingFor);
  const up = player.pos.y - d.pos.y;
  const inBand = r.swingLow ? up < LOW_UNDER : up >= AIR_FROM && up < SWING_TOP;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  if (!r.swingHit && !player.dead && inBand && dist <= v.swingReach + radiusOf(d) && offFrom(d, d.facing + swingAngle(r.swingSide, k), player) <= SWING_NEAR) {
    r.swingHit = true;
    if (damagePlayer(player, v.swingDamage, d.kind)) throwYou(player, d, player.pos.x - d.pos.x, player.pos.z - d.pos.z, dist, v.swingShove, SWING_UP);
  }
  if (k < 1) return false;
  d.shots++;
  if (d.shots >= Math.round(v.swings)) return true;
  r.swingLow = !r.swingLow;
  nextSwing(d, w);
  return false;
}

/** Its Fault Line told: cracks run out from its feet, past where you stand. */
export function layCracks(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const r = d.roc!;
  const base = yawTo(d, player.pos.x, player.pos.z);
  r.cracks = CRACKS.map((c): Crack => ({ x: d.pos.x, z: d.pos.z, yaw: base + c + (w.rng() - 0.5) * 0.2, long: CRACK_LONG }));
}

/** Its fist comes down: along each crack the slabs are coming, in waves out from its feet. Where a crack leaves the floor, none. */
export function raiseFault(d: Enemy, index: number, w: EnemyWorld) {
  const v = FROST_ROC.v;
  const r = d.roc!;
  r.slabs.length = 0;
  w.events.push('rocFault', index, d.pos.x, 0.1, d.pos.z);
  for (const c of r.cracks) {
    for (let i = 0; i < SLABS; i++) {
      const out = SLAB_FROM + i * SLAB_GAP;
      const x = c.x - Math.sin(c.yaw) * out;
      const z = c.z - Math.cos(c.yaw) * out;
      if (!freeAt(w.nav.small, x, z)) continue;
      const slab: Slab = { x, z, side: SLAB, yaw: c.yaw, h: SLAB_LOW + w.rng() * SLAB_MORE, at: r.time + ((i >> 1) + 0.0001) * v.faultGap, until: r.time + v.faultLast + w.rng(), up: false };
      r.slabs.push(slab);
    }
  }
  r.cracks.length = 0;
}

function solidOf(s: Slab) {
  return { x: s.x, y: s.h / 2, z: s.z, w: s.side, h: s.h, d: s.side, kind: 'block' as const, quat: [0, Math.sin(s.yaw / 2), 0, Math.cos(s.yaw / 2)] as [number, number, number, number] };
}

/** One tick of its slabs: rising (hurting and lifting what's on them), standing (real ground), broken by it or gone. */
export function stepSlabs(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FROST_ROC.v;
  const r = d.roc!;
  r.time += dt;
  let changed = false;
  for (let i = r.slabs.length - 1; i >= 0; i--) {
    const s = r.slabs[i];
    if (!s.up && r.time >= s.at) {
      s.up = true;
      changed = true;
      w.events.push('rocSlab', index, s.x, 0.1, s.z);
      // Square to it, so a turned slab measures true.
      const dx = player.pos.x - s.x;
      const dz = player.pos.z - s.z;
      const along = Math.abs(dx * Math.sin(s.yaw) + dz * Math.cos(s.yaw));
      const across = Math.abs(dx * Math.cos(s.yaw) - dz * Math.sin(s.yaw));
      if (!player.dead && along <= s.side / 2 + BODY.radius && across <= s.side / 2 + BODY.radius && player.pos.y < s.h) {
        if (damagePlayer(player, v.faultDamage, d.kind)) w.events.push('rocSlabHit', index, player.pos.x, player.pos.y + 1, player.pos.z);
        // (It's solid now: you stand on it, thrown up off it.)
        player.pos.y = s.h + 0.05;
        player.vel.y = Math.max(player.vel.y, SLAB_UP);
        player.grounded = false;
      }
    }
    const broken = s.up && d.pos.y < 1 && Math.hypot(d.pos.x - s.x, d.pos.z - s.z) <= radiusOf(d) + SLAB_BREAK;
    if (r.time < s.until && !broken) continue;
    if (broken) w.events.push('rocSlabBreak', index, s.x, s.h / 2, s.z);
    r.slabs.splice(i, 1);
    changed = true;
  }
  if (!changed) return;
  r.boxes = r.slabs.filter((s) => s.up).map(solidOf);
  r.dirty = true;
}
