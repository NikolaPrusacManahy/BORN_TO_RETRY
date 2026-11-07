// Update 0.5.5 — floor 10's Pit Fiend (MD/FLOOR10_HELL_PLAN.md: "The Demon, back … its looks and moves come back from git, not rebuilt"): floor
// 1's boss until 0.3.41 (its rules were sim/enemies/demon.ts and demonMoves.ts, at 0.3.40), now a mini boss, smaller (4.5 m), with a mini
// boss's health and no Grunts called. It walks at you; every pause it picks a move by how far you are and warns: it lowers its head and glows
// (the charge: a straight run that throws you aside; into a wall or a column and it's stunned, your blows doing more), crouches (the leap: an
// arc to where you stood; its landing hurts close by and sends a quake ring rolling out: jump it), or raises its trident (a fan of fire orbs:
// punch one back). At half health it roars, then warns quicker, pauses less, moves faster, follows a charge that runs out with a leap, and
// fires two fans. Only a hard hit staggers it. Pure.
import { Vector3 } from 'three';
import { FOES_HELL_B } from '../../tuning/foesHellB';
import { pushOutOfWalls } from '../../world/navGrid';
import { fireOrb } from '../combat/orbs';
import { startQuake } from '../combat/quakes';
import { AIM_HEIGHT } from '../combat/turret';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir, freeSpotNear } from './chase';
import { ChargeSpec, startCharge, stepCharge } from './charge';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { FIEND_CHARGE, FIEND_LEAP, FIEND_ROAR, FIEND_VOLLEY } from './hellShared';
import { armed } from './tokens';

const v = () => FOES_HELL_B.v;
/** It stops walking this close to you (m); winding up a charge it turns this much slower (a dash aside beats it); its moves' odds (charge,
 *  leap, volley) by how far you are. Above its landing by more than this (m) you're clear of the landing's blow; a charge with nothing in
 *  its way stops this long (s); a raging volley's second fan comes this long after the first (s), turned half a gap. **(placeholders)** */
const STAND_OFF = 3.5;
const CHARGE_AIM = 0.6;
const FAR = 13;
const NEAR = 6;
const ODDS_FAR = [0.45, 0.15, 0.4];
const ODDS_MID = [0.3, 0.35, 0.35];
const ODDS_NEAR = [0.15, 0.55, 0.3];
const MOVES = [FIEND_CHARGE, FIEND_LEAP, FIEND_VOLLEY];
const LAND_CLEAR = 1.5;
const RUN_OUT = 0.6;
const SECOND_FAN = 0.3;
const QUAKE_CLEAR = 0.6;

const way = new Vector3();
const from = new Vector3();
const aim = new Vector3();
const dir = new Vector3();
const SPEC: ChargeSpec = { speed: 0, range: 0, damage: 0, shove: 0, height: 0 };

const raging = (d: Enemy) => d.stage > 0;
/** Its walk and charge pace now (faster once it rages). */
const pace = (d: Enemy) => (raging(d) ? v().fiendRageSpeed : 1);
const pauseOf = (d: Enemy) => v().fiendPause * (raging(d) ? v().fiendRagePause : 1);

/** The warning before `move` (s), quicker once it rages. */
export function fiendWindup(move: number, stage = 0): number {
  const base = move === FIEND_CHARGE ? v().fiendChargeWindup : move === FIEND_LEAP ? v().fiendLeapWindup : v().fiendVolleyWindup;
  return base * (stage > 0 ? v().fiendRageWindup : 1);
}

function charge(d: Enemy): ChargeSpec {
  SPEC.speed = v().fiendChargeSpeed * pace(d);
  SPEC.range = v().fiendChargeRange;
  SPEC.damage = v().fiendChargeDamage;
  SPEC.shove = v().fiendChargeShove;
  SPEC.height = v().fiendHeight;
  return SPEC;
}

/** The next move for how far you are (seeded); never the same one three times running (Enemy.strafe counts them). */
function pick(d: Enemy, dist: number, w: EnemyWorld): number {
  const odds = dist > FAR ? ODDS_FAR : dist > NEAR ? ODDS_MID : ODDS_NEAR;
  let roll = w.rng();
  let m = 2;
  for (let k = 0; k < odds.length; k++) {
    roll -= odds[k];
    if (roll < 0) {
      m = k;
      break;
    }
  }
  let move = MOVES[m];
  if (move === d.move && d.strafe >= 2) move = MOVES[(m + 1 + Math.floor(w.rng() * 2)) % 3];
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

function warn(d: Enemy, index: number, move: number, w: EnemyWorld) {
  d.move = move;
  setPhase(d, 'windup');
  w.events.push('fiendWindup', move, d.pos.x, d.pos.y + v().fiendHeight * 0.6, d.pos.z);
  void index;
}

const recoverTime = (move: number) => (move === FIEND_LEAP ? v().fiendLeapRecover : move === FIEND_VOLLEY ? v().fiendVolleyRecover : RUN_OUT);

export function updatePitFiend(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  const turnRate = v().fiendTurn;
  // Half dead: it roars (once), whatever it was about, unless it's in the air or running.
  if (d.stage === 0 && d.hp <= v().fiendHp * v().fiendRageAt && d.phase !== 'leap' && d.phase !== 'charge') {
    d.stage = 1;
    d.move = FIEND_ROAR;
    setPhase(d, 'roar');
    w.events.push('fiendRoar', index, d.pos.x, d.pos.y + v().fiendHeight * 0.7, d.pos.z);
    return;
  }
  switch (d.phase) {
    case 'flinch':
      if (d.t >= 0.4) setPhase(d, 'chase');
      return;
    case 'roar':
    case 'stun':
      if (d.t >= (d.phase === 'roar' ? v().fiendRoar : v().fiendStun)) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d) * 0.5;
      }
      return;
    case 'recover':
      d.facing = turn(d.facing, toward, turnRate * dt);
      if (d.move === FIEND_VOLLEY) secondFan(d, index, player, w);
      if (d.t >= recoverTime(d.move)) {
        setPhase(d, 'chase');
        d.cooldown = pauseOf(d);
      }
      return;
    case 'chase': {
      if (player.dead) return;
      if (d.cooldown <= 0 && armed(d) && Math.abs(player.pos.y - d.pos.y) < 3) return warn(d, index, pick(d, dist, w), w);
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, turnRate * dt);
      if (how === 'none' || (how === 'straight' && dist <= STAND_OFF)) return;
      walk(d, way.x, way.z, v().fiendSpeed * pace(d) * dt, w.nav.large);
      return;
    }
    case 'windup':
      d.facing = turn(d.facing, toward, turnRate * (d.move === FIEND_CHARGE ? CHARGE_AIM : 1) * dt);
      if (d.t < fiendWindup(d.move, d.stage)) return;
      if (d.move === FIEND_CHARGE) startCharge(d, index, w);
      else if (d.move === FIEND_LEAP) {
        if (!startLeap(d, index, player, w)) {
          setPhase(d, 'chase');
          d.cooldown = pauseOf(d) * 0.5;
        }
      } else {
        volley(d, index, player, w, 0);
        d.struck = false;
        setPhase(d, 'recover');
      }
      return;
    case 'charge': {
      const how = stepCharge(d, index, player, w, dt, charge(d));
      // (Raging, a charge that ran out goes straight into a leap.)
      if (how === 'out') {
        if (raging(d) && !player.dead) warn(d, index, FIEND_LEAP, w);
        else setPhase(d, 'recover');
      }
      return;
    }
    case 'leap':
      if (stepLeap(d, index, player, w)) setPhase(d, 'recover');
      return;
    default:
      return;
  }
}

/** Off it leaps, for the free spot nearest where you stand now. False if there's nowhere to land. */
function startLeap(d: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  d.aim.y = 0;
  if (!freeSpotNear(w.nav.large, player.pos.x, player.pos.z, d.aim)) return false;
  d.aim.y = d.pos.y;
  d.from.copy(d.pos);
  d.facing = yawTo(d, d.aim.x, d.aim.z);
  setPhase(d, 'leap');
  w.events.push('fiendLeap', index, d.pos.x, d.pos.y + 1, d.pos.z);
  return true;
}

/** One tick of its leap. True once it has landed: the blow close by, the quake ring rolling out. */
function stepLeap(d: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const k = Math.min(1, d.t / v().fiendLeapAir);
  d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
  d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
  d.pos.y = d.from.y + 4 * v().fiendLeapArc * k * (1 - k);
  if (k < 1) return false;
  d.pos.copy(d.aim);
  pushOutOfWalls(w.nav.large, d.pos, radiusOf(d));
  w.events.push('fiendSlam', v().fiendQuakeReach, d.pos.x, d.pos.y, d.pos.z);
  startQuake(w.quakes, d.pos.x, d.pos.y, d.pos.z, v().fiendQuakeSpeed, v().fiendQuakeReach, v().fiendQuake, QUAKE_CLEAR, d.kind);
  const dx = player.pos.x - d.pos.x;
  const dz = player.pos.z - d.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= v().fiendSlamReach && player.pos.y - d.pos.y <= LAND_CLEAR && damagePlayer(player, v().fiendSlam, d.kind)) {
    const nx = dist > 1e-3 ? dx / dist : -Math.sin(d.facing);
    const nz = dist > 1e-3 ? dz / dist : -Math.cos(d.facing);
    player.vel.x += nx * v().fiendSlamShove;
    player.vel.z += nz * v().fiendSlamShove;
    player.vel.y = Math.max(player.vel.y, 6);
    player.grounded = false;
  }
  void index;
  return true;
}

/** A fan of fire orbs from its trident's tip at your chest; `turn` (in gaps) shifts the fan sideways. */
function volley(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, turn: number) {
  const r = radiusOf(d) * 1.2;
  from.set(d.pos.x - Math.sin(d.facing) * r, d.pos.y + v().fiendHeight * 0.5, d.pos.z - Math.cos(d.facing) * r);
  aim.set(player.pos.x, player.pos.y + AIM_HEIGHT, player.pos.z).sub(from).normalize();
  const n = Math.max(1, Math.round(v().fiendVolleyOrbs));
  const spread = (v().fiendVolleySpread * Math.PI) / 180;
  let fired = false;
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2 + turn) * spread;
    const c = Math.cos(a);
    const s = Math.sin(a);
    dir.set(aim.x * c + aim.z * s, aim.y, -aim.x * s + aim.z * c).normalize();
    fired = fireOrb(w.orbs, from, dir, v().fiendVolleySpeed, v().fiendVolleyDamage, d.kind) || fired;
  }
  if (fired) w.events.push('fiendVolley', index, from.x, from.y, from.z);
}

/** After its volley: raging, its second fan. */
function secondFan(d: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  if (!raging(d) || d.struck || d.t < SECOND_FAN) return;
  d.struck = true;
  volley(d, index, player, w, 0.5);
}
