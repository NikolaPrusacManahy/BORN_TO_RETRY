// Update 0.3.65 — Hellwarden put together in its show (the designer's shot list; sim/dungeon/wardenShow.ts): bare and molten as it rises, then each
// piece of armor flying in from the rock it was in and clamping on, red hot, cooling; its sword flying up out of the lava, dull; its skull floating
// up out of the pile, growing horns, and its eye igniting. The pieces in flight are copies baked from where they'll land, so they arrive exactly on
// it; on arrival the real one shows. At half health in the fight: its mask cracked, its second eye lit. Its boots and gauntlets are part of its body's
// mesh: told apart by the bones that carry them.
import * as THREE from 'three';
import { CLAMP_BOOTS, CLAMP_CHEST, CLAMP_GAUNTLETS, CLAMP_HIPS, CLAMP_PAULDRONS, FLIGHT, riverOpen, wardenBeats } from '../../sim/dungeon/wardenShow';
import type { Enemy } from '../../sim/enemies/enemy';
import { HALOS } from '../halos';
import { rockSpot } from './throneRocks';
import { bakeCopy, BOOTS, GAUNTLETS, measureBlade, type Parts, regionsOf } from './wardenBake';
import { WardenSkull } from './wardenSkull';
import { WardenSword } from './wardenSword';
import { createWardenUniforms, wardenPatch, type WardenUniforms } from './wardenShader';

/** A piece's way in: how hard it speeds up; a trail of this many flames. Red hot for this long (s). */
const SNAP = 2.2;
const TRAIL = 7;
const COOL = 1.5;
/** The other side's piece lands this much after (s): a double clang. */
const SECOND = 0.07;
/** Metal with no sky to reflect reads black: this much of it is metal. */
const METAL = 0.3;

interface Piece {
  clamp: number;
  rock: number;
  /** Its meshes and which of their vertices. */
  names: string[];
  region: number;
  side: number;
  fly: THREE.Mesh | null;
  to: THREE.Vector3;
  spin: THREE.Quaternion;
}

const piece = (clamp: number, rock: number, names: string[], region: number, side: number): Piece => ({ clamp, rock, names, region, side, fly: null, to: new THREE.Vector3(), spin: new THREE.Quaternion().setFromEuler(new THREE.Euler(rock * 1.7 + 1, rock * 2.3, rock * 0.9)) });

const PIECES: readonly Piece[] = [
  piece(CLAMP_BOOTS, 0, ['Hellwarden_Body'], BOOTS, -1),
  piece(CLAMP_BOOTS, 1, ['Hellwarden_Body'], BOOTS, 1),
  piece(CLAMP_GAUNTLETS, 2, ['Hellwarden_Body'], GAUNTLETS, -1),
  piece(CLAMP_GAUNTLETS, 3, ['Hellwarden_Body'], GAUNTLETS, 1),
  piece(CLAMP_HIPS, 4, ['Hellwarden_Hips', 'Hellwarden_Cuisses'], -1, 0),
  piece(CLAMP_CHEST, 5, ['Hellwarden_Torso', 'Hellwarden_Gorget'], -1, 0),
  piece(CLAMP_PAULDRONS, 6, ['Hellwarden_Pauldrons'], -1, -1),
  piece(CLAMP_PAULDRONS, 7, ['Hellwarden_Pauldrons'], -1, 1),
];

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? 1 - age / life : 0);

const v0 = new THREE.Vector3();
const v1 = new THREE.Vector3();
const IDENTITY = new THREE.Quaternion();
const mat = new THREE.Matrix4();
const scl = new THREE.Vector3();

export class WardenForge {
  readonly group = new THREE.Group();
  private parts: Parts | null = null;
  private readonly coneGeo = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0);
  private readonly flameMat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flames = new THREE.InstancedMesh(this.coneGeo, this.flameMat, 96);
  private flyMat: THREE.MeshStandardMaterial | null = null;
  private readonly flyU = createWardenUniforms();
  private readonly skull = new WardenSkull();
  private readonly sword = new WardenSword();
  private lastT = 1e9;
  private time = 0;
  private crack = 0;
  /** (For the tests and the render tool.) */
  readonly pieces = PIECES;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.flames.frustumCulled = false;
    this.flames.count = 0;
    this.flyU.uHot.value.set(1, 1, 1);
    this.flyU.uEye.value.set(0, 0);
    this.group.add(this.flames, this.skull.group, this.sword.group);
  }

  uniformsOf(name: string): WardenUniforms | undefined {
    return this.parts?.uniforms.get(name);
  }

  /** Every mesh its own uniforms; its body's regions worked out; its sword's blade measured. Once, per body. */
  private ready(root: THREE.Object3D): Parts {
    if (this.parts?.root === root) return this.parts;
    this.reset();
    const meshes = new Map<string, THREE.SkinnedMesh>();
    const uniforms = new Map<string, WardenUniforms>();
    root.traverse((o) => {
      if (!(o instanceof THREE.SkinnedMesh)) return;
      meshes.set(o.name, o);
      const g = o.geometry as THREE.BufferGeometry;
      if (!g.getAttribute('aRegion')) g.setAttribute('aRegion', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count), 1));
      const u = createWardenUniforms();
      const m = o.material as THREE.MeshStandardMaterial;
      m.metalness = METAL;
      wardenPatch(m, u);
      uniforms.set(o.name, u);
    });
    const body = meshes.get('Hellwarden_Body');
    if (body) regionsOf(body);
    const sword = meshes.get('Hellwarden_Sword');
    const su = uniforms.get('Hellwarden_Sword');
    if (sword && su) measureBlade(sword, su);
    const skull = uniforms.get('Hellwarden_Skull');
    if (skull) skull.uEyes.value = 1;
    this.parts = { root, meshes, uniforms };
    return this.parts;
  }

  /** `e`: it (its pose just done); `tip`: its sword's tip in its hand's frame. */
  update(e: Enemy, root: THREE.Object3D, dt: number, tip: THREE.Vector3 | null) {
    const p = this.ready(root);
    this.time += dt;
    for (const u of p.uniforms.values()) u.uTime.value = this.time;
    this.flyU.uTime.value = this.time;
    this.flames.count = 0;
    if (e.phase !== 'intro') this.fight(e, p, dt);
    else this.show(e, p, tip);
    this.flames.instanceMatrix.needsUpdate = true;
  }

  /** The fight: all of it on, its first eye lit; below half, its mask cracked and its second eye too. */
  private fight(e: Enemy, p: Parts, dt: number) {
    if (this.lastT < 1e9) this.reset();
    if (e.stage > 0) this.crack = Math.min(1, this.crack + dt / 0.5);
    else this.crack = 0;
    for (const [name, m] of p.meshes) {
      const u = p.uniforms.get(name)!;
      if (name !== 'Hellwarden_Sword') m.visible = true;
      u.uMolten.value.set(0, 0, 0);
      u.uHot.value.set(0, 0, 0);
      u.uHeat.value = 2;
      u.uRim.value = 0.55;
      if (name === 'Hellwarden_Skull') {
        u.uEyes.value = 1;
        u.uEye.value.set(1, this.crack);
        u.uCrack.value = this.crack;
      }
    }
  }

  private show(e: Enemy, p: Parts, tip: THREE.Vector3 | null) {
    const t = e.warden!.showT;
    if (t < this.lastT - 0.5) this.reset();
    this.lastT = t;
    const s = wardenBeats();
    const body = p.uniforms.get('Hellwarden_Body');
    const landed = (i: number, side = 0) => s.clamps[i] + (side > 0 ? SECOND : 0);
    const cool = (i: number) => Math.max(0, 1 - Math.max(0, t - landed(i)) / COOL) * (t >= landed(i) ? 1 : 0);
    if (body) {
      // Its skin cools once its chest is on.
      body.uMolten.value.set(1 - smooth((t - s.clamps[CLAMP_CHEST]) / (s.clamps[CLAMP_PAULDRONS] + 0.5 - s.clamps[CLAMP_CHEST])), t < s.clamps[CLAMP_BOOTS] ? 1 : 0, t < s.clamps[CLAMP_GAUNTLETS] ? 1 : 0);
      body.uHot.value.set(0, cool(CLAMP_BOOTS), cool(CLAMP_GAUNTLETS));
    }
    const on = (names: string[], clamp: number) => {
      for (const n of names) {
        const m = p.meshes.get(n);
        const u = p.uniforms.get(n);
        if (!m || !u) continue;
        m.visible = t >= s.clamps[clamp];
        u.uHot.value.setX(cool(clamp));
      }
    };
    on(['Hellwarden_Hips', 'Hellwarden_Cuisses'], CLAMP_HIPS);
    on(['Hellwarden_Torso', 'Hellwarden_Gorget'], CLAMP_CHEST);
    on(['Hellwarden_Pauldrons'], CLAMP_PAULDRONS);
    const rim = smooth((t - s.riseFrom) / 1) * (0.85 - 0.3 * smooth((t - s.landAt + 0.2) / 0.2));
    for (const u of p.uniforms.values()) u.uRim.value = rim;
    this.flyPieces(e, p, t);
    this.sword.update(e, p, t, tip, (names, to) => this.bake(p, names, -1, 0, to), () => this.flyMat, (at, when) => this.heatFlare(at, when));
    this.skull.update(e, p, t, (names, to) => this.bake(p, names, -1, 0, to), () => this.flyMat);
    if (t >= s.riseFrom && t < s.skullAt) this.lavaFlames(e, t);
  }

  /** Each piece from its rock, a trail behind it; the real one, as it lands; a flare where it lands. */
  private flyPieces(e: Enemy, p: Parts, t: number) {
    const s = wardenBeats();
    const fx = -Math.sin(e.facing);
    const fz = -Math.cos(e.facing);
    for (const c of PIECES) {
      const land = s.clamps[c.clamp] + (c.side > 0 ? SECOND : 0);
      const age = t - (land - FLIGHT);
      if (age < 0) {
        if (c.fly) c.fly.visible = false;
        continue;
      }
      if (!c.fly) {
        c.fly = this.bake(p, c.names, c.region, c.side, c.to);
        if (c.fly) this.group.add(c.fly);
      }
      if (!c.fly) continue;
      const k = age / FLIGHT;
      const flying = k < 1;
      c.fly.visible = flying;
      rockSpot(c.rock, e.pos.x, e.pos.z, fx, fz, v0);
      if (flying) {
        place(c.fly, v0, c.to, k, c.spin);
        for (let j = 1; j <= TRAIL && k - j * 0.04 > 0; j++) {
          pathAt(v0, c.to, k - j * 0.04, v1);
          this.flame(v1, 0.5 * (1 - j / TRAIL) + 0.12, 1.6 * (1 - j / TRAIL) + 0.3);
        }
      }
      const after = pulse(t - land, 0.3);
      if (after > 0) HALOS.add(c.to.x, c.to.y, c.to.z, 6 * after, 0xffc080, after);
    }
  }

  /** Flames licking up round it where it stands in the lava. */
  private lavaFlames(e: Enemy, t: number) {
    const k = riverOpen(t);
    if (k <= 0.02) return;
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + t * 0.7;
      const r = 1.3 + 0.5 * Math.sin(i * 2.3);
      v0.set(e.pos.x + Math.cos(a) * r, 0, e.pos.z + Math.sin(a) * r);
      this.flame(v0, 0.26 * k, (0.8 + 0.4 * Math.sin(t * 9 + i)) * k);
    }
  }

  /** The heat's front on its blade, as it comes: a flare and flames at its claws. */
  heatFlare(contact: THREE.Vector3, t: number) {
    HALOS.add(contact.x, contact.y, contact.z, 2.4, 0xffd8a0, 0.9);
    for (let i = 0; i < 5; i++) {
      v0.copy(contact);
      v0.x += Math.sin(t * 31 + i * 2.1) * 0.22;
      v0.y += Math.sin(t * 43 + i * 1.3) * 0.16;
      v0.z += Math.sin(t * 37 + i * 3.7) * 0.22;
      this.flame(v0, 0.1, 0.5);
    }
    this.flames.instanceMatrix.needsUpdate = true;
  }

  private flame(at: THREE.Vector3, width: number, high: number) {
    const n = this.flames.count;
    if (n >= this.flames.instanceMatrix.count) return;
    this.flames.setMatrixAt(n, mat.compose(at, IDENTITY, scl.set(width, high, width)));
    this.flames.count = n + 1;
  }

  /** A piece as it'll sit on it, in its flying look. */
  private bake(p: Parts, names: string[], region: number, side: number, to: THREE.Vector3): THREE.Mesh | null {
    return bakeCopy(p, names, region, side, to, (from) => {
      if (!this.flyMat) {
        this.flyMat = (from.material as THREE.MeshStandardMaterial).clone();
        this.flyMat.vertexColors = false;
        wardenPatch(this.flyMat, this.flyU);
      }
      return this.flyMat;
    });
  }

  private reset() {
    for (const c of PIECES) {
      if (!c.fly) continue;
      c.fly.removeFromParent();
      c.fly.geometry.dispose();
      c.fly = null;
    }
    this.sword.reset();
    this.skull.reset();
    this.lastT = 1e9;
    this.crack = 0;
  }

  clear() {
    this.flames.count = 0;
    this.reset();
  }

  dispose() {
    this.group.removeFromParent();
    this.reset();
    this.flames.dispose();
    this.coneGeo.dispose();
    this.flameMat.dispose();
    this.flyMat?.dispose();
  }
}

function pathAt(from: THREE.Vector3, to: THREE.Vector3, k: number, out: THREE.Vector3) {
  const e = k ** SNAP;
  out.lerpVectors(from, to, e);
  out.y += Math.sin(Math.PI * k) * 1.5;
  return out;
}

function place(fly: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, k: number, spin: THREE.Quaternion) {
  pathAt(from, to, k, fly.position);
  fly.quaternion.copy(spin).slerp(IDENTITY, k ** 1.4);
}

