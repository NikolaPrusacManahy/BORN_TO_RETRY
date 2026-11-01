// M1 step 6 — draws the training dummies (posts that lean, slide and flash), the turret (its head glows red
// while warning and turns to face you) and its orange orbs.
// Update 0.2.4 — a shot that's a Tribal's spear or a Cactoro's spine is drawn as a shaft along its flight. Update 0.2.7
// — and a White Rabbit's carrot: a fat orange one.
// Update 0.2.27 — every shot (the turret's too) is shotsView.ts's now, each in its own shape.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { TARGET_SHAPES } from '../sim/combat/targets';
import { TARGETS } from '../tuning/combat';

const DUMMY_COLOR = 0xb49a76;
const TURRET_COLOR = 0x4a4652;
/** How long a respawning target takes to pop back in (s). */
const POP_IN = 0.18;

interface DummyView {
  group: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  pop: number;
}

interface TurretView {
  group: THREE.Group;
  head: THREE.Group;
  headMat: THREE.MeshStandardMaterial;
  pop: number;
}

export class TargetsView {
  readonly group = new THREE.Group();
  private readonly dummies: DummyView[] = [];
  private readonly turrets: TurretView[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly look = new THREE.Vector3();

  constructor(scene: THREE.Scene, state: CombatState) {
    const d = TARGET_SHAPES.dummy;
    const base = this.geo(new THREE.CylinderGeometry(0.45, 0.5, 0.15, 16));
    const post = this.geo(new THREE.CapsuleGeometry(d.radius, d.height - d.radius * 2 - 0.35, 6, 14));
    const head = this.geo(new THREE.SphereGeometry(0.26, 16, 12));
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2c2830, roughness: 0.9 });
    for (const dummy of state.dummies) {
      const mat = new THREE.MeshStandardMaterial({ color: DUMMY_COLOR, roughness: 0.85 });
      const g = new THREE.Group();
      const b = new THREE.Mesh(base, baseMat);
      b.position.y = 0.075;
      const p = new THREE.Mesh(post, mat);
      p.position.y = d.height / 2 - 0.15;
      const h = new THREE.Mesh(head, mat);
      h.position.y = d.height - 0.2;
      for (const m of [b, p, h]) m.castShadow = m.receiveShadow = true;
      g.add(b, p, h);
      g.position.copy(dummy.home);
      this.group.add(g);
      this.dummies.push({ group: g, mat, pop: 1 });
    }

    const t = TARGET_SHAPES.turret;
    const pedestal = this.geo(new THREE.BoxGeometry(0.8, t.muzzleHeight - 0.35, 0.8));
    const sphere = this.geo(new THREE.SphereGeometry(t.radius * 0.9, 20, 14));
    const barrel = this.geo(new THREE.CylinderGeometry(0.1, 0.12, 0.45, 12));
    const bodyMat = new THREE.MeshStandardMaterial({ color: TURRET_COLOR, roughness: 0.7, metalness: 0.2 });
    for (const turret of state.turrets) {
      const headMat = new THREE.MeshStandardMaterial({ color: 0x5a3a3a, roughness: 0.5, emissive: 0xff2a10, emissiveIntensity: 0 });
      const g = new THREE.Group();
      const ped = new THREE.Mesh(pedestal, bodyMat);
      ped.position.y = (t.muzzleHeight - 0.35) / 2;
      const hd = new THREE.Group();
      hd.position.y = t.muzzleHeight;
      const ball = new THREE.Mesh(sphere, headMat);
      const gun = new THREE.Mesh(barrel, bodyMat);
      gun.rotation.x = Math.PI / 2;
      gun.position.z = t.radius * 0.9;
      hd.add(ball, gun);
      for (const m of [ped, ball, gun]) m.castShadow = m.receiveShadow = true;
      g.add(ped, hd);
      g.position.copy(turret.pos);
      this.group.add(g);
      this.turrets.push({ group: g, head: hd, headMat, pop: 1 });
    }

    scene.add(this.group);
  }

  private geo<G extends THREE.BufferGeometry>(g: G): G {
    this.geos.push(g);
    return g;
  }

  /** A target came back: it pops in. `index` is found by position. */
  respawned(state: CombatState, x: number, z: number) {
    state.dummies.forEach((d, i) => {
      if (d.home.x === x && d.home.z === z) this.dummies[i].pop = 0;
    });
    state.turrets.forEach((t, i) => {
      if (t.pos.x === x && t.pos.z === z) this.turrets[i].pop = 0;
    });
  }

  /** `dt`: game time (stops in hit-stop). `player`: where the turret looks. */
  update(state: CombatState, playerChest: THREE.Vector3, dt: number) {
    for (let i = 0; i < state.dummies.length; i++) {
      const d = state.dummies[i];
      const v = this.dummies[i];
      v.group.visible = !d.broken;
      if (d.broken) continue;
      v.pop = Math.min(1, v.pop + dt / POP_IN);
      v.group.position.set(d.home.x + d.offset.x, d.home.y, d.home.z + d.offset.z);
      v.group.rotation.set(d.tilt.x, 0, d.tilt.z);
      v.group.scale.setScalar(0.6 + 0.4 * v.pop);
      v.mat.emissive.setRGB(1, 1, 1);
      v.mat.emissiveIntensity = d.flash > 0 ? 0.9 : 0;
    }
    for (let i = 0; i < state.turrets.length; i++) {
      const t = state.turrets[i];
      const v = this.turrets[i];
      v.group.visible = !t.broken;
      if (t.broken) continue;
      v.pop = Math.min(1, v.pop + dt / POP_IN);
      v.group.scale.setScalar(0.6 + 0.4 * v.pop);
      this.look.copy(playerChest);
      this.look.y = Math.max(this.look.y, t.pos.y + 0.3);
      v.head.lookAt(this.look);
      // Glows up over the warning, flashes white when hit.
      const warn = t.telegraph > 0 ? 1 - t.telegraph / TARGETS.v.turretTelegraph : 0;
      v.headMat.emissive.setHex(t.flash > 0 ? 0xffffff : 0xff2a10);
      v.headMat.emissiveIntensity = t.flash > 0 ? 0.9 : warn * 2.5;
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.geos.forEach((g) => g.dispose());
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
    });
  }
}
