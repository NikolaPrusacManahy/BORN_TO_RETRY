// Update 0.3.15 — floor 6's Bomber (the Pirate Kit's Sharky, his cleaver). He keeps off at a throw's length, winds up
// (Bomber wind-up) and lobs a lit powder bomb where you're going (Bomb flight; he leads you: run straight and it meets
// you, turn and it misses; never into a wall or the sea): it lands and burns its fuse (Bomb fuse:
// a spark, its blast's ring filling), then blows (Bomb blast: you, enemies, kegs: combat/bombs.ts, dungeon/powder.ts).
// Punch a bomb and it flies back at him. Too close, his cleaver (brawler.ts); too far, he comes nearer. His throw waits
// its turn (tokens.ts: a spitter's). A hit flinches him and drops his throw. Pure.
import { Vector3 } from 'three';
import { FOES_COVE } from '../../tuning/foesCove';
import { freeAt } from '../../world/navGrid';
import { dropBomb } from '../combat/bombs';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, inLine, setPhase, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const CLEAVER: Brawl = {
  reach: () => 2.2,
  windup: () => 0.55,
  damage: () => FOES_COVE.v.bomberDamage,
  turn: 8,
  windupTurn: 4,
  arc: 80,
  recover: 0.6,
  shove: 8,
  windupEvent: 'bomberStrike',
  strikeEvent: 'bomberStrike',
};
/** His throw: from this near (m) to this far; he comes nearer past this; the bomb leaves his hand this high (m). */
const THROW_MIN = 4.5;
const THROW_MAX = 16;
const COME = 12;
const HAND = 1.7;
/** His move (`move`) winding up a throw. */
const THROWING = 1;
/** A bomb's blast throws you this hard (m/s). */
const SHOVE = 9;
/** He leads you this share of where your run takes you while it flies, no further than this (m). */
const LEAD = 0.7;
const LEAD_MAX = 4;

const way = new Vector3();
const from = new Vector3();
const to = new Vector3();

export function updateBomber(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE.v;
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  if (e.phase === 'flinch') e.move = 0;
  if (e.phase === 'windup' && e.move === THROWING) {
    e.facing = turn(e.facing, toward, 5 * dt);
    if (e.t < v.bomberWindup) return;
    from.set(e.pos.x - Math.sin(e.facing) * 0.4, e.pos.y + HAND, e.pos.z - Math.cos(e.facing) * 0.4);
    // He leads you: where your run takes you by the time it lands (some of the way), not past a wall or into the sea.
    let lx = player.vel.x * v.bomberFlight * LEAD;
    let lz = player.vel.z * v.bomberFlight * LEAD;
    const l = Math.hypot(lx, lz);
    if (l > LEAD_MAX) {
      lx *= LEAD_MAX / l;
      lz *= LEAD_MAX / l;
    }
    to.set(player.pos.x + lx, player.pos.y, player.pos.z + lz);
    if (!freeAt(w.nav.small, to.x, to.z)) to.set(player.pos.x, player.pos.y, player.pos.z);
    if (dropBomb(w.bombs, from, to, v.bomberFlight, v.bombReach, v.bombDamage, SHOVE, 'bomber', 'powder', v.bomberFuse)) w.events.push('bomberThrow', index, from.x, from.y, from.z);
    e.move = 0;
    e.cooldown = v.bomberEvery;
    setPhase(e, 'recover');
    return;
  }
  if (e.phase !== 'chase' || player.dead || dist < THROW_MIN) {
    brawl(e, index, player, w, dt, CLEAVER, true);
    return;
  }
  if (e.cooldown <= 0 && dist <= THROW_MAX && inLine(e, player, w.nav.small, 3) && armed(e)) {
    e.move = THROWING;
    setPhase(e, 'windup');
    w.events.push('bomberWindup', index, e.pos.x, e.pos.y + HAND, e.pos.z);
    return;
  }
  e.facing = turn(e.facing, toward, 6 * dt);
  // (Near enough, he stops, if nothing stands between you; otherwise he comes round it.)
  if (dist <= COME && inLine(e, player, w.nav.small, 3)) return;
  const how = chaseDir(w.flow.small, w.nav.small, e.pos, player.pos.x, player.pos.z, way);
  if (how !== 'none') walk(e, way.x, way.z, ENEMY_STATS.bomber().speed * dt, w.nav.small);
}
