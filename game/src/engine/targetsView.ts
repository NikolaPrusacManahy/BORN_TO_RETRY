// M1 step 6 — draws the training dummies (posts that lean, slide and flash), the turret (its head glows red
// while warning and turns to face you) and its orange orbs.
// Update 0.2.4 — a shot that's a Tribal's spear or a Cactoro's spine is drawn as a shaft along its flight. Update 0.2.7
// — and a White Rabbit's carrot: a fat orange one.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { TARGET_SHAPES } from '../sim/combat/targets';
import { TARGETS } from '../tuning/combat';

const DUMMY_COLOR = 0xb49a76;
const TURRET_COLOR = 0x4a4652;
const ORB_COLOR = 0xff7a2a;
const UP = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
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
  private readonly orbs: THREE.Mesh[] = [];
  private readonly shafts: THREE.Mesh[] = [];
  private readonly orbMat = new THREE.MeshBasicMaterial({ color: ORB_COLOR });
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

    const orbGeo = this.geo(new THREE.SphereGeometry(1, 16, 12));
    // A shaft 1 m long along +y, pointed at its top.
    const shaftGeo = this.geo(new THREE.CylinderGeometry(0, 1, 1, 6).translate(0, 0.5, 0));
    const spearMat = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.8 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0xf0a040, roughness: 0.6 });
    const carrotMat = new THREE.MeshStandardMaterial({ color: 0xff7418, roughness: 0.7 });
    for (let i = 0; i < state.orbs.length; i++) {
      const o = new THREE.Mesh(orbGeo, this.orbMat);
      o.visible = false;
      this.orbs.push(o);
      this.group.add(o);
      const s = new THREE.Mesh(shaftGeo, spearMat);
      s.visible = false;
      s.castShadow = true;
      s.userData.spine = spineMat;
      s.userData.spear = spearMat;
      s.userData.carrot = carrotMat;
      this.shafts.push(s);
      this.group.add(s);
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
    const r = TARGETS.v.orbRadius;
    for (let i = 0; i < state.orbs.length; i++) {
      const o = state.orbs[i];
      const m = this.orbs[i];
      const s = this.shafts[i];
      m.visible = o.alive && o.look === 'fire';
      s.visible = o.alive && o.look !== 'fire';
      if (!o.alive) continue;
      if (s.visible) {
        // Its point first, the way it flies.
        const spear = o.look === 'spear';
        s.material = s.userData[o.look] as THREE.Material;
        s.quaternion.setFromUnitVectors(UP, dir.copy(o.vel).normalize());
        const carrot = o.look === 'carrot';
        s.scale.set(spear ? 0.06 : carrot ? 0.07 : 0.04, spear ? 1.7 : carrot ? 0.4 : 0.6, spear ? 0.06 : carrot ? 0.07 : 0.04);
        s.position.copy(o.pos).addScaledVector(dir, -s.scale.y * 0.5);
        continue;
      }
      m.position.copy(o.pos);
      m.scale.setScalar(r * (1 + 0.12 * Math.sin(o.life * 30)));
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
