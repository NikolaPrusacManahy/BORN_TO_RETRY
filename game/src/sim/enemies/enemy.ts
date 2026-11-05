// M2 — an enemy, whatever its kind (Update 0.0.12: the grunt's body and moves made shared, for the Spitter and the
// Brute): the pool, spawning, its hit capsule, taking a hit (a flinch cancels its attack; a brute only flinches from
// a hard hit), walking the floor (always ending outside walls: Update 0.0.11), turning, enemies pushing apart, and the
// player pushed out of them. Each kind's own behaviour is in grunt.ts, spitter.ts and brute.ts. Pure.
// Update 0.0.13 — the leaper's leap and the stinger's dive (a start and an aim), fliers (pushed out of walls on their
// own grid, their bodies falling when they die), and bodies at different heights not pushing each other.
// Update 0.0.15 — the Demon's phases (its charge, stunned, its roar, its entrance) and which move it winds up; a boss's
// body doesn't fall when it dies (its death show places it); a hit on a stunned boss is worth more.
// Update 0.0.17 — frozen (the snowflake bonus): it stands still, its attack paused, until the ice wears off.
// Update 0.0.18 — the Dragon's fire beam (a phase) and a burst's shots; the world knows every enemy (the beam burns
// them). Update 0.0.21 — the Dragon in the sky (a phase: it doesn't fall), its fire bombs, how long you've stayed
// close. A perched enemy stands on its ledge: it falls only to it, hits don't slide it off. Update 0.1.1 — held in an
// execution (a phase: the execution places it). Update 0.1.15 — its attack token (tokens.ts), its angle round you
// (spread.ts); bodies pushing apart in bodies.ts. Update 0.1.19 — a Skeleton brought down falls to pieces to rebuild
// (skeleton.ts); the Ninja's teleport rest.
// Update 0.2.3 — the Bone King (boneKing.ts): brought down the first time it falls to pieces and rebuilds (its second
// life), nothing hurting it meanwhile; it holds you in its hand ('grab') and charges its final blast ('blast').
// Update 0.2.4 — under the sand ('burrow': the Cactoros), out of reach of every hit.
// Update 0.3.7 — the start of its tick moved to tick.ts; its knock flies (flight.ts): it can hit a wall (`splat`).
import { Vector3 } from 'three';
import { createSwarmBody, type SwarmBody } from './swarmBody';
import { swarmEyeHeight, swarmTakes } from './swarmHits';
import { createUltimate, resetUltimate, type Ultimate, ultimateTakes } from './ultimate';
import { createKingBody, type KingBody, skullY } from './kingBody';
import { BONE_KING } from '../../tuning/boneKing';
import { onPupil } from './swarmMoves';
import type { Wormling } from './wormlings';
import type { EventQueue } from '../../core/eventQueue';
import { NavGrid, pushOutOfWalls, wallBetween } from '../../world/navGrid';
import type { CombatEvent } from '../combat/state';
import type { Orb } from '../combat/targets';
import type { Ground } from '../dungeon/ground';
import type { Coin } from '../combat/coins';
import type { FistState } from '../combat/fists';
import type { Quake } from '../combat/quakes';
import type { Bomb } from '../combat/bombs';
import type { Grab } from '../combat/grab';
import type { Pin } from '../combat/pin';
import type { Rng } from '../../core/rng';
import type { PlayerState } from '../player/state';
import type { Flow } from './chase';
import { ENEMY_STATS, EnemyKind, flies, SizeClass } from './kinds';
import { KindMoon, PILOT_OF } from './kindsMoon';
import { fishLength } from './kinds6';
import { FOES3 } from '../../tuning/foes3';

export type EnemyPhase = 'chase' | 'windup' | 'recover' | 'flinch' | 'dead' | 'leap' | 'dive' | 'charge' | 'stun' | 'roar' | 'intro' | 'breath' | 'sky' | 'held' | 'rebuild' | 'grab' | 'blast' | 'burrow';

export interface Enemy {
  /** The slot is in use (a live enemy, or a body still lying there). */
  alive: boolean;
  kind: EnemyKind;
  /** Feet, and where they were at the last tick's start (the view interpolates). */
  pos: Vector3;
  prev: Vector3;
  /** Knockback slide (x, z); it dies away. */
  vel: Vector3;
  /** Facing (rad); 0 faces −z, like the player's yaw. */
  facing: number;
  hp: number;
  phase: EnemyPhase;
  /** Seconds in the current phase. */
  t: number;
  /** Counts down after a hit, for the white flash. */
  flash: number;
  /** Update 0.0.17 — seconds it stays frozen (0: not). */
  frozen: number;
  /** Time until it may attack again (the spitter's shots). */
  cooldown: number;
  /** Which way it circles you, +1 or −1 (the spitter), and time until it turns round. */
  strafe: number;
  strafeTime: number;
  /** Update 0.0.13 — where a leap or a dive began, where it's headed, and whether this dive has hit you. */
  from: Vector3;
  aim: Vector3;
  struck: boolean;
  /** Update 0.0.15 — a boss: the move it winds up, and its stage (0, then 1 once it rages). */
  move: number;
  stage: number;
  /** Update 0.0.18 — shots fired in this burst (the Dragon's fireballs). */
  shots: number;
  /** Update 0.0.21 — seconds you've stayed close (the Dragon's flame burst); the ledge it stands on (m; 0: the floor).
   *  Update 0.2.3 — the Bone King: its blast's radius (m). */
  near: number;
  perch: number;
  /** Update 0.1.15 — it holds an attack token (tokens.ts), for how long (s), and how long before it may take one again. */
  token: boolean;
  tokenFor: number;
  rest: number;
  /** Update 0.1.15 — how far round the player (rad) it should move to its own angle (spread.ts; NaN: none). */
  fan: number;
  /** Update 0.1.19 — the Ninja: seconds before it can teleport away again (ninja.ts). */
  blink: number;
  /** Update 0.2.3 — the Bone King's once-only moves done (bits: boneKing.ts). */
  deeds: number;
  /** Update 0.2.4 — a Flying Tribal's ward on it: blows it shrugs off (maskTribal.ts, evade.ts). */
  ward: number;
  /** Update 0.3.7 — it hit a wall this tick this fast (m/s; 0: not), and where (flight.ts, combat/splat.ts). */
  splat: number;
  wall: Vector3;
  /** Update 0.3.8 — dead, pinned to a wall: seconds it hangs there (0: not; flight.ts). */
  pinned: number;
  /** Update 0.3.15 — quickened by floor 6's Shanty Man's song: seconds left (0: not; shanty.ts). */
  hype: number;
  /** Update 0.3.42 — The Swarm's worms (swarmBody.ts): made the first time a slot holds one, seeded each time one
   *  spawns there. */
  swarm: SwarmBody | null;
  /** Update 0.3.49 — a boss's ultimate (ultimate.ts). */
  ult: Ultimate;
  /** Update 0.3.53 — the Bone King's body as a place (kingBody.ts; null: anything else). */
  king: KingBody | null;
}

/** What an enemy's tick works with: the walk grids and the way to the player per size, the orbs, the events.
 *  Update 0.0.15 — the quake rings, and the fight's seeded RNG (the Demon picks its moves with it). */
export interface EnemyWorld {
  /** Update 0.3.10 — your fists (the fight's: a melee blow met by your parry is parried, combat/meleeParry.ts).
   *  Update 0.3.11 — floor 7's ice (a body knocked across it slides far: flight.ts). Update 0.3.15 — the ground's
   *  ice, pits and boardwalks (dungeon/ground.ts); your money and the coins flying (floor 6's Thieving Gull snatches
   *  it, and drops it killed). */
  fists?: FistState;
  ground?: Ground;
  money?: number;
  coins?: Coin[];
  nav: Record<SizeClass, NavGrid>;
  flow: Record<SizeClass, Flow>;
  orbs: Orb[];
  quakes: Quake[];
  rng: Rng;
  events: EventQueue<CombatEvent>;
  enemies: Enemy[];
  bombs: Bomb[];
  /** Update 0.2.3 — the Bone King's hold on you. */
  grab: Grab;
  /** Update 0.2.8 — the Velociraptor's pin on you, and its sandstorm (seconds left). */
  pin: Pin;
  storm: number;
  /** Update 0.2.10 — the water's level where the fight is (m; 0: dry): floor 5's enemies use it. The Drowned King's
   *  room's water (m), which it floods and drains. */
  tide: number;
  flood: number;
  /** Update 0.3.17 — gravity, this share of the usual (floor 8's moon; none: 1): bodies and the knocked fall slower. */
  gravity?: number;
  /** Update 0.3.51 — The Swarm's big worms (the fight's). */
  wormlings?: Wormling[];
}

export const ENEMY_POOL = 16;
/** A floor-bound body this far up (m) is in the air (a leap): walls don't push it. */
const OFF_GROUND = 0.3;

export function createEnemies(): Enemy[] {
  return Array.from({ length: ENEMY_POOL }, () => ({
    alive: false,
    kind: 'grunt' as EnemyKind,
    pos: new Vector3(),
    prev: new Vector3(),
    vel: new Vector3(),
    facing: 0,
    hp: 0,
    phase: 'chase' as EnemyPhase,
    t: 0,
    flash: 0,
    frozen: 0,
    cooldown: 0,
    strafe: 1,
    strafeTime: 0,
    from: new Vector3(),
    aim: new Vector3(),
    struck: false,
    move: 0,
    stage: 0,
    shots: 0,
    near: 0,
    perch: 0,
    token: false,
    tokenFor: 0,
    rest: 0,
    fan: NaN,
    blink: 0,
    deeds: 0,
    ward: 0,
    splat: 0,
    wall: new Vector3(),
    pinned: 0,
    hype: 0,
    swarm: null,
    ult: createUltimate(),
    king: null,
  }));
}

/** An enemy of `kind` in a free slot at `at`, facing `facing`. Returns its index, or −1 if the pool is full. */
export function spawnEnemy(enemies: Enemy[], kind: EnemyKind, at: Vector3, facing: number): number {
  const i = enemies.findIndex((e) => !e.alive);
  if (i < 0) return -1;
  const e = enemies[i];
  e.alive = true;
  e.kind = kind;
  e.pos.copy(at);
  e.prev.copy(at);
  e.vel.set(0, 0, 0);
  e.facing = facing;
  e.hp = ENEMY_STATS[kind]().hp;
  e.phase = 'chase';
  e.t = 0;
  e.flash = 0;
  e.frozen = 0;
  // A spitter doesn't fire the moment it arrives.
  e.cooldown = 1;
  e.strafe = i % 2 === 0 ? 1 : -1;
  e.strafeTime = 2;
  e.from.copy(at);
  e.aim.copy(at);
  e.struck = false;
  e.move = 0;
  e.stage = 0;
  e.shots = 0;
  e.near = 0;
  e.perch = 0;
  e.token = false;
  e.tokenFor = e.rest = 0;
  e.splat = e.pinned = e.hype = 0;
  e.fan = NaN;
  e.blink = 0;
  e.deeds = 0;
  e.ward = 0;
  resetUltimate(e.ult);
  // (Update 0.3.42 — The Swarm's worms seeded round it on its first tick.)
  if (kind === 'swarm') (e.swarm ??= createSwarmBody()).seeded = false;
  e.king = kind === 'boneKing' ? createKingBody() : null;
  return i;
}

/** Fighting (not dead, and in use). */
export const isLive = (e: Enemy) => e.alive && e.phase !== 'dead';

// (Update 0.3.42 — The Swarm's: as far as its heap reaches now, thinning as its worms die.)
// (Update 0.3.53 — the Bone King's, as it's grown.)
export const radiusOf = (e: Enemy) => (e.kind === 'swarm' && e.swarm?.seeded ? e.swarm.extent : ENEMY_STATS[e.kind]().radius * (e.king?.grow ?? 1));

/** Walls push it: always a flier (on its own grid), a walker only on the ground (Update 0.3.15 — not one rooted in the sea,
 *  its floor below the ground's: floor 6's Tentacle, which the sea's edge pushed out of the water). */
export const grounded = (e: Enemy) => flies(e.kind) || (e.pos.y < OFF_GROUND && e.perch >= 0);

/** The bottom and top of its hit capsule's axis. Update 0.2.11 — a fish's lies along it (its tail to its nose). */
export function enemyAxis(e: Enemy, bottom: Vector3, top: Vector3) {
  // (Update 0.3.42 — The Swarm: a ball round its eye, as far as its heap reaches.)
  if (e.kind === 'swarm') {
    bottom.set(e.pos.x, e.pos.y + swarmEyeHeight(), e.pos.z);
    top.copy(bottom);
    return;
  }
  const s = ENEMY_STATS[e.kind]();
  // (Update 0.3.53 — the Bone King, grown.)
  if (e.king) {
    const g = e.king.grow;
    bottom.set(e.pos.x, e.pos.y + s.radius * g, e.pos.z);
    top.set(e.pos.x, e.pos.y + (s.height - s.radius) * g, e.pos.z);
    return;
  }
  const half = Math.max(0, fishLength(e.kind, s.height) / 2 - s.radius);
  bottom.set(e.pos.x + Math.sin(e.facing) * half, e.pos.y + s.radius, e.pos.z + Math.cos(e.facing) * half);
  top.set(e.pos.x - Math.sin(e.facing) * half, e.pos.y + Math.max(s.radius, s.height - s.radius), e.pos.z - Math.cos(e.facing) * half);
}

/** The yaw that faces from `e` towards (x, z). */
export const yawTo = (e: Enemy, x: number, z: number) => Math.atan2(-(x - e.pos.x), -(z - e.pos.z));

/** Turns `from` towards `to` (radians) by at most `step`. */
export function turn(from: number, to: number, step: number): number {
  let d = to - from;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return from + Math.max(-step, Math.min(step, d));
}

export function setPhase(e: Enemy, p: EnemyPhase) {
  e.phase = p;
  e.t = 0;
}

/** Moves on the floor along (dx, dz) (length 1) by `dist`, then out of any wall it ran into. */
export function walk(e: Enemy, dx: number, dz: number, dist: number, nav: NavGrid) {
  e.pos.x += dx * dist;
  e.pos.z += dz * dist;
  pushOutOfWalls(nav, e.pos, radiusOf(e));
}

/** Can it hit the player from here: within `level` m of its height and no wall in between? */
export function inLine(e: Enemy, player: PlayerState, nav: NavGrid, level: number): boolean {
  return Math.abs(player.pos.y - e.pos.y) < level && !wallBetween(nav, e.pos.x, e.pos.z, player.pos.x, player.pos.z);
}

/** Update 0.1.19 — brought down, does it fall to pieces (skeleton.ts) rather than die? A Skeleton, not in pieces or
 *  held, till its revives are used. Update 0.2.3 — the Bone King, in its first life. */
export const fallsApart = (e: Enemy) => (e.kind === 'skeleton' && e.phase !== 'rebuild' && e.phase !== 'held' && e.stage < Math.round(FOES3.v.skeletonRevives)) || (e.kind === 'boneKing' && e.stage === 0 && e.phase !== 'rebuild');

/** Damages an enemy pushed along (dirX, dirZ) (length 1). A hit at least as hard as its stagger flinches it
 *  (cancelling its attack; Update 0.2.18 — not `steady` damage: a bleed's or a burn's). Returns true if it died. */
export function hitEnemy(e: Enemy, damage: number, knock: number, dirX: number, dirZ: number, steady = false, at: Vector3 | null = null): boolean {
  if (!isLive(e)) return false;
  // Update 0.3.42 — The Swarm: a worm in the way takes the blow (its share of the bar if it dies), or through a gap
  // its eye does (swarmHits.ts). `at`: where the blow landed (none: on the side it came from).
  if (e.kind === 'swarm' && e.swarm?.seeded) {
    // (Update 0.3.51 — through its stare, a blow on its pupil counts towards its cancel, and hurts it no more than that.)
    if (onPupil(e, at)) {
      e.flash = 0.12;
      e.ult.fill += 1;
      e.swarm.eyeHit++;
      return false;
    }
    damage = swarmTakes(e, e.swarm, damage, dirX, dirZ, at);
    steady = true;
    knock = 0;
    if (damage <= 0) return false;
  }
  // Update 0.2.3 — the Bone King rebuilding: nothing hurts it.
  if (e.kind === 'boneKing' && e.phase === 'rebuild') return false;
  // Update 0.3.53 — a blow on its skull, or on its core with its bones flown: more.
  if (e.king) {
    if (e.phase === 'leap') damage *= BONE_KING.v.coreBonus;
    else if (at && at.y >= skullY(e)) {
      damage *= BONE_KING.v.skullBonus;
      e.king.skullHit++;
    }
  }
  // Update 0.3.49 — a blow on what cancels its ultimate (the Dragon's core): that takes it, not its health.
  if (ultimateTakes(e, dirX, dirZ)) {
    e.flash = 0.12;
    e.ult.fill += damage;
    return false;
  }
  const s = ENEMY_STATS[e.kind]();
  e.flash = 0.12;
  e.hp -= e.phase === 'stun' ? damage * s.stunned : damage;
  e.vel.x += dirX * knock * s.knock;
  e.vel.z += dirZ * knock * s.knock;
  if (e.hp > 0) {
    // (Update 0.2.4 — the big Cactoro shut in its thorns stays shut.)
    if (!steady && damage >= s.stagger && e.phase !== 'rebuild' && !(e.kind === 'cactoroBig' && e.phase === 'stun')) setPhase(e, 'flinch');
    return false;
  }
  e.hp = 0;
  // Update 0.3.15 — floor 6's Cursed Crewman brought down: its skull flies off, and it goes on headless (crewman.ts);
  // Update 0.3.18 — floor 8's Bee mech broken, Barbara climbs out (beeMech.ts): each its own health. (Not one held in
  // an execution: that finishes it. Update 0.3.28 — each of the four mechs its pilot.)
  const next = e.kind === 'crewman' ? 'headless' : (PILOT_OF[e.kind as KindMoon] ?? null);
  if (next && e.phase !== 'held') {
    e.kind = next;
    e.hp = ENEMY_STATS[next]().hp;
    e.shots = 1;
    e.vel.set(0, 0, 0);
    setPhase(e, 'flinch');
    return false;
  }
  // Update 0.1.19 — a Skeleton falls to pieces (and rebuilds: skeleton.ts): not dead yet.
  if (fallsApart(e)) {
    e.vel.set(0, 0, 0);
    e.shots = 0;
    setPhase(e, 'rebuild');
    return false;
  }
  e.vel.y = 0;
  // Where it died (a boss's death show starts there).
  e.from.copy(e.pos);
  e.struck = false;
  setPhase(e, 'dead');
  return true;
}
