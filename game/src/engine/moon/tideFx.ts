// Update 0.3.29 — what the Moon's boss, Tidebreaker, shows besides its body (sim/enemies/tidebreaker.ts): its shell
// spinning as it rolled (gone in 0.3.30), its anchor set aside while a
// pillar is in its hands (pillarEvents.ts draws the pillar there), the boulder in its hand from when it rips it up to
// when it throws it (boss/bombView.ts draws it flying), where its leap will land (a ring as wide as its landing's
// reach, closing in as it comes down) and the reach of a blow it's winding up in front of it (a fan: its smash, its
// finisher, its pillar's swing). Made in code. Run after the enemies are posed (combatScene.ts).
// Update 0.3.30 (the designer, having seen it) — no anchor to set aside (it has none now), no shell roll ("remove the
// spinning attack"); no fan before its pillar's swing (it throws it next: "remove those"); its impacts and shockwaves
// its own (tideImpact.ts).
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { COMBO_D, HURL, SMASH, THROW, tideWindup } from '../../sim/enemies/tidebreaker';
import { TIDEBREAKER } from '../../tuning/tidebreaker';
import { BOULDER, MOON_ROCK } from '../boss/bombView';
import { TideImpacts } from './tideImpact';

/** Ripping a boulder, it's in its hand from this share of the rip on; a blow's fan, either side of where it faces (rad:
 *  the sim's arc). */
const IN_HAND = 0.48;
const FAN_HALF = 1.05;

const glow = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 });

export class TideFx {
  readonly group = new THREE.Group();
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1, 56).rotateX(-Math.PI / 2);
  private readonly ringMat = glow(0xff6a3a);
  private readonly ring = new THREE.Mesh(this.ringGeo, this.ringMat);
  private readonly fanMat = glow(0xff7a40);
  private readonly fanGeo = new THREE.CircleGeometry(1, 32, -FAN_HALF, FAN_HALF * 2).rotateX(-Math.PI / 2);
  private readonly fan = new THREE.Mesh(this.fanGeo, this.fanMat);
  private readonly rockGeo = new THREE.IcosahedronGeometry(BOULDER, 1);
  private readonly rockMat = new THREE.MeshStandardMaterial({ color: MOON_ROCK, roughness: 1, flatShading: true });
  private readonly rock = new THREE.Mesh(this.rockGeo, this.rockMat);
  private readonly impacts = new TideImpacts();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.ring.visible = this.fan.visible = this.rock.visible = false;
    this.rock.castShadow = true;
    this.group.add(this.ring, this.fan, this.rock, this.impacts.group);
  }

  update(state: CombatState, rootOf: (i: number) => THREE.Object3D | null, dt: number) {
    this.ring.visible = this.fan.visible = this.rock.visible = false;
    this.impacts.update(state, dt);
    const v = TIDEBREAKER.v;
    state.enemies.forEach((e, i) => {
      if (!e.alive || e.kind !== 'tidebreaker') return;
      const root = rootOf(i);
      if (!root) return;
      // The boulder in its hand, ripped up till thrown.
      const windup = tideWindup(e.move);
      const holding = e.phase === 'windup' && e.deeds === 0 && ((e.move === THROW && e.t >= windup * IN_HAND) || e.move === HURL);
      const hand = holding ? root.getObjectByName('hand_r') : null;
      if (hand) {
        hand.updateWorldMatrix(true, false);
        this.rock.position.setFromMatrixPosition(hand.matrixWorld);
        this.rock.rotation.set(e.t * 0.7, e.t * 0.4, 0);
        this.rock.visible = true;
      }
      // Where its leap will land.
      if (e.phase === 'leap') {
        const k = Math.min(1, e.t / v.leapTime);
        this.ring.visible = true;
        this.ring.position.set(e.aim.x, e.aim.y + 0.06, e.aim.z);
        this.ring.scale.setScalar(v.landReach * (1.6 - 0.6 * k));
        this.ringMat.opacity = 0.3 + 0.6 * k;
      }
      // A blow's reach in front of it, brighter as it comes.
      const fanned = e.phase === 'windup' && (e.move === SMASH || e.move === COMBO_D);
      if (fanned) {
        const reach = v.smashReach;
        this.fan.visible = true;
        this.fan.position.set(e.pos.x, e.pos.y + 0.07, e.pos.z);
        this.fan.rotation.y = e.facing + Math.PI / 2;
        this.fan.scale.setScalar(reach + 1.6);
        this.fanMat.opacity = 0.12 + 0.45 * Math.min(1, e.t / Math.max(0.1, windup));
      }
    });
  }

  dispose() {
    this.group.removeFromParent();
    this.ringGeo.dispose();
    this.ringMat.dispose();
    this.fanGeo.dispose();
    this.fanMat.dispose();
    this.rockGeo.dispose();
    this.rockMat.dispose();
    this.impacts.dispose();
  }
}
