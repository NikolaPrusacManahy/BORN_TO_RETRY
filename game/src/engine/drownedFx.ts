// Update 0.2.10 — what floor 5's enemies show that their models can't (the designer: hard, but every move readable).
// A Snapper or the Bog Brute under the water: a dark fin cutting along its surface; where one is about to come up, a
// ring spreading on the water (its bite's reach, or the Bog Brute's) until it does. The Bog Brute's leap: a ring where
// it'll land. An Urchin with its spikes out: a red shell round it. A Jelly glowing: the reach of its shock coming, on
// the water (far while you're wading). The Deep One's lash: its line glowing on the floor, brighter as it comes. The
// Drowned King: its great fin under the water, the ring where it'll come up; its Riptide, its claws' reach, its pull are
// drownedKingFx.ts's, its heads and its maw temple/drownedHeads.ts's.
// Update 0.3.58 — its fin is gone when its Fin Dive is about to land: that's your cue to dash. Then, the ring.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { WADE_MIN } from '../sim/dungeon/tide';
import { goneFor, lockAt, RISE, submerged } from '../sim/enemies/drownedKingMoves';
import { DrownedHeads } from './temple/drownedHeads';
import { DrownedKingFx } from './drownedKingFx';
import { ENEMY_POOL, isLive } from '../sim/enemies/enemy';
import { EnemyKind, RADIUS } from '../sim/enemies/kinds';
import { spiked } from '../sim/enemies/urchin';
import { FOES5 } from '../tuning/foes5';
import { FOES5B } from '../tuning/foes5b';
import { DROWNED } from '../tuning/drowned';

const additive = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

interface Marks {
  fin: THREE.Mesh;
  ring: THREE.Mesh;
  shell: THREE.Mesh;
  line: THREE.Mesh;
}

/** A fin's size (m), how far over the water it shows; how much bigger the Bog Brute's and the Drowned King's are. */
const FIN = 0.45;
const FINS: Partial<Record<EnemyKind, number>> = { bogBrute: 2.2, drownedKing: 4 };

/** Update 0.3.59 — a fin: thin, swept back, its nose towards −z; 1 high. */
function finGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.24, 0);
  s.quadraticCurveTo(-0.02, 0.5, 0.22, 1);
  s.quadraticCurveTo(0.12, 0.45, 0.24, 0);
  s.lineTo(-0.24, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -0.05);
  g.rotateY(-Math.PI / 2);
  return g;
}

export class DrownedFx {
  readonly group = new THREE.Group();
  private readonly finGeo = finGeometry();
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  private readonly shellGeo = new THREE.IcosahedronGeometry(1, 1);
  private readonly lineGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
  private readonly finMat = new THREE.MeshStandardMaterial({ color: 0x1c3a40, roughness: 0.5 });
  private readonly marks: Marks[] = [];
  private readonly king: DrownedKingFx;
  private readonly heads: DrownedHeads;
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < ENEMY_POOL; i++) {
      const m = { fin: new THREE.Mesh(this.finGeo, this.finMat), ring: new THREE.Mesh(this.ringGeo, additive(0x7af0ff)), shell: new THREE.Mesh(this.shellGeo, additive(0xff3a20)), line: new THREE.Mesh(this.lineGeo, additive(0xc060ff)) };
      m.fin.visible = m.ring.visible = m.shell.visible = m.line.visible = false;
      this.group.add(m.fin, m.ring, m.shell, m.line);
      this.marks.push(m);
    }
    this.king = new DrownedKingFx(this.group);
    this.heads = new DrownedHeads(this.group);
  }

  /** `rootOf`: the body drawn for an enemy slot, its clip applied this frame. */
  update(state: CombatState, dt: number, rootOf: (i: number) => THREE.Object3D | null = () => null) {
    this.time += dt;
    this.king.update(state, dt);
    this.heads.update(state, dt, rootOf);
    const water = Math.max(state.tide, 0);
    for (let i = 0; i < this.marks.length; i++) {
      const e = state.enemies[i];
      const m = this.marks[i];
      m.fin.visible = m.ring.visible = m.shell.visible = m.line.visible = false;
      if (!isLive(e)) continue;
      // Under the water: its fin.
      if (submerged(e) && !(e.kind === 'drownedKing' && e.move === RISE)) {
        m.fin.visible = true;
        const big = FINS[e.kind] ?? 1;
        m.fin.position.set(e.pos.x, water - 0.05, e.pos.z);
        m.fin.rotation.y = e.facing;
        m.fin.scale.set(big, FIN * big * (0.9 + 0.1 * Math.sin(this.time * 9 + i)), big * 1.6);
      }
      // About to come up (or land): a ring spreading to its reach.
      let reach = 0;
      let k = 0;
      if (e.phase === 'windup' && e.move === 1 && e.kind === 'snapper') {
        reach = FOES5.v.snapperReach;
        k = e.t / FOES5.v.snapperRise;
      } else if (e.phase === 'windup' && e.move === 1 && e.kind === 'bogBrute') {
        reach = FOES5B.v.diveReach + RADIUS.bogBrute;
        k = e.t / FOES5B.v.diveWarn;
      } else if (e.phase === 'leap' && e.kind === 'bogBrute') {
        reach = FOES5B.v.slamReach + RADIUS.bogBrute;
        k = e.t / FOES5B.v.leapAir;
      } else if (e.phase === 'windup' && e.kind === 'jelly') {
        reach = state.tide >= WADE_MIN ? FOES5.v.jellyFar : FOES5.v.jellyNear;
        k = e.t / FOES5.v.jellyGlow;
      } else if (e.kind === 'drownedKing' && e.phase === 'windup' && e.move === RISE && e.t >= lockAt(e)) {
        reach = DROWNED.v.lungeReach;
        k = (e.t - lockAt(e)) / Math.max(0.05, goneFor(e) - lockAt(e));
      }
      if (reach > 0) {
        const lit = Math.min(1, k);
        m.ring.visible = true;
        const at = e.phase === 'leap' ? e.aim : e.pos;
        m.ring.position.set(at.x, water + 0.04, at.z);
        m.ring.scale.setScalar(reach * (0.3 + 0.7 * lit));
        (m.ring.material as THREE.MeshBasicMaterial).color.setHex(e.kind === 'jelly' ? 0xff70e0 : e.kind === 'bogBrute' ? 0xff6a30 : 0x7af0ff);
        (m.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.55 * lit;
      }
      // An Urchin with its spikes out.
      if (spiked(e)) {
        m.shell.visible = true;
        m.shell.position.set(e.pos.x, e.pos.y + FOES5.v.urchinHeight * 0.5, e.pos.z);
        m.shell.scale.setScalar(RADIUS.urchin * 1.45 * (1 + 0.05 * Math.sin(this.time * 20)));
        (m.shell.material as THREE.MeshBasicMaterial).opacity = 0.32;
      }
      // The Deep One's lash: its line, brighter as it comes.
      if (e.kind === 'deepOne' && e.phase === 'windup' && e.move === 1) {
        const lit = Math.min(1, e.t / FOES5B.v.lashWindup);
        const len = Math.hypot(e.aim.x - e.pos.x, e.aim.z - e.pos.z);
        m.line.visible = true;
        m.line.position.set(e.pos.x, water + 0.05, e.pos.z);
        m.line.rotation.y = Math.atan2(-(e.aim.x - e.pos.x), -(e.aim.z - e.pos.z));
        m.line.scale.set(FOES5B.v.lashWidth * 2 * (0.4 + 0.6 * lit), 1, len);
        (m.line.material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.6 * lit * (0.85 + 0.15 * Math.sin(this.time * 30));
      }
    }
  }

  clear() {
    this.king.clear();
    this.heads.clear();
    for (const m of this.marks) m.fin.visible = m.ring.visible = m.shell.visible = m.line.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.king.dispose();
    this.heads.dispose();
    this.finGeo.dispose();
    this.ringGeo.dispose();
    this.shellGeo.dispose();
    this.lineGeo.dispose();
    this.finMat.dispose();
    for (const m of this.marks) for (const o of [m.ring, m.shell, m.line]) (o.material as THREE.Material).dispose();
  }
}
