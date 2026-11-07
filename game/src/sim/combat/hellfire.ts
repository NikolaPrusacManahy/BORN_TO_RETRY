// Update 0.5.4 — floor 10's Bone Axeman's floor split (sim/enemies/boneAxeman.ts): its axe meets the floor and a line of fire bursts out in
// front of it (shown on the floor first, all through its leap: engine/hell/hellFoesFx.ts), up to the first wall, and burns a while: you on it,
// your feet low, burned now and then. Kept with the fight's ground (dungeon/ground.ts). Pure.
import type { EventQueue } from '../../core/eventQueue';
import { FOES_HELL } from '../../tuning/foesHell';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { segmentDistance2D } from './geometry';
import type { CombatEvent } from './state';

/** A burning line: from (ax, az) to (bx, bz) on the floor at height `y`, its life left and whole (s). */
export interface FireLine {
  alive: boolean;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  y: number;
  life: number;
  full: number;
}
export interface Hellfire {
  lines: FireLine[];
  /** Seconds till a line can burn you again. */
  burn: number;
}

const POOL = 6;
/** On a line you're burned at most this often (s), your feet no higher over it than this (m: a jump clears it). */
export const BURN_EVERY = 0.6;
const ON_FLOOR = 0.6;

export const createHellfire = (): Hellfire => ({ lines: Array.from({ length: POOL }, () => ({ alive: false, ax: 0, az: 0, bx: 0, bz: 0, y: 0, life: 0, full: 1 })), burn: 0 });

/** Are you on `l` (your feet low)? */
export const onLine = (l: FireLine, p: PlayerState) => l.alive && p.pos.y - l.y < ON_FLOOR && segmentDistance2D(l.ax, l.az, l.bx, l.bz, p.pos.x, p.pos.z) <= FOES_HELL.v.splitWide;

/** A line of fire bursting from (ax, az) to (bx, bz), on the floor at `y`. */
export function splitFloor(h: Hellfire, ax: number, az: number, bx: number, bz: number, y: number): FireLine {
  const l = h.lines.find((x) => !x.alive) ?? h.lines.reduce((a, b) => (b.life < a.life ? b : a));
  const life = FOES_HELL.v.splitLast;
  return Object.assign(l, { alive: true, ax, az, bx, bz, y, life, full: life });
}

/** One tick: the lines burn out; one under you burns you. */
export function stepHellfire(h: Hellfire, player: PlayerState, events: EventQueue<CombatEvent>, dt: number) {
  for (const l of h.lines) {
    if (!l.alive) continue;
    l.life -= dt;
    if (l.life <= 0) l.alive = false;
  }
  h.burn = Math.max(0, h.burn - dt);
  if (h.burn > 0 || player.dead || !h.lines.some((l) => onLine(l, player))) return;
  if (!damagePlayer(player, FOES_HELL.v.splitBurn, 'boneAxeman')) return;
  h.burn = BURN_EVERY;
  events.push('splitBurn', 0, player.pos.x, player.pos.y + 0.2, player.pos.z);
}
