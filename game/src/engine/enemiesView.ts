// M2 — draws the enemies, one animated body per sim slot, placed between sim ticks (was gruntsView.ts; Update 0.0.12 —
// every kind): the Grunt is the Orc, the Spitter the Wizard, the Brute the Yeti (Ultimate Monsters, exported by
// tools/blender/export_monster.py). Clips follow the rules: moving while it chases, its attack while it winds up (sped
// or slowed so the blow lands as the wind-up ends), a hit reaction on a flinch, its death. A wind-up glows in the
// kind's colour until the blow; a hit flashes white; a winding-up brute shows its slam's reach as a ring on the
// ground. Animations run on game time, so hit-stop freezes them.
// Update 0.0.13 — the Leaper is the Ninja, the Stinger the Armabee, the Wraith the Ghost; a leap or a dive plays the
// kind's 'air' clip; bodies are placed by their lowest point (the fliers' models float above their origin).
// Update 0.0.15 — not the Demon: a boss is drawn by boss/demonView.ts (its aura, its death show).
// Update 0.0.17 — frozen (the snowflake bonus): its pose stops and it turns icy blue.
// Update 0.0.18 — floor 2's (Ultimate Monsters' newer pack: clip names carry the monster's name, no hit clips, so a
// flinch stands): the Slime swells as it winds up and is gone once it bursts; the Frog's tongue (tongueView.ts); the
// Wasp's model faces sideways; a charge plays the 'air' clip (the Blue Demon runs).
// Update 0.0.19 — the newer pack's are measured from their skinned bodies (bodyMeasure.ts: the snake and the slime were
// drawn 3 to 10 times too big).
// Update 0.1.1 — one held in an execution is placed by it (exec/execScene.ts, after this), thrashing; one you
// could execute now pulses crimson.
// Update 0.1.19 — each kind's look moved to enemyLooks.ts; floor 3's (a Skeleton rebuilding lies, then rises).
// Update 0.2.3 — the Bone King (the Skeleton, massive): it lies and rebuilds on its own knobs, stands as it crouches to
// jump, glows as its blast charges, and is gone once its bones burst.
// Update 0.2.4 — a Cactoro under the sand isn't drawn (desertView.ts shows the sand moving over it); the Dino is gone
// once it bursts. The Lizard, camouflaged, is barely seen (Lizard seen) except while it spits.
// Update 0.2.28 — a hit squashes a body a moment; the dead sink into the floor before they go (sinkOf).
// Update 0.3.8 — a body pinned to a wall is struck there and held so, flickering white till it drops or you take it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { CombatState } from '../sim/combat/state';
import { ENEMY_POOL, EnemyPhase } from '../sim/enemies/enemy';
import { ENEMY_KINDS, ENEMY_STATS, EnemyKind, flies } from '../sim/enemies/kinds';
import { ENEMIES } from '../tuning/enemies';
import { SWIMS } from '../sim/enemies/kinds6';
import { fishPose } from './fishPose';
import { FOES3 } from '../tuning/foes3';
import { BONE_KING } from '../tuning/boneKing';
import { SMASH } from '../sim/enemies/boneKingMoves';
import { lizardSeen } from '../sim/enemies/lizard';
import { FOES4 } from '../tuning/foes4';
import { posedBounds } from './bodyMeasure';
import { clipOf, FADE, LOOKS, ONCE, Role, ROLES, roleFor } from './enemyLooks';
import { TongueView } from './tongueView';
import { gripFrom, gripOf, stillOf } from './exec/body';
import { PIN_GRIP } from './exec/pinLook';
import { PINNABLE } from '../sim/enemies/flight';
import { moveOf } from '../sim/combat/execution';
import { submerged } from '../sim/enemies/drownedKingMoves';
import { ownMaterials } from './norse/norseLooks';
import { FOES_NORSE } from '../tuning/foesNorse';
import { sinkOf } from './enemyPose';

interface Body {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Record<Role, THREE.AnimationAction>;
  mats: THREE.MeshStandardMaterial[];
  /** Update 0.3.26 — its moves' own clips (Look.moveClips), and what's playing (a role, or one of those). */
  extra: Record<string, THREE.AnimationAction>;
  role: Role | string | null;
}

interface Slot {
  bodies: Partial<Record<EnemyKind, Body>>;
  /** The body showing (its kind), the phase and time last frame. */
  kind: EnemyKind | null;
  phase: EnemyPhase | null;
  t: number;
  ring: THREE.Mesh;
  /** Seconds it has stood still in its chase; (Update 0.3.15) its pace (m/s, smoothed) from where it was (`at`). */
  still: number;
  pace: number;
  at: THREE.Vector3;
}

/** Update 0.2.5 — standing still in its chase this long (s), one on its feet stands rather than runs on the spot.
 *  Update 0.3.15 (the designer: enemies "run on the same spot") — slower than this share of its speed it stands too;
 *  its run plays as fast as it goes (between the low and high shares). */
const STILL = 0.12;
const CREEP = 0.25;
const PACE_LOW = 0.5;
const PACE_HIGH = 1.4;

const SQUASH = 0.14; // (Update 0.2.28 — a hit squashes a body this share of its height; the dead sink: enemyPose.ts.)
/** Update 0.3.8 — a pinned body: its clip stops this far in (s), and how white it flickers. */
const PIN_POSE = 0.25;
const FLICKER = 0.8;
export { sinkOf };

export class EnemiesView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  private readonly slots: Slot[] = [];
  private readonly at = new THREE.Vector3();
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xff5020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly ringGeo = new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2);
  private readonly tongues = new TongueView();

  /** `loadModels`: fetch the models (tests attach parsed ones instead). Update 0.3.24 — only `kinds`' (the level's:
   *  sim/dungeon/floorKinds.ts; the Lab's every one). */
  constructor(scene: THREE.Scene, loadModels = true, kinds: readonly EnemyKind[] = ENEMY_KINDS) {
    scene.add(this.group);
    this.group.add(this.tongues.group);
    for (let i = 0; i < ENEMY_POOL; i++) {
      const ring = new THREE.Mesh(this.ringGeo, this.ringMat.clone());
      ring.visible = false;
      this.group.add(ring);
      this.slots.push({ bodies: {}, kind: null, phase: null, t: 0, ring, still: 0, pace: 0, at: new THREE.Vector3() });
    }
    const loader = new GLTFLoader();
    this.loaded = loadModels
      ? Promise.all(
          kinds.filter((kind) => LOOKS[kind]).map((kind) =>
            loader
              .loadAsync(LOOKS[kind]!.url)
              .then((gltf) => this.attach(kind, gltf.scene, gltf.animations))
              .catch((err) => console.error(`${kind} model failed to load`, err)),
          ),
        ).then(() => undefined)
      : Promise.resolve();
  }

  /** One body of `kind` per slot, scaled so its skinned body is the kind's height (its hit capsule's). */
  attach(kind: EnemyKind, model: THREE.Object3D, clips: THREE.AnimationClip[]) {
    // (Update 0.3.18 — floor 8's ships have no clips and no skeleton: one still clip; their box their whole model.)
    const animations = clips.length ? clips : [new THREE.AnimationClip('Still', 1, [])];
    let skinned: THREE.SkinnedMesh | null = null;
    model.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh && (!skinned || o.geometry.attributes.position.count > skinned.geometry.attributes.position.count)) skinned = o;
    });
    const look = LOOKS[kind];
    if (!look) return;
    const find = (name: string) => animations.find((a) => a.name === name || a.name.endsWith(`|${name}`));
    const geo = (skinned as THREE.SkinnedMesh | null)?.geometry;
    geo?.computeBoundingBox();
    const box = !skinned ? new THREE.Box3().setFromObject(model) : look.posed ? posedBounds(model, find(look.clips.idle), new THREE.Box3()) : geo?.boundingBox;
    const height = box && !box.isEmpty() ? box.max.y - box.min.y : 2;
    const lowest = box && !box.isEmpty() ? box.min.y : 0;
    for (const slot of this.slots) {
      const root = cloneSkinned(model);
      root.userData.height = height;
      root.userData.lowest = lowest;
      root.userData.grip = gripOf(kind, model);
      // (Update 0.3.8 — held by its head in the wall finisher, if it can be pinned.)
      root.userData.pinGrip = PINNABLE.has(kind) ? gripFrom(PIN_GRIP, model) : null;
      root.userData.still = stillOf(kind, root);
      root.visible = false;
      // (Update 0.3.22 — each its own materials; floor 7's warband recoloured, their eyes lit: norse/norseLooks.ts.)
      const mats = ownMaterials(kind, root);
      const mixer = new THREE.AnimationMixer(root);
      const actions = {} as Record<Role, THREE.AnimationAction>;
      for (const role of ROLES) {
        const a = mixer.clipAction(find(clipOf(look, role)) ?? animations[0]);
        if (ONCE.includes(role)) {
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
        }
        actions[role] = a;
      }
      const extra: Record<string, THREE.AnimationAction> = {};
      for (const [name, once] of Object.values(look.moveClips ?? {})) { // (Update 0.3.26 — its moves' own clips.)
        const a = (extra[name] ??= mixer.clipAction(find(name) ?? animations[0]));
        if (once) [a.loop, a.clampWhenFinished] = [THREE.LoopOnce, true];
      }
      this.group.add(root);
      slot.bodies[kind] = { root, mixer, actions, mats, extra, role: null };
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
      // A slime that burst is gone (one killed dies as the others do); so is the Bone King once its bones burst.
      // (Update 0.2.10 — and floor 5's under the water: drownedFx.ts shows their fins.)
      // (Update 0.3.15 — Mako in the sand, a Tentacle sunk under the sea. Update 0.3.22 — floor 7's dead in the snow.)
      const buried = ((e.kind === 'cactoro' || e.kind === 'cactoroBig' || e.kind === 'mako') && e.pos.y < -1) || (e.kind === 'tentacle' && e.pos.y < -5) || ((e.kind === 'draugr' || e.kind === 'barrowMaid') && e.pos.y < -1.5) || submerged(e);
      b.root.visible = !((e.kind === 'slime' || e.kind === 'boneKing' || e.kind === 'dino' || e.kind === 'drownedKing' || e.kind === 'whale' || e.kind === 'frostRoc' || e.kind === 'tidebreaker') && e.phase === 'dead' && e.struck) && !buried;
      if (!b.root.visible) continue;
      const windup = look.windup(e.move, e.stage);
      const king = e.kind === 'boneKing';
      const glow = e.phase === 'windup' ? Math.min(1, e.t / windup) : e.phase === 'blast' ? Math.min(1, e.t / BONE_KING.v.blastCharge) : 0;
      const swell = e.kind === 'slime' ? 1 + 0.35 * glow : 1;
      const scale = (ENEMY_STATS[e.kind]().height / b.root.userData.height) * swell;
      // (Update 0.2.28 — a hit squashes it a moment.)
      const squash = Math.max(0, Math.min(1, e.flash / 0.12)) * SQUASH;
      b.root.scale.set(scale * (1 + squash), scale * (1 - squash), scale * (1 + squash));
      // The model faces +z; a facing of 0 faces −z.
      const turn = e.facing + Math.PI + (look.turn ?? 0);
      b.root.position.copy(this.at.copy(e.prev).lerp(e.pos, alpha));
      b.root.position.y -= b.root.userData.lowest * scale + sinkOf(e);
      b.root.rotation.set(0, turn, 0);
      // (Update 0.2.11 — a fish tips, wriggles and dies belly up.)
      fishPose(b.root, e, dt);
      const attack = b.actions.attack;
      // A clip restarts when it changes, or when the same phase starts over (hit again mid-flinch); a wind-up's
      // attack carries on through the recovery.
      const again = slot.phase === e.phase && e.t < slot.t;
      // Update 0.1.2 — one standing in an execution stands still (one held thrashes).
      let want: Role = e.phase === 'held' && !moveOf(e.kind).held ? 'idle' : roleFor(e.phase, attack.time >= attack.getClip().duration - 0.01);
      if (e.phase === 'intro' && ENEMY_STATS[e.kind]().boss) want = 'idle'; // (Update 0.3.26 — a boss's show stands.)
      // Update 0.1.19 — a Skeleton in pieces lies there, then rises as it rebuilds (its clip sped to fit the knob).
      if (e.phase === 'rebuild' && e.t >= (king ? BONE_KING.v.kingDown : FOES3.v.skeletonDown)) want = 'rise';
      // Update 0.3.8 — pinned to a wall: struck there and held so (its clip stops a moment in).
      if (e.pinned > 0) want = 'hit';
      // Update 0.2.3 — the Bone King stands as it crouches to jump (its attack is a swing).
      if (king && e.phase === 'windup' && e.move === SMASH) want = 'idle';
      // Update 0.2.5 (the designer: Tribals on a perch "just run on the spot"): one on its feet that hasn't moved a while stands.
      const moved = Math.hypot(e.pos.x - e.prev.x, e.pos.z - e.prev.z) > 1e-4;
      slot.still = moved || e.phase !== 'chase' ? 0 : slot.still + dt;
      const step = Math.min(0.5, Math.hypot(e.pos.x - slot.at.x, e.pos.z - slot.at.z));
      slot.at.copy(e.pos);
      if (dt > 0) slot.pace += (step / dt - slot.pace) * Math.min(1, dt * 6);
      const full = Math.max(0.1, ENEMY_STATS[e.kind]().speed);
      if (want === 'move' && (slot.still > STILL || slot.pace < full * CREEP) && !flies(e.kind)) want = 'idle';
      // Update 0.2.8 — the Velociraptor runs its charges, its sprint to a wall and its blitz (quicker).
      // (Update 0.2.10 — and the Drowned King its surf.)
      const dash = ((e.kind === 'dino' || e.kind === 'drownedKing') && e.phase === 'charge') || (SWIMS.has(e.kind) && (e.phase === 'charge' || e.phase === 'dive' || e.phase === 'leap'));
      if (dash) want = 'move';
      // (Update 0.3.26 — a move's own clip, played through its warning; Update 0.3.29 — or up to its blow, `mine[2]`.)
      const mine = look.moveClips?.[`${e.phase}:${e.move}`], own = mine?.[0];
      if ((own ?? want) !== b.role || (again && (own !== undefined || ONCE.includes(want)))) this.play(b, own ?? want);
      if (own) b.extra[own].timeScale = e.phase === 'windup' ? (b.extra[own].getClip().duration * (mine?.[2] ?? 1)) / Math.max(0.1, windup) : (mine?.[3] ?? 1);
      attack.timeScale = look.lands / windup;
      b.actions.rise.timeScale = b.actions.rise.getClip().duration / Math.max(0.1, king ? BONE_KING.v.kingRise : e.phase === 'intro' ? FOES_NORSE.v.riseTime : FOES3.v.skeletonRise);
      b.actions.move.timeScale = e.phase === 'held' ? 3 : dash ? 2 : flies(e.kind) ? 1 : Math.min(PACE_HIGH, Math.max(PACE_LOW, slot.pace / full));
      const ice = e.frozen > 0 ? 1 : 0;
      if (!ice && !b.root.userData.kept && !(e.pinned > 0 && e.t > PIN_POSE)) b.mixer.update(dt);
      // Update 0.1.1 — you could execute it: a crimson pulse.
      const mark = state.execTarget === i ? 0.5 + 0.5 * Math.sin(e.t * 12) : 0;
      // (Update 0.3.8 — a pinned body flickers till it drops, or till you take it.)
      const flicker = e.pinned > 0 && !(state.exec.active && state.exec.target === i) && Math.sin(e.t * 38) > 0 ? FLICKER : 0;
      const flash = e.flash / 0.12 + mark * 0.3 + flicker;
      // Update 0.2.4 — the Lizard's camouflage.
      const seen = e.kind === 'lizard' && !lizardSeen(e) ? FOES4.v.lizardHide : 1;
      for (const m of b.mats) {
        m.transparent = seen < 1;
        m.opacity = seen;
        m.depthWrite = seen >= 1;
      }
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

  private play(b: Body, key: Role | string) {
    const of = (k: string) => b.actions[k as Role] ?? b.extra[k];
    if (b.role && b.role !== key) of(b.role).fadeOut(FADE);
    of(key).reset().setEffectiveWeight(1).fadeIn(b.role ? FADE : 0).play();
    b.role = key;
  }

  /** Update 0.2.8 — the head bone of the body drawn for enemy slot `i` (null if none, or it has no 'Head'). */
  headOf(i: number): THREE.Object3D | null {
    return this.rootOf(i)?.getObjectByName('Head') ?? null;
  }

  /** Update 0.1.2 — the body drawn for enemy slot `i` (null if none). */
  rootOf(i: number): THREE.Object3D | null {
    const slot = this.slots[i];
    return slot?.kind ? (slot.bodies[slot.kind]?.root ?? null) : null;
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
