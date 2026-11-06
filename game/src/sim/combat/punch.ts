// M1 step 6 — landing a punch: a sphere swept from the eye along the aim, up to the reach (or the first wall).
// The nearest target in the sweep takes the hit. Hits land the instant the punch is thrown, so they never feel
// late.
// M2 — sword swings land the same way (with their own reach and width), and grunts are targets too (strike.ts).
// Update 0.0.17 — with the snowflake bonus on, a hit freezes the enemy it lands on.
// Update 0.2.15 — Iron Knuckles (a Fate Card since Update 0.2.16): a jab on an enemy winding up makes it start over;
// Cold Snap (a Fate Card): a charged punch freezes what it hits (sim/cards/cardMoves.ts). Update 0.2.18 — wave 2's: jabs
// bleed (Jagged Knuckles); a charged punch's lightning and blast (Thunderclap, Powder Keg: cardPowers.ts).
// Update 0.3.3 — a fist punch that meets an enemy's shot sends it back (parry.ts) instead of hitting. Update 0.3.5 —
// no more: the parry is right click's; and no charged punch (its Cold Snap, Thunderclap and Powder Keg: the parry's).
// Update 0.3.7 (the designer: "Punched enemies launching into the air") — a killing punch flings the body
// (sim/enemies/flight.ts). (A finisher threw a light enemy up too: taken out, the designer: "like a stun I do not want".)
import { Vector3 } from 'three';
import { stall } from '../cards/cardMoves';
import { jabPowers } from '../cards/cardPowers';
import { BONUS } from '../../tuning/bonus';
import { FEEDBACK } from '../../tuning/combat';
import { isLive } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { ENEMY_STATS } from '../enemies/kinds';
import { CAMERA } from '../../tuning/camera';
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from '../player/state';
import type { Punch, PunchKind } from './fists';
import type { CombatEvent, CombatState } from './state';
import { emptyTargetHit, landHit, nearestTarget, type TargetHit } from './strike';

const end = new Vector3();
const hit = emptyTargetHit();

/** The eye and aim direction (length 1) from the player's feet, facing and look pitch. */
export function aim(p: PlayerState, yaw: number, pitch: number, eye: Vector3, dir: Vector3) {
  eye.set(p.pos.x, p.pos.y + CAMERA.v.eyeHeight, p.pos.z);
  const c = Math.cos(pitch);
  dir.set(-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c);
}

/** Update 0.0.17 — the snowflake bonus: a melee hit freezes what it hits (never a boss). */
export function frostHit(state: CombatState, t: TargetHit) {
  if (state.bonuses.snowflake <= 0 || t.kind !== 'enemy') return;
  const e = state.enemies[t.index];
  if (isLive(e) && !ENEMY_STATS[e.kind]().boss) {
    e.frozen = BONUS.v.frozen;
    state.events.push('freeze', t.index, t.point.x, t.point.y, t.point.z);
  }
}

const STOP: Record<PunchKind, () => number> = {
  jab: () => FEEDBACK.v.stopJab,
  finisher: () => FEEDBACK.v.stopFinisher,
  heavy: () => FEEDBACK.v.stopHeavy,
  slash: () => FEEDBACK.v.stopJab,
  pierce: () => FEEDBACK.v.stopHeavy,
};

const HIT_EVENT: Record<PunchKind, CombatEvent> = { jab: 'hitJab', finisher: 'hitFinisher', heavy: 'hitHeavy', slash: 'hitSlash', pierce: 'hitPierce' };

/** Resolves a thrown punch or swing: hit or whiff. Pushes events and hit-stop requests. Returns how far from the eye
 *  it landed (m), or −1 for a whiff. */
export function resolvePunch(punch: Punch, state: CombatState, eye: Vector3, dir: Vector3, world: CollisionWorld): number {
  const reach = Math.min(punch.reach, world.rayDistance(eye, dir, punch.reach) + punch.radius);
  end.copy(eye).addScaledVector(dir, reach);
  if (!nearestTarget(state, eye, end, punch.radius, hit)) {
    state.events.push('whiff', 0, end.x, end.y, end.z);
    return -1;
  }
  const flat = Math.hypot(dir.x, dir.z) || 1;
  const charged = punch.kind === 'heavy' || punch.kind === 'pierce';
  const killed = landHit(state, hit, punch.damage, punch.knock, dir.x / flat, dir.z / flat, HIT_EVENT[punch.kind], charged ? punch.charge : punch.damage);
  // (Update 0.3.85 — Gravity Sean's Time Stop: held back. It comes to nothing yet, not even a stop in your swing.)
  if (state.grav.stop) return eye.distanceTo(hit.point);
  if (hit.kind === 'enemy' && (punch.kind === 'jab' || punch.kind === 'finisher')) {
    stall(state, hit.index);
    jabPowers(state, hit.index);
    if (killed) launch(state.enemies[hit.index], dir.x / flat, dir.z / flat);
  }
  frostHit(state, hit);
  state.hitStop.request(STOP[punch.kind]() * (charged ? 0.5 + 0.5 * punch.charge : 1));
  return eye.distanceTo(hit.point);
}
