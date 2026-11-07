// Update 0.5.4 — what floor 10's own fighters show besides their bodies (sim/enemies/boneAxeman.ts, combat/hellfire.ts): the Bone Axeman's floor
// split shown on the floor through its leap (a glowing strip out in front of it, as far as it'll run, brighter and pulsing faster as it comes),
// and its lines of fire once split, flames along them, dying down at their end. Drawn from the fight's state each frame. Made in code.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { isLive } from '../../sim/enemies/enemy';
import { HELL_CLIPS, SPLIT_FLOOR } from '../../sim/enemies/hellShared';
import { strikeTime } from '../../sim/enemies/martial';
import { BONE_AXEMAN } from '../../sim/enemies/boneAxeman';
import { FOES_HELL } from '../../tuning/foesHell';

/** Strips at once; flames in all; a flame each this far along a line (m), this tall at most (m). A strip starts this far in front (its axe). */
const STRIPS = 6;
const FLAMES = 120;
const GAP = 0.55;
const TALL = 1.6;
const AXE_OUT = 0.7;
/** A line's flames burst up over this long (s) and die down over this long at its end. */
const BURST = 0.18;
const DIE = 0.5;

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
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.strips.frustumCulled = this.flames.frustumCulled = false;
    this.strips.count = this.flames.count = 0;
    this.group.add(this.strips, this.flames);
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
    this.flames.count = nf;
    if (nf > 0) this.flames.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.strips.dispose();
    this.flames.dispose();
    this.flatGeo.dispose();
    this.coneGeo.dispose();
    this.stripMat.dispose();
    this.flameMat.dispose();
  }
}
