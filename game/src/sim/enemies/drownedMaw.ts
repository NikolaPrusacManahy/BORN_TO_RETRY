// Update 0.3.58 — the Drowned King's ultimate, Maw of Many (the Boss Design Bible; spec MD_UPDATES/U0358_DROWNED_KING_BIBLE.md): its
// heads scream and fly to its chest, which splits into one great maw, and it pulls you in. Close enough (or at the end of its window,
// wherever you are: the last of its pull is more than you can run from) the maw flashes, then bites. Parry the bite and its jaw jams
// open: a long stagger, a big damage window. Not parried: heavy damage, thrown into the water, and it Fin Dives you. Dash through it
// or clear of it and it closes on nothing: no harm, no stagger. Your fists come out as it opens: a parry's bare-handed, and the cue
// asks for one. Enemy.shots: its tell, its pull, its bite. Pure.
import { DROWNED } from '../../tuning/drowned';
import type { CombatState } from '../combat/state';
import { catchBlade } from '../combat/bladeThrow';
import { parryBossBlow } from '../combat/meleeParry';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { selectSlot } from '../weapons/slots';
import { throwYou } from './dinoMoves';
import { MAW } from './drownedKingMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, yawTo } from './enemy';
import { openUltimate, stepUltimate } from './ultimate';

/** What the screen says. */
export const MAW_CUE = 'PARRY THE BITE';
/** Update 0.3.74 — the Playable Demon's: it has no parry, its blade meets it (meleeParry.ts). */
export const MAW_CUE_BLADE = 'STRIKE THE BITE';
export const MAW_TELL = 0;
export const MAW_PULL = 1;
export const MAW_BITE = 2;
/** The last this much of its window (s) it pulls you in from anywhere (m/s). */
const YANK_FOR = 1;
const YANK = 34;
/** Through the flash it holds you this hard (m/s), down to this far past its body (m). */
const HOLD = 14;
const HOLD_AT = 1.6;
/** Higher over it than this (m), and further than this past where it holds you (m), its bite closes on nothing. */
const OVER = 5;
const MISS = 2.6;
/** Its bite's throw, up (m/s). */
const THROW_UP = 8;

export function startMaw(k: Enemy, index: number, w: EnemyWorld) {
  k.move = MAW;
  k.shots = MAW_TELL;
  k.struck = false;
  setPhase(k, 'blast');
  if (k.drowned) k.drowned.jammed = false;
  w.events.push('drownedMawTell', index, k.pos.x, k.pos.y + DROWNED.v.kingHeight * 0.45, k.pos.z);
}

/** Pulls you towards it at `speed`, down to `to` from its middle (m). */
function pull(k: Enemy, player: PlayerState, speed: number, to: number) {
  const dx = k.pos.x - player.pos.x;
  const dz = k.pos.z - player.pos.z;
  const d = Math.hypot(dx, dz);
  if (d <= to) return;
  player.current.x += (dx / d) * speed;
  player.current.z += (dz / d) * speed;
}

/** One tick of its ultimate. True once it's over (not when it's jammed: that's its phase). */
export function stepMaw(k: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = DROWNED.v;
  const r = radiusOf(k);
  const u = k.ult;
  k.facing = turn(k.facing, yawTo(k, player.pos.x, player.pos.z), v.kingTurn * dt);
  if (k.shots === MAW_TELL) {
    if (k.t < v.mawTell) return false;
    k.shots = MAW_PULL;
    k.t = 0;
    const state = w as CombatState;
    openUltimate(u, state.demon || state.sean ? MAW_CUE_BLADE : MAW_CUE, v.mawWindow, 1);
    if (state.slot) selectSlot(state, 0);
    if (state.demon) catchBlade(state);
    w.events.push('drownedMawOpen', index, k.pos.x, k.pos.y + v.kingHeight * 0.4, k.pos.z);
    return false;
  }
  const dist = Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z);
  if (k.shots === MAW_PULL) {
    if (!player.dead) {
      const grown = 1 - u.left / u.window;
      pull(k, player, u.left <= YANK_FOR + v.mawFlash ? YANK : v.mawPull + (v.mawPullEnd - v.mawPull) * grown, r + HOLD_AT);
    }
    u.left = Math.max(0, u.left - dt);
    if (dist > v.mawReach && u.left > v.mawFlash) return false;
    k.shots = MAW_BITE;
    k.t = 0;
    w.events.push('drownedMawFlash', index, k.pos.x, k.pos.y + v.kingHeight * 0.4, k.pos.z);
    return false;
  }
  // The flash: held to it, then the bite.
  u.left = Math.max(0.01, u.left - dt);
  if (!player.dead) pull(k, player, HOLD, r + HOLD_AT);
  if (k.t < v.mawFlash) return false;
  const out = dist > r + HOLD_AT + MISS || player.pos.y - k.pos.y > OVER;
  if (!player.dead && !out && parryBossBlow(player, w, k, index)) {
    u.fill = u.need;
    stepUltimate(u, dt);
    if (k.hp <= 0) return false;
    k.hp = Math.max(1, k.hp - v.mawSelf);
    if (k.drowned) k.drowned.jammed = true;
    setPhase(k, 'stun');
    w.events.push('drownedMawJam', index, k.pos.x, k.pos.y + v.kingHeight * 0.4, k.pos.z);
    return false;
  }
  u.on = false;
  w.events.push('drownedMawBite', index, k.pos.x, k.pos.y + v.kingHeight * 0.4, k.pos.z);
  if (!player.dead && !out && damagePlayer(player, v.mawDamage, k.kind)) {
    throwYou(player, k, player.pos.x - k.pos.x, player.pos.z - k.pos.z, Math.max(dist, 0.1), v.mawThrow, THROW_UP);
    if (k.drowned) k.drowned.finNow = true;
  }
  return true;
}
