// Update 0.2.4 — the Pistol's touches in the arms' scene (drawn with the arms): the muzzle flash (a star of fire along
// the barrel and a burst facing you, a different turn each shot, gone in a few frames), the spent cases thrown out of
// the ejection port to the right, spinning, and the empty magazine dropping out of the grip as you reload, tumbling out
// of view. The arms' scene is the arms camera's space: down is −y.
import * as THREE from 'three';

/** Seconds a flash shows. */
const FLASH = 0.05;
const SHELLS = 8;
const SHELL_LIFE = 0.9;
const MAG_LIFE = 0.9;
const GRAVITY = 9.8;

interface Falling {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
}

/** A soft star, white in the middle (made in code, so the tests can make one too). */
function starTexture(): THREE.DataTexture {
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = (x + 0.5) / n - 0.5;
      const dy = (y + 0.5) / n - 0.5;
      const r = Math.hypot(dx, dy) * 2;
      const a = Math.atan2(dy, dx);
      const rays = 0.55 + 0.45 * Math.pow(Math.abs(Math.cos(a * 3)), 6);
      const k = Math.max(0, 1 - r / rays);
      const i = (y * n + x) * 4;
      data[i] = 255;
      data[i + 1] = Math.round(200 + 55 * k);
      data[i + 2] = Math.round(120 + 135 * k * k);
      data[i + 3] = Math.round(255 * Math.min(1, k * k * 1.6));
    }
  const t = new THREE.DataTexture(data, n, n);
  t.needsUpdate = true;
  return t;
}

export class GunFx {
  readonly flash = new THREE.Group();
  private readonly flashMat: THREE.MeshBasicMaterial;
  private flashLeft = 0;
  private readonly shells: Falling[] = [];
  private next = 0;
  private readonly mag: Falling;
  private readonly dq = new THREE.Quaternion();
  private readonly e = new THREE.Euler();

  constructor(private readonly scene: THREE.Scene) {
    this.flashMat = new THREE.MeshBasicMaterial({ map: starTexture(), color: 0xffc27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    // Along the barrel (+x of the muzzle's frame): three blades crossed; a burst facing back.
    const blade = new THREE.PlaneGeometry(0.16, 0.06).translate(0.07, 0, 0);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(blade, this.flashMat);
      m.rotation.x = (i * Math.PI) / 3;
      this.flash.add(m);
    }
    const burst = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.09).rotateY(Math.PI / 2), this.flashMat);
    burst.position.x = 0.01;
    this.flash.add(burst);
    this.flash.visible = false;
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.7, roughness: 0.35 });
    const shell = new THREE.CylinderGeometry(0.0055, 0.0055, 0.022, 10);
    for (let i = 0; i < SHELLS; i++) {
      const mesh = new THREE.Mesh(shell, brass);
      mesh.visible = false;
      scene.add(mesh);
      this.shells.push({ mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0 });
    }
    const mag = new THREE.Mesh();
    mag.visible = false;
    scene.add(mag);
    this.mag = { mesh: mag, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0 };
  }

  /** The flash goes on the gun's muzzle (its frame: +x along the barrel). */
  mount(muzzle: THREE.Object3D | null, along: THREE.Vector3) {
    this.flash.removeFromParent();
    if (!muzzle) return;
    muzzle.add(this.flash);
    this.flash.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), along);
  }

  /** A shot: the flash; a case out of `port` (world of the arms' scene) towards `right` and `up` (lengths 1). */
  shot(port: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, back: THREE.Vector3) {
    this.flashLeft = FLASH;
    this.flash.rotation.x = Math.random() * Math.PI;
    this.flash.scale.setScalar(0.8 + Math.random() * 0.5);
    const s = this.shells[this.next];
    this.next = (this.next + 1) % SHELLS;
    s.mesh.position.copy(port);
    s.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), right);
    s.vel.copy(right).multiplyScalar(1.6 + Math.random() * 0.5).addScaledVector(up, 1.3 + Math.random() * 0.4).addScaledVector(back, 0.35);
    s.spin.set(12 + Math.random() * 8, Math.random() * 6, 18 + Math.random() * 8);
    s.life = SHELL_LIFE;
    s.mesh.visible = true;
  }

  /** The magazine drops out: a copy of `part` (where it is now) falls along `down` (length 1). */
  dropMag(part: THREE.Mesh, down: THREE.Vector3) {
    const m = this.mag;
    m.mesh.geometry = part.geometry;
    m.mesh.material = part.material;
    part.matrixWorld.decompose(m.mesh.position, m.mesh.quaternion, m.mesh.scale);
    m.vel.copy(down).multiplyScalar(1.4);
    m.spin.set(2 + Math.random() * 2, 0, 3 + Math.random() * 2);
    m.life = MAG_LIFE;
    m.mesh.visible = true;
  }

  update(dt: number) {
    this.flashLeft = Math.max(0, this.flashLeft - dt);
    this.flash.visible = this.flashLeft > 0;
    this.flashMat.opacity = Math.min(1, (this.flashLeft / FLASH) * 1.6);
    for (const f of [...this.shells, this.mag]) {
      if (f.life <= 0) continue;
      f.life -= dt;
      f.vel.y -= GRAVITY * dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      this.dq.setFromEuler(this.e.set(f.spin.x * dt, f.spin.y * dt, f.spin.z * dt));
      f.mesh.quaternion.multiply(this.dq);
      f.mesh.visible = f.life > 0;
    }
  }

  clear() {
    this.flashLeft = 0;
    this.flash.visible = false;
    for (const f of [...this.shells, this.mag]) {
      f.life = 0;
      f.mesh.visible = false;
    }
  }

  dispose() {
    this.clear();
    this.flash.removeFromParent();
    for (const f of this.shells) this.scene.remove(f.mesh);
    this.scene.remove(this.mag.mesh);
  }
}
