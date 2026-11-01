// Update 0.2.26 — blood (the designer: "blood splashes"; "Red, plentiful"): every hit on an enemy sprays its blood
// (bloodLooks.ts: red, ichor, bone chips, spores…) away from you, more the harder the hit; a kill bursts and leaves a
// pool under the body; an execution's blows spray and its end bursts with pools all round. Drops fly, fall and splat on
// the floor; the splats lie a while, then shrink away (a cap on how many: the oldest go first). Under water, a cloud.
// Made in code: small wet boxes for the drops, a splat drawn on a canvas. The Options' Blood setting: on, less, off.
// Which enemy a hit landed on: the one whose body the hit's point is on (the events carry only the point).
import * as THREE from 'three';
import type { CombatEvent, CombatState } from '../sim/combat/state';
import { Enemy, radiusOf } from '../sim/enemies/enemy';
import type { BloodLevel } from '../state/settings';
import { BloodAmount, BloodLook, BloodMode, bloodAmount, bloodOf } from './bloodLooks';

const DROPS = 900;
const SPLATS = 260;
const GRAVITY = 14;
/** A drop's size (m) and how long a chip lies / mist hangs (s); a pool's size for a body of radius 1 (m), and how long
 *  it takes to spread (s); splats sit this far over the floor (m). */
const DROP = 0.06;
const CHIP_REST = 2.5;
const MIST_LIFE = 1.1;
const POOL = 2.6;
const SPREAD = 0.7;
const SPLAT_Y = 0.014;
/** How far a hit's point may be off an enemy's body and still be on it (m). */
const ON_BODY = 1;

let level: BloodLevel = 'on';
/** The Options' Blood setting (App.tsx sets it). */
export const setBloodLevel = (b: BloodLevel) => {
  level = b;
};

interface Drop {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mode: BloodMode | 'cloud';
  floor: number;
  t: number;
  size: number;
  splat: number;
}

interface Splat {
  x: number;
  y: number;
  z: number;
  rot: number;
  size: number;
  t: number;
  life: number;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const dir = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const color = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/** A splat from above: a blob of overlapping drops and a few flung out round it (white: tinted per splat). */
function splatTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  const blob = (x: number, y: number, r: number) => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9; i++) blob(64 + (rnd() - 0.5) * 34, 64 + (rnd() - 0.5) * 34, 14 + rnd() * 16);
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 34 + rnd() * 24;
    blob(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2 + rnd() * 5);
  }
  return new THREE.CanvasTexture(c);
}

export class BloodFx {
  private readonly dropGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly dropMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.05 });
  private readonly drops: Drop[] = Array.from({ length: DROPS }, () => ({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), mode: 'drip', floor: 0, t: 0, size: DROP, splat: 0 }));
  private readonly dropMesh = new THREE.InstancedMesh(this.dropGeo, this.dropMat, DROPS);
  private readonly splatGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly splatTex = splatTexture();
  private readonly splatMat = new THREE.MeshStandardMaterial({ map: this.splatTex, transparent: true, depthWrite: false, roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -2 });
  private readonly splats: Splat[] = Array.from({ length: SPLATS }, () => ({ x: 0, y: 0, z: 0, rot: 0, size: 0, t: 0, life: 0 }));
  private readonly splatMesh = new THREE.InstancedMesh(this.splatGeo, this.splatMat, SPLATS);
  private nextDrop = 0;
  private nextSplat = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.splatTex.colorSpace = THREE.SRGBColorSpace;
    for (const [mesh, n] of [[this.dropMesh, DROPS], [this.splatMesh, SPLATS]] as const) {
      for (let i = 0; i < n; i++) {
        mesh.setMatrixAt(i, HIDDEN);
        mesh.setColorAt(i, color.setHex(0xffffff));
      }
      mesh.frustumCulled = false;
      scene.add(mesh);
    }
    this.dropMesh.castShadow = true;
    this.splatMesh.receiveShadow = true;
  }

  /** This frame's hits, kills and executions (before the events are cleared); `eye`: the camera (sprays fly away from
   *  it). */
  apply(state: CombatState, eye: THREE.Vector3) {
    const amount = bloodAmount(level);
    if (!amount) return;
    const ev = state.events;
    for (let i = 0; i < ev.length; i++) {
      const e = ev.at(i);
      const n = drops(e.kind, e.value, amount);
      if (n === 0) continue;
      const foe = e.kind === 'execBurst' ? state.enemies[e.value] : enemyAt(state, e.x, e.z);
      if (!foe) continue;
      const look = bloodOf(foe.kind);
      const under = e.y < state.tide;
      dir.set(e.x - eye.x, 0, e.z - eye.z).normalize();
      this.spray(e.x, e.y, e.z, look, n, foe.perch > 0 ? foe.perch : 0, under, e.kind === 'kill' || e.kind === 'execBurst');
      if (!amount.pools || under || look.mode !== 'drip') continue;
      if (e.kind === 'kill') this.splat(foe.pos.x, foe.perch > 0 ? foe.perch : 0, foe.pos.z, POOL * Math.max(0.6, radiusOf(foe)), amount.life, look.splat, true);
      if (e.kind === 'execBurst') for (let k = 0; k < 3; k++) this.splat(foe.pos.x + (Math.random() - 0.5) * 3, 0, foe.pos.z + (Math.random() - 0.5) * 3, POOL * (0.7 + Math.random() * 0.6), amount.life, look.splat, true);
    }
  }

  /** `n` drops from (x, y, z) away from you (`all`: every way, a burst), falling to `floor`. */
  private spray(x: number, y: number, z: number, look: BloodLook, n: number, floor: number, under: boolean, all: boolean) {
    color.setHex(look.drop);
    for (let k = 0; k < n; k++) {
      const idx = this.nextDrop;
      const d = this.drops[idx];
      this.nextDrop = (idx + 1) % DROPS;
      d.alive = true;
      d.pos.set(x, y, z);
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * (all ? 6 : 5);
      const out = all ? 0 : 0.7;
      d.vel.set(Math.cos(a) * (1 - out) + dir.x * out, 0, Math.sin(a) * (1 - out) + dir.z * out).normalize().multiplyScalar(speed);
      d.vel.y = 1 + Math.random() * (all ? 5 : 3.5);
      d.mode = under ? 'cloud' : look.mode;
      d.floor = floor;
      d.t = 0;
      d.size = DROP * (0.6 + Math.random() * (d.mode === 'chip' ? 1.6 : 1));
      d.splat = look.splat;
      if (d.mode === 'mist' || d.mode === 'cloud') d.vel.multiplyScalar(0.35);
      this.dropMesh.setColorAt(idx, color);
    }
    if (this.dropMesh.instanceColor) this.dropMesh.instanceColor.needsUpdate = true;
  }

  /** A splat (`pool`: it spreads from nothing over SPREAD s). */
  private splat(x: number, y: number, z: number, size: number, life: number, hex: number, pool = false) {
    const i = this.nextSplat;
    this.nextSplat = (this.nextSplat + 1) % SPLATS;
    const s = this.splats[i];
    Object.assign(s, { x, y: y + SPLAT_Y + i * 0.00004, z, rot: Math.random() * Math.PI * 2, size, t: pool ? -SPREAD : 0, life });
    this.splatMesh.setColorAt(i, color.setHex(hex));
    if (this.splatMesh.instanceColor) this.splatMesh.instanceColor.needsUpdate = true;
  }

  update(dt: number) {
    const life = bloodAmount(level)?.life ?? 0;
    this.drops.forEach((d, i) => {
      if (!d.alive) return;
      d.t += dt;
      if (d.mode === 'mist' || d.mode === 'cloud') {
        d.vel.multiplyScalar(Math.max(0, 1 - 2.5 * dt));
        d.vel.y += (d.mode === 'mist' ? 0.8 : 0.3) * dt;
        d.pos.addScaledVector(d.vel, dt);
        const k = 1 + d.t * 2.5;
        if (d.t > MIST_LIFE) d.alive = false;
        this.dropMesh.setMatrixAt(i, d.alive ? m.compose(d.pos, q.identity(), scale.setScalar(d.size * k * (1 - d.t / MIST_LIFE))) : HIDDEN);
        return;
      }
      if (d.mode === 'chip' && d.pos.y <= d.floor) {
        // A chip lies there a while.
        if (d.t > CHIP_REST) d.alive = false;
        this.dropMesh.setMatrixAt(i, d.alive ? m.compose(d.pos, q.setFromAxisAngle(UP, i), scale.setScalar(d.size)) : HIDDEN);
        return;
      }
      d.vel.y -= GRAVITY * dt;
      d.pos.addScaledVector(d.vel, dt);
      if (d.pos.y <= d.floor) {
        d.pos.y = d.floor;
        if (d.mode === 'drip') {
          d.alive = false;
          if (d.splat && life > 0) this.splat(d.pos.x, d.floor, d.pos.z, 0.18 + Math.random() * 0.35 + d.size * 3, life, d.splat);
        } else d.vel.set(0, 0, 0);
      }
      // Stretched along its flight.
      q.setFromUnitVectors(UP, pos.copy(d.vel).normalize());
      const stretch = d.mode === 'drip' ? 1 + Math.min(3, d.vel.length() * 0.25) : 1;
      this.dropMesh.setMatrixAt(i, d.alive ? m.compose(d.pos, q, scale.set(d.size, d.size * stretch, d.size)) : HIDDEN);
    });
    this.dropMesh.instanceMatrix.needsUpdate = true;
    this.splats.forEach((s, i) => {
      if (s.life <= 0) return;
      s.t += dt;
      // Spreading (a pool), lying, then shrinking away in its last 3 s.
      const k = s.t < 0 ? 1 + s.t / SPREAD : Math.min(1, (s.life - s.t) / 3);
      if (s.t >= s.life) s.life = 0;
      const size = s.life > 0 ? s.size * Math.max(0, Math.min(1, k)) : 0;
      this.splatMesh.setMatrixAt(i, size > 0 ? m.compose(pos.set(s.x, s.y, s.z), q.setFromAxisAngle(UP, s.rot), scale.set(size, 1, size)) : HIDDEN);
    });
    this.splatMesh.instanceMatrix.needsUpdate = true;
  }

  /** Drops in the air (or lying, or hanging), splats on the floor, and how many of the drops are clouds (for tests). */
  counts() {
    const live = this.drops.filter((d) => d.alive);
    return { drops: live.length, splats: this.splats.filter((s) => s.life > 0).length, clouds: live.filter((d) => d.mode === 'cloud').length, chips: live.filter((d) => d.mode === 'chip').length };
  }

  dispose() {
    this.scene.remove(this.dropMesh, this.splatMesh);
    this.dropGeo.dispose();
    this.dropMat.dispose();
    this.splatGeo.dispose();
    this.splatMat.dispose();
    this.splatTex.dispose();
  }
}

/** How many drops event `kind` (with `value`) sprays (0: none of blood's). */
function drops(kind: CombatEvent, value: number, a: BloodAmount): number {
  switch (kind) {
    case 'hitJab':
    case 'hitFinisher':
    case 'hitSlash':
    case 'hitPierce':
    case 'hitThrown':
    case 'hitKnife':
    case 'hitShot':
    case 'hitSlam':
      return a.hit(value > 1 ? value : 15);
    case 'hitHeavy':
      return a.hit(20 + 30 * Math.min(1, value));
    case 'cardDot':
      return value === 0 ? Math.max(1, Math.round(a.hit(0) / 3)) : 0;
    case 'cardBlastHit':
    case 'cardZap':
      return Math.round(a.hit(10) / 2);
    case 'kill':
      return a.kill;
    case 'execBlow':
      return Math.round(a.exec / 3);
    case 'execBurst':
      return a.exec;
    default:
      return 0;
  }
}

/** The live enemy whose body (x, z) is on, if any. */
function enemyAt(state: CombatState, x: number, z: number): Enemy | null {
  let best: Enemy | null = null;
  let near = ON_BODY;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.pos.x - x, e.pos.z - z) - radiusOf(e);
    if (d < near) {
      near = d;
      best = e;
    }
  }
  return best;
}
