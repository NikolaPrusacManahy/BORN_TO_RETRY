// M1 step 6 — the arms' motion over their pose: they trail the mouse a little (sway), bob while running, dip on a
// landing (a spring), pull back in a dash (they dropped in a slide till Update 0.3.20 took it out). (Moved out of
// viewmodel.ts in Update 0.1.9, which had grown past its size; no change in behaviour.)
import type * as THREE from 'three';
import { stepSpring } from '../../core/spring';
import type { PlayerState } from '../../sim/player/state';
import { flatSpeed } from '../../sim/player/state';
import { ARMS } from '../../tuning/arms';
import { PREVIEW_PITCH } from './armsMath';

const MAX_SWAY = 0.08;

const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export class ArmsMotion {
  private swayX = 0;
  private swayY = 0;
  private bobPhase = 0;
  private bobAmount = 0;
  /** The landing dip (Update 0.2.14 — a spring stepped in slices: core/spring.ts). */
  private readonly dip = { x: 0, v: 0 };
  private pullZ = 0;

  /** A landing at `speed` m/s dips the arms. */
  land(speed: number) {
    this.dip.v -= Math.min(0.12, speed * ARMS.v.landDip) * 18;
  }

  /** Advances it and places the arms: `pivot` turned by the sway, `holder` moved by the bob, dip, pull and drop.
   *  `realDt` never stops (sway follows the mouse); `mouseDx/Dy`: this frame's mouse movement (px). */
  update(gameDt: number, realDt: number, mouseDx: number, mouseDy: number, p: PlayerState, pivot: THREE.Object3D, holder: THREE.Object3D) {
    const v = ARMS.v;
    // Sway: the arms trail the mouse a little, then catch up. Turning right swings them left (+y turn);
    // looking up drops them (−x turn; mouse up is negative movementY).
    this.swayX = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, (this.swayX + mouseDx * v.sway) * (1 - ease(v.swayReturn, realDt))));
    this.swayY = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, (this.swayY + mouseDy * v.sway) * (1 - ease(v.swayReturn, realDt))));
    // Bob while running on the ground.
    const speed = flatSpeed(p);
    const running = p.grounded && p.dashTime <= 0 && speed > 1;
    this.bobAmount += ((running ? Math.min(1, speed / 12) : 0) - this.bobAmount) * ease(8, gameDt);
    this.bobPhase += speed * gameDt * v.bobRate * Math.PI;
    // Landing dip spring and dash pull.
    stepSpring(this.dip, 140, 16, gameDt);
    this.pullZ += ((p.dashTime > 0 ? v.dashPull : 0) - this.pullZ) * ease(14, gameDt);

    pivot.rotation.set(PREVIEW_PITCH + this.swayY, this.swayX, 0);
    const bob = Math.sin(this.bobPhase) * v.bob * this.bobAmount;
    holder.position.set(v.viewX + bob * 0.5, v.viewY - Math.abs(bob) + this.dip.x, v.viewZ + this.pullZ);
  }

  reset() {
    this.swayX = this.swayY = this.dip.x = this.dip.v = this.pullZ = 0;
  }
}
