// Update 0.3.73 — the Playable Demon's Last Verdict in the world (sim/combat/lastVerdict.ts). Made in code.
// Update 0.3.74 — the designer: "a horizontal dimension slash … that traverse the whole room horizontally". A band of white light at your eye's height running out from you
// in every direction, seen edge on as one line right across the screen, thinner as it goes, drawn through the walls; and its ring racing across the floor under it.
import * as THREE from 'three';
import { CLEAVE_FOR } from '../../sim/combat/lastVerdict';
import type { CombatState } from '../../sim/combat/state';
import { CAMERA } from '../../tuning/camera';

/** The band's height (m): its white core, its orange glow. Near the start it's the width of the screen's middle; far off, a line. */
const CORE = 0.22;
const GLOW = 1.1;
/** Over the floor (m), so the ring doesn't flicker into it. */
const LIFT = 0.08;
/** It never draws smaller than this (m). */
const LEAST = 0.5;

export class VerdictView {
  readonly group = new THREE.Group();
  private readonly drumGeo = new THREE.CylinderGeometry(1, 1, 1, 96, 1, true);
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1, 96).rotateX(-Math.PI / 2);
  private readonly coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly glowMat = new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xffa050, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly core = new THREE.Mesh(this.drumGeo, this.coreMat);
  private readonly glow = new THREE.Mesh(this.drumGeo, this.glowMat);
  private readonly ring = new THREE.Mesh(this.ringGeo, this.ringMat);

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (const m of [this.core, this.glow, this.ring]) {
      m.visible = false;
      m.frustumCulled = false;
      m.renderOrder = 20;
      this.group.add(m);
    }
  }

  /** The slash is showing; how far it's got (for the tests). */
  get flashing() {
    return this.core.visible;
  }

  get reach() {
    return this.core.scale.x;
  }

  update(state: CombatState) {
    const c = state.demonFire.cleave;
    this.core.visible = this.glow.visible = this.ring.visible = !!c;
    if (!c) return;
    const r = Math.max(LEAST, c.r);
    const k = Math.max(0, c.left / CLEAVE_FOR);
    const eye = c.y + CAMERA.v.eyeHeight;
    this.core.position.set(c.x, eye, c.z);
    this.glow.position.set(c.x, eye, c.z);
    this.core.scale.set(r, CORE, r);
    this.glow.scale.set(r, GLOW, r);
    this.coreMat.opacity = k;
    this.glowMat.opacity = 0.55 * k;
    this.ring.position.set(c.x, c.y + LIFT, c.z);
    this.ring.scale.set(r, 1, r);
    this.ringMat.opacity = 0.9 * k;
  }

  dispose() {
    this.group.removeFromParent();
    this.drumGeo.dispose();
    this.ringGeo.dispose();
    this.coreMat.dispose();
    this.glowMat.dispose();
    this.ringMat.dispose();
  }
}
