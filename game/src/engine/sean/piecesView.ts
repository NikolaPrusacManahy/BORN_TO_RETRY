// Update 0.3.82 — what Gravity Sean's Grab shows in the world (sim/combat/gravityGrab.ts). Made in code, placeholders: the piece he holds and those he's thrown, as rough stone; the craters
// a chunk of floor leaves; the faint outline on what you could take (the bible: "grabbable objects get a faint outline when you aim at them").
import * as THREE from 'three';
import { ROCKS, CRATERS } from '../../sim/combat/gravityMeter';
import type { CombatState } from '../../sim/combat/state';
import { SEAN } from '../../tuning/sean';

const STONE = 0x6e675d;
const OUTLINE = 0xa79dff;
/** Over the floor (m), so they don't flicker into it. */
const CRATER_UP = 0.025;
const RING_UP = 0.04;
/** How bright the outline is: on a pillar, on the floor (which is always there: fainter). */
const ON_PILLAR = 0.55;
const ON_FLOOR = 0.16;

/** A lump of stone: a sphere with its corners pushed about, the same each time. */
function rockGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  const seen = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let k = seen.get(key);
    if (k === undefined) {
      const s = Math.sin(p.getX(i) * 12.9 + p.getY(i) * 78.2 + p.getZ(i) * 37.7) * 43758.5;
      k = 0.78 + 0.34 * (s - Math.floor(s));
      seen.set(key, k);
    }
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

export class PiecesView {
  private readonly rockGeo = rockGeometry();
  private readonly stone = new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.95, flatShading: true });
  private readonly held = new THREE.Mesh(this.rockGeo, this.stone);
  private readonly flying: THREE.Mesh[] = [];
  private readonly craterGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  private readonly craterRimGeo = new THREE.RingGeometry(0.82, 1.14, 20).rotateX(-Math.PI / 2);
  private readonly craterMat = new THREE.MeshBasicMaterial({ color: 0x0b0908, transparent: true, opacity: 0.86, depthWrite: false });
  private readonly rimMat = new THREE.MeshStandardMaterial({ color: 0x3b352e, roughness: 1, transparent: true, opacity: 0.9, depthWrite: false });
  private readonly craters: THREE.Group[] = [];
  private readonly outlineMat = new THREE.LineBasicMaterial({ color: OUTLINE, transparent: true, opacity: ON_PILLAR, depthWrite: false, toneMapped: false });
  private readonly boxLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), this.outlineMat);
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: OUTLINE, transparent: true, opacity: ON_FLOOR, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  private readonly ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32).rotateX(-Math.PI / 2), this.ringMat);
  private spin = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.held.visible = false;
    this.held.castShadow = true;
    scene.add(this.held);
    for (let i = 0; i < ROCKS; i++) {
      const m = new THREE.Mesh(this.rockGeo, this.stone);
      m.visible = false;
      m.castShadow = true;
      this.flying.push(m);
      scene.add(m);
    }
    for (let i = 0; i < CRATERS; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(this.craterRimGeo, this.rimMat), new THREE.Mesh(this.craterGeo, this.craterMat));
      g.visible = false;
      this.craters.push(g);
      scene.add(g);
    }
    this.boxLines.visible = this.ring.visible = false;
    scene.add(this.boxLines, this.ring);
  }

  update(state: CombatState, dt: number) {
    const g = state.grav;
    this.spin += dt;
    const h = g.held;
    this.held.visible = !!h;
    if (h) {
      this.held.position.copy(h.at);
      this.held.scale.setScalar(h.r);
      this.held.rotation.set(this.spin * 0.7, this.spin * 0.45, 0);
    }
    g.rocks.forEach((r, i) => {
      const m = this.flying[i];
      m.visible = r.alive;
      if (!r.alive) return;
      m.position.copy(r.pos);
      m.scale.setScalar(r.r);
      m.rotation.x += dt * 6;
      m.rotation.z += dt * 4;
    });
    g.craters.forEach((c, i) => {
      const m = this.craters[i];
      m.visible = c.on;
      if (!c.on) return;
      m.position.set(c.x, c.y + CRATER_UP, c.z);
      m.scale.setScalar(c.r);
    });
    this.aimed(state);
  }

  /** The faint outline on what you could take. */
  private aimed(state: CombatState) {
    const g = state.grav;
    const free = state.sean && !g.unstable && !g.held && g.grabWait <= 0;
    const p = free && g.aim.pillar >= 0 ? state.pillars[g.aim.pillar] : null;
    this.boxLines.visible = !!p;
    this.ring.visible = free && !p;
    if (p) {
      const y = g.aim.y;
      this.boxLines.position.set(p.x, y + p.h / 2, p.z);
      this.boxLines.scale.set(p.half * 2 + 0.06, p.h, p.half * 2 + 0.06);
    } else if (free) {
      this.ring.position.set(g.aim.x, g.aim.y + RING_UP, g.aim.z);
      this.ring.scale.setScalar(SEAN.v.craterSize);
    }
  }

  /** (For the tests.) */
  get showing() {
    return { held: this.held.visible, rocks: this.flying.filter((m) => m.visible).length, craters: this.craters.filter((m) => m.visible).length, onPillar: this.boxLines.visible, onFloor: this.ring.visible };
  }

  dispose() {
    this.scene.remove(this.held, this.boxLines, this.ring, ...this.flying, ...this.craters);
    this.rockGeo.dispose();
    this.stone.dispose();
    this.craterGeo.dispose();
    this.craterRimGeo.dispose();
    this.craterMat.dispose();
    this.rimMat.dispose();
    this.outlineMat.dispose();
    this.boxLines.geometry.dispose();
    this.ringMat.dispose();
    this.ring.geometry.dispose();
  }
}
