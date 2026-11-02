// Update 0.3.15 — floor 6's Shanty Man (the Pirate Kit's Henry and his lute). He hangs back playing: a note every
// Shanty beat, and the crew within Shanty song reach of him are quickened for two beats (they move and strike Shanty
// quickening times as fast: update.ts). Nearer than Shanty keeps off he backs away from you (round walls); cornered,
// close up, his lute swings at you (brawler.ts). Kill him first. A hit flinches him (and stops a note). Pure.
import { FOES_COVE } from '../../tuning/foesCove';
import { freeAt } from '../../world/navGrid';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { Enemy, EnemyWorld, isLive, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';

const LUTE: Brawl = {
  reach: () => 2.2,
  windup: () => 0.5,
  damage: () => FOES_COVE.v.shantyDamage,
  turn: 8,
  windupTurn: 4,
  arc: 90,
  recover: 0.6,
  shove: 7,
  windupEvent: 'shantyStrike',
  strikeEvent: 'shantyStrike',
};
/** Cornered: this close (m). Backing off he tries straight away, then a little and further to either side (rad), and
 *  looks this far ahead for a wall or the sea (m). */
const CLOSE = 2.4;
const ASIDE = [0, 0.7, -0.7, 1.4, -1.4];
const LOOK = 1.2;

export function updateShanty(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_COVE.v;
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  // His song (not while he flinches or swings).
  if (e.phase === 'chase') {
    e.near += dt;
    if (e.near >= v.shantyBeat) {
      e.near = 0;
      w.events.push('shantyNote', index, e.pos.x, e.pos.y + ENEMY_STATS.shanty().height + 0.3, e.pos.z);
      for (const o of w.enemies) {
        if (o === e || !isLive(o) || o.kind === 'shanty' || ENEMY_STATS[o.kind]().boss) continue;
        if (Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z) <= v.shantyReach) o.hype = 2 * v.shantyBeat;
      }
    }
  }
  if (e.phase !== 'chase' || player.dead || dist > v.shantyAway) {
    if (e.phase === 'chase') e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 4 * dt);
    else brawl(e, index, player, w, dt, LUTE, true);
    return;
  }
  // Too near: away from you, round walls and the sea (the designer: enemies "run on the same spot"); with nowhere to
  // go he stands his ground, and cornered, the lute.
  const away = Math.atan2(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
  for (const a of ASIDE) {
    const dx = Math.sin(away + a);
    const dz = Math.cos(away + a);
    if (!freeAt(w.nav.small, e.pos.x + dx * LOOK, e.pos.z + dz * LOOK)) continue;
    walk(e, dx, dz, ENEMY_STATS.shanty().speed * dt, w.nav.small);
    e.facing = turn(e.facing, Math.atan2(-dx, -dz), 8 * dt);
    return;
  }
  e.facing = turn(e.facing, yawTo(e, player.pos.x, player.pos.z), 8 * dt);
  if (dist < CLOSE) brawl(e, index, player, w, dt, LUTE, true);
}
