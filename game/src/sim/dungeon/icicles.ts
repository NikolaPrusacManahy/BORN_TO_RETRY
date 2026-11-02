// Update 0.3.11 — floor 7's icicles (the plan for floors 7–10: "icicles over some rooms that fall where you stand (a
// shadow warns first)"): they hang along its fight rooms' walls (world/dungeon/frozen.ts). Come under one and it
// shakes (Icicle warning), then falls straight down; where it lands it hurts you, and any enemy, within Icicle reach,
// and shatters. Each falls once. The view draws them hanging, shaking, falling and the shadow growing under them
// (engine/icicleView.ts). Pure.
import { FROZEN_KNOBS } from '../../tuning/frozen';
import type { IcicleSpot } from '../../world/dungeon/frozen';
import { isLive } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import type { CombatState } from '../combat/state';
import { emptyTargetHit, landHit } from '../combat/strike';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';

export interface Icicle {
  spot: IcicleSpot;
  state: 'hang' | 'shake' | 'fall' | 'gone';
  /** Seconds in this state; its tip's height (m). */
  t: number;
  y: number;
}

/** Its fall's gravity (m/s²); above this height you don't set one off (you're over it, on a ledge or in the air). */
const FALL = 30;
const UNDER = 2.5;

const hit = emptyTargetHit();

export const createIcicles = (spots: readonly IcicleSpot[]): Icicle[] => spots.map((spot) => ({ spot, state: 'hang', t: 0, y: FROZEN_KNOBS.v.icicleHeight }));

/** One tick of every icicle. */
export function stepIcicles(icicles: Icicle[], player: PlayerState, combat: CombatState, dt: number) {
  const v = FROZEN_KNOBS.v;
  for (const ic of icicles) {
    const { x, z } = ic.spot;
    if (ic.state === 'gone') continue;
    ic.t += dt;
    if (ic.state === 'hang') {
      if (player.dead || player.pos.y > UNDER || Math.hypot(player.pos.x - x, player.pos.z - z) > v.icicleNear) continue;
      ic.state = 'shake';
      ic.t = 0;
      combat.events.push('icicleShake', 0, x, ic.y, z);
    } else if (ic.state === 'shake') {
      if (ic.t < v.icicleWarn) continue;
      ic.state = 'fall';
      ic.t = 0;
    } else {
      ic.y = v.icicleHeight - 0.5 * FALL * ic.t * ic.t;
      if (ic.y > 0) continue;
      ic.y = 0;
      ic.state = 'gone';
      shatter(x, z, player, combat);
    }
  }
}

/** It lands at (x, z): you and any enemy within reach are hurt. */
function shatter(x: number, z: number, player: PlayerState, combat: CombatState) {
  const v = FROZEN_KNOBS.v;
  combat.events.push('icicleShatter', 0, x, 0, z);
  if (!player.dead && player.pos.y < UNDER && Math.hypot(player.pos.x - x, player.pos.z - z) <= v.icicleReach) damagePlayer(player, v.icicleDamage, 'icicle');
  combat.enemies.forEach((e, i) => {
    if (!isLive(e) || Math.hypot(e.pos.x - x, e.pos.z - z) > v.icicleReach + ENEMY_STATS[e.kind]().radius) return;
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.set(e.pos.x, e.pos.y + ENEMY_STATS[e.kind]().height, e.pos.z);
    landHit(combat, hit, v.icicleDamage, 0, 0, 0, 'hitSlam', v.icicleDamage, true);
  });
}
