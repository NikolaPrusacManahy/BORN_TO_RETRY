// Settings screen — the night camp (built by tools/blender/build_camp_scene.py): sat on a log by a campfire in a
// forest clearing, the fire on the left and the options panel on the right. Entering glides the camera in; embers
// rise from the fire, stars show between the trees, and the fire crackles.
// Update 0.3.38 — its pieces merged by material (mergeStatic.ts: 207 meshes to a few dozen); nothing in it moves.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { AudioEngine } from '../../audio/audio';
import { NoiseLoop, noise } from '../../audio/synth';
import { Dust } from '../fx/dust';
import { Flames, nodeAt, readyMaterials } from './sceneBits';
import { mergeStatic } from './mergeStatic';

export const CAMP_URL = '/models/menu/camp.glb';
/** The camp shot's vertical FOV (degrees), matching CAMP_VFOV in the Blender script. */
export const CAMP_VFOV = 50;
/** The fade to black between the gate and the camp, each way (s). */
export const CAMP_FADE = 0.35;
/** The camera's glide in once the camp shows (s). */
export const CAMP_GLIDE = 1.4;
/** The nodes the scene must have (see build_camp_scene.py). */
export const CAMP_NODES = ['Campfire', 'Cam_Camp', 'Cam_Camp_Look', 'Cam_Camp_From', 'Ground'] as const;

const NIGHT = 0x070a14;
const STARS = 600;

export interface CampShot {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  /** Where the glide in starts. */
  from: THREE.Vector3;
}

export function readCampShot(root: THREE.Object3D): CampShot {
  return { pos: nodeAt(root, 'Cam_Camp'), look: nodeAt(root, 'Cam_Camp_Look'), from: nodeAt(root, 'Cam_Camp_From') };
}

const easeOut = (x: number) => 1 - (1 - x) ** 3;

export class CampScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(CAMP_VFOV, 16 / 9, 0.05, 200);
  /** Resolves once the model is in. */
  readonly loaded: Promise<void>;
  private shot: CampShot | null = null;
  private readonly flames = new Flames();
  private embers: Dust | null = null;
  private readonly stars: THREE.Points;
  private readonly rumble: NoiseLoop;
  private time = 0;
  /** Seconds since entering (the glide). */
  private enterT = 0;
  private crackleIn = 0;

  /** `loadModel`: fetch the camp (tests attach a parsed model instead). */
  constructor(
    private readonly audio: AudioEngine,
    loadModel = true,
  ) {
    this.scene.background = new THREE.Color(NIGHT);
    this.scene.fog = new THREE.Fog(NIGHT, 10, 34);
    this.scene.add(new THREE.HemisphereLight(0x2a3a64, 0x0b0907, 0.55));
    const moon = new THREE.DirectionalLight(0x9fb4ff, 0.4);
    moon.position.set(-14, 22, -10);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    const sc = moon.shadow.camera;
    sc.left = sc.bottom = -24;
    sc.right = sc.top = 24;
    sc.far = 80;
    moon.shadow.bias = -0.0008;
    this.scene.add(moon, this.camera);
    this.stars = makeStars();
    this.scene.add(this.stars);
    this.rumble = new NoiseLoop(audio, 260);
    this.loaded = loadModel
      ? new GLTFLoader()
          .loadAsync(CAMP_URL)
          .then((gltf) => this.attach(gltf.scene))
          .catch((err) => console.error('camp scene failed to load', err))
      : Promise.resolve();
  }

  attach(root: THREE.Object3D) {
    this.scene.add(root);
    this.shot = readCampShot(root);
    readyMaterials(root);
    const fire = nodeAt(root, 'Campfire');
    this.flames.add(this.scene, fire, 34, 16);
    // Embers in a column over the fire.
    this.embers = new Dust(70, new THREE.Vector3(fire.x - 0.35, fire.y - 0.2, fire.z - 0.35), new THREE.Vector3(fire.x + 0.35, fire.y + 3.2, fire.z + 0.35), {
      color: 0xff8a3c,
      size: 0.045,
      opacity: 0.9,
      rise: [0.6, 1.5],
    });
    this.scene.add(this.embers.points);
    mergeStatic(root, this.scene, () => false);
    this.place(1);
  }

  get ready() {
    return this.shot !== null;
  }

  /** Shown: the camera glides in from behind, and the fire's rumble starts. */
  enter() {
    this.enterT = 0;
    this.audio.resume();
    this.rumble.setLevel(0.05);
  }

  /** Hidden: the fire goes quiet. */
  leave() {
    this.rumble.setLevel(0);
  }

  update(dt: number) {
    this.time += dt;
    this.enterT += dt;
    this.flames.update(this.time);
    this.embers?.update(dt);
    // A crackle now and then.
    this.crackleIn -= dt;
    if (this.crackleIn <= 0) {
      this.crackleIn = 0.08 + Math.random() * 0.45;
      noise(this.audio, { dur: 0.02 + Math.random() * 0.03, gain: 0.05 + Math.random() * 0.1, filter: 'bandpass', from: 1800 + Math.random() * 2000, to: 900, q: 3 });
    }
    this.place(easeOut(Math.min(1, this.enterT / CAMP_GLIDE)));
  }

  /** The camera `k` of the way along the glide (1: sat on the log), breathing a little. */
  private place(k: number) {
    const s = this.shot;
    if (!s) return;
    this.camera.position.lerpVectors(s.from, s.pos, k);
    this.camera.position.y += Math.sin(this.time * 0.6) * 0.012;
    this.camera.lookAt(s.look);
  }

  render(renderer: THREE.WebGLRenderer, aspect: number) {
    if (this.camera.aspect !== aspect) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.embers?.dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}

/** Stars on a dome over the forest: fixed-size points, untouched by the fog. */
function makeStars(): THREE.Points {
  const pos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const a = Math.random() * Math.PI * 2;
    const up = 0.25 + Math.random() * 0.75; // above the treeline, more of them higher up
    const r = 90;
    const flat = Math.sqrt(1 - up * up);
    pos.set([Math.cos(a) * flat * r, up * r, Math.sin(a) * flat * r], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 });
  const stars = new THREE.Points(geo, mat);
  stars.frustumCulled = false;
  return stars;
}
