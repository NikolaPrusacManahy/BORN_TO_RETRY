// Update 0.0.15 — what a boss's moves draw on the floor (every attack telegraphed: CLAUDE.md §5): its quake rings rolling
// out (a glowing band as wide as they are far); and the flash of light when its body bursts. Pooled and updated in place.
// Update 0.3.41 — the Demon gone (demonFx.ts → bossFx.ts).
// Update 0.3.49 — the Dragon's Dive Bomb (the Boss Design Bible): its shadow growing on you, and a ring as far as its
// landing reaches.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { dragonWindup } from '../../sim/enemies/dragon';
import { DIVE } from '../../sim/enemies/dragonMoves';
import { DRAGON } from '../../tuning/dragon';
import { QUAKE_POOL } from '../../sim/combat/quakes';
import { bossIn } from './bossIn';

/** The burst's flash: how long (s), how big it grows (m), how bright its light. */
const FLASH = 0.6;
const FLASH_SIZE = 11;
const FLASH_LIGHT = 400;

const additive = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

export class BossFx {
  readonly group = new THREE.Group();
  private readonly landing: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private readonly quakes: { band: THREE.Mesh; floor: THREE.Mesh }[] = [];
  private readonly flash: THREE.Mesh;
  private readonly flashLight = new THREE.PointLight(0xffe0c0, 0, 60, 1.2);
  private flashT = FLASH;
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    const ring = new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2);
    const disc = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
    const band = new THREE.CylinderGeometry(1, 1, 1, 72, 1, true).translate(0, 0.5, 0);
    const sphere = new THREE.SphereGeometry(1, 24, 16);
    this.geos.push(ring, disc, band, sphere);
    const mat = (color: number) => {
      const m = additive(color);
      this.mats.push(m);
      return m;
    };
    const dark = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false });
    this.mats.push(dark);
    this.landing = new THREE.Mesh(ring, mat(0xff4a18));
    this.shadow = new THREE.Mesh(disc, dark);
    for (let i = 0; i < QUAKE_POOL; i++) {
      const q = { band: new THREE.Mesh(band, mat(0xff8a30)), floor: new THREE.Mesh(ring, mat(0xffb060)) };
      this.group.add(q.band, q.floor);
      this.quakes.push(q);
    }
    this.flash = new THREE.Mesh(sphere, mat(0xfff2e0));
    this.group.add(this.landing, this.shadow, this.flash, this.flashLight);
    for (const o of this.group.children) o.visible = false;
  }

  update(state: CombatState, dt: number) {
    for (let i = 0; i < state.events.length; i++) {
      const ev = state.events.at(i);
      if (ev.kind !== 'bossBurst') continue;
      this.flashT = 0;
      this.flash.position.set(ev.x, ev.y, ev.z);
      this.flashLight.position.set(ev.x, ev.y, ev.z);
    }
    const boss = bossIn(state);
    const d = boss?.kind === 'dragon' ? boss : null;
    // The Dragon's dive: its shadow on you, growing as its tell runs; dark and full-sized as it falls.
    const telling = !!d && d.phase === 'windup' && d.move === DIVE;
    const falling = !!d && d.phase === 'dive' && d.move === DIVE;
    this.landing.visible = this.shadow.visible = telling || falling;
    if (d && (telling || falling)) {
      const k = falling ? 1 : Math.min(1, d.t / dragonWindup(d, DIVE));
      const r = DRAGON.v.diveRadius;
      this.shadow.position.set(d.aim.x, 0.05, d.aim.z);
      this.shadow.scale.setScalar(r * (0.3 + 0.7 * k));
      (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.55 * k;
      this.landing.position.set(d.aim.x, 0.07, d.aim.z);
      this.landing.scale.setScalar(r);
      (this.landing.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.7 * k;
    }
    // The quake rings: a band of light as far out as each has rolled, fading as it goes.
    for (let i = 0; i < state.quakes.length; i++) {
      const q = state.quakes[i];
      const fx = this.quakes[i];
      // (Update 0.3.29 — not Tidebreaker's: moon/tideFx.ts draws its own.)
      fx.band.visible = fx.floor.visible = q.alive && q.r > 0.1 && q.by !== 'tidebreaker';
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
