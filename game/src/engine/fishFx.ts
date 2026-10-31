// Update 0.2.11 — what floor 6's enemies show that their models can't (every move readable, as on floor 5): under you,
// the column of bubbles where a Dolphin will ram up; the Manta Ray's shadow on the floor where it'll drop; the Old
// Whale's lane before it rams, its song rolling out as a ring, where it'll crash from its breach; the Drowned Prince's
// jet.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { ENEMY_POOL, isLive } from '../sim/enemies/enemy';
import { ENEMY_STATS } from '../sim/enemies/kinds';
import { BLANKET } from '../sim/enemies/manta';
import { princeJetAngle } from '../sim/enemies/prince';
import { BREACH, RAM } from '../sim/enemies/whaleMoves';
import { FOES6 } from '../tuning/foes6';
import { FOES6B } from '../tuning/foes6b';
import { WHALE } from '../tuning/whale';

const glow = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

interface Marks {
  column: THREE.Mesh;
  ring: THREE.Mesh;
  shadow: THREE.Mesh;
  lane: THREE.Mesh;
  jet: THREE.Mesh;
}

/** The Dolphin's column is this wide (m); the song's ring this thick (m); the Prince's jet this thick (m). */
const COLUMN = 0.9;
const SONG_THICK = 1.4;
const JET = 0.7;

export class FishFx {
  readonly group = new THREE.Group();
  private readonly columnGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true).translate(0, 0.5, 0);
  private readonly ringGeo = new THREE.RingGeometry(0.85, 1, 64).rotateX(-Math.PI / 2);
  private readonly discGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
  private readonly laneGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
  private readonly jetGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, -0.5);
  private readonly marks: Marks[] = [];
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < ENEMY_POOL; i++) {
      const shadow = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color: 0x041a1e, transparent: true, opacity: 0, depthWrite: false }));
      const m = { column: new THREE.Mesh(this.columnGeo, glow(0xbff6ff)), ring: new THREE.Mesh(this.ringGeo, glow(0x9ff0ff)), shadow, lane: new THREE.Mesh(this.laneGeo, glow(0xcff4ff)), jet: new THREE.Mesh(this.jetGeo, glow(0x8af0ff)) };
      this.hide(m);
      this.group.add(m.column, m.ring, m.shadow, m.lane, m.jet);
      this.marks.push(m);
    }
  }

  private hide(m: Marks) {
    m.column.visible = m.ring.visible = m.shadow.visible = m.lane.visible = m.jet.visible = false;
  }

  private show(mesh: THREE.Mesh, opacity: number) {
    mesh.visible = true;
    (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    const pulse = 0.75 + 0.25 * Math.sin(this.time * 14);
    for (let i = 0; i < this.marks.length; i++) {
      const e = state.enemies[i];
      const m = this.marks[i];
      this.hide(m);
      if (!isLive(e)) continue;
      const s = ENEMY_STATS[e.kind]();
      if (e.kind === 'dolphin' && e.phase === 'windup') {
        // (Bubbles rising under where you were, up to you.)
        const k = Math.min(1, e.t / FOES6.v.dolphinWindup);
        this.show(m.column, 0.12 + 0.3 * k * pulse);
        m.column.position.set(e.aim.x, e.pos.y, e.aim.z);
        m.column.scale.set(COLUMN, Math.max(0.5, e.aim.y + 1 - e.pos.y), COLUMN);
      } else if (e.kind === 'mantaRay' && e.phase === 'windup' && e.move === BLANKET) {
        const k = Math.min(1, e.t / FOES6B.v.mantaWarn);
        this.show(m.shadow, 0.25 + 0.45 * k);
        m.shadow.position.set(e.aim.x, e.aim.y + 0.03, e.aim.z);
        m.shadow.scale.setScalar(FOES6B.v.mantaRadius);
      } else if (e.kind === 'whale') this.whale(e, m, s.height, pulse);
      else if (e.kind === 'drownedPrince' && e.phase === 'breath') {
        // (From its mouth, sweeping, sloping to the height it aimed at.)
        const y = e.pos.y + s.height * 0.6;
        const range = FOES6.v.princeJetRange;
        this.show(m.jet, 0.55 * pulse);
        m.jet.position.set(e.pos.x, y, e.pos.z);
        m.jet.rotation.set(Math.atan2(e.aim.y - y, range), princeJetAngle(e), 0, 'YXZ');
        m.jet.scale.set(JET, JET, Math.hypot(range, e.aim.y - y));
      }
    }
  }

  /** The Old Whale's: its ram's lane, its song's ring, where its breach will crash. */
  private whale(e: CombatState['enemies'][number], m: Marks, height: number, pulse: number) {
    const v = WHALE.v;
    const y = e.pos.y + height / 2;
    if (e.phase === 'windup' && e.move === RAM) {
      const len = Math.hypot(e.aim.x - e.pos.x, e.aim.z - e.pos.z);
      this.show(m.lane, (0.12 + 0.25 * Math.min(1, e.t / v.ramWarn)) * pulse);
      m.lane.position.set(e.pos.x, Math.max(0.05, y - height / 2), e.pos.z);
      m.lane.rotation.y = Math.atan2(-(e.aim.x - e.pos.x), -(e.aim.z - e.pos.z));
      m.lane.scale.set(height, 1, len);
    } else if (e.phase === 'blast') {
      const r = v.songSpeed * e.t;
      this.show(m.ring, 0.45 * (1 - r / v.songReach));
      m.ring.position.set(e.pos.x, y, e.pos.z);
      m.ring.scale.set(r + SONG_THICK, 1, r + SONG_THICK);
    } else if (e.phase === 'windup' && e.move === BREACH) {
      this.show(m.ring, 0.5 * pulse);
      m.ring.position.set(e.aim.x, e.aim.y + 0.05, e.aim.z);
      m.ring.scale.set(v.breachReach, 1, v.breachReach);
      this.show(m.shadow, 0.35);
      m.shadow.position.set(e.aim.x, e.aim.y + 0.03, e.aim.z);
      m.shadow.scale.setScalar(height * 1.5);
    }
  }

  clear() {
    for (const m of this.marks) this.hide(m);
  }

  dispose() {
    this.group.removeFromParent();
    for (const m of this.marks) for (const mesh of [m.column, m.ring, m.shadow, m.lane, m.jet]) (mesh.material as THREE.Material).dispose();
    for (const g of [this.columnGeo, this.ringGeo, this.discGeo, this.laneGeo, this.jetGeo]) g.dispose();
  }
}
