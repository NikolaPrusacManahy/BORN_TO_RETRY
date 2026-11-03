// Update 0.3.34 — floor 8's boss, Yokai : Okami (MD/FLOOR8_SHRINE_PLAN.md; the designer: "Call it "Yokai : Okami" and yes
// build it"). Its claws: it stalks you, turning to you, and in reach swipes both claws (two blows) or lunges in with
// its bite (Update 0.3.35: in place of a boxer's combo), each blow landing where its clip's claws or jaws do, throwing
// you back. Its show (sim/dungeon/okamiShow.ts) has it
// till the fight starts ('intro': placed by the show). Pure.
// Update 0.3.35 (the designer: "Now make his moves") — every pause it picks a move by where you are (never one three
// times running): up close its claws or its roar of fire; further off its four leaps, its blue fireball, its fire dash
// (okamiMoves.ts); and, its health low enough (then every so often), its devastation (okamiDevastation.ts).
import { OKAMI } from '../../tuning/okami';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { devastation, devastationDue, startDevastation } from './okamiDevastation';
import { breath, dash, fireball, leaps, startBreath, startDash, startFireball, startLeaps } from './okamiMoves';
import { BREATH, CLAW, CLIPS, COMBO, DASH, DEVASTATE, FIREBALL, HURL, LEAPS } from './okamiShared';
import { offAngle } from './tideShared';
import { Vector3 } from 'three';

/** Its blows reach this far either side of where it faces (rad), up to this far above its feet (m); they throw you
 *  this hard back and up (m/s); after a strike it stands a moment (s). */
const ARC = 1.2;
const OVER = 3;
const THROWN: readonly [number, number] = [9, 5];
const AFTER = 0.35;
/** Each move's weight, and the distances it's picked from (m; its claws: in reach). */
const PICKS: readonly { move: number; weight: number; from: number; to: number }[] = [
  { move: CLAW, weight: 2, from: 0, to: 0 },
  { move: COMBO, weight: 1.4, from: 0, to: 0 },
  { move: BREATH, weight: 1.5, from: 0, to: 15 },
  { move: LEAPS, weight: 1.5, from: 9, to: 200 },
  { move: FIREBALL, weight: 1.5, from: 8, to: 200 },
  { move: DASH, weight: 1.3, from: 10, to: 60 },
];

const way = new Vector3();
/** Its last two moves (never one three times running). */
const recent = new WeakMap<Enemy, number[]>();

/** A strike's whole time (s): its clip's. */
export const okamiWindup = (move: number) => CLIPS[move]?.len ?? 0.6;

/** A move done: back to stalking you, a pause before the next. */
function done(e: Enemy) {
  e.move = 0;
  e.cooldown = OKAMI.v.okamiPause;
  setPhase(e, 'chase');
}

export function updateOkami(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = OKAMI.v;
  if (e.phase === 'intro') return;
  const due = devastationDue(e, e.hp / ENEMY_STATS.okami().hp, dt);
  switch (e.move) {
    case LEAPS:
      return leaps(e, index, player, w, dt, done);
    case FIREBALL:
      return fireball(e, index, player, w, dt, done);
    case DASH:
      return dash(e, index, player, w, dt, done);
    case BREATH:
      return breath(e, index, player, w, dt, done);
    case DEVASTATE:
    case HURL:
      return devastation(e, index, player, w, dt, done);
    default:
      break;
  }
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  const reach = v.clawReach + radiusOf(e);
  switch (e.phase) {
    case 'windup': {
      const dur = okamiWindup(e.move);
      const lands = CLIPS[e.move]?.lands ?? [];
      // (Turning to you till its first blow, little after.)
      e.facing = turn(e.facing, toward, (e.shots === 0 ? v.okamiTurn : v.okamiTurn * 0.25) * dt);
      while (e.shots < lands.length && e.t >= lands[e.shots] * dur) {
        e.shots++;
        const hit = !player.dead && dist <= reach && offAngle(e, player.pos.x, player.pos.z) <= ARC && player.pos.y - e.pos.y < OVER;
        w.events.push('okamiClaw', index, e.pos.x - Math.sin(e.facing) * 2, e.pos.y + 2.4, e.pos.z - Math.cos(e.facing) * 2);
        if (hit && damagePlayer(player, e.move === COMBO ? v.biteDamage : v.clawDamage, 'okami')) throwYou(player, e, player.pos.x - e.pos.x, player.pos.z - e.pos.z, dist, THROWN[0], THROWN[1]);
      }
      if (e.t >= dur) {
        e.cooldown = v.clawRest;
        setPhase(e, 'recover');
      }
      return;
    }
    case 'recover':
      if (e.t >= AFTER) {
        e.move = 0;
        setPhase(e, 'chase');
      }
      return;
    case 'chase':
      break;
    default:
      if (e.t >= 0.4) setPhase(e, 'chase');
      return;
  }
  if (player.dead) return;
  e.facing = turn(e.facing, toward, v.okamiTurn * dt);
  if (e.cooldown <= 0) {
    const move = due ? DEVASTATE : pick(e, dist, reach, w.rng());
    if (move) return start(e, index, move, player, w);
  }
  if (dist <= reach * 0.7) return;
  // In at you, round what's in the way.
  const how = chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
  if (how === 'none') return;
  if (how !== 'straight') e.facing = turn(e.facing, Math.atan2(-way.x, -way.z), v.okamiTurn * dt);
  walk(e, way.x, way.z, v.okamiSpeed * dt, w.nav.large);
}

/** One of its moves from where you are, by weight (0: none from here: it comes closer). */
function pick(e: Enemy, dist: number, reach: number, r: number): number {
  const last = recent.get(e) ?? [];
  const twice = last.length === 2 && last[0] === last[1] ? last[0] : 0;
  const can = PICKS.filter((p) => p.move !== twice && (p.to === 0 ? dist <= reach : dist >= p.from && dist <= p.to));
  const total = can.reduce((a, p) => a + p.weight, 0);
  let x = r * total;
  for (const p of can) {
    x -= p.weight;
    if (x <= 0) return p.move;
  }
  return can.length ? can[can.length - 1].move : 0;
}

function start(e: Enemy, index: number, move: number, player: PlayerState, w: EnemyWorld) {
  const last = recent.get(e) ?? [];
  recent.set(e, [last[last.length - 1] ?? 0, move]);
  if (move === DEVASTATE) return startDevastation(e, index, w);
  if (move === LEAPS) return startLeaps(e);
  if (move === FIREBALL) return startFireball(e, index, w);
  if (move === DASH) return startDash(e, index, player, w);
  if (move === BREATH) return startBreath(e);
  e.move = move;
  e.shots = 0;
  setPhase(e, 'windup');
  w.events.push('okamiGrowl', index, e.pos.x, e.pos.y + 4, e.pos.z);
}
