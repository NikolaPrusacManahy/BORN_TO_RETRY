// Update 0.2.22 — the builds' own cards (builds.ts): Tremor (the slam's blast is a card now: a tester could spam it off
// the walls, "this can be a Build around ground smash instead of having it at the start"), Aftershock and Scorched
// Earth (the slam's), and the pair cards Static Step (a dash's lightning), Shrapnel (a killing throw bursts), Last Rites
// (an execution makes those near it bleed). Pure.
import { Vector3 } from 'three';
import { BUILDS } from '../../tuning/builds';
import { CARDS } from '../../tuning/cards';
import type { CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { afflict, afflictAround, nearest, queueBlast, zap } from './cardHits';
import { holds } from './cards';

/** Your chest, where Static Step's bolts leave from (m over your feet). */
const CHEST = 1.3;
const chest = new Vector3();

/** Your slam's landing blasts what's near it: with Tremor; or always, with the Fate Cards off or on ARE YOU EVEN HUMAN?
 *  (as before them). */
export const tremors = (state: CombatState) => holds(state, 'tremor') || !state.fate || state.bare;

/** Aftershock: a slam's blast (`damage` at its middle, `radius`, at `at`) goes off again a moment later. */
export function aftershock(state: CombatState, at: Vector3, damage: number, radius: number) {
  const b = BUILDS.v;
  if (holds(state, 'aftershock')) queueBlast(state, at, radius * b.aftershock, damage * b.aftershock, b.aftershockWait);
}

/** Scorched Earth: enemy `i`, hit by your slam's blast, burns. */
export function scorch(state: CombatState, i: number) {
  if (holds(state, 'scorchedEarth')) afflict(state, i, 'burn', CARDS.v.burnDps, CARDS.v.burnFor);
}

/** Static Step: each dash you begin strikes the nearest enemies with lightning. */
export function staticStep(state: CombatState, player: PlayerState) {
  const dashing = player.dashTime > 0;
  const began = dashing && !state.powers.dashing;
  state.powers.dashing = dashing;
  if (!began || !holds(state, 'staticStep') || player.dead) return;
  const b = BUILDS.v;
  const near = nearest(state, player.pos.x, player.pos.z, b.staticRange, Math.round(b.staticTargets));
  if (near.length === 0) return;
  chest.set(player.pos.x, player.pos.y + CHEST, player.pos.z);
  state.events.push('cardStorm', near.length, chest.x, chest.y, chest.z);
  for (const i of near) zap(state, chest, i);
}

/** Shrapnel: a thrown weapon killed what it hit, at `at`: it bursts. */
export function shrapnel(state: CombatState, at: Vector3) {
  if (holds(state, 'shrapnel')) queueBlast(state, at, BUILDS.v.shrapnelRadius, BUILDS.v.shrapnelDamage);
}

/** Last Rites: an execution at `at` (its victim, `skip`) makes every enemy near it bleed. */
export function lastRites(state: CombatState, at: Vector3, skip: number) {
  if (holds(state, 'lastRites')) afflictAround(state, at.x, at.z, BUILDS.v.ritesRadius, 'bleed', CARDS.v.bleedDps, CARDS.v.bleedFor, state.enemies[skip] ?? null);
}
