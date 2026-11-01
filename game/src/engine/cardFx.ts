// Update 0.2.18 — wave 2's Fate Cards as you see them (sim/cards/cardPowers.ts): flames licking off what burns (Pyre,
// Fire and Ice), blood dripping off what bleeds (Jagged Knuckles), a ball of fire and a flash where a blast goes off
// (Death Throes, Powder Keg, Chain Reaction), a burst of flames at a kill (Pyre), a ring of fire or frost thrown out (Fire
// and Ice), pale blue lightning (Thunderclap, Storm Heart) crackling along its path, Spirit Knives trailing pale wisps.
// Soft glowing specks (fx/flames.ts) and lines; one light, always there (a light added later would make every material
// rebuild); nothing made per frame. The rings, shakes and sparks are cardFeedback.ts's.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { BOLT_LIFE } from '../sim/cards/cardPowers';
import { ENEMY_STATS } from '../sim/enemies/kinds';
import { CARDS } from '../tuning/cards';
import { FIRE, FlameStyle, Flames } from './fx/flames';

const BLAZE: FlameStyle = { ...FIRE, life: [0.3, 0.6], size: [0.38, 0.06], rise: 2.2, drag: 2.5, wobble: 0.7 };
const FROST: FlameStyle = { life: [0.35, 0.7], size: [0.32, 0.05], drag: 2.2, rise: 0.4, hot: [0.95, 1, 1], warm: [0.45, 0.8, 1], cool: [0.1, 0.25, 0.6], wobble: 0.3 };
const BLOOD: FlameStyle = { life: [0.35, 0.6], size: [0.09, 0.05], drag: 0.6, rise: -9, hot: [0.75, 0.04, 0.04], warm: [0.5, 0.02, 0.02], cool: [0.25, 0.01, 0.01], wobble: 0 };
const SPIRIT: FlameStyle = { life: [0.25, 0.5], size: [0.2, 0.03], drag: 3, rise: 0.6, hot: [0.95, 1, 1], warm: [0.5, 0.85, 1], cool: [0.15, 0.3, 0.7], wobble: 0.4 };
/** Flames a second off what burns, drops off what bleeds; specks a second along a bolt, off a Spirit Knife. */
const BURN_RATE = 26;
const BLEED_RATE = 10;
const BOLT_RATE = 120;
const SPIRIT_RATE = 60;
/** A bolt drawn in this many jagged pieces, this far off its line (m). */
const SEG = 8;
const JAG = 0.35;
const BOLT_POOL = 16;
/** A blast's flash: its light at full (and how fast it dies, 1/s). */
const FLASH = 40;
const FLASH_FADE = 9;

const at = new THREE.Vector3();
const v = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();

/** How many of something that comes `rate` a second come this frame (a fraction left to chance). */
const howMany = (rate: number, dt: number) => {
  const n = rate * dt;
  return Math.floor(n) + (Math.random() < n - Math.floor(n) ? 1 : 0);
};

export class CardFx {
  readonly group = new THREE.Group();
  private readonly fire = new Flames(700, BLAZE);
  private readonly frost = new Flames(300, FROST);
  private readonly blood = new Flames(200, BLOOD);
  private readonly spirit = new Flames(400, SPIRIT);
  private readonly bolts: THREE.LineSegments;
  private readonly boltPos = new Float32Array(BOLT_POOL * SEG * 2 * 3);
  private readonly light = new THREE.PointLight(0xffa040, 0, 14, 2);

  constructor(
    scene: THREE.Object3D,
    private readonly camera: THREE.Camera,
  ) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.boltPos, 3));
    this.bolts = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd8f0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.bolts.frustumCulled = false;
    this.group.add(this.fire.mesh, this.frost.mesh, this.blood.mesh, this.spirit.mesh, this.bolts, this.light);
    scene.add(this.group);
  }

  /** Reads this frame's combat events (before they're cleared) and draws what's going on. */
  update(state: CombatState, dt: number) {
    for (let i = 0; i < state.events.length; i++) {
      const e = state.events.at(i);
      at.set(e.x, e.y, e.z);
      switch (e.kind) {
        case 'cardBoom':
          this.fire.emit(Math.round(14 * e.value), at, null, e.value * 1.8, 2, 0.4);
          this.light.position.copy(at);
          this.light.intensity = FLASH;
          break;
        case 'cardPyre':
          this.fire.emit(30, at, v.set(0, 2.5, 0), 1.6, 1.4, 0.5);
          break;
        case 'cardRing':
          this.ring(e.value === 1 ? this.fire : this.frost, at);
          break;
        case 'cardSpirit':
          this.spirit.emit(16, at, null, 2, 1.3, 0.3);
          break;
      }
    }
    // What burns and what bleeds.
    for (const d of state.powers.dots) {
      if (!d.alive) continue;
      const e = state.enemies[d.slot];
      const s = ENEMY_STATS[e.kind]();
      at.set(e.pos.x, e.pos.y + s.height * 0.5, e.pos.z);
      if (d.kind === 'burn') this.fire.emit(howMany(BURN_RATE, dt), at, v.set(0, 1.2, 0), 0.4, 0.8, Math.max(0.2, s.radius * 0.8));
      else this.blood.emit(howMany(BLEED_RATE, dt), at, null, 0.5, 1, s.radius * 0.6);
    }
    for (const k of state.knives) if (k.alive && !k.stuck && k.hand === 2) this.spirit.emit(howMany(SPIRIT_RATE, dt), k.pos, null, 0.3, 0.8);
    this.drawBolts(state, dt);
    this.light.intensity *= Math.exp(-FLASH_FADE * dt);
    this.fire.update(dt, this.camera);
    this.frost.update(dt, this.camera);
    this.blood.update(dt, this.camera);
    this.spirit.update(dt, this.camera);
  }

  /** A ring thrown out from `from`: specks flying out to Fire and Ice's reach. */
  private ring(flames: Flames, from: THREE.Vector3) {
    const r = CARDS.v.bandRadius;
    for (let k = 0; k < 48; k++) {
      const t = (k / 48) * Math.PI * 2;
      v.set(Math.cos(t) * r * 2.6, 0.4, Math.sin(t) * r * 2.6);
      flames.emit(1, at.set(from.x, Math.max(0.3, from.y - 0.6), from.z), v, 0.4, 1.3);
    }
  }

  /** The bolts, jagged afresh each frame (they crackle), brightest when new; glowing specks along them. */
  private drawBolts(state: CombatState, dt: number) {
    let n = 0;
    for (const bolt of state.powers.bolts) {
      if (!bolt.alive || n >= BOLT_POOL) continue;
      const k = bolt.life / BOLT_LIFE;
      a.copy(bolt.from);
      for (let s = 1; s <= SEG; s++) {
        const t = s / SEG;
        b.lerpVectors(bolt.from, bolt.to, t);
        if (s < SEG) b.set(b.x + (Math.random() - 0.5) * JAG * 2, b.y + (Math.random() - 0.5) * JAG * 2, b.z + (Math.random() - 0.5) * JAG * 2);
        const o = (n * SEG + s - 1) * 6;
        this.boltPos.set([a.x, a.y, a.z, b.x, b.y, b.z], o);
        a.copy(b);
      }
      for (let g = howMany(BOLT_RATE * k, dt); g > 0; g--) this.frost.emit(1, at.lerpVectors(bolt.from, bolt.to, Math.random()), null, 0.6, 0.7);
      n++;
    }
    const geo = this.bolts.geometry;
    geo.setDrawRange(0, n * SEG * 2);
    geo.attributes.position.needsUpdate = true;
    this.bolts.visible = n > 0;
  }

  clear() {
    this.fire.clear();
    this.frost.clear();
    this.blood.clear();
    this.spirit.clear();
    this.light.intensity = 0;
    this.bolts.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.fire.dispose();
    this.frost.dispose();
    this.blood.dispose();
    this.spirit.dispose();
    this.bolts.geometry.dispose();
    (this.bolts.material as THREE.Material).dispose();
  }
}
