// Update 0.5.4 — what floor 10's own fighters show besides their bodies (sim/enemies/boneAxeman.ts, combat/hellfire.ts): the Bone Axeman's floor
// split shown on the floor through its leap (a glowing strip out in front of it, as far as it'll run, brighter and pulsing faster as it comes),
// and its lines of fire once split, flames along them, dying down at their end. Drawn from the fight's state each frame. Made in code.
// Update 0.5.5 — the second batch's: each Cinder Chicken's comb burning (higher as its fuse burns or once a blow has lit it), and the ring on
// the floor its burst will reach; the Spore Lord's clouds (soft billows of ashen orange, swirling slowly, thickening as they come and thinning
// at their end).
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { SPORE_POOL } from '../../sim/combat/spores';
import { lit } from '../../sim/enemies/cinderChicken';
import { isLive } from '../../sim/enemies/enemy';
import { FUSE, HELL_CLIPS, SPLIT_FLOOR } from '../../sim/enemies/hellShared';
import { strikeTime } from '../../sim/enemies/martial';
import { BONE_AXEMAN } from '../../sim/enemies/boneAxeman';
import { FOES_HELL } from '../../tuning/foesHell';
import { FOES_HELL_B } from '../../tuning/foesHellB';
import { auraTexture } from '../keyLooks';

/** Strips at once; flames in all; a flame each this far along a line (m), this tall at most (m). A strip starts this far in front (its axe). */
const STRIPS = 6;
const FLAMES = 120;
const GAP = 0.55;
const TALL = 1.6;
const AXE_OUT = 0.7;
/** A line's flames burst up over this long (s) and die down over this long at its end. */
const BURST = 0.18;
const DIE = 0.5;
/** Chickens' rings at once; a cloud's billows, how big (m), how high they go (m); it thickens over this long and thins over this (s). */
const RINGS = 8;
const BILLOWS = 8;
const BILLOW: readonly [number, number] = [1.6, 2.8];
const HIGH = 2.2;
const THICKEN = 0.4;
const THIN = 1.5;
const SPORE = 0x9a5a34;

/** The same scatter for a cloud's slot every time. */
function seeded(seed: number) {
  let s = seed * 7919 + 17;
  return () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

export class HellFoesFx {
  readonly group = new THREE.Group();
  private readonly flatGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
  private readonly stripMat = new THREE.MeshBasicMaterial({ color: 0xff4a12, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 });
  private readonly strips = new THREE.InstancedMesh(this.flatGeo, this.stripMat, STRIPS);
  private readonly coneGeo = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0);
  private readonly flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flames = new THREE.InstancedMesh(this.coneGeo, this.flameMat, FLAMES);
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2);
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 });
  private readonly rings = new THREE.InstancedMesh(this.ringGeo, this.ringMat, RINGS);
  private readonly clouds: { sprites: THREE.Sprite[]; mat: THREE.SpriteMaterial; offs: THREE.Vector3[] }[] = [];
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.strips.frustumCulled = this.flames.frustumCulled = this.rings.frustumCulled = false;
    this.strips.count = this.flames.count = this.rings.count = 0;
    this.group.add(this.strips, this.flames, this.rings);
    for (let i = 0; i < SPORE_POOL; i++) {
      const r = seeded(i + 1);
      const mat = new THREE.SpriteMaterial({ map: auraTexture(), color: SPORE, transparent: true, opacity: 0, depthWrite: false });
      const sprites: THREE.Sprite[] = [];
      const offs: THREE.Vector3[] = [];
      for (let k = 0; k < BILLOWS; k++) {
        const s = new THREE.Sprite(mat);
        s.visible = false;
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 0.7;
        offs.push(new THREE.Vector3(Math.cos(a) * d, 0.3 + r() * HIGH, Math.sin(a) * d));
        s.userData.size = BILLOW[0] + (BILLOW[1] - BILLOW[0]) * r();
        sprites.push(s);
        this.group.add(s);
      }
      this.clouds.push({ sprites, mat, offs });
    }
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    // Its split shown, through its leap.
    let ns = 0;
    let glow = 0;
    const lands = HELL_CLIPS[SPLIT_FLOOR].lands[0] * strikeTime(SPLIT_FLOOR, BONE_AXEMAN.pace);
    for (const e of state.enemies) {
      if (ns >= STRIPS || !isLive(e) || e.kind !== 'boneAxeman' || e.phase !== 'windup' || e.move !== SPLIT_FLOOR || e.shots > 0) continue;
      const k = Math.min(1, e.t / Math.max(0.05, lands));
      const long = Math.max(0.3, e.aim.x);
      pos.set(e.pos.x - Math.sin(e.facing) * AXE_OUT, e.pos.y + 0.05, e.pos.z - Math.cos(e.facing) * AXE_OUT);
      this.strips.setMatrixAt(ns++, m.compose(pos, q.setFromAxisAngle(Y, e.facing), scl.set(FOES_HELL.v.splitWide * 2, 1, long)));
      glow = Math.max(glow, k);
    }
    this.strips.count = ns;
    if (ns > 0) this.strips.instanceMatrix.needsUpdate = true;
    this.stripMat.opacity = (0.25 + 0.55 * glow) * (0.75 + 0.25 * Math.sin(this.time * (14 + 26 * glow)));
    // Its lines of fire.
    let nf = 0;
    for (const l of state.ground.hellfire.lines) {
      if (!l.alive) continue;
      const long = Math.hypot(l.bx - l.ax, l.bz - l.az);
      const count = Math.max(1, Math.floor(long / GAP));
      const age = l.full - l.life;
      const up = Math.min(1, age / BURST) * Math.min(1, l.life / DIE);
      for (let k = 0; k <= count && nf < FLAMES; k++) {
        const u = k / count;
        pos.set(l.ax + (l.bx - l.ax) * u, l.y, l.az + (l.bz - l.az) * u);
        const h = TALL * up * (0.7 + 0.3 * Math.sin(this.time * 12 + k * 1.9));
        this.flames.setMatrixAt(nf++, m.compose(pos, q.setFromAxisAngle(Y, k * 0.7), scl.set(0.42, Math.max(0.01, h), 0.42)));
      }
    }
    // The Cinder Chickens' combs, and their bursts' rings.
    let nr = 0;
    for (const e of state.enemies) {
      if (!isLive(e) || e.kind !== 'cinderChicken') continue;
      const fusing = e.phase === 'windup' && e.move === FUSE;
      const hot = fusing || lit(e);
      if (nf < FLAMES) {
        pos.set(e.pos.x, e.pos.y + 0.82, e.pos.z);
        const h = (hot ? 0.75 : 0.4) * (0.75 + 0.25 * Math.sin(this.time * 18 + e.pos.x));
        this.flames.setMatrixAt(nf++, m.compose(pos, q.setFromAxisAngle(Y, this.time * 3), scl.set(hot ? 0.22 : 0.14, h, hot ? 0.22 : 0.14)));
      }
      if (hot && nr < RINGS) {
        const reach = FOES_HELL_B.v.chickenReach;
        pos.set(e.pos.x, (fusing ? e.pos.y : e.perch) + 0.05, e.pos.z);
        this.rings.setMatrixAt(nr++, m.compose(pos, q.identity(), scl.set(reach, 1, reach)));
      }
    }
    this.rings.count = nr;
    if (nr > 0) this.rings.instanceMatrix.needsUpdate = true;
    this.ringMat.opacity = 0.45 + 0.35 * Math.sin(this.time * 24);
    this.flames.count = nf;
    if (nf > 0) this.flames.instanceMatrix.needsUpdate = true;
    // The Spore Lord's clouds.
    state.ground.spores.clouds.forEach((c, i) => {
      const cl = this.clouds[i];
      const age = c.full - c.life;
      cl.mat.opacity = c.alive ? 0.7 * Math.min(1, age / THICKEN) * Math.min(1, c.life / THIN) : 0;
      cl.sprites.forEach((s, k) => {
        s.visible = c.alive;
        if (!c.alive) return;
        const o = cl.offs[k];
        const swirl = this.time * 0.3 + k;
        const grow = (0.75 + 0.25 * Math.min(1, age / THICKEN)) * c.r;
        s.position.set(c.x + (o.x * Math.cos(swirl * 0.4) - o.z * Math.sin(swirl * 0.4)) * grow, c.y + o.y, c.z + (o.x * Math.sin(swirl * 0.4) + o.z * Math.cos(swirl * 0.4)) * grow);
        s.scale.setScalar(s.userData.size * (0.8 + 0.2 * Math.min(1, age / THICKEN)));
      });
    });
  }

  dispose() {
    this.group.removeFromParent();
    this.strips.dispose();
    this.flames.dispose();
    this.flatGeo.dispose();
    this.coneGeo.dispose();
    this.stripMat.dispose();
    this.flameMat.dispose();
    this.rings.dispose();
    this.ringGeo.dispose();
    this.ringMat.dispose();
    for (const c of this.clouds) c.mat.dispose();
  }
}
