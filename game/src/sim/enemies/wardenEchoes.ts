// Update 0.3.63 — Hellwarden's Echoes of the Fallen (the Boss Design Bible; spec MD_UPDATES/U0363_HELLWARDEN.md): shadows of the bosses
// you've beaten, black and red, each with its own tell, each dodged exactly as it was. The Dragon's dive (its ring where you stood: step
// out). The Giant's stomp (its knee up: a ring along the floor to jump). The Raptor's pounce (it crouches and hisses: dodge late, it
// follows an early one). The Wolf's dashes (three lines on the floor, a dash along each: off them). It keeps attacking meanwhile. Pure.
import { HELLWARDEN } from '../../tuning/hellwarden';
import { segmentDistance2D } from '../combat/geometry';
import { startQuake } from '../combat/quakes';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import type { Enemy, EnemyWorld } from './enemy';
import { ECHO_DRAGON, ECHO_GIANT, ECHO_RAPTOR, ECHO_WOLF, type Echo } from './wardenBody';

/** The Dragon: it dives from this far off (m), this high, over this long (s); its landing's this wide (m). */
export const DRAGON_FROM = 22;
export const DRAGON_UP = 13;
export const DRAGON_FOR = 1.2;
export const DRAGON_R = 4.5;
/** The Giant: this far from you; its knee's up this long (s); it's there this long after. Its ring: how fast, how far. */
const GIANT_OFF = 9;
export const GIANT_TELL = 0.8;
const GIANT_AFTER = 0.8;
const GIANT_RING = [15, 24] as const;
/** The Raptor: this far from you; it crouches this long (s), flies this long (s), this high; its landing follows you for this share. */
const RAPTOR_OFF = 13;
export const RAPTOR_TELL = 0.75;
export const RAPTOR_AIR = 0.8;
const RAPTOR_UP = 5;
const RAPTOR_FOLLOWS = 0.6;
const RAPTOR_FOLLOW = 16;
const RAPTOR_R = 3.8;
/** The Wolf: three lines, each this long either side (m), this wide (m); each glows this long (s), this far apart (s). */
export const WOLF_LINES = 3;
export const WOLF_LONG = 18;
const WOLF_WIDE = 1.7;
export const WOLF_WARN = 0.5;
export const WOLF_GAP = 0.32;

export function startEchoes(e: Enemy) {
  const b = e.warden!;
  b.echoLeft = Math.round(HELLWARDEN.v.echoCount);
  b.echoIn = 0;
}

function spawnEcho(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const b = e.warden!;
  const type = b.echoNext;
  b.echoNext = (b.echoNext + 1) % 4;
  const a = w.rng() * Math.PI * 2;
  const off = type === ECHO_DRAGON ? DRAGON_FROM : type === ECHO_GIANT ? GIANT_OFF : type === ECHO_RAPTOR ? RAPTOR_OFF : 0;
  const x = player.pos.x + Math.sin(a) * off;
  const z = player.pos.z + Math.cos(a) * off;
  const echo: Echo = { type, t: 0, x, y: type === ECHO_DRAGON ? DRAGON_UP : 0, z, fromX: x, fromZ: z, toX: player.pos.x, toZ: player.pos.z, facing: Math.atan2(-(player.pos.x - x), -(player.pos.z - z)), done: 0, a };
  b.echoes.push(echo);
  w.events.push('wardenEcho', type, x, 2, z);
  void index;
}

/** One tick of its Echoes: the next as it's due, each that's up. */
export function stepEchoes(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = HELLWARDEN.v;
  const b = e.warden!;
  if (b.echoLeft > 0) {
    b.echoIn -= dt;
    if (b.echoIn <= 0) {
      b.echoIn = v.echoEvery;
      b.echoLeft--;
      spawnEcho(e, index, player, w);
    }
  }
  for (let i = b.echoes.length - 1; i >= 0; i--) {
    const c = b.echoes[i];
    c.t += dt;
    if (stepOne(e, c, player, w, dt)) b.echoes.splice(i, 1);
  }
}

/** One tick of one: true once it's over. */
function stepOne(e: Enemy, c: Echo, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = HELLWARDEN.v;
  switch (c.type) {
    case ECHO_DRAGON: {
      const k = Math.min(1, c.t / DRAGON_FOR);
      c.x = c.fromX + (c.toX - c.fromX) * k;
      c.z = c.fromZ + (c.toZ - c.fromZ) * k;
      c.y = DRAGON_UP * (1 - k * k);
      if (k < 1) return false;
      w.events.push('wardenEchoHit', ECHO_DRAGON, c.x, 0.5, c.z);
      if (!player.dead && Math.hypot(player.pos.x - c.x, player.pos.z - c.z) <= DRAGON_R && player.pos.y < 4 && damagePlayer(player, v.echoDragon, 'hellwarden')) throwYou(player, e, player.pos.x - c.x, player.pos.z - c.z, 1, 11, 6);
      return true;
    }
    case ECHO_GIANT:
      if (c.done === 0 && c.t >= GIANT_TELL) {
        c.done = 1;
        startQuake(w.quakes, c.x, 0, c.z, GIANT_RING[0], GIANT_RING[1], v.echoGiant, 0, 'hellwarden');
        w.events.push('wardenEchoHit', ECHO_GIANT, c.x, 0.5, c.z);
      }
      return c.t >= GIANT_TELL + GIANT_AFTER;
    case ECHO_RAPTOR: {
      if (c.t < RAPTOR_TELL) return false;
      const k = Math.min(1, (c.t - RAPTOR_TELL) / RAPTOR_AIR);
      if (k < RAPTOR_FOLLOWS) {
        const dx = player.pos.x - c.toX;
        const dz = player.pos.z - c.toZ;
        const off = Math.hypot(dx, dz);
        if (off > 1e-3) {
          const step = Math.min(off, RAPTOR_FOLLOW * dt);
          c.toX += (dx / off) * step;
          c.toZ += (dz / off) * step;
        }
      }
      c.x = c.fromX + (c.toX - c.fromX) * k;
      c.z = c.fromZ + (c.toZ - c.fromZ) * k;
      c.y = 4 * RAPTOR_UP * k * (1 - k);
      c.facing = Math.atan2(-(c.toX - c.fromX), -(c.toZ - c.fromZ));
      if (k < 1) return false;
      w.events.push('wardenEchoHit', ECHO_RAPTOR, c.x, 0.5, c.z);
      if (!player.dead && Math.hypot(player.pos.x - c.x, player.pos.z - c.z) <= RAPTOR_R && player.pos.y < 3 && player.invuln <= 0 && damagePlayer(player, v.echoRaptor, 'hellwarden')) throwYou(player, e, player.pos.x - c.x, player.pos.z - c.z, 1, 10, 6);
      return true;
    }
    case ECHO_WOLF: {
      const n = c.done;
      if (n >= WOLF_LINES) return c.t >= WOLF_WARN + WOLF_LINES * WOLF_GAP + 0.3;
      if (c.t < WOLF_WARN + n * WOLF_GAP) return false;
      c.done = n + 1;
      const a = wolfLine(c, n);
      const dx = Math.sin(a) * WOLF_LONG;
      const dz = Math.cos(a) * WOLF_LONG;
      w.events.push('wardenEchoHit', ECHO_WOLF, c.toX, 1, c.toZ);
      if (!player.dead && segmentDistance2D(c.toX - dx, c.toZ - dz, c.toX + dx, c.toZ + dz, player.pos.x, player.pos.z) <= WOLF_WIDE && player.pos.y < 3) damagePlayer(player, v.echoWolf, 'hellwarden');
      return false;
    }
    default:
      return true;
  }
}

/** The Wolf's line `n`: its angle through where you were. */
export const wolfLine = (c: Echo, n: number) => c.a + (n * Math.PI) / WOLF_LINES;
