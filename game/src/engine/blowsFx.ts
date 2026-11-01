// Update 0.2.28 — your blows seen (the graphics update's third part): a swing leaves an arc in front of you (silver for
// a sword, gold for the gold ones, a broad dark sweep for a hammer, thin and quick for daggers), each the other way to
// the last, sweeping on as it fades; where a punch lands, a ring of dust bursts out facing you (wider for a heavy, a
// finisher, a slam's blow); a hammer's smash throws rocks and dust up off the floor. Update 0.3.3 — a parry rings gold
// where the shot was caught. Made in code. Out of
// combatFeedback.ts, which had reached its size (it still shakes, kicks and sparks).
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { WEAPON_KINDS, WeaponKind } from '../sim/weapons/catalog';

const ARCS = 4;
const RINGS = 10;
const ROCKS = 120;
/** An arc's life (s), how far it sweeps on as it fades (rad), how far in front of the eye (m). */
const ARC_LIFE = 0.2;
const ARC_SWEEP = 0.9;
const ARC_OUT = 1.1;
/** A dust ring's life (s) and its size at the end (m: a jab's; heavier blows wider). */
const RING_LIFE = 0.2;
const RING = 0.8;
const GRAVITY = 16;
/** A dust ring's colour; a parry's ring's (Update 0.3.3). */
const DUST = 0xe8dcc4;
const PARRY_RING = 0xffc040;

/** Each weapon's arc: its colour, radius (m), width (share of the radius) and how much of a circle it spans (rad). */
interface ArcLook {
  color: number;
  radius: number;
  width: number;
  span: number;
}

const SILVER: ArcLook = { color: 0xe8f0ff, radius: 0.95, width: 0.2, span: 2.4 };
const GOLD: ArcLook = { color: 0xffd36a, radius: 1, width: 0.22, span: 2.5 };
const HEAVY: ArcLook = { color: 0xc8b090, radius: 1.05, width: 0.38, span: 2.2 };
const THIN: ArcLook = { color: 0xf4f8ff, radius: 0.85, width: 0.09, span: 1.8 };

const ARC_OF: Partial<Record<WeaponKind, ArcLook>> = { sword: SILVER, goldSword: GOLD, goldAxe: GOLD, hammer: HEAVY, goldHammer: { ...HEAVY, color: 0xffc85a }, daggers: THIN, goldDaggers: { ...THIN, color: 0xffd98a } };

/** How wide a blow's dust ring grows (times RING; 0: none). */
const RING_OF: Partial<Record<string, number>> = { hitJab: 1, hitFinisher: 1.4, hitHeavy: 1.9, hitSlam: 1.6 };

interface Arc {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  way: number;
  roll: number;
}

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  size: number;
}

interface Rock {
  t: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Euler;
  size: number;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const scale = new THREE.Vector3();
const at = new THREE.Vector3();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const glow = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

export class BlowsFx {
  /** Rides with the camera: the arcs are drawn in it. */
  private readonly view = new THREE.Group();
  private readonly arcs: Arc[] = [];
  private readonly rings: Ring[] = [];
  private readonly rocks: Rock[] = Array.from({ length: ROCKS }, () => ({ t: 1, life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Euler(), size: 0.1 }));
  private readonly arcGeos = new Map<ArcLook, THREE.BufferGeometry>();
  private readonly ringGeo = new THREE.RingGeometry(0.75, 1, 28);
  private readonly rockGeo = new THREE.DodecahedronGeometry(1, 0);
  private readonly rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 1, flatShading: true });
  private readonly rockMesh = new THREE.InstancedMesh(this.rockGeo, this.rockMat, ROCKS);
  private nextArc = 0;
  private nextRing = 0;
  private nextRock = 0;
  private way = 1;
  /** Update 0.3.0 — rocks out (none: nothing to step). */
  private rocking = false;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    for (let i = 0; i < ARCS; i++) {
      const mat = glow(0xffffff);
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.visible = false;
      this.view.add(mesh);
      this.arcs.push({ mesh, mat, t: ARC_LIFE, way: 1, roll: 0 });
    }
    for (let i = 0; i < RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: DUST, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.rings.push({ mesh, mat, t: RING_LIFE, size: 1 });
    }
    for (let i = 0; i < ROCKS; i++) this.rockMesh.setMatrixAt(i, HIDDEN);
    this.rockMesh.frustumCulled = false;
    this.rockMesh.castShadow = true;
    scene.add(this.view, this.rockMesh);
  }

  /** The arc of a swing of `look` (its geometry made once). */
  private arcGeo(look: ArcLook): THREE.BufferGeometry {
    let g = this.arcGeos.get(look);
    if (!g) {
      g = new THREE.RingGeometry(look.radius * (1 - look.width), look.radius, 32, 1, -look.span / 2, look.span);
      this.arcGeos.set(look, g);
    }
    return g;
  }

  /** This frame's swings, blows and smashes (before the events are cleared). */
  apply(state: CombatState) {
    const ev = state.events;
    for (let i = 0; i < ev.length; i++) {
      const e = ev.at(i);
      if (e.kind === 'slash') {
        const look = ARC_OF[WEAPON_KINDS[e.value]];
        if (look) this.swing(look);
      } else if (e.kind === 'smash') this.smash(at.set(e.x, e.y, e.z));
      else if (e.kind === 'parry') this.ring(at.set(e.x, e.y, e.z), 2.2, PARRY_RING);
      else if (RING_OF[e.kind]) this.ring(at.set(e.x, e.y, e.z), RING_OF[e.kind]! * (e.kind === 'hitHeavy' ? 0.6 + 0.4 * Math.min(1, e.value) : 1));
    }
  }

  private swing(look: ArcLook) {
    const a = this.arcs[this.nextArc];
    this.nextArc = (this.nextArc + 1) % ARCS;
    // Each the other way to the last, tilted a little.
    this.way = -this.way;
    a.mesh.geometry = this.arcGeo(look);
    a.mat.color.setHex(look.color);
    a.t = 0;
    a.way = this.way;
    a.roll = (Math.random() - 0.5) * 0.6;
    a.mesh.visible = true;
  }

  private ring(p: THREE.Vector3, size: number, hex = DUST) {
    const r = this.rings[this.nextRing];
    this.nextRing = (this.nextRing + 1) % RINGS;
    r.mat.color.setHex(hex);
    r.t = 0;
    r.size = RING * size;
    r.mesh.position.copy(p);
    r.mesh.visible = true;
  }

  /** Rocks and dust thrown up off the floor round `p`. */
  private smash(p: THREE.Vector3) {
    for (let k = 0; k < 22; k++) {
      const i = this.nextRock;
      this.nextRock = (i + 1) % ROCKS;
      const r = this.rocks[i];
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 1.5;
      r.pos.set(p.x + Math.cos(a) * d, Math.max(0.05, p.y), p.z + Math.sin(a) * d);
      r.vel.set(Math.cos(a) * (1.5 + Math.random() * 3), 4 + Math.random() * 5, Math.sin(a) * (1.5 + Math.random() * 3));
      r.spin.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      r.size = 0.06 + Math.random() * 0.12;
      r.t = 0;
      r.life = 1.2 + Math.random() * 0.8;
    }
    this.rocking = true;
    for (let k = 0; k < 3; k++) this.ring(at.set(p.x, Math.max(0.1, p.y) + 0.1 * k, p.z), 2.6 + k);
  }

  /** `dt`: game time (stops in hit-stop). */
  update(dt: number) {
    this.view.position.copy(this.camera.position);
    this.view.quaternion.copy(this.camera.quaternion);
    for (const a of this.arcs) {
      if (!a.mesh.visible) continue;
      a.t += dt;
      const k = a.t / ARC_LIFE;
      if (k >= 1) {
        a.mesh.visible = false;
        continue;
      }
      // A crescent across your view (its middle low), tilted, sweeping on its way as it fades.
      a.mesh.position.set(0, 0.1, -ARC_OUT);
      a.mesh.rotation.set(0, 0, -Math.PI / 2 + a.roll + a.way * (ARC_SWEEP * k - ARC_SWEEP / 2));
      a.mat.opacity = 0.75 * (1 - k * k);
    }
    for (const r of this.rings) {
      if (!r.mesh.visible) continue;
      r.t += dt;
      const k = r.t / RING_LIFE;
      if (k >= 1) {
        r.mesh.visible = false;
        continue;
      }
      // Facing you, growing, fading.
      r.mesh.quaternion.copy(this.camera.quaternion);
      r.mesh.scale.setScalar(r.size * (0.25 + 0.75 * Math.sqrt(k)));
      r.mat.opacity = 0.7 * (1 - k);
    }
    if (!this.rocking) return;
    this.rocks.forEach((r, i) => {
      if (r.t >= r.life) {
        this.rockMesh.setMatrixAt(i, HIDDEN);
        return;
      }
      r.t += dt;
      r.vel.y -= GRAVITY * dt;
      r.pos.addScaledVector(r.vel, dt);
      if (r.pos.y < r.size) {
        // A bounce, losing most of it.
        r.pos.y = r.size;
        r.vel.set(r.vel.x * 0.5, Math.abs(r.vel.y) * 0.3, r.vel.z * 0.5);
      }
      r.spin.x += dt * 5;
      const k = Math.min(1, (r.life - r.t) / 0.3);
      this.rockMesh.setMatrixAt(i, m.compose(r.pos, q.setFromEuler(r.spin), scale.setScalar(r.size * k)));
    });
    this.rockMesh.instanceMatrix.needsUpdate = true;
    this.rocking = this.rocks.some((r) => r.t < r.life);
  }

  /** Arcs, rings and rocks showing (for tests). */
  counts() {
    return { arcs: this.arcs.filter((a) => a.mesh.visible).length, rings: this.rings.filter((r) => r.mesh.visible).length, rocks: this.rocks.filter((r) => r.t < r.life).length };
  }

  dispose() {
    this.scene.remove(this.view, this.rockMesh);
    for (const r of this.rings) this.scene.remove(r.mesh);
    for (const g of this.arcGeos.values()) g.dispose();
    this.ringGeo.dispose();
    this.rockGeo.dispose();
    this.rockMat.dispose();
    for (const x of [...this.arcs, ...this.rings]) x.mat.dispose();
  }
}
