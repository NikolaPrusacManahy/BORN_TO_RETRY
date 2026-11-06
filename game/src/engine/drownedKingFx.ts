// Update 0.2.10 — the Drowned King's water that its model can't show (drownedFx.ts holds it; its fin and rings are drownedFx.ts's).
// Update 0.3.58 — by the Boss Design Bible: its Riptide, the water rushing in towards it as it leans back, then a low wave with a white
// crest rolling across the whole room; its claws' reach, a fan on the water, red, its third whiter; its Maw's pull, rings racing in.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { CLAW_ARC } from '../sim/enemies/drownedJaws';
import { drownedWindup } from '../sim/enemies/drownedKing';
import { FRENZY, MAW, RIPTIDE } from '../sim/enemies/drownedKingMoves';
import { MAW_TELL } from '../sim/enemies/drownedMaw';
import { ripFront, ripTop } from '../sim/enemies/drownedRisen';
import { isLive } from '../sim/enemies/enemy';
import { RADIUS } from '../sim/enemies/kinds';
import { DROWNED } from '../tuning/drowned';

/** Its wave's length (m: past the room's walls), and what its crest's foam is of its height. */
const LONG = 130;
const FOAM_DEEP = 0.9;
/** Rings racing in, and how far out they start (m). */
const RINGS = 3;
const IN_FROM = 26;

/** A breaking wave's side on: along +x (its way), up +y, 1 high; extruded along z, 1 long, centred. */
function waveGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-3.4, 0);
  s.quadraticCurveTo(-1.6, 0.1, -0.5, 0.75);
  s.quadraticCurveTo(0, 1.05, 0.45, 1);
  s.quadraticCurveTo(0.95, 0.92, 0.85, 0.62);
  s.quadraticCurveTo(0.55, 0.72, 0.5, 0.42);
  s.quadraticCurveTo(0.48, 0.15, 0.85, 0);
  s.lineTo(-3.4, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -0.5);
  return g;
}

export class DrownedKingFx {
  private readonly waveGeo = waveGeometry();
  private readonly foamGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly waveMat = new THREE.MeshStandardMaterial({ color: 0x3aa8bc, transparent: true, opacity: 0.72, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
  private readonly foamMat = new THREE.MeshBasicMaterial({ color: 0xf2fbff, transparent: true, opacity: 0.9, depthWrite: false });
  private readonly wave = new THREE.Mesh(this.waveGeo, this.waveMat);
  private readonly foam = new THREE.Mesh(this.foamGeo, this.foamMat);
  private readonly fanGeo = new THREE.CircleGeometry(1, 28, Math.PI / 2 - CLAW_ARC, 2 * CLAW_ARC).rotateX(-Math.PI / 2);
  private readonly fanMat = new THREE.MeshBasicMaterial({ color: 0xff5a40, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly fan = new THREE.Mesh(this.fanGeo, this.fanMat);
  private readonly ringGeo = new THREE.RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2);
  private readonly ringMats: THREE.MeshBasicMaterial[] = [];
  private readonly rings: THREE.Mesh[] = [];
  private time = 0;

  constructor(parent: THREE.Group) {
    for (let i = 0; i < RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xd8fbff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
      const ring = new THREE.Mesh(this.ringGeo, mat);
      this.ringMats.push(mat);
      this.rings.push(ring);
      parent.add(ring);
    }
    parent.add(this.wave, this.foam, this.fan);
    this.clear();
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    this.clear();
    const k = state.enemies.find((e) => e.kind === 'drownedKing' && isLive(e));
    if (!k) return;
    const v = DROWNED.v;
    const water = Math.max(state.flood, 0);
    // Its wave, rolling.
    if (k.phase === 'blast' && k.move === RIPTIDE) {
      const high = ripTop(state);
      const yaw = Math.atan2(-k.aim.z, k.aim.x);
      const front = ripFront(k);
      const grow = Math.min(1, k.t / 0.35);
      this.wave.visible = this.foam.visible = true;
      this.wave.position.set(k.from.x + k.aim.x * front, 0, k.from.z + k.aim.z * front);
      this.wave.rotation.y = yaw;
      this.wave.scale.set(1, high * grow, LONG);
      this.foam.position.set(this.wave.position.x, high * grow + 0.04, this.wave.position.z);
      this.foam.rotation.y = yaw;
      this.foam.scale.set(FOAM_DEEP, 0.16 + 0.05 * Math.sin(this.time * 19), LONG);
    }
    // Its claws' reach on the water.
    const clawing = k.phase === 'dive' && k.move === FRENZY;
    if ((k.phase === 'windup' && k.move === FRENZY) || clawing) {
      const third = clawing && k.shots >= 2;
      this.fan.visible = true;
      this.fan.position.set(k.pos.x, water + 0.06, k.pos.z);
      this.fan.rotation.y = k.facing;
      this.fan.scale.setScalar(RADIUS.drownedKing + v.clawReach);
      this.fanMat.color.setHex(third ? 0xffe0c0 : 0xff5a40);
      const lit = k.phase === 'windup' ? Math.min(1, k.t / drownedWindup(FRENZY, k.stage)) : 1;
      this.fanMat.opacity = 0.08 + 0.2 * lit;
    }
    // The water rushing in towards it.
    const leaning = k.phase === 'windup' && k.move === RIPTIDE;
    const sucking = k.phase === 'blast' && k.move === MAW && k.shots !== MAW_TELL;
    if (!leaning && !sucking) return;
    const speed = leaning ? 1.3 : 1.9;
    this.rings.forEach((ring, i) => {
      const u = 1 - (((this.time * speed + i / RINGS) % 1) + 1) % 1;
      ring.visible = true;
      ring.position.set(k.pos.x, water + 0.05, k.pos.z);
      ring.scale.setScalar(RADIUS.drownedKing + (leaning ? IN_FROM * 0.55 : IN_FROM) * u);
      this.ringMats[i].opacity = (leaning ? 0.3 : 0.55) * Math.sin(u * Math.PI);
    });
  }

  clear() {
    this.wave.visible = this.foam.visible = this.fan.visible = false;
    for (const r of this.rings) r.visible = false;
  }

  dispose() {
    for (const g of [this.waveGeo, this.foamGeo, this.fanGeo, this.ringGeo]) g.dispose();
    for (const m of [this.waveMat, this.foamMat, this.fanMat, ...this.ringMats]) m.dispose();
  }
}
