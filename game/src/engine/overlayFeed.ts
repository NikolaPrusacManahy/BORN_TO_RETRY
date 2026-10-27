// M1 — what the HUD and the F2 debug overlay show, read from the sim once a frame. The HUD store only changes every
// HUD_EVERY seconds, or at once on a hit or a hurt, so React doesn't re-render every frame.
// Update 0.0.4 — moved out of Game.ts when the main menu joined it.
import type { CombatState } from '../sim/combat/state';
import { PlayerState, flatSpeed, moveMode } from '../sim/player/state';
import { DASH } from '../tuning/movement';
import type { CombatFeedback } from './combatFeedback';
import type { DebugInfo, HudStore } from './hudStore';

/** HUD refresh interval (s); hits and hurts push at once. */
const HUD_EVERY = 0.05;

export function fillDebug(d: DebugInfo, p: PlayerState, combat: CombatState) {
  d.speed = flatSpeed(p);
  d.vSpeed = p.vel.y;
  d.mode = moveMode(p);
  d.dashCharges = p.dashCharges;
  d.wallJumpsLeft = p.wallJumpsLeft;
  d.hitStop = combat.hitStop.remaining * 1000;
}

export class HudFeed {
  private timer = 0;

  constructor(private readonly hud: HudStore) {}

  push(real: number, p: PlayerState, fb: CombatFeedback) {
    const cur = this.hud.get();
    this.timer -= real;
    if (this.timer > 0 && cur.hits === fb.hits && cur.hurts === fb.hurts) return;
    this.timer = HUD_EVERY;
    this.hud.set({ dashCharges: Math.floor(p.dashCharges * 20) / 20, dashMax: DASH.v.charges, mode: moveMode(p), hits: fb.hits, marker: fb.marker, hurts: fb.hurts });
  }
}
