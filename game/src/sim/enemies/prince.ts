// Update 0.2.11 — floor 6's percher, the Drowned Prince: a smaller Drowned King on its feet (the designer: "no porting
// floor 5 monster … maybe a smaller version of Drowned king? that can be done"). On a high perch it stands (off one, on
// the floor), facing you, and every so often, seeing you, it rears (Prince wind-up), then by turns: its jet, sweeping
// across you at the height your chest was (swim over or under it), or a row of geysers, each where you are as it's
// called (bursting from what's under you: be off the floor). Pure.
import { Vector3 } from 'three';
import { FOES6 } from '../../tuning/foes6';
import type { CollisionWorld } from '../collisionWorld';
import { dropBomb } from '../combat/bombs';
import { segmentDistance2D } from '../combat/geometry';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, setPhase, turn, yawTo } from './enemy';
import { chest, groundUnder, waterTop } from './fishSwim';
import { seesInAir } from './fly';
import { ENEMY_STATS } from './kinds';

/** Its moves (Enemy.move: the last it made). */
export const JET = 0;
export const GEYSERS = 1;
const TURN = 3;
/** Its jet: this wide (m) and this deep (m, up and down from where your chest was); it shoves you this hard (m/s). */
const JET_WIDE = 1;
const JET_DEEP = 0.9;
const JET_SHOVE = 9;
/** Its geysers: how wide each bursts (m), the floor ringing this long before (s); the first one waits this long (s). */
const GEYSER_RADIUS = 2;
const GEYSER_WARN = 0.7;
const AFTER = 0.6;

const spot = new Vector3();

/** Where its jet points now: from Enemy.aim.x (its start), round by Enemy.aim.z (its way, ±1). */
export const princeJetAngle = (e: Enemy) => e.aim.x + e.aim.z * ((FOES6.v.princeJetArc * Math.PI) / 180) * Math.min(1, e.t / FOES6.v.princeJetTime);

export function updatePrince(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) {
  const v = FOES6.v;
  const s = ENEMY_STATS[e.kind]();
  const toward = yawTo(e, player.pos.x, player.pos.z);
  switch (e.phase) {
    case 'chase':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (player.dead || e.cooldown > 0 || !seesInAir(e, player, world)) break;
      e.move = e.move === JET ? GEYSERS : JET;
      setPhase(e, 'windup');
      w.events.push('princeWindup', index, e.pos.x, e.pos.y + s.height * 0.6, e.pos.z);
      break;
    case 'windup':
      e.facing = turn(e.facing, toward, TURN * dt);
      if (e.t < v.princeWindup) break;
      e.shots = 0;
      e.struck = false;
      if (e.move === JET) {
        // (From one side of you to the other, at the height your chest is now.)
        const way = w.rng() < 0.5 ? 1 : -1;
        e.aim.set(toward - way * ((v.princeJetArc * Math.PI) / 360), chest(player), way);
        setPhase(e, 'breath');
        w.events.push('princeJet', index, e.pos.x, e.pos.y + s.height * 0.6, e.pos.z);
      } else {
        setPhase(e, 'blast');
        w.events.push('princeGeysers', index, e.pos.x, e.pos.y + s.height * 0.6, e.pos.z);
      }
      break;
    case 'breath':
      jet(e, player);
      if (e.t >= v.princeJetTime) rest(e);
      break;
    case 'blast':
      geysers(e, player, w, world);
      break;
    case 'recover':
      if (e.t >= AFTER) setPhase(e, 'chase');
      break;
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    default:
      break;
  }
}

function rest(e: Enemy) {
  e.cooldown = FOES6.v.princeGap;
  setPhase(e, 'recover');
}

/** Its jet this tick: catches you once, near its line at its height. */
function jet(e: Enemy, player: PlayerState) {
  const v = FOES6.v;
  const a = princeJetAngle(e);
  e.facing = a;
  const dx = -Math.sin(a);
  const dz = -Math.cos(a);
  if (!e.struck && !player.dead && Math.abs(chest(player) - e.aim.y) <= JET_DEEP && segmentDistance2D(e.pos.x, e.pos.z, e.pos.x + dx * v.princeJetRange, e.pos.z + dz * v.princeJetRange, player.pos.x, player.pos.z) <= JET_WIDE) {
    e.struck = true;
    if (damagePlayer(player, v.princeJetDamage, e.kind)) throwYou(player, e, dx, dz, 1, JET_SHOVE, 1);
  }
}

/** Its geysers, one by one, each under where you are as it's called. */
function geysers(e: Enemy, player: PlayerState, w: EnemyWorld, world: CollisionWorld) {
  const v = FOES6.v;
  const count = Math.round(v.princeGeysers);
  while (e.shots < count && e.t >= e.shots * v.princeGeyserGap) {
    spot.set(player.pos.x, groundUnder(world, player.pos.x, player.pos.z, waterTop(w)), player.pos.z);
    dropBomb(w.bombs, spot, spot, GEYSER_WARN, GEYSER_RADIUS, v.princeGeyserDamage, 0, e.kind, 'geyser');
    e.shots++;
  }
  if (e.shots >= count && e.t >= count * v.princeGeyserGap + GEYSER_WARN) rest(e);
}
