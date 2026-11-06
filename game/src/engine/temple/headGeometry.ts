// Update 0.3.58 — a little head of the Drowned King's, made in code: an upper jaw (dark on top, yellow eyes, teeth) and a lower one
// (pale, teeth), each hinged at the origin and running along +y to its nose, the upper over +z. Inside, each is dark red, so an open
// mouth reads as one. The same shapes, big, are its Maw of Many. Coloured by vertex; flat shaded, like its body.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TOP = new THREE.Color(0x1f5a70);
const BELLY = new THREE.Color(0xc9c3a4);
const INSIDE = new THREE.Color(0x5a0f18);
const TOOTH = new THREE.Color(0xf4f0e0);
const EYE = new THREE.Color(0xf2d640);

/** Paints a whole geometry one colour (non-indexed). */
function paint(g: THREE.BufferGeometry, c: THREE.Color): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

/** Half of a stretched ball: the side away from the mouth, its flat at z = 0; 1 long along +y from the hinge, `wide` either side,
 *  `deep` out along ±z (`sign`). */
function shell(sign: number, wide: number, deep: number, c: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2).toNonIndexed();
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = (p.getY(i) + 1) / 2;
    // (Narrower to its nose.)
    const taper = 1 - 0.55 * y * y;
    p.setXYZ(i, p.getX(i) * wide * taper, y, Math.max(0, p.getZ(i) * sign) * sign * deep * taper);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return paint(g, c);
}

/** The mouth's inside: the flat of a shell, dark red, a hair in from it. */
function inside(sign: number, wide: number): THREE.BufferGeometry {
  const g = new THREE.CircleGeometry(1, 10).toNonIndexed();
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = (p.getY(i) + 1) / 2;
    p.setXYZ(i, p.getX(i) * wide * (1 - 0.55 * y * y) * 0.96, y * 0.98, -sign * 0.002);
  }
  if (sign < 0) g.rotateY(0);
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return paint(g, INSIDE);
}

/** Teeth round its rim, pointing across the mouth (−`sign` along z). */
function teeth(sign: number, wide: number, size: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const n = 9;
  for (let k = 0; k < n; k++) {
    const a = -1.25 + (2.5 * k) / (n - 1);
    const y = 0.24 + 0.74 * Math.cos(a * 0.9);
    const x = Math.sin(a) * wide * (1 - 0.55 * y * y) * 0.95;
    const cone = new THREE.ConeGeometry(size * 0.5, size, 4).toNonIndexed();
    cone.rotateX((-sign * Math.PI) / 2);
    cone.translate(x, y, (-sign * size) / 2);
    cone.deleteAttribute('uv');
    cone.computeVertexNormals();
    out.push(paint(cone, TOOTH));
  }
  return out;
}

/** Its upper jaw: over +z. */
export function upperJaw(): THREE.BufferGeometry {
  const parts = [shell(1, 0.42, 0.34, TOP), inside(1, 0.42), ...teeth(1, 0.42, 0.11)];
  for (const s of [-1, 1]) {
    const eye = new THREE.IcosahedronGeometry(0.075, 0).toNonIndexed();
    eye.translate(s * 0.3, 0.32, 0.2);
    eye.deleteAttribute('uv');
    eye.computeVertexNormals();
    parts.push(paint(eye, EYE));
  }
  const merged = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  return merged;
}

/** Its lower jaw: under, −z. */
export function lowerJaw(): THREE.BufferGeometry {
  const parts = [shell(-1, 0.38, 0.2, BELLY), inside(-1, 0.38), ...teeth(-1, 0.38, 0.09)];
  const merged = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  return merged;
}

/** The material the jaws want. */
export const jawMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, flatShading: true, side: THREE.DoubleSide });
