// Update 0.3.22 — floor 7's Raider (the More-enemies pack's Viking, his small axe; MD/FLOOR7_WARBAND_PLAN.md). From Slide
// from to Slide to off, with his turn and a clear line, he crouches (Slide crouch: his boots scrape) and kicks off,
// sliding straight at where you stood, axe first (Slide speed), once into you (Slide hit: it can be parried). On stone
// he stops Slide past on stone past where you stood; on ice, or the Völva's rime, he carries on Slide past on ice: he
// can't stop or turn, so step aside and he goes by. Into a wall fast, he's dazed (Slide dazed: hits flinch him out of nothing, he just stands).
// Up close, his chop (brawler.ts). A hit flinches him out of a crouch. Pure.
import { FOES_NORSE } from '../../tuning/foesNorse';
import { onRime } from '../combat/frost';
import { meleeHit } from '../combat/meleeParry';
import { onIce } from '../dungeon/quicksand';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const CHOP: Brawl = {
  reach: () => FOES_NORSE.v.raiderReach,
  windup: () => FOES_NORSE.v.raiderWindup,
  damage: () => FOES_NORSE.v.raiderDamage,
  turn: 9,
  windupTurn: 4,
  arc: 80,
  recover: 0.6,
  shove: 8,
  windupEvent: 'raiderWindup',
  strikeEvent: 'raiderChop',
};
/** His move (`move`) crouched for a slide. */
export const SLIDE = 1;
/** Sliding this fast still (m/s), a wall stops him dazed; slower than this he's stopped. */
const DAZING = 5;
const STOPPED = 0.6;
/** His slide catches you this far past his body (m); it throws you along it this hard (m/s). */
const CATCH = 0.8;
const THROW = 10;

export function updateRaider(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_NORSE.v;
  if (e.phase === 'flinch') e.move = 0;
  if (e.phase === 'windup' && e.move === SLIDE) {
    e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 8 * dt);
    if (e.t < v.slideCrouch) return;
    // Off: straight at where you stand (his way in `aim`, his speed in `near`).
    const d = Math.max(1e-3, Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z));
    e.aim.set((player.pos.x - e.pos.x) / d, 0, (player.pos.z - e.pos.z) / d);
    e.facing = yawTo(e, player.pos.x, player.pos.z);
    e.near = v.slideSpeed;
    // (How far it was to you: he stops past there.)
    e.shots = d;
    e.struck = false;
    setPhase(e, 'charge');
    w.events.push('raiderSlide', index, e.pos.x, e.pos.y + 0.3, e.pos.z);
    return;
  }
  if (e.phase === 'charge') return slide(e, index, player, w, dt);
  if (e.phase === 'stun') {
    if (e.t >= v.slideDazed) setPhase(e, 'chase');
    return;
  }
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.phase === 'chase' && e.cooldown <= 0 && !player.dead && armed(e) && dist >= v.slideFrom && dist <= v.slideTo && inLine(e, player, w.nav.small, 1.5)) {
    e.move = SLIDE;
    setPhase(e, 'windup');
    w.events.push('raiderCrouch', index, e.pos.x, e.pos.y + 0.2, e.pos.z);
    return;
  }
  brawl(e, index, player, w, dt, CHOP, armed(e));
}

/** Sliding: on along his way, slowing as the ground lets him; once into you; a wall stops him. */
function slide(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_NORSE.v;
  const slick = onIce(e.pos.x, e.pos.y, e.pos.z, w.ground?.ice) || onRime(w.ground?.frost, e.pos.x, e.pos.y, e.pos.z);
  // (It slows so a slide from Slide speed carries past where you stood as far as this ground lets it.)
  const brake = (v.slideSpeed * v.slideSpeed) / (2 * (e.shots + (slick ? v.slideIce : v.slideStone)));
  const step = e.near * dt;
  const x = e.pos.x;
  const z = e.pos.z;
  walk(e, e.aim.x, e.aim.z, step, w.nav.small);
  const moved = Math.hypot(e.pos.x - x, e.pos.z - z);
  if (!e.struck && !player.dead && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) <= ENEMY_STATS.raider().radius + CATCH && Math.abs(player.pos.y - e.pos.y) < 1.8) {
    e.struck = true;
    w.events.push('raiderSlideHit', index, e.pos.x, e.pos.y + 1, e.pos.z);
    if (meleeHit(player, w, e, index, v.slideDamage)) {
      player.vel.x += e.aim.x * THROW;
      player.vel.z += e.aim.z * THROW;
      player.vel.y = Math.max(player.vel.y, 3);
      player.grounded = false;
    }
  }
  if (e.near > DAZING && moved < step * 0.5) {
    e.move = 0;
    e.cooldown = v.slideEvery;
    setPhase(e, 'stun');
    w.events.push('raiderDazed', index, e.pos.x, e.pos.y + 1.6, e.pos.z);
    return;
  }
  e.near = Math.max(0, e.near - brake * dt);
  if (e.near <= STOPPED) {
    e.move = 0;
    e.cooldown = v.slideEvery;
    setPhase(e, 'recover');
  }
}
