// Update 0.3.64 — Hellwarden's show as you see it (sim/dungeon/wardenShow.ts). Its shots stay clear of its columns. Pure maths on Three.js vectors.
// Update 0.3.65 — the designer's shot list. Round from your eyes to the door as it slams. The torches dying away down the room. High, the river opening
// in the dark and every bone in the room on the move; down low, as they go past you and in. Low and looking up as it rises, bare. The chains and
// rocks; then a cut on every clang: its boots, its gauntlet, its chest, the whole of it as its pauldrons hit. Its sword coming up out of the lava; the
// flat of it across the view, the heat following its claws. The skull rising, and close on its mask: a dark socket, the eye igniting. A hard cut:
// it crouches, it comes at you, and you back away from it in one long pull that ends in your own eyes as it lands, stopped mid-air on the way.
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { CLAMP_BOOTS, CLAMP_GAUNTLETS, CLAMP_HIPS, CLAMP_PAULDRONS, CLAMPS, clawsShare, HEAT_UP, heatForward, heatRightShare, heatShare, landShare, skullShare, wardenAt, wardenBeats, wardenViewT } from '../../sim/dungeon/wardenShow';
import { HELLWARDEN } from '../../tuning/hellwarden';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { Shot } from '../boss/cinema';
import { PILE } from './wardenSkull';

/** Its door's shot: how fast the view comes round. */
const TURN = 0.32;
/** Its torches: this far toward you from its middle (m), this high; pushing in this far; aimed this far in. */
const TORCH_AT: readonly [number, number] = [23, 4.2];
const TORCH_PUSH = 3;
const TORCH_LOOK = 8;
/** High over it: toward you, across, up. Coming in this far. */
const HIGH: readonly [number, number, number] = [24, 12, 26];
const HIGH_PUSH = 5;
/** Down among the bones: toward you, across, up; aimed where on the river. */
export const LOW_AT: readonly [number, number, number] = [8.5, 6.4, 0.75];
const LOW_LOOK = 2;
/** It rising: toward you (closing to the second), across, up. */
const RISE_AT: readonly [number, number, number, number] = [11.5, 8.6, 2.6, 0.95];
/** Up at the rocks: toward you, across, up; aimed this high. */
const UP_AT: readonly [number, number, number, number] = [16, -5, 1.4, 7.5];
/** The clangs: toward you, across, up; aimed here, up. */
const BOOTS_AT: readonly [number, number, number, number] = [5.4, -3.4, 0.95, 0.8];
const GAUNT_AT: readonly [number, number, number] = [4.6, -5.6, 3.9];
const CHEST_AT: readonly [number, number, number] = [5.4, 1.1, 2.4];
const HERO_AT: readonly [number, number, number, number] = [7.6, -1.2, 0.9, 3.6];
/** Its sword up out of the lava: toward you, across, up; how far out it comes. */
const SWORD_AT: readonly [number, number, number] = [10, -5.2, 0.8];
const SWORD_LOOK = 3;
/** The flat of its sword across the view: this far off it (m), across, a little under. Its sword's length (m on its 6 m). */
const HEAT_OFF = 3.6;
const HEAT_ACROSS = 0.1;
const SWORD_LONG = 4.9;
/** Following the skull: toward you, across, up. */
const SKULL_AT: readonly [number, number, number] = [7.6, 5.6, 1.5];
/** Its face (m on its 6 m, its stance as its mask comes on): toward you, up. Close on it: this far off, across (to its lit eye's side), under. */
export const FACE: readonly [number, number] = [0.57, 5.4];
const FACE_ACROSS = -0.38;
const MASK_AT: readonly [number, number, number] = [1.45, 0.38, 0.05];
/** Coming at you: this far toward you the view starts from its middle, this high; this far in front of your eyes as it stops. */
const BACK_FROM = 9.5;
const BACK_UP = 1.45;
const BACK_AT_FREEZE = 3.5;
const FREEZE_UP = 3;
/** As it hangs: aimed this far past it, so its name's side is clear (m). */
const FRAME_LEFT = 3.4;
const CLEAR = 1.6;

const shot = (): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const pulse = (age: number, life: number) => (age >= 0 && age < life ? (1 - age / life) ** 2 : 0);

const at = new THREE.Vector3();
const way = new THREE.Vector3();

/** How far its high shots push the haze out (0..1; the floor's view: dungeonView.ts). */
export function wardenWide(run: BossRun): number {
  if (run.kind !== 'hellwarden' || !run.ownShow || run.beat !== 'intro') return 0;
  const s = wardenBeats();
  return smooth((run.t - s.wallsFrom) / 0.5) * (1 - smooth((run.t - (s.landAt - 0.1)) / 0.1));
}

export class WardenCinema {
  private readonly from = shot();
  private readonly mid = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly toYou = new THREE.Vector3();
  private readonly aside = new THREE.Vector3();
  private dist = 27;
  private yaw0 = 0;
  private pitch0 = 0;
  endYaw = 0;
  endPitch = 0;

  constructor(private readonly level: DungeonLevel) {
    const e = level.boss.entrance;
    this.fwd.set(e === 'w' ? 1 : e === 'e' ? -1 : 0, 0, e === 'n' ? 1 : e === 's' ? -1 : 0);
    this.mid.set(level.boss.portal.x, 0, level.boss.portal.z);
  }

  start(eye: THREE.Vector3, look: THREE.Vector3) {
    this.from.pos.copy(eye);
    this.from.look.copy(eye).addScaledVector(look, 20);
    this.toYou.set(eye.x - this.mid.x, 0, eye.z - this.mid.z);
    this.dist = Math.max(0.1, this.toYou.length());
    this.toYou.normalize();
    this.aside.set(this.toYou.z, 0, -this.toYou.x);
    this.yaw0 = Math.atan2(-look.x, -look.z);
    this.pitch0 = Math.asin(Math.max(-1, Math.min(1, look.y)));
    // Facing where it lands, its middle in the view.
    const d = this.dist * (1 - landShare(this.dist));
    this.endYaw = Math.atan2(this.toYou.x, this.toYou.z);
    this.endPitch = Math.max(-0.4, Math.min(0.5, Math.atan2(HELLWARDEN.v.height * 0.5 - eye.y, d)));
  }

  intro(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = wardenBeats();
    const c = s.clamps;
    if (t < s.torchFrom + 0.25) return this.door(t, eye, out);
    if (t < s.bonesFrom) return this.torches(t, out);
    if (t < s.bonesFrom + (s.bonesTo - s.bonesFrom) * 0.5) return this.high(t, out);
    if (t < s.riseFrom) return this.low(out);
    if (t < s.snapAt) return this.rise(t, out);
    if (t < c[CLAMP_BOOTS] - 0.12) return this.up(out);
    if (t < c[CLAMP_GAUNTLETS] - 0.12) return this.boots(out);
    if (t < c[CLAMP_HIPS] - 0.12) return this.gauntlet(out);
    if (t < c[CLAMP_PAULDRONS] - 0.12) return this.chest(t, out);
    if (t < s.swordFrom) return this.hero(out);
    if (t < s.swordAt) return this.sword(out);
    if (t < s.skullFrom) return this.heat(t, out);
    if (t < s.skullAt) return this.skull(t, out);
    if (t < s.crouchFrom) return this.mask(t, out);
    return this.leap(t, eye, out);
  }

  /** Its name and how often you've fallen: while everything's stopped. */
  static named(t: number): boolean {
    const s = wardenBeats();
    return t >= s.freezeFrom + 0.02 && t < s.freezeTo + 0.02;
  }

  /** The place shaking: its door, the river opening, the lava surging, every clang, its leap. Nothing through the freeze frame. */
  shake(camera: THREE.Camera, t: number) {
    const s = wardenBeats();
    if (t >= s.freezeFrom && t < s.freezeTo) return;
    let amp = 1.1 * pulse(t - s.doorAt, 0.5);
    if (t >= s.riverFrom && t < s.riverTo + 0.3) amp += 0.32;
    if (t >= s.riseFrom && t < s.riseTo) amp += 0.09;
    amp += 0.55 * pulse(t - s.snapAt, 0.4);
    for (let i = 0; i < CLAMPS; i++) amp += (i === CLAMPS - 1 ? 1.2 : 0.6) * pulse(t - s.clamps[i], 0.3);
    amp += 0.3 * pulse(t - s.skullAt, 0.25);
    amp += 0.25 * pulse(t - s.eyeAt, 0.25);
    amp += 0.45 * pulse(t - s.leapAt, 0.3);
    if (amp <= 0) return;
    camera.position.x += amp * (Math.sin(t * 71) * 0.6 + Math.sin(t * 43) * 0.4) * 0.3;
    camera.position.y += amp * (Math.sin(t * 67 + 1) * 0.6 + Math.sin(t * 29) * 0.4) * 0.3;
    camera.position.z += amp * (Math.sin(t * 59 + 2) * 0.6 + Math.sin(t * 37) * 0.4) * 0.3;
    camera.rotateZ(amp * 0.025 * Math.sin(t * 53));
  }

  private place(pos: THREE.Vector3, toward: number, across: number, up: number): THREE.Vector3 {
    return pos.copy(this.mid).addScaledVector(this.toYou, toward).addScaledVector(this.aside, across).setY(up);
  }

  /** In your eyes, the view coming round to the door behind you. */
  private door(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const k = smooth(t / TURN);
    const yaw = this.yaw0 + Math.PI * k;
    const pitch = this.pitch0 + (0.16 - this.pitch0) * k;
    out.pos.copy(eye);
    out.look.set(eye.x - Math.sin(yaw) * Math.cos(pitch) * 20, eye.y + Math.sin(pitch) * 20, eye.z - Math.cos(yaw) * Math.cos(pitch) * 20);
    return out;
  }

  private torches(t: number, out: Shot): Shot {
    const s = wardenBeats();
    const k = smooth((t - s.torchFrom) / Math.max(0.1, s.bonesFrom - s.torchFrom));
    this.clear(this.place(out.pos, TORCH_AT[0] - TORCH_PUSH * k, 0.8, TORCH_AT[1]));
    this.place(out.look, TORCH_LOOK, 0, 2);
    return out;
  }

  private high(t: number, out: Shot): Shot {
    const s = wardenBeats();
    const k = smooth((t - s.bonesFrom) / Math.max(0.1, (s.bonesTo - s.bonesFrom) * 0.5));
    this.place(out.pos, HIGH[0] - HIGH_PUSH * k, HIGH[1], HIGH[2] - HIGH_PUSH * 0.5 * k);
    this.place(out.look, 2, 0, 0);
    return out;
  }

  private low(out: Shot): Shot {
    this.clear(this.place(out.pos, LOW_AT[0], LOW_AT[1], LOW_AT[2]));
    this.place(out.look, LOW_LOOK, -1, 0.9);
    return out;
  }

  private rise(t: number, out: Shot): Shot {
    const s = wardenBeats();
    const k = smooth((t - s.riseFrom) / Math.max(0.1, s.riseTo - s.riseFrom));
    this.clear(this.place(out.pos, RISE_AT[0] + (RISE_AT[1] - RISE_AT[0]) * k, RISE_AT[2], RISE_AT[3]));
    wardenAt(this.mid.x, this.mid.z, t, this.toYou.x, this.toYou.z, this.dist, at);
    out.look.copy(this.mid).setY(Math.max(1.4, at.y + HELLWARDEN.v.height * 0.72));
    return out;
  }

  private up(out: Shot): Shot {
    this.clear(this.place(out.pos, UP_AT[0], UP_AT[1], UP_AT[2]));
    out.look.copy(this.mid).setY(UP_AT[3]);
    return out;
  }

  private boots(out: Shot): Shot {
    this.clear(this.place(out.pos, BOOTS_AT[0], BOOTS_AT[1], BOOTS_AT[2]));
    out.look.copy(this.mid).setY(BOOTS_AT[3]);
    return out;
  }

  private gauntlet(out: Shot): Shot {
    this.clear(this.place(out.pos, GAUNT_AT[0], GAUNT_AT[1], GAUNT_AT[2]));
    this.place(out.look, 0.2, -2.3, 4.05);
    return out;
  }

  /** Up its body, from its hips as they go on to its chest. */
  private chest(t: number, out: Shot): Shot {
    const s = wardenBeats();
    const k = smooth((t - s.clamps[CLAMP_HIPS]) / Math.max(0.1, s.clamps[CLAMP_PAULDRONS] - s.clamps[CLAMP_HIPS]));
    this.clear(this.place(out.pos, CHEST_AT[0], CHEST_AT[1], CHEST_AT[2] + 1.1 * k));
    out.look.copy(this.mid).setY(2.9 + 1.5 * k);
    return out;
  }

  private hero(out: Shot): Shot {
    this.clear(this.place(out.pos, HERO_AT[0], HERO_AT[1], HERO_AT[2]));
    out.look.copy(this.mid).setY(HERO_AT[3]);
    return out;
  }

  private sword(out: Shot): Shot {
    this.clear(this.place(out.pos, SWORD_AT[0], SWORD_AT[1], SWORD_AT[2]));
    this.place(out.look, 2.8, 0, SWORD_LOOK);
    return out;
  }

  /** The flat of its blade across the view, following the heat. */
  private heat(t: number, out: Shot): Shot {
    const h = HELLWARDEN.v.height;
    const k = heatShare(t);
    // (Its right is your left.)
    const hand = -heatRightShare(k) * h;
    const claws = hand + clawsShare(k) * SWORD_LONG;
    const toward = heatForward(k) * h;
    const follow = (claws + hand * 0.3) * 0.65;
    this.place(out.pos, toward + HEAT_OFF, follow + HEAT_ACROSS, HEAT_UP * h - 0.1);
    this.place(out.look, toward, follow, HEAT_UP * h + 0.1);
    return out;
  }

  private skull(t: number, out: Shot): Shot {
    this.clear(this.place(out.pos, SKULL_AT[0], SKULL_AT[1], SKULL_AT[2]));
    const k = skullShare(t);
    this.place(out.look, PILE[0] + (FACE[0] - PILE[0]) * k, PILE[1] + (FACE_ACROSS - PILE[1]) * k, 0.8 + (FACE[1] - 0.8) * k);
    return out;
  }

  /** Close on its mask, creeping in. */
  private mask(t: number, out: Shot): Shot {
    const s = wardenBeats();
    const k = smooth((t - s.skullAt) / Math.max(0.1, s.crouchFrom - s.skullAt));
    this.place(out.pos, FACE[0] + MASK_AT[0] - 0.2 * k, FACE_ACROSS + MASK_AT[1], FACE[1] - MASK_AT[2]);
    this.place(out.look, FACE[0], FACE_ACROSS + 0.02, FACE[1] + 0.02);
    return out;
  }

  /** It crouches and comes at you, the view backing away from it into your eyes; aimed past it while it hangs, for its name. */
  private leap(t: number, eye: THREE.Vector3, out: Shot): Shot {
    const s = wardenBeats();
    const v = HELLWARDEN.v;
    const vt = wardenViewT(t);
    const span = s.freezeFrom - s.crouchFrom;
    const toFreeze = smooth((vt - s.crouchFrom) / span);
    const thawed = smooth((t - s.freezeTo) / v.showFall);
    wardenAt(this.mid.x, this.mid.z, t, this.toYou.x, this.toYou.z, this.dist, at);
    at.y += v.height * 0.62;
    // From close in on it, back to just short of your eyes; slammed the last of the way as it lands.
    way.copy(this.mid).addScaledVector(this.toYou, BACK_FROM).setY(BACK_UP);
    const atFreeze = new THREE.Vector3().copy(eye).addScaledVector(this.toYou, -BACK_AT_FREEZE).setY(FREEZE_UP);
    out.pos.lerpVectors(way, atFreeze, toFreeze).lerp(eye, thawed);
    const named = smooth((t - s.freezeFrom) / 0.12) * (1 - smooth((t - s.freezeTo) / 0.06));
    out.look.copy(at).addScaledVector(this.aside, FRAME_LEFT * named);
    // Its end: your eyes, turned to where it's landed.
    const end = smooth((t - (s.landAt - 0.1)) / 0.1);
    if (end > 0) {
      way.set(eye.x - Math.sin(this.endYaw) * Math.cos(this.endPitch) * 20, eye.y + Math.sin(this.endPitch) * 20, eye.z - Math.cos(this.endYaw) * Math.cos(this.endPitch) * 20);
      out.look.lerp(way, end);
    }
    return out;
  }

  private clear(pos: THREE.Vector3) {
    for (const c of this.level.arena.boxes) {
      if (c.kind === 'floor' || c.y + c.h / 2 <= 0.05) continue;
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const rx = c.w / 2 + CLEAR;
      const rz = c.d / 2 + CLEAR;
      if (Math.abs(dx) >= rx || Math.abs(dz) >= rz || pos.y > c.y + c.h / 2 + 0.5) continue;
      if (Math.abs(dx) / rx > Math.abs(dz) / rz) pos.x = c.x + Math.sign(dx || 1) * rx;
      else pos.z = c.z + Math.sign(dz || 1) * rz;
    }
    return pos;
  }
}
