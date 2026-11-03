// Update 0.3.29 — the Moon's boss, Tidebreaker (the designer: "Alien as Moon boss"; "It's the last boss before the last
// boss, make sure it is intense and full destructions, maybe they can grab a pillar … can shake the whole place"): the
// Bestiary pack's big alien, its anchor in hand, animated with the Universal Animation Library (tools/ual_bake.py). It
// stomps at you; every Tidebreaker pause it picks a move by where you are (seeded; never one three times running) and
// warns. Close: its anchor's smash (a shockwave runs out along the floor: jump it), a combo of swings (raging, a
// finisher that smashes too), its uppercut when you're right in front (it throws you high: the moon lets you float down).
// Further: its moon leap (down where you stood, a ring warning: its landing hurts round it, rings out and shakes rock
// down), the boulder it rips out of the ground and hurls, and a pillar torn out of the floor, swung at you and hurled
// (tideWreck.ts). (Update 0.3.30 — its shell roll gone: the designer: "remove the spinning attack" (its shell roll).)
// Below Tidebreaker rage it roars and rages: quicker, its quakes (rings, one after another, every pillar near snapping,
// rock shaken down all round) and rock falling near you; below its frenzy, quicker still. Its death is the bosses' show.
// Enemy.move: its move; .stage: 0, raging 1, frenzied 2; .shots: the pillar it goes for, its quake's rings; .deeds: the pillar in its hands (+1; 0: none); .blink: till rock comes down
// again (raging); .strafe: the same move picked in a row; .aim: the pillar's place, where it lands. Pure.
import { Vector3 } from 'three';
import { TIDEBREAKER } from '../../tuning/tidebreaker';
import { BOSS } from '../../tuning/boss';
import { startQuake } from '../combat/quakes';
import { breakAround, standingNear } from '../combat/pillars';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { callRocks, fly, hurl, leapAt } from './tideMoves';
import { approach, goForPillar, quake, ripPillar, startQuakeMove } from './tideWreck';
import { COMBO, COMBO_C, COMBO_D, HURL, LEAP, offAngle, OVER, paceOf, PILLAR, QUAKE, RING_SPEED, ROAR, SMASH, SWING, THROW, UPPERCUT, warn, wrecks } from './tideShared';

export { COMBO, COMBO_C, COMBO_D, HURL, LEAP, PILLAR, QUAKE, ROAR, SMASH, SWING, THROW, UPPERCUT } from './tideShared';
/** What it picks from, and how likely each is close, further and far (a pillar, the uppercut and its quakes only when
 *  they can be; Update 0.3.30 — raging, its quake far likelier: the place should come down). **(placeholders)** */
const PICKS = [SMASH, COMBO, UPPERCUT, LEAP, THROW, PILLAR, QUAKE];
const ODDS = { near: [0.32, 0.25, 0.2, 0, 0, 0, 0.25], mid: [0, 0, 0, 0.2, 0.25, 0.25, 0.3], far: [0, 0, 0, 0.4, 0.25, 0.2, 0.15] };
/** Its roar's warning (s); the arc its blows reach either side (rad); it stops walking this far from you (m); thrown by
 *  its blows (m/s along, up). */
const ROAR_WARN = 0.7;
const ARC = 1.05;
const STAND_OFF = 2;
const THROWN = { smash: [14, 7], swing: [11, 5], swingPillar: [19, 9] } as const;
/** After these moves it stands longer (s: its clip plays out). */
const RECOVER: Partial<Record<number, number>> = { [LEAP]: 1.2, [ROAR]: 1.6, [QUAKE]: 0.5 };

const way = new Vector3();

/** The warning before `move` (s). */
export function tideWindup(move: number): number {
  const v = TIDEBREAKER.v;
  const by: Partial<Record<number, number>> = { [SMASH]: v.smashWindup, [COMBO]: v.comboWindup, [COMBO_C]: v.comboNext, [COMBO_D]: v.comboNext * 2, [UPPERCUT]: v.uppercutWindup, [LEAP]: v.leapWindup, [THROW]: v.throwWindup, [HURL]: v.hurlWindup, [PILLAR]: v.pillarWindup, [SWING]: v.swingWindup, [QUAKE]: v.quakeWindup, [ROAR]: ROAR_WARN };
  return by[move] ?? v.smashWindup;
}

/** Its next move for where you are (seeded). */
function pick(d: Enemy, dist: number, player: PlayerState, w: EnemyWorld): number {
  const v = TIDEBREAKER.v;
  const odds = dist <= v.tideNear ? ODDS.near : dist <= v.tideFar ? ODDS.mid : ODDS.far;
  const world = wrecks(w);
  const can = (m: number) => (m === QUAKE ? d.stage >= 1 : m === PILLAR ? !!world && standingNear(world, d.pos.x, d.pos.z, v.pillarReach) >= 0 : m === UPPERCUT ? dist <= v.uppercutReach + radiusOf(d) && offAngle(d, player.pos.x, player.pos.z) < 0.7 : true);
  const weights = PICKS.map((m, i) => (can(m) ? odds[i] : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let move = dist <= v.tideNear ? SMASH : LEAP;
  if (total > 0) {
    for (let tries = 0; tries < 4; tries++) {
      let roll = w.rng() * total;
      move = PICKS[weights.findIndex((p) => (roll -= p) < 0)] ?? move;
      if (move !== d.move || d.strafe < 2) break;
    }
  }
  d.strafe = move === d.move ? d.strafe + 1 : 1;
  return move;
}

export function updateTidebreaker(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = TIDEBREAKER.v;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const toward = yawTo(d, player.pos.x, player.pos.z);
  // Raging, rock comes down near you now and then.
  if (d.stage >= 1 && d.phase !== 'intro' && !player.dead) {
    d.blink -= dt;
    if (d.blink <= 0) {
      d.blink = v.rockEvery / (d.stage >= 2 ? 2 : 1);
      callRocks(w, player.pos.x + player.vel.x * 0.4, player.pos.z + player.vel.z * 0.4, 1, 1.5, 0);
    }
  }
  // Low enough: it roars and rages (frenzied lower still), not mid-move nor with a pillar in its hands.
  const busy = d.phase === 'charge' || d.phase === 'leap' || d.phase === 'intro' || d.deeds > 0;
  const max = ENEMY_STATS.tidebreaker().hp;
  if (!busy && d.stage < 2 && d.hp <= max * (d.stage === 0 ? v.rageAt : v.frenzyAt)) {
    d.stage++;
    warn(d, ROAR, w);
    return;
  }
  switch (d.phase) {
    case 'chase': {
      if (player.dead) break;
      if (d.cooldown <= 0) {
        // (A pillar: off to it first; none to be had, a leap.)
        const move = pick(d, dist, player, w);
        if (move !== PILLAR || !goForPillar(d, w)) warn(d, move === PILLAR ? LEAP : move, w);
        break;
      }
      const how = chaseDir(w.flow.large, w.nav.large, d.pos, player.pos.x, player.pos.z, way);
      d.facing = turn(d.facing, how === 'path' ? Math.atan2(-way.x, -way.z) : toward, v.tideTurn * dt);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(d) + STAND_OFF)) break;
      walk(d, way.x, way.z, v.tideSpeed * paceOf(d) * dt, w.nav.large);
      break;
    }
    case 'windup':
      // (Aiming a leap or a throw it turns slower: a dash aside beats it. Tearing out a pillar, it faces it.)
      d.facing = turn(d.facing, d.move === PILLAR ? pillarYaw(d, w) : toward, v.tideTurn * (d.move === LEAP || d.move === HURL ? 0.6 : 1.4) * dt);
      if (d.t >= tideWindup(d.move) / paceOf(d)) unleash(d, index, player, w, dist);
      break;
    case 'charge':
      if (d.move === PILLAR) approach(d, w, dt);
      else if (d.move === QUAKE) quake(d, w);
      break;
    case 'leap':
      fly(d, player, w);
      break;
    case 'stun':
      // (Stunned by anything: it reels, then it's back at you.)
      if (d.t >= v.stunFor) {
        setPhase(d, 'chase');
        d.cooldown = v.tidePause * 0.4;
      }
      break;
    case 'recover':
      if (d.t >= (RECOVER[d.move] ?? v.tideRecover) / paceOf(d)) {
        setPhase(d, 'chase');
        d.cooldown = v.tidePause / paceOf(d);
      }
      break;
    default:
      break;
  }
}

/** Which way its pillar is from it (tearing it out). */
function pillarYaw(d: Enemy, w: EnemyWorld): number {
  const p = wrecks(w)?.pillars[d.shots];
  return p ? yawTo(d, p.x, p.z) : d.facing;
}

/** Its warning over: the move. */
function unleash(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dist: number) {
  const v = TIDEBREAKER.v;
  switch (d.move) {
    case SMASH:
    case COMBO_D:
      blow(d, index, player, w, dist, v.smashReach, v.smashDamage, THROWN.smash, 'tideSmash');
      smashFloor(d, w, v.smashReach * 0.6, v.smashRing);
      return setPhase(d, 'recover');
    case COMBO:
      blow(d, index, player, w, dist, v.smashReach, v.comboDamage, THROWN.swing, 'tideSwing');
      return warn(d, COMBO_C, w);
    case COMBO_C:
      blow(d, index, player, w, dist, v.smashReach, v.comboDamage, THROWN.swing, 'tideSwing');
      return d.stage >= 1 ? warn(d, COMBO_D, w) : setPhase(d, 'recover');
    case UPPERCUT:
      w.events.push('tideUppercut', index, d.pos.x, d.pos.y + 2, d.pos.z);
      if (!player.dead && dist <= v.uppercutReach + radiusOf(d) && offAngle(d, player.pos.x, player.pos.z) <= ARC && player.pos.y - d.pos.y < OVER && damagePlayer(player, v.uppercutDamage, 'tidebreaker')) throwYou(player, d, player.pos.x - d.pos.x, player.pos.z - d.pos.z, dist, 4, v.uppercutLaunch);
      return setPhase(d, 'recover');
    case LEAP:
      return leapAt(d, index, player, w);
    case THROW:
      // (The boulder ripped out of the ground: up and thrown.)
      w.events.push('tideRip', index, d.pos.x - Math.sin(d.facing) * 2, 0, d.pos.z - Math.cos(d.facing) * 2);
      return warn(d, HURL, w);
    case HURL:
      hurl(d, player, w);
      return setPhase(d, 'recover');
    case PILLAR:
      return ripPillar(d, w);
    case SWING:
      // The pillar swung down at you: it smashes the floor, and any pillar there.
      blow(d, index, player, w, dist, v.swingReach, v.swingDamage, THROWN.swingPillar, 'pillarSwing');
      smashFloor(d, w, v.swingReach * 0.7, v.smashRing);
      return warn(d, HURL, w);
    case QUAKE:
      return startQuakeMove(d, player, w);
    default:
      // (Its roar: rage or frenzy; rock comes down all round.)
      w.events.push('tideRoar', d.stage, d.pos.x, d.pos.y + v.tideHeight * 0.85, d.pos.z);
      callRocks(w, player.pos.x, player.pos.z, 6, 9, 0.3);
      d.blink = v.rockEvery;
      setPhase(d, 'recover');
  }
}

/** A blow in front of it: you, within `reach` and its arc, on the ground or a little over it, hurt and thrown. */
function blow(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dist: number, reach: number, damage: number, thrown: readonly [number, number], event: 'tideSmash' | 'tideSwing' | 'pillarSwing') {
  w.events.push(event, index, d.pos.x - Math.sin(d.facing) * reach * 0.6, 0, d.pos.z - Math.cos(d.facing) * reach * 0.6);
  if (player.dead || dist > reach + radiusOf(d) || offAngle(d, player.pos.x, player.pos.z) > ARC || player.pos.y - d.pos.y > OVER) return;
  if (damagePlayer(player, damage, 'tidebreaker')) throwYou(player, d, player.pos.x - d.pos.x, player.pos.z - d.pos.z, dist, thrown[0], thrown[1]);
}

/** Its blow meets the floor `out` m in front: a shockwave rolls out from there to `ring`, a pillar there snaps. */
function smashFloor(d: Enemy, w: EnemyWorld, out: number, ring: number) {
  const x = d.pos.x - Math.sin(d.facing) * (radiusOf(d) + out);
  const z = d.pos.z - Math.cos(d.facing) * (radiusOf(d) + out);
  startQuake(w.quakes, x, d.pos.y, z, RING_SPEED, ring, TIDEBREAKER.v.ringDamage, BOSS.v.quakeClear, 'tidebreaker');
  const world = wrecks(w);
  if (world) breakAround(world, x, z, 3);
}
