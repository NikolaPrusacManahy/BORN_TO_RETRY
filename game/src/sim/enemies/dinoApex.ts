// Update 0.3.60 — the Velociraptor's ultimate, Apex Hunt (the Boss Design Bible, "Trust your ears"; spec
// MD_UPDATES/U0360_VELOCIRAPTOR_BIBLE.md). The light dies, a heart beats, it's gone, and all that's left is its clicks from wherever it
// is. Then its eyes flash in the dark for half a second, and it kicks a stone at you. Hit it in that time (a shot, a thrown blade, or the
// stone parried back into its eyes: bare hands have their way through) and it's blinded, on its back, a long while. Not: it lunges out of
// the dark, heavy, not a one-shot. A dash still beats the lunge, without the stagger. Enemy.shots: the light dying, its stalk, its eyes,
// its lunge. Combat's storm: seconds of dark left. Pure.
import { Vector3 } from 'three';
import { DINO } from '../../tuning/dino';
import { fireOrb } from '../combat/orbs';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { stalkUnseen, vanish } from './dinoHunt';
import { APEX, throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, walk, yawTo } from './enemy';
import { openUltimate } from './ultimate';

/** What the screen says. */
export const APEX_CUE = 'HIT ITS EYES';
export const APEX_DARKEN = 0;
export const APEX_STALK = 1;
export const APEX_EYES = 2;
export const APEX_LUNGE = 3;
/** Its eyes flash no sooner than this into its stalk, and leave this long at the end (s). */
const FLASH_EARLIEST = 1.6;
const FLASH_LATEST = 0.3;
/** Its heart beats this often (s), quicker to this as it comes. */
const HEART = 0.9;
const HEART_FAST = 0.45;
/** The light dying, it backs away this fast (m/s). */
const BACK_OFF = 16;
/** Its lunge flies this long (s); it hits you this close past its body (m), this far over its feet. Throw (m/s). */
const LUNGE_FOR = 0.42;
const LUNGE_REACH = 3;
const LUNGE_OVER = 3;
const THROW: readonly [number, number] = [15, 8];
/** Dark comes up and fades over this long (s). */
export const DARK_FADE = 0.6;

const from = new Vector3();
const dir = new Vector3();

/** The dark, all told (s). */
export const darkFor = () => DINO.v.apexTell + DINO.v.apexWindow + DARK_FADE + 0.5;

export function startApex(d: Enemy, index: number, w: EnemyWorld) {
  d.move = APEX;
  d.shots = APEX_DARKEN;
  setPhase(d, 'blast');
  w.storm = darkFor();
  w.events.push('dinoDark', index, d.pos.x, d.pos.y + 2, d.pos.z);
}

/** The stone it kicks as its eyes flash. */
function kickStone(d: Enemy, player: PlayerState, w: EnemyWorld) {
  from.set(d.pos.x, d.pos.y + 1, d.pos.z);
  dir.set(player.pos.x - from.x, player.pos.y + BODY.height * 0.6 - from.y, player.pos.z - from.z).normalize();
  from.addScaledVector(dir, radiusOf(d));
  fireOrb(w.orbs, from, dir, DINO.v.apexStone, DINO.v.apexStoneHurt, d.kind, 'rubble');
}

/** Its stone's on its way back (it waits for it: it's looking right at it). */
const stoneBack = (w: EnemyWorld) => w.orbs.some((o) => o.alive && o.parried && o.look === 'rubble' && o.by === 'dino');

/** One tick of its ultimate. True once it's over (not when it's blinded: that's its phase). */
export function stepApex(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DINO.v;
  const b = d.raptor!;
  const u = d.ult;
  if (d.shots === APEX_DARKEN) {
    const dx = d.pos.x - player.pos.x;
    const dz = d.pos.z - player.pos.z;
    const len = Math.max(0.1, Math.hypot(dx, dz));
    d.facing = yawTo(d, d.pos.x + dx, d.pos.z + dz);
    walk(d, dx / len, dz / len, BACK_OFF * dt, w.nav.large);
    if (d.t < v.apexTell) return false;
    d.shots = APEX_STALK;
    d.t = 0;
    vanish(d, player);
    b.flashAt = FLASH_EARLIEST + w.rng() * Math.max(0, v.apexWindow - FLASH_EARLIEST - FLASH_LATEST - v.apexFlash);
    b.beatIn = 0;
    openUltimate(u, APEX_CUE, v.apexWindow, 1);
    return false;
  }
  if (d.shots !== APEX_LUNGE) u.left = Math.max(0, u.left - dt);
  if (d.shots === APEX_STALK) {
    const k = Math.min(1, d.t / Math.max(0.1, b.flashAt));
    stalkUnseen(d, index, k, player, w, dt);
    b.beatIn -= dt;
    if (b.beatIn <= 0) {
      b.beatIn = HEART + (HEART_FAST - HEART) * k;
      w.events.push('dinoHeart', k, player.pos.x, 1, player.pos.z);
    }
    if (d.t < b.flashAt) return false;
    d.shots = APEX_EYES;
    d.t = 0;
    d.flash = 0;
    d.pos.y = d.prev.y = 0;
    walk(d, 0, 0, 0, w.nav.large);
    d.facing = yawTo(d, player.pos.x, player.pos.z);
    w.events.push('dinoEyes', index, d.pos.x, d.pos.y + v.dinoHeight * 0.7, d.pos.z);
    kickStone(d, player, w);
    return false;
  }
  if (d.shots === APEX_EYES) {
    d.facing = yawTo(d, player.pos.x, player.pos.z);
    if (d.flash > 0) {
      u.fill = u.need;
      u.on = false;
      w.storm = Math.min(w.storm, DARK_FADE);
      if (d.hp <= 0) return false;
      d.hp = Math.max(1, d.hp - v.apexSelf);
      b.flipped = true;
      setPhase(d, 'stun');
      w.events.push('dinoBlinded', index, d.pos.x, d.pos.y + 1.5, d.pos.z);
      return false;
    }
    if (d.t < v.apexFlash || stoneBack(w)) return false;
    d.shots = APEX_LUNGE;
    d.t = 0;
    d.from.copy(d.pos);
    d.aim.set(player.pos.x, 0, player.pos.z);
    u.on = false;
    w.events.push('dinoPounce', APEX, d.pos.x, d.pos.y + 1, d.pos.z);
    return false;
  }
  // Its lunge.
  const k = Math.min(1, d.t / LUNGE_FOR);
  d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
  d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
  d.pos.y = 4 * 1.2 * k * (1 - k);
  if (k < 1) return false;
  d.pos.y = 0;
  walk(d, 0, 0, 0, w.nav.large);
  w.storm = Math.min(w.storm, DARK_FADE);
  w.events.push('dinoLand', APEX, d.pos.x, 0, d.pos.z);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (!player.dead && dist <= radiusOf(d) + LUNGE_REACH && player.pos.y - d.pos.y < LUNGE_OVER && damagePlayer(player, v.apexDamage, d.kind)) throwYou(player, d, dx, dz, dist, THROW[0], THROW[1]);
  return true;
}
