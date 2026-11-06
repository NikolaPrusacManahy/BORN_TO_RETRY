// Update 0.3.76 — the Playable Demon's sword is a light (enemy_bibles/Born to Retry — Playable Demon.docx: "A warm point light on the blade lights the arena as you swing. Its brightness follows the
// heat meter"). In the world, on the blade: in your hand, or wherever you've thrown it. Only for the Demon, and it casts no shadow. F1's Sword light turns it off, to compare the frame rate: the
// designer took the torches' lights out for that once, so this one came in by itself.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { DEMON } from '../../tuning/demon';

/** Warm, as its fire is. Where along the blade it sits (m from the fist), how far its flicker goes, how fast. */
const COLOUR = 0xff8a3a;
const ON_BLADE = 1.1;
const FLICKER = 0.06;
const RATE = 21;

const at = new THREE.Vector3();
const toWorld = new THREE.Matrix4();

export class SwordLight {
  readonly light = new THREE.PointLight(COLOUR, 0, DEMON.v.lightReach, 2);
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.light.castShadow = false;
    scene.add(this.light);
  }

  /** `held`: the blade in the arms' scene, if it's in your hand; `flare`: how hot its swing has it burning (0 … 1); `camera`: yours, which carries the arms' scene into the world. */
  update(state: CombatState, held: THREE.Object3D | null, flare: number, camera: THREE.Camera, dt: number) {
    const v = DEMON.v;
    this.time += dt;
    this.light.visible = v.lightOn >= 1;
    this.light.distance = v.lightReach;
    if (!state.demon) {
      this.light.intensity = 0;
      return;
    }
    const b = state.blade;
    const t = b.flying;
    if (t.stage !== 'hand') this.light.position.copy(t.pos);
    else if (held) {
      camera.updateMatrixWorld();
      this.light.position.copy(at.set(0, ON_BLADE, 0).applyMatrix4(toWorld.multiplyMatrices(camera.matrixWorld, held.matrixWorld)));
    }
    const flicker = 1 + FLICKER * Math.sin(this.time * RATE);
    this.light.intensity = (v.lightRest + v.lightHeat * b.heat) * (1 + v.lightFlare * flare) * flicker;
  }

  dispose() {
    this.light.removeFromParent();
    this.light.dispose();
  }
}
