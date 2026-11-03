// Update 0.3.35 — Yokai : Okami's moves as you see them (sim/enemies/okamiMoves.ts, okamiDevastation.ts): a ring on the
// floor where each of its leaps will come down, closing in as it does; its blue fireball swelling between its claws (its
// flight: boss/bombView.ts); its fire dash's line across the floor, pulsing as it comes, then bursting into flame behind
// it; its roar of fire's wave rolling out over the floor in its cone, a front of flame; its devastation's ring of fire
// growing out from it toward the walls, the fire it gathers over its head swelling with it (brighter, pulsing, once
// the ring's full), and its massive fireball coming down. Made in code; drawn from the fight's state each frame.
// (Its fire drawn over what's behind it, not added: the sky and the pale floor turned it white. Its fireballs real
// fire, turning and licking: fireBall.ts.)
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { arenaOf, okamiRing } from '../../sim/enemies/okamiDevastation';
import { BREATH, CLIPS, DASH, DEVASTATE, FIREBALL, LEAPS } from '../../sim/enemies/okamiShared';
import { OKAMI } from '../../tuning/okami';
import { auraTexture } from '../keyLooks';
import { FireBall } from './fireBall';

/** The dash line's width (m); flames along it, along the roar's front, round the ring; its blue fireball's size at its
 *  fullest (m), its gathered fire's; its massive fireball's (m). */
const LINE_WIDE = 2.4;
const LINE_FLAMES = 14;
const FRONT_FLAMES = 10;
const RING_FLAMES = 28;
const BLUE = 1.4;
const GATHER = 6;
const SUN = 7;

const glow = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, toneMapped: false });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

const a = new THREE.Vector3();
const b = new THREE.Vector3();
const mid = new THREE.Vector3();

export class OkamiMovesFx {
  readonly group = new THREE.Group();
  private readonly stuff: { dispose(): void }[] = [];
  private readonly ring: THREE.Mesh;
  private readonly line: THREE.Mesh;
  private readonly fan: THREE.Mesh;
  private readonly fireRing: THREE.Mesh;
  private readonly blue: THREE.Sprite;
  private readonly gather = new FireBall(3);
  private readonly sun = new FireBall(11);
  private readonly flames: THREE.Sprite[] = [];
  private time = 0;

  constructor() {
    const ringGeo = new THREE.RingGeometry(0.9, 1, 56).rotateX(-Math.PI / 2);
    const strip = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
    const fanGeo = new THREE.CircleGeometry(1, 40, Math.PI / 2 - 1, 2).rotateX(-Math.PI / 2);
    const wideRing = new THREE.RingGeometry(0.94, 1, 96).rotateX(-Math.PI / 2);
    this.stuff.push(ringGeo, strip, fanGeo, wideRing, this.gather, this.sun);
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => {
      const o = new THREE.Mesh(g, m);
      o.visible = false;
      o.frustumCulled = false;
      if (m instanceof THREE.MeshBasicMaterial) this.stuff.push(m);
      this.group.add(o);
      return o;
    };
    const sprite = (color: number) => {
      const m = new THREE.SpriteMaterial({ map: auraTexture(), color, transparent: true, opacity: 0.9, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.visible = false;
      this.stuff.push(m);
      this.group.add(s);
      return s;
    };
    this.ring = mesh(ringGeo, glow(0xff6a3a));
    this.line = mesh(strip, glow(0xff3a14));
    this.fan = mesh(fanGeo, glow(0xff7a28));
    this.fireRing = mesh(wideRing, glow(0xff5a18));
    this.blue = sprite(0x5ab8ff);
    this.group.add(this.gather.group, this.sun.group);
    for (let i = 0; i < RING_FLAMES; i++) this.flames.push(sprite(0xff8a30));
  }

  update(state: CombatState, rootOf: (i: number) => THREE.Object3D | null, dt: number) {
    this.time += dt;
    for (const o of this.group.children) o.visible = false;
    let flame = 0;
    const lick = (x: number, y: number, z: number, size: number) => {
      if (flame >= this.flames.length) return;
      const f = this.flames[flame++];
      f.visible = true;
      const k = 0.7 + 0.3 * Math.sin(this.time * 17 + flame * 2.3);
      f.position.set(x, y + size * 0.45 * k, z);
      f.scale.set(size * 0.7, size * k, 1);
    };
    const v = OKAMI.v;
    state.enemies.forEach((e, i) => {
      if (!e.alive || e.kind !== 'okami' || e.phase === 'dead') return;
      // Where its leap will come down.
      if (e.move === LEAPS && e.phase === 'leap') {
        const k = Math.min(1, e.t / Math.max(0.1, v.leapTime));
        this.ring.visible = true;
        this.ring.position.set(e.aim.x, 0.06, e.aim.z);
        this.ring.scale.setScalar(v.leapReach * (1.6 - 0.6 * k));
        (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.6 * k;
      }
      // Its blue fireball, between its claws.
      if (e.move === FIREBALL && e.phase === 'windup') {
        const root = rootOf(i);
        const l = root?.getObjectByName('hand_l');
        const r = root?.getObjectByName('hand_r');
        if (l && r) {
          l.getWorldPosition(a);
          r.getWorldPosition(b);
          this.blue.visible = true;
          this.blue.position.copy(a).add(b).multiplyScalar(0.5);
          this.blue.scale.setScalar(BLUE * 2.4 * (0.25 + 0.75 * smooth(e.t / Math.max(0.1, v.fireballCharge))) * (0.9 + 0.1 * Math.sin(this.time * 30)));
        }
      }
      // Its dash's line: pulsing as it comes, then burning.
      if (e.move === DASH && (e.phase === 'windup' || e.phase === 'recover')) {
        const len = Math.hypot(e.aim.x - e.from.x, e.aim.z - e.from.z);
        const burning = e.phase === 'recover';
        if (!burning || e.t < v.burnFor) {
          this.line.visible = true;
          this.line.position.set(e.from.x, 0.07, e.from.z);
          this.line.rotation.set(0, Math.atan2(-(e.aim.x - e.from.x), -(e.aim.z - e.from.z)), 0);
          this.line.scale.set(LINE_WIDE, 1, Math.max(0.1, len));
          const k = burning ? 1 - e.t / v.burnFor : Math.min(1, e.t / Math.max(0.1, v.dashWarn));
          (this.line.material as THREE.MeshBasicMaterial).opacity = burning ? 0.7 * k : (0.25 + 0.5 * k) * (0.8 + 0.2 * Math.sin(this.time * 24));
          (this.line.material as THREE.MeshBasicMaterial).color.setHex(burning ? 0xff7a20 : 0xff2a10);
          if (burning) for (let j = 0; j < LINE_FLAMES; j++) {
            const u = (j + 0.5) / LINE_FLAMES;
            lick(e.from.x + (e.aim.x - e.from.x) * u, 0, e.from.z + (e.aim.z - e.from.z) * u, 2.2 * (0.5 + 0.5 * k));
          }
        }
      }
      // Its roar of fire's wave.
      if (e.move === BREATH && e.phase === 'windup') {
        const emit = CLIPS[BREATH].lands[0] * CLIPS[BREATH].len;
        const front = Math.min(v.breathReach, (e.t - emit) * v.breathSpeed);
        if (front > 0.5) {
          const fade = 1 - smooth((e.t - emit - v.breathReach / v.breathSpeed) / 0.5);
          const arc = (v.breathArc * Math.PI) / 180;
          this.fan.visible = fade > 0;
          this.fan.position.set(e.pos.x, 0.08, e.pos.z);
          // (Its sector, about −z as made, turned to where it faces; a radian either side, about its cone's.)
          this.fan.rotation.set(0, e.facing, 0);
          this.fan.scale.set(front, 1, front);
          (this.fan.material as THREE.MeshBasicMaterial).opacity = 0.45 * fade;
          for (let j = 0; j < FRONT_FLAMES && fade > 0; j++) {
            const ang = e.facing + Math.PI + (j / (FRONT_FLAMES - 1) - 0.5) * 2 * arc;
            lick(e.pos.x + Math.sin(ang) * front, 0, e.pos.z + Math.cos(ang) * front, 3.2 * fade);
          }
        }
      }
      // Its devastation: its ring of fire growing to the walls, the fire it gathers over its head.
      const full = okamiRing(e);
      if (e.move === DEVASTATE && full > 0) {
        const half = arenaOf(state.nav.large, mid);
        const r = Math.max(1, full * half);
        this.fireRing.visible = true;
        this.fireRing.position.set(e.pos.x, 0.09, e.pos.z);
        this.fireRing.scale.setScalar(r);
        (this.fireRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.35 * full;
        for (let j = flame; j < RING_FLAMES; j++) {
          const ang = (j / RING_FLAMES) * Math.PI * 2 + this.time * 0.4;
          lick(e.pos.x + Math.cos(ang) * r, 0, e.pos.z + Math.sin(ang) * r, 3 + 2 * full);
        }
        const size = 1 + (GATHER - 1) * full;
        this.gather.show(a.set(e.pos.x, e.pos.y + 9 + size / 2, e.pos.z), size, this.time, full >= 1 ? 1 : full * 0.4);
      }
    });
    // Its massive fireball, coming down.
    for (const bomb of state.bombs) {
      if (!bomb.alive || bomb.look !== 'sun') continue;
      this.sun.show(bomb.pos, SUN * 2, this.time * 1.6, 1);
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
