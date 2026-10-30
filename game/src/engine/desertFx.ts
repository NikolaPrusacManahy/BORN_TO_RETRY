// Update 0.2.4 — what floor 4's burrowers show while you can't see them (the designer: hard, but each move readable): a
// Cactoro under the sand is a mound of sand moving along the floor; where one is about to burst up, the sand heaves and
// an orange ring spreads (the small one's spines' reach, or the big one's ambush) until it does. The Dino's pounce: where
// it'll land, a ring filling as it comes down. Update 0.2.4 — the Lizards' poison puddles (green, fading as they dry),
// a golden shell round every enemy a Flying Tribal has warded, the Skull Orc's leap landing.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { ENEMY_POOL, isLive } from '../sim/enemies/enemy';
import { ENEMY_STATS, RADIUS } from '../sim/enemies/kinds';
import { BURIED } from '../sim/enemies/cactoro';
import { FOES4 } from '../tuning/foes4';
import { DINO } from '../tuning/dino';
import { PUDDLE_POOL } from '../sim/combat/puddles';

const SAND = 0xd9b06a;
const additive = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

interface Marks {
  mound: THREE.Mesh;
  ring: THREE.Mesh;
  ward: THREE.Mesh;
}

export class DesertFx {
  readonly group = new THREE.Group();
  private readonly moundGeo = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  private readonly discGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
  private readonly sandMat = new THREE.MeshStandardMaterial({ color: SAND, roughness: 1 });
  private readonly marks: Marks[] = [];
  private readonly landRing = new THREE.Mesh(this.ringGeo, additive(0xff3a20));
  private readonly landFill = new THREE.Mesh(this.discGeo, additive(0xff5a20));
  private readonly orcRing = new THREE.Mesh(this.ringGeo, additive(0xff3a20));
  private readonly wardGeo = new THREE.SphereGeometry(1, 20, 14);
  private readonly puddles: THREE.Mesh[] = [];
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < ENEMY_POOL; i++) {
      const m = { mound: new THREE.Mesh(this.moundGeo, this.sandMat), ring: new THREE.Mesh(this.ringGeo, additive(0xff8a20)), ward: new THREE.Mesh(this.wardGeo, additive(0xffd040)) };
      m.mound.visible = m.ring.visible = m.ward.visible = false;
      m.mound.receiveShadow = true;
      this.group.add(m.mound, m.ring, m.ward);
      this.marks.push(m);
    }
    for (let i = 0; i < PUDDLE_POOL; i++) {
      const p = new THREE.Mesh(this.discGeo, additive(0x50ff30));
      p.visible = false;
      this.group.add(p);
      this.puddles.push(p);
    }
    this.landRing.visible = this.landFill.visible = this.orcRing.visible = false;
    this.group.add(this.landRing, this.landFill, this.orcRing);
  }

  update(state: CombatState, dt: number) {
    this.time += dt;
    const v = FOES4.v;
    for (let i = 0; i < this.marks.length; i++) {
      const e = state.enemies[i];
      const m = this.marks[i];
      // A ward: a golden shell round it, pulsing.
      m.ward.visible = isLive(e) && e.ward > 0;
      if (m.ward.visible) {
        const h = ENEMY_STATS[e.kind]().height;
        m.ward.position.set(e.pos.x, e.pos.y + h * 0.5, e.pos.z);
        m.ward.scale.setScalar(Math.max(h * 0.65, RADIUS[e.kind] * 1.4) * (1 + 0.05 * Math.sin(this.time * 8 + i)));
        (m.ward.material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.06 * e.ward;
      }
      const under = isLive(e) && (e.kind === 'cactoro' || e.kind === 'cactoroBig') && e.pos.y <= BURIED * 0.5;
      m.mound.visible = under;
      m.ring.visible = under && e.phase === 'windup';
      if (!under) continue;
      const big = e.kind === 'cactoroBig';
      const size = (big ? 1.2 : 0.55) * (1 + 0.12 * Math.sin(this.time * 14 + i));
      // Rising: the sand heaves up; its ring spreads to its reach.
      const k = e.phase === 'windup' ? Math.min(1, e.t / (big ? v.ambushWarn : v.cactoroRise)) : 0;
      m.mound.position.set(e.pos.x, 0, e.pos.z);
      m.mound.scale.set(size * (1 + 0.6 * k), 0.25 + 0.5 * k, size * (1 + 0.6 * k));
      if (m.ring.visible) {
        const reach = (big ? v.ambushReach : v.spinesReach) + RADIUS[e.kind];
        m.ring.position.set(e.pos.x, 0.05, e.pos.z);
        m.ring.scale.setScalar(Math.max(0.2, reach * (0.3 + 0.7 * k)));
        (m.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.6 * k;
      }
    }
    // Poison puddles.
    state.puddles.forEach((p, i) => {
      const m = this.puddles[i];
      m.visible = p.alive;
      if (!p.alive) return;
      m.position.set(p.x, p.y + 0.04, p.z);
      m.scale.setScalar(p.r * (1 + 0.04 * Math.sin(this.time * 3 + i)));
      (m.material as THREE.MeshBasicMaterial).opacity = 0.45 * Math.min(1, p.life / 1.5);
    });
    // The Skull Orc's leap.
    const orc = state.enemies.find((e) => e.kind === 'skullOrc' && isLive(e) && e.phase === 'leap');
    this.orcRing.visible = !!orc;
    if (orc) {
      this.orcRing.position.set(orc.aim.x, 0.06, orc.aim.z);
      this.orcRing.scale.setScalar(FOES4.v.orcLeapReach + RADIUS.skullOrc);
      (this.orcRing.material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.6 * Math.min(1, orc.t / FOES4.v.orcLeapAir);
    }
    const dino = state.enemies.find((e) => e.kind === 'dino' && isLive(e) && e.phase === 'leap');
    this.landRing.visible = this.landFill.visible = !!dino;
    if (dino) {
      const k = Math.min(1, dino.t / DINO.v.pounceAir);
      const r = DINO.v.pounceReach + RADIUS.dino;
      this.landRing.position.set(dino.aim.x, 0.06, dino.aim.z);
      this.landRing.scale.setScalar(r);
      (this.landRing.material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.6 * k;
      this.landFill.position.set(dino.aim.x, 0.05, dino.aim.z);
      this.landFill.scale.setScalar(Math.max(0.01, r * k));
      (this.landFill.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.35 * k * k;
    }
  }

  clear() {
    for (const m of this.marks) m.mound.visible = m.ring.visible = m.ward.visible = false;
    for (const p of this.puddles) p.visible = false;
    this.landRing.visible = this.landFill.visible = this.orcRing.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.moundGeo.dispose();
    this.ringGeo.dispose();
    this.discGeo.dispose();
    this.sandMat.dispose();
    this.wardGeo.dispose();
    for (const m of this.marks) {
      (m.ring.material as THREE.Material).dispose();
      (m.ward.material as THREE.Material).dispose();
    }
    for (const p of this.puddles) (p.material as THREE.Material).dispose();
    (this.orcRing.material as THREE.Material).dispose();
    (this.landRing.material as THREE.Material).dispose();
    (this.landFill.material as THREE.Material).dispose();
  }
}
