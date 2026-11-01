// Update 0.3.7 (the designer: "Punched enemies launching into the air and splatting against walls") — a body thrown
// into a wall leaves its blood on it: a splat where it hit, bigger the faster it came, and smaller ones round it, each
// turned its own way. They stay as the floor's splats do (the Options' Blood setting: none when off; one, and shorter,
// when less), then shrink away. Its look is the enemy's (bloodLooks.ts); bones and spores leave none. Made in code (the
// floor splats' drawing, bloodFx.ts). The drops and the pool under the body are bloodFx.ts's.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import type { Enemy } from '../sim/enemies/enemy';
import { LAUNCH } from '../tuning/launch';
import { bloodNow, splatTexture } from './bloodFx';
import { bloodOf } from './bloodLooks';

const MAX = 48;
/** The splat's size at Splat speed (m), and more for each m/s faster; how far off the wall it sits (m); how far a
 *  body may be from where it hit (m). */
const SIZE = 1.1;
const PER_SPEED = 0.06;
const OFF = 0.02;
const NEAR = 1.5;

interface Mark {
  t: number;
  life: number;
  size: number;
  at: THREE.Vector3;
  turn: THREE.Quaternion;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const roll = new THREE.Quaternion();
const normal = new THREE.Vector3();
const at = new THREE.Vector3();
const scale = new THREE.Vector3();
const color = new THREE.Color();
const FACE = new THREE.Vector3(0, 0, 1);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

export class WallSplatFx {
  private readonly geo = new THREE.PlaneGeometry(1, 1);
  private readonly tex = splatTexture();
  private readonly mat = new THREE.MeshStandardMaterial({ map: this.tex, transparent: true, depthWrite: false, roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -2 });
  private readonly mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX);
  private readonly marks: Mark[] = Array.from({ length: MAX }, () => ({ t: 0, life: 0, size: 0, at: new THREE.Vector3(), turn: new THREE.Quaternion() }));
  private next = 0;
  private busy = false;

  constructor(private readonly scene: THREE.Scene) {
    this.tex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < MAX; i++) {
      this.mesh.setMatrixAt(i, HIDDEN);
      this.mesh.setColorAt(i, color.setHex(0xffffff));
    }
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  /** This frame's wall splats (before the events are cleared). */
  apply(state: CombatState) {
    const amount = bloodNow();
    if (!amount) return;
    const ev = state.events;
    for (let i = 0; i < ev.length; i++) {
      const e = ev.at(i);
      if (e.kind !== 'wallSplat') continue;
      const foe = nearest(state, e.x, e.z);
      if (!foe) continue;
      const look = bloodOf(foe.kind);
      if (look.mode !== 'drip' || !look.splat) continue;
      // The wall faces the body.
      normal.set(foe.pos.x - e.x, 0, foe.pos.z - e.z);
      if (normal.lengthSq() < 1e-6) continue;
      normal.normalize();
      const size = SIZE + PER_SPEED * Math.max(0, e.value - LAUNCH.v.splatSpeed);
      this.mark(at.set(e.x, e.y, e.z), size, look.splat, amount.life);
      // Smaller ones round it, along the wall and up and down.
      for (let k = 0; k < (amount.pools ? 3 : 0); k++) {
        const along = (Math.random() - 0.5) * size * 1.6;
        at.set(e.x - normal.z * along, e.y + (Math.random() - 0.45) * size, e.z + normal.x * along);
        this.mark(at, size * (0.25 + Math.random() * 0.25), look.splat, amount.life);
      }
    }
  }

  private mark(p: THREE.Vector3, size: number, hex: number, life: number) {
    const i = this.next;
    this.next = (i + 1) % MAX;
    const s = this.marks[i];
    s.t = 0;
    s.life = life;
    s.size = size;
    s.at.copy(p).addScaledVector(normal, OFF + i * 0.0002);
    s.turn.copy(roll.setFromAxisAngle(normal, Math.random() * Math.PI * 2)).multiply(q.setFromUnitVectors(FACE, normal));
    this.mesh.setColorAt(i, color.setHex(hex));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.busy = true;
  }

  update(dt: number) {
    if (!this.busy) return;
    this.busy = false;
    this.marks.forEach((s, i) => {
      if (s.life <= 0) return;
      s.t += dt;
      if (s.t >= s.life) s.life = 0;
      // (Shrinking away in its last 3 s.)
      const size = s.life > 0 ? s.size * Math.min(1, (s.life - s.t) / 3) : 0;
      this.mesh.setMatrixAt(i, size > 0 ? m.compose(s.at, s.turn, scale.set(size, size, 1)) : HIDDEN);
      this.busy ||= s.life > 0;
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geo.dispose();
    this.mat.dispose();
    this.tex.dispose();
  }
}

/** The body nearest (x, z), live or lying (none further than NEAR). */
function nearest(state: CombatState, x: number, z: number): Enemy | null {
  let best: Enemy | null = null;
  let near = NEAR;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.pos.x - x, e.pos.z - z);
    if (d < near) {
      near = d;
      best = e;
    }
  }
  return best;
}
