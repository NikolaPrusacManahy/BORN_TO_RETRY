// Update 0.0.12 — your ground slam's blast (the designer: F from a real height, an impact that can hurt several enemies
// at once). Everything near where you land, roughly level with you and not behind a wall, takes a hit: full damage
// near the centre, half at the edge, thrown outwards. The further you fell past the slam height, the harder and wider.
// Update 0.2.15 — Crater (a Fate Card since Update 0.2.16) widens it faster with height, to twice as wide; it reports
// its kills (Pogo); Cold Snap (a Fate Card) freezes what it hits.
import { Vector3 } from 'three';
import { FEEDBACK } from '../../tuning/combat';
import { SLAM } from '../../tuning/movement';
import { CARDS } from '../../tuning/cards';
import { holds } from '../cards/cards';
import { chill } from '../cards/cardMoves';
import { wallBetween } from '../../world/navGrid';
import { isLive, radiusOf } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import type { CombatState } from './state';
import { emptyTargetHit, landHit, TargetHit, TargetKind } from './strike';
import { TARGET_SHAPES } from './targets';

/** Targets this far above or below your feet are out of the blast (m). */
const LEVEL = 1;

const hit = emptyTargetHit();
const dummyAt = new Vector3();

/** The blast of a slam that fell `drop` metres: its centre damage and its radius. */
export const slamPower = { damage: 0, radius: 0 };
/** Kills the last blast made. */
let kills = 0;

/** `crater`: Crater's growth (×1: none): its radius grows that much faster with height, to that much wider. */
export function powerFor(drop: number, crater = 1) {
  const s = SLAM.v;
  const extra = Math.max(0, drop - s.minHeight);
  slamPower.damage = Math.min(s.maxDamage, s.damage + s.damagePerMetre * extra);
  slamPower.radius = Math.min(s.maxRadius * crater, s.radius + s.radiusPerMetre * crater * extra);
  return slamPower;
}

/** Returns how many it killed. */
export function slamImpact(state: CombatState, at: Vector3, drop: number): number {
  const { damage, radius } = powerFor(drop, holds(state, 'crater') ? CARDS.v.craterGrowth : 1);
  kills = 0;
  state.events.push('slamImpact', radius, at.x, at.y, at.z);
  let any = false;
  for (let i = 0; i < state.dummies.length; i++) {
    const d = state.dummies[i];
    if (d.broken) continue;
    dummyAt.set(d.home.x + d.offset.x, d.home.y, d.home.z + d.offset.z);
    any = blast(state, at, 'dummy', i, dummyAt, TARGET_SHAPES.dummy.radius, TARGET_SHAPES.dummy.height, damage, radius) || any;
  }
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (isLive(e)) any = blast(state, at, 'enemy', i, e.pos, radiusOf(e), ENEMY_STATS[e.kind]().height, damage, radius) || any;
  }
  if (any) state.hitStop.request(FEEDBACK.v.stopHeavy);
  return kills;
}

/** One target in the blast (feet at `pos`): hit, half as hard at the edge. Returns true if it was in reach. */
function blast(state: CombatState, at: Vector3, kind: TargetKind, index: number, pos: Vector3, r: number, height: number, damage: number, radius: number): boolean {
  const dx = pos.x - at.x;
  const dz = pos.z - at.z;
  const dist = Math.hypot(dx, dz);
  if (dist > radius + r || Math.abs(pos.y - at.y) > LEVEL || wallBetween(state.nav.small, at.x, at.z, pos.x, pos.z)) return false;
  const k = Math.min(1, dist / radius);
  const hurt = Math.round(damage * (1 - 0.5 * k));
  const len = Math.max(dist, 1e-3);
  hit.kind = kind;
  hit.index = index;
  hit.s = 0;
  hit.point.set(pos.x, pos.y + height * 0.5, pos.z);
  if (landHit(state, hit as TargetHit, hurt, SLAM.v.knock, dist > 1e-3 ? dx / len : 0, dist > 1e-3 ? dz / len : -1, 'hitSlam', hurt) && kind === 'enemy') kills++;
  else if (kind === 'enemy') chill(state, index);
  return true;
}
