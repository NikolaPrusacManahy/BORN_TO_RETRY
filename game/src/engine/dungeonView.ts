// Update 0.0.12 — draws a dungeon floor from the Modular Dungeon Pack kit (public/models/dungeon/kit.glb): every
// placement from world/dungeon/dressing.ts as instanced meshes (one per kit piece and material, so a floor of
// thousands of pieces stays cheap), the gates' iron bars (they crash down when a room shuts and sink back into the
// floor when it's cleared), the jump pads, the glow over the way down, dim cold light and fog, and a handful of warm
// torch lights that follow you from torch to torch (no shadows: torchlight and fog carry the mood).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { DungeonLevel } from '../world/dungeon/assemble';
import { BARS_SCALE, dress, Dressing, KIT, Placement } from '../world/dungeon/dressing';
import type { ArenaView } from './arenaView';

export const KIT_URL = '/models/dungeon/kit.glb';
const FOG = 0x0b090e;
/** Torch lights that follow you, and how often they move to the nearest torches (s). */
const LIGHTS = 6;
const RELIGHT = 0.25;
/** Bars: how fast they crash down and sink back (m/s); how far below the floor they hide (m). */
const SLAM_SPEED = 30;
const SINK_SPEED = 6;
const HIDDEN = -4.4;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class DungeonView implements ArenaView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  private readonly dressing: Dressing;
  private readonly bars: THREE.Object3D[] = [];
  private readonly barsY: number[] = [];
  private readonly lights: THREE.PointLight[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private relight = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly level: DungeonLevel,
    loadKit = true,
  ) {
    this.dressing = dress(level.plan);
    scene.add(this.group);
    scene.background = new THREE.Color(FOG);
    scene.fog = new THREE.Fog(FOG, 14, 62);
    this.group.add(new THREE.HemisphereLight(0x8d86a8, 0x1a1216, 0.55));
    for (let i = 0; i < LIGHTS; i++) {
      const l = new THREE.PointLight(0xff9a48, 30, 16, 1.6);
      this.lights.push(l);
      this.group.add(l);
    }
    this.pads();
    this.exitGlow();
    this.loaded = loadKit
      ? new GLTFLoader()
          .loadAsync(KIT_URL)
          .then((gltf) => this.build(gltf.scene))
          .catch((err) => console.error('dungeon kit failed to load', err))
      : Promise.resolve();
  }

  /** Every placement as instances of its kit piece; the gates' bars as their own meshes. */
  build(kit: THREE.Object3D) {
    kit.updateMatrixWorld(true);
    const byPiece = new Map<string, Placement[]>();
    for (const p of this.dressing.pieces) {
      let list = byPiece.get(p.piece);
      if (!list) byPiece.set(p.piece, (list = []));
      list.push(p);
    }
    for (const [name, list] of byPiece) {
      const root = kit.getObjectByName(name);
      if (!root) {
        console.warn(`dungeon kit: no ${name}`);
        continue;
      }
      const inv = root.matrixWorld.clone().invert();
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const local = inv.clone().multiply(o.matrixWorld);
        const mat = this.material(o.material as THREE.MeshStandardMaterial);
        const inst = new THREE.InstancedMesh(o.geometry, mat, list.length);
        list.forEach((p, i) => {
          pos.set(p.x, p.y, p.z);
          q.setFromAxisAngle(UP, p.rot);
          scale.set(p.sx, p.sy, p.sz);
          inst.setMatrixAt(i, m.compose(pos, q, scale).multiply(local));
        });
        inst.computeBoundingSphere();
        this.group.add(inst);
      });
    }
    const bars = kit.getObjectByName(KIT.bars);
    if (bars) {
      for (const g of this.dressing.gates) {
        const b = bars.clone();
        b.position.set(g.x, HIDDEN, g.z);
        b.rotation.y = g.rot;
        b.scale.set(...BARS_SCALE);
        b.traverse((o) => {
          if (o instanceof THREE.Mesh) o.material = this.material(o.material as THREE.MeshStandardMaterial);
        });
        this.group.add(b);
        this.bars.push(b);
        this.barsY.push(HIDDEN);
      }
    }
  }

  /** The kit's flat colours, a little rough; fire glows. */
  private material(src: THREE.MeshStandardMaterial): THREE.Material {
    const mat = src.clone();
    mat.roughness = 0.9;
    mat.metalness = 0;
    if (/fire|candle/i.test(src.name)) {
      mat.emissive.copy(src.color);
      mat.emissiveIntensity = 2.2;
    }
    this.mats.push(mat);
    return mat;
  }

  private pads() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3ad6ff, emissive: 0x20a8ff, emissiveIntensity: 1.6, roughness: 0.4 });
    const geo = new THREE.CylinderGeometry(0.85, 0.85, 0.08, 28);
    this.mats.push(mat);
    this.geos.push(geo);
    for (const p of this.level.arena.pads) {
      const pad = new THREE.Mesh(geo, mat);
      pad.position.set(p.x, p.y + 0.04, p.z);
      this.group.add(pad);
    }
  }

  private exitGlow() {
    const e = this.level.exit;
    const mat = new THREE.MeshBasicMaterial({ color: 0x9a4dff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    const geo = new THREE.CylinderGeometry(1.6, 1.6, 0.05, 32);
    this.mats.push(mat);
    this.geos.push(geo);
    const glow = new THREE.Mesh(geo, mat);
    glow.position.set(e.x, 0.06, e.z);
    const light = new THREE.PointLight(0xa060ff, 40, 12, 1.5);
    light.position.set(e.x, 1.2, e.z);
    this.group.add(glow, light);
  }

  /** `shut`: each gate (as level.gates) shut or open; `at`: the camera, for the torch lights. */
  update(dt: number, shut: readonly boolean[], at: THREE.Vector3) {
    for (let i = 0; i < this.bars.length; i++) {
      const want = shut[i] ? 0 : HIDDEN;
      const y = this.barsY[i];
      this.barsY[i] = want > y ? Math.min(want, y + SLAM_SPEED * dt) : Math.max(want, y - SINK_SPEED * dt);
      this.bars[i].position.y = this.barsY[i];
      this.bars[i].visible = this.barsY[i] > HIDDEN + 0.01;
    }
    this.relight -= dt;
    if (this.relight > 0) return;
    this.relight = RELIGHT;
    // The nearest torches get the lights (a few comparisons; nothing made per frame).
    const t = this.dressing.torches;
    for (let k = 0; k < this.lights.length; k++) {
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < t.length; i++) {
        const d = (t[i].x - at.x) ** 2 + (t[i].z - at.z) ** 2;
        if (d >= bestD) continue;
        let used = false;
        for (let j = 0; j < k; j++) used ||= this.lights[j].userData.torch === i;
        if (!used) {
          bestD = d;
          best = i;
        }
      }
      const l = this.lights[k];
      l.visible = best >= 0;
      l.userData.torch = best;
      if (best >= 0) l.position.set(t[best].x, t[best].y, t[best].z);
    }
  }

  dispose() {
    this.scene.remove(this.group);
    for (const mat of this.mats) mat.dispose();
    for (const g of this.geos) g.dispose();
    this.scene.fog = null;
  }
}
