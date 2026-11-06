// Update 0.3.70 — whose arms you have on: Joseph's, or the Playable Demon's with its blade (design bible). Each is fetched the
// first time it's wanted and kept, so nobody else pays for the Demon's and a choice on the lobby's dais is quick the second
// time. The Viewmodel wears what it's given.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArmsRig } from './armsRig';
import { DEMON_HAND } from './handPose';
import { DEMON_MOVES } from './weaponMoves';

export const ARMS_URL = '/models/arms/adventurer.glb';
export const DEMON_ARMS_URL = '/models/arms/demon.glb';
export const DEMON_BLADE_URL = '/models/weapons/demon_blade.glb';

export class ArmsWardrobe {
  /** You're the Demon; its blade while you are (null: anyone else, or not fetched yet). */
  demon = false;
  blade: THREE.Object3D | null = null;
  private readonly rigs = new Map<boolean, ArmsRig>();
  private bladeModel: THREE.Object3D | null = null;
  /** Fetching it failed: the run mustn't wait on it for ever. */
  private bladeFailed = false;

  /** `fetches`: fetch the models (tests give them parsed); `wear`: these arms on; `bladeGone`: the blade's changed, and this one's put away (null: none). */
  constructor(
    private readonly fetches: boolean,
    private readonly wear: (rig: ArmsRig) => void,
    private readonly bladeGone: (old: THREE.Object3D | null) => void,
  ) {}

  /** The arms and the blade of who you are (`demon`). */
  dress(demon: boolean) {
    this.demon = demon;
    const rig = this.rigs.get(demon);
    if (rig) this.wear(rig);
    else if (this.fetches) {
      void ArmsRig.load(demon ? DEMON_ARMS_URL : ARMS_URL, demon ? DEMON_HAND : undefined)
        .then((r) => {
          this.rigs.set(demon, r);
          if (this.demon === demon) this.wear(r);
        })
        .catch((err) => console.error('arms failed to load', err));
    }
    if (!demon) {
      const old = this.bladeModel;
      this.blade = null;
      this.bladeGone(old);
    } else if (this.bladeModel) this.hold(this.bladeModel);
    else if (this.fetches) {
      void new GLTFLoader()
        .loadAsync(DEMON_BLADE_URL)
        .then((g) => {
          this.bladeModel = g.scene;
          if (this.demon) this.hold(g.scene);
        })
        .catch((err) => {
          this.bladeFailed = true;
          console.error('the blade failed to load', err);
        });
    }
  }

  /** The Demon's blade: its own moves (it's no weapon of the catalog), and in the hand. */
  hold(model: THREE.Object3D) {
    this.demon = true;
    this.bladeModel = this.blade = model;
    model.userData.moves = DEMON_MOVES;
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) o.frustumCulled = false;
    });
    this.bladeGone(null);
  }

  /** These arms are whoever you are now's. */
  keep(rig: ArmsRig) {
    this.rigs.set(this.demon, rig);
  }

  /** Nothing of the Demon's is still on its way. */
  get ready() {
    return !this.demon || this.blade !== null || this.bladeFailed;
  }
}
