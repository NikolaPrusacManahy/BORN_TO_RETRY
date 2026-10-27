// Main menu — the gate scene (built by tools/blender/build_menu_scene.py): a low shot up the stairs at the gate,
// with flickering torches and a campfire, drifting dust and a slow camera drift. Start (introTimeline.ts) grinds
// the portcullis up, then the screen fades to black.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { AudioEngine } from '../../audio/audio';
import { noise, tone } from '../../audio/synth';
import { Dust } from '../fx/dust';
import { INTRO, INTRO_LENGTH, gateLift } from './introTimeline';
import { Flames, nodeAt, readyMaterials } from './sceneBits';

export const MENU_URL = '/models/menu/gate.glb';
/** The menu shot's vertical FOV (degrees), matching MENU_VFOV in the Blender script. */
export const MENU_VFOV = 50;
const SKY = 0x0d0c16;

/** 'fade': start the fade to black; 'done': the lab can start. */
export type MenuEvent = 'fade' | 'done';

/** The nodes the scene must have (see build_menu_scene.py). */
export const MENU_NODES = ['Portcullis', 'Torch_L', 'Torch_R', 'Campfire', 'GateGlow', 'Cam_Menu', 'Cam_Menu_Look'] as const;

/** Flickering lights at the flame markers: node, intensity (cd), reach (m). */
const FLAMES = [
  ['Torch_L', 30, 16],
  ['Torch_R', 30, 16],
  ['Campfire', 24, 12],
] as const;

export interface MenuShot {
  /** Where the camera stands, and the point it looks at. */
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

/** Reads the menu shot from the model's markers (world positions). */
export function readShot(root: THREE.Object3D): MenuShot {
  return { pos: nodeAt(root, 'Cam_Menu'), look: nodeAt(root, 'Cam_Menu_Look') };
}

export class MenuScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(MENU_VFOV, 2, 0.05, 300);
  /** Resolves once the model is in. */
  readonly loaded: Promise<void>;
  private shot: MenuShot | null = null;
  private portcullis: THREE.Object3D | null = null;
  private gateBaseY = 0;
  private readonly flames = new Flames();
  private gateLight = new THREE.PointLight(0xfff0dc, 40, 22, 2);
  private dust: Dust | null = null;
  private time = 0;
  /** Seconds since Start (−1: idle on the menu). */
  private introT = -1;
  private readonly look = new THREE.Vector3();

  /** `loadModel`: fetch the gate scene (tests attach a parsed model instead). */
  constructor(
    private readonly audio: AudioEngine,
    loadModel = true,
  ) {
    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, 22, 70);
    this.scene.add(new THREE.HemisphereLight(0x46507a, 0x0e0b10, 0.7));
    const moon = new THREE.DirectionalLight(0x8ea4ff, 0.6);
    moon.position.set(-12, 25, 18);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    const sc = moon.shadow.camera;
    sc.left = sc.bottom = -22;
    sc.right = sc.top = 22;
    sc.far = 80;
    moon.shadow.bias = -0.0008;
    this.scene.add(moon, this.camera);
    this.loaded = loadModel
      ? new GLTFLoader()
          .loadAsync(MENU_URL)
          .then((gltf) => this.attach(gltf.scene))
          .catch((err) => console.error('menu scene failed to load', err))
      : Promise.resolve();
  }

  attach(root: THREE.Object3D) {
    this.scene.add(root);
    this.shot = readShot(root);
    this.portcullis = root.getObjectByName('Portcullis') ?? null;
    this.gateBaseY = this.portcullis?.position.y ?? 0;
    readyMaterials(root, ['GateGlow']);
    for (const [name, base, reach] of FLAMES) this.flames.add(this.scene, nodeAt(root, name), base, reach);
    // The light through the bars: from just inside the gate, out over the landing.
    root.getObjectByName('GateGlow')!.getWorldPosition(this.gateLight.position);
    this.gateLight.position.z += 2.5; // towards the stairs (the scene faces +z)
    this.scene.add(this.gateLight);
    // Dust from just behind the bars (lit by the glow) out to near the camera.
    this.dust = new Dust(380, new THREE.Vector3(-9, 0.2, this.gateLight.position.z - 1), new THREE.Vector3(9, 10, this.shot.pos.z - 2));
    this.scene.add(this.dust.points);
  }

  get ready() {
    return this.shot !== null;
  }

  /** Start pressed: the portcullis grinds up. */
  startIntro() {
    if (this.introT >= 0) return;
    this.introT = 0;
    noise(this.audio, { dur: INTRO.gateRise + 0.2, gain: 0.3, filter: 'lowpass', from: 420, to: 160 });
    tone(this.audio, { from: 70, to: 45, dur: INTRO.gateRise, gain: 0.25, type: 'sawtooth' });
  }

  /** Back to idle on the menu, the gate shut. */
  reset() {
    this.introT = -1;
    if (this.portcullis) this.portcullis.position.y = this.gateBaseY;
  }

  /** Advances the scene. Returns 'fade' when the fade to black should start and 'done' when the lab can start. */
  update(dt: number): MenuEvent | null {
    this.time += dt;
    this.dust?.update(dt);
    this.flames.update(this.time);
    const shot = this.shot;
    if (!shot) return null;
    // A slow drift around the menu shot, Start or not.
    this.camera.position.copy(shot.pos);
    this.camera.position.x += Math.sin(this.time * 0.13) * 0.35;
    this.camera.position.y += Math.sin(this.time * 0.21) * 0.08;
    this.look.copy(shot.look);
    this.look.x += Math.sin(this.time * 0.09) * 0.25;
    this.camera.lookAt(this.look);
    if (this.introT < 0) return null;
    const before = this.introT;
    this.introT += dt;
    const t = this.introT;
    if (this.portcullis) this.portcullis.position.y = this.gateBaseY + gateLift(t);
    if (before < INTRO.fadeAt && t >= INTRO.fadeAt) return 'fade';
    if (t >= INTRO_LENGTH) {
      this.reset();
      return 'done';
    }
    return null;
  }

  render(renderer: THREE.WebGLRenderer, aspect: number) {
    if (this.camera.aspect !== aspect) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.dust?.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
