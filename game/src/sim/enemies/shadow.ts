// Update 0.3.33 — floor 8's mini boss, the Shadow (the More-enemies pack's ninja, half again as tall, all in black, a
// katana made in code; the Universal Animation Library's sword clips and ninja jumps: MD/FLOOR8_SHRINE_PLAN.md). His long
// cut: he sets himself, a line across the floor through you showing where (Shadow cut warning), then he's along it,
// right through and on past (step off the line); up close his combo or a heavy cut; from a way off his leap, a blow all
// round where he comes down. At two thirds of his health, and at one third, he splits off clones of himself (one hit
// ends one; their blows half his); he alone carries the key, and they fade when he falls. A blow about to land, now and
// then he vanishes, behind you, cutting. Pure.
import { Vector3 } from 'three';
import { FOES_SHRINE_B } from '../../tuning/foesShrineB';
import type { CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { Enemy, EnemyWorld, hitEnemy, inLine, isLive, setPhase, spawnEnemy, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { martial, startStrike, Strike, Style } from './martial';
import { beginLeap, leapStep } from './ninjaLeap';
import { vanishes } from './shinobi';
import { CUT_SET, HEAVY_CUT, LAND, LEAP, LONG_CUT, SLASH_COMBO, SPLIT } from './shrineShared';
import { armed } from './tokens';

const v = () => FOES_SHRINE_B.v;
/** His crouch before a leap (s), its time in the air (s); he splits at these shares of his health. */
const CROUCH = 0.4;
const LEAP_TIME = 0.85;
const SPLITS = [2 / 3, 1 / 3];
/** He sets his long cut from this far off (m): it runs some 13.5 m, on past you. */
const CUT_FROM: readonly [number, number] = [5, 10];

const spot = new Vector3();

/** His long cut, after its warning: along its line, through you. */
const CUT: Strike = { move: LONG_CUT, from: 99, to: 0, reach: 1.5, arc: 180, damage: () => v().cut, shove: 11, lunge: 22, lungeTo: 0.45, recover: 0.9, event: 'shadowCut', straight: true, sweep: true };

export const SHADOW: Style = {
  stance: [3, 6],
  pace: 1.15,
  every: [0.5, 1.2],
  strikes: [
    { move: SLASH_COMBO, from: 0, to: 3.2, reach: 3, arc: 80, damage: () => v().shadowSlash, shove: 6, lunge: 2.5, lungeTo: 0.7, recover: 0.9, weight: 1.4, event: 'katanaCut' },
    { move: HEAVY_CUT, from: 0, to: 3, reach: 3, arc: 70, damage: () => v().shadowSlash * 1.5, shove: 10, lunge: 3, lungeTo: 0.6, recover: 0.7, event: 'katanaCut' },
    CUT,
    { move: LAND, from: 99, to: 0, reach: 2.2, arc: 180, damage: () => v().shadowLeap, shove: 11, lift: 6, recover: 0.6, event: 'martialBlow' },
  ],
};
const LANDING = SHADOW.strikes.find((s) => s.move === LAND)!;
/** (Vanished behind you: his heavy cut.) */
const BEHIND = SHADOW.strikes.find((s) => s.move === HEAVY_CUT)!;

/** His clones: his cuts, half as hard; no long cut, no leap, no splitting. */
const half = (k: Strike): Strike => ({ ...k, damage: () => k.damage() * v().cloneHurts });
export const CLONE: Style = { stance: [2.6, 5], pace: 1.15, every: [0.7, 1.6], strikes: SHADOW.strikes.filter((k) => k.move === SLASH_COMBO || k.move === HEAVY_CUT).map(half) };

export function updateShadow(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const hp = ENEMY_STATS.shadow().hp;
  // Splitting: at each of his marks, once.
  if (e.phase === 'windup' && e.move === SPLIT) {
    if (e.t >= 0.6) {
      split(e, index, w);
      e.move = 0;
      setPhase(e, 'recover');
    }
    return;
  }
  if (e.stage < SPLITS.length && e.hp <= hp * SPLITS[e.stage] && (e.phase === 'chase' || e.phase === 'recover' || e.phase === 'flinch')) {
    e.stage++;
    e.move = SPLIT;
    setPhase(e, 'windup');
    return;
  }
  // His long cut's warning: set, its line showing; then along it.
  if (e.phase === 'windup' && e.move === CUT_SET) {
    if (e.t >= v().cutWarn) startStrike(e, index, w, CUT);
    return;
  }
  if (e.phase === 'leap' && e.move === LEAP) return leapStep(e, index, w, LEAP_TIME, LANDING);
  if (e.phase === 'windup' && e.move === LEAP) {
    if (e.t >= CROUCH) beginLeap(e, index, player, w, LEAP_TIME, 'ninjaLeap');
    return;
  }
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.phase === 'chase' && armed(e) && e.cooldown <= 0 && !player.dead && inLine(e, player, w.nav.large, 2.5)) {
    if (dist >= CUT_FROM[0] && dist <= CUT_FROM[1] && w.rng() < 0.5) {
      // (Set, facing you: the cut goes along where he faces now.)
      e.facing = yawTo(e, player.pos.x, player.pos.z);
      e.move = CUT_SET;
      setPhase(e, 'windup');
      w.events.push('shadowCutWarn', index, e.pos.x, 0.05, e.pos.z);
      return;
    }
    if (dist >= 6 && dist <= 12 && w.rng() < 0.35) {
      e.move = LEAP;
      setPhase(e, 'windup');
      return;
    }
  }
  martial(e, index, player, w, dt, SHADOW, armed(e));
}

/** His clones: at his sides, facing as he does. */
function split(e: Enemy, index: number, w: EnemyWorld) {
  const n = Math.round(v().clones);
  for (let k = 0; k < n; k++) {
    const a = e.facing + (k % 2 === 0 ? 1 : -1) * (Math.PI / 2) + Math.floor(k / 2) * 0.6;
    spot.set(e.pos.x - Math.sin(a) * 2.4, 0, e.pos.z - Math.cos(a) * 2.4);
    if (!freeSpotNear(w.nav.small, spot.x, spot.z, spot)) continue;
    const c = spawnEnemy(w.enemies, 'shadowClone', spot, e.facing);
    if (c >= 0) w.enemies[c].cooldown = 0.6 + 0.3 * k;
  }
  w.events.push('shadowSplit', n, e.pos.x, e.pos.y + 1.5, e.pos.z);
  void index;
}

/** A clone: his cuts, half as hard; it fades when he's gone. */
export function updateClone(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  if (!w.enemies.some((o) => o.kind === 'shadow' && isLive(o))) {
    w.events.push('cloneFade', index, e.pos.x, e.pos.y + 1, e.pos.z);
    hitEnemy(e, e.hp + 1, 0, 0, 0, true);
    return;
  }
  martial(e, index, player, w, dt, CLONE, armed(e));
}

export const shadowDodges = (state: CombatState, i: number, dirX: number, dirZ: number) => vanishes(state, i, dirX, dirZ, v().shadowVanish, 2.5, BEHIND);
