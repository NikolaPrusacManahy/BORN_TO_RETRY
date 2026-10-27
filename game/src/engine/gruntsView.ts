// M2 — draws the grunts: the Orc from Ultimate Monsters (public/models/enemies/orc.glb, tools/blender/export_monster.py),
// one animated copy per grunt slot, placed between sim ticks. Its clips follow the rules: Run while it chases, its club
// swing while it winds up (sped up so the blow lands as the wind-up ends), HitReact on a flinch, Death when it dies.
// A wind-up glows redder until the swing; a hit flashes white. Animations run on game time, so hit-stop freezes them.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { CombatState } from '../sim/combat/state';
import { GRUNT_POOL, GruntPhase } from '../sim/enemies/grunt';
import { ENEMIES } from '../tuning/enemies';

export const ORC_URL = '/models/enemies/orc.glb';
/** Seconds into the Orc's Weapon clip when its club lands (export_monster.py measured frame 16 at 30 fps). */
export const ORC_SWING_LANDS = 16 / 30;

type Clip = 'Idle' | 'Run' | 'Weapon' | 'HitReact' | 'Death';
const CLIPS: Clip[] = ['Idle', 'Run', 'Weapon', 'HitReact', 'Death'];
const ONCE: Clip[] = ['Weapon', 'HitReact', 'Death'];
/** Cross-fade between clips (s). */
const FADE = 0.12;

interface Body {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Record<Clip, THREE.AnimationAction>;
  mats: THREE.MeshStandardMaterial[];
  clip: Clip | null;
  phase: GruntPhase | null;
  t: number;
}

/** The clip the grunt's phase plays; once its swing is over, a recovering grunt stands. */
function clipFor(phase: GruntPhase, swingOver: boolean): Clip {
  switch (phase) {
    case 'chase':
      return 'Run';
    case 'windup':
      return 'Weapon';
    case 'recover':
      return swingOver ? 'Idle' : 'Weapon';
    case 'flinch':
      return 'HitReact';
    case 'dead':
      return 'Death';
  }
}

export class GruntsView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  private bodies: Body[] = [];
  private readonly at = new THREE.Vector3();

  /** `loadModel`: fetch the Orc (tests attach a parsed model instead). */
  constructor(scene: THREE.Scene, loadModel = true) {
    scene.add(this.group);
    this.loaded = loadModel
      ? new GLTFLoader()
          .loadAsync(ORC_URL)
          .then((gltf) => this.attach(gltf.scene, gltf.animations))
          .catch((err) => console.error('grunt model failed to load', err))
      : Promise.resolve();
  }

  attach(model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    // Scaled so its body is ENEMIES.gruntHeight tall (its hit capsule's height).
    let body: THREE.SkinnedMesh | null = null;
    model.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o;
    });
    const geo = (body as THREE.SkinnedMesh | null)?.geometry;
    geo?.computeBoundingBox();
    const height = geo?.boundingBox ? geo.boundingBox.max.y - geo.boundingBox.min.y : 2;
    const find = (name: Clip) => animations.find((a) => a.name === name || a.name.endsWith(`|${name}`));
    for (let i = 0; i < GRUNT_POOL; i++) {
      const root = cloneSkinned(model);
      root.scale.setScalar(ENEMIES.v.gruntHeight / height);
      root.visible = false;
      const mats: THREE.MeshStandardMaterial[] = [];
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.castShadow = true;
        o.frustumCulled = false; // animated bodies leave their bind-pose bounds
        o.material = (o.material as THREE.MeshStandardMaterial).clone();
        mats.push(o.material as THREE.MeshStandardMaterial);
      });
      const mixer = new THREE.AnimationMixer(root);
      const actions = {} as Record<Clip, THREE.AnimationAction>;
      for (const name of CLIPS) {
        const clip = find(name) ?? animations[0];
        const a = mixer.clipAction(clip);
        if (ONCE.includes(name)) {
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
        }
        actions[name] = a;
      }
      this.group.add(root);
      this.bodies.push({ root, mixer, actions, mats, clip: null, phase: null, t: 0 });
    }
  }

  get ready() {
    return this.bodies.length > 0;
  }

  /** `alpha`: how far between the last two sim ticks this frame is. `dt`: game time (stops in hit-stop). */
  update(state: CombatState, alpha: number, dt: number) {
    const v = ENEMIES.v;
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const g = state.grunts[i];
      b.root.visible = g.alive;
      if (!g.alive) {
        b.phase = null;
        continue;
      }
      b.root.position.copy(this.at.copy(g.prev).lerp(g.pos, alpha));
      // The model faces +z; a facing of 0 faces −z.
      b.root.rotation.y = g.facing + Math.PI;
      const swing = b.actions.Weapon;
      // A clip restarts when it changes, or when the same phase starts over (hit again mid-flinch); a wind-up's swing
      // carries on through the recovery.
      const again = b.phase === g.phase && g.t < b.t;
      const want = clipFor(g.phase, swing.time >= swing.getClip().duration - 0.01);
      if (want !== b.clip || (again && ONCE.includes(want))) this.play(b, want);
      // The swing lands as the wind-up ends.
      swing.timeScale = ORC_SWING_LANDS / v.gruntWindup;
      b.mixer.update(dt);
      const glow = g.phase === 'windup' ? Math.min(1, g.t / v.gruntWindup) : 0;
      const flash = g.flash / 0.12;
      for (const m of b.mats) m.emissive.setRGB(flash + glow * 0.9, flash + glow * 0.06, flash + glow * 0.04);
      b.phase = g.phase;
      b.t = g.t;
    }
  }

  private play(b: Body, clip: Clip) {
    const next = b.actions[clip];
    if (b.clip && b.clip !== clip) b.actions[b.clip].fadeOut(FADE);
    next.reset().setEffectiveWeight(1).fadeIn(b.clip ? FADE : 0).play();
    b.clip = clip;
  }

  dispose() {
    this.group.removeFromParent();
    for (const b of this.bodies) {
      b.mixer.stopAllAction();
      for (const m of b.mats) m.dispose();
    }
  }
}
