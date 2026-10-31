// Update 0.2.10 — the Drowned King's water that its model can't show (drownedFx.ts holds it; its fin and rings are
// drownedFx.ts's): its jet, a bright beam of water from its mouth along the water's top, sweeping as the sim sweeps it
// (drownedKingMoves.ts `jetAngle`); its tidal wall, rising at it and rolling across the room in two halves either side
// of its gap (drownedRisen.ts), too high to jump.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { jetAngle, TIDE } from '../sim/enemies/drownedKingMoves';
import { TIDE_HIGH, tideFront } from '../sim/enemies/drownedRisen';
import { isLive } from '../sim/enemies/enemy';
import { RADIUS } from '../sim/enemies/kinds';
import { DROWNED } from '../tuning/drowned';

/** Its jet: how wide and how thick it's drawn (m), how far over the water. */
const JET_W = 1.1;
const JET_H = 0.7;
const JET_UP = 0.35;
/** Each half of its wall is this long (m: past the room's walls) and this thick. */
const HALF = 40;
const THICK = 0.8;

export class DrownedKingFx {
  private readonly box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  private readonly jetBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, -0.5);
  private readonly jetMat = new THREE.MeshBasicMaterial({ color: 0xbff6ff, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly wallMat = new THREE.MeshStandardMaterial({ color: 0x3a9fb0, transparent: true, opacity: 0.62, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
  private readonly jet: THREE.Mesh;
  private readonly halves: THREE.Mesh[];
  private time = 0;

  constructor(parent: THREE.Group) {
    this.jet = new THREE.Mesh(this.jetBox, this.jetMat);
    this.halves = [new THREE.Mesh(this.box, this.wallMat), new THREE.Mesh(this.box, this.wallMat)];
    for (const o of [this.jet, ...this.halves]) {
      o.visible = false;
      parent.add(o);
    }
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    this.clear();
    const k = state.enemies.find((e) => e.kind === 'drownedKing' && isLive(e));
    if (!k) return;
    const v = DROWNED.v;
    const water = Math.max(state.flood, 0);
    if (k.phase === 'breath') {
      // Its jet, from its mouth.
      const a = jetAngle(k);
      const r = RADIUS.drownedKing;
      this.jet.visible = true;
      this.jet.position.set(k.pos.x - Math.sin(a) * r, water + JET_UP, k.pos.z - Math.cos(a) * r);
      this.jet.rotation.y = a;
      const flicker = 0.9 + 0.1 * Math.sin(this.time * 40);
      this.jet.scale.set(JET_W * flicker, JET_H * flicker, v.spoutRange);
      return;
    }
    const rising = k.phase === 'windup' && k.move === TIDE;
    if (!rising && k.phase !== 'blast') return;
    // Its wall: rising at it, then rolling; its two halves either side of the gap.
    const front = rising ? RADIUS.drownedKing : tideFront(k);
    const high = rising ? TIDE_HIGH * Math.min(1, k.t / v.tideWindup) : TIDE_HIGH;
    const rx = -k.aim.z;
    const rz = k.aim.x;
    const cx = k.from.x + k.aim.x * front + rx * k.near;
    const cz = k.from.z + k.aim.z * front + rz * k.near;
    const yaw = Math.atan2(-k.aim.x, -k.aim.z);
    const off = v.tideGap / 2 + HALF / 2;
    this.halves.forEach((h, i) => {
      const s = i === 0 ? -1 : 1;
      h.visible = true;
      h.position.set(cx + rx * off * s, 0, cz + rz * off * s);
      h.rotation.y = yaw;
      h.scale.set(HALF, Math.max(0.05, high + water), THICK);
    });
  }

  clear() {
    this.jet.visible = false;
    for (const h of this.halves) h.visible = false;
  }

  dispose() {
    this.box.dispose();
    this.jetBox.dispose();
    this.jetMat.dispose();
    this.wallMat.dispose();
  }
}
