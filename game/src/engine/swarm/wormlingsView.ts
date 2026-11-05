// Update 0.3.51 — The Swarm's big worms as you see them (sim/enemies/wormlings.ts): each a thick swaying column of flesh out
// of the floor, tapering to a blunt head, flashing when hit, falling away dead; the floor bulging and rippling where one is
// about to burst; a tether's strand of flesh from its head to the eye, pulsing, while it stands. One instanced mesh for all
// of them. Updated in place.
import * as THREE from 'three';
import { bulge, WORMLING_POOL, type Wormling, wormlingUp } from '../../sim/enemies/wormlings';

/** Balls up a worm, how thick at its foot and head (m), how far it sways (m). */
const BALLS = 11;
const FOOT = 0.72;
const HEAD = 0.5;
const SWAY = 0.45;
/** A bulge at its widest (m across, m high). */
const BULGE = 2.6;
const BULGE_UP = 0.55;

const FLESH = new THREE.Color(0xa22f3c);
const PALE = new THREE.Color(0xd86a76);
const WHITE = new THREE.Color(0xffffff);
const col = new THREE.Color();
const m = new THREE.Matrix4();
const at = new THREE.Vector3();
const size = new THREE.Vector3();
const q = new THREE.Quaternion();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class WormlingsView {
  readonly group = new THREE.Group();
  private readonly ball = new THREE.IcosahedronGeometry(1, 2);
  private readonly fleshMat = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.05 });
  private readonly bodies = new THREE.InstancedMesh(this.ball, this.fleshMat, WORMLING_POOL * BALLS);
  private readonly moundMat = new THREE.MeshStandardMaterial({ color: 0x6d2030, roughness: 0.5 });
  private readonly mounds = new THREE.InstancedMesh(this.ball, this.moundMat, WORMLING_POOL);
  private readonly strandGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0);
  private readonly strandMat = new THREE.MeshStandardMaterial({ color: 0xb8384a, roughness: 0.4, emissive: 0x7a1020 });
  private readonly strands: THREE.Mesh[] = [];
  private time = 0;

  constructor() {
    this.bodies.frustumCulled = this.mounds.frustumCulled = false;
    this.bodies.castShadow = true;
    // (Its colour attribute made once, so the shader has it before the first worm shows.)
    this.bodies.setColorAt(0, FLESH);
    this.group.add(this.bodies, this.mounds);
    for (let i = 0; i < WORMLING_POOL; i++) {
      const s = new THREE.Mesh(this.strandGeo, this.strandMat);
      s.frustumCulled = false;
      s.visible = false;
      this.strands.push(s);
      this.group.add(s);
    }
  }

  /** `eye`: where the eye is. */
  update(list: readonly Wormling[], eye: THREE.Vector3, dt: number) {
    this.time += dt;
    let n = 0;
    let mounds = 0;
    list.forEach((w, i) => {
      const strand = this.strands[i];
      strand.visible = false;
      if (!w.alive) return;
      const k = bulge(w);
      if (k >= 0) {
        const pulse = 0.85 + 0.15 * Math.sin(this.time * 18);
        m.compose(at.set(w.x, 0, w.z), q.identity(), size.set(BULGE * k * pulse, BULGE_UP * k * pulse, BULGE * k * pulse));
        this.mounds.setMatrixAt(mounds++, m);
      }
      if (w.top <= 0.02) return;
      const up = wormlingUp(w);
      for (let c = 0; c < BALLS; c++) {
        const u = c / (BALLS - 1);
        const sway = SWAY * u * Math.sin(this.time * 3 + u * 4 + i);
        const r = (FOOT + (HEAD - FOOT) * u) * (0.92 + 0.08 * Math.sin(this.time * 7 + u * 9));
        at.set(w.x + sway, w.top * u, w.z + SWAY * 0.6 * u * Math.cos(this.time * 2.3 + u * 3 + i));
        m.compose(at, q.identity(), size.set(r, r * 1.15, r));
        this.bodies.setMatrixAt(n, m);
        col.copy(w.dead >= 0 ? FLESH : u > 0.86 ? PALE : FLESH);
        if (w.dead >= 0) col.multiplyScalar(0.45);
        if (w.flash > 0) col.lerp(WHITE, Math.min(1, w.flash / 0.12));
        this.bodies.setColorAt(n, col);
        n++;
        if (c === BALLS - 1 && w.tether && up) {
          // Its strand of flesh to the eye.
          a.copy(at);
          b.subVectors(eye, a);
          const len = b.length();
          if (len > 0.1) {
            strand.visible = true;
            strand.position.copy(a);
            strand.quaternion.setFromUnitVectors(UP, b.divideScalar(len));
            const thick = 0.1 + 0.04 * Math.sin(this.time * 9 + i);
            strand.scale.set(thick, len, thick);
          }
        }
      }
    });
    this.bodies.count = n;
    this.mounds.count = mounds;
    this.bodies.instanceMatrix.needsUpdate = true;
    this.mounds.instanceMatrix.needsUpdate = true;
    if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    this.strandMat.emissiveIntensity = 0.7 + 0.5 * Math.sin(this.time * 9);
  }

  dispose() {
    this.ball.dispose();
    this.fleshMat.dispose();
    this.moundMat.dispose();
    this.strandGeo.dispose();
    this.strandMat.dispose();
    this.bodies.dispose();
    this.mounds.dispose();
  }
}
