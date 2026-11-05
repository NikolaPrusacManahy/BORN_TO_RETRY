// Update 0.3.50 — the Dragon's show drawn on its floor (sim/dungeon/dragonShow.ts): a ring of flame racing round the walls
// behind it as they're driven back; a crown on each corner tower (the top of it, with its battlements), knocked off and
// falling outward as it passes; its landing's white flash, fireball, wall of shock, dust and rock; the crater it leaves for
// good. Drawn from the show's time, so a skipped show ends the same. The show done, what it took stays gone.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { cornerAt, dragonBeats, dragonWalls, lapAngle, lapShare, rectReach, showAxes, towerTimes, wallsAt } from '../../sim/dungeon/dragonShow';
import type { DungeonLevel, Rect } from '../../world/dungeon/assemble';
import { styleOf } from '../../world/dungeon/styles';
import { additive } from '../moon/roomFires';
import type { KitMaterial } from '../shrine/isleMesh';
import { ShowDust, type Strike } from '../shrine/showDust';

/** Tongues of fire in its ring; how tall (m), how wide at the foot; they last this long after it's passed (s). */
const TONGUES = 110;
const TALL = 7;
const FOOT = 3.2;
const BURN = 1.5;
/** A crown: this many rows of wall over the tower's top, its side (m), and how it falls (m/s², rad, s). */
const CROWN_ROWS = 2;
const TOWER = 8;
const PIECE = 2;
const GRAVITY = 26;
const TIP = 1.4;
const FALLS = 1.5;
/** Its landing: its flash and fireball (m across at their widest; s), its wall of shock (m; s), its crater (m across). */
const FLASH = 0.8;
const FLASH_SIZE = 30;
const BALL = 1.4;
const BALL_SIZE = 22;
const WAVE = 1.4;
const WAVE_REACH = 60;
const WAVE_HIGH = 8;
const CRATER = 15;

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

const m = new THREE.Matrix4();
const lift = new THREE.Matrix4();
const place = new THREE.Vector3();
const size = new THREE.Vector3();
const turn = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const fwd = { x: 0, z: 0 };
const right = { x: 0, z: 0 };
const walls: Rect = { min: { x: 0, z: 0 }, max: { x: 0, z: 0 } };
const corner = { x: 0, z: 0 };

/** The show's time (−1: not begun; past its end, once it's over). */
const showTime = (b: BossRun) => (b.kind !== 'dragon' || b.beat === 'waiting' ? -1 : b.beat === 'intro' ? b.t : Infinity);

interface Crown {
  group: THREE.Group;
  at: number;
  /** Where it stands; the way it falls: out from the room's middle. */
  x: number;
  y: number;
  z: number;
  ox: number;
  oz: number;
}

export class DragonShowView {
  readonly group = new THREE.Group();
  private readonly flames = new THREE.Group();
  private readonly coneGeo = new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0);
  private readonly outerMat = additive(0xff5410);
  private readonly innerMat = additive(0xffd27a);
  private readonly outer = new THREE.InstancedMesh(this.coneGeo, this.outerMat, TONGUES);
  private readonly inner = new THREE.InstancedMesh(this.coneGeo, this.innerMat, TONGUES);
  private readonly crowns: Crown[] = [];
  private readonly dust: ShowDust;
  private readonly flash: THREE.Mesh;
  private readonly ball: THREE.Mesh;
  private readonly wave: THREE.Mesh;
  private readonly crater: THREE.Mesh;
  private readonly stuff: { dispose(): void }[] = [];

  constructor(private readonly level: DungeonLevel) {
    const s = dragonBeats();
    const p = level.boss.portal;
    this.outerMat.opacity = 0.6;
    this.innerMat.opacity = 0.85;
    this.outer.frustumCulled = this.inner.frustumCulled = false;
    this.flames.add(this.outer, this.inner);
    this.flames.visible = false;
    const strikes: Strike[] = [{ at: s.impact, x: p.x, y: 0, z: p.z, size: 14 }];
    towerTimes().forEach((at, k) => {
      cornerAt(level, k, corner);
      strikes.push({ at, x: corner.x, y: this.towerTop(), z: corner.z, size: 5 });
    });
    this.dust = new ShowDust(strikes);
    const ball = new THREE.IcosahedronGeometry(1, 2);
    const band = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true).translate(0, 0.5, 0);
    const pit = new THREE.CircleGeometry(CRATER / 2, 40).rotateX(-Math.PI / 2);
    const pitMat = new THREE.MeshBasicMaterial({ color: 0x17120f, transparent: true, opacity: 0.72, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.flash = new THREE.Mesh(ball, additive(0xfff6e8));
    this.ball = new THREE.Mesh(ball, additive(0xff8a3a));
    this.wave = new THREE.Mesh(band, additive(0xfff2dc));
    this.crater = new THREE.Mesh(pit, pitMat);
    this.flash.position.set(p.x, 1, p.z);
    this.ball.position.set(p.x, 0, p.z);
    this.wave.position.set(p.x, 0, p.z);
    this.crater.position.set(p.x, 0.045, p.z);
    for (const o of [this.flash, this.ball, this.wave, this.crater]) {
      o.visible = false;
      o.frustumCulled = false;
    }
    this.group.add(this.flames, this.dust.group, this.flash, this.ball, this.wave, this.crater);
    this.stuff.push(this.coneGeo, this.outerMat, this.innerMat, this.dust, ball, band, pit, pitMat, this.flash.material as THREE.Material, this.ball.material as THREE.Material, this.wave.material as THREE.Material);
    this.stuff.push(this.outer, this.inner);
  }

  /** Where a tower's own stone stops (m). */
  private towerTop(): number {
    return (styleOf(this.level.plan.level).bossTowers ?? 6) * PIECE;
  }

  /** Nothing of the floor's is blown away; the kit: the towers' crowns. */
  take(_roots: readonly THREE.Object3D[], kit?: THREE.Object3D, material?: KitMaterial) {
    if (!kit || !material || this.crowns.length > 0) return;
    const K = styleOf(this.level.plan.level);
    const wall = kit.getObjectByName(K.wall);
    const cap = kit.getObjectByName(K.cap);
    if (!wall || !cap) return;
    const y = this.towerTop();
    const p = this.level.boss.portal;
    const times = towerTimes();
    times.forEach((at, k) => {
      cornerAt(this.level, k, corner);
      const crown = new THREE.Group();
      crown.position.set(corner.x, y, corner.z);
      const add = (src: THREE.Object3D, name: string, count: number, each: (i: number) => void) => {
        src.updateMatrixWorld(true);
        const inv = src.matrixWorld.clone().invert();
        src.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const mat = material(o.material as THREE.MeshStandardMaterial, name);
          const inst = new THREE.InstancedMesh(o.geometry, mat, count);
          inst.castShadow = inst.receiveShadow = true;
          inst.frustumCulled = false;
          lift.copy(inv).multiply(o.matrixWorld);
          for (let i = 0; i < count; i++) {
            each(i);
            inst.setMatrixAt(i, m.clone().multiply(lift));
          }
          inst.instanceMatrix.needsUpdate = true;
          crown.add(inst);
          this.stuff.push({ dispose: () => inst.dispose() });
        });
      };
      // Round its four sides: rows of wall, a course of caps, then merlons every other piece.
      const n = TOWER / PIECE;
      const out = TOWER / 2 - K.wallDepth / 2;
      const side = (i: number) => {
        const face = Math.floor(i / n);
        const along = -TOWER / 2 + PIECE / 2 + (i % n) * PIECE;
        return { x: face === 0 ? along : face === 1 ? out : face === 2 ? -along : -out, z: face === 0 ? out : face === 1 ? -along : face === 2 ? -out : along, rot: (face * Math.PI) / 2 };
      };
      const count = 4 * n;
      add(wall, K.wall, count * CROWN_ROWS + count / 2, (i) => {
        if (i < count * CROWN_ROWS) {
          const q = side(i % count);
          m.compose(place.set(q.x, Math.floor(i / count) * PIECE, q.z), turn.setFromAxisAngle(UP, q.rot), size.set(1, 1, 1));
          return;
        }
        const q = side(((i - count * CROWN_ROWS) * 2) % count);
        m.compose(place.set(q.x, CROWN_ROWS * PIECE + 0.1, q.z), turn.setFromAxisAngle(UP, q.rot), size.set(1, 0.55, 1));
      });
      add(cap, K.cap, count, (i) => {
        const q = side(i);
        m.compose(place.set(q.x, CROWN_ROWS * PIECE, q.z), turn.setFromAxisAngle(UP, q.rot), size.set(1, 1, 1));
      });
      const ox = corner.x - p.x;
      const oz = corner.z - p.z;
      const len = Math.hypot(ox, oz) || 1;
      this.crowns.push({ group: crown, at, x: corner.x, y, z: corner.z, ox: ox / len, oz: oz / len });
      this.group.add(crown);
    });
  }

  gone(): boolean {
    return false;
  }

  update(b: BossRun) {
    const t = showTime(b);
    this.dust.update(t);
    this.fire(t);
    for (const c of this.crowns) {
      const age = t - c.at;
      c.group.visible = age < FALLS;
      if (age <= 0 || !c.group.visible) continue;
      // Over and out, off the tower.
      c.group.position.y = c.y + 3 * age - 0.5 * GRAVITY * age * age;
      c.group.position.x = c.x + c.ox * 9 * age;
      c.group.position.z = c.z + c.oz * 9 * age;
      c.group.rotation.set(c.oz * TIP * smooth(age / FALLS), 0, -c.ox * TIP * smooth(age / FALLS));
    }
    this.landing(t);
  }

  /** Its ring of flame on the walls, as far round as it's come. */
  private fire(t: number) {
    const s = dragonBeats();
    const on = t >= s.lapFrom && t < s.lapTo + BURN;
    this.flames.visible = on;
    if (!on) return;
    const b = this.level.boss;
    showAxes(b.entrance, fwd, right);
    const u = lapShare(t);
    const span = s.lapTo - s.lapFrom;
    wallsAt(b.start, b.end, dragonWalls(t), walls);
    for (let i = 0; i < TONGUES; i++) {
      const at = (i + 0.5) / TONGUES;
      const age = (u - at) * span + (t > s.lapTo ? t - s.lapTo : 0);
      const a = lapAngle(at);
      const dx = fwd.x * Math.cos(a) + right.x * Math.sin(a);
      const dz = fwd.z * Math.cos(a) + right.z * Math.sin(a);
      const far = rectReach(walls, b.portal.x, b.portal.z, dx, dz) - 0.8;
      const k = age <= 0 ? 0 : Math.min(smooth(age / 0.18), 1 - smooth((age - span * 0.55) / BURN));
      const flick = 0.72 + 0.28 * Math.sin(t * (15 + (i % 7) * 4) + i * 1.9);
      const tall = Math.max(0.001, TALL * k * flick);
      const wide = Math.max(0.001, FOOT * k);
      place.set(b.portal.x + dx * far, 0.02, b.portal.z + dz * far);
      turn.identity();
      this.outer.setMatrixAt(i, m.compose(place, turn, size.set(wide, tall, wide)));
      this.inner.setMatrixAt(i, m.compose(place, turn, size.set(wide * 0.55, tall * 0.7, wide * 0.55)));
    }
    this.outer.instanceMatrix.needsUpdate = this.inner.instanceMatrix.needsUpdate = true;
  }

  /** Its landing's flash, fireball and wall of shock; its crater, left for good. */
  private landing(t: number) {
    const age = t - dragonBeats().impact;
    this.flash.visible = age >= 0 && age < FLASH;
    this.ball.visible = age >= 0 && age < BALL;
    this.wave.visible = age >= 0 && age < WAVE;
    this.crater.visible = age >= 0;
    if (this.flash.visible) {
      this.flash.scale.setScalar(FLASH_SIZE * (0.2 + 0.8 * smooth(age / 0.25)));
      (this.flash.material as THREE.MeshBasicMaterial).opacity = 1 - smooth(age / FLASH);
    }
    if (this.ball.visible) {
      this.ball.scale.setScalar(BALL_SIZE * (0.3 + 0.7 * smooth(age / 0.6)));
      (this.ball.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - smooth(age / BALL));
    }
    if (this.wave.visible) {
      const k = age / WAVE;
      const r = WAVE_REACH * k ** 0.55 + 2;
      this.wave.scale.set(r, WAVE_HIGH * (1 - k * 0.6), r);
      (this.wave.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k);
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
