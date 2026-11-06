// Update 0.3.63 — Hellwarden's ultimate, Last Verdict (the Boss Design Bible; spec MD_UPDATES/U0363_HELLWARDEN.md): the only one-shot in the
// game. Everything goes silent, the screen drains of colour, one heartbeat. It rises, its blades fusing into one great burning sword, and
// charges three seconds. Then one cleave across the whole room, from anywhere, through anything. One perfect parry, at its flash: its sword
// shatters, and it's down a long while, the finisher. Anything else: dead. Born to retry. Your fists come out as it opens: a parry's
// bare-handed, and the cue asks for one. Enemy.shots: its tell, its charge. Pure.
import { HELLWARDEN } from '../../tuning/hellwarden';
import type { CombatState } from '../combat/state';
import { parryBossBlow } from '../combat/meleeParry';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { selectSlot } from '../weapons/slots';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { openUltimate, stepUltimate } from './ultimate';
import { VERDICT } from './wardenMoves';

/** What the screen says. */
export const VERDICT_CUE = 'PARRY THE CLEAVE';
export const VERDICT_TELL = 0;
export const VERDICT_CHARGE = 1;
/** How high it rises (m). More than any health. */
export const VERDICT_UP = 4;
const KILLS = 100000;

export function startVerdict(e: Enemy, index: number, w: EnemyWorld) {
  const b = e.warden!;
  e.move = VERDICT;
  e.shots = VERDICT_TELL;
  b.brand = null;
  setPhase(e, 'blast');
  w.events.push('wardenVerdict', index, e.pos.x, e.pos.y + 3, e.pos.z);
}

/** Its colour's gone from the world (0..1): the view's. */
export function verdictGrey(e: Enemy): number {
  if (e.phase !== 'blast' || e.move !== VERDICT) return 0;
  return e.shots === VERDICT_TELL ? Math.min(1, e.t / Math.max(0.1, HELLWARDEN.v.verdictTell)) : 1;
}

/** One tick of its ultimate. True once it's over (not when it's shattered: that's its phase). */
export function stepVerdict(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = HELLWARDEN.v;
  const b = e.warden!;
  const u = e.ult;
  e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), v.turn * dt);
  if (e.shots === VERDICT_TELL) {
    e.pos.y = VERDICT_UP * Math.min(1, e.t / v.verdictTell);
    if (e.t < v.verdictTell) return false;
    e.shots = VERDICT_CHARGE;
    e.t = 0;
    openUltimate(u, VERDICT_CUE, v.verdictWindow, 1);
    const state = w as CombatState;
    if (state.slot) selectSlot(state, 0);
    w.events.push('wardenCharge', index, e.pos.x, e.pos.y + 4, e.pos.z);
    e.struck = false;
    return false;
  }
  u.left = Math.max(0.01, u.left - dt);
  if (!e.struck && e.t >= v.verdictWindow - v.verdictFlash) {
    e.struck = true;
    w.events.push('wardenFlash', index, e.pos.x, e.pos.y + 4, e.pos.z);
  }
  if (e.t < v.verdictWindow) return false;
  // The cleave, across everything.
  e.pos.y = 0;
  if (!player.dead && parryBossBlow(player, w, e, index)) {
    u.fill = u.need;
    stepUltimate(u, dt);
    if (e.hp <= 0) return false;
    e.hp = Math.max(1, e.hp - v.verdictSelf);
    b.shattered = true;
    setPhase(e, 'stun');
    w.events.push('wardenShatter', index, e.pos.x, e.pos.y + 4, e.pos.z);
    return false;
  }
  u.on = false;
  w.events.push('wardenCleave', index, e.pos.x, e.pos.y + 3, e.pos.z);
  // (Nothing saves you: not a dash.)
  player.invuln = 0;
  player.hurtTime = 0;
  if (!player.dead) damagePlayer(player, KILLS, e.kind);
  return true;
}
