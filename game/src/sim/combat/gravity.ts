// Update 0.3.81 — Gravity Sean's stances and everyday moves (enemy_bibles/Born to Retry — Gravity Sean.docx: "normal mode is ranged and environmental, Unstable
// mode (E) is close-range and aggressive"). E switches. Left click's the fists' combo, reshaped: Gravity Punch hits at medium distance, Gravity Fists hit up close, its
// last knocking back lightly. Stay Unstable and the Instability meter rises: harder hits, then at max an overload ("a big blast around you that hits enemies, but also
// hurts you a little and forces you back to normal mode with a short cooldown"); switching back early vents it, with a small shockwave. Ctrl on the ground's a
// slam that knocks back what's near; in the air it plunges, and knocks back on landing. Unstable, a dash toward an enemy pulls you to them (an open decision: a placeholder). Pure.
import { Vector3 } from 'three';
import { FISTS } from '../../tuning/combat';
import { DASH } from '../../tuning/movement';
import { SEAN } from '../../tuning/sean';
import { wallBetween } from '../../world/navGrid';
import { isLive, radiusOf } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { ENEMY_STATS } from '../enemies/kinds';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { Punch } from './fists';
import { GravityState, instabFactor } from './gravityMeter';
import { powerFor } from './slamHit';
import type { CombatState } from './state';
import { emptyTargetHit, landHit, type TargetKind } from './strike';
import { TARGET_SHAPES } from './targets';

/** Further above or below than this, a blast misses (m). */
const LEVEL = 2;

const hit = emptyTargetHit();
const dummyAt = new Vector3();

/** One target in a blast: half as hard at its edge, thrown outward. Whether it died. */
function blastOne(state: CombatState, x: number, y: number, z: number, kind: TargetKind, index: number, pos: Vector3, r: number, height: number, radius: number, damage: number, knock: number): boolean {
  const dx = pos.x - x;
  const dz = pos.z - z;
  const dist = Math.hypot(dx, dz);
  if (dist > radius + r || Math.abs(pos.y - y) > LEVEL || wallBetween(state.nav.small, x, z, pos.x, pos.z)) return false;
  const len = Math.max(dist, 1e-3);
  const fx = dist > 1e-3 ? dx / len : 0;
  const fz = dist > 1e-3 ? dz / len : -1;
  hit.kind = kind;
  hit.index = index;
  hit.s = 0;
  hit.part = 0;
  hit.point.set(pos.x, pos.y + height * 0.5, pos.z);
  const hurt = Math.round(damage * (1 - 0.5 * Math.min(1, dist / radius)));
  const killed = landHit(state, hit, hurt, knock, fx, fz, 'hitSlam', hurt);
  if (killed && kind === 'enemy') launch(state.enemies[index], fx, fz);
  return killed;
}

/** Everything near (x, y, z) and not behind a wall takes it. How many it killed. */
export function gravBlast(state: CombatState, x: number, y: number, z: number, radius: number, damage: number, knock: number): number {
  state.events.push('seanBlast', radius, x, y, z);
  let kills = 0;
  state.dummies.forEach((d, i) => {
    if (d.broken) return;
    dummyAt.set(d.home.x + d.offset.x, d.home.y, d.home.z + d.offset.z);
    if (blastOne(state, x, y, z, 'dummy', i, dummyAt, TARGET_SHAPES.dummy.radius, TARGET_SHAPES.dummy.height, radius, damage, knock)) kills++;
  });
  state.enemies.forEach((e, i) => {
    if (isLive(e) && blastOne(state, x, y, z, 'enemy', i, e.pos, radiusOf(e), ENEMY_STATS[e.kind]().height, radius, damage, knock)) kills++;
  });
  return kills;
}

/** Back to normal mode by choice: it vents, safely, with a small shockwave, bigger the fuller the meter was. */
function vent(state: CombatState, player: PlayerState) {
  const g = state.grav;
  const v = SEAN.v;
  const k = g.instab;
  g.unstable = false;
  g.instab = 0;
  state.events.push('seanVent', k, player.pos.x, player.pos.y, player.pos.z);
  gravBlast(state, player.pos.x, player.pos.y, player.pos.z, v.ventRadius + (v.ventRadiusFull - v.ventRadius) * k, v.ventDamage + (v.ventDamageFull - v.ventDamage) * k, v.ventKnock);
}

/** The meter at max: the big blast, some of it yours, back to normal mode, and E waits. */
function overload(state: CombatState, player: PlayerState) {
  const g = state.grav;
  const v = SEAN.v;
  g.unstable = false;
  g.instab = 0;
  g.switchWait = v.overloadWait;
  state.events.push('seanOverload', 0, player.pos.x, player.pos.y, player.pos.z);
  gravBlast(state, player.pos.x, player.pos.y, player.pos.z, v.overloadRadius, v.overloadDamage, v.overloadKnock);
  damagePlayer(player, v.overloadSelf, 'overload');
}

/** E. Whether it did anything. */
export function switchStance(state: CombatState, player: PlayerState): boolean {
  const g = state.grav;
  if (g.switchWait > 0) return false;
  if (g.unstable) vent(state, player);
  else {
    g.unstable = true;
    g.instab = 0;
    state.events.push('seanUnstable', 0, player.pos.x, player.pos.y, player.pos.z);
  }
  return true;
}

/** His timers and the meter, each tick. */
export function tickGravity(state: CombatState, player: PlayerState, dt: number) {
  const g = state.grav;
  g.switchWait = Math.max(0, g.switchWait - dt);
  g.slamWait = Math.max(0, g.slamWait - dt);
  g.clash = Math.max(0, g.clash - dt);
  if (!g.unstable) return;
  g.instab = Math.min(1, g.instab + SEAN.v.instabRise * dt);
  if (g.instab >= 1) overload(state, player);
}

/** How quick his fists are in this stance. */
export const punchRate = (g: GravityState) => (g.unstable ? SEAN.v.fistsRate : SEAN.v.punchRate);

/** A punch the fists just threw, made his: Gravity Punch's, or Gravity Fists'. */
export function shapePunch(g: GravityState, punch: Punch) {
  const v = SEAN.v;
  const last = punch.kind === 'finisher';
  if (g.unstable) {
    punch.damage = (last ? v.fistsLast : v.fistsDamage) * instabFactor(g);
    punch.knock = last ? v.fistsLastKnock : v.fistsKnock;
    punch.reach = FISTS.v.reach;
    punch.radius = FISTS.v.radius;
  } else {
    punch.damage = last ? v.punchLast : v.punchDamage;
    punch.knock = v.punchKnock;
    punch.reach = v.punchReach;
    punch.radius = v.punchRadius;
  }
  g.clash = v.clashFor;
}

/** Ctrl on the ground, if it's been long enough. */
export function trySeanSlam(state: CombatState, player: PlayerState, pressed: boolean): boolean {
  const g = state.grav;
  const v = SEAN.v;
  if (!pressed || !player.grounded || g.slamWait > 0) return false;
  g.slamWait = v.slamWait;
  state.events.push('seanSlam', 0, player.pos.x, player.pos.y, player.pos.z);
  gravBlast(state, player.pos.x, player.pos.y, player.pos.z, v.slamRadius, v.slamDamage, v.slamKnock);
  return true;
}

/** A plunge lands, from `drop` m up. */
export function landPlunge(state: CombatState, player: PlayerState, drop: number) {
  const v = SEAN.v;
  const { damage, radius } = powerFor(drop);
  gravBlast(state, player.pos.x, player.pos.y, player.pos.z, radius + v.plungeWider, damage, v.plungeKnock);
}

/** Each tick: Unstable, a dash just begun toward an enemy goes all the way to it. */
export function stepDashPull(state: CombatState, player: PlayerState) {
  const g = state.grav;
  const v = SEAN.v;
  if (player.dashTime <= 0) {
    g.dashing = false;
    return;
  }
  if (g.dashing) return;
  g.dashing = true;
  if (!g.unstable || v.dashPull < 1) return;
  let best = -1;
  let bestD = v.dashPullRange;
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (!isLive(e) || Math.abs(e.pos.y - player.pos.y) > LEVEL) continue;
    const dx = e.pos.x - player.pos.x;
    const dz = e.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d >= bestD || d < 1e-3 || (dx * player.dashDir.x + dz * player.dashDir.z) / d < v.dashPullCone) continue;
    if (wallBetween(state.nav.small, player.pos.x, player.pos.z, e.pos.x, e.pos.z)) continue;
    best = i;
    bestD = d;
  }
  if (best < 0) return;
  const e = state.enemies[best];
  player.dashDir.set((e.pos.x - player.pos.x) / bestD, 0, (e.pos.z - player.pos.z) / bestD);
  player.dashTime = Math.min(v.dashPullMax, Math.max(0.02, (bestD - radiusOf(e) - v.dashPullStop) / DASH.v.speed));
  player.invuln = Math.max(player.invuln, player.dashTime);
  state.events.push('seanPull', best, e.pos.x, e.pos.y, e.pos.z);
}
