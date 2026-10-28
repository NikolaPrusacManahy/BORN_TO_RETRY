// Update 0.0.15 — the Demon as you see it (the designer: bigger, with an aura): the Ultimate Monsters Demon scaled to
// its size, its clips following its moves (it lowers its head to charge, springs to leap, thrusts its trident to cast,
// shakes its head when stunned, flings its arms wide to roar, raises its trident for its stance in the show), each
// warning glowing in its move's colour. Its aura: a glow behind it, embers rising round it, a ring of fire at its
// feet and a red light; all of it fiercer once it rages. Killed, its pose freezes in the air and it flickers white,
// faster and faster as it sinks, until it bursts (the flash: demonFx.ts). Clips run on game time.
// Update 0.0.18 — its aura is aura.ts (the Dragon has one too); a boss in play is any kind (bossIn).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CombatState } from '../../sim/combat/state';
import { windupOf } from '../../sim/enemies/demon';
import { CHARGE, LEAP, VOLLEY } from '../../sim/enemies/demonMoves';
import type { Enemy } from '../../sim/enemies/enemy';
import { doomTime, ENEMY_STATS } from '../../sim/enemies/kinds';
import { BOSS } from '../../tuning/boss';
import { Aura } from './aura';
import { tintBoss } from './bossTint';

export const DEMON_URL = '/models/enemies/demon.glb';

type Role = 'idle' | 'walk' | 'crouch' | 'run' | 'spring' | 'air' | 'land' | 'thrust' | 'daze' | 'roar' | 'stance' | 'down';
/** Its clips (export_monster.py lists them). */
export const DEMON_CLIPS: Record<Role, string> = { idle: 'Idle', walk: 'Walk', crouch: 'Duck', run: 'Run', spring: 'Jump', air: 'Jump_Idle', land: 'Jump_Land', thrust: 'Weapon', daze: 'No', roar: 'Punch', stance: 'Wave', down: 'HitReact' };
const ONCE: Role[] = ['spring', 'land', 'thrust', 'roar', 'stance', 'down'];
/** Seconds into its clips when the trident's thrust lands (export_monster.py), the spring leaves the ground, its arms
 *  are widest (the roar) and its pose is held when it dies. */
const THRUST = 16 / 30;
const SPRING = 10 / 30;
const ROAR = 17 / 30;
const DOWN = 6 / 30;
const FADE = 0.15;
/** Each move's warning glow. */
const GLOW: Record<number, [number, number, number]> = { [CHARGE]: [1, 0.08, 0.03], [LEAP]: [1, 0.45, 0.04], [VOLLEY]: [0.95, 0.2, 0.75] };

const at = new THREE.Vector3();
const chest = new THREE.Vector3();

/** The Demon in play (its slot in use), if any. */
export function demonIn(state: CombatState): Enemy | null {
  for (const e of state.enemies) if (e.alive && e.kind === 'demon') return e;
  return null;
}

/** Update 0.0.18 — the boss in play, whichever it is. */
export function bossIn(state: CombatState): Enemy | null {
  for (const e of state.enemies) if (e.alive && ENEMY_STATS[e.kind]().boss) return e;
  return null;
}

export class DemonView {
  readonly group = new THREE.Group();
  readonly loaded: Promise<void>;
  private root: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions = {} as Record<Role, THREE.AnimationAction>;
  private role: Role | null = null;
  private mats: THREE.MeshStandardMaterial[] = [];
  private height = 1;
  private lowest = 0;
  private time = 0;
  private readonly aura = new Aura({ calm: [1, 0.28, 0.05], rage: [1, 0.1, 0.12], ring: 0xff4a10, light: 0xff3a18, embers: 0xff5a20 });

  constructor(scene: THREE.Scene, loadModel = true) {
    scene.add(this.group);
    this.group.add(this.aura.group);
    this.group.visible = false;
    this.loaded = loadModel
      ? new GLTFLoader()
          .loadAsync(DEMON_URL)
          .then((gltf) => this.attach(gltf.scene, gltf.animations))
          .catch((err) => console.error('demon model failed to load', err))
      : Promise.resolve();
  }

  attach(model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    let skinned: THREE.SkinnedMesh | null = null;
    model.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh && (!skinned || o.geometry.attributes.position.count > skinned.geometry.attributes.position.count)) skinned = o;
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      o.frustumCulled = false;
      o.material = (o.material as THREE.MeshStandardMaterial).clone();
      this.mats.push(o.material as THREE.MeshStandardMaterial);
    });
    const geo = (skinned as THREE.SkinnedMesh | null)?.geometry;
    geo?.computeBoundingBox();
    if (geo?.boundingBox) {
      this.height = geo.boundingBox.max.y - geo.boundingBox.min.y;
      this.lowest = geo.boundingBox.min.y;
    }
    this.mixer = new THREE.AnimationMixer(model);
    const find = (name: string) => animations.find((a) => a.name === name || a.name.endsWith(`|${name}`)) ?? animations[0];
    for (const role of Object.keys(DEMON_CLIPS) as Role[]) {
      const a = this.mixer.clipAction(find(DEMON_CLIPS[role]));
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

  /** The Demon on screen, if one is in play. `camera`: where you look from (its glow faces you). */
  update(state: CombatState, camera: THREE.Vector3, alpha: number, dt: number) {
    const e = demonIn(state);
    // Gone once its body has burst.
    this.group.visible = !!e && !(e.phase === 'dead' && e.struck);
    if (!e || !this.group.visible) return;
    this.time += dt;
    const v = BOSS.v;
    at.copy(e.prev).lerp(e.pos, alpha);
    const rage = e.stage > 0;
    const dead = e.phase === 'dead';
    // The body.
    const root = this.root;
    if (root && this.mixer) {
      root.visible = true;
      const scale = v.demonHeight / this.height;
      root.scale.setScalar(scale);
      root.position.set(at.x, at.y - this.lowest * scale, at.z);
      root.rotation.y = e.facing + Math.PI;
      this.animate(e, dt);
      this.tint(e);
    }
    // The aura, round its chest; brighter and redder once it rages, dying away as it sinks.
    chest.set(at.x, at.y + v.demonHeight * 0.5, at.z);
    const fade = dead ? Math.max(0, 1 - e.t / doomTime()) : 1;
    this.aura.update(at, chest, v.demonHeight, rage, fade, camera, dt);
  }

  /** The clip its phase plays; its speed fitted so the move's moment lands as the warning ends. */
  private animate(e: Enemy, dt: number) {
    const v = BOSS.v;
    let role: Role;
    switch (e.phase) {
      case 'intro':
        role = e.pos.y < -0.05 ? 'air' : 'stance';
        break;
      case 'chase':
        role = Math.hypot(e.pos.x - e.prev.x, e.pos.z - e.prev.z) > 1e-4 ? 'walk' : 'idle';
        break;
      case 'windup':
        role = e.move === CHARGE ? 'crouch' : e.move === LEAP ? 'spring' : 'thrust';
        break;
      case 'charge':
        role = 'run';
        break;
      case 'leap':
        role = 'air';
        break;
      case 'recover':
        role = e.move === LEAP ? 'land' : e.move === VOLLEY ? 'thrust' : 'idle';
        break;
      case 'stun':
        role = 'daze';
        break;
      case 'roar':
        role = 'roar';
        break;
      case 'dead':
        role = 'down';
        break;
      default:
        role = 'idle';
    }
    if (role !== this.role) this.play(role);
    const a = this.actions;
    a.spring.timeScale = SPRING / windupOf(e, LEAP);
    a.thrust.timeScale = THRUST / windupOf(e, VOLLEY);
    a.run.timeScale = 1.7 * (e.stage > 0 ? v.rageSpeed : 1);
    a.walk.timeScale = 0.9 * (e.stage > 0 ? v.rageSpeed : 1);
    a.roar.timeScale = ROAR / (v.roarTime * 0.4);
    // Killed: the pose freezes in the air.
    a.down.timeScale = a.down.time >= DOWN ? 0 : 1;
    this.mixer!.update(dt);
  }

  /** Its glow (bossTint.ts), a warning in its move's colour. */
  private tint(e: Enemy) {
    tintBoss(e, this.mats, windupOf(e, e.move), GLOW[e.move] ?? GLOW[CHARGE], this.time);
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
  }
}
