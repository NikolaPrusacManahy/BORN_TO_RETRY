// Update 0.3.33 — what floor 8's martial artists leave and show (MD/FLOOR8_SHRINE_PLAN.md): the Sand Ninjas' smoke bombs
// in their arc, their clouds (soft billows, swirling slowly, thick enough you can't see through, thinning out at their
// end) and their caltrops (little steel spikes strewn across the floor); the Shadow's long cut's line along the floor
// through you as he sets himself (pulsing as it comes); the Archer's glint as she draws (brighter as she looses). Drawn
// from the fight's state each frame. Made in code.
// Update 0.3.34 — and its boss, Yokai : Okami's fire, rope and shide (okamiFx.ts).
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { CUT_SET, AIM } from '../../sim/enemies/shrineShared';
import { FOES_SHRINE } from '../../tuning/foesShrine';
import { FOES_SHRINE_B } from '../../tuning/foesShrineB';
import { auraTexture } from '../keyLooks';
import { OkamiFx } from './okamiFx';

/** A cloud's billows, how big (m) and how high they go (m); it thickens over this long and thins over this (s). Each
 *  scatter's spikes. A cut's line this long (m) and wide. */
const BILLOWS = 16;
const BILLOW: readonly [number, number] = [2.2, 3.8];
const HIGH = 2.8;
const THICKEN = 0.35;
const THIN = 1.2;
const SPIKES = 28;
const CUT_LONG = 14;
const CUT_WIDE = 1.3;
const SMOKE = 0xd2c9bb;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);

/** The same scatter for a slot every time (its spikes, its billows). */
function seeded(seed: number) {
  let s = seed * 7919 + 13;
  return () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff;
}

export class ShrineFx {
  readonly group = new THREE.Group();
  private readonly stuff: { dispose(): void }[] = [];
  private readonly bombs: THREE.Mesh[] = [];
  private readonly clouds: { sprites: THREE.Sprite[]; mat: THREE.SpriteMaterial; offs: THREE.Vector3[] }[] = [];
  private readonly spikes: { mesh: THREE.InstancedMesh; offs: THREE.Vector3[] }[] = [];
  private readonly cuts: THREE.Mesh[] = [];
  private readonly glints: THREE.Sprite[] = [];
  private time = 0;
  private readonly okami = new OkamiFx();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    const ball = new THREE.SphereGeometry(0.16, 10, 8);
    const bombMat = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.8 });
    const spike = new THREE.TetrahedronGeometry(0.08, 0);
    const steel = new THREE.MeshStandardMaterial({ color: 0x55595f, roughness: 0.4, metalness: 0.6 });
    const strip = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
    const glintMat = new THREE.SpriteMaterial({ map: auraTexture(), color: 0xfff4d0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.stuff.push(ball, bombMat, spike, steel, strip, glintMat);
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(ball, bombMat);
      b.visible = false;
      this.bombs.push(b);
      const r = seeded(i + 1);
      const mat = new THREE.SpriteMaterial({ map: auraTexture(), color: SMOKE, transparent: true, opacity: 0, depthWrite: false });
      const sprites: THREE.Sprite[] = [];
      const offs: THREE.Vector3[] = [];
      for (let k = 0; k < BILLOWS; k++) {
        const s = new THREE.Sprite(mat);
        s.visible = false;
        sprites.push(s);
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 0.75;
        offs.push(new THREE.Vector3(Math.cos(a) * d, 0.2 + r() * HIGH, Math.sin(a) * d));
        s.userData.size = BILLOW[0] + (BILLOW[1] - BILLOW[0]) * r();
        this.group.add(s);
      }
      this.clouds.push({ sprites, mat, offs });
      this.stuff.push(mat);
      const mesh = new THREE.InstancedMesh(spike, steel, SPIKES);
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      const spots: THREE.Vector3[] = [];
      for (let k = 0; k < SPIKES; k++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r());
        spots.push(new THREE.Vector3(Math.cos(a) * d, r() * Math.PI * 2, Math.sin(a) * d));
      }
      this.spikes.push({ mesh, offs: spots });
      this.group.add(b, mesh);
    }
    for (let i = 0; i < 4; i++) {
      const cut = new THREE.Mesh(strip, new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3 }));
      cut.visible = false;
      this.stuff.push(cut.material as THREE.Material);
      this.cuts.push(cut);
      const g = new THREE.Sprite(glintMat);
      g.visible = false;
      this.glints.push(g);
      this.group.add(cut, g);
    }
  }

  /** `rootOf`: each enemy's body (Okami's fire rides its bones). */
  update(state: CombatState, dt: number, rootOf?: (i: number) => THREE.Object3D | null) {
    this.time += dt;
    if (rootOf) this.okami.update(state, rootOf, dt);
    const smoke = state.ground.smoke;
    smoke.bombs.forEach((b, i) => {
      this.bombs[i].visible = b.alive;
      if (b.alive) this.bombs[i].position.copy(b.pos);
    });
    smoke.clouds.forEach((c, i) => {
      const cl = this.clouds[i];
      const age = c.full - c.life;
      cl.mat.opacity = c.alive ? 0.9 * Math.min(1, age / THICKEN) * Math.min(1, c.life / THIN) : 0;
      cl.sprites.forEach((s, k) => {
        s.visible = c.alive;
        if (!c.alive) return;
        const o = cl.offs[k];
        const swirl = this.time * 0.25 + k;
        const grow = 0.7 + 0.3 * Math.min(1, age / THICKEN);
        s.position.set(c.x + (o.x * Math.cos(swirl * 0.3) - o.z * Math.sin(swirl * 0.3)) * c.r * grow, o.y, c.z + (o.x * Math.sin(swirl * 0.3) + o.z * Math.cos(swirl * 0.3)) * c.r * grow);
        s.scale.setScalar(s.userData.size * grow);
      });
    });
    smoke.caltrops.forEach((c, i) => {
      const sp = this.spikes[i];
      const shrink = c.alive ? Math.min(1, c.life / THIN) : 0;
      sp.offs.forEach((o, k) => {
        if (!c.alive) return sp.mesh.setMatrixAt(k, HIDDEN);
        q.setFromAxisAngle(UP, o.y);
        sp.mesh.setMatrixAt(k, m.compose(pos.set(c.x + o.x * c.r, 0.05, c.z + o.z * c.r), q, scale.setScalar(shrink)));
      });
      sp.mesh.instanceMatrix.needsUpdate = true;
    });
    // The Shadow's cut lines, the Archers' glints.
    let cut = 0;
    let glint = 0;
    for (const e of state.enemies) {
      if (!e.alive || e.phase !== 'windup') continue;
      if (e.kind === 'shadow' && e.move === CUT_SET && cut < this.cuts.length) {
        const c = this.cuts[cut++];
        const k = Math.min(1, e.t / Math.max(0.1, FOES_SHRINE_B.v.cutWarn));
        c.visible = true;
        c.position.set(e.pos.x, 0.06, e.pos.z);
        c.rotation.set(0, e.facing, 0);
        c.scale.set(CUT_WIDE, 1, CUT_LONG);
        (c.material as THREE.MeshBasicMaterial).opacity = (0.25 + 0.5 * k) * (0.8 + 0.2 * Math.sin(this.time * 30));
      }
      if (e.kind === 'archer' && e.move === AIM && glint < this.glints.length) {
        const g = this.glints[glint++];
        const k = Math.min(1, e.t / Math.max(0.1, FOES_SHRINE.v.aimTime));
        g.visible = true;
        g.position.set(e.pos.x - Math.sin(e.facing) * 0.55, e.pos.y + 1.5, e.pos.z - Math.cos(e.facing) * 0.55);
        g.scale.setScalar(0.3 + 0.9 * k * k);
      }
    }
    for (let i = cut; i < this.cuts.length; i++) this.cuts[i].visible = false;
    for (let i = glint; i < this.glints.length; i++) this.glints[i].visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
    this.okami.dispose();
  }
}
