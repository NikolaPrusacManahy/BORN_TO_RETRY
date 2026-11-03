// Update 0.3.22 — floor 7's Haugbui, the barrow-dweller, a mini boss (the More-enemies pack's zombie, huge and
// frost-dark; MD/FLOOR7_WARBAND_PLAN.md). Slow. With his turn: near you, he raises a foot (Stomp warning: a ring shows
// its reach) and stomps: on the ground within Stomp reach you're hurt and thrown back (jump it), and the floor round him
// freezes (a patch of rime Stomp ice across: combat/frost.ts). Further off, in sight, he tears a block of ice out of the
// floor (Hurl wind-up) and hurls it where you're going (he leads you: combat/bombs.ts 'iceBlock'): it shatters (Hurl
// burst) and leaves rime. Otherwise, up close, his fist (brawler.ts). Only a hard hit staggers him. Pure.
import { Vector3 } from 'three';
import { FOES_NORSE } from '../../tuning/foesNorse';
import { FOES_NORSE_B } from '../../tuning/foesNorseB';
import { freeAt } from '../../world/navGrid';
import { dropBomb } from '../combat/bombs';
import { addRime } from '../combat/frost';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { Enemy, EnemyWorld, inLine, setPhase, turn, yawTo } from './enemy';
import { armed } from './tokens';

const BLOW: Brawl = {
  reach: () => FOES_NORSE_B.v.haugbuiReach,
  windup: () => FOES_NORSE_B.v.haugbuiWindup,
  damage: () => FOES_NORSE_B.v.haugbuiDamage,
  turn: 5,
  windupTurn: 2.5,
  arc: 80,
  recover: 0.8,
  shove: 11,
  windupEvent: 'haugbuiWindup',
  strikeEvent: 'haugbuiBlow',
};
/** His moves (`move`): a foot raised, a block of ice torn up. */
export const STOMP = 1;
export const HURL = 2;
/** He stomps from this share of its reach in; hurls from this far (m) to his range; the block leaves his hands this
 *  high (m); he leads you this share of where your run takes you while it flies, no further than this (m); a stomp
 *  throws you up this fast (m/s), and catches you on the ground only (this high at most, m). */
const STOMP_FROM = 0.8;
const HURL_FROM = 5;
const HURL_TO = 18;
const HANDS = 2.8;
const LEAD = 0.6;
const LEAD_MAX = 4;
const UP = 7;
const ON_GROUND = 0.5;

const from = new Vector3();
const to = new Vector3();

export function updateHaugbui(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_NORSE_B.v;
  e.blink = Math.max(0, e.blink - dt);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  if (e.phase === 'flinch') e.move = 0;
  if (e.phase === 'windup' && e.move === STOMP) {
    if (e.t >= v.stompWindup) stomp(e, player, w);
    return;
  }
  if (e.phase === 'windup' && e.move === HURL) {
    e.facing = turn(e.facing, toward, 4 * dt);
    if (e.t >= v.hurlWindup) hurl(e, index, player, w);
    return;
  }
  if (e.phase === 'chase' && !player.dead && armed(e)) {
    if (e.cooldown <= 0 && dist <= v.stompReach * STOMP_FROM) {
      e.move = STOMP;
      setPhase(e, 'windup');
      w.events.push('haugbuiLift', index, e.pos.x, e.pos.y + 0.3, e.pos.z);
      return;
    }
    if (e.blink <= 0 && dist >= HURL_FROM && dist <= HURL_TO && inLine(e, player, w.nav.large, 3)) {
      e.move = HURL;
      setPhase(e, 'windup');
      w.events.push('haugbuiTear', index, e.pos.x, e.pos.y + 0.3, e.pos.z);
      return;
    }
  }
  brawl(e, index, player, w, dt, BLOW, armed(e));
}

/** Down comes his foot: you thrown back (on the ground, in reach), the floor round him iced. */
function stomp(e: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = FOES_NORSE_B.v;
  w.events.push('haugbuiStomp', v.stompReach, e.pos.x, e.pos.y + 0.05, e.pos.z);
  if (w.ground) addRime(w.ground.frost, e.pos.x, e.pos.z, v.stompIce, FOES_NORSE.v.rimeLast);
  e.move = 0;
  e.cooldown = v.stompEvery;
  setPhase(e, 'recover');
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (player.dead || d > v.stompReach || player.pos.y - e.pos.y > ON_GROUND || !damagePlayer(player, v.stompDamage, 'haugbui')) return;
  const k = Math.max(d, 1e-3);
  player.vel.x += (dx / k) * v.stompShove;
  player.vel.z += (dz / k) * v.stompShove;
  player.vel.y = Math.max(player.vel.y, UP);
  player.grounded = false;
}

/** The block lobbed where you're going (not past a wall). */
function hurl(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = FOES_NORSE_B.v;
  from.set(e.pos.x - Math.sin(e.facing) * 0.6, e.pos.y + HANDS, e.pos.z - Math.cos(e.facing) * 0.6);
  let lx = player.vel.x * v.hurlFlight * LEAD;
  let lz = player.vel.z * v.hurlFlight * LEAD;
  const l = Math.hypot(lx, lz);
  if (l > LEAD_MAX) {
    lx *= LEAD_MAX / l;
    lz *= LEAD_MAX / l;
  }
  to.set(player.pos.x + lx, 0, player.pos.z + lz);
  if (!freeAt(w.nav.small, to.x, to.z)) to.set(player.pos.x, 0, player.pos.z);
  if (dropBomb(w.bombs, from, to, v.hurlFlight, v.hurlReach, v.hurlDamage, 8, 'haugbui', 'iceBlock')) w.events.push('haugbuiHurl', index, from.x, from.y, from.z);
  e.move = 0;
  e.blink = v.hurlEvery;
  setPhase(e, 'recover');
}
