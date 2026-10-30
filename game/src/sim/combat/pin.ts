// Update 0.2.8 — the Velociraptor's pin (its frenzy; the designer: "move sets that were not in the game yet", Claude's
// proposal): a pounce of its own landing on you pins you down, the view up at its jaws, and the world holds still (as
// in the Bone King's grab). It bites, Pin bite gap apart, each bite's jaws glowing Pin glow before it lands: dash in
// the glow and you twist out of that bite; dash before it and you've wasted the next. Pin dodges dodged bites kick it
// off you (it's stunned); Pin bites in all and it lets you go. The screen shows the dodges and the dash's cue (engine).
// Pure.
import { Vector3 } from 'three';
import { DINO } from '../../tuning/dino';
import { pushOutOfWalls } from '../../world/navGrid';
import { BITE } from '../enemies/dinoMoves';
import { setPhase } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { CombatIntent } from './fists';
import type { CombatState } from './state';

export interface Pin {
  /** You're pinned. */
  on: boolean;
  /** Its slot; seconds pinned; bites so far, and dodged. */
  slot: number;
  t: number;
  bites: number;
  dodges: number;
  /** This bite: you've twisted out of it (a dash in its glow), or wasted it (a dash before the glow). */
  dodged: boolean;
  wasted: boolean;
  /** How the last one ended ('': none yet; 'free': you kicked it off; 'bitten': it let you go), and seconds since. */
  end: '' | 'free' | 'bitten';
  since: number;
}

export function createPin(): Pin {
  return { on: false, slot: -1, t: 0, bites: 0, dodges: 0, dodged: false, wasted: false, end: '', since: Infinity };
}

/** It stands this far from you (share of its height: its jaws over you, its bites snapping at your face), its jaws this far out and up from its
 *  feet (its model's head, measured in its clips). */
const STAND = 1.1;
const JAWS_OUT = 0.72;
const JAWS_UP = 0.72;
/** Kicked off, it's shoved back (m/s); let go, you're thrown back (m/s) and up (m/s). */
const KICKED = 9;
const LET_GO = 6;
const LET_GO_UP = 4;

const at = new Vector3();

/** What a pin works with (the fight's state, or the enemies' world: they're the same). */
type Holder = Pick<CombatState, 'enemies' | 'pin' | 'events' | 'nav'>;

/** Its jaws (world): where you look while it pins you. */
export function jawsOf(state: Holder, slot: number, out: Vector3): Vector3 {
  const k = state.enemies[slot];
  const s = ENEMY_STATS[k.kind]();
  return out.set(k.pos.x - Math.sin(k.facing) * s.height * JAWS_OUT, k.pos.y + s.height * JAWS_UP, k.pos.z - Math.cos(k.facing) * s.height * JAWS_OUT);
}

/** It has you: it stands over you, facing you. */
export function startPin(state: Holder, slot: number, player: PlayerState) {
  const p = state.pin;
  const k = state.enemies[slot];
  p.on = true;
  p.slot = slot;
  p.t = 0;
  p.bites = p.dodges = 0;
  p.dodged = p.wasted = false;
  // (It stands on the side it pounced from.)
  const dx = k.from.x - player.pos.x;
  const dz = k.from.z - player.pos.z;
  const len = Math.hypot(dx, dz);
  const out = ENEMY_STATS[k.kind]().height * STAND;
  const nx = len > 1e-3 ? dx / len : Math.sin(k.facing);
  const nz = len > 1e-3 ? dz / len : Math.cos(k.facing);
  k.pos.set(player.pos.x + nx * out, k.pos.y, player.pos.z + nz * out);
  pushOutOfWalls(state.nav.large, k.pos, ENEMY_STATS[k.kind]().radius);
  k.prev.copy(k.pos);
  k.vel.set(0, 0, 0);
  k.facing = Math.atan2(nx, nz);
  setPhase(k, 'grab');
  player.vel.set(0, 0, 0);
  state.events.push('dinoPin', slot, player.pos.x, player.pos.y, player.pos.z);
}

/** Its bite's beat: seconds into it, and whether its jaws glow. */
const beat = (p: Pin) => p.t - p.bites * DINO.v.pinGap;
const cueOf = () => Math.min(DINO.v.pinCue, DINO.v.pinGap * 0.9);
export const pinGlowing = (p: Pin) => p.on && beat(p) >= DINO.v.pinGap - cueOf();

/** One tick pinned (the world holds still): kept where you are; your dash in a bite's glow twists you out of it; each
 *  bite lands or snaps on nothing; kicked off, or let go. */
export function stepPin(state: CombatState, player: PlayerState, intent: CombatIntent, dt: number) {
  const p = state.pin;
  const v = DINO.v;
  const k = state.enemies[p.slot];
  const ev = state.events;
  if (!k.alive || k.phase === 'dead' || player.dead) {
    release(state, 'free');
    return;
  }
  p.t += dt;
  k.t += dt;
  k.prev.copy(k.pos);
  player.vel.set(0, Math.min(0, player.vel.y), 0);
  jawsOf(state, p.slot, at);
  const glowing = pinGlowing(p);
  if (glowing && k.phase !== 'windup') {
    k.move = BITE;
    setPhase(k, 'windup');
    ev.push('pinCue', p.bites + 1, at.x, at.y, at.z);
  }
  if (intent.dodgePressed && !p.dodged && !p.wasted) {
    if (glowing) {
      p.dodged = true;
      ev.push('pinTwist', p.bites + 1, at.x, at.y, at.z);
    } else {
      p.wasted = true;
      ev.push('pinWasted', p.bites + 1, at.x, at.y, at.z);
    }
  }
  if (beat(p) < v.pinGap) return;
  // The bite.
  p.bites++;
  if (p.dodged) {
    p.dodges++;
    ev.push('pinSnap', p.dodges, at.x, at.y, at.z);
  } else {
    damagePlayer(player, v.pinDamage, k.kind);
    ev.push('pinBite', p.bites, at.x, at.y, at.z);
  }
  p.dodged = p.wasted = false;
  setPhase(k, 'grab');
  const nx = Math.sin(k.facing);
  const nz = Math.cos(k.facing);
  if (p.dodges >= Math.round(v.pinDodges)) {
    // Kicked off: it reels back, stunned.
    release(state, 'free');
    setPhase(k, 'stun');
    k.vel.set(nx * KICKED, 0, nz * KICKED);
    ev.push('pinFree', p.slot, k.pos.x, k.pos.y + v.dinoHeight * 0.6, k.pos.z);
  } else if (p.bites >= Math.round(v.pinBites)) {
    // Done with you: it flings you off.
    release(state, 'bitten');
    k.move = BITE;
    setPhase(k, 'recover');
    player.vel.set(-nx * LET_GO, LET_GO_UP, -nz * LET_GO);
    player.grounded = false;
    ev.push('pinDone', p.slot, player.pos.x, player.pos.y + 1, player.pos.z);
  }
}

function release(state: CombatState, end: 'free' | 'bitten') {
  const p = state.pin;
  p.on = false;
  p.end = end;
  p.since = 0;
}

/** Seconds since the last pin ended (the screen's flash), counted while you're free. */
export function tickPin(p: Pin, dt: number) {
  if (!p.on) p.since += dt;
}
