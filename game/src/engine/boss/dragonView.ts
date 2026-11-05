// Update 0.0.18 — the Dragon as you see it: the Ultimate Monsters Dragon scaled to its size, flying a little off the floor
// and bobbing; its clips follow its moves; it reels when stunned; its scream is the whole lunge; each warning glows in its
// move's colour. Its aura (aura.ts) burns gold, then red in phase 2. Killed, its death show is every boss's (bossTint.ts,
// bossFx.ts). Clips run on game time.
// Update 0.0.19 — measured from its skinned body (bodyMeasure.ts), as the newer pack's are.
// Update 0.3.49 — its moves are the Boss Design Bible's. Its head out and held through its Flame Sweep and after (the
// beam from its mouth to the floor, flameLineView.ts along it); its wings beating hard through its Wing Gust; claws out in
// its dive, set down on the floor where it sticks; its chest open on its core (dragonCoreView.ts), pulsing shut for its
// Ember Rain.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CombatState } from '../../sim/combat/state';
import { dragonWindup } from '../../sim/enemies/dragon';
import { BLAST, CORE, DIVE, EMBER, SWEEP, TAIL, WING } from '../../sim/enemies/dragonMoves';
import type { Enemy } from '../../sim/enemies/enemy';
import { doomTime } from '../../sim/enemies/kinds';
import { DRAGON } from '../../tuning/dragon';
import { posedBounds } from '../bodyMeasure';
import { Aura } from './aura';
import { BeamView } from './beamView';
import { tintBoss } from './bossTint';
import { DragonCoreView } from './dragonCoreView';
import { FlameLineView } from './flameLineView';

export const DRAGON_URL = '/models/enemies/dragon.glb';

type Role = 'fly' | 'strike' | 'lunge' | 'reel' | 'down';
/** Its clips (export_monster.py lists them). */
export const DRAGON_CLIPS: Record<Role, string> = { fly: 'Dragon_Flying', strike: 'Dragon_Attack', lunge: 'Dragon_Attack2', reel: 'Dragon_Hit', down: 'Dragon_Death' };
const ONCE: Role[] = ['strike', 'lunge', 'reel', 'down'];
/** Seconds into its clips (24 fps): the strike lands (export_monster.py), the lunge has its head furthest out, the
 *  whole lunge (its scream), and its pose is held when it dies. */
const STRIKE = 14 / 24;
const LUNGE = 10 / 24;
const SCREAM = 40 / 24;
const DOWN = 6 / 24;
const FADE = 0.15;
/** The fire's beam thins away over the last of the sweep (s), and lands this share of the way along its line. */
const BEAM_END = 0.2;
const BEAM_ALONG = 0.3;
/** The core sits on its chest plate: this far in front of its body bone and up from it (shares of its height; seen in
 *  renders of its pose); its scales open over this long (s). */
const CORE_OUT = 0.17;
const CORE_UP = 0.13;
const OPENS = 0.6;
/** How fast it settles to its height over the floor (share a second); its feet's bones this far off the floor set down
 *  (m: its claws reach below them), and sunk where it sticks. */
const SETTLE = 7;
const SET_DOWN = 0.3;
const STUCK = -0.4;
/** Each move's warning glow. */
const GLOW: Record<number, [number, number, number]> = {
  [SWEEP]: [1, 0.6, 0.12],
  [WING]: [0.95, 0.9, 0.35],
  [TAIL]: [0.7, 0.2, 1],
  [DIVE]: [1, 0.08, 0.03],
  [EMBER]: [1, 0.32, 0.05],
};

const at = new THREE.Vector3();
const chest = new THREE.Vector3();
const head = new THREE.Vector3();
const land = new THREE.Vector3();
const body = new THREE.Vector3();
const foot = new THREE.Vector3();

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
  private bodyBone: THREE.Object3D | null = null;
  private footBone: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions = {} as Record<Role, THREE.AnimationAction>;
  private role: Role | null = null;
  private mats: THREE.MeshStandardMaterial[] = [];
  private height = 1;
  private lowest = 0;
  private time = 0;
  private lift = 1;
  private lastFill = 0;
  private struck = 0;
  private readonly aura = new Aura({ calm: [1, 0.55, 0.1], rage: [1, 0.12, 0.05], ring: 0xffa020, light: 0xff8a30, embers: 0xffb040 });
  private readonly beam = new BeamView();
  private readonly flames = new FlameLineView();
  private readonly core = new DragonCoreView();

  constructor(scene: THREE.Scene, loadModel = true) {
    scene.add(this.group);
    this.group.add(this.aura.group, this.beam.group, this.flames.group, this.core.group);
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
      if (o.name === 'Body') this.bodyBone = o;
      if (o.name === 'Feet.L') this.footBone = o;
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      o.frustumCulled = false;
      o.material = (o.material as THREE.MeshStandardMaterial).clone();
      this.mats.push(o.material as THREE.MeshStandardMaterial);
    });
    const find = (name: string) => animations.find((a) => a.name === name || a.name.endsWith(`|${name}`)) ?? animations[0];
    const box = posedBounds(model, find(DRAGON_CLIPS.fly), new THREE.Box3());
    if (!box.isEmpty()) {
      this.height = box.max.y - box.min.y;
      this.lowest = box.min.y;
    }
    this.mixer = new THREE.AnimationMixer(model);
    for (const role of Object.keys(DRAGON_CLIPS) as Role[]) {
      const a = this.mixer.clipAction(find(DRAGON_CLIPS[role]));
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
    // Set down on its feet to charge its core; sunk in the floor where it sticks.
    const down = e.phase === 'blast' || (e.phase === 'recover' && e.move === BLAST);
    const stuck = e.phase === 'stun' && (e.move === DIVE || e.move === CORE);
    const want = stuck ? this.onFloor(at.y, STUCK) : down ? this.onFloor(at.y, SET_DOWN) : v.hover + (dead ? 0 : 0.25 * Math.sin(this.time * 2.2));
    this.lift += (want - this.lift) * Math.min(1, SETTLE * dt);
    const lift = this.lift;
    const root = this.root;
    if (root && this.mixer) {
      root.visible = true;
      const scale = v.dragonHeight / this.height;
      root.scale.setScalar(scale);
      root.position.set(at.x, at.y + lift - this.lowest * scale, at.z);
      root.rotation.y = e.facing + Math.PI;
      this.animate(e, dt);
      tintBoss(e, this.mats, dragonWindup(e, e.move), GLOW[e.move] ?? GLOW[SWEEP], this.time);
    }
    chest.set(at.x, at.y + lift + v.dragonHeight * 0.5, at.z);
    this.aura.update(at, chest, v.dragonHeight, e.stage > 0, dead ? Math.max(0, 1 - e.t / doomTime()) : 1, camera, dt);
    this.drawFire(e);
    this.drawCore(e, dt);
  }

  /** How high it should be for its feet's bones to be `over` m above the floor, as it's posed now. */
  private onFloor(ground: number, over: number): number {
    if (!this.footBone || !this.root) return 0;
    this.root.updateMatrixWorld(true);
    this.footBone.getWorldPosition(foot);
    return this.lift - (foot.y - ground) + over;
  }

  /** Its mouth, on the model as it's posed now. */
  private headAt(e: Enemy) {
    const v = DRAGON.v;
    if (this.headBone && this.root) {
      this.root.updateMatrixWorld(true);
      this.headBone.getWorldPosition(head);
      head.x -= Math.sin(e.facing) * v.dragonHeight * 0.12;
      head.z -= Math.cos(e.facing) * v.dragonHeight * 0.12;
    } else head.set(at.x, at.y + v.dragonHeight * 0.7, at.z);
  }

  /** Its Flame Sweep: gathering at its mouth, a thin line to where the fire will start; then the beam to the floor, the
   *  wall of flame along it. */
  private drawFire(e: Enemy) {
    const v = DRAGON.v;
    const charging = e.phase === 'windup' && e.move === SWEEP;
    const burning = e.phase === 'breath' && e.move === SWEEP;
    if ((!charging && !burning) || !this.root) {
      this.beam.update(at, at, 0, 0, this.time);
      this.flames.hide();
      return;
    }
    this.headAt(e);
    if (charging) {
      this.beam.charge(head, e.aim, Math.min(1, e.t / dragonWindup(e, SWEEP)), this.time);
      this.flames.hide();
      return;
    }
    const power = Math.min(1, Math.max(0, (v.sweepTime - e.t) / BEAM_END));
    land.copy(at).lerp(e.aim, BEAM_ALONG);
    land.y = 0;
    this.beam.update(head, land, power, 1, this.time);
    this.flames.update(at, e.aim, v.sweepClear, power, this.time);
  }

  /** Its chest: open on its core, charging; pulsing shut through its Ember Rain's tell. */
  private drawCore(e: Enemy, dt: number) {
    const u = e.ult;
    const charging = e.phase === 'blast';
    const pulsing = e.phase === 'windup' && e.move === EMBER;
    if ((!charging && !pulsing) || !this.root) {
      this.core.hide();
      this.lastFill = 0;
      return;
    }
    if (this.bodyBone) {
      this.root.updateMatrixWorld(true);
      this.bodyBone.getWorldPosition(body);
    } else body.set(at.x, at.y + DRAGON.v.dragonHeight * 0.5, at.z);
    const out = DRAGON.v.dragonHeight * CORE_OUT;
    body.x -= Math.sin(e.facing) * out;
    body.y += DRAGON.v.dragonHeight * CORE_UP;
    body.z -= Math.cos(e.facing) * out;
    if (pulsing) {
      const k = Math.min(1, e.t / dragonWindup(e, EMBER));
      // Three pulses over its tell.
      this.core.update(body, e.facing, 0.06, 0, Math.abs(Math.sin(k * Math.PI * 3)), 0, this.time);
      return;
    }
    // A hit on it flashes it.
    if (u.fill > this.lastFill) this.struck = 1;
    this.lastFill = u.fill;
    this.struck = Math.max(0, this.struck - dt * 6);
    const through = 1 - u.left / Math.max(0.1, u.window);
    this.core.update(body, e.facing, Math.min(1, e.t / OPENS), through, 0.45 + 0.55 * through, this.struck, this.time);
  }

  /** The clip its phase plays; its speed fitted so the move's moment lands as the warning ends. */
  private animate(e: Enemy, dt: number) {
    const a = this.actions;
    let role: Role = 'fly';
    switch (e.phase) {
      case 'intro':
        role = e.pos.y < -0.05 ? 'fly' : 'lunge';
        break;
      case 'windup':
        role = e.move === SWEEP ? 'lunge' : e.move === WING || e.move === TAIL ? 'strike' : 'fly';
        break;
      case 'breath':
        role = e.move === SWEEP ? 'lunge' : 'fly';
        break;
      case 'dive':
        role = e.move === DIVE ? 'strike' : 'fly';
        break;
      case 'blast':
        // (Its flying pose: head high, chest open. Its lunge's neck would cross the core.)
        role = 'fly';
        break;
      case 'recover':
        // Its head stays low after its fire; its back to you after its tail.
        role = e.move === SWEEP || e.move === BLAST ? 'lunge' : e.move === TAIL ? 'strike' : 'fly';
        break;
      case 'stun':
        role = 'reel';
        break;
      case 'dead':
        role = 'down';
        break;
      default:
        role = 'fly';
    }
    if (role !== this.role) this.play(role);
    const screaming = e.phase === 'intro';
    const v = DRAGON.v;
    const held = e.phase === 'breath' || (e.phase === 'recover' && e.move === SWEEP);
    a.lunge.timeScale = screaming ? SCREAM / Math.max(0.3, v.screamTime) : held || a.lunge.time >= LUNGE ? 0 : LUNGE / dragonWindup(e, e.move);
    // Claws out through its dive.
    a.strike.timeScale = e.phase === 'windup' ? STRIKE / dragonWindup(e, e.move) : e.phase === 'dive' && a.strike.time >= STRIKE ? 0 : 1;
    // Its wings beat hard in the sky and through its wind.
    a.fly.timeScale = e.phase === 'blast' ? 0.3 : e.phase === 'breath' && e.move === WING ? 2.6 : e.phase === 'sky' || e.phase === 'dive' ? 1.7 : e.stage > 0 ? 1.3 : 1;
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
    this.flames.dispose();
    this.core.dispose();
  }
}
