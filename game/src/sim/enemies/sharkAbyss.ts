// Update 0.3.62 — the Big Shark's ultimate, Abyss Jaws (the Boss Design Bible; spec MD_UPDATES/U0362_BIG_SHARK_BIBLE.md), under water. The
// water goes still and silent, the anchors sway. It rises, comes to rest under the anchor nearest you, jaws wide, its chain glowing, and
// gathers itself. Hit the chain (anything: a shot, a thrown blade, or swim over and punch it) and the anchor crushes it into the seabed:
// stunned a long while. Not in time: it comes down on you, heavy, not a one-shot, and that anchor's gone with it. Enemy.shots: its tell,
// its wait, the anchor falling, coming down. Pure.
import { Vector3 } from 'three';
import { BIG_SHARK } from '../../tuning/bigShark';
import type { CollisionWorld } from '../collisionWorld';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { chest, swimTo } from './fishSwim';
import { ENEMY_STATS } from './kinds';
import { ABYSS } from './sharkArena';
import { nearestAnchor } from './sharkBody';
import { openUltimate } from './ultimate';

/** What the screen says. */
export const ABYSS_CUE = 'DROP THE ANCHOR';
export const ABYSS_TELL = 0;
export const ABYSS_WAIT = 1;
export const ABYSS_DROP = 2;
export const ABYSS_COME = 3;
/** Under the anchor: this far under the water's top (m); its chain's open to a hit within this far of it (m). */
const UNDER_TOP = 3.5;
const UNDER_NEAR = 6;
/** How thick its chain is to hit (m). An anchor hangs this far under the water's top (m). */
export const CHAIN_R = 0.8;
export const ANCHOR_UNDER = 1.5;
/** The anchor falls this long (s); it comes down on you this long (s), hitting you this close past its body (m). */
const DROP_FOR = 0.35;
const COME_FOR = 0.5;
const COME_REACH = 3;
const THROW: readonly [number, number] = [16, 7];

const from = new Vector3();

export function startAbyss(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const b = e.shark!;
  e.move = ABYSS;
  e.shots = ABYSS_TELL;
  b.marked = nearestAnchor(b, player.pos.x, player.pos.z);
  b.chainHit = b.chainOpen = false;
  setPhase(e, 'blast');
  w.events.push('sharkStill', index, player.pos.x, player.pos.y + 1, player.pos.z);
}

/** Where its anchor hangs. */
export function anchorY(): number {
  return BIG_SHARK.v.floodTop - ANCHOR_UNDER;
}

/** One tick of its ultimate. True once it's over (not when it's crushed: that's its phase). */
export function stepAbyss(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld): boolean {
  const v = BIG_SHARK.v;
  const b = e.shark!;
  const u = e.ult;
  const s = ENEMY_STATS.bigShark();
  const a = b.marked >= 0 ? b.anchors[b.marked] : null;
  if (e.shots === ABYSS_TELL) {
    // (It backs up towards the water's top.)
    swimTo(e, e.pos.x, v.floodTop - UNDER_TOP, e.pos.z, s.speed, dt, w, world);
    if (e.t < v.abyssTell) return false;
    e.shots = ABYSS_WAIT;
    e.t = 0;
    openUltimate(u, ABYSS_CUE, v.abyssWindow, 1);
    w.events.push('sharkAbyssOpen', index, e.pos.x, e.pos.y + 1, e.pos.z);
    return false;
  }
  if (e.shots === ABYSS_WAIT) {
    u.left = Math.max(0, u.left - dt);
    if (a) swimTo(e, a.x, v.floodTop - UNDER_TOP, a.z, s.speed * 1.6, dt, w, world);
    e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 4 * dt);
    b.chainOpen = !!a && Math.hypot(e.pos.x - a.x, e.pos.z - a.z) <= UNDER_NEAR;
    if (b.chainOpen && b.chainHit && a) {
      b.chainOpen = false;
      e.shots = ABYSS_DROP;
      e.t = 0;
      a.falling = 0;
      w.events.push('sharkAnchorDrop', index, a.x, anchorY(), a.z);
      return false;
    }
    b.chainHit = false;
    if (u.left > 0) return false;
    b.chainOpen = false;
    u.on = false;
    e.shots = ABYSS_COME;
    e.t = 0;
    e.from.copy(e.pos);
    e.aim.set(player.pos.x, chest(player), player.pos.z);
    w.events.push('sharkAbyssCome', index, e.pos.x, e.pos.y + 1, e.pos.z);
    return false;
  }
  if (e.shots === ABYSS_DROP) {
    if (a) a.falling = e.t;
    // It's pinned as it lands.
    e.pos.y = Math.max(0.3, e.pos.y - v.floodTop * (dt / DROP_FOR));
    if (e.t < DROP_FOR) return false;
    u.fill = u.need;
    u.on = false;
    if (a) a.gone = true;
    e.hp = Math.max(1, e.hp - v.abyssSelf);
    e.pos.y = 0.3;
    setPhase(e, 'stun');
    w.events.push('sharkCrushed', index, e.pos.x, 0.5, e.pos.z);
    return false;
  }
  // It comes down on you.
  const k = Math.min(1, e.t / COME_FOR);
  from.copy(e.from).lerp(e.aim, k);
  e.pos.copy(from);
  e.facing = yawTo(e, player.pos.x, player.pos.z);
  if (k < 1) return false;
  if (a) a.gone = true;
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  w.events.push('sharkAbyssHit', index, e.pos.x, e.pos.y, e.pos.z);
  if (!player.dead && d <= s.radius + COME_REACH && Math.abs(player.pos.y - e.pos.y) < COME_REACH + 2 && damagePlayer(player, v.abyssDamage, 'bigShark')) throwYou(player, e, dx, dz, d, THROW[0], THROW[1]);
  return true;
}
