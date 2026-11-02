// Update 0.3.18 — what floor 8's crew shows on the ground before it strikes (sim/enemies/ships.ts, beeShip.ts): a
// Strafer's pass (a pink line from under it across you and on: its bolts will fall down it), the Bee ship's pass (a
// yellow line) and its bombing run (a wide orange one, brightening as the run comes). Each fades in over its warning
// and burns while the run's on. Made in code.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { ENEMY_POOL } from '../../sim/enemies/enemy';
import { BOMBING } from '../../sim/enemies/beeShip';
import { FOES_MOON } from '../../tuning/foesMoon';
import { FOES_MOON_B } from '../../tuning/foesMoonB';

/** A line's width (m): a Strafer's, the Bee ship's pass, its bombing run's (its bombs' blast across). */
const STRAFE_W = 0.9;
const PASS_W = 1.6;
const BOMB_W = 3.6;
const COLOUR = { strafe: 0xff4ab4, pass: 0xffd040, bomb: 0xff6a20 };

export class CrewMarks {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly lines: THREE.Mesh[] = [];
  private readonly mats: THREE.MeshBasicMaterial[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < ENEMY_POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: COLOUR.strafe, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3 });
      const line = new THREE.Mesh(this.geo, mat);
      line.visible = false;
      this.group.add(line);
      this.lines.push(line);
      this.mats.push(mat);
    }
  }

  update(state: CombatState) {
    for (let i = 0; i < this.lines.length; i++) {
      const e = state.enemies[i];
      const line = this.lines[i];
      const marking = !!e && e.alive && (e.kind === 'strafer' || e.kind === 'beeShip') && (e.phase === 'windup' || e.phase === 'dive');
      line.visible = marking;
      if (!marking) continue;
      const bombing = e.kind === 'beeShip' && e.move === BOMBING;
      const warn = e.kind === 'strafer' ? FOES_MOON.v.strafeWarn : bombing ? FOES_MOON_B.v.bombLine : 0.6;
      const k = e.phase === 'dive' ? 1 : Math.min(1, e.t / Math.max(0.05, warn));
      const dx = e.aim.x - e.from.x;
      const dz = e.aim.z - e.from.z;
      const long = Math.max(0.1, Math.hypot(dx, dz));
      line.position.set((e.from.x + e.aim.x) / 2, 0.04, (e.from.z + e.aim.z) / 2);
      line.rotation.set(0, Math.atan2(dx, dz), 0);
      line.scale.set(e.kind === 'strafer' ? STRAFE_W : bombing ? BOMB_W : PASS_W, 1, long);
      this.mats[i].color.setHex(e.kind === 'strafer' ? COLOUR.strafe : bombing ? COLOUR.bomb : COLOUR.pass);
      this.mats[i].opacity = 0.15 + 0.45 * k;
    }
  }

  clear() {
    for (const l of this.lines) l.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.geo.dispose();
    for (const m of this.mats) m.dispose();
  }
}
