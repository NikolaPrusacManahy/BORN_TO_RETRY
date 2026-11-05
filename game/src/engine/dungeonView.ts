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
// Update 0.0.20 — the lava in the pits (lavaView.ts); the dark slab lies only under the floor (a pit shows its lava).
// Update 0.2.4 — a look may recolour the kit (the desert's sandstone) and bring its own sky and sun, its sand and
// quicksand (sandView.ts).
// Each floor's look (world/dungeon/styles.ts): its gates' bars (floor 3: a portcullis dropping from above), its cores'
// colour, its walls in the boss room's sliding blocks. Update 0.1.20 — the words over the doorways (roomSignsView.ts).
// Update 0.2.10 — floor 5's water: the tide over its rooms and the lily pads on it (waterView.ts), its pools.
// Update 0.2.11 — floor 6 under water (underwater.ts): the surface overhead, its haze, caustics on everything.
// Update 0.2.23 — floor 2's Venom Garden: its sludge (lavaView.ts, the look's `pit`), its beds of earth and ash
// (sandView.ts), its webs' sheets and scorch marks (gardenView.ts), its tall grass parting (grassShader.ts), its
// charred trees (the look's `burnt`). The cores and the slab under the floor moved to dungeonSolid.ts.
// Update 0.2.24 — floor 3's crystals glow (the look's `glow`); its graves, burrows and mushrooms (gardenView.ts).
// Update 0.3.0 (the designer: "remove the glow on fire torches, it lags": 122–130 fps, 144 before) — no torch lights:
// every lit surface paid for each of the 8; the torches' flames still burn. Each floor's motes (motesView.ts).
// Update 0.3.9 — a pillar broken by the pillar finisher: its pieces taken out and split (pillarBreak.ts).
// Update 0.3.11 — floor 7's sheets of ice (iceView.ts) and icicles (icicleView.ts). Update 0.3.13 — those and floor 8's
// presses, fire vents and belts drawn together (depthsView.ts). Update 0.3.14 — and floor 6's powder kegs.
// Update 0.3.31 — the Moon's rooms blown away in Tidebreaker's show, the meteor (moon/tideShowView.ts); its haze pushed
// out for the show's wide shots.
import * as THREE from 'three';
import { FloorAreas, placeByArea } from './floorPieces';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { portalOpen, wallsOpen } from '../sim/dungeon/bossRoom';
import type { DungeonRun } from '../sim/dungeon/roomLoop';
import { CINEMA } from '../tuning/cinema';
import type { DungeonLevel } from '../world/dungeon/assemble';
import { dress, Dressing, KIT, Placement } from '../world/dungeon/dressing';
import { LIGHT } from '../tuning/light';
import type { ArenaView } from './arenaView';
import { Portal } from './boss/portal';
import { Shell } from './boss/shell';
import { WoodGate } from './boss/woodGate';
import { LavaView } from './lavaView';
import { padsOf, SandView } from './sandView';
import { roomSigns } from './roomSignsView';
import { WaterView } from './waterView';
import { Underwater, underwaterOf } from './underwater';
import { UNDERWATER } from '../tuning/underwater';
import { SEA_HAZE } from './cove/sharkArena';
import { solidOf } from './dungeonSolid';
import { GardenView } from './gardenView';
import { kitMaterial } from './kitMaterial';
import { MotesView } from './motesView';
import { DungeonGlows } from './dungeonGlows';
import { PillarBreaks } from './pillarBreak';
import { DepthsView } from './depthsView';
import type { Pillar } from '../sim/combat/pillars';
import { showViewOf, type ShowView, wideOf, WIDE_HAZE } from './boss/showViews';

export const KIT_URL = '/models/dungeon/kit.glb';
/** Update 0.3.39 — the heaviest pieces again, lighter, for far off (tools/blender/kit_far.py). */
export const KIT_FAR_URL = '/models/dungeon/kit_far.glb';
/** The sky (the background and the haze), and the sky light's colours above and from the ground. */
const SKY = 0xc8d8e8;
const SKY_LIGHT = 0xe8f0ff;
const GROUND_LIGHT = 0x7d6a55;
/** The sun's colour; the way to it (from the ground: high, a little to the south-west); how far round you its
 *  shadows reach (m). */
const SUN = 0xfff0d6;
const SUN_DIR = new THREE.Vector3(-0.45, 1, 0.35).normalize();
const SHADOW_REACH = 40;
/** Update 0.0.15 — the boss room's sliding walls: dark masses seen from above (their faces are brick). */
const SHELL = new THREE.Color().setRGB(0.06, 0.048, 0.04);

/** Update 0.3.51 — a boss's move darkening the room: at its darkest, this much of the light's gone (the designer wants play spaces bright: never all of it), easing this fast. */
const DARKEST = 0.72;
const DARK_RATE = 3;

export class DungeonView implements ArenaView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  private readonly dressing: Dressing;
  private readonly bars: THREE.Object3D[] = [];
  private readonly barsY: number[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly sky: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly haze: THREE.Fog;
  private readonly shell: Shell;
  private readonly portal: Portal;
  private readonly woodGate: WoodGate;
  private readonly lava: LavaView;
  private readonly sand: SandView;
  private readonly water: WaterView;
  private readonly under: Underwater | null;
  private readonly garden: GardenView;
  private readonly motes: MotesView;
  private readonly glows: DungeonGlows;
  readonly breaks = new PillarBreaks();
  /** Update 0.3.39 — the squares drawing far copies far off. */
  private areas: FloorAreas | null = null;
  private readonly depths: DepthsView;
  private readonly tide: ShowView | null;
  /** Update 0.3.31 — has the floor been blown away here (Tidebreaker's show; Update 0.3.34, Okami's)? */
  readonly gone = (x: number, z: number) => this.tide?.gone(x, z) ?? false;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly level: DungeonLevel,
    loadKit = true,
  ) {
    this.dressing = dress(level.plan);
    scene.add(this.group);
    const look = this.dressing.style;
    scene.background = new THREE.Color(look.sky ?? SKY);
    this.haze = new THREE.Fog(look.haze ?? look.sky ?? SKY, LIGHT.v.hazeNear, LIGHT.v.hazeFar);
    scene.fog = this.haze;
    this.sky = new THREE.HemisphereLight(look.skyLight ?? SKY_LIGHT, look.ground ?? GROUND_LIGHT, LIGHT.v.sky);
    this.sun = new THREE.DirectionalLight(look.sun ?? SUN, LIGHT.v.sun);
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
    this.group.add(padsOf(this.level.arena.pads, this.mats, this.geos));
    const box = solidOf(this.group, this.dressing, level, this.mats, this.geos);
    const b = level.boss;
    const shellMat = new THREE.MeshStandardMaterial({ color: SHELL, roughness: 1 });
    this.mats.push(shellMat);
    this.shell = new Shell(b.start, b.end, shellMat, box, b.mid);
    this.portal = new Portal(b.portal);
    this.woodGate = new WoodGate(scene, b, `FLOOR ${level.plan.level + 1}`);
    this.lava = new LavaView(this.dressing.lava, look.pit);
    this.sand = new SandView(this.dressing.sand, look.sand, look.quicksand, look.ash);
    this.garden = new GardenView(this.dressing.marks);
    this.motes = new MotesView(look.id);
    this.glows = new DungeonGlows(this.dressing, level);
    this.water = new WaterView(level.tide, look.water ?? look.pit?.deep ?? 0, level.boss.end);
    this.depths = new DepthsView(level);
    this.tide = showViewOf(level, this.depths);
    if (this.tide) this.group.add(this.tide.group);
    this.group.add(this.sand.group, this.water.group, this.garden.group, this.motes.group, this.breaks.group, this.depths.group);
    this.under = underwaterOf(level, this.dressing.sand);
    if (this.under) this.group.add(this.under.group);
    this.group.add(this.shell.group, this.portal.group, this.lava.group, roomSigns(level.plan, this.mats, this.geos));
    // (Update 0.3.39 — and the far kit; without it, the real pieces all the way.)
    const loader = new GLTFLoader();
    this.loaded = loadKit
      ? Promise.all([loader.loadAsync(KIT_URL), loader.loadAsync(KIT_FAR_URL).catch(() => null)])
          .then(([gltf, far]) => this.build(gltf.scene, far?.scene))
          .catch((err) => console.error('dungeon kit failed to load', err))
      : Promise.resolve();
  }

  /** Update 0.3.9 — the pillar a piece stands in (−1: none), and one broken. */
  private pillarOf = (p: Placement) => (this.level.arena.pillars ?? []).findIndex((c) => Math.abs(p.x - c.x) < c.half && Math.abs(p.z - c.z) < c.half);
  breakPillar(i: number, p: Pillar) {
    this.breaks.break(i, p);
  }

  /** Every placement as instances of its kit piece (`far`: the far kit's far off); the gates' bars as their own meshes. */
  build(kit: THREE.Object3D, far?: THREE.Object3D) {
    kit.updateMatrixWorld(true);
    // (Update 0.3.38 — square by square, so what's out of view isn't drawn: floorPieces.ts. Update 0.0.13 — in the sun
    // everything takes shadows; the floor tiles cast none, they're flat and most of the pieces.)
    const { missing, areas } = placeByArea(this.group, kit, this.dressing.pieces, (src, name) => this.material(src, name), (name) => name !== KIT.floor, (p, inst, i, isFar) => {
      const pillar = this.pillarOf(p);
      if (pillar >= 0) this.breaks.add(pillar, inst, i, isFar);
    }, far);
    this.areas = areas;
    for (const name of missing) console.warn(`dungeon kit: no ${name}`);
    const style = this.dressing.style;
    const bars = kit.getObjectByName(style.bars);
    if (bars) {
      for (const g of this.dressing.gates) {
        const b = bars.clone();
        b.position.set(g.x, style.barsHidden, g.z);
        b.rotation.y = g.rot;
        b.scale.set(...style.barsScale);
        b.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          o.material = this.material(o.material as THREE.MeshStandardMaterial);
          o.castShadow = o.receiveShadow = true;
        });
        this.group.add(b);
        this.bars.push(b);
        this.barsY.push(style.barsHidden);
      }
    }
    this.shell.build(kit, (src) => this.material(src), style);
    this.depths.build(kit, (src, piece) => this.material(src, piece));
    this.water.build(kit, this.dressing.floats);
    this.under?.patchAll(this.group);
    // (What the Moon's rooms take with them as they blow: all but the arena's own.)
    const keep = new Set<THREE.Object3D>([this.shell.group, this.portal.group, this.sky, this.sun, this.sun.target, this.motes.group, this.breaks.group, this.depths.group]);
    this.tide?.take([...this.group.children.filter((o) => !keep.has(o) && o !== this.tide?.group), ...this.depths.craters], kit, (src, piece) => this.material(src, piece));
  }

  /** The kit's flat colours (kitMaterial.ts). */
  private material(src: THREE.MeshStandardMaterial, piece = ''): THREE.Material {
    const mat = kitMaterial(src, piece, this.dressing.style, this.under);
    this.mats.push(mat);
    return mat;
  }

  /** `run`: its gates (shut or open) and the boss room's show; `at`: the camera, for the sun's shadows and the torch
   *  lights. */
  update(dt: number, run: DungeonRun, at: THREE.Vector3, flood = 0, kicks = 0) {
    const shut = run.shut;
    this.daylight(at, wideOf(run.boss));
    this.darken(run.boss.slot >= 0 ? this.darkWanted : 0, dt);
    this.areas?.update(at);
    this.under?.update(dt, at, kicks);
    const b = run.boss;
    this.shell.set(wallsOpen(b));
    this.portal.update(dt, portalOpen(b));
    this.lava.update(dt);
    this.breaks.update(dt);
    this.depths.update(dt, run, at, flood, kicks);
    this.motes.update(dt, at);
    this.glows.update(dt);
    this.sand.update(dt);
    this.water.update(run.tide.level, this.under ? 0 : flood, dt);
    this.woodGate.update(b.beat === 'open' ? Math.min(1, b.t / CINEMA.v.gateSwing) : 0);
    // Shut: the bars slam into the doorway (from under the floor, or down from over it); won: they draw back.
    const style = this.dressing.style;
    for (let i = 0; i < this.bars.length; i++) {
      const want = shut[i] ? 0 : style.barsHidden;
      const step = (shut[i] ? style.barsShut : style.barsOpen) * dt;
      const y = this.barsY[i];
      this.barsY[i] = y + Math.max(-step, Math.min(step, want - y));
      this.bars[i].position.y = this.barsY[i];
      this.bars[i].visible = Math.abs(this.barsY[i] - style.barsHidden) > 0.01;
    }
    this.tide?.update(b, at);
  }

  /** Update 0.3.51 — how dark a boss's move wants the room (0..1: The Swarm's stare; the run sets it). */
  darkWanted = 0;
  private dark = 0;

  /** The light dimmed by how dark the room's gone, easing in and out. */
  private darken(want: number, dt: number) {
    this.dark += (want - this.dark) * Math.min(1, DARK_RATE * dt);
    if (this.dark < 0.001) return;
    const k = 1 - DARKEST * this.dark;
    this.sky.intensity *= k;
    this.sun.intensity *= k;
    this.haze.color.multiplyScalar(k);
  }

  /** The light knobs as they are now, and the sun's shadows kept round you. `wide`: the haze pushed out (0..1). */
  private daylight(at: THREE.Vector3, wide: number) {
    const v = LIGHT.v;
    this.sky.intensity = v.sky;
    this.sun.intensity = v.sun;
    this.sun.castShadow = v.shadows >= 1;
    // (Update 0.3.16 — and under the Big Shark's arena's water.)
    this.haze.near = this.under || this.depths.sunk ? UNDERWATER.v.hazeNear : v.hazeNear;
    this.haze.far = this.under || this.depths.sunk ? UNDERWATER.v.hazeFar : v.hazeFar;
    this.haze.near += (WIDE_HAZE[0] - this.haze.near) * wide;
    this.haze.far += (WIDE_HAZE[1] - this.haze.far) * wide;
    this.haze.color.setHex(this.depths.sunk ? SEA_HAZE : (this.dressing.style.haze ?? this.dressing.style.sky ?? SKY));
    this.sun.target.position.set(at.x, 0, at.z);
    this.sun.position.set(at.x + SUN_DIR.x * 100, SUN_DIR.y * 100, at.z + SUN_DIR.z * 100);
  }

  dispose() {
    this.scene.remove(this.group);
    this.portal.dispose();
    this.woodGate.dispose();
    this.lava.dispose();
    this.breaks.dispose();
    this.depths.dispose();
    this.tide?.dispose();
    this.sand.dispose();
    this.garden.dispose();
    this.motes.dispose();
    this.water.dispose();
    this.under?.dispose();
    for (const mat of this.mats) mat.dispose();
    for (const g of this.geos) g.dispose();
    this.scene.fog = null;
  }
}
