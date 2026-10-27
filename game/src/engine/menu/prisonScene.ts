// Character select — the prison corridor (built by tools/blender/build_prison_scene.py): a row of barred cells, one
// character standing in each. The camera faces the selected cell: a playable character's bars lift as it's
// selected; a locked one's rattle. Entering glides the camera down the corridor from its end.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { AudioEngine } from '../../audio/audio';
import { noise, tone } from '../../audio/synth';
import { ROSTER } from '../../sim/characters';
import { Flames, nodeAt, readyMaterials } from './sceneBits';

export const PRISON_URL = '/models/menu/prison.glb';
/** The prison camera's vertical FOV (degrees), matching PRISON_VFOV in the Blender script. */
export const PRISON_VFOV = 58;

export const PRISON = {
  /** How far a cell's bars lift (m): the wall above the arch hides at most ~2.6 (DOOR_LIFT in the script). */
  doorLift: 2.6,
  /** How fast the bars move towards open or shut (higher is quicker). */
  doorRate: 5,
  /** The glide in from the corridor's end (s). */
  glide: 1.6,
  /** How fast the camera follows to a newly selected cell (higher is quicker). */
  followRate: 6,
  /** A locked cell's rattle (s) and how far its bars shake (m). */
  rattle: 0.35,
  rattleSize: 0.03,
  /** The fade to black into the run, or back to the gate (s). */
  fade: 0.45,
} as const;

/** The nodes the scene must have (see build_prison_scene.py). */
export const PRISON_NODES: readonly string[] = [
  'Cam_Prison_From',
  'Look_Prison_From',
  ...ROSTER.flatMap((c, i) => [`Char_${c.id}`, `Door_${c.id}`, `Cell_${c.id}`, `Cam_${c.id}`, `Look_${c.id}`, `CellLight_${c.id}`, `Torch_${i}`]),
];

const DARK = 0x050406;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

interface Cell {
  door: THREE.Object3D;
  doorY: number;
  doorX: number;
  /** How far the bars are lifted (m), and where they're going. */
  lift: number;
  open: boolean;
  character: THREE.Object3D;
  light: THREE.PointLight;
  cam: THREE.Vector3;
  look: THREE.Vector3;
}

export class PrisonScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(PRISON_VFOV, 16 / 9, 0.05, 200);
  /** Resolves once the model is in. */
  readonly loaded: Promise<void>;
  private cells: Cell[] = [];
  private from = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private readonly flames = new Flames();
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private selected = 0;
  private time = 0;
  /** Seconds into the glide in (past PRISON.glide: following the selected cell). */
  private enterT = 0;
  private rattleT = -1;

  /** `loadModel`: fetch the corridor (tests attach a parsed model instead). */
  constructor(
    private readonly audio: AudioEngine,
    loadModel = true,
  ) {
    this.scene.background = new THREE.Color(DARK);
    this.scene.fog = new THREE.Fog(DARK, 14, 40);
    this.scene.add(new THREE.HemisphereLight(0x3a3448, 0x0a0806, 0.5), this.camera);
    this.loaded = loadModel
      ? new GLTFLoader()
          .loadAsync(PRISON_URL)
          .then((gltf) => this.attach(gltf.scene))
          .catch((err) => console.error('prison scene failed to load', err))
      : Promise.resolve();
  }

  attach(root: THREE.Object3D) {
    this.scene.add(root);
    readyMaterials(root);
    this.from = { pos: nodeAt(root, 'Cam_Prison_From'), look: nodeAt(root, 'Look_Prison_From') };
    this.cells = ROSTER.map((c, i) => {
      const door = root.getObjectByName(`Door_${c.id}`)!;
      const light = new THREE.PointLight(0xffd2a0, 0, 7, 2);
      light.position.copy(nodeAt(root, `CellLight_${c.id}`));
      this.scene.add(light);
      this.flames.add(this.scene, nodeAt(root, `Torch_${i}`), 22, 12);
      return { door, doorY: door.position.y, doorX: door.position.x, lift: 0, open: false, character: root.getObjectByName(`Char_${c.id}`)!, light, cam: nodeAt(root, `Cam_${c.id}`), look: nodeAt(root, `Look_${c.id}`) };
    });
    this.place(this.cells[0].cam, this.cells[0].look);
  }

  get ready() {
    return this.cells.length > 0;
  }

  /** Shown: every cell shut, the camera gliding in from the corridor's end to cell `index`. */
  enter(index: number) {
    for (const c of this.cells) {
      c.open = false;
      c.lift = 0;
    }
    this.enterT = 0;
    this.rattleT = -1;
    this.pos.copy(this.from.pos);
    this.look.copy(this.from.look);
    this.select(index, false);
  }

  /** Cell `index` is selected: a playable character's bars lift, the others' come down, a locked one rattles. */
  select(index: number, sound = true) {
    this.selected = index;
    const playable = ROSTER[index].available;
    this.cells.forEach((c, i) => (c.open = i === index && playable));
    if (!sound) return;
    if (playable) {
      noise(this.audio, { dur: 0.6, gain: 0.25, filter: 'lowpass', from: 600, to: 200 });
      tone(this.audio, { from: 90, to: 60, dur: 0.5, gain: 0.2, type: 'sawtooth' });
    } else this.rattle();
  }

  /** A locked cell's bars shake and clank. */
  rattle() {
    this.rattleT = 0;
    noise(this.audio, { dur: 0.18, gain: 0.3, filter: 'bandpass', from: 2600, to: 1400, q: 4 });
    tone(this.audio, { from: 420, to: 300, dur: 0.12, gain: 0.12, type: 'square' });
  }

  /** How far a cell's bars are lifted (m). */
  doorLift(index: number) {
    return this.cells[index]?.lift ?? 0;
  }

  update(dt: number) {
    this.time += dt;
    this.enterT += dt;
    this.flames.update(this.time);
    const target = this.cells[this.selected];
    if (!target) return;
    this.cells.forEach((c, i) => {
      c.lift += ((c.open ? PRISON.doorLift : 0) - c.lift) * ease(PRISON.doorRate, dt);
      c.door.position.y = c.doorY + c.lift;
      c.door.position.x = c.doorX;
      c.light.intensity += ((i === this.selected ? 14 : 5) - c.light.intensity) * ease(4, dt);
      // Breathing.
      c.character.scale.y = 1 + Math.sin(this.time * 1.7 + i * 1.3) * 0.006;
    });
    if (this.rattleT >= 0) {
      this.rattleT += dt;
      const k = Math.max(0, 1 - this.rattleT / PRISON.rattle);
      target.door.position.x = target.doorX + Math.sin(this.rattleT * 70) * PRISON.rattleSize * k;
      if (k === 0) this.rattleT = -1;
    }
    if (this.enterT < PRISON.glide) {
      const k = easeInOut(this.enterT / PRISON.glide);
      this.place(this.pos.lerpVectors(this.from.pos, target.cam, k), this.look.lerpVectors(this.from.look, target.look, k));
    } else {
      const k = ease(PRISON.followRate, dt);
      this.place(this.pos.lerp(target.cam, k), this.look.lerp(target.look, k));
    }
  }

  private place(pos: THREE.Vector3, look: THREE.Vector3) {
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
  }

  render(renderer: THREE.WebGLRenderer, aspect: number) {
    if (this.camera.aspect !== aspect) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
