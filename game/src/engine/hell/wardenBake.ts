// Update 0.3.65 — what Hellwarden's forge (wardenForge.ts) works with: its parts, a copy of a piece baked from the pose it'll land on, a copy held on a
// bone as that bone moves, which of its body's vertices are its boots and gauntlets (by the bones that carry them), where its blade runs.
import * as THREE from 'three';
import type { WardenUniforms } from './wardenShader';

/** Its body's regions (the shader's `aRegion`). */
export const SKIN = 0;
export const BOOTS = 1;
export const GAUNTLETS = 2;
const REGION_OF = /^(calf|foot|ball)_/;
const GAUNT_OF = /^lowerarm_/;

const mat = new THREE.Matrix4();

export interface Parts {
  root: THREE.Object3D;
  meshes: Map<string, THREE.SkinnedMesh>;
  uniforms: Map<string, WardenUniforms>;
}

/** Where a baked copy sits on the bone that'll carry it, as that bone moves on. */
export class Hold {
  private readonly at = new THREE.Vector3();
  private readonly inv = new THREE.Quaternion();
  private readonly q = new THREE.Quaternion();
  private readonly w = new THREE.Vector3();
  fix(bone: THREE.Object3D, middle: THREE.Vector3) {
    bone.getWorldQuaternion(this.q);
    this.inv.copy(this.q).invert();
    bone.getWorldPosition(this.w);
    this.at.copy(middle).sub(this.w).applyQuaternion(this.inv);
  }
  place(bone: THREE.Object3D, pos: THREE.Vector3, turn: THREE.Quaternion) {
    bone.getWorldQuaternion(this.q);
    bone.getWorldPosition(pos);
    pos.add(this.w.copy(this.at).applyQuaternion(this.q));
    turn.copy(this.q).multiply(this.inv);
  }
}

/** The way from a copy's middle to its point furthest along `along`. */
export function farthest(fly: THREE.Mesh, along: THREE.Vector3): THREE.Vector3 {
  const at = fly.geometry.getAttribute('position');
  const p = new THREE.Vector3();
  const best = new THREE.Vector3(0, 1, 0);
  let far = -Infinity;
  const toTip = along.clone().negate().normalize();
  for (let i = 0; i < at.count; i++) {
    p.fromBufferAttribute(at, i);
    const d = p.dot(toTip);
    if (d > far) {
      far = d;
      best.copy(p);
    }
  }
  return best.normalize();
}

/** A piece as it'll sit on it: its vertices where they are now (its pose), about their middle (`to`), one mesh. */
export function bakeCopy(p: Parts, names: string[], region: number, side: number, to: THREE.Vector3, material: (from: THREE.SkinnedMesh) => THREE.Material): THREE.Mesh | null {
  const pos: number[] = [];
  const uv: number[] = [];
  const bind: number[] = [];
  const idx: number[] = [];
  const at = new THREE.Vector3();
  let first: THREE.SkinnedMesh | null = null;
  for (const name of names) {
    const m = p.meshes.get(name);
    if (!m) continue;
    m.updateMatrixWorld(true);
    const g = m.geometry as THREE.BufferGeometry;
    const pa = g.getAttribute('position');
    const ua = g.getAttribute('uv');
    const ra = g.getAttribute('aRegion');
    const ix = g.getIndex();
    const map = new Map<number, number>();
    const count = ix ? ix.count : pa.count;
    const keep = (v: number) => (region < 0 || ra.getX(v) === region) && (side === 0 || Math.sign(pa.getX(v)) === side);
    for (let i = 0; i < count; i += 3) {
      const a = ix ? ix.getX(i) : i;
      const b = ix ? ix.getX(i + 1) : i + 1;
      const c = ix ? ix.getX(i + 2) : i + 2;
      if (!keep(a) || !keep(b) || !keep(c)) continue;
      for (const v of [a, b, c]) {
        let n = map.get(v);
        if (n === undefined) {
          n = pos.length / 3;
          map.set(v, n);
          m.getVertexPosition(v, at).applyMatrix4(m.matrixWorld);
          pos.push(at.x, at.y, at.z);
          uv.push(ua.getX(v), ua.getY(v));
          bind.push(pa.getX(v), pa.getY(v));
        }
        idx.push(n);
      }
    }
    first ??= m;
  }
  if (!pos.length || !first) return null;
  to.set(0, 0, 0);
  const n = pos.length / 3;
  for (let i = 0; i < n; i++) to.add(at.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
  to.multiplyScalar(1 / n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] -= to.x;
    pos[i * 3 + 1] -= to.y;
    pos[i * 3 + 2] -= to.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aRegion', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const fly = new THREE.Mesh(geo, material(first));
  fly.frustumCulled = false;
  fly.castShadow = true;
  fly.position.copy(to);
  fly.userData.bind = new Float32Array(bind);
  return fly;
}

/** Which of its body's vertices are its boots and its gauntlets, by the bone that carries most of each. */
export function regionsOf(body: THREE.SkinnedMesh) {
  const g = body.geometry as THREE.BufferGeometry;
  const at = g.getAttribute('aRegion') as THREE.BufferAttribute;
  const si = g.getAttribute('skinIndex');
  const sw = g.getAttribute('skinWeight');
  if (!si || !sw) return;
  const bones = body.skeleton.bones;
  for (let i = 0; i < at.count; i++) {
    let best = 0;
    for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
    const name = bones[si.getComponent(i, best)]?.name ?? '';
    at.setX(i, REGION_OF.test(name) ? BOOTS : GAUNT_OF.test(name) ? GAUNTLETS : SKIN);
  }
  at.needsUpdate = true;
}

/** Where its blade runs in its mesh's own measure: from its hand to its furthest point. */
export function measureBlade(sword: THREE.SkinnedMesh, u: WardenUniforms) {
  const g = sword.geometry as THREE.BufferGeometry;
  const at = g.getAttribute('position');
  const si = g.getAttribute('skinIndex');
  const hand = new THREE.Vector3();
  const inv = sword.skeleton.boneInverses[si.getComponent(0, 0)];
  hand.setFromMatrixPosition(mat.copy(inv).invert());
  hand.applyMatrix4(mat.copy(sword.bindMatrix).invert());
  const p = new THREE.Vector3();
  let far = 0;
  const tip = new THREE.Vector3();
  for (let i = 0; i < at.count; i++) {
    p.fromBufferAttribute(at, i);
    const d = p.distanceToSquared(hand);
    if (d > far) {
      far = d;
      tip.copy(p);
    }
  }
  u.uBladeFrom.value.copy(hand);
  u.uBladeDir.value.copy(tip).sub(hand).normalize();
  u.uBladeLen.value = Math.max(0.01, Math.sqrt(far));
}
