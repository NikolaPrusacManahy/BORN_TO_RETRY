// Update 0.3.73 — the Playable Demon's heat (enemy_bibles/Born to Retry — Playable Demon.docx; the designer: "start phase 3"). Hits, kills and parries
// heat the sword; stop hitting anything and it drains. It's what the orange bar over the dash charges shows, for the Demon. High: bigger arcs,
// longer fire walls, a Lunge that leaves fire. Full: Last Verdict (lastVerdict.ts). Pure.
import { DEMON } from '../../tuning/demon';
import type { CombatState } from './state';

export function addHeat(state: CombatState, amount: number) {
  const b = state.blade;
  const was = b.heat;
  b.heat = Math.min(1, b.heat + amount);
  b.heatIdle = 0;
  if (was < 1 && b.heat >= 1) state.events.push('heatFull');
}

/** One tick: it holds a moment after your last hit, then drains. */
export function coolHeat(state: CombatState, dt: number) {
  const b = state.blade;
  b.heatIdle += dt;
  if (b.heatIdle >= DEMON.v.heatWait) b.heat = Math.max(0, b.heat - DEMON.v.heatDrain * dt);
}

/** High: what heat changes about its moves. */
export const isHot = (state: CombatState) => state.blade.heat >= DEMON.v.heatHigh;
