// Update 0.2.23 — floor 2's wasps' hives (sim/dungeon/hives.ts) drawn: a papery hive on its wall, made in code (a lathe's
// bulb in pale bands, low-poly like the kit, its dark hole low on its front). A hit flashes it and shakes it; at its last
// it drops to the floor and lies there, dark. Back on its wall when the floor starts over.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import type { Hive } from '../sim/dungeon/hives';

const PAPER = 0xcdb98e;
const HOLE = 0x1c140c;
/** A hit's flash and shake (s); a fallen hive lies this high (its middle, m), this much darker. */
const FLASH = 0.14;
const LIE_Y = 0.42;
const DEAD = 0.45;
const GRAVITY = 14;

/** The bulb's outline (radius, height about its middle, m), bottom to top. */
const OUTLINE: [number, number][] = [
  [0, -0.56],
  [0.17, -0.53],
  [0.31, -0.45],
  [0.43, -0.32],
  [0.5, -0.16],
  [0.53, 0.02],
  [0.5, 0.2],
  [0.42, 0.36],
  [0.3, 0.48],
  [0.15, 0.57],
  [0, 0.6],
];

function hiveGeometry(): THREE.BufferGeometry {
  const geo = new THREE.LatheGeometry(
    OUTLINE.map(([r, y]) => new THREE.Vector2(r, y)),
    12,
  );
  // Pale and darker bands round it.
  const p = geo.getAttribute('position');
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = Math.floor((p.getY(i) + 0.6) / 0.13) % 2 === 0 ? 1 : 0.82;
    colors.set([k, k, k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo.toNonIndexed();
}

interface Look {
  group: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  hp: number;
  flash: number;
  fallen: boolean;
  vy: number;
}

export class HivesView {
  private readonly geo = hiveGeometry();
  private readonly holeGeo = new THREE.CircleGeometry(0.13, 10);
  private readonly holeMat = new THREE.MeshBasicMaterial({ color: HOLE });
  private readonly looks: Look[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    state: CombatState,
  ) {
    this.geo.computeVertexNormals();
    for (const h of state.hives) {
      const mat = new THREE.MeshStandardMaterial({ color: PAPER, vertexColors: true, roughness: 0.95, flatShading: true });
      const body = new THREE.Mesh(this.geo, mat);
      body.castShadow = body.receiveShadow = true;
      const hole = new THREE.Mesh(this.holeGeo, this.holeMat);
      hole.position.set(0, -0.3, 0.44);
      hole.rotation.x = 0.5;
      const group = new THREE.Group();
      group.add(body, hole);
      scene.add(group);
      this.looks.push({ group, mat, hp: h.hp, flash: 0, fallen: false, vy: 0 });
      this.place(h, this.looks[this.looks.length - 1]);
    }
  }

  /** On its wall, its hole to the room. */
  private place(h: Hive, k: Look) {
    k.group.position.copy(h.pos);
    k.group.rotation.set(0, Math.atan2(h.nx, h.nz), 0);
    k.mat.color.setHex(PAPER);
    k.fallen = false;
    k.vy = 0;
  }

  update(state: CombatState, dt: number) {
    state.hives.forEach((h, i) => {
      const k = this.looks[i];
      if (!k) return;
      if (h.hp < k.hp) k.flash = FLASH;
      if (h.hp > k.hp && !h.broken) this.place(h, k);
      k.hp = h.hp;
      k.flash = Math.max(0, k.flash - dt);
      k.mat.emissive.setScalar(k.flash > 0 ? 0.5 * (k.flash / FLASH) : 0);
      const g = k.group;
      if (h.broken) {
        // Falling, then lying on its side.
        if (!k.fallen) {
          k.fallen = true;
          k.mat.color.setHex(PAPER).multiplyScalar(DEAD);
        }
        if (g.position.y > LIE_Y) {
          k.vy -= GRAVITY * dt;
          g.position.y = Math.max(LIE_Y, g.position.y + k.vy * dt);
          g.position.x += h.nx * dt * 0.8;
          g.position.z += h.nz * dt * 0.8;
          g.rotation.x = Math.min(Math.PI / 2, g.rotation.x + dt * 4);
        }
        return;
      }
      const shake = k.flash > 0 ? Math.sin(k.flash * 90) * 0.06 : 0;
      g.position.set(h.pos.x + shake * h.nz, h.pos.y, h.pos.z - shake * h.nx);
    });
  }

  dispose() {
    for (const k of this.looks) {
      this.scene.remove(k.group);
      k.mat.dispose();
    }
    this.geo.dispose();
    this.holeGeo.dispose();
    this.holeMat.dispose();
  }
}
