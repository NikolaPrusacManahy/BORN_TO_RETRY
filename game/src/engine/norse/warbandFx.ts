// Update 0.3.22 — what floor 7's warband leaves and shows on the ground (MD/FLOOR7_WARBAND_PLAN.md): its patches of rime
// (sim/combat/frost.ts: pale glassy ice, a frosted rim, fading as they thaw), a ring of frost tightening on the body a
// Völva chants over (sim/enemies/volva.ts: it closes as her chant ends), and Haugbui's stomp's reach on the ground as
// his foot is up (sim/enemies/haugbui.ts: brightening as it comes). Made in code.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { RIME_POOL } from '../../sim/combat/frost';
import { ENEMY_POOL } from '../../sim/enemies/enemy';
import { CHANTING } from '../../sim/enemies/volva';
import { STOMP } from '../../sim/enemies/haugbui';
import { FOES_NORSE } from '../../tuning/foesNorse';
import { FOES_NORSE_B } from '../../tuning/foesNorseB';

/** A patch fades over its last this long (s); a chant's ring starts this wide (m) and closes to this. */
const THAW = 1.5;
const CHANT_FROM = 2.4;
const CHANT_TO = 0.7;

const glow = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3 });

export class WarbandFx {
  readonly group = new THREE.Group();
  private readonly disc = new THREE.CircleGeometry(0.5, 40).rotateX(-Math.PI / 2);
  private readonly rim = new THREE.RingGeometry(0.44, 0.5, 48).rotateX(-Math.PI / 2);
  private readonly ring = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  private readonly patches: { ice: THREE.Mesh; edge: THREE.Mesh; iceMat: THREE.MeshStandardMaterial; edgeMat: THREE.MeshBasicMaterial }[] = [];
  private readonly marks: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < RIME_POOL; i++) {
      const iceMat = new THREE.MeshStandardMaterial({ color: 0xd8f2ff, emissive: 0x3a8ab0, emissiveIntensity: 0.25, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const edgeMat = glow(0xbfefff);
      const ice = new THREE.Mesh(this.disc, iceMat);
      const edge = new THREE.Mesh(this.rim, edgeMat);
      ice.visible = edge.visible = false;
      ice.receiveShadow = true;
      this.group.add(ice, edge);
      this.patches.push({ ice, edge, iceMat, edgeMat });
    }
    for (let i = 0; i < ENEMY_POOL; i++) {
      const mat = glow(0x7fdcff);
      const mesh = new THREE.Mesh(this.ring, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.marks.push({ mesh, mat });
    }
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    const time = this.time;
    const rime = state.ground.frost.rime;
    this.patches.forEach((p, i) => {
      const r = rime[i];
      p.ice.visible = p.edge.visible = r.alive;
      if (!r.alive) return;
      // (Settling in at first, fading as it thaws.)
      const k = Math.min(1, (r.full - r.life) / 0.25, r.life / THAW);
      p.ice.position.set(r.x, 0.03, r.z);
      p.edge.position.set(r.x, 0.035, r.z);
      p.ice.scale.setScalar(r.size);
      p.edge.scale.setScalar(r.size);
      p.iceMat.opacity = 0.62 * k;
      p.edgeMat.opacity = 0.5 * k;
    });
    for (let i = 0; i < this.marks.length; i++) {
      const e = state.enemies[i];
      const m = this.marks[i];
      const chanting = !!e && e.alive && e.kind === 'volva' && e.phase === 'charge' && e.move === CHANTING;
      const stomping = !!e && e.alive && e.kind === 'haugbui' && e.phase === 'windup' && e.move === STOMP;
      m.mesh.visible = chanting || stomping;
      if (chanting) {
        const k = Math.min(1, e.t / FOES_NORSE.v.raiseChant);
        m.mesh.position.set(e.aim.x, 0.05, e.aim.z);
        m.mesh.scale.setScalar(CHANT_FROM + (CHANT_TO - CHANT_FROM) * k);
        m.mat.color.setHex(0x7fdcff);
        m.mat.opacity = (0.35 + 0.5 * k) * (0.8 + 0.2 * Math.sin(time * 9 + i));
      } else if (stomping) {
        const k = Math.min(1, e.t / FOES_NORSE_B.v.stompWindup);
        m.mesh.position.set(e.pos.x, e.pos.y + 0.05, e.pos.z);
        m.mesh.scale.setScalar(FOES_NORSE_B.v.stompReach);
        m.mat.color.setHex(0x9fd8ff);
        m.mat.opacity = 0.25 + 0.65 * k;
      }
    }
  }

  clear() {
    for (const p of this.patches) p.ice.visible = p.edge.visible = false;
    for (const m of this.marks) m.mesh.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.disc.dispose();
    this.rim.dispose();
    this.ring.dispose();
    for (const p of this.patches) {
      p.iceMat.dispose();
      p.edgeMat.dispose();
    }
    for (const m of this.marks) m.mat.dispose();
  }
}
