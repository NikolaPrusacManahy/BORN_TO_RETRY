// Update 0.3.83 — Gravity Sean's ultimates, on Q (enemy_bibles/Born to Retry — Gravity Sean.docx): "both use one shared meter, so choosing your stance before you fire is part of the decision".
// Meteor, Unstable mode, for bosses: "aim at the sky, freeze everyone in place and call a meteor down onto the room"; "one huge hit on a target zone"; "bosses freeze briefly and take full
// damage". The world holds still for it, as for the Demon's Last Verdict; only your aim's your own, and the zone follows it till the meteor's on its way. Pure.
// Update 0.3.84 — the designer: Black Hole's right click's now (gravityHole.ts), and "the meteor range is 50% bigger". Update 0.3.85 — normal mode's ultimate is Time Stop (gravityStop.ts).
import { Vector3 } from 'three';
import { SEAN } from '../../tuning/sean';
import type { CollisionWorld } from '../collisionWorld';
import { isLive, radiusOf } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import { gravBlast } from './gravity';
import { dropPalm, floorUnder } from './gravityHole';
import { startStop } from './gravityStop';
import { aim } from './punch';
import type { CombatState } from './state';

const eye = new Vector3();
const dir = new Vector3();

/** Q, if the meter's full: by your stance. */
export function tryUltimate(state: CombatState, player: PlayerState, pressed: boolean, yaw: number, pitch: number, world: CollisionWorld): boolean {
  const g = state.grav;
  if (!pressed || g.ult < 1 || g.meteor || g.stop) return false;
  // (Update 0.3.85 — normal mode's: gravityStop.ts.)
  if (!g.unstable) {
    g.ult = 0;
    startStop(state, player);
    return true;
  }
  dropPalm(state);
  g.ult = 0;
  g.shock = -1;
  player.slamming = false;
  player.dashTime = 0;
  for (const e of state.enemies) e.prev.copy(e.pos);
  g.meteor = { t: 0, x: player.pos.x, y: player.pos.y, z: player.pos.z, falling: false, dx: 0, dz: -1 };
  aimZone(state, player, yaw, pitch, world);
  state.events.push('seanMeteorCall', 0, player.pos.x, player.pos.y, player.pos.z);
  return true;
}

/** Where you're looking, on the floor: the meteor's zone. */
function aimZone(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld) {
  const m = state.grav.meteor;
  const v = SEAN.v;
  if (!m) return;
  aim(player, yaw, pitch, eye, dir);
  const d = Math.min(v.meteorRange, world.rayDistance(eye, dir, v.meteorRange));
  const out = Number.isFinite(d) ? d : v.meteorRange;
  m.x = eye.x + dir.x * out;
  m.z = eye.z + dir.z * out;
  m.y = floorUnder(world, m.x, player.pos.y + 0.5, m.z);
  const far = Math.hypot(m.x - player.pos.x, m.z - player.pos.z);
  if (far > 0.5) {
    m.dx = (m.x - player.pos.x) / far;
    m.dz = (m.z - player.pos.z) / far;
  }
}

/** It lands: one huge hit on the zone. The world goes on from here. */
function strike(state: CombatState) {
  const g = state.grav;
  const m = g.meteor;
  const v = SEAN.v;
  if (!m) return;
  // (The Swarm's eye, past its worms: it's more than a hit on them. As with Last Verdict.)
  for (const e of state.enemies) {
    if (!isLive(e) || Math.hypot(e.pos.x - m.x, e.pos.z - m.z) > v.meteorRadius + radiusOf(e)) continue;
    if (e.swarm) e.swarm.pierce = true;
    // Bosses freeze briefly.
    if (ENEMY_STATS[e.kind]().boss) e.frozen = Math.max(e.frozen, v.meteorBossFreeze);
  }
  state.events.push('seanMeteorHit', v.meteorRadius, m.x, m.y, m.z);
  gravBlast(state, m.x, m.y, m.z, v.meteorRadius, v.meteorDamage, v.meteorKnock, true);
  g.meteor = null;
}

/** Meteor, each tick: nothing else in the world moves. */
export function stepMeteor(state: CombatState, player: PlayerState, yaw: number, pitch: number, world: CollisionWorld, dt: number) {
  const m = state.grav.meteor;
  if (!m) return;
  const v = SEAN.v;
  m.t += dt;
  if (m.t < v.meteorAim) {
    aimZone(state, player, yaw, pitch, world);
    return;
  }
  if (!m.falling) {
    m.falling = true;
    state.events.push('seanMeteorFall', 0, m.x, m.y, m.z);
  }
  if (m.t >= v.meteorAim + v.meteorFall) strike(state);
}

/** How drained of colour the screen is while the world holds still (0 … 1): the view's. */
export function meteorShade(state: CombatState): number {
  const m = state.grav.meteor;
  return m ? Math.min(1, m.t / 0.15) * SEAN.v.meteorGrey : 0;
}
