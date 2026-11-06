// Update 0.2.8 — the Velociraptor's moves seen (the sim's are sim/enemies/dino*.ts).
// Update 0.3.60 — by the Boss Design Bible: its Apex Hunt's dark, the haze closing in black to Dark sight, sky and all; its eyes, seen
// from anywhere: burning in phase 2, flashing in the dark; posed over its clips (raptorPose.ts). Its sandstorm and afterimages are gone.
import * as THREE from 'three';
import type { CombatState } from '../../sim/combat/state';
import { DARK_FADE, APEX_EYES, APEX_LUNGE, darkFor } from '../../sim/enemies/dinoApex';
import { APEX, hiddenDino } from '../../sim/enemies/dinoMoves';
import { Enemy, isLive } from '../../sim/enemies/enemy';
import { DINO } from '../../tuning/dino';
import { HALOS } from '../halos';
import { poseRaptor } from './raptorPose';

/** The dark's colour; from this near (m). */
const DARK = new THREE.Color(0x030405);
const DARK_NEAR = 0.5;
/** Its eyes: their size, and where they are from its head (shares of its height: forward, up, apart); how much bigger flashing. */
const EYE = 0.028;
const EYE_FWD = 0.12;
const EYE_UP = 0.05;
const EYE_APART = 0.07;
const FLASHING = 2.4;

export class RaptorFx {
  readonly group = new THREE.Group();
  private readonly eyes: THREE.Mesh[] = [];
  private readonly eyeGeo = new THREE.SphereGeometry(1, 10, 8);
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: 0xff7a18, fog: false, toneMapped: false });
  private readonly baseFog = new THREE.Color();
  private readonly baseSky = new THREE.Color();
  private dimmed = false;
  private readonly head = new THREE.Vector3();
  private time = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    for (let i = 0; i < 2; i++) {
      const eye = new THREE.Mesh(this.eyeGeo, this.eyeMat);
      eye.visible = false;
      eye.renderOrder = 5;
      this.eyes.push(eye);
      this.group.add(eye);
    }
  }

  /** `headOf`: its body's head bone (its eyes glow there); `rootOf`: its body, its clip applied this frame. */
  update(state: CombatState, _alpha: number, dt: number, headOf: (slot: number) => THREE.Object3D | null, rootOf: (slot: number) => THREE.Object3D | null = () => null) {
    this.time += dt;
    const slot = state.enemies.findIndex((e) => e.kind === 'dino' && isLive(e));
    const d = slot >= 0 ? state.enemies[slot] : null;
    const root = d ? rootOf(slot) : null;
    if (d && root && root.visible) poseRaptor(root, d, this.time);
    this.eyesOf(d, slot, headOf);
  }

  /** Its eyes: phase 2's embers, and its flash in the dark. */
  private eyesOf(d: Enemy | null, slot: number, headOf: (slot: number) => THREE.Object3D | null) {
    const flashing = !!d && d.phase === 'blast' && d.move === APEX && (d.shots === APEX_EYES || d.shots === APEX_LUNGE);
    const show = !!d && !hiddenDino(d) && (d.stage > 0 || d.phase === 'intro');
    const head = d && show ? headOf(slot) : null;
    for (const e of this.eyes) e.visible = !!head;
    if (!head || !d) return;
    head.getWorldPosition(this.head);
    const h = DINO.v.dinoHeight;
    const fx = -Math.sin(d.facing);
    const fz = -Math.cos(d.facing);
    const size = EYE * h * (flashing ? FLASHING * (0.8 + 0.2 * Math.sin(this.time * 40)) : 1);
    for (let i = 0; i < 2; i++) {
      const side = (i === 0 ? -1 : 1) * EYE_APART * h;
      const e = this.eyes[i];
      e.position.set(this.head.x + fx * EYE_FWD * h - fz * side, this.head.y + EYE_UP * h, this.head.z + fz * EYE_FWD * h + fx * side);
      e.scale.setScalar(size);
      if (flashing) HALOS.add(e.position.x, e.position.y, e.position.z, 3, 0xff8a30, 0.9);
    }
  }

  /** Its dark over the world (after the dungeon has set its own haze this frame). */
  sky(scene: THREE.Scene, state: CombatState) {
    const fog = scene.fog;
    const bg = scene.background;
    if (!(fog instanceof THREE.Fog) || !(bg instanceof THREE.Color)) return;
    const k = darkK(state.storm);
    if (k <= 0) {
      if (this.dimmed) {
        fog.color.copy(this.baseFog);
        bg.copy(this.baseSky);
        this.dimmed = false;
      }
      this.baseFog.copy(fog.color);
      this.baseSky.copy(bg);
      return;
    }
    this.dimmed = true;
    fog.near += (DARK_NEAR - fog.near) * k;
    fog.far += (DINO.v.stormSight - fog.far) * k;
    fog.color.copy(this.baseFog).lerp(DARK, k);
    bg.copy(this.baseSky).lerp(DARK, k);
  }

  dispose() {
    this.group.removeFromParent();
    this.eyeGeo.dispose();
    this.eyeMat.dispose();
  }
}

/** How dark it is (0..1): in over its first moment, out over its last. */
export function darkK(left: number): number {
  if (left <= 0) return 0;
  return Math.min(1, left / DARK_FADE, Math.max(0, darkFor() - left) / DARK_FADE);
}
