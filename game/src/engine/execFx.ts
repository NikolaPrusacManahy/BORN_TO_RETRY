// Update 0.3.2 (the designer: "the way execution can feel brutal") — an execution's finishing blow: the world drops
// into slow motion (the body flying, or bursting in your hands), the camera lunges in (the view narrows, then eases
// out), the screen flashes red and shakes; every blow before it nods the view in a little. The numbers are the
// Execution tab's (F1).
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { EXECUTION } from '../tuning/execution';
import type { CameraRig } from './cameraRig';

/** How long the slow motion takes to ease back to full speed (s, real), the red flash's life (s, real) and strength. */
const EASE_BACK = 0.3;
const FLASH_LIFE = 0.35;
const FLASH = 0.45;
/** A blow's lunge (degrees of view). */
const BLOW_LUNGE = 3;
const ahead = new THREE.Vector3();

export class ExecFx {
  private readonly geo = new THREE.PlaneGeometry(1, 1);
  private readonly mat = new THREE.MeshBasicMaterial({ color: 0xb00a0a, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flash = new THREE.Mesh(this.geo, this.mat);
  /** Real seconds since the finishing blow (Infinity: none lately), and whether this execution has had it. */
  private since = Infinity;
  private finished = false;

  constructor(
    scene: THREE.Scene,
    private readonly rig: CameraRig,
  ) {
    this.flash.renderOrder = 11;
    this.flash.frustumCulled = false;
    this.flash.visible = false;
    scene.add(this.flash);
  }

  /** This frame's execution events (before they're cleared). */
  apply(state: CombatState) {
    const ev = state.events;
    for (let i = 0; i < ev.length; i++) {
      const kind = ev.at(i).kind;
      if (kind === 'execGrab') this.finished = false;
      else if (kind === 'execBlow') this.rig.lunge(BLOW_LUNGE);
      else if ((kind === 'execThrow' || kind === 'execBurst') && !this.finished) {
        // The finishing blow.
        this.finished = true;
        this.since = 0;
        this.rig.lunge(EXECUTION.v.finalLunge);
        this.rig.shake.add(0.5);
      } else if (kind === 'execLand') this.rig.shake.add(0.35);
    }
  }

  /** The world's speed now (1: full; the run multiplies its time by it). */
  get timeScale(): number {
    const v = EXECUTION.v;
    if (this.since < v.finalSlowTime) return v.finalSlow;
    const k = (this.since - v.finalSlowTime) / EASE_BACK;
    return k >= 1 ? 1 : v.finalSlow + (1 - v.finalSlow) * k;
  }

  /** `real`: real time (the slow motion is timed in it). */
  update(real: number) {
    this.since += real;
    const k = this.since / FLASH_LIFE;
    this.flash.visible = k < 1;
    if (!this.flash.visible) return;
    const cam = this.rig.camera;
    this.flash.position.copy(cam.position).addScaledVector(cam.getWorldDirection(ahead), 0.2);
    this.flash.quaternion.copy(cam.quaternion);
    this.flash.scale.setScalar(2);
    this.mat.opacity = FLASH * (1 - k) * (1 - k);
  }

  dispose() {
    this.flash.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
