// M2 — what a sweep hits: the nearest live target (dummy, turret or enemy) along a segment, and applying a hit to it.
// Punches, sword swings and thrown weapons all use these, so every target takes every attack the same way.
// Update 0.0.12 — every enemy kind is a target; only grunts drop a weapon (15%: the designer); every kill drops coins.
import { Vector3 } from 'three';
import { ENEMIES } from '../../tuning/enemies';
import { FEEDBACK } from '../../tuning/combat';
import { enemyAxis, hitEnemy, isLive, radiusOf } from '../enemies/enemy';
import { dropWeapon } from '../weapons/weapons';
import { ENEMY_STATS } from '../enemies/kinds';
import { burstCoins } from './coins';
import { damageFactor } from '../items/items';
import { hitDummy } from './dummy';
import { segmentDistance } from './geometry';
import type { CombatEvent, CombatState } from './state';
import { TARGET_SHAPES, dummyAxis, turretAxis } from './targets';
import { hitTurret } from './turretDamage';

export type TargetKind = 'dummy' | 'turret' | 'enemy';

export interface TargetHit {
  kind: TargetKind;
  index: number;
  /** How far along the segment (0..1), and the point on the target's axis closest to it. */
  s: number;
  point: Vector3;
}

const a = new Vector3();
const b = new Vector3();
const at = new Vector3();
const sOut = { s: 0 };

export function emptyTargetHit(): TargetHit {
  return { kind: 'dummy', index: -1, s: 0, point: new Vector3() };
}

/** The nearest target whose capsule comes within `radius` of the segment `from`→`to`. Writes it to `out`. */
export function nearestTarget(state: CombatState, from: Vector3, to: Vector3, radius: number, out: TargetHit): boolean {
  out.index = -1;
  let nearest = Infinity;
  const consider = (kind: TargetKind, index: number, r: number) => {
    if (segmentDistance(from, to, a, b, at, sOut) > radius + r || sOut.s >= nearest) return;
    nearest = sOut.s;
    out.kind = kind;
    out.index = index;
    out.s = sOut.s;
    out.point.copy(at);
  };
  state.dummies.forEach((d, i) => {
    if (d.broken) return;
    dummyAxis(d, a, b);
    consider('dummy', i, TARGET_SHAPES.dummy.radius);
  });
  state.turrets.forEach((t, i) => {
    if (t.broken) return;
    turretAxis(t, a, b);
    consider('turret', i, TARGET_SHAPES.turret.radius);
  });
  state.enemies.forEach((e, i) => {
    if (!isLive(e)) return;
    enemyAxis(e, a, b);
    consider('enemy', i, radiusOf(e));
  });
  return out.index >= 0;
}

/** Applies a hit pushed along (dirX, dirZ) (length 1). Returns true if it killed or broke the target. */
export function hitTarget(state: CombatState, t: TargetHit, damage: number, knock: number, dirX: number, dirZ: number): boolean {
  switch (t.kind) {
    case 'dummy':
      return hitDummy(state.dummies[t.index], damage, knock, dirX, dirZ);
    case 'turret':
      return hitTurret(state.turrets[t.index], damage);
    case 'enemy':
      return hitEnemy(state.enemies[t.index], damage, knock, dirX, dirZ);
  }
}

/** Lands a hit: applies it, reports it (`event`, with `value`, at the hit point), and on a kill reports that too, asks
 *  for the kill hit-stop, and lets a grunt drop a sword (seeded RNG). Returns true on a kill.
 *  Update 0.0.13 — every hit you land is stronger with each red ring you carry. */
export function landHit(state: CombatState, t: TargetHit, damage: number, knock: number, dirX: number, dirZ: number, event: CombatEvent, value: number): boolean {
  const killed = hitTarget(state, t, damage * damageFactor(state.items), knock, dirX, dirZ);
  const p = t.point;
  state.events.push(event, value, p.x, p.y, p.z);
  if (!killed) return false;
  state.events.push('kill', 0, p.x, p.y, p.z);
  state.hitStop.request(FEEDBACK.v.stopKill);
  if (t.kind !== 'enemy') return true;
  const e = state.enemies[t.index];
  if (e.kind === 'grunt' && state.rng() < ENEMIES.v.gruntDrop) dropWeapon(state.pickups, 'sword', e.pos, state.events);
  // Update 0.0.12 — its coins burst out (any the pool can't hold go straight to your money).
  state.money += burstCoins(state.coins, e.pos, ENEMY_STATS[e.kind]().coins, state.rng);
  return true;
}
