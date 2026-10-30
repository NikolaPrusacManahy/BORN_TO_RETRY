// Update 0.1.15 — attack tokens (the designer: the enemies "behave like a big swarm"; the goal is hard but fair, deaths
// you learn from). Like the crowds in Doom (2016) and the Arkham games: only a few enemies may go for you at once, per
// role (close fighters, ranged ones, big ones: tuning/crowd.ts). An enemy needs a token to start an attack (a close
// fighter also to come in for one). It keeps it through the run-in, the wind-up and the attack, and gives it back once
// the attack is done, when a hit flinches it, or if it hasn't attacked for a while; then it rests a moment, so another
// gets a turn. Free tokens go to the nearest ready enemies, those in front of you first (attacks come from where you
// look), never two within the spacing (attacks don't start together). Without one, a close fighter waits on a ring
// round you, out of reach, circling; ranged ones and leapers keep their distance and hold their fire. Bosses need
// none. Pure; dealt once a tick, before the enemies move (update.ts).
import { CROWD } from '../../tuning/crowd';
import { ENEMIES } from '../../tuning/enemies';
import { FOES2 } from '../../tuning/foes2';
import { FOES3 } from '../../tuning/foes3';
import { FOES3B } from '../../tuning/foes3b';
import type { PlayerState } from '../player/state';
import { ENEMY_POOL, Enemy, EnemyPhase, EnemyWorld, isLive } from './enemy';
import { ENEMY_STATS, EnemyKind } from './kinds';
import { keepRing } from './moves';

export type Role = 'melee' | 'ranged' | 'heavy';

export const ROLE: Record<EnemyKind, Role | null> = {
  grunt: 'melee',
  snake: 'melee',
  slime: 'melee',
  leaper: 'melee',
  stinger: 'melee',
  wasp: 'melee',
  spitter: 'ranged',
  wraith: 'ranged',
  frog: 'ranged',
  brute: 'heavy',
  spider: 'heavy',
  blueDemon: 'heavy',
  skeleton: 'melee',
  mushnub: 'melee',
  ninja: 'heavy',
  demon: null,
  dragon: null,
  boneKing: null,
  // Update 0.2.4 — floor 4's go their own ways (they don't wait their turn: that's what makes them hard).
  tribal: null,
  cactoro: null,
  cactoroBig: null,
  hywirl: null,
  dino: null,
  dinoBlob: null,
  lizard: null,
  greenBlob: null,
  blobling: null,
  maskTribal: null,
  skullOrc: null,
  // Update 0.2.7 — floor 3's newcomers wait their turn as floor 3's others do.
  dragonling: 'ranged',
  skullWraith: 'ranged',
  rabbit: 'melee',
  bigMushnub: 'heavy',
};

/** Kinds whose attack waits for its cooldown: they take a token only once it's ready (a token isn't held idle). */
const COOLS: ReadonlySet<EnemyKind> = new Set<EnemyKind>(['spitter', 'leaper', 'stinger', 'wraith', 'frog', 'wasp', 'blueDemon', 'dragonling', 'skullWraith']);

/** How far a close fighter's attack reaches (m): waiting, it keeps out of it. */
const REACH: Partial<Record<EnemyKind, () => number>> = {
  grunt: () => ENEMIES.v.gruntReach,
  snake: () => FOES2.v.snakeReach,
  slime: () => FOES2.v.slimeTrigger,
  brute: () => ENEMIES.v.bruteReach,
  spider: () => FOES2.v.spiderReach,
  skeleton: () => FOES3.v.skeletonReach,
  mushnub: () => FOES3.v.mushnubReach,
  ninja: () => FOES3.v.ninjaReach,
  rabbit: () => FOES3B.v.rabbitReach,
  bigMushnub: () => FOES3B.v.smashReach,
};

/** The phases an attack holds its token through: the run-in, the wind-up, a leap, a dive, a charge. */
const KEEPS: ReadonlySet<EnemyPhase> = new Set<EnemyPhase>(['chase', 'windup', 'leap', 'dive', 'charge']);
/** Waiting, it turns to you this fast (rad/s). */
const WAIT_TURN = 8;
/** The waiting band: closer than its ring by this much it backs off; within the band it circles (m). */
const BAND = 0.5;

/** May it start an attack: it holds a token (a boss needs none). */
export const armed = (e: Enemy) => e.token || ROLE[e.kind] === null;

/** How many of `role` may attack at once. */
export const limitOf = (role: Role) => Math.round(role === 'melee' ? CROWD.v.melee : role === 'ranged' ? CROWD.v.ranged : CROWD.v.heavy);

/** A close fighter waits this far from you without a token (m; 0: it doesn't wait on a ring). */
export const waitRing = (kind: EnemyKind) => {
  const r = REACH[kind];
  return r ? r() + CROWD.v.gap : 0;
};

const held: Record<Role, number> = { melee: 0, ranged: 0, heavy: 0 };
const order: number[] = [];
const score = new Float64Array(ENEMY_POOL);
const byScore = (a: number, b: number) => score[a] - score[b] || a - b;

/** Once a tick: tokens given back (attack done, flinched, gone, frozen, or kept too long), then one free token given
 *  out, to the best-placed ready enemy. */
export function dealTokens(enemies: Enemy[], player: PlayerState, dt: number) {
  const v = CROWD.v;
  held.melee = held.ranged = held.heavy = 0;
  let newest = Infinity;
  for (const e of enemies) {
    e.rest = Math.max(0, e.rest - dt);
    if (!e.token) continue;
    e.tokenFor += dt;
    const role = ROLE[e.kind];
    if (role && isLive(e) && e.frozen <= 0 && KEEPS.has(e.phase) && !(e.phase === 'chase' && e.tokenFor > v.hold)) {
      held[role]++;
      newest = Math.min(newest, e.tokenFor);
      continue;
    }
    e.token = false;
    e.rest = v.rest;
  }
  if (player.dead || newest < v.spacing) return;
  order.length = 0;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const role = ROLE[e.kind];
    if (!role || e.token || !isLive(e) || e.phase !== 'chase' || e.rest > 0 || e.frozen > 0 || held[role] >= limitOf(role)) continue;
    if (COOLS.has(e.kind) && e.cooldown > 0) continue;
    score[i] = placing(e, player);
    order.push(i);
  }
  if (order.length === 0) return;
  order.sort(byScore);
  const e = enemies[order[0]];
  e.token = true;
  e.tokenFor = 0;
}

/** Lower goes first: its distance, more if it's behind you. */
function placing(e: Enemy, player: PlayerState): number {
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const ahead = -Math.sin(player.yaw) * dx - Math.cos(player.yaw) * dz;
  return Math.hypot(dx, dz) + (ahead < 0 ? CROWD.v.behind : 0);
}

/** A close fighter without a token, near you: it waits its turn instead of coming in. */
export function waits(e: Enemy, player: PlayerState): boolean {
  if (e.token || e.phase !== 'chase' || player.dead) return false;
  const ring = waitRing(e.kind);
  return ring > 0 && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) < ring;
}

/** Waiting: facing you, out of reach, circling (backing off if you come at it, unless a wall is behind it). */
export function wait(e: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  const s = ENEMY_STATS[e.kind]();
  keepRing(e, player, w, s.size, Math.min(s.speed, CROWD.v.waitSpeed), waitRing(e.kind) - BAND, WAIT_TURN, dt);
}
