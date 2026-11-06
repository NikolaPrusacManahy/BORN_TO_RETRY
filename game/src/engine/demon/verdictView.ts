// Update 0.3.73 — the Playable Demon's Last Verdict in the world (sim/combat/lastVerdict.ts): as the sword rises, the line it'll fall along burning out across
// the floor from your feet, where you're aiming; as it lands, a white sheet through everything, gone in a moment. Made in code.
import * as THREE from 'three';
import { CLEAVE_FOR } from '../../sim/combat/lastVerdict';
import type { CombatState } from '../../sim/combat/state';
import { DEMON } from '../../tuning/demon';

/** The sheet's height (m); the bright line in the middle of the band, how wide (m). */
const SHEET_HIGH = 18;
const CORE = 0.5;
/** Over the floor (m), so it doesn't flicker into it. */
const LIFT = 0.08;

const smooth = (x: number) => x * x * (3 - 2 * x);

export class VerdictView {
  readonly group = new THREE.Group();
  private readonly flatGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
  private readonly sheetGeo = new THREE.PlaneGeometry(1, 1);
  private readonly bandMat = new THREE.MeshBasicMaterial({ color: 0xff5a18, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly coreMat = new THREE.MeshBasicMaterial({ color: 0xffe8c8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly sheetMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly band = new THREE.Mesh(this.flatGeo, this.bandMat);
  private readonly core = new THREE.Mesh(this.flatGeo, this.coreMat);
  private readonly sheet = new THREE.Mesh(this.sheetGeo, this.sheetMat);

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.band.visible = this.core.visible = this.sheet.visible = false;
    this.band.frustumCulled = this.core.frustumCulled = this.sheet.frustumCulled = false;
    this.group.add(this.band, this.core, this.sheet);
  }

  /** The line's showing; the sheet is (for the tests). */
  get lined() {
    return this.band.visible;
  }

  get flashing() {
    return this.sheet.visible;
  }

  update(state: CombatState) {
    const b = state.blade;
    const v = DEMON.v;
    const rising = b.verdict && !b.verdictStruck;
    this.band.visible = this.core.visible = rising;
    if (rising) {
      const k = smooth(Math.min(1, b.verdictT / Math.max(0.05, v.verdictWindup)));
      for (const m of [this.band, this.core]) {
        m.position.set(b.verdictX, b.verdictY + LIFT, b.verdictZ);
        m.rotation.y = b.verdictYaw;
      }
      this.band.scale.set(v.verdictWidth * 2, 1, v.verdictLong * k);
      this.core.scale.set(CORE, 1, v.verdictLong * k);
      this.bandMat.opacity = 0.16 * k;
      this.coreMat.opacity = 0.85 * k;
    }
    const c = state.demonFire.cleave;
    this.sheet.visible = !!c;
    if (c) {
      const dx = c.bx - c.ax;
      const dz = c.bz - c.az;
      this.sheet.position.set((c.ax + c.bx) / 2, c.y + SHEET_HIGH / 2 - 1, (c.az + c.bz) / 2);
      this.sheet.rotation.y = Math.atan2(-dz, dx);
      this.sheet.scale.set(Math.hypot(dx, dz), SHEET_HIGH, 1);
      this.sheetMat.opacity = 0.95 * Math.max(0, c.left / CLEAVE_FOR);
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.flatGeo.dispose();
    this.sheetGeo.dispose();
    this.bandMat.dispose();
    this.coreMat.dispose();
    this.sheetMat.dispose();
  }
}
