// Update 0.1.4 — the Grimoire's fireballs as you see them (sim/weapons/fireballs.ts): a white-hot core in an orange
// glow, flames streaming behind it and embers falling off, an orange light moving with it; it leaves from your palm
// (where the arms draw it) and joins its true path over LAUNCH s. Bursting, a flare of flames thrown every way, embers,
// and a flash of light. A charged one (kiCharge.ts) is as big as its power says (drawn smaller near your eye, so it
// never swallows the view) and bursts as wide: a ball of fire swelling out to its reach. It also tells the arms how
// far the charge in your hand has come. Two lights only, always there (a light added later would make every material
// rebuild); nothing made per frame.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { FIREBALL_POOL } from '../sim/weapons/fireballs';
import { FIRE_SIZE, kiFull, KiPower, kiPower } from '../sim/weapons/kiCharge';
import { WEAPONS } from '../tuning/weapons';
import { EMBERS, FIRE, FlameStyle, Flames } from './fx/flames';
import type { Viewmodel } from './viewmodel/viewmodel';

/** Seconds a fireball takes to go from the palm to its true path. */
const LAUNCH = 0.08;
/** The core's size (m), and the flames a second it trails. */
const CORE = 0.13;
const TRAIL_RATE = 160;
/** A burst's flash (s); a charged burst's ball of fire swelling out and fading (s). */
const FLASH = 0.3;
const BLAST = 0.5;
/** How near your eye a ball may be drawn: never wider than this much of its distance. */
const NEAR = 0.35;

const TRAIL: FlameStyle = { ...FIRE, life: [0.22, 0.45], size: [0.42, 0.06], rise: 1.2, drag: 2.5, wobble: 0.8 };
const FLARE: FlameStyle = { ...FIRE, life: [0.3, 0.6], size: [0.7, 0.1], rise: 2, drag: 3.5, wobble: 0.6 };
const FALLING: FlameStyle = { ...EMBERS, life: [0.5, 1.1], size: [0.06, 0.015], rise: -3, drag: 0.8 };

const at = new THREE.Vector3();
const v = new THREE.Vector3();
const power: KiPower = { damage: 0, splash: 0, burst: 0, size: 0, speed: 0, knock: 0 };

export class FireView {
  readonly group = new THREE.Group();
  private readonly trail = new Flames(500, TRAIL);
  private readonly flare = new Flames(300, FLARE);
  private readonly embers = new Flames(200, FALLING);
  private readonly cores: THREE.Mesh[] = [];
  private readonly halos: THREE.Mesh[] = [];
  private readonly blast: THREE.Mesh;
  private blastT = -1;
  private blastR = 0;
  private readonly lights = [new THREE.PointLight(0xff7a30, 0, 9, 2), new THREE.PointLight(0xff7a30, 0, 9, 2)];
  private readonly was: boolean[] = new Array(FIREBALL_POOL).fill(false);
  private readonly launch: number[] = new Array(FIREBALL_POOL).fill(-1);
  private readonly from: THREE.Vector3[] = Array.from({ length: FIREBALL_POOL }, () => new THREE.Vector3());
  private readonly last: THREE.Vector3[] = Array.from({ length: FIREBALL_POOL }, () => new THREE.Vector3());
  private flash = 0;
  private flashK = 1;
  private time = 0;

  constructor(
    scene: THREE.Object3D,
    private readonly arms: Viewmodel,
    private readonly camera: THREE.Camera,
  ) {
    const geo = new THREE.SphereGeometry(1, 16, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, toneMapped: false });
    const glow = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    for (let i = 0; i < FIREBALL_POOL; i++) {
      const m = new THREE.Mesh(geo, mat);
      const h = new THREE.Mesh(geo, glow);
      m.visible = h.visible = false;
      this.cores.push(m);
      this.halos.push(h);
      this.group.add(m, h);
    }
    // (Seen from inside too: a full charge's burst reaches you.)
    this.blast = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.blast.visible = false;
    this.group.add(this.trail.mesh, this.flare.mesh, this.embers.mesh, this.blast, ...this.lights);
    scene.add(this.group);
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    this.arms.book.ki = state.ki.charging ? state.ki.t : -1;
    let light = 0;
    for (let i = 0; i < FIREBALL_POOL; i++) {
      const f = state.fireballs[i];
      const core = this.cores[i];
      if (f.alive && !this.was[i]) this.launch[i] = 0;
      if (!f.alive && this.was[i]) this.burst(this.last[i], f.charge, f.pos);
      this.was[i] = f.alive;
      core.visible = this.halos[i].visible = f.alive;
      if (!f.alive) continue;
      at.copy(f.pos);
      if (this.launch[i] >= 0) {
        // It leaves from the palm, riding it as the hand thrusts out (the arms' scene is the camera's: its camera
        // sits at the eye).
        this.camera.updateMatrixWorld();
        this.from[i].copy(this.arms.book.palm).applyMatrix4(this.camera.matrixWorld);
        this.launch[i] += dt;
        const k = Math.min(1, this.launch[i] / LAUNCH);
        at.lerpVectors(this.from[i], f.pos, k * k * (3 - 2 * k));
        if (k >= 1) this.launch[i] = -1;
      }
      this.last[i].copy(at);
      // As big as its power, but never wider than NEAR of its distance from your eye.
      const big = Math.max(1, Math.min(kiPower(f.charge, power).size, at.distanceTo(this.camera.position) * NEAR) / FIRE_SIZE);
      core.position.copy(at);
      core.scale.setScalar(CORE * big * (1 + 0.12 * Math.sin(this.time * 40 + i)));
      this.halos[i].position.copy(at);
      this.halos[i].scale.setScalar(CORE * big * (1.9 + 0.15 * Math.sin(this.time * 27 + i)));
      // Flames stream off it (lagging behind as it flies), embers fall.
      v.copy(f.vel).multiplyScalar(0.08);
      this.trail.emit(Math.ceil(TRAIL_RATE * Math.min(big, 4) * dt), at, v, 0.6 * big, big, 0.06 * big);
      this.embers.emit((Math.floor(this.time * 60) + i) % 2 === 0 || big > 1.5 ? Math.ceil(Math.min(big, 4)) : 0, at, null, 1.2 * big, 1, 0.08 * big);
      if (light < this.lights.length) {
        const l = this.lights[light++];
        l.position.copy(at);
        l.distance = 9 * big;
        l.intensity = (2.5 + 0.6 * Math.sin(this.time * 33 + i)) * big * big;
      }
    }
    // A burst's flash takes a light that's free.
    if (this.flash > 0) {
      this.flash -= dt;
      if (light < this.lights.length) this.lights[light++].intensity = 9 * this.flashK ** 1.5 * Math.max(0, this.flash / FLASH);
    }
    if (this.blastT >= 0) {
      this.blastT += dt;
      const k = Math.min(1, this.blastT / BLAST);
      this.blast.scale.setScalar(this.blastR * (0.15 + 0.85 * (1 - (1 - k) ** 3)));
      (this.blast.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
      if (k >= 1) {
        this.blastT = -1;
        this.blast.visible = false;
      }
    }
    for (; light < this.lights.length; light++) this.lights[light].intensity = 0;
    this.trail.update(dt, this.camera);
    this.flare.update(dt, this.camera);
    this.embers.update(dt, this.camera);
  }

  /** It bursts at `where` (drawn there) or where the rules put it (`truth`), the nearer to the camera's line; as wide
   *  as its charge says. */
  private burst(where: THREE.Vector3, charge: number, truth: THREE.Vector3) {
    const reach = kiPower(charge, power).burst;
    const k = reach / Math.max(0.1, WEAPONS.v.fireRadius);
    at.copy(truth.distanceToSquared(where) < 4 ? truth : where);
    this.flare.emit(Math.round(45 * Math.min(k, 6)), at, null, 3.5 * k, Math.min(k, 12), 0.1 * k);
    this.embers.emit(Math.round(25 * Math.min(k, 4)), at, v.set(0, 2.5, 0), 4 * Math.min(k, 8), Math.min(k, 3), 0.1 * k);
    this.flash = FLASH * (1 + Math.min(1, charge / Math.max(1e-3, kiFull())));
    this.flashK = k;
    const l = this.lights[this.lights.length - 1];
    l.position.copy(at);
    l.distance = 9 * Math.max(1, k);
    if (charge >= WEAPONS.v.kiStep) {
      this.blastT = 0;
      this.blastR = reach;
      this.blast.position.copy(at);
      this.blast.visible = true;
    }
  }

  clear() {
    this.trail.clear();
    this.flare.clear();
    this.embers.clear();
    this.cores.forEach((c) => (c.visible = false));
    this.halos.forEach((h) => (h.visible = false));
    this.blast.visible = false;
    this.blastT = -1;
    this.lights.forEach((l) => (l.intensity = 0));
    this.was.fill(false);
    this.launch.fill(-1);
  }

  dispose() {
    this.group.removeFromParent();
    this.trail.dispose();
    this.flare.dispose();
    this.embers.dispose();
  }
}
