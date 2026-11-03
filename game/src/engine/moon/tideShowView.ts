// Update 0.3.31 — Tidebreaker's show drawn on the floor (sim/dungeon/tideShow.ts; the designer: "All previous rooms
// explode … A meteor is coming from the earth exploding … lands on the arena with a massive explosion"): the floor's
// other rooms blowing up (a fireball swelling out of each, a shock running along its floor, fire rising: roomFires.ts;
// its pieces flung away: floorBlast.ts); the meteor out of the bursting Earth, burning, its trail behind it, down onto the
// arena's middle; and its landing: a white flash, a fireball, a shock ring racing out over the arena (its crater, dust
// and rock: tideImpact.ts). Made in code; drawn from the show's time.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { blastOrder, tideBeats } from '../../sim/dungeon/tideShow';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { auraTexture } from '../keyLooks';
import { FloorBlast, showTime } from './floorBlast';
import { additive, RoomFires } from './roomFires';
import { EARTH_DIR } from './spaceSky';

/** The meteor leaves the Earth this long after it bursts (s), this far out along the way to it (m), and comes down
 *  faster and faster (its flight's share gone as this power of its time's); its rock's size, its trail's length (m). */
const LAUNCH = 0.35;
const FROM = 320;
const FASTER = 1.7;
const ROCK = 5;
const TRAIL = 46;
/** Its landing's flash and fireball (s; m across at their widest), its shock ring's reach (m). */
const FLASH = 1;
const FLASH_SIZE = 38;
const BALL = 1.6;
const BALL_SIZE = 30;
const SHOCK = 70;

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** The meteor `t` s into the show, into `out`; returns how far through its flight (0..1; below 0: not yet out). */
export function meteorAt(t: number, mid: { x: number; z: number }, out: THREE.Vector3): number {
  const s = tideBeats();
  const from = s.earthBurst + LAUNCH;
  const k = (t - from) / Math.max(0.1, s.impact - from);
  const u = Math.max(0, Math.min(1, k)) ** FASTER;
  out.set(mid.x, 0, mid.z).addScaledVector(EARTH_DIR, FROM * (1 - u));
  return k;
}

const at = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class TideShowView {
  readonly group = new THREE.Group();
  private readonly blast: FloorBlast;
  private readonly stuff: { dispose(): void }[] = [];
  private readonly fires: RoomFires;
  private readonly ballGeo = new THREE.IcosahedronGeometry(1, 2);
  private readonly ringGeo = new THREE.RingGeometry(0.85, 1, 64).rotateX(-Math.PI / 2);
  private readonly rock: THREE.Mesh;
  private readonly glow: THREE.Sprite;
  private readonly trail: THREE.Mesh;
  private readonly core: THREE.Mesh;
  private readonly flash: THREE.Mesh;
  private readonly ball: THREE.Mesh;
  private readonly shock: THREE.Mesh;

  constructor(private readonly level: DungeonLevel) {
    this.blast = new FloorBlast(level);
    this.stuff.push(this.ballGeo, this.ringGeo);
    this.fires = new RoomFires(blastOrder(level), level, this.group);
    this.stuff.push(this.fires);
    // The meteor: a burning rock, its glow, its trail (pointing back up its way), the white heat inside the trail.
    const rockGeo = new THREE.IcosahedronGeometry(ROCK, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1e, roughness: 1, flatShading: true, emissive: 0xff6a20, emissiveIntensity: 1.8, fog: false });
    const glowMat = new THREE.SpriteMaterial({ map: auraTexture(), color: 0xffa050, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const trailGeo = new THREE.ConeGeometry(ROCK * 0.95, 1, 16, 1, true).translate(0, 0.5, 0);
    this.stuff.push(rockGeo, rockMat, glowMat, trailGeo);
    this.rock = new THREE.Mesh(rockGeo, rockMat);
    this.glow = new THREE.Sprite(glowMat);
    this.glow.scale.setScalar(ROCK * 6);
    this.trail = this.mesh(trailGeo, additive(0xff8a3a));
    this.core = this.mesh(trailGeo, additive(0xfff0c0));
    this.rock.visible = this.glow.visible = false;
    this.group.add(this.rock, this.glow);
    // Its landing.
    this.flash = this.mesh(this.ballGeo, additive(0xfff6e8));
    this.ball = this.mesh(this.ballGeo, additive(0xff9a40));
    this.shock = this.mesh(this.ringGeo, additive(0xffe8c8));
    const p = level.boss.portal;
    this.flash.position.set(p.x, 1, p.z);
    this.ball.position.set(p.x, 0, p.z);
    this.shock.position.set(p.x, 0.25, p.z);
    for (const o of [this.rock, this.glow, this.trail, this.core]) o.frustumCulled = false;
  }

  private mesh(geo: THREE.BufferGeometry, mat: THREE.MeshBasicMaterial): THREE.Mesh {
    const o = new THREE.Mesh(geo, mat);
    o.visible = false;
    o.renderOrder = 2;
    this.stuff.push(mat);
    this.group.add(o);
    return o;
  }

  /** Everything the floor's view draws that a room's blast takes (floorBlast.ts). */
  take(roots: readonly THREE.Object3D[]) {
    this.blast.take(roots);
  }

  /** Has the spot's room blown? */
  gone(x: number, z: number): boolean {
    return this.blast.gone(x, z);
  }

  update(b: BossRun) {
    const t = showTime(b);
    this.blast.update(t);
    this.fires.update(t);
    this.meteor(t);
    this.landing(t - tideBeats().impact);
  }

  /** The meteor, out of the Earth and down onto the arena. */
  private meteor(t: number) {
    const k = meteorAt(t, this.level.boss.portal, at);
    const on = k >= 0 && k < 1;
    this.rock.visible = this.glow.visible = this.trail.visible = this.core.visible = on;
    if (!on) return;
    this.rock.position.copy(at);
    this.rock.rotation.set(t * 1.3, t * 0.9, 0);
    this.glow.position.copy(at);
    // (Its trail behind it, back up its way: longer as it comes faster.)
    const len = TRAIL * (0.5 + k);
    for (const [o, wide, glow] of [[this.trail, 1, 0.75], [this.core, 0.45, 0.9]] as const) {
      o.position.copy(at);
      o.quaternion.setFromUnitVectors(UP, EARTH_DIR);
      o.scale.set(wide, len, wide);
      (o.material as THREE.MeshBasicMaterial).opacity = glow;
    }
  }

  /** Its landing `age` s after it struck. */
  private landing(age: number) {
    const on = age >= 0 && age < BALL;
    this.flash.visible = on && age < FLASH;
    this.ball.visible = this.shock.visible = on;
    if (!on) return;
    this.flash.scale.setScalar(FLASH_SIZE * (0.2 + 0.8 * smooth(age / 0.35)));
    (this.flash.material as THREE.MeshBasicMaterial).opacity = 1 - smooth(age / FLASH);
    this.ball.scale.setScalar(BALL_SIZE * (0.3 + 0.7 * smooth(age / 0.8)));
    (this.ball.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - smooth(age / BALL));
    this.shock.scale.setScalar(SHOCK * Math.min(1, age / 1.2) ** 0.55);
    (this.shock.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age / 1.2);
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}

