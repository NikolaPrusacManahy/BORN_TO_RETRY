// Update 0.3.56 — the Frost Roc's ultimate, Mountain Fall (the Boss Design Bible): it goes to the foot of the cliff, its wings up,
// tearing the cornice loose; rocks start to fall. Its knees glow. Break both in the window: it collapses, and the cornice lands on
// its own back, off its bar, and it's down a long while. Not in time: the cornice smashes, and boulders rain over the whole plateau.
// Every third comes for you; a pillar you're sheltering at takes it, and snaps: so you go from pillar to pillar. Heavy, not a
// one-shot. Enemy.shots: going, open, the rain. Pure.
import { Vector3 } from 'three';
import { FROST_ROC } from '../../tuning/frostRoc';
import { freeAt } from '../../world/navGrid';
import { dropBomb } from '../combat/bombs';
import { pillarsIn, PillarWorld, snapPillar, standingNear } from '../combat/pillars';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase, yawTo } from './enemy';
import { FALL } from './rocMoves';
import { openUltimate, stepUltimate } from './ultimate';

/** What the screen says. */
export const FALL_CUE = 'BREAK BOTH KNEES';
const GOING = 0;
const OPEN = 1;
const RAIN = 2;
/** It takes this long to get to the cliff (s), this high (m); this far from its middle along the way to it (m). */
const HOP = 1.2;
const HOP_UP = 7;
const TO_CLIFF = 12;
/** The floor shakes this often (s). */
const RUMBLE = 0.5;
/** A boulder's fall starts this high (m); it lands within this of the middle (m), this far clear of a pillar (m), but one that's
 *  for you. You're sheltering this close to a pillar (m); a boulder for one bursts this wide (m). */
const FROM_UP = 34;
const SPREAD = 26;
const CLEAR = 3;
const SHELTER = 3;
const ON_PILLAR = 1;
/** Every this many, one comes for you. */
const FOR_YOU = 3;
/** It stands this long after the last has fallen (s). */
const AFTER = 1;

const from = new Vector3();
const to = new Vector3();

export function startFall(d: Enemy, index: number, w: EnemyWorld) {
  const r = d.roc!;
  d.move = FALL;
  d.shots = GOING;
  d.blink = 0;
  d.from.copy(d.pos);
  d.aim.set(r.midX + r.cliffX * TO_CLIFF, 0, r.midZ + r.cliffZ * TO_CLIFF);
  r.cornice = 'cracking';
  r.corniceT = 0;
  setPhase(d, 'blast');
  w.events.push('rocFallTell', index, d.pos.x, d.pos.y + 1, d.pos.z);
}

function rumble(d: Enemy, w: EnemyWorld, k: number, dt: number) {
  d.blink -= dt;
  if (d.blink > 0) return;
  d.blink = RUMBLE;
  w.events.push('rocRumble', k, d.pos.x, 0.1, d.pos.z);
}

/** One boulder: for you, or anywhere clear; for you at a pillar, on the pillar, and it snaps as it lands. */
function dropBoulder(d: Enemy, player: PlayerState, w: EnemyWorld) {
  const v = FROST_ROC.v;
  const r = d.roc!;
  r.rainLeft--;
  const pillars = pillarsIn(w);
  const forYou = r.rainLeft % FOR_YOU === 0;
  let radius = v.rainRadius;
  if (forYou) {
    to.set(player.pos.x, 0, player.pos.z);
    const shelter = pillars.length ? standingNear({ pillars }, player.pos.x, player.pos.z, SHELTER) : -1;
    if (shelter >= 0) {
      to.set(pillars[shelter].x, 0, pillars[shelter].z);
      radius = ON_PILLAR;
      r.strikes.push({ pillar: shelter, at: r.time + v.rainFall });
    }
  } else {
    for (let tries = 0; tries < 8; tries++) {
      to.set(r.midX + (w.rng() * 2 - 1) * SPREAD, 0, r.midZ + (w.rng() * 2 - 1) * SPREAD);
      if (freeAt(w.nav.small, to.x, to.z) && (!pillars.length || standingNear({ pillars }, to.x, to.z, CLEAR) < 0)) break;
    }
  }
  from.set(to.x, FROM_UP, to.z);
  dropBomb(w.bombs, from, to, v.rainFall, radius, v.rainDamage, v.rainShove, d.kind, 'boulder');
}

/** Pillars a boulder's landed on, snapped. */
export function stepStrikes(d: Enemy, w: EnemyWorld) {
  const r = d.roc!;
  for (let i = r.strikes.length - 1; i >= 0; i--) {
    const s = r.strikes[i];
    if (r.time < s.at) continue;
    r.strikes.splice(i, 1);
    const p = pillarsIn(w)[s.pillar];
    if (p && !p.broken) snapPillar(w as unknown as PillarWorld, s.pillar, yawTo(d, p.x, p.z));
  }
}

/** One tick of its ultimate. True once it's over (not when it's stunned: that's its phase). */
export function stepFall(d: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number): boolean {
  const v = FROST_ROC.v;
  const r = d.roc!;
  if (d.shots === GOING) {
    const k = Math.min(1, d.t / HOP);
    d.pos.x = d.from.x + (d.aim.x - d.from.x) * k;
    d.pos.z = d.from.z + (d.aim.z - d.from.z) * k;
    d.pos.y = 4 * HOP_UP * k * (1 - k);
    d.facing = yawTo(d, player.pos.x, player.pos.z);
    if (k < 1) return false;
    d.pos.y = 0;
    d.shots = OPEN;
    d.t = 0;
    d.blink = 0;
    const n = Math.round(v.kneeHits);
    r.knees = [n, n];
    openUltimate(d.ult, FALL_CUE, v.fallWindow, n * 2);
    w.events.push('rocFallOpen', index, d.pos.x, 0.1, d.pos.z);
    return false;
  }
  if (d.shots === OPEN) {
    rumble(d, w, 1 - d.ult.left / d.ult.window, dt);
    const s = stepUltimate(d.ult, dt);
    if (s === 'open') return false;
    r.corniceT = 0;
    if (s === 'cancelled') {
      r.cornice = 'onIt';
      d.hp = Math.max(1, d.hp - v.fallSelf);
      setPhase(d, 'stun');
      w.events.push('rocKneesBroken', index, d.pos.x, 0.1, d.pos.z);
      return false;
    }
    r.cornice = 'smashed';
    r.rainLeft = Math.round(v.rainCount);
    r.rainIn = 0;
    d.shots = RAIN;
    d.t = 0;
    w.events.push('rocCornice', index, r.midX + r.cliffX * 30, 22, r.midZ + r.cliffZ * 30);
    return false;
  }
  if (r.rainLeft > 0) {
    r.rainIn -= dt;
    if (r.rainIn <= 0) {
      r.rainIn = v.rainEvery;
      dropBoulder(d, player, w);
    }
    d.t = 0;
    return false;
  }
  return d.t >= v.rainFall + AFTER;
}
