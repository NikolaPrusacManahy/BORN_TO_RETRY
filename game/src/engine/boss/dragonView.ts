// Update 0.0.18 — the Dragon as you see it (floor 2's boss): the Ultimate Monsters Dragon scaled to its size, flying
// a little off the floor and bobbing; its clips follow its moves (it lunges, head out, to breathe fire and spit
// fireballs, holding the pose while the beam burns; it strikes with claws and wings, spinning for the tail; it reels
// when stunned; its scream is the whole lunge), each warning glowing in its move's colour. Its aura (aura.ts) burns
// gold, then red once it rages; its beam (beamView.ts) runs from its head to where the fire stops. Killed, its death
// show is the Demon's (bossTint.ts, demonFx.ts). Clips run on game time.
// Update 0.0.19 — measured from its skinned body (bodyMeasure.ts), as the newer pack's are.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CombatState } from '../../sim/combat/state';
import { dragonWindup } from '../../sim/enemies/dragon';
import { BREATH, CLAWS, FIREBALLS, TAIL, WING } from '../../sim/enemies/dragonMoves';
import type { Enemy } from '../../sim/enemies/enemy';
import { doomTime } from '../../sim/enemies/kinds';
import { DRAGON } from '../../tuning/dragon';
import { posedBounds } from '../bodyMeasure';
import { Aura } from './aura';
import { BeamView } from './beamView';
import { tintBoss } from './bossTint';

export const DRAGON_URL = '/models/enemies/dragon.glb';

type Role = 'fly' | 'strike' | 'lunge' | 'reel' | 'down';
/** Its clips (export_monster.py lists them). */
const CLIPS: Record<Role, string> = { fly: 'Dragon_Flying', strike: 'Dragon_Attack', lunge: 'Dragon_Attack2', reel: 'Dragon_Hit', down: 'Dragon_Death' };
const ONCE: Role[] = ['strike', 'lunge', 'reel', 'down'];
/** Seconds into its clips (24 fps): the strike lands (export_monster.py), the lunge has its head furthest out, the
 *  whole lunge (its scream), and its pose is held when it dies. */
const STRIKE = 14 / 24;
const LUNGE = 10 / 24;
const SCREAM = 40 / 24;
const DOWN = 6 / 24;
const FADE = 0.15;
/** The tail swing's spin (s). */
const SPIN = 0.45;
/** The beam shoots out over this long (s), and thins away over the last of it. */
const BEAM_OUT = 0.12;
const BEAM_END = 0.2;
/** Each move's warning glow. */
const GLOW: Record<number, [number, number, number]> = {
  [BREATH]: [1, 0.6, 0.12],
  [FIREBALLS]: [1, 0.32, 0.05],
  [CLAWS]: [1, 0.08, 0.03],
  [WING]: [0.95, 0.9, 0.35],
  [TAIL]: [0.7, 0.2, 1],
};

const at = new THREE.Vector3();
const chest = new THREE.Vector3();
const head = new THREE.Vector3();

/** The Dragon in play (its slot in use), if any. */
export function dragonIn(state: CombatState): Enemy | null {
  for (const e of state.enemies) if (e.alive && e.kind === 'dragon') return e;
  return null;
}

export class DragonView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  private root: THREE.Object3D | null = null;
  private headBone: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions = {} as Record<Role, THREE.AnimationAction>;
  private role: Role | null = null;
  private mats: THREE.MeshStandardMaterial[] = [];
  private height = 1;
  private lowest = 0;
  private time = 0;
  private readonly aura = new Aura({ calm: [1, 0.55, 0.1], rage: [1, 0.12, 0.05], ring: 0xffa020, light: 0xff8a30, embers: 0xffb040 });
  private readonly beam = new BeamView();

  constructor(scene: THREE.Scene, loadModel = true) {
    scene.add(this.group);
    this.group.add(this.aura.group, this.beam.group);
    this.group.visible = false;
    this.loaded = loadModel
      ? new GLTFLoader()
          .loadAsync(DRAGON_URL)
          .then((gltf) => this.attach(gltf.scene, gltf.animations))
          .catch((err) => console.error('dragon model failed to load', err))
      : Promise.resolve();
  }

  attach(model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    model.traverse((o) => {
      if (o.name === 'Head') this.headBone = o;
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      o.frustumCulled = false;
      o.material = (o.material as THREE.MeshStandardMaterial).clone();
      this.mats.push(o.material as THREE.MeshStandardMaterial);
    });
    const find = (name: string) => animations.find((a) => a.name === name || a.name.endsWith(`|${name}`)) ?? animations[0];
    const box = posedBounds(model, find(CLIPS.fly), new THREE.Box3());
    if (!box.isEmpty()) {
      this.height = box.max.y - box.min.y;
      this.lowest = box.min.y;
    }
    this.mixer = new THREE.AnimationMixer(model);
    for (const role of Object.keys(CLIPS) as Role[]) {
      const a = this.mixer.clipAction(find(CLIPS[role]));
      if (ONCE.includes(role)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions[role] = a;
    }
    this.root = model;
    model.visible = false;
    this.group.add(model);
  }

  /** The Dragon on screen, if one is in play. `camera`: where you look from (its glow faces you). */
  update(state: CombatState, camera: THREE.Vector3, alpha: number, dt: number) {
    const e = dragonIn(state);
    // Gone once its body has burst.
    this.group.visible = !!e && !(e.phase === 'dead' && e.struck);
    if (!e || !this.group.visible) return;
    this.time += dt;
    const v = DRAGON.v;
    at.copy(e.prev).lerp(e.pos, alpha);
    const dead = e.phase === 'dead';
    const lift = v.hover + (dead ? 0 : 0.25 * Math.sin(this.time * 2.2));
    const root = this.root;
    if (root && this.mixer) {
      root.visible = true;
      const scale = v.dragonHeight / this.height;
      root.scale.setScalar(scale);
      root.position.set(at.x, at.y + lift - this.lowest * scale, at.z);
      root.rotation.y = e.facing + Math.PI + this.spin(e);
      this.animate(e, dt);
      tintBoss(e, this.mats, dragonWindup(e, e.move), GLOW[e.move] ?? GLOW[BREATH], this.time);
    }
    chest.set(at.x, at.y + lift + v.dragonHeight * 0.5, at.z);
    this.aura.update(at, chest, v.dragonHeight, e.stage > 0, dead ? Math.max(0, 1 - e.t / doomTime()) : 1, camera, dt);
    this.drawBeam(e);
  }

  /** The tail swing: one quick turn round. */
  private spin(e: Enemy): number {
    if (e.phase !== 'recover' || e.move !== TAIL) return 0;
    const k = Math.min(1, e.t / SPIN);
    return Math.PI * 2 * k * k * (3 - 2 * k);
  }

  /** From its head to where the fire stops (Enemy.aim), while it breathes; Update 0.0.20 — the warning line and the
   *  gathering fire while it charges. */
  private drawBeam(e: Enemy) {
    const v = DRAGON.v;
    const charging = e.phase === 'windup' && e.move === BREATH;
    if ((e.phase !== 'breath' && !charging) || !this.root) {
      this.beam.update(at, at, 0, 0, this.time);
      return;
    }
    if (this.headBone) {
      this.root.updateMatrixWorld(true);
      this.headBone.getWorldPosition(head);
      head.x -= Math.sin(e.facing) * v.dragonHeight * 0.12;
      head.z -= Math.cos(e.facing) * v.dragonHeight * 0.12;
    } else head.set(at.x, at.y + v.dragonHeight * 0.7, at.z);
    if (charging) {
      this.beam.charge(head, e.aim, Math.min(1, e.t / dragonWindup(e, BREATH)), this.time);
      return;
    }
    const out = Math.min(1, e.t / BEAM_OUT);
    const power = Math.min(1, Math.max(0, (v.beamTime - e.t) / BEAM_END));
    this.beam.update(head, e.aim, power, out, this.time);
  }

  /** The clip its phase plays; its speed fitted so the move's moment lands as the warning ends. */
  private animate(e: Enemy, dt: number) {
    const v = DRAGON.v;
    const a = this.actions;
    let role: Role = 'fly';
    switch (e.phase) {
      case 'intro':
        role = e.pos.y < -0.05 ? 'fly' : 'lunge';
        break;
      case 'windup':
        role = e.move === BREATH || e.move === FIREBALLS ? 'lunge' : 'strike';
        break;
      case 'breath':
        role = 'lunge';
        break;
      case 'charge':
        role = 'strike';
        break;
      case 'recover':
        if (e.move === FIREBALLS) role = e.shots < v.fireballs ? 'lunge' : 'fly';
        else role = e.move === BREATH ? 'fly' : 'strike';
        break;
      case 'stun':
        role = 'reel';
        break;
      case 'roar':
        role = 'lunge';
        break;
      case 'dead':
        role = 'down';
        break;
      default:
        role = 'fly';
    }
    if (role !== this.role) this.play(role);
    // A lunge held with its head out (the beam, a burst of fireballs); the scream plays whole.
    const screaming = e.phase === 'roar' || e.phase === 'intro';
    const held = e.phase === 'breath' || (e.phase === 'recover' && e.move === FIREBALLS);
    a.lunge.timeScale = screaming ? SCREAM / Math.max(0.3, v.screamTime) : held || a.lunge.time >= LUNGE ? 0 : LUNGE / dragonWindup(e, e.move);
    // Claws out through the swoop.
    a.strike.timeScale = e.phase === 'windup' ? STRIKE / dragonWindup(e, e.move) : e.phase === 'charge' && a.strike.time >= STRIKE ? 0 : 1;
    a.fly.timeScale = e.stage > 0 ? 1.3 : 1;
    // Killed: the pose freezes in the air.
    a.down.timeScale = a.down.time >= DOWN ? 0 : 1;
    this.mixer!.update(dt);
  }

  private play(role: Role) {
    const next = this.actions[role];
    if (this.role) this.actions[this.role].fadeOut(FADE);
    next.reset().setEffectiveWeight(1).fadeIn(this.role ? FADE : 0).play();
    this.role = role;
  }

  dispose() {
    this.group.removeFromParent();
    this.mixer?.stopAllAction();
    for (const m of this.mats) m.dispose();
    this.aura.dispose();
    this.beam.dispose();
  }
}
