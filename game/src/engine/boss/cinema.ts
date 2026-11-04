// Update 0.0.15 — where the view goes during the boss room's show (the designer: the view leaves your eyes, rises over
// the room as it reshapes, watches the boss come out of the portal and take its stance beside its name, then glides
// back into your eyes, turned to face it), and when the wooden gate opens (the view turns to the gate, then comes
// back). Each shot is a place and a point it looks at; the view eases from one to the next. Pure maths on Three.js
// vectors (no rendering), so it's tested headless.
import * as THREE from 'three';
import { introBeats } from '../../sim/dungeon/bossRoom';
import { ENEMY_STATS, EnemyKind } from '../../sim/enemies/kinds';
import { CINEMA } from '../../tuning/cinema';
import type { BossLayout } from '../../world/dungeon/assemble';

export interface Shot {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

const shot = (): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** How long the gate shot takes to get there and back (s). */
const GATE_GLIDE = 0.8;

export class Cinema {
  /** Your eyes as the show started, and as it ends (facing the boss). */
  private readonly eye = shot();
  private readonly back = shot();
  private readonly high = shot();
  private readonly drift = shot();
  private readonly boss = shot();
  private readonly close = shot();
  private readonly gate = shot();
  /** Into the room, and across it (unit, on the floor). */
  private readonly fwd = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  /** The yaw and pitch you face when the show ends. */
  endYaw = 0;
  endPitch = 0;

  /** Update 0.0.18 — `kind`: the boss (its height frames the shots). */
  constructor(
    private readonly layout: BossLayout,
    private readonly kind: EnemyKind = 'dragon',
  ) {
    const e = layout.entrance;
    this.fwd.set(e === 'w' ? 1 : e === 'e' ? -1 : 0, 0, e === 'n' ? 1 : e === 's' ? -1 : 0);
    this.right.set(-this.fwd.z, 0, this.fwd.x);
  }

  /** The show starts: you're at `eye` looking along `dir`. Lays out its shots. */
  start(eye: THREE.Vector3, dir: THREE.Vector3) {
    const c = CINEMA.v;
    const p = this.layout.portal;
    const h = ENEMY_STATS[this.kind]().height;
    this.eye.pos.copy(eye);
    this.eye.look.copy(eye).addScaledVector(dir, 20);
    // High over the room, a little in front of you, looking at its middle.
    this.high.pos.copy(eye).addScaledVector(this.fwd, 4).setY(c.height);
    this.high.look.set(p.x, 1.5, p.z);
    // Drifting aside as the walls slide back.
    this.drift.pos.copy(this.high.pos).addScaledVector(this.right, 10).addScaledVector(this.fwd, 6).setY(c.height + 2);
    this.drift.look.set(p.x, 0.5, p.z);
    // Low in front of the boss, a little to its side; it stands left of the middle, its name to its right.
    this.boss.pos.set(p.x, 2.4, p.z).addScaledVector(this.fwd, -c.bossShot).addScaledVector(this.right, 4);
    this.boss.look.set(p.x, h * 0.55, p.z).addScaledVector(this.right, 3.2);
    this.close.pos.copy(this.boss.pos).addScaledVector(this.fwd, 2.5).setY(1.9);
    this.close.look.copy(this.boss.look).setY(h * 0.6);
    // Back in your eyes, facing it.
    this.back.pos.copy(eye);
    const dx = p.x - eye.x;
    const dz = p.z - eye.z;
    this.endYaw = Math.atan2(-dx, -dz);
    this.endPitch = Math.min(0.3, Math.max(0, Math.atan2(h * 0.4 - eye.y, Math.hypot(dx, dz))));
    this.back.look.set(eye.x - Math.sin(this.endYaw) * Math.cos(this.endPitch) * 20, eye.y + Math.sin(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * Math.cos(this.endPitch) * 20);
  }

  /** The view `t` s into the show, into `out`. */
  intro(t: number, out: Shot) {
    const s = introBeats();
    const c = CINEMA.v;
    const toBoss = Math.max(c.pull, s.riseFrom - 0.2);
    if (t < c.pull) return blend(this.eye, this.high, t / c.pull, out);
    if (t < toBoss) return blend(this.high, this.drift, (t - c.pull) / (toBoss - c.pull), out);
    if (t < s.riseTo) return blend(this.drift, this.boss, (t - toBoss) / (s.riseTo - toBoss), out);
    if (t < s.stanceTo) return blend(this.boss, this.close, (t - s.riseTo) / (s.stanceTo - s.riseTo), out);
    return blend(this.close, this.back, (t - s.stanceTo) / (s.end - s.stanceTo), out);
  }

  /** The gate shot: from your eyes (`eye`, looking along `dir`) to the gate and back, `t` s after it starts opening.
   *  False once it's over. */
  gateShot(t: number, eye: THREE.Vector3, dir: THREE.Vector3, out: Shot): boolean {
    const total = CINEMA.v.gateShotTime;
    if (CINEMA.v.gateShot < 1 || t >= total) return false;
    const g = this.layout.gateAt;
    // In the room, facing the gate, a little to one side.
    this.gate.pos.set(g.x - g.ox * 11, 3.2, g.z - g.oz * 11).addScaledVector(this.right, 2.5);
    this.gate.look.set(g.x + g.ox * 2, 2, g.z + g.oz * 2);
    this.eye.pos.copy(eye);
    this.eye.look.copy(eye).addScaledVector(dir, 20);
    if (t < GATE_GLIDE) return !!blend(this.eye, this.gate, t / GATE_GLIDE, out);
    if (t < total - GATE_GLIDE) return !!blend(this.gate, this.gate, 0, out);
    return !!blend(this.gate, this.eye, (t - (total - GATE_GLIDE)) / GATE_GLIDE, out);
  }

  /** Is `t` s into the gate shot still in it? */
  static inGateShot(t: number): boolean {
    return CINEMA.v.gateShot >= 1 && t < CINEMA.v.gateShotTime;
  }
}

/** Eased from shot `a` to `b` (k: 0..1). */
function blend(a: Shot, b: Shot, k: number, out: Shot): Shot {
  const s = smooth(k);
  out.pos.lerpVectors(a.pos, b.pos, s);
  out.look.lerpVectors(a.look, b.look, s);
  return out;
}
