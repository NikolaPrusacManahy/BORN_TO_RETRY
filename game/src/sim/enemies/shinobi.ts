// Update 0.3.33 — floor 8's Shinobi (the More-enemies pack's ninja in black, a katana made in code; the Universal
// Animation Library's sword clips: MD/FLOOR8_SHRINE_PLAN.md). He keeps off a way, side-stepping round you; from range
// he throws three shuriken in a fan (overhand: they leave his hand where the clip does); from a few strides off he dashes
// in, katana out, cutting through you and on past (a sideways dash slips it); up close, quick cuts or his combo. A blow
// about to land, a third of the time he vanishes in smoke and is behind you, cutting. Pure.
import { Vector3 } from 'three';
import { FOES_SHRINE } from '../../tuning/foesShrine';
import { fireOrb } from '../combat/orbs';
import type { CombatState } from '../combat/state';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { Enemy, EnemyWorld, isLive, setPhase, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { martial, startStrike, Strike, Style } from './martial';
import { DASH_CUT, SLASH_A, SLASH_COMBO, THROW } from './shrineShared';
import { armed } from './tokens';

const v = () => FOES_SHRINE.v;
/** His shuriken leave his hand this high (m), three in a fan this wide either side (rad). */
const HAND = 1.6;
const FAN = 0.2;

const from = new Vector3();
const dir = new Vector3();
const to = new Vector3();

/** Three shuriken at you, in a fan. */
function shuriken(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  from.set(e.pos.x - Math.sin(e.facing) * 0.4, e.pos.y + HAND, e.pos.z - Math.cos(e.facing) * 0.4);
  const chest = player.pos.y + BODY.height * 0.55;
  const yaw = Math.atan2(player.pos.x - from.x, player.pos.z - from.z);
  const flat = Math.hypot(player.pos.x - from.x, player.pos.z - from.z);
  const pitch = Math.atan2(chest - from.y, flat);
  for (const k of [-1, 0, 1]) {
    const a = yaw + k * FAN;
    dir.set(Math.sin(a) * Math.cos(pitch), Math.sin(pitch), Math.cos(a) * Math.cos(pitch));
    fireOrb(w.orbs, from, dir, v().shurikenSpeed, v().shuriken, e.kind, 'shuriken');
  }
  w.events.push('shurikenThrow', index, from.x, from.y, from.z);
}

export const SHINOBI: Style = {
  stance: [4.5, 8],
  pace: 1.15,
  every: [0.6, 1.4],
  strikes: [
    { move: THROW, from: 6, to: 14, reach: 0, arc: 0, damage: () => 0, shove: 0, recover: 0.45, weight: 1.6, event: 'shurikenWindup', fire: shuriken },
    { move: DASH_CUT, from: 3, to: 9, reach: 1.4, arc: 180, damage: () => v().dashCut, shove: 9, lunge: 15, lungeTo: 0.5, recover: 0.7, weight: 1.2, event: 'dashCut', straight: true, sweep: true },
    { move: SLASH_A, from: 0, to: 2.6, reach: 2.2, arc: 70, damage: () => v().slash, shove: 6, lunge: 4, lungeTo: 0.6, recover: 0.3, event: 'katanaCut' },
    { move: SLASH_COMBO, from: 0, to: 2.8, reach: 2.3, arc: 80, damage: () => v().slash, shove: 5, lunge: 2.5, lungeTo: 0.7, recover: 0.8, weight: 1.3, event: 'katanaCut' },
  ],
};

export function updateShinobi(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  martial(e, index, player, w, dt, SHINOBI, armed(e));
}

/** A blow about to land on a Shinobi (or the Shadow): a share of the time he's gone in smoke and behind you (past where
 *  the blow came from), turned to you, cutting. True: the blow misses. */
export function vanishes(state: CombatState, i: number, dirX: number, dirZ: number, chance: number, rest: number, then: Strike): boolean {
  const e = state.enemies[i];
  if (!isLive(e) || e.phase === 'held' || e.frozen > 0 || e.blink > 0 || state.rng() >= chance) return false;
  const len = Math.max(1e-3, Math.hypot(dirX, dirZ));
  // (You: about a blow's reach back along it; behind you, as far again past.)
  const back = 2 + 2.6;
  to.set(e.pos.x - (dirX / len) * back, e.pos.y, e.pos.z - (dirZ / len) * back);
  const nav = ENEMY_STATS[e.kind]().size === 'large' ? state.nav.large : state.nav.small;
  if (!freeSpotNear(nav, to.x, to.z, to)) return false;
  state.events.push('ninjaVanish', i, e.pos.x, e.pos.y + 1, e.pos.z);
  e.pos.set(to.x, e.pos.y, to.z);
  e.prev.copy(e.pos);
  e.vel.set(0, 0, 0);
  e.blink = rest;
  e.facing = yawTo(e, e.pos.x + dirX, e.pos.z + dirZ);
  state.events.push('ninjaAppear', i, e.pos.x, e.pos.y + 1, e.pos.z);
  setPhase(e, 'chase');
  startStrike(e, i, state, then);
  return true;
}

const BEHIND = SHINOBI.strikes.find((s) => s.move === SLASH_A)!;
export const shinobiDodges = (state: CombatState, i: number, dirX: number, dirZ: number) => vanishes(state, i, dirX, dirZ, v().vanish, v().vanishRest, BEHIND);
