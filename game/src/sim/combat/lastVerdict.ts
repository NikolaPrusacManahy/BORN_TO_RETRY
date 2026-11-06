// Update 0.3.73 — the Playable Demon's Q, Last Verdict (the bible: "when heat is full: screen goes black and white, the sword grows huge"). The world holds
// still for it, as it does for an execution. It burns the heat. Your sword comes back to your hand for it if it was out. Pure.
// Update 0.3.74 — the designer: "a horizontal dimension slash not vertical, that hits the whole arena". It no longer goes along your aim: held in both
// hands, the sword sweeps across, and the slash runs out from you through everything, at any height, to the end of the room. Everything it meets
// dies; a boss loses a share of its full health (the designer's choice: bosses keep their phases and ultimates).
import { Vector3 } from 'three';
import { DEMON } from '../../tuning/demon';
import { isLive } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { ENEMY_STATS } from '../enemies/kinds';
import type { PlayerState } from '../player/state';
import { begin, VERDICT } from './bladeSwing';
import { catchBlade } from './bladeThrow';
import type { CombatState } from './state';
import { landHit } from './strike';
import { sweepTargets, targetId } from './sweep';

/** More than any health; further than any room (m). */
const KILLS = 100000;
const EVERYWHERE = 100000;
/** It's measured from your chest (m over your feet); how long it shows (s). */
const CHEST = 1.1;
export const CLEAVE_FOR = 0.7;
/** A second life's taken too (a Cursed Crewman's head, a mech's pilot). */
const LIVES = 2;

const at = new Vector3();

/** Q: if the sword's full, it starts. */
export function tryVerdict(state: CombatState, player: PlayerState, pressed: boolean): boolean {
  const b = state.blade;
  if (!pressed || b.verdict || b.heat < 1) return false;
  catchBlade(state);
  b.verdict = true;
  b.verdictT = 0;
  b.verdictStruck = false;
  b.verdictSeen.clear();
  b.charging = b.full = false;
  b.lunging = false;
  b.plant = 0;
  b.queued = 0;
  player.dashTime = 0;
  player.slamming = false;
  begin(b, VERDICT, state.events);
  state.events.push('demonVerdict', 0, player.pos.x, player.pos.y, player.pos.z);
  return true;
}

/** The slash, out to `reach` m from you: all it's reached so far that it hasn't yet. Takes no hit-stop of its own: a kill's would hold it back. */
function slashTo(state: CombatState, player: PlayerState, reach: number) {
  const v = DEMON.v;
  const b = state.blade;
  const stop = state.hitStop.remaining;
  at.set(player.pos.x, player.pos.y + CHEST, player.pos.z);
  sweepTargets(
    state,
    at,
    at,
    reach,
    (t) => {
      const id = targetId(t);
      if (b.verdictSeen.has(id)) return;
      b.verdictSeen.add(id);
      const dx = t.point.x - player.pos.x;
      const dz = t.point.z - player.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const e = t.kind === 'enemy' ? state.enemies[t.index] : null;
      const s = e ? ENEMY_STATS[e.kind]() : null;
      const share = s?.boss && v.verdictBoss < 1 ? v.verdictBoss : 0;
      // (The Swarm: past its worms, or one would take it; and through its stare, it's more than a hit on its eye.)
      if (e?.swarm) {
        e.swarm.pierce = true;
        if (e.ult.on) e.ult.fill = e.ult.need;
      }
      for (let i = 0; i < LIVES; i++) {
        const killed = landHit(state, t, share > 0 ? s!.hp * share : KILLS, v.overheadKnock, dx / d, dz / d, 'hitPierce', 1, true);
        if (killed && e) launch(e, dx / d, dz / d);
        if (killed || !e || !isLive(e) || share > 0) break;
      }
    },
    true,
  );
  state.hitStop.remaining = stop;
}

/** One tick of it: nothing else in the world moves. */
export function stepVerdict(state: CombatState, player: PlayerState, dt: number) {
  const b = state.blade;
  const v = DEMON.v;
  b.verdictT += dt;
  if (!b.verdictStruck) {
    if (b.verdictT < v.verdictWindup) return;
    b.verdictStruck = true;
    state.demonFire.cleave = { x: player.pos.x, y: player.pos.y, z: player.pos.z, r: 0, left: CLEAVE_FOR };
    state.hitStop.request(v.overheadStop);
    state.events.push('demonCleave', 0, player.pos.x, player.pos.y, player.pos.z);
    return;
  }
  const c = state.demonFire.cleave;
  if (c) slashTo(state, player, c.r);
  if (b.verdictT < v.verdictWindup + v.verdictHold) return;
  // Whatever's further off than it's got to: the whole arena, it said.
  slashTo(state, player, EVERYWHERE);
  // (Whatever it just killed, it's spent.)
  b.heat = 0;
  b.verdict = false;
  b.step = -1;
  b.grey = v.verdictFade;
  player.invuln = Math.max(player.invuln, 0.3);
}

/** How drained of colour the screen is (0 … 1): the view's. */
export function verdictShade(state: CombatState): number {
  const b = state.blade;
  const v = DEMON.v;
  if (b.verdict) return b.verdictStruck ? 1 : Math.min(1, b.verdictT / Math.max(0.05, v.verdictWindup * 0.35));
  return b.grey > 0 ? b.grey / Math.max(0.05, v.verdictFade) : 0;
}
