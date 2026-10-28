// M2 — draws the enemies, one animated body per sim slot, placed between sim ticks (was gruntsView.ts; Update 0.0.12 —
// every kind): the Grunt is the Orc, the Spitter the Wizard, the Brute the Yeti (Ultimate Monsters, exported by
// tools/blender/export_monster.py). Clips follow the rules: moving while it chases, its attack while it winds up (sped
// or slowed so the blow lands as the wind-up ends), a hit reaction on a flinch, its death. A wind-up glows in the
// kind's colour until the blow; a hit flashes white; a winding-up brute shows its slam's reach as a ring on the
// ground. Animations run on game time, so hit-stop freezes them.
// Update 0.0.13 — the Leaper is the Ninja, the Stinger the Armabee, the Wraith the Ghost (Ultimate Monsters); a leap
// or a dive plays the kind's 'air' clip; bodies are placed by their lowest point (the fliers' models float above
// their origin).
// Update 0.0.15 — not the Demon: a boss is drawn by boss/demonView.ts (its aura, its death show).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { CombatState } from '../sim/combat/state';
import { ENEMY_POOL, EnemyPhase } from '../sim/enemies/enemy';
import { ENEMY_KINDS, ENEMY_STATS, EnemyKind } from '../sim/enemies/kinds';
import { ENEMIES } from '../tuning/enemies';
import { FOES } from '../tuning/foes';

type Role = 'idle' | 'move' | 'attack' | 'hit' | 'death' | 'air';
const ROLES: Role[] = ['idle', 'move', 'attack', 'hit', 'death', 'air'];
const ONCE: Role[] = ['attack', 'hit', 'death'];
/** Cross-fade between clips (s). */
const FADE = 0.12;

interface Look {
  url: string;
  clips: Record<Role, string>;
  /** Seconds into its attack clip when the blow lands (export_monster.py measured it), and the wind-up it fits. */
  lands: number;
  windup: () => number;
  /** The wind-up's glow (r, g, b at full). */
  glow: [number, number, number];
}

const LOOKS: Record<EnemyKind, Look | null> = {
  grunt: { url: '/models/enemies/orc.glb', clips: { idle: 'Idle', move: 'Run', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Run' }, lands: 16 / 30, windup: () => ENEMIES.v.gruntWindup, glow: [0.9, 0.06, 0.04] },
  spitter: { url: '/models/enemies/wizard.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death', air: 'Walk' }, lands: 7 / 30, windup: () => ENEMIES.v.spitterWindup, glow: [0.35, 0.9, 0.1] },
  brute: { url: '/models/enemies/yeti.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Walk' }, lands: 15 / 30, windup: () => ENEMIES.v.bruteWindup, glow: [1, 0.25, 0.05] },
  // Update 0.0.13 — the Leaper crouches (Duck: deepest as the leap goes) and flies (Jump_Idle); the Stinger rears for a
  // headbutt and dives (Fast_Flying); the Wraith casts with a punch. export_monster.py timed the frames.
  leaper: { url: '/models/enemies/ninja.glb', clips: { idle: 'Idle', move: 'Run', attack: 'Duck', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 44 / 30, windup: () => FOES.v.leaperWindup, glow: [0.65, 0.2, 1] },
  stinger: { url: '/models/enemies/armabee.glb', clips: { idle: 'Flying_Idle', move: 'Fast_Flying', attack: 'Headbutt', hit: 'HitReact', death: 'Death', air: 'Fast_Flying' }, lands: 9 / 30, windup: () => FOES.v.stingerWindup, glow: [1, 0.15, 0.05] },
  wraith: { url: '/models/enemies/ghost.glb', clips: { idle: 'Flying_Idle', move: 'Flying_Idle', attack: 'Punch', hit: 'HitReact', death: 'Death', air: 'Flying_Idle' }, lands: 12 / 30, windup: () => FOES.v.wraithWindup, glow: [0.7, 0.85, 1] },
  demon: null,
};

interface Body {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Record<Role, THREE.AnimationAction>;
  mats: THREE.MeshStandardMaterial[];
  role: Role | null;
}

interface Slot {
  bodies: Partial<Record<EnemyKind, Body>>;
  /** The body showing (its kind), the phase and time last frame. */
  kind: EnemyKind | null;
  phase: EnemyPhase | null;
  t: number;
  ring: THREE.Mesh;
}

/** The role a phase plays; once its attack is over, a recovering enemy stands. */
function roleFor(phase: EnemyPhase, attackOver: boolean): Role {
  switch (phase) {
    case 'chase':
      return 'move';
    case 'windup':
      return 'attack';
    case 'recover':
      return attackOver ? 'idle' : 'attack';
    case 'flinch':
      return 'hit';
    case 'dead':
      return 'death';
    case 'leap':
    case 'dive':
      return 'air';
    // (The Demon's own phases: drawn by boss/demonView.ts.)
    case 'charge':
      return 'move';
    case 'stun':
      return 'hit';
    case 'roar':
    case 'intro':
      return 'idle';
  }
}

export class EnemiesView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  private readonly slots: Slot[] = [];
  private readonly at = new THREE.Vector3();
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xff5020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly ringGeo = new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2);

  /** `loadModels`: fetch the models (tests attach parsed ones instead). */
  constructor(scene: THREE.Scene, loadModels = true) {
    scene.add(this.group);
    for (let i = 0; i < ENEMY_POOL; i++) {
      const ring = new THREE.Mesh(this.ringGeo, this.ringMat.clone());
      ring.visible = false;
      this.group.add(ring);
      this.slots.push({ bodies: {}, kind: null, phase: null, t: 0, ring });
    }
    const loader = new GLTFLoader();
    this.loaded = loadModels
      ? Promise.all(
          ENEMY_KINDS.filter((kind) => LOOKS[kind]).map((kind) =>
            loader
              .loadAsync(LOOKS[kind]!.url)
              .then((gltf) => this.attach(kind, gltf.scene, gltf.animations))
              .catch((err) => console.error(`${kind} model failed to load`, err)),
          ),
        ).then(() => undefined)
      : Promise.resolve();
  }

  /** One body of `kind` per slot, scaled so its skinned body is the kind's height (its hit capsule's). */
  attach(kind: EnemyKind, model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    let skinned: THREE.SkinnedMesh | null = null;
    model.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh && (!skinned || o.geometry.attributes.position.count > skinned.geometry.attributes.position.count)) skinned = o;
    });
    const geo = (skinned as THREE.SkinnedMesh | null)?.geometry;
    geo?.computeBoundingBox();
    const height = geo?.boundingBox ? geo.boundingBox.max.y - geo.boundingBox.min.y : 2;
    const lowest = geo?.boundingBox ? geo.boundingBox.min.y : 0;
    const look = LOOKS[kind];
    if (!look) return;
    const find = (name: string) => animations.find((a) => a.name === name || a.name.endsWith(`|${name}`));
    for (const slot of this.slots) {
      const root = cloneSkinned(model);
      root.userData.height = height;
      root.userData.lowest = lowest;
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
      const actions = {} as Record<Role, THREE.AnimationAction>;
      for (const role of ROLES) {
        const a = mixer.clipAction(find(look.clips[role]) ?? animations[0]);
        if (ONCE.includes(role)) {
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
        }
        actions[role] = a;
      }
      this.group.add(root);
      slot.bodies[kind] = { root, mixer, actions, mats, role: null };
    }
  }

  /** `alpha`: how far between the last two sim ticks this frame is. `dt`: game time (stops in hit-stop). */
  update(state: CombatState, alpha: number, dt: number) {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const e = state.enemies[i];
      // A slot shows the body of its enemy's kind (a slot can hold a grunt, later a brute).
      if (slot.kind !== (e.alive ? e.kind : null)) {
        const old = slot.kind ? slot.bodies[slot.kind] : undefined;
        if (old) old.root.visible = false;
        slot.kind = e.alive ? e.kind : null;
        slot.phase = null;
      }
      const b = slot.kind ? slot.bodies[slot.kind] : undefined;
      slot.ring.visible = false;
      const look = LOOKS[e.kind];
      if (!e.alive || !b || !look) continue;
      b.root.visible = true;
      const scale = ENEMY_STATS[e.kind]().height / b.root.userData.height;
      b.root.scale.setScalar(scale);
      b.root.position.copy(this.at.copy(e.prev).lerp(e.pos, alpha));
      b.root.position.y -= b.root.userData.lowest * scale;
      // The model faces +z; a facing of 0 faces −z.
      b.root.rotation.y = e.facing + Math.PI;
      const attack = b.actions.attack;
      // A clip restarts when it changes, or when the same phase starts over (hit again mid-flinch); a wind-up's
      // attack carries on through the recovery.
      const again = slot.phase === e.phase && e.t < slot.t;
      const want = roleFor(e.phase, attack.time >= attack.getClip().duration - 0.01);
      if (want !== b.role || (again && ONCE.includes(want))) this.play(b, want);
      attack.timeScale = look.lands / look.windup();
      b.mixer.update(dt);
      const glow = e.phase === 'windup' ? Math.min(1, e.t / look.windup()) : 0;
      const flash = e.flash / 0.12;
      for (const m of b.mats) m.emissive.setRGB(flash + glow * look.glow[0], flash + glow * look.glow[1], flash + glow * look.glow[2]);
      if (e.kind === 'brute' && e.phase === 'windup') this.ring(slot.ring, e.pos, glow);
      slot.phase = e.phase;
      slot.t = e.t;
    }
  }

  /** The brute's slam reach on the ground, brighter as the slam nears. */
  private ring(ring: THREE.Mesh, at: THREE.Vector3, k: number) {
    ring.visible = true;
    ring.position.set(at.x, at.y + 0.04, at.z);
    ring.scale.setScalar(ENEMIES.v.bruteSlamRadius);
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.65 * k;
  }

  private play(b: Body, role: Role) {
    const next = b.actions[role];
    if (b.role && b.role !== role) b.actions[b.role].fadeOut(FADE);
    next.reset().setEffectiveWeight(1).fadeIn(b.role ? FADE : 0).play();
    b.role = role;
  }

  dispose() {
    this.group.removeFromParent();
    for (const slot of this.slots) {
      (slot.ring.material as THREE.Material).dispose();
      for (const kind of ENEMY_KINDS) {
        const b = slot.bodies[kind];
        if (!b) continue;
        b.mixer.stopAllAction();
        for (const m of b.mats) m.dispose();
      }
    }
    this.ringGeo.dispose();
    this.ringMat.dispose();
  }
}
