// Update 0.2.8 — the Velociraptor's new moves seen (the sim's are sim/enemies/dino*.ts). Its sandstorm: the haze closes
// in to Sandstorm sight and turns sand-coloured, sky and all, and its eyes glow through it (seen from anywhere). Its
// blitz: two afterimages (its own model twice, running and slashing on blitzSpot's other lanes) that cast no shadow,
// and its own shadow on the sand under it (so the real one shows even with the sun's shadows off).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { CombatState } from '../../sim/combat/state';
import { blitzRun, blitzSpot, slashesDone } from '../../sim/enemies/dinoBlitz';
import { BLITZ } from '../../sim/enemies/dinoMoves';
import { Enemy, isLive } from '../../sim/enemies/enemy';
import { DINO } from '../../tuning/dino';
import { posedBounds } from '../bodyMeasure';
import { FADE, LOOKS } from '../enemyLooks';

/** The storm's colour; its haze comes in (and goes) over this long (s), from this near (m). */
const SAND = new THREE.Color(0xc9a46a);
const STORM_FADE = 1.2;
const STORM_NEAR = 0.5;
/** Its eyes: their size, and where they are from its head (shares of its height: forward, up, apart). */
const EYE = 0.03;
const EYE_FWD = 0.12;
const EYE_UP = 0.05;
const EYE_APART = 0.07;
/** Its shadow's size (its body's radius times). */
const SHADOW = 1.3;

interface Image {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  run: THREE.AnimationAction;
  slash: THREE.AnimationAction;
  slashes: number;
}

export class RaptorFx {
  readonly group = new THREE.Group();
  private readonly images: Image[] = [];
  private readonly eyes: THREE.Mesh[] = [];
  private readonly eyeGeo = new THREE.SphereGeometry(1, 10, 8);
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: 0xffa020, fog: false, toneMapped: false });
  private readonly shadow: THREE.Mesh;
  private readonly mats: THREE.Material[] = [];
  private scale = 1;
  private lowest = 0;
  private readonly baseFog = new THREE.Color();
  private readonly baseSky = new THREE.Color();
  private stormed = false;
  private readonly at = new THREE.Vector3();
  private readonly next = new THREE.Vector3();
  private readonly head = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < 2; i++) {
      const eye = new THREE.Mesh(this.eyeGeo, this.eyeMat);
      eye.visible = false;
      eye.renderOrder = 5;
      this.eyes.push(eye);
      this.group.add(eye);
    }
    const disc = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
    const dark = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false });
    this.shadow = new THREE.Mesh(disc, dark);
    this.shadow.visible = false;
    this.group.add(this.shadow);
    this.mats.push(dark);
    const look = LOOKS.dino;
    if (!look) return;
    new GLTFLoader()
      .loadAsync(look.url)
      .then((gltf) => this.attach(gltf.scene, gltf.animations))
      .catch((err) => console.error('Velociraptor afterimages failed to load', err));
  }

  private attach(model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    const look = LOOKS.dino!;
    const find = (name: string) => animations.find((a) => a.name === name || a.name.endsWith(`|${name}`)) ?? animations[0];
    const box = posedBounds(model, find(look.clips.idle), new THREE.Box3());
    const height = box.isEmpty() ? 5 : box.max.y - box.min.y;
    this.lowest = box.isEmpty() ? 0 : box.min.y;
    this.scale = 1 / height;
    for (let i = 0; i < 2; i++) {
      const root = cloneSkinned(model);
      root.visible = false;
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        // (No shadow: the tell.)
        o.castShadow = false;
        o.frustumCulled = false;
        o.material = (o.material as THREE.Material).clone();
        this.mats.push(o.material as THREE.Material);
      });
      const mixer = new THREE.AnimationMixer(root);
      const run = mixer.clipAction(find(look.clips.move));
      const slash = mixer.clipAction(find(look.clips.attack));
      slash.setLoop(THREE.LoopOnce, 1);
      slash.clampWhenFinished = true;
      run.play();
      this.group.add(root);
      this.images.push({ root, mixer, run, slash, slashes: 0 });
    }
  }

  /** `headOf`: its body's head bone (its eyes glow there). */
  update(state: CombatState, alpha: number, dt: number, headOf: (slot: number) => THREE.Object3D | null) {
    const slot = state.enemies.findIndex((e) => e.kind === 'dino' && isLive(e));
    const d = slot >= 0 ? state.enemies[slot] : null;
    this.blitz(d, alpha, dt);
    this.eyesOf(d, slot, state.storm, headOf);
  }

  /** Its afterimages and its shadow, while it blitzes (its run, then its slashes). */
  private blitz(d: Enemy | null, alpha: number, dt: number) {
    const on = !!d && d.move === BLITZ && (d.phase === 'charge' || (d.phase === 'recover' && !slashesDone(d)));
    this.shadow.visible = on;
    for (const im of this.images) im.root.visible = on;
    if (!on || !d) return;
    const h = DINO.v.dinoHeight;
    this.at.copy(d.prev).lerp(d.pos, alpha);
    this.shadow.position.set(this.at.x, this.at.y + 0.03, this.at.z);
    this.shadow.scale.setScalar(SHADOW * 1.8 * (h / 5));
    const k = d.phase === 'charge' ? Math.min(1, d.t / blitzRun()) : 1;
    const lanes = [-1, 0, 1].filter((l) => l !== d.near);
    for (let i = 0; i < this.images.length; i++) {
      const im = this.images[i];
      blitzSpot(d, lanes[i], k, this.at);
      blitzSpot(d, lanes[i], Math.min(1, k + 0.02), this.next);
      const dx = k < 1 ? this.next.x - this.at.x : d.aim.x - this.at.x;
      const dz = k < 1 ? this.next.z - this.at.z : d.aim.z - this.at.z;
      const s = h * this.scale;
      im.root.scale.setScalar(s);
      im.root.position.set(this.at.x, this.at.y - this.lowest * s, this.at.z);
      // The model faces +z.
      im.root.rotation.set(0, Math.atan2(dx, dz), 0);
      // Running, then a slash with each of its.
      const slashes = d.phase === 'recover' ? d.shots : 0;
      if (slashes !== im.slashes && slashes > 0) {
        im.run.fadeOut(FADE);
        im.slash.reset().setEffectiveWeight(1).fadeIn(FADE).play();
      } else if (d.phase === 'charge' && im.slashes > 0) {
        im.slash.fadeOut(FADE);
        im.run.reset().fadeIn(FADE).play();
      }
      im.slashes = slashes;
      im.run.timeScale = 2;
      im.mixer.update(dt);
    }
  }

  /** Its eyes, glowing through its sandstorm. */
  private eyesOf(d: Enemy | null, slot: number, storm: number, headOf: (slot: number) => THREE.Object3D | null) {
    const k = stormK(storm);
    const head = d && k > 0 ? headOf(slot) : null;
    for (const e of this.eyes) e.visible = !!head;
    if (!head || !d) return;
    head.getWorldPosition(this.head);
    const h = DINO.v.dinoHeight;
    const fx = -Math.sin(d.facing);
    const fz = -Math.cos(d.facing);
    for (let i = 0; i < 2; i++) {
      const side = (i === 0 ? -1 : 1) * EYE_APART * h;
      const e = this.eyes[i];
      e.position.set(this.head.x + fx * EYE_FWD * h - fz * side, this.head.y + EYE_UP * h, this.head.z + fz * EYE_FWD * h + fx * side);
      e.scale.setScalar(EYE * h * (0.6 + 0.4 * k));
    }
  }

  /** The sandstorm over the world (after the dungeon has set its own haze this frame). */
  sky(scene: THREE.Scene, state: CombatState) {
    const fog = scene.fog;
    const bg = scene.background;
    if (!(fog instanceof THREE.Fog) || !(bg instanceof THREE.Color)) return;
    const k = stormK(state.storm);
    if (k <= 0) {
      if (this.stormed) {
        fog.color.copy(this.baseFog);
        bg.copy(this.baseSky);
        this.stormed = false;
      }
      this.baseFog.copy(fog.color);
      this.baseSky.copy(bg);
      return;
    }
    this.stormed = true;
    fog.near += (STORM_NEAR - fog.near) * k;
    fog.far += (DINO.v.stormSight - fog.far) * k;
    fog.color.copy(this.baseFog).lerp(SAND, k);
    bg.copy(this.baseSky).lerp(SAND, k);
  }

  dispose() {
    this.group.removeFromParent();
    this.eyeGeo.dispose();
    this.eyeMat.dispose();
    this.shadow.geometry.dispose();
    for (const m of this.mats) m.dispose();
    for (const im of this.images) im.mixer.stopAllAction();
  }
}

/** How thick the storm is (0..1): in over its first seconds, out over its last. */
function stormK(left: number): number {
  if (left <= 0) return 0;
  return Math.min(1, left / STORM_FADE, Math.max(0, DINO.v.stormTime - left) / STORM_FADE);
}
