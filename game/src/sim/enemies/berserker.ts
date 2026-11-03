// Update 0.3.22 — floor 7's Berserker, a mini boss (the More-enemies pack's horned Viking, big, a double axe, his eyes red;
// MD/FLOOR7_WARBAND_PLAN.md). With his turn and you in sight he roars (Spin warning) and goes berserk: he spins with his
// axe out for Spin for, drifting at you (Spin drift; Update 0.3.27 — no faster on ice, no skid: the designer),
// catching you within Spin reach (Spin hit, now and then: never parried, a mini boss's blow). Then he's dizzy (Dizzy: a
// stun, your hits worth more). Below Berserker rage of his health he spins twice before he's dizzy. Otherwise, up close,
// his chop (brawler.ts). Only a hard hit staggers him (out of a roar or a spin too). Pure.
import { FOES_NORSE_B } from '../../tuning/foesNorseB';
import { meleeHit } from '../combat/meleeParry';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const CHOP: Brawl = {
  reach: () => FOES_NORSE_B.v.berserkerReach,
  windup: () => FOES_NORSE_B.v.berserkerWindup,
  damage: () => FOES_NORSE_B.v.berserkerDamage,
  turn: 7,
  windupTurn: 3,
  arc: 85,
  recover: 0.7,
  shove: 10,
  windupEvent: 'berserkerWindup',
  strikeEvent: 'berserkerChop',
};
/** His move (`move`) roaring before a spin. */
export const ROAR = 1;
/** He spins this fast (rad/s, drawn); his drift turns to you this fast on stone and on ice (rad/s); his spin catches
 *  you once each this long at most (s), throwing you this hard (m/s); he goes berserk from this far at most (m). */
const SPIN_TURN = 14;
const DRIFT_TURN = 5;
const HIT_EVERY = 0.45;
const THROW = 9;
const BERSERK_FROM = 12;

export function updateBerserker(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_NORSE_B.v;
  if (e.phase === 'flinch') e.move = 0;
  if (e.phase === 'windup' && e.move === ROAR) {
    e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 5 * dt);
    if (e.t < v.spinWarn) return;
    // Two spins below his rage.
    e.shots = e.hp < ENEMY_STATS.berserker().hp * v.rageAt ? 2 : 1;
    startSpin(e, index, player, w);
    return;
  }
  if (e.phase === 'charge') return spin(e, index, player, w, dt);
  if (e.phase === 'stun') {
    if (e.t >= v.dizzy) {
      e.cooldown = v.spinEvery;
      setPhase(e, 'chase');
    }
    return;
  }
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.phase === 'chase' && e.cooldown <= 0 && !player.dead && armed(e) && dist <= BERSERK_FROM && inLine(e, player, w.nav.large, 2)) {
    e.move = ROAR;
    setPhase(e, 'windup');
    w.events.push('berserkerRoar', index, e.pos.x, e.pos.y + 2.2, e.pos.z);
    return;
  }
  brawl(e, index, player, w, dt, CHOP, armed(e));
}

/** A spin starts: drifting at you (its way in `aim`), its hits timed by `near`. */
function startSpin(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const d = Math.max(1e-3, Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z));
  e.aim.set((player.pos.x - e.pos.x) / d, 0, (player.pos.z - e.pos.z) / d);
  e.near = 0;
  e.move = 0;
  setPhase(e, 'charge');
  w.events.push('berserkerSpin', index, e.pos.x, e.pos.y + 1.2, e.pos.z);
}

function spin(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_NORSE_B.v;
  // His drift turns after you, and carries him (Update 0.3.27 — on ice as on stone: no more skid).
  const want = Math.atan2(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const now = turn(Math.atan2(e.aim.x, e.aim.z), want, DRIFT_TURN * dt);
  e.aim.set(Math.sin(now), 0, Math.cos(now));
  walk(e, e.aim.x, e.aim.z, v.spinSpeed * dt, w.nav.large);
  e.facing += SPIN_TURN * dt;
  e.near = Math.max(0, e.near - dt);
  const reach = v.spinReach + ENEMY_STATS.berserker().radius;
  const d = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.near <= 0 && !player.dead && d <= reach && Math.abs(player.pos.y - e.pos.y) < 2) {
    e.near = HIT_EVERY;
    w.events.push('berserkerSpinHit', index, player.pos.x, player.pos.y + 1, player.pos.z);
    if (meleeHit(player, w, e, index, v.spinDamage)) {
      const k = Math.max(d, 1e-3);
      player.vel.x += ((player.pos.x - e.pos.x) / k) * THROW;
      player.vel.z += ((player.pos.z - e.pos.z) / k) * THROW;
      player.vel.y = Math.max(player.vel.y, 3);
      player.grounded = false;
    }
  }
  if (e.t < v.spinFor) return;
  if (--e.shots > 0) return startSpin(e, index, player, w);
  setPhase(e, 'stun');
  w.events.push('berserkerDizzy', index, e.pos.x, e.pos.y + 2.4, e.pos.z);
}
