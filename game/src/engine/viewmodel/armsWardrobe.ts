// Update 0.3.70 — whose arms you have on: Joseph's, or the Playable Demon's with its blade (design bible). Each is fetched the
// first time it's wanted and kept, so nobody else pays for the Demon's and a choice on the lobby's dais is quick the second
// time. The Viewmodel wears what it's given.
// Update 0.3.80 — and Gravity Sean's: Joseph's skeleton in a space suit, so every guard, punch and grip carries over.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CharacterId } from '../../sim/characters';
import { ArmsRig } from './armsRig';
import { DEMON_HAND } from './handPose';
import { DEMON_MOVES } from './weaponMoves';

export const ARMS_URL = '/models/arms/adventurer.glb';
export const DEMON_ARMS_URL = '/models/arms/demon.glb';
export const DEMON_BLADE_URL = '/models/weapons/demon_blade.glb';
export const SEAN_ARMS_URL = '/models/arms/spacesuit.glb';
/** Who has arms of their own; anyone else has Joseph's. */
const ARMS_OF: Partial<Record<CharacterId, string>> = { demon: DEMON_ARMS_URL, spacesuit: SEAN_ARMS_URL };

export class ArmsWardrobe {
  /** Whose arms you have on; the Demon's blade while you're the Demon (null: anyone else, or not fetched yet). */
  who: CharacterId = 'adventurer';
  blade: THREE.Object3D | null = null;
  private readonly rigs = new Map<CharacterId, ArmsRig>();
  private bladeModel: THREE.Object3D | null = null;
  /** Fetching it failed: the run mustn't wait on it for ever. */
  private bladeFailed = false;

  /** `fetches`: fetch the models (tests give them parsed); `wear`: these arms on; `bladeGone`: the blade's changed, and this one's put away (null: none). */
  constructor(
    private readonly fetches: boolean,
    private readonly wear: (rig: ArmsRig) => void,
    private readonly bladeGone: (old: THREE.Object3D | null) => void,
  ) {}

  get demon() {
    return this.who === 'demon';
  }

  /** The arms (and, the Demon, the blade) of who you are. */
  dress(who: CharacterId) {
    this.who = who;
    const demon = who === 'demon';
    const rig = this.rigs.get(who);
    if (rig) this.wear(rig);
    else if (this.fetches) {
      void ArmsRig.load(ARMS_OF[who] ?? ARMS_URL, demon ? DEMON_HAND : undefined)
        .then((r) => {
          this.rigs.set(who, r);
          if (this.who === who) this.wear(r);
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
    this.who = 'demon';
    this.bladeModel = this.blade = model;
    model.userData.moves = DEMON_MOVES;
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) o.frustumCulled = false;
    });
    this.bladeGone(null);
  }

  /** These arms are whoever you are now's. */
  keep(rig: ArmsRig) {
    this.rigs.set(this.who, rig);
  }

  /** Nothing of the Demon's is still on its way. */
  get ready() {
    return !this.demon || this.blade !== null || this.bladeFailed;
  }
}
