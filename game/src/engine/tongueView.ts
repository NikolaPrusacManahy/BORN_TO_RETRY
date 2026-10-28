// Update 0.0.18 — the Frog's tongue: a pink rope from its mouth to the lash's end, shooting out fast and drawn back
// over the lash's moment (sim/enemies/frog.ts). One per enemy slot, reused.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { ENEMY_POOL } from '../sim/enemies/enemy';
import { mouthOf, TONGUE_TIME } from '../sim/enemies/frog';

/** Out by this share of the lash, back over the rest; its thickness (m). */
const OUT = 0.25;
const THICK = 0.09;

const UP = new THREE.Vector3(0, 1, 0);
const mouth = new THREE.Vector3();
const dir = new THREE.Vector3();

export class TongueView {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0);
  private readonly mat = new THREE.MeshStandardMaterial({ color: 0xe8607a, emissive: 0x501020, roughness: 0.5 });
  private readonly ropes: THREE.Mesh[] = [];

  constructor() {
    for (let i = 0; i < ENEMY_POOL; i++) {
      const m = new THREE.Mesh(this.geo, this.mat);
      m.visible = false;
      this.ropes.push(m);
      this.group.add(m);
    }
  }

  update(state: CombatState) {
    for (let i = 0; i < this.ropes.length; i++) {
      const e = state.enemies[i];
      const rope = this.ropes[i];
      rope.visible = e.alive && e.kind === 'frog' && e.phase === 'recover' && e.t < TONGUE_TIME;
      if (!rope.visible) continue;
      const k = e.t / TONGUE_TIME;
      const out = k < OUT ? k / OUT : 1 - (k - OUT) / (1 - OUT);
      mouthOf(e, mouth);
      dir.subVectors(e.aim, mouth);
      const len = dir.length() * out;
      rope.position.copy(mouth);
      rope.quaternion.setFromUnitVectors(UP, dir.normalize());
      rope.scale.set(THICK, Math.max(0.01, len), THICK);
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
