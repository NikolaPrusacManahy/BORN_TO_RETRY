// Update 0.3.58 — the Drowned King's parry lessons (the Boss Design Bible, "Master the parry": "the little heads are basically parry
// practice that bites"; spec MD_UPDATES/U0358_DROWNED_KING_BIBLE.md).
// Its Jaw Launch: the little heads on its body snap their jaws twice, then fly at you one by one, homing slowly. Parried, a head goes
// back into it for big damage (combat/parry.ts). Shot or punched it just pops (combat/strike.ts). Marked (Blood Frenzy), they're faster.
// Its Frenzy Combo: its shoulders hunch, then three claws, the third late to catch whoever dodges early. Parried (bare hands), the
// third leaves it open three seconds. The first two can't be parried. Pure.
import { Vector3 } from 'three';
import { DROWNED } from '../../tuning/drowned';
import { fireOrb } from '../combat/orbs';
import { parryBossBlow } from '../combat/meleeParry';
import { BODY } from '../player/body';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { throwYou } from './dinoMoves';
import { paceOf, FRENZY } from './drownedKingMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, walk, yawTo } from './enemy';

/** A head leaves its shoulders this far out and up (shares of its height), this far ahead of its body's middle (m). */
const FROM_SIDE = 0.2;
const FROM_UP = 0.48;
const FROM_AHEAD = 1;
/** Its heads after its risen combo. */
const CHAIN = 2;
/** Its claws' arc in front (rad); higher over it than this (m), they miss you. Each steps it this far at you (m). */
export const CLAW_ARC = 1.15;
const OVER = 4;
const STEP = 1.1;
/** A claw's throw (along, then up: m/s). */
const CLAW_THROW = [7, 4] as const;

const from = new Vector3();
const dir = new Vector3();

/** How many it launches in a volley. */
export const volleyOf = (k: Enemy) => Math.round(k.stage > 0 ? DROWNED.v.volleyRisen : DROWNED.v.volley);

/** Its next head leaves it, from one shoulder or the other. */
export function launchHead(k: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = DROWNED.v;
  const b = k.drowned!;
  const h = v.kingHeight;
  const side = k.shots % 2 === 0 ? 1 : -1;
  const fx = -Math.sin(k.facing);
  const fz = -Math.cos(k.facing);
  from.set(k.pos.x + fx * FROM_AHEAD - fz * side * FROM_SIDE * h, k.pos.y + FROM_UP * h, k.pos.z + fz * FROM_AHEAD + fx * side * FROM_SIDE * h);
  dir.set(player.pos.x - from.x, player.pos.y + BODY.height * 0.6 - from.y, player.pos.z - from.z).normalize();
  const fast = b.mark > 0 ? v.markFaster : 1;
  fireOrb(w.orbs, from, dir, v.headSpeed * fast, v.headDamage, k.kind, 'head', v.headHome * fast);
  b.heads = Math.max(0, b.heads - 1);
  k.shots++;
  w.events.push('drownedHead', index, from.x, from.y, from.z);
}

/** One tick of its volley. True once the last has gone. */
export function stepVolley(k: Enemy, index: number, player: PlayerState, w: EnemyWorld): boolean {
  const n = volleyOf(k);
  const gap = DROWNED.v.headGap / paceOf(k);
  while (k.shots < n && k.t >= k.shots * gap) launchHead(k, index, player, w);
  return k.shots >= n;
}

/** Any of its heads still in the air (one on its way back too). */
export const headsOut = (w: EnemyWorld) => w.orbs.some((o) => o.alive && o.look === 'head');

/** How long after its combo starts each claw comes (s). */
export function clawAt(k: Enemy, n: number): number {
  const v = DROWNED.v;
  const p = paceOf(k);
  return n === 0 ? 0 : n === 1 ? v.clawGap / p : (v.clawGap + v.clawLate) / p;
}

/** One claw: it steps at you and sweeps its arc. Its third, met by your parry (your window open), is parried: true. */
function claw(k: Enemy, index: number, n: number, player: PlayerState, w: EnemyWorld): boolean {
  const v = DROWNED.v;
  const r = radiusOf(k);
  k.facing = yawTo(k, player.pos.x, player.pos.z);
  const dx = player.pos.x - k.pos.x;
  const dz = player.pos.z - k.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > r + 1) walk(k, dx / dist, dz / dist, Math.min(STEP, dist - r - 1), w.nav.large);
  const reach = Math.hypot(player.pos.x - k.pos.x, player.pos.z - k.pos.z);
  w.events.push('drownedClaw', n, k.pos.x + (dx / Math.max(dist, 0.1)) * r, k.pos.y + v.kingHeight * 0.35, k.pos.z + (dz / Math.max(dist, 0.1)) * r);
  if (player.dead || reach > r + v.clawReach || player.pos.y - k.pos.y > OVER) return false;
  if (n === 2 && parryBossBlow(player, w, k, index)) return true;
  if (damagePlayer(player, v.clawDamage, k.kind)) throwYou(player, k, dx, dz, dist, CLAW_THROW[0], CLAW_THROW[1]);
  return false;
}

/** One tick of its combo: 'on', 'done', or its third claw 'parried'. */
export function stepFrenzy(k: Enemy, index: number, player: PlayerState, w: EnemyWorld): 'on' | 'done' | 'parried' {
  while (k.shots < 3 && k.t >= clawAt(k, k.shots)) {
    const n = k.shots++;
    if (claw(k, index, n, player, w)) {
      if (k.hp <= 0) return 'parried';
      k.move = FRENZY;
      setPhase(k, 'stun');
      w.events.push('drownedClawParried', index, k.pos.x, k.pos.y + DROWNED.v.kingHeight * 0.5, k.pos.z);
      return 'parried';
    }
  }
  if (k.shots < 3 || k.t < clawAt(k, 2) + 0.15) return 'on';
  // (Risen, a parting shot: it chains into its heads.)
  if (k.stage > 0) {
    k.shots = 0;
    for (let i = 0; i < CHAIN; i++) launchHead(k, index, player, w);
  }
  return 'done';
}
