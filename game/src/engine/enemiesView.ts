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
// Update 0.0.17 — frozen (the snowflake bonus): its pose stops and it turns icy blue.
// Update 0.0.18 — floor 2's (Ultimate Monsters' newer pack: clip names carry the monster's name, no hit clips, so a
// flinch stands): the Slime swells as it winds up and is gone once it bursts; the Frog's tongue (tongueView.ts); the
// Wasp's model faces sideways; a charge plays the 'air' clip (the Blue Demon runs).
// Update 0.0.19 — the newer pack's are measured from their skinned bodies (bodyMeasure.ts: the snake and the slime were
// drawn 3 to 10 times too big).
// Update 0.1.1 — one held in an execution is placed by it (execView.ts: its tail in your hands), thrashing; one you
// could execute now pulses crimson.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { CombatState } from '../sim/combat/state';
import { ENEMY_POOL, EnemyPhase } from '../sim/enemies/enemy';
import { ENEMY_KINDS, ENEMY_STATS, EnemyKind } from '../sim/enemies/kinds';
import { blueWindup } from '../sim/enemies/blueDemon';
import { ENEMIES } from '../tuning/enemies';
import { FOES } from '../tuning/foes';
import { FOES2 } from '../tuning/foes2';
import { posedBounds } from './bodyMeasure';
import { TongueView } from './tongueView';
import { gripOf, holdStill, placeHeld, stillOf } from './execView';

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
  /** `move`: the move it winds up (Enemy.move). */
  windup: (move: number) => number;
  /** The wind-up's glow (r, g, b at full). */
  glow: [number, number, number];
  /** Update 0.0.18 — a model that doesn't face +z: its turn (rad). */
  turn?: number;
  /** Update 0.0.19 — measured from its skinned body (the newer pack's meshes are stored turned). */
  posed?: boolean;
}

/** Update 0.0.18 — a newer-pack monster's clips (`<Name>_Idle`, …); `move` and `air` name their own. */
const newer = (name: string, move: string, air: string): Record<Role, string> => ({
  idle: `${name}_Idle`,
  move: `${name}_${move}`,
  attack: `${name}_Attack`,
  hit: `${name}_Idle`,
  death: `${name}_Death`,
  air: `${name}_${air}`,
});

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
  dragon: null,
  // Update 0.0.18 — floor 2's (export_monster.py timed the frames, 24 fps; the Slime's whole clip fills its fuse).
  slime: { url: '/models/enemies/slime.glb', clips: newer('Slime', 'Walk', 'Walk'), lands: 15 / 24, windup: () => FOES2.v.slimeFuse, glow: [0.35, 1, 0.1], posed: true },
  frog: { url: '/models/enemies/frog.glb', clips: newer('Frog', 'Jump', 'Jump'), lands: 11 / 24, windup: () => FOES2.v.frogWindup, glow: [1, 0.75, 0.1], posed: true },
  snake: { url: '/models/enemies/snake.glb', clips: newer('Snake', 'Walk', 'Jump'), lands: 9 / 24, windup: () => FOES2.v.snakeWindup, glow: [0.4, 1, 0.15], posed: true },
  wasp: { url: '/models/enemies/wasp.glb', clips: { ...newer('Wasp', 'Flying', 'Flying'), idle: 'Wasp_Flying', hit: 'Wasp_Flying' }, lands: 11 / 24, windup: () => FOES2.v.waspWindup, glow: [0.5, 1, 0.1], turn: -Math.PI / 2, posed: true },
  spider: { url: '/models/enemies/spider.glb', clips: newer('Spider', 'Walk', 'Jump'), lands: 10 / 24, windup: () => FOES2.v.spiderWindup, glow: [1, 0.1, 0.1], posed: true },
  blueDemon: { url: '/models/enemies/bluedemon.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Punch', hit: 'HitReact', death: 'Death', air: 'Run' }, lands: 17 / 30, windup: blueWindup, glow: [0.2, 0.55, 1] },
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
    // (The Demon's own phases: drawn by boss/demonView.ts.) Update 0.0.18 — the Blue Demon charges: it runs.
    case 'charge':
      return 'air';
    case 'breath':
      return 'attack';
    case 'sky':
      return 'air';
    case 'held':
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
  private readonly tongues = new TongueView();

  /** `loadModels`: fetch the models (tests attach parsed ones instead). */
  constructor(scene: THREE.Scene, loadModels = true) {
    scene.add(this.group);
    this.group.add(this.tongues.group);
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
    const look = LOOKS[kind];
    if (!look) return;
    const find = (name: string) => animations.find((a) => a.name === name || a.name.endsWith(`|${name}`));
    const geo = (skinned as THREE.SkinnedMesh | null)?.geometry;
    geo?.computeBoundingBox();
    const box = look.posed ? posedBounds(model, find(look.clips.idle), new THREE.Box3()) : geo?.boundingBox;
    const height = box && !box.isEmpty() ? box.max.y - box.min.y : 2;
    const lowest = box && !box.isEmpty() ? box.min.y : 0;
    for (const slot of this.slots) {
      const root = cloneSkinned(model);
      root.userData.height = height;
      root.userData.lowest = lowest;
      root.userData.grip = gripOf(kind, model);
      root.userData.still = stillOf(kind, root);
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
    this.tongues.update(state);
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
      // A slime that burst is gone (one killed dies as the others do).
      b.root.visible = !(e.kind === 'slime' && e.phase === 'dead' && e.struck);
      if (!b.root.visible) continue;
      const windup = look.windup(e.move);
      const glow = e.phase === 'windup' ? Math.min(1, e.t / windup) : 0;
      const swell = e.kind === 'slime' ? 1 + 0.35 * glow : 1;
      const scale = (ENEMY_STATS[e.kind]().height / b.root.userData.height) * swell;
      b.root.scale.setScalar(scale);
      // The model faces +z; a facing of 0 faces −z.
      const turn = e.facing + Math.PI + (look.turn ?? 0);
      if (e.phase === 'held' && state.exec.active && state.exec.target === i && b.root.userData.grip) placeHeld(b.root, state.exec, scale, b.root.userData.grip, turn, b.root.userData.lowest);
      else {
        b.root.position.copy(this.at.copy(e.prev).lerp(e.pos, alpha));
        b.root.position.y -= b.root.userData.lowest * scale;
        b.root.rotation.set(0, turn, 0);
      }
      const attack = b.actions.attack;
      // A clip restarts when it changes, or when the same phase starts over (hit again mid-flinch); a wind-up's
      // attack carries on through the recovery.
      const again = slot.phase === e.phase && e.t < slot.t;
      const want = roleFor(e.phase, attack.time >= attack.getClip().duration - 0.01);
      if (want !== b.role || (again && ONCE.includes(want))) this.play(b, want);
      attack.timeScale = look.lands / windup;
      b.actions.move.timeScale = e.phase === 'held' ? 3 : 1;
      const ice = e.frozen > 0 ? 1 : 0;
      if (!ice) b.mixer.update(dt);
      if (e.phase === 'held') holdStill(b.root);
      // Update 0.1.1 — you could execute it: a crimson pulse.
      const mark = state.execTarget === i ? 0.5 + 0.5 * Math.sin(e.t * 12) : 0;
      const flash = e.flash / 0.12 + mark * 0.3;
      for (const m of b.mats) m.emissive.setRGB(flash + mark * 0.9 + glow * look.glow[0] + ice * 0.25, flash - mark * 0.3 + glow * look.glow[1] + ice * 0.55, flash - mark * 0.3 + glow * look.glow[2] + ice * 0.95);
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
    this.tongues.dispose();
    this.ringGeo.dispose();
    this.ringMat.dispose();
  }
}
