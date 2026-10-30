// M1 step 6 — the arms' motion over their pose: they trail the mouse a little (sway), bob while running, dip on a
// landing (a spring), pull back in a dash and drop in a slide. (Moved out of viewmodel.ts in Update 0.1.9, which had
// grown past its size; no change in behaviour.)
// Update 0.2.4 — `steady` (0 … 1: the Pistol aimed): the sway, bob and dips all but stop and the Arms tab's nudges
// give way, so the sights sit on the crosshair.
import type * as THREE from 'three';
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
  private dipY = 0;
  private dipV = 0;
  private pullZ = 0;
  private dropY = 0;

  /** A landing at `speed` m/s dips the arms. */
  land(speed: number) {
    this.dipV -= Math.min(0.12, speed * ARMS.v.landDip) * 18;
  }

  /** Advances it and places the arms: `pivot` turned by the sway, `holder` moved by the bob, dip, pull and drop.
   *  `realDt` never stops (sway follows the mouse); `mouseDx/Dy`: this frame's mouse movement (px). */
  update(gameDt: number, realDt: number, mouseDx: number, mouseDy: number, p: PlayerState, pivot: THREE.Object3D, holder: THREE.Object3D, steady = 0) {
    const v = ARMS.v;
    // Sway: the arms trail the mouse a little, then catch up. Turning right swings them left (+y turn);
    // looking up drops them (−x turn; mouse up is negative movementY).
    this.swayX = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, (this.swayX + mouseDx * v.sway) * (1 - ease(v.swayReturn, realDt))));
    this.swayY = Math.max(-MAX_SWAY, Math.min(MAX_SWAY, (this.swayY + mouseDy * v.sway) * (1 - ease(v.swayReturn, realDt))));
    // Bob while running on the ground.
    const speed = flatSpeed(p);
    const running = p.grounded && !p.sliding && p.dashTime <= 0 && speed > 1;
    this.bobAmount += ((running ? Math.min(1, speed / 12) : 0) - this.bobAmount) * ease(8, gameDt);
    this.bobPhase += speed * gameDt * v.bobRate * Math.PI;
    // Landing dip spring, dash pull and slide drop.
    this.dipV += (-140 * this.dipY - 16 * this.dipV) * gameDt;
    this.dipY += this.dipV * gameDt;
    this.pullZ += ((p.dashTime > 0 ? v.dashPull : 0) - this.pullZ) * ease(14, gameDt);
    this.dropY += ((p.sliding ? v.slideDrop : 0) - this.dropY) * ease(10, gameDt);

    const still = 1 - 0.85 * steady;
    const nudge = 1 - steady;
    pivot.rotation.set(PREVIEW_PITCH + this.swayY * still, this.swayX * still, 0);
    const bob = Math.sin(this.bobPhase) * v.bob * this.bobAmount * still;
    holder.position.set(v.viewX * nudge + bob * 0.5, v.viewY * nudge + (-Math.abs(bob) + this.dipY - this.dropY) * still, v.viewZ * nudge + this.pullZ * still);
  }

  reset() {
    this.swayX = this.swayY = this.dipY = this.dipV = this.pullZ = this.dropY = 0;
  }
}
