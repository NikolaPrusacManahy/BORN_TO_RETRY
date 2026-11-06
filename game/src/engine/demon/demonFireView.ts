// Update 0.3.72 — what the Playable Demon's fire looks like (sim/combat/demonFire.ts): the overhead's wall burning on the floor; Ember Wave, a crescent
// of fire tearing along; Brand of Ruin's lines glowing and its pillars bursting out along them. As the boss's are (hell/wardenFx.ts): cones of
// additive fire, nothing to sort. Made in code. Only for the Demon: the scene makes one when you are.
// Update 0.3.73 — and its sword out of its hand, and Last Verdict (thrownBladeView.ts, verdictView.ts).
import * as THREE from 'three';
import { brandAt, eruptAt, PILLAR_FOR } from '../../sim/combat/demonFire';
import type { CombatState } from '../../sim/combat/state';
import { DEMON } from '../../tuning/demon';
import { HALOS } from '../halos';
import { ThrownBladeView } from './thrownBladeView';
import { VerdictView } from './verdictView';

const FLAMES = 360;
const LINES = 16;
const WAVES = 4;
/** A wall's flames this far apart (m), this high; how long it takes to die down. A pillar's height. */
const WALL_GAP = 0.8;
const WALL_HIGH = 2.2;
const WALL_DIE = 0.5;
const PILLAR_HIGH = 6;
/** A crescent's reach (m), how far round it goes either side (rad), how deep. It's slanted, as the swing that threw it. */
const WAVE_R = 3.2;
const WAVE_ROUND = 1.15;
const WAVE_DEEP = 0.9;
const WAVE_SLANT = -0.5;
const WAVE_FADE = 0.15;

const mat = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const q = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);
const look = new THREE.Vector3();
const spot = { x: 0, z: 0 };

/** The crescent: bowed forward along +z, its tips trailing, hot along its leading edge and gone at its ends and back. */
function crescentGeometry(): THREE.BufferGeometry {
  const across = 25;
  const rows = 4;
  const positions: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  const hot = new THREE.Color(1, 0.5, 0.12);
  const deep = new THREE.Color(1, 0.08, 0.005);
  const c = new THREE.Color();
  for (let i = 0; i < across; i++) {
    const u = (i / (across - 1)) * 2 - 1;
    const a = u * WAVE_ROUND;
    const ends = Math.max(0, 1 - u * u);
    for (let r = 0; r < rows; r++) {
      const v = r / (rows - 1);
      const back = v * WAVE_DEEP * (0.25 + 0.75 * ends);
      positions.push(Math.sin(a) * WAVE_R, 0, Math.cos(a) * WAVE_R - WAVE_R - back);
      c.copy(hot).lerp(deep, v);
      const light = ends * (r === 0 ? 0.55 : r === 1 ? 1 : r === 2 ? 0.5 : 0);
      colors.push(c.r * light, c.g * light, c.b * light);
    }
  }
  for (let i = 0; i < across - 1; i++) {
    for (let r = 0; r < rows - 1; r++) {
      const n = i * rows + r;
      index.push(n, n + rows, n + 1, n + 1, n + rows, n + rows + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

export class DemonFireView {
  readonly group = new THREE.Group();
  private readonly coneGeo = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0);
  private readonly flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  private readonly flames = new THREE.InstancedMesh(this.coneGeo, this.flameMat, FLAMES);
  private readonly flatGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
  private readonly lineMat = new THREE.MeshBasicMaterial({ color: 0xff5a18, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly lines = new THREE.InstancedMesh(this.flatGeo, this.lineMat, LINES);
  private readonly waveGeo = crescentGeometry();
  private readonly waveMats: THREE.MeshBasicMaterial[] = [];
  private readonly waves: THREE.Mesh[] = [];
  readonly thrown: ThrownBladeView;
  readonly verdict: VerdictView;
  private time = 0;

  /** `fetches`: fetch the thrown blade's model (tests give it). */
  constructor(scene: THREE.Scene, fetches = true) {
    scene.add(this.group);
    this.thrown = new ThrownBladeView(scene, fetches);
    this.verdict = new VerdictView(scene);
    this.flames.frustumCulled = this.lines.frustumCulled = false;
    this.flames.count = this.lines.count = 0;
    this.group.add(this.flames, this.lines);
    for (let i = 0; i < WAVES; i++) {
      const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
      const o = new THREE.Mesh(this.waveGeo, m);
      o.frustumCulled = false;
      o.visible = false;
      this.waveMats.push(m);
      this.waves.push(o);
      this.group.add(o);
    }
  }

  /** How many flames are burning (for the tests). */
  get burning() {
    return this.flames.count;
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    this.thrown.update(state, dt);
    this.verdict.update(state);
    const f = state.demonFire;
    let n = 0;
    let nl = 0;
    // The overhead's walls.
    for (const w of f.walls) {
      const long = Math.hypot(w.bx - w.ax, w.bz - w.az);
      const count = Math.floor(long / WALL_GAP);
      const fade = Math.min(1, w.left / WALL_DIE);
      for (let k = 0; k <= count && n < FLAMES; k++) {
        const u = k / Math.max(1, count);
        pos.set(w.ax + (w.bx - w.ax) * u, w.y, w.az + (w.bz - w.az) * u);
        const h = WALL_HIGH * fade * (0.8 + 0.25 * Math.sin(this.time * 11 + k * 1.7));
        this.flames.setMatrixAt(n++, mat.compose(pos, q.setFromAxisAngle(Y, k), scl.set(0.6, h, 0.6)));
      }
    }
    // Brand of Ruin: its lines glowing, its pillars bursting out along them.
    for (const b of f.brands) {
      const reach = 1.6 + b.steps * b.step;
      for (let s = 0; s < b.spokes && nl < LINES; s++) {
        const yaw = b.a + (s / b.spokes) * Math.PI * 2 + Math.PI;
        pos.set(b.x, b.y + 0.07, b.z);
        this.lines.setMatrixAt(nl++, mat.compose(pos, q.setFromAxisAngle(Y, yaw), scl.set(0.55, 1, reach)));
      }
      for (let s = 0; s < b.spokes; s++) {
        if (b.stopped[s]) continue;
        for (let k = 0; k < b.steps && n < FLAMES; k++) {
          const age = b.t - eruptAt(b, k);
          if (age < 0 || age > PILLAR_FOR) continue;
          brandAt(b, s, k, spot);
          pos.set(spot.x, b.y, spot.z);
          const r = DEMON.v.brandRadius * 0.8;
          this.flames.setMatrixAt(n++, mat.compose(pos, q.identity(), scl.set(r, PILLAR_HIGH * Math.sin((age / PILLAR_FOR) * Math.PI), r)));
        }
      }
    }
    this.flames.count = n;
    if (n > 0) this.flames.instanceMatrix.needsUpdate = true;
    this.lines.count = nl;
    if (nl > 0) this.lines.instanceMatrix.needsUpdate = true;
    // Ember Wave.
    for (let i = 0; i < WAVES; i++) {
      const o = this.waves[i];
      const w = f.waves[i];
      o.visible = !!w;
      if (!w) continue;
      o.position.copy(w.pos);
      o.lookAt(look.copy(w.pos).add(w.dir));
      o.rotateZ(WAVE_SLANT);
      this.waveMats[i].color.setScalar(Math.min(1, w.life / WAVE_FADE));
      HALOS.add(w.pos.x, w.pos.y, w.pos.z, 6, 0xff7a20, 0.7);
    }
  }

  dispose() {
    this.thrown.dispose();
    this.verdict.dispose();
    this.group.removeFromParent();
    this.flames.dispose();
    this.lines.dispose();
    for (const g of [this.coneGeo, this.flatGeo, this.waveGeo]) g.dispose();
    for (const m of [this.flameMat, this.lineMat, ...this.waveMats]) m.dispose();
  }
}
