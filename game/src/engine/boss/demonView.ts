// Update 0.0.15 — the Demon as you see it (the designer: bigger, with an aura): the Ultimate Monsters Demon scaled to
// its size, its clips following its moves (it lowers its head to charge, springs to leap, thrusts its trident to cast,
// shakes its head when stunned, flings its arms wide to roar, raises its trident for its stance in the show), each
// warning glowing in its move's colour. Its aura: a glow behind it, embers rising round it, a ring of fire at its
// feet and a red light; all of it fiercer once it rages. Killed, its pose freezes in the air and it flickers white,
// faster and faster as it sinks, until it bursts (the flash: demonFx.ts). Clips run on game time.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CombatState } from '../../sim/combat/state';
import { windupOf } from '../../sim/enemies/demon';
import { CHARGE, LEAP, VOLLEY } from '../../sim/enemies/demonMoves';
import type { Enemy } from '../../sim/enemies/enemy';
import { doomTime } from '../../sim/enemies/kinds';
import { BOSS } from '../../tuning/boss';
import { Dust } from '../fx/dust';

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
  /** The aura. */
  private readonly glow: THREE.Mesh;
  private readonly glowMat: THREE.ShaderMaterial;
  private readonly ring: THREE.Mesh;
  private readonly light = new THREE.PointLight(0xff3a18, 0, 18, 1.5);
  private readonly embers: Dust;
  private readonly geos: THREE.BufferGeometry[] = [];

  constructor(scene: THREE.Scene, loadModel = true) {
    scene.add(this.group);
    this.glowMat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(1, 0.25, 0.05) }, power: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 color; uniform float power; varying vec2 vUv; void main() { float r = length(vUv * 2.0 - 1.0); float k = pow(max(0.0, 1.0 - r), 2.2); gl_FragColor = vec4(color * k * power, 1.0); }',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const plane = new THREE.PlaneGeometry(1, 1);
    const ringGeo = new THREE.RingGeometry(0.75, 1, 48).rotateX(-Math.PI / 2);
    this.geos.push(plane, ringGeo);
    this.glow = new THREE.Mesh(plane, this.glowMat);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff4a10, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.embers = new Dust(90, new THREE.Vector3(-2.6, 0, -2.6), new THREE.Vector3(2.6, 7, 2.6), { color: 0xff5a20, size: 0.13, opacity: 0.9, rise: [1.5, 4] });
    this.group.add(this.glow, this.ring, this.light, this.embers.points);
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
    const pulse = 0.85 + 0.15 * Math.sin(this.time * (rage ? 7 : 4));
    this.glow.position.copy(chest);
    this.glow.lookAt(camera);
    this.glow.scale.setScalar(v.demonHeight * (rage ? 1.75 : 1.45));
    this.glowMat.uniforms.power.value = (rage ? 1.1 : 0.7) * pulse * fade;
    (this.glowMat.uniforms.color.value as THREE.Color).setRGB(1, rage ? 0.1 : 0.28, rage ? 0.12 : 0.05);
    this.ring.position.set(at.x, Math.max(0.05, at.y + 0.05), at.z);
    this.ring.scale.setScalar(2.4 + 0.25 * Math.sin(this.time * 3));
    this.ring.rotation.y = this.time * 0.8;
    (this.ring.material as THREE.MeshBasicMaterial).opacity = (rage ? 0.85 : 0.5) * pulse * fade * (at.y > 0.5 ? 0.3 : 1);
    this.light.position.copy(chest);
    this.light.intensity = (rage ? 55 : 32) * pulse * fade;
    this.embers.points.position.set(at.x, at.y, at.z);
    (this.embers.points.material as THREE.PointsMaterial).opacity = (rage ? 1 : 0.7) * fade;
    this.embers.update(dt * (rage ? 1.6 : 1));
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

  /** Its glow: a hit's white flash, a warning in its move's colour, a stunned pulse, its rage's embers; killed, a white
   *  flicker quickening as it sinks. */
  private tint(e: Enemy) {
    const v = BOSS.v;
    let r = e.flash / 0.12;
    let g = r;
    let b = r;
    if (e.phase === 'windup') {
      const k = Math.min(1, e.t / windupOf(e, e.move));
      const c = GLOW[e.move];
      r += k * c[0] * 1.2;
      g += k * c[1] * 1.2;
      b += k * c[2] * 1.2;
    } else if (e.phase === 'stun') {
      const k = 0.25 + 0.25 * Math.sin(e.t * 14);
      r += k;
      g += k * 0.8;
    } else if (e.phase === 'dead') {
      const k = Math.max(0, (e.t - v.doomRise) / (doomTime() - v.doomRise));
      const rate = 5 + 20 * k * k;
      const on = Math.sin(e.t * rate * Math.PI * 2) > 0 ? 1.6 + k : 0.15;
      r = g = b = e.t < v.doomRise ? 1.2 : on;
    }
    if (e.stage > 0 && e.phase !== 'dead') r += 0.22 + 0.08 * Math.sin(this.time * 6);
    for (const m of this.mats) m.emissive.setRGB(r, g, b);
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
    for (const g of this.geos) g.dispose();
    this.glowMat.dispose();
    (this.ring.material as THREE.Material).dispose();
    this.embers.dispose();
  }
}
