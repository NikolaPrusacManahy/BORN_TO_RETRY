// M1 — draws an arena from its data: gray boxes with a 1 m grid on every face (so speed is easy to read),
// glowing jump pads, spike strips, light and fog.
import * as THREE from 'three';
import type { Arena, BoxKind } from '../world/arena';

const TINT: Record<BoxKind, number> = {
  floor: 0x57525e,
  wall: 0x3b3842,
  block: 0x6a6170,
  ramp: 0x7c5c52,
  accent: 0x8c3b30,
  hazard: 0x4a1a1c,
  lava: 0xff5a10,
};

/** M1 step 8 — spike spacing on hazard strips (m) and spike height. */
const SPIKE_GAP = 0.5;
const SPIKE_HEIGHT = 0.3;

export const FOG_COLOR = 0x16131a;

/** A 1 m tile: a dark fill with light edges and a fainter half-metre line. */
function gridTexture(renderer: THREE.WebGLRenderer): THREE.Texture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9c4cf';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#a9a3b0';
  g.fillRect(size / 2 - 1, 0, 2, size);
  g.fillRect(0, size / 2 - 1, size, 2);
  g.fillStyle = '#efeaf2';
  g.fillRect(0, 0, size, 4);
  g.fillRect(0, 0, 4, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/** A box whose UVs repeat once per metre on every face. */
function gridBox(w: number, h: number, d: number): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // Face order: +x, -x, +y, -y, +z, -z; 4 vertices each. Each face's (u, v) spans two of the box's sizes.
  const spans: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face++) {
    for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, uv.getX(i) * spans[face][0], uv.getY(i) * spans[face][1]);
  }
  uv.needsUpdate = true;
  return geo;
}

export interface ArenaView {
  group: THREE.Group;
  dispose(): void;
}

export function buildArenaView(scene: THREE.Scene, arena: Arena, renderer: THREE.WebGLRenderer): ArenaView {
  const group = new THREE.Group();
  const tex = gridTexture(renderer);
  const mats = new Map<BoxKind, THREE.MeshStandardMaterial>();
  const matFor = (kind: BoxKind) => {
    let m = mats.get(kind);
    if (!m) mats.set(kind, (m = new THREE.MeshStandardMaterial({ color: TINT[kind], map: tex, roughness: 0.92, metalness: 0 })));
    return m;
  };

  for (const b of arena.boxes) {
    const mesh = new THREE.Mesh(gridBox(b.w, b.h, b.d), matFor(b.kind));
    mesh.position.set(b.x, b.y, b.z);
    if (b.quat) mesh.quaternion.set(b.quat[0], b.quat[1], b.quat[2], b.quat[3]);
    mesh.castShadow = b.kind !== 'floor';
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Spikes on every hazard strip: one instanced cone per spot (drawing only; the strip is the collider).
  const hazards = arena.boxes.filter((b) => b.kind === 'hazard');
  const spots: THREE.Vector3[] = [];
  for (const h of hazards) {
    const nx = Math.max(1, Math.floor(h.w / SPIKE_GAP));
    const nz = Math.max(1, Math.floor(h.d / SPIKE_GAP));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) spots.push(new THREE.Vector3(h.x - h.w / 2 + (i + 0.5) * (h.w / nx), h.y + h.h / 2 + SPIKE_HEIGHT / 2, h.z - h.d / 2 + (j + 0.5) * (h.d / nz)));
  }
  const spikeMat = new THREE.MeshStandardMaterial({ color: 0xc9c2cc, emissive: 0x5a0d10, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.6 });
  if (spots.length) {
    const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.13, SPIKE_HEIGHT, 6), spikeMat, spots.length);
    const m = new THREE.Matrix4();
    spots.forEach((p, i) => spikes.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    spikes.castShadow = true;
    group.add(spikes);
  }

  const padMat = new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff5a10, emissiveIntensity: 1.4, roughness: 0.4 });
  for (const p of arena.pads) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(p.radius, p.radius, 0.08, 32), padMat);
    pad.position.set(p.x, p.y + 0.04, p.z);
    pad.receiveShadow = true;
    group.add(pad);
  }

  const hemi = new THREE.HemisphereLight(0xbfb6cf, 0x1c1519, 0.9);
  const sun = new THREE.DirectionalLight(0xffe0c4, 1.7);
  sun.position.set(18, 40, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -36;
  sc.right = sc.top = 36;
  sc.near = 1;
  sc.far = 100;
  sun.shadow.bias = -0.0005;
  group.add(hemi, sun);

  scene.add(group);
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, 35, 110);

  return {
    group,
    dispose() {
      scene.remove(group);
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      mats.forEach((m) => m.dispose());
      padMat.dispose();
      spikeMat.dispose();
      tex.dispose();
    },
  };
}
