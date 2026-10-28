// Update 0.1.2 — an enemy cut into pieces (an execution's torn arm, chopped leg, half, or burst): its own skinned model
// split where its bones divide (each triangle goes with the bone that moves it most), worked out once per kind. When a
// piece comes off, its shape is taken from the body as it's posed that moment (each vertex skinned, as the GPU would)
// and it's a plain mesh after: held in a hand, then flung, falling, bouncing, lying on the floor a while.
import * as THREE from 'three';
import type { EnemyKind } from '../../sim/enemies/kinds';

/** Seconds a piece lies about once free; its fall (m/s²); how much of its speed a bounce keeps. */
const LIFE = 6;
const GRAVITY = 18;
const BOUNCE = 0.3;

interface Part {
  mesh: THREE.Mesh;
  /** Which of the body's skinned meshes (in order) it comes from, and its vertices there. */
  src: number;
  verts: Uint32Array;
}

interface Piece {
  group: THREE.Group;
  parts: Part[];
  /** Off (hidden), held in a hand, or free. */
  state: 'off' | 'held' | 'free';
  /** Held: from the hand to its middle. */
  offset: THREE.Vector3;
  vel: THREE.Vector3;
  axis: THREE.Vector3;
  spin: number;
  age: number;
  /** How far its middle is above its lowest point (it lies on the floor by that). */
  low: number;
}

const v = new THREE.Vector3();
const mid = new THREE.Vector3();
const q = new THREE.Quaternion();

export class Pieces {
  readonly group = new THREE.Group();
  private readonly kinds: Partial<Record<EnemyKind, Piece[]>> = {};

  /** `kind`'s pieces (built from `root`, a body of it, the first time): each of `specs` (bones and all below them), and
   *  the rest of it last. */
  of(kind: EnemyKind, root: THREE.Object3D, specs: readonly (readonly string[])[]): Piece[] {
    const have = this.kinds[kind];
    if (have) return have;
    const skinned = skinnedOf(root);
    const pieces: Piece[] = [];
    for (let p = 0; p <= specs.length; p++) {
      pieces.push({ group: new THREE.Group(), parts: [], state: 'off', offset: new THREE.Vector3(), vel: new THREE.Vector3(), axis: new THREE.Vector3(0, 1, 0), spin: 0, age: 0, low: 0 });
      this.group.add(pieces[p].group);
      pieces[p].group.visible = false;
    }
    skinned.forEach((mesh, src) => {
      // Each bone's piece: the deepest spec it's under (the rest: specs.length).
      const bones = mesh.skeleton.bones;
      const pieceOf = new Int32Array(bones.length).fill(specs.length);
      specs.forEach((names, p) => {
        for (const name of names) {
          const top = bones.find((b) => b.name === name);
          top?.traverse((o) => {
            const at = bones.indexOf(o as THREE.Bone);
            if (at >= 0) pieceOf[at] = p;
          });
        }
      });
      const g = mesh.geometry;
      const si = g.attributes.skinIndex;
      const sw = g.attributes.skinWeight;
      const count = g.attributes.position.count;
      const vertPiece = new Int32Array(count);
      for (let i = 0; i < count; i++) {
        let best = 0;
        let w = -1;
        for (let k = 0; k < 4; k++) {
          const wk = sw.getComponent(i, k);
          if (wk > w) {
            w = wk;
            best = si.getComponent(i, k);
          }
        }
        vertPiece[i] = pieceOf[best];
      }
      const index = g.index ? g.index.array : Array.from({ length: count }, (_, i) => i);
      for (let p = 0; p <= specs.length; p++) {
        const map = new Map<number, number>();
        const tris: number[] = [];
        for (let i = 0; i + 2 < index.length; i += 3) {
          if (vertPiece[index[i]] !== p) continue;
          for (let k = 0; k < 3; k++) {
            const old = index[i + k];
            if (!map.has(old)) map.set(old, map.size);
            tris.push(map.get(old)!);
          }
        }
        if (!tris.length) continue;
        const verts = new Uint32Array(map.size);
        map.forEach((to, from) => (verts[to] = from));
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(map.size * 3), 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(map.size * 3), 3));
        const uv = g.attributes.uv;
        if (uv) {
          const uvs = new Float32Array(map.size * 2);
          for (let k = 0; k < map.size; k++) {
            uvs[k * 2] = uv.getX(verts[k]);
            uvs[k * 2 + 1] = uv.getY(verts[k]);
          }
          geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        }
        geo.setIndex(tris);
        const part = new THREE.Mesh(geo, mesh.material);
        part.castShadow = true;
        part.frustumCulled = false;
        pieces[p].group.add(part);
        pieces[p].parts.push({ mesh: part, src, verts });
      }
    });
    this.kinds[kind] = pieces;
    return pieces;
  }

  /** Piece `p` comes off `root` (posed now): its shape taken, shown where it is. */
  take(piece: Piece, root: THREE.Object3D) {
    const skinned = skinnedOf(root);
    root.updateMatrixWorld(true);
    mid.set(0, 0, 0);
    let n = 0;
    for (const part of piece.parts) {
      const mesh = skinned[part.src];
      part.mesh.material = mesh.material;
      const pos = part.mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < part.verts.length; k++) {
        mesh.getVertexPosition(part.verts[k], v).applyMatrix4(mesh.matrixWorld);
        pos.setXYZ(k, v.x, v.y, v.z);
        mid.add(v);
        n++;
      }
    }
    mid.divideScalar(Math.max(1, n));
    let low = Infinity;
    for (const part of piece.parts) {
      const pos = part.mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) {
        pos.setXYZ(k, pos.getX(k) - mid.x, pos.getY(k) - mid.y, pos.getZ(k) - mid.z);
        low = Math.min(low, pos.getY(k));
      }
      pos.needsUpdate = true;
      part.mesh.geometry.computeVertexNormals();
      part.mesh.geometry.computeBoundingSphere();
    }
    piece.low = Math.min(0.5, -low * 0.5);
    piece.group.position.copy(mid);
    piece.group.quaternion.identity();
    piece.group.visible = true;
    piece.age = 0;
    piece.state = 'free';
  }

  /** Held in a hand at `hand` (world): it keeps where it is from there. */
  hold(piece: Piece, hand: THREE.Vector3) {
    piece.state = 'held';
    piece.offset.subVectors(piece.group.position, hand);
  }

  /** Let go (or flung) at `vel` (world, m/s), tumbling at `spin` (rad/s) about a way of its own (`seed`). */
  free(piece: Piece, vel: THREE.Vector3, spin: number, seed: number) {
    piece.state = 'free';
    piece.vel.copy(vel);
    piece.axis.set(Math.sin(seed * 12.9), Math.cos(seed * 7.3), Math.sin(seed * 3.1 + 1)).normalize();
    piece.spin = spin;
    piece.age = 0;
  }

  /** Each frame: held ones follow their hand (`handOf`), free ones fall onto the floor (`floor`: its height). */
  update(dt: number, floor: number) {
    for (const pieces of Object.values(this.kinds)) {
      for (const p of pieces ?? []) {
        if (p.state !== 'free') continue;
        p.age += dt;
        if (p.age > LIFE) {
          p.state = 'off';
          p.group.visible = false;
          continue;
        }
        p.vel.y -= GRAVITY * dt;
        p.group.position.addScaledVector(p.vel, dt);
        p.group.quaternion.premultiply(q.setFromAxisAngle(p.axis, p.spin * dt));
        if (p.group.position.y < floor + p.low) {
          p.group.position.y = floor + p.low;
          if (p.vel.y < 0) p.vel.y = -p.vel.y * BOUNCE;
          p.vel.x *= 0.6;
          p.vel.z *= 0.6;
          p.spin *= 0.5;
        }
      }
    }
  }

  /** A held piece placed at its hand. */
  follow(piece: Piece, hand: THREE.Vector3) {
    piece.group.position.addVectors(hand, piece.offset);
  }

  /** All put away (a new execution). */
  clear() {
    for (const pieces of Object.values(this.kinds)) for (const p of pieces ?? []) {
      p.state = 'off';
      p.group.visible = false;
    }
  }
}

/** A body's skinned meshes, in order (kept on it). */
export function skinnedOf(root: THREE.Object3D): THREE.SkinnedMesh[] {
  let list = root.userData.skinned as THREE.SkinnedMesh[] | undefined;
  if (!list) {
    list = [];
    root.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) list!.push(o);
    });
    root.userData.skinned = list;
  }
  return list;
}

export type { Piece };
