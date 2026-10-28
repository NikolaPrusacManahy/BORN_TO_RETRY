// Update 0.1.1 — an execution as you see it (sim/combat/execution.ts): while you hold it, your view is turned where the
// moves look (down at each slam, ahead for the throw).
// Update 0.1.2 — every enemy's: the body, its pieces and the frog's tongue are drawn by exec/execScene.ts; here, after
// it each frame, the view is turned and your hands do the move (exec/handMoves.ts, worked out by exec/hands.ts, posed
// by viewmodel/heldGrip.ts); then what follows the hands (an arm reaching for them, pieces carried).
import type * as THREE from 'three';
import { execHeld } from '../sim/combat/execution';
import type { CombatState } from '../sim/combat/state';
import type { Look } from './look';
import type { Viewmodel } from './viewmodel/viewmodel';
import { clock, drawn, execScene } from './exec/execScene';
import { HAND_MOVES } from './exec/handMoves';
import { handsAt } from './exec/hands';

/** How fast the view turns where the moves look (1/s). */
const TURN = 14;

/** Each frame, after the combat scene: the view turned, the hands posed. */
export function followHeld(state: CombatState, look: Look, arms: Viewmodel, camera: THREE.PerspectiveCamera, real: number) {
  const ex = state.exec;
  const held = execHeld(ex);
  arms.grip.weight = 0;
  if (!clock.on) return;
  if (held) look.turnTo(ex.lookYaw, ex.lookPitch, TURN, real);
  if (!handsAt(HAND_MOVES[ex.kind], clock.t, ex, held, drawn, camera, arms.grip.hand)) return;
  arms.grip.weight = 1;
  arms.grip.world = camera;
  execScene()?.afterHands(state, arms.grip.hand);
}
