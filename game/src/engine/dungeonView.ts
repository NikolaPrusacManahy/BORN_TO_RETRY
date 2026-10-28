// Update 0.0.12 — draws a dungeon floor from the Modular Dungeon Pack kit (public/models/dungeon/kit.glb): every
// placement from world/dungeon/dressing.ts as instanced meshes (one per kit piece and material, so a floor of
// thousands of pieces stays cheap), the gates' iron bars (they crash down when a room shuts and sink back into the
// floor when it's cleared), the jump pads, the glow over the way down, dim cold light and fog, and a handful of warm
// torch lights that follow you from torch to torch (no shadows: torchlight and fog carry the mood).
// Update 0.0.13 — the fog pushed back and two more torch lights, for rooms twice the size. Then day time (the designer:
// way too dark to play): the dungeon is open to the sky, so a sun overhead (its shadows follow you), a bright sky light
// filling the shade, a pale haze far off instead of black fog; the torches stay as warm accents. Dungeon light tab.
// The walls and ledges have solid dark cores and the floor a dark slab under it, so no notch between the kit's pieces
// shows the sky.
// Update 0.0.15 — the boss room: its walls sliding back (boss/shell.ts), the portal (boss/portal.ts), the wooden gate
// and the dark beyond it (boss/woodGate.ts), all following the room's show; no more glow over a trapdoor.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { portalOpen, wallsOpen } from '../sim/dungeon/bossRoom';
import type { DungeonRun } from '../sim/dungeon/roomLoop';
import { CINEMA } from '../tuning/cinema';
import type { DungeonLevel } from '../world/dungeon/assemble';
import { BARS_SCALE, dress, Dressing, KIT, Placement } from '../world/dungeon/dressing';
import { LIGHT } from '../tuning/light';
import type { ArenaView } from './arenaView';
import { Portal } from './boss/portal';
import { Shell } from './boss/shell';
import { WoodGate } from './boss/woodGate';

export const KIT_URL = '/models/dungeon/kit.glb';
/** The sky (the background and the haze), and the sky light's colours above and from the ground. */
const SKY = 0xc8d8e8;
const SKY_LIGHT = 0xe8f0ff;
const GROUND_LIGHT = 0x7d6a55;
/** The sun's colour; the way to it (from the ground: high, a little to the south-west); how far round you its
 *  shadows reach (m). */
const SUN = 0xfff0d6;
const SUN_DIR = new THREE.Vector3(-0.45, 1, 0.35).normalize();
const SHADOW_REACH = 40;
/** The cores' colour (the kit's darkest brick, Wall_Dark, linear) and the under-floor slab's (the floor's, darker); how
 *  far under the floor the slab is (m). */
const CORE = new THREE.Color().setRGB(0.196, 0.147, 0.096);
const UNDER = new THREE.Color().setRGB(0.045, 0.043, 0.062);
/** Update 0.0.15 — the boss room's sliding walls: dark masses seen from above (their faces are brick). */
const SHELL = new THREE.Color().setRGB(0.06, 0.048, 0.04);
const UNDER_Y = -0.45;
/** Torch lights that follow you, and how often they move to the nearest torches (s). */
const LIGHTS = 8;
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
  private readonly sky: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly haze: THREE.Fog;
  private readonly shell: Shell;
  private readonly portal: Portal;
  private readonly woodGate: WoodGate;
  private relight = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly level: DungeonLevel,
    loadKit = true,
  ) {
    this.dressing = dress(level.plan);
    scene.add(this.group);
    scene.background = new THREE.Color(SKY);
    this.haze = new THREE.Fog(SKY, LIGHT.v.hazeNear, LIGHT.v.hazeFar);
    scene.fog = this.haze;
    this.sky = new THREE.HemisphereLight(SKY_LIGHT, GROUND_LIGHT, LIGHT.v.sky);
    this.sun = new THREE.DirectionalLight(SUN, LIGHT.v.sun);
    this.sun.castShadow = LIGHT.v.shadows >= 1;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -SHADOW_REACH;
    sc.right = sc.top = SHADOW_REACH;
    sc.near = 1;
    sc.far = 200;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.group.add(this.sky, this.sun, this.sun.target);
    for (let i = 0; i < LIGHTS; i++) {
      const l = new THREE.PointLight(0xff9a48, LIGHT.v.torches, 16, 1.6);
      this.lights.push(l);
      this.group.add(l);
    }
    this.pads();
    const box = this.solid();
    const b = level.boss;
    const shellMat = new THREE.MeshStandardMaterial({ color: SHELL, roughness: 1 });
    this.mats.push(shellMat);
    this.shell = new Shell(b.start, b.end, shellMat, box);
    this.portal = new Portal(b.portal);
    this.woodGate = new WoodGate(scene, b, `FLOOR ${level.plan.level + 1}`);
    this.group.add(this.shell.group, this.portal.group);
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
        // Update 0.0.13 — in the sun: everything takes shadows; the floor tiles cast none (they're flat and most of
        // the pieces).
        inst.castShadow = name !== KIT.floor;
        inst.receiveShadow = true;
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
          if (!(o instanceof THREE.Mesh)) return;
          o.material = this.material(o.material as THREE.MeshStandardMaterial);
          o.castShadow = o.receiveShadow = true;
        });
        this.group.add(b);
        this.bars.push(b);
        this.barsY.push(HIDDEN);
      }
    }
    this.shell.build(kit, (src) => this.material(src));
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

  /** The walls' and ledges' cores, and the slab under the whole floor. Returns the unit box (the boss room's sliding
   *  walls are made of it too). */
  private solid(): THREE.BufferGeometry {
    const cores = this.dressing.cores;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const coreMat = new THREE.MeshStandardMaterial({ color: CORE, roughness: 1 });
    const inst = new THREE.InstancedMesh(box, coreMat, cores.length);
    cores.forEach((b, i) => {
      pos.set(b.x, b.y, b.z);
      scale.set(b.w, b.h, b.d);
      inst.setMatrixAt(i, m.compose(pos, q.identity(), scale));
    });
    inst.computeBoundingSphere();
    inst.receiveShadow = true;
    const size = this.level.arena.boxes.reduce((s, b) => Math.max(s, Math.abs(b.x) + b.w / 2, Math.abs(b.z) + b.d / 2), 0) * 2 + 20;
    const plane = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
    const underMat = new THREE.MeshStandardMaterial({ color: UNDER, roughness: 1 });
    const under = new THREE.Mesh(plane, underMat);
    under.position.y = UNDER_Y;
    this.group.add(inst, under);
    this.mats.push(coreMat, underMat);
    this.geos.push(box, plane);
    return box;
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

  /** `run`: its gates (shut or open) and the boss room's show; `at`: the camera, for the sun's shadows and the torch
   *  lights. */
  update(dt: number, run: DungeonRun, at: THREE.Vector3) {
    const shut = run.shut;
    this.daylight(at);
    const b = run.boss;
    this.shell.set(wallsOpen(b));
    this.portal.update(dt, portalOpen(b));
    this.woodGate.update(b.beat === 'open' ? Math.min(1, b.t / CINEMA.v.gateSwing) : 0);
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

  /** The light knobs as they are now, and the sun's shadows kept round you. */
  private daylight(at: THREE.Vector3) {
    const v = LIGHT.v;
    this.sky.intensity = v.sky;
    this.sun.intensity = v.sun;
    this.sun.castShadow = v.shadows >= 1;
    this.haze.near = v.hazeNear;
    this.haze.far = v.hazeFar;
    for (const l of this.lights) l.intensity = v.torches;
    this.sun.target.position.set(at.x, 0, at.z);
    this.sun.position.set(at.x + SUN_DIR.x * 100, SUN_DIR.y * 100, at.z + SUN_DIR.z * 100);
  }

  dispose() {
    this.scene.remove(this.group);
    this.portal.dispose();
    this.woodGate.dispose();
    for (const mat of this.mats) mat.dispose();
    for (const g of this.geos) g.dispose();
    this.scene.fog = null;
  }
}
