// Update 0.3.82 — what Gravity Sean's Grab shows in the world (sim/combat/gravityGrab.ts). Made in code, placeholders: the piece he holds and those he's thrown, as rough stone; the craters
// a chunk of floor leaves; the faint outline on what you could take (the bible: "grabbable objects get a faint outline when you aim at them").
// Update 0.3.86 — held, the rocks flying in from round the room, each staying as a lump on the mass, which turns; a ring of gravity round it once it's growing. Thrown, it keeps its lumps.
import * as THREE from 'three';
import { ROCKS, CRATERS, COMING, type Rock } from '../../sim/combat/gravityMeter';
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
/** The lumps on a mass: at most this many on each; the share of its size the core takes up, how far out they sit, how big each is. */
const LUMPS = 14;
const CORE = 0.74;
const LUMP_OUT = 0.78;
const LUMP_SIZE = 0.32;
/** A rock flying in (m): from far off it has to show. */
const COMING_SIZE = 0.42;
const LUMP_MAX = LUMPS * (ROCKS + 1) + COMING;
/** The ring round a growing mass: its size, a share of the mass's. */
const AURA = 1.32;
/** Update 0.3.89 — a crater this big or bigger has rubble round its rim: how many pieces, at most, in all; how many to each. */
const RUBBLE_FROM = 1.5;
const RUBBLE = 96;
const RUBBLE_EACH = 16;
/** Golden angle, for spreading lumps round a ball. */
const TURN = Math.PI * (3 - Math.sqrt(5));

/** A lump of stone: a sphere with its corners pushed about, the same each time. */
export function rockGeometry(): THREE.BufferGeometry {
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

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const at = new THREE.Vector3();
const s = new THREE.Vector3();
const ONE = new THREE.Quaternion();

export class PiecesView {
  private readonly rockGeo = rockGeometry();
  private readonly stone = new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.95, flatShading: true });
  private readonly held = new THREE.Mesh(this.rockGeo, this.stone);
  private readonly flying: THREE.Mesh[] = [];
  private readonly lumps = new THREE.InstancedMesh(this.rockGeo, this.stone, LUMP_MAX);
  private readonly rubble = new THREE.InstancedMesh(this.rockGeo, this.stone, RUBBLE);
  private readonly auraGeo = new THREE.TorusGeometry(1, 0.03, 6, 48);
  private readonly auraMat = new THREE.MeshBasicMaterial({ color: OUTLINE, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly aura = new THREE.Mesh(this.auraGeo, this.auraMat);
  private readonly craterGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  private readonly craterRimGeo = new THREE.RingGeometry(0.82, 1.14, 20).rotateX(-Math.PI / 2);
  private readonly craterMat = new THREE.MeshBasicMaterial({ color: 0x0b0908, transparent: true, opacity: 0.86, depthWrite: false });
  private readonly rimMat = new THREE.MeshStandardMaterial({ color: 0x3b352e, roughness: 1, transparent: true, opacity: 0.9, depthWrite: false });
  private readonly holes = new THREE.InstancedMesh(this.craterGeo, this.craterMat, CRATERS);
  private readonly rims = new THREE.InstancedMesh(this.craterRimGeo, this.rimMat, CRATERS);
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
      const r = new THREE.Mesh(this.rockGeo, this.stone);
      r.visible = false;
      r.castShadow = true;
      this.flying.push(r);
      scene.add(r);
    }
    for (const list of [this.lumps, this.holes, this.rims, this.rubble]) {
      list.count = 0;
      list.frustumCulled = false;
    }
    this.lumps.castShadow = true;
    this.boxLines.visible = this.ring.visible = this.aura.visible = false;
    // (It turns round the upright, tilted.)
    this.aura.rotation.order = 'YXZ';
    scene.add(this.lumps, this.holes, this.rims, this.rubble, this.boxLines, this.ring, this.aura);
  }

  update(state: CombatState, dt: number) {
    const g = state.grav;
    this.spin += dt;
    let n = 0;
    // (Update 0.3.89 — lifted, it's massView.ts's.)
    const h = g.held && !g.held.lifted ? g.held : null;
    this.held.visible = !!h;
    this.aura.visible = !!h && h.gathered > 0;
    if (h) {
      this.held.position.copy(h.at);
      this.held.scale.setScalar(h.r * (h.gathered > 0 ? CORE : 1));
      this.held.rotation.set(this.spin * 0.7, this.spin * 0.45, 0);
      n = this.onMass(n, h.at, h.r, h.gathered, this.spin * 0.7);
      this.aura.position.copy(h.at);
      this.aura.scale.setScalar(h.r * AURA);
      this.aura.rotation.set(1.25 + 0.2 * Math.sin(this.spin), this.spin * 1.6, 0);
    }
    for (const c of g.coming) {
      if (!c.on || n >= LUMP_MAX) continue;
      e.set(this.spin * 5 + c.from.x, this.spin * 4 + c.from.z, 0);
      this.lumps.setMatrixAt(n++, m.compose(c.at, q.setFromEuler(e), s.setScalar(COMING_SIZE)));
    }
    g.rocks.forEach((r, i) => {
      n = this.flown(n, r, this.flying[i], dt);
    });
    this.lumps.count = n;
    this.lumps.instanceMatrix.needsUpdate = true;
    let c = 0;
    for (const k of g.craters) {
      if (!k.on) continue;
      at.set(k.x, k.y + CRATER_UP, k.z);
      m.compose(at, ONE, s.setScalar(k.r));
      this.holes.setMatrixAt(c, m);
      this.rims.setMatrixAt(c, m);
      c++;
    }
    this.holes.count = this.rims.count = c;
    this.holes.instanceMatrix.needsUpdate = this.rims.instanceMatrix.needsUpdate = true;
    this.rimRubble(state);
    this.aimed(state);
  }

  /** Update 0.3.89 — what a big crater threw up round its rim. */
  private rimRubble(state: CombatState) {
    let n = 0;
    state.grav.craters.forEach((k, i) => {
      if (!k.on || k.r < RUBBLE_FROM) return;
      for (let j = 0; j < RUBBLE_EACH && n < RUBBLE; j++) {
        const a = j * TURN + i;
        const out = k.r * (0.98 + 0.24 * Math.abs(Math.sin(j * 12.9 + i)));
        const size = k.r * (0.07 + 0.09 * Math.abs(Math.sin(j * 4.1 + i * 2)));
        at.set(k.x + Math.cos(a) * out, k.y + size * 0.3, k.z + Math.sin(a) * out);
        e.set(j * 1.7, j * 2.3, i);
        this.rubble.setMatrixAt(n++, m.compose(at, q.setFromEuler(e), s.setScalar(size)));
      }
    });
    this.rubble.count = n;
    this.rubble.instanceMatrix.needsUpdate = true;
  }

  /** The lumps on a mass, spread round it, turning with it. */
  private onMass(n: number, centre: THREE.Vector3, r: number, count: number, turn: number): number {
    const shown = Math.min(LUMPS, count);
    for (let i = 0; i < shown && n < LUMP_MAX; i++) {
      const y = 1 - ((i + 0.5) / LUMPS) * 2;
      const round = Math.sqrt(Math.max(0, 1 - y * y));
      const a = i * TURN + turn;
      at.set(Math.cos(a) * round, y, Math.sin(a) * round).multiplyScalar(r * LUMP_OUT).add(centre);
      e.set(i * 1.7 + turn, i * 2.3, 0);
      this.lumps.setMatrixAt(n++, m.compose(at, q.setFromEuler(e), s.setScalar(r * LUMP_SIZE)));
    }
    return n;
  }

  /** One thrown. */
  private flown(n: number, r: Rock, mesh: THREE.Mesh, dt: number): number {
    mesh.visible = r.alive;
    if (!r.alive) return n;
    mesh.position.copy(r.pos);
    mesh.scale.setScalar(r.r * (r.lumps > 0 ? CORE : 1));
    mesh.rotation.x += dt * 6;
    mesh.rotation.z += dt * 4;
    return this.onMass(n, r.pos, r.r, r.lumps, mesh.rotation.x);
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
    return { held: this.held.visible, rocks: this.flying.filter((r) => r.visible).length, craters: this.holes.count, onPillar: this.boxLines.visible, onFloor: this.ring.visible, lumps: this.lumps.count, aura: this.aura.visible };
  }

  dispose() {
    this.scene.remove(this.held, this.boxLines, this.ring, this.aura, this.lumps, this.holes, this.rims, this.rubble, ...this.flying);
    this.rubble.dispose();
    this.rockGeo.dispose();
    this.stone.dispose();
    this.lumps.dispose();
    this.holes.dispose();
    this.rims.dispose();
    this.auraGeo.dispose();
    this.auraMat.dispose();
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
