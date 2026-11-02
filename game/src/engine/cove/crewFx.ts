// Update 0.3.15 — what Skull Cove's crew show that their models can't (every move readable): the Corsair's hook on its
// rope (twirled over her head, flying, then fast in you), Barbarossa's red line from his pistol to his aim (brighter and
// thicker as his shot comes), and Mako's fin cutting through the sand, the sand churning where it'll erupt (its bite's reach). (The Bomber's bombs are
// boss/bombView.ts's.)
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { AIMING, PISTOL } from '../../sim/enemies/captain';
import { HAND, HOOK_TWIRL } from '../../sim/enemies/corsair';
import { ENEMY_POOL, isLive } from '../../sim/enemies/enemy';
import { ENEMY_STATS } from '../../sim/enemies/kinds';
import { BITE, RISING } from '../../sim/enemies/mako';
import { FOES_COVE_B } from '../../tuning/foesCoveB';

interface Marks {
  rope: THREE.Mesh;
  hook: THREE.Mesh;
  aim: THREE.Mesh;
  fin: THREE.Mesh;
  churn: THREE.Mesh;
}

/** The rope's thickness (m); the hook twirls this wide (m) this fast (rad/s); the aim line's thickness, faint to full
 *  (m), and how far past his aim it runs (m); Mako's fin's height (m). */
const ROPE = 0.025;
const TWIRL = 0.6;
const SPIN = 14;
const THIN = 0.012;
const THICK = 0.04;
const PAST = 3;
const FIN = 0.75;

const a = new THREE.Vector3();
const b = new THREE.Vector3();

/** `m` (its geometry along +z, 0 to 1) laid from `from` to `to`, `r` thick. */
function span(m: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, r: number) {
  m.position.copy(from);
  m.lookAt(to);
  m.scale.set(r, r, Math.max(1e-3, from.distanceTo(to)));
}

export class CrewFx {
  readonly group = new THREE.Group();
  private readonly beamGeo = new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0).rotateX(Math.PI / 2);
  private readonly hookGeo = new THREE.TorusGeometry(0.16, 0.035, 6, 12, Math.PI * 1.3);
  private readonly finGeo = new THREE.ConeGeometry(0.25, 1, 4).translate(0, 0.5, 0);
  private readonly discGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  private readonly ropeMat = new THREE.MeshStandardMaterial({ color: 0x6b5233, roughness: 0.9 });
  private readonly hookMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.8, roughness: 0.35 });
  private readonly finMat = new THREE.MeshStandardMaterial({ color: 0x40525c, roughness: 0.5 });
  private readonly mats: THREE.Material[] = [];
  private readonly marks: Marks[] = [];
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < ENEMY_POOL; i++) {
      const aim = new THREE.MeshBasicMaterial({ color: 0xff1a10, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const churn = new THREE.MeshBasicMaterial({ color: 0xe8c78a, transparent: true, opacity: 0, depthWrite: false });
      this.mats.push(aim, churn);
      const m: Marks = {
        rope: new THREE.Mesh(this.beamGeo, this.ropeMat),
        hook: new THREE.Mesh(this.hookGeo, this.hookMat),
        aim: new THREE.Mesh(this.beamGeo, aim),
        fin: new THREE.Mesh(this.finGeo, this.finMat),
        churn: new THREE.Mesh(this.discGeo, churn),
      };
      for (const o of Object.values(m)) {
        o.visible = false;
        this.group.add(o);
      }
      this.marks.push(m);
    }
  }

  /** `chest`: yours (a hook that's caught you is fast in it). */
  update(state: CombatState, chest: THREE.Vector3, dt: number) {
    this.time += dt;
    const v = FOES_COVE_B.v;
    for (let i = 0; i < this.marks.length; i++) {
      const e = state.enemies[i];
      const m = this.marks[i];
      for (const o of Object.values(m)) o.visible = false;
      if (!isLive(e)) continue;
      if (e.kind === 'corsair') {
        // The hook: twirled over her head, flying, or caught in you (the rope to just under your eyes).
        a.set(e.pos.x, e.pos.y + HAND, e.pos.z);
        if (e.phase === 'windup' && e.move === HOOK_TWIRL) b.set(e.pos.x + Math.cos(this.time * SPIN) * TWIRL, e.pos.y + ENEMY_STATS.corsair().height + 0.3, e.pos.z + Math.sin(this.time * SPIN) * TWIRL);
        else if (e.phase === 'dive') b.copy(e.aim);
        else if (e.phase === 'charge') b.set(chest.x, chest.y - 0.5, chest.z);
        else continue;
        span(m.rope, a, b, ROPE);
        m.rope.visible = true;
        m.hook.visible = e.phase !== 'charge';
        m.hook.position.copy(b);
        m.hook.rotation.set(0, this.time * 9, Math.PI / 2);
      } else if (e.kind === 'captain' && e.phase === 'windup' && e.move === AIMING) {
        // His aim: a red line from his pistol through where he's aiming, brighter as his shot comes.
        const k = Math.min(1, e.t / v.captainAim);
        a.set(e.pos.x, e.pos.y + PISTOL, e.pos.z);
        b.subVectors(e.aim, a).normalize().multiplyScalar(PAST).add(e.aim);
        span(m.aim, a, b, THIN + (THICK - THIN) * k * k);
        (m.aim.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.7 * k + (k > 0.85 ? 0.3 * Math.sin(this.time * 60) : 0);
        m.aim.visible = true;
      } else if (e.kind === 'mako') {
        // Under the sand: its fin. About to erupt: the sand churning, its bite's reach.
        if (e.phase === 'burrow' && e.pos.y < -1) {
          m.fin.position.set(e.pos.x, -0.05, e.pos.z);
          m.fin.rotation.y = e.facing;
          m.fin.scale.set(2, FIN * (0.9 + 0.1 * Math.sin(this.time * 9 + i)), 3.2);
          m.fin.visible = true;
        } else if (e.phase === 'windup' && e.move === RISING) {
          const k = Math.min(1, e.t / v.makoRise);
          m.churn.position.set(e.aim.x, 0.05, e.aim.z);
          m.churn.scale.setScalar(BITE * (0.85 + 0.15 * Math.sin(this.time * 30)));
          (m.churn.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.5 * k;
          m.churn.visible = true;
        }
      }
    }
  }

  clear() {
    for (const m of this.marks) for (const o of Object.values(m)) o.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of [this.beamGeo, this.hookGeo, this.finGeo, this.discGeo]) g.dispose();
    for (const mat of [this.ropeMat, this.hookMat, this.finMat, ...this.mats]) mat.dispose();
  }
}
