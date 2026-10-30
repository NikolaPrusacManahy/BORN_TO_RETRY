// Update 0.2.4 — the enemies that slip your blows (the designer, floor 4: "they evade", "they are smarter than ordinary
// enemies"), in one place: what a hit about to land on one does instead. The Ninja teleports away (ninja.ts); the Tribal
// rolls aside; a Cactoro under the sand can't be reached at all, and up it may duck back under; the big Cactoro shut in
// its thorns turns every blow, and hit too fast it shuts itself in; the Hywirl darts away; the Dino hops back from
// almost all of them, except while it's open after a bite. Each has a rest before it can slip another (Enemy.blink).
// Any enemy a Flying Tribal has warded shrugs off blows while its ward lasts (Enemy.ward); the Skull Orc turns every blow
// from in front of it on its club, and strikes back after enough of them. Also what they read of you: whether you're aiming at one. Pure.
import { Vector3 } from 'three';
import { FOES4 } from '../../tuning/foes4';
import type { CombatState } from '../combat/state';
import type { PlayerState } from '../player/state';
import { Enemy, isLive, setPhase } from './enemy';
import { ninjaDodges } from './ninja';
import { BURIED } from './cactoro';
import { hopAway } from './dinoBlob';
import { riposte } from './skullOrc';

/** You aim at an enemy within this angle of it (as the crow flies), and no further off than this (m). */
const AIM_FAR = 30;
/** A sidestep or a dart slides it this fast at first: the slide dies away at Enemy's friction (7/s), so a slide of d m
 *  starts at 7 d m/s. */
const SLIDE = 7;

const side = new Vector3();

/** You're looking at it: its bearing within `deg` of where you face. */
export function aimedAt(player: PlayerState, e: Enemy, deg: number): boolean {
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-3 || d > AIM_FAR) return false;
  const dot = (-Math.sin(player.yaw) * dx - Math.cos(player.yaw) * dz) / d;
  return dot >= Math.cos((deg * Math.PI) / 180);
}

/** How far off where you look it is (rad, 0: dead ahead, π: right behind you). */
export function offYourLook(player: PlayerState, e: Enemy): number {
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  return Math.acos(Math.max(-1, Math.min(1, (-Math.sin(player.yaw) * dx - Math.cos(player.yaw) * dz) / d)));
}

/** Springs it `dist` m aside, across the way from (fromX, fromZ) to it, to whichever side `sign` says. */
export function slideAside(e: Enemy, fromX: number, fromZ: number, dist: number, sign: number) {
  side.set(e.pos.z - fromZ, 0, -(e.pos.x - fromX));
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize().multiplyScalar(sign * dist * SLIDE);
  e.vel.x = side.x;
  e.vel.z = side.z;
}

/** A hit along (dirX, dirZ) is about to land on enemy `i`: true if it slips it instead (the hit misses). */
export function dodges(state: CombatState, i: number, dirX: number, dirZ: number): boolean {
  const e = state.enemies[i];
  if (!isLive(e) || e.phase === 'held' || e.frozen > 0) return false;
  const v = FOES4.v;
  // A Flying Tribal's ward: it shrugs this one off.
  if (e.ward > 0) {
    e.ward--;
    state.events.push('wardBlock', i, e.pos.x, e.pos.y + 1, e.pos.z);
    return true;
  }
  switch (e.kind) {
    case 'skullOrc': {
      // From in front of it (the blow comes at its face), not while it swings or leaps: turned on its club.
      const facing = -Math.sin(e.facing) * dirX - Math.cos(e.facing) * dirZ;
      if (e.phase === 'recover' || e.phase === 'leap' || e.phase === 'windup' || -facing < v.orcGuard) return false;
      state.events.push('orcBlock', i, e.pos.x - Math.sin(e.facing), e.pos.y + 1.4, e.pos.z - Math.cos(e.facing));
      e.shots = e.blink > 0 ? e.shots + 1 : 1;
      e.blink = 2;
      if (e.shots >= Math.round(v.orcRiposte)) {
        e.shots = 0;
        e.blink = 0;
        riposte(e, i, state);
      }
      return true;
    }
    case 'ninja':
      return ninjaDodges(state, i, dirX, dirZ);
    case 'tribal':
      if (e.blink > 0 || e.perch > 0 || state.rng() >= v.tribalDodge) return false;
      slideAside(e, e.pos.x - dirX, e.pos.z - dirZ, v.tribalSidestep, state.rng() < 0.5 ? 1 : -1);
      e.blink = v.tribalSidestepRest;
      state.events.push('tribalDodge', i, e.pos.x, e.pos.y + 1, e.pos.z);
      return true;
    case 'cactoro':
      // Under the sand: out of reach. Up: it may duck back under.
      if (e.pos.y <= BURIED * 0.5) return true;
      if (e.blink > 0 || state.rng() >= v.cactoroDuck) return false;
      dig(state, i);
      e.blink = v.cactoroDuckRest;
      return true;
    case 'cactoroBig': {
      if (e.pos.y <= BURIED * 0.5) return true;
      if (e.phase === 'stun') {
        state.events.push('cactoroBlock', i, e.pos.x, e.pos.y + 1.5, e.pos.z);
        return true;
      }
      // Hits counted in its window (Enemy.shots, Enemy.blink): too many and it shuts itself in its thorns (this one lands).
      e.shots = e.blink > 0 ? e.shots + 1 : 1;
      e.blink = v.guardWindow;
      if (e.shots >= Math.round(v.guardHits) && e.phase !== 'burrow') {
        e.shots = 0;
        e.blink = 0;
        setPhase(e, 'stun');
        state.events.push('cactoroGuard', i, e.pos.x, e.pos.y + 1.5, e.pos.z);
      }
      return false;
    }
    case 'dinoBlob':
      // Open after its bite, or committed mid-pounce: your blows land.
      if (e.phase === 'recover' || e.phase === 'leap' || e.blink > 0 || state.rng() >= v.dinoBlobDodge) return false;
      hopAway(e, e.pos.x - dirX, e.pos.z - dirZ, v.dinoBlobHop);
      e.blink = v.dinoBlobDodgeRest;
      state.events.push('dinoBlobHop', i, e.pos.x, e.pos.y + 0.5, e.pos.z);
      return true;
    case 'hywirl':
      if (e.blink > 0 || state.rng() >= v.hywirlDodge) return false;
      slideAside(e, e.pos.x - dirX, e.pos.z - dirZ, v.hywirlDart, state.rng() < 0.5 ? 1 : -1);
      e.blink = v.hywirlDartRest;
      state.events.push('hywirlDart', i, e.pos.x, e.pos.y + 0.7, e.pos.z);
      return true;
    default:
      return false;
  }
}

/** A Cactoro ducks under the sand. */
export function dig(state: Pick<CombatState, 'enemies' | 'events'>, i: number) {
  const e = state.enemies[i];
  state.events.push('cactoroDig', i, e.pos.x, e.pos.y + 0.3, e.pos.z);
  e.pos.y = BURIED;
  e.prev.y = BURIED;
  setPhase(e, 'burrow');
}
