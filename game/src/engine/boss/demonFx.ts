// Update 0.0.15 — what the Demon's moves draw on the floor (every attack telegraphed: CLAUDE.md §5): while it winds up
// a charge, a red lane along the way it will run, brighter as it comes; while it's in the air, a ring where it will land
// as wide as its landing's reach; its quake rings rolling out (a glowing band as wide as they are far); and the flash
// of light when its body bursts. Pooled and updated in place.
// Update 0.0.18 — the Dragon's too: its swoop's lane while it winds up its claws, and a ring as far as its wing or
// its tail reaches while it winds those up; any boss's burst flashes.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { windupOf } from '../../sim/enemies/demon';
import { CHARGE } from '../../sim/enemies/demonMoves';
import { dragonWindup } from '../../sim/enemies/dragon';
import { BURST, CLAWS, TAIL, WING } from '../../sim/enemies/dragonMoves';
import { RADIUS } from '../../sim/enemies/kinds';
import { DRAGON } from '../../tuning/dragon';
import { QUAKE_POOL } from '../../sim/combat/quakes';
import { BOSS } from '../../tuning/boss';
import { bossIn } from './demonView';

/** The burst's flash: how long (s), how big it grows (m), how bright its light. */
const FLASH = 0.6;
const FLASH_SIZE = 11;
const FLASH_LIGHT = 400;

const additive = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

export class DemonFx {
  readonly group = new THREE.Group();
  private readonly lane: THREE.Mesh;
  private readonly landing: THREE.Mesh;
  private readonly quakes: { band: THREE.Mesh; floor: THREE.Mesh }[] = [];
  private readonly flash: THREE.Mesh;
  private readonly flashLight = new THREE.PointLight(0xffe0c0, 0, 60, 1.2);
  private flashT = FLASH;
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    // The lane: 1 m long, from its feet forward (−z), scaled to the charge.
    const lane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
    const ring = new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2);
    const band = new THREE.CylinderGeometry(1, 1, 1, 72, 1, true).translate(0, 0.5, 0);
    const sphere = new THREE.SphereGeometry(1, 24, 16);
    this.geos.push(lane, ring, band, sphere);
    const mat = (color: number) => {
      const m = additive(color);
      this.mats.push(m);
      return m;
    };
    this.lane = new THREE.Mesh(lane, mat(0xff2010));
    this.landing = new THREE.Mesh(ring, mat(0xff7a18));
    for (let i = 0; i < QUAKE_POOL; i++) {
      const q = { band: new THREE.Mesh(band, mat(0xff8a30)), floor: new THREE.Mesh(ring, mat(0xffb060)) };
      this.group.add(q.band, q.floor);
      this.quakes.push(q);
    }
    this.flash = new THREE.Mesh(sphere, mat(0xfff2e0));
    this.group.add(this.lane, this.landing, this.flash, this.flashLight);
    for (const o of this.group.children) o.visible = false;
  }

  update(state: CombatState, dt: number) {
    const v = BOSS.v;
    for (let i = 0; i < state.events.length; i++) {
      const ev = state.events.at(i);
      if (ev.kind !== 'bossBurst') continue;
      this.flashT = 0;
      this.flash.position.set(ev.x, ev.y, ev.z);
      this.flashLight.position.set(ev.x, ev.y, ev.z);
    }
    const boss = bossIn(state);
    const e = boss?.kind === 'demon' ? boss : null;
    const d = boss?.kind === 'dragon' ? boss : null;
    const dv = DRAGON.v;
    // The charge's lane (the Dragon's swoop's), along the way it faces.
    const charging = !!e && e.phase === 'windup' && e.move === CHARGE;
    const swooping = !!d && d.phase === 'windup' && d.move === CLAWS;
    this.lane.visible = charging || swooping;
    if (e && charging) this.showLane(e.pos, e.facing, e.t, Math.min(1, e.t / windupOf(e, CHARGE)), v.demonHeight * 0.5, v.chargeRange);
    if (d && swooping) this.showLane(d.pos, d.facing, d.t, Math.min(1, d.t / dragonWindup(d, CLAWS)), dv.dragonHeight * 0.4, dv.clawRange);
    // Where its leap lands; how far the Dragon's wing or tail will sweep.
    const leaping = !!e && e.phase === 'leap';
    const swinging = !!d && d.phase === 'windup' && (d.move === WING || d.move === TAIL || d.move === BURST);
    this.landing.visible = leaping || swinging;
    if (e && leaping) {
      const k = Math.min(1, e.t / v.leapAir);
      this.landing.position.set(e.aim.x, e.aim.y + 0.06, e.aim.z);
      this.landing.scale.setScalar(v.slamReach);
      (this.landing.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.7 * k;
    }
    if (d && swinging) {
      const k = Math.min(1, d.t / dragonWindup(d, d.move));
      this.landing.position.set(d.pos.x, d.pos.y + 0.06, d.pos.z);
      this.landing.scale.setScalar((d.move === WING ? dv.wingReach : d.move === BURST ? dv.burstRadius : dv.tailReach) + RADIUS.dragon);
      (this.landing.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.7 * k;
    }
    // The quake rings: a band of light as far out as each has rolled, fading as it goes.
    for (let i = 0; i < state.quakes.length; i++) {
      const q = state.quakes[i];
      const fx = this.quakes[i];
      fx.band.visible = fx.floor.visible = q.alive && q.r > 0.1;
      if (!fx.band.visible) continue;
      const fade = 1 - q.r / q.reach;
      fx.band.position.set(q.x, q.y, q.z);
      fx.band.scale.set(q.r, q.clear * 1.4, q.r);
      fx.floor.position.set(q.x, q.y + 0.05, q.z);
      fx.floor.scale.setScalar(q.r);
      (fx.band.material as THREE.MeshBasicMaterial).opacity = 0.75 * fade;
      (fx.floor.material as THREE.MeshBasicMaterial).opacity = fade;
    }
    // The burst's flash.
    this.flash.visible = this.flashT < FLASH;
    if (this.flashT < FLASH) {
      this.flashT += dt;
      const k = Math.min(1, this.flashT / FLASH);
      this.flash.scale.setScalar(1 + FLASH_SIZE * (1 - (1 - k) ** 3));
      (this.flash.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      this.flashLight.intensity = FLASH_LIGHT * (1 - k) ** 2;
    } else this.flashLight.intensity = 0;
    this.flashLight.visible = this.flashLight.intensity > 0;
  }

  /** A lane `width` m wide and `length` m long from `pos` the way `facing` faces; brighter as `k` nears 1. */
  private showLane(pos: THREE.Vector3, facing: number, t: number, k: number, width: number, length: number) {
    this.lane.position.set(pos.x, 0.05, pos.z);
    this.lane.rotation.y = facing;
    this.lane.scale.set(width, 1, length);
    (this.lane.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.45 * k * (0.75 + 0.25 * Math.sin(t * 30));
  }

  clear() {
    this.flashT = FLASH;
    for (const o of this.group.children) o.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
  }
}
