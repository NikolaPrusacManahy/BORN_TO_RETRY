// Update 0.3.64 — Hellwarden's show (at Tidebreaker's quality). Pure: where it is is a function of the show's time, so the views and the skip agree.
// Update 0.3.65 — the designer's shot list (MD_UPDATES/U0365_HELLWARDEN_FORGED.md: "make it memorable and spectacular"), about 20 s. The door slams
// and the torches die. Every bone in the room is dragged across the floor into a river of lava: it's built from your dead. A bare red figure rises
// out of it. The chains snap, the floating rocks crack, and the armor that was inside them clamps on, piece by piece: boots, gauntlets, chest, the
// pauldrons last. Its sword rises out of the lava, dull grey; it drags its claws along it and the heat follows them to the tip. A skull floats up
// out of the pile, growing horns, and is its face: a dark socket, and the eye ignites. Silence. It leaps at you and everything stops mid-air, its
// name and how many times you fell. Then it lands, the leap its first attack: you have the controls as it lands, and a ring on its way.
// Its views: engine/hell/wardenCinema.ts, throneView.ts, wardenForge.ts.
import { Vector3 } from 'three';
import { BOSS } from '../../tuning/boss';
import { HELLWARDEN } from '../../tuning/hellwarden';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { startQuake } from '../combat/quakes';
import type { CombatState } from '../combat/state';
import { setPhase, spawnEnemy } from '../enemies/enemy';
import type { PlayerState } from '../player/state';
import type { BossRun } from './bossRoom';

/** Where it is in its show (Enemy.move; Enemy.t counts from each). */
export const SHOW_UNDER = 20;
export const SHOW_RISE = 21;
export const SHOW_FORGE = 22;
export const SHOW_SWORD = 23;
export const SHOW_HEAT = 24;
export const SHOW_MASK = 25;
export const SHOW_CROUCH = 26;
export const SHOW_AIR = 27;
export const SHOW_SLAM = 28;
/** Its slam's follow-through, the fight already yours. */
export const LANDED = 29;

/** The armor, in the order it clamps on: boots, gauntlets, its hips and thighs, its chest, its pauldrons. */
export const CLAMPS = 5;
export const CLAMP_BOOTS = 0;
export const CLAMP_GAUNTLETS = 1;
export const CLAMP_HIPS = 2;
export const CLAMP_CHEST = 3;
export const CLAMP_PAULDRONS = 4;
/** How long a piece flies from its rock to it (s). */
export const FLIGHT = 0.42;

export interface WardenBeats {
  doorAt: number;
  torchFrom: number;
  torchTo: number;
  wallsFrom: number;
  wallsTo: number;
  riverFrom: number;
  riverTo: number;
  bonesFrom: number;
  bonesTo: number;
  riseFrom: number;
  riseTo: number;
  snapAt: number;
  /** Each piece of armor clamps on. */
  clamps: number[];
  swordFrom: number;
  swordAt: number;
  heatFrom: number;
  heatTo: number;
  skullFrom: number;
  skullAt: number;
  eyeAt: number;
  silentAt: number;
  crouchFrom: number;
  leapAt: number;
  freezeFrom: number;
  freezeTo: number;
  landAt: number;
  /** The fight: the moment it lands. */
  end: number;
}

const BEATS: WardenBeats = { doorAt: 0, torchFrom: 0, torchTo: 0, wallsFrom: 0, wallsTo: 0, riverFrom: 0, riverTo: 0, bonesFrom: 0, bonesTo: 0, riseFrom: 0, riseTo: 0, snapAt: 0, clamps: [0, 0, 0, 0, 0], swordFrom: 0, swordAt: 0, heatFrom: 0, heatTo: 0, skullFrom: 0, skullAt: 0, eyeAt: 0, silentAt: 0, crouchFrom: 0, leapAt: 0, freezeFrom: 0, freezeTo: 0, landAt: 0, end: 0 };
/** Each piece's clamp, as a share of the forging. */
const CLAMP_AT = [0.15, 0.33, 0.47, 0.58, 0.7];
/** The sword comes up over this share of the forging's end (s before the heat). */
const SWORD_RISE = 0.8;
/** It starts this far under the lava (m). How high it leaps (m). */
const UNDER = 7;
const LEAP_HIGH = 5;

export function wardenBeats(): WardenBeats {
  const v = HELLWARDEN.v;
  const b = BEATS;
  const k = v.showDoor / 2;
  b.doorAt = 0.45 * k;
  b.torchFrom = 0.7 * k;
  b.torchTo = 1.7 * k;
  b.wallsFrom = 1.6 * k;
  b.wallsTo = b.wallsFrom + 1.6;
  b.riverFrom = 1.85 * k;
  b.riverTo = b.riverFrom + 1;
  b.bonesFrom = v.showDoor;
  b.bonesTo = b.bonesFrom + v.showBones;
  b.riseFrom = b.bonesTo;
  b.riseTo = b.riseFrom + v.showRise;
  b.snapAt = b.riseTo;
  for (let i = 0; i < CLAMPS; i++) b.clamps[i] = b.snapAt + v.showForge * CLAMP_AT[i];
  b.heatFrom = b.snapAt + v.showForge + 0.4;
  b.swordAt = b.heatFrom - 0.1;
  b.swordFrom = b.swordAt - SWORD_RISE;
  b.heatTo = b.snapAt + v.showForge + v.showHeat;
  b.skullFrom = b.heatTo;
  b.skullAt = b.skullFrom + v.showMask * 0.55;
  b.eyeAt = b.skullFrom + v.showMask * 0.78;
  b.silentAt = b.eyeAt + 0.32;
  b.crouchFrom = b.skullFrom + v.showMask;
  b.leapAt = b.crouchFrom + v.showCrouch;
  b.freezeFrom = b.leapAt + v.showAir;
  b.freezeTo = b.freezeFrom + v.showFreeze;
  b.landAt = b.freezeTo + v.showFall;
  b.end = b.landAt;
  return b;
}

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** The show's time as what's in it sees it: stopped through the freeze frame. */
export function wardenViewT(t: number): number {
  const s = wardenBeats();
  return t < s.freezeFrom ? t : t < s.freezeTo ? s.freezeFrom : t - (s.freezeTo - s.freezeFrom);
}

/** How far its walls have gone back (0..1): in the dark, once the torches are out. */
export function wardenWalls(t: number): number {
  const s = wardenBeats();
  return smooth((t - s.wallsFrom) / Math.max(0.1, s.wallsTo - s.wallsFrom));
}

/** How far the river's opened (0..1): opening; narrowing to a crack as the mask comes on, out of sight of the shots that follow. */
export function riverOpen(t: number): number {
  const s = wardenBeats();
  return smooth((t - s.riverFrom) / Math.max(0.1, s.riverTo - s.riverFrom)) * (1 - 0.92 * smooth((t - s.skullAt) / 0.6));
}

/** How dark the room is (0..1.2: DungeonView's light; run.ts). The torches die; the lava's glow lifts it as it's forged, and it all comes back as it lands. */
export function wardenDark(b: BossRun): number {
  if (b.kind !== 'hellwarden' || !b.ownShow || b.beat !== 'intro') return 0;
  const s = wardenBeats();
  return 1.2 * smooth((b.t - s.torchFrom) / Math.max(0.1, s.torchTo - s.torchFrom)) * (1 - 0.35 * smooth((b.t - s.snapAt) / 2)) * (1 - smooth((b.t - (s.landAt - 0.06)) / 0.06));
}

/** How far the sky's drawn down (0..1: engine/hell/hellSky.ts). The orange sky would swallow its tan mask and red body: dark through its show, and
 *  (the designer's call for its silhouette) still down through the fight. The floor's own light isn't touched. */
export function wardenVeil(b: BossRun): number {
  if (b.kind !== 'hellwarden' || !b.ownShow) return 0;
  const v = HELLWARDEN.v;
  if (b.beat === 'fight') return v.fightSky;
  if (b.beat !== 'intro') return 0;
  const s = wardenBeats();
  const on = smooth((b.t - s.torchFrom) / Math.max(0.1, s.torchTo - s.torchFrom));
  return on + (v.fightSky - on) * smooth((b.t - (s.landAt - 0.06)) / 0.06);
}

/** How drained of colour the freeze frame is (0..1). */
export function wardenFreezeGrey(b: BossRun): number {
  if (b.kind !== 'hellwarden' || !b.ownShow || b.beat !== 'intro') return 0;
  const s = wardenBeats();
  return 0.85 * smooth((b.t - s.freezeFrom) / 0.05) * (1 - smooth((b.t - s.freezeTo) / 0.05));
}

/** The music's cut: as the eye ignites, till it lands. */
export function wardenSilent(b: BossRun): boolean {
  if (b.kind !== 'hellwarden' || !b.ownShow || b.beat !== 'intro') return false;
  const s = wardenBeats();
  return b.t >= s.silentAt && b.t < s.landAt;
}

/** How far through its leap (0..1, the freeze frame holding it), how high. */
export const leapShare = (t: number) => {
  const s = wardenBeats();
  const v = HELLWARDEN.v;
  const air = Math.max(0, Math.min(v.showAir, t - s.leapAt)) + Math.max(0, Math.min(v.showFall, t - s.freezeTo));
  return air / Math.max(0.05, v.showAir + v.showFall);
};

/** Where it lands: `showLandGap` short of you (`d` from its middle to you). */
export const landShare = (d: number) => Math.max(0.2, (d - HELLWARDEN.v.showLandGap) / Math.max(0.1, d));

/** Where it is, `t` s into its show (feet); (x, z) its middle; (toX, toZ): the way to you; `d`: how far you are. */
export function wardenAt(x: number, z: number, t: number, toX: number, toZ: number, d: number, out: Vector3): Vector3 {
  const s = wardenBeats();
  const rise = (t - s.riseFrom) / Math.max(0.1, s.riseTo - s.riseFrom);
  if (t < s.leapAt) {
    // Slowly up out of the lava, slower still as it clears it.
    const y = -UNDER * (1 - smooth(rise) ** 0.85);
    return out.set(x, y, z);
  }
  const k = leapShare(t);
  const far = d * landShare(d) * k;
  return out.set(x + toX * far, LEAP_HIGH * 4 * k * (1 - k), z + toZ * far);
}

/** The skull flying from its pile to its neck, as a share of the way (0..1). */
export const skullShare = (t: number) => {
  const s = wardenBeats();
  return smooth((t - s.skullFrom) / Math.max(0.1, s.skullAt - s.skullFrom));
};

/** How far the heat's come along its blade (0..1). */
export const heatShare = (t: number) => {
  const s = wardenBeats();
  return Math.max(0, Math.min(1, (t - s.heatFrom) / Math.max(0.1, s.heatTo - 0.15 - s.heatFrom)));
};

/** Through the heat, as shares of its height (`k`: 0..1, hilt to tip): its right hand toward you, and to its right; how high. And how far along its sword
 *  its claws are (a share of its length). engine/hell/wardenPose.ts and wardenCinema.ts share them. */
export const heatForward = (k: number) => 0.24 - 0.11 * k;
export const heatRightShare = (k: number) => 0.02 + 0.4 * k;
export const HEAT_UP = 0.62;
export const clawsShare = (k: number) => 0.2 + 0.72 * k;

const spot = new Vector3();

function nextStage(boss: { move: number; t: number }, move: number) {
  boss.move = move;
  boss.t = 0;
}

/** One tick of its show (bossRoom.ts's 'intro', for Hellwarden); done, the fight. `dt`: this tick's time. */
export function stepWardenIntro(b: BossRun, level: DungeonLevel, player: PlayerState, combat: CombatState, dt: number) {
  const s = wardenBeats();
  const v = HELLWARDEN.v;
  const ev = combat.events;
  const before = b.t - dt;
  const crossed = (t: number) => before < t && b.t >= t;
  const p = level.boss.portal;
  const d = Math.max(0.1, Math.hypot(player.pos.x - p.x, player.pos.z - p.z));
  const toX = (player.pos.x - p.x) / d;
  const toZ = (player.pos.z - p.z) / d;
  const yaw = Math.atan2(-toX, -toZ);
  if (b.slot < 0) {
    b.slot = spawnEnemy(combat.enemies, 'hellwarden', wardenAt(p.x, p.z, 0, toX, toZ, d, spot), yaw);
    if (b.slot >= 0) {
      const e = combat.enemies[b.slot];
      setPhase(e, 'intro');
      e.move = SHOW_UNDER;
    }
  }
  const boss = b.slot >= 0 ? combat.enemies[b.slot] : null;
  if (!boss) return;
  wardenAt(p.x, p.z, b.t, toX, toZ, d, boss.pos);
  boss.prev.copy(boss.pos);
  boss.facing = yaw;
  b.eyeYaw = yaw;
  if (boss.warden) boss.warden.showT = b.t;
  const h = v.height;
  if (crossed(s.doorAt)) ev.push('wardenDoor', b.slot, player.pos.x, 2, player.pos.z);
  if (crossed(s.torchFrom)) ev.push('wardenTorches', b.slot, player.pos.x, 2, player.pos.z);
  if (crossed(s.riverFrom)) ev.push('wardenRift', b.slot, p.x, 0.2, p.z);
  if (crossed(s.bonesFrom)) ev.push('wardenBones', b.slot, p.x, 0.2, p.z);
  if (crossed(s.riseFrom)) nextStage(boss, SHOW_RISE);
  // The lava surging as it comes up.
  if (b.t >= s.riseFrom && b.t < s.riseTo) {
    if (Math.floor(b.t - s.riseFrom) > Math.floor(before - s.riseFrom)) ev.push('wardenSurge', b.slot, p.x, 0.2, p.z);
  }
  if (crossed(s.riseFrom)) ev.push('wardenSurge', b.slot, p.x, 0.2, p.z);
  if (crossed(s.snapAt)) {
    nextStage(boss, SHOW_FORGE);
    ev.push('wardenSnap', b.slot, p.x, 12, p.z);
  }
  for (let i = 0; i < CLAMPS; i++) if (crossed(s.clamps[i])) ev.push('wardenClamp', i, p.x, h * [0.08, 0.62, 0.42, 0.62, 0.8][i], p.z);
  if (crossed(s.swordFrom)) {
    nextStage(boss, SHOW_SWORD);
    ev.push('wardenSwordRise', b.slot, p.x + toX * 4, 0.2, p.z + toZ * 4);
  }
  if (crossed(s.heatFrom)) {
    nextStage(boss, SHOW_HEAT);
    ev.push('wardenHeat', b.slot, p.x, h * 0.6, p.z);
  }
  if (crossed(s.skullFrom)) {
    nextStage(boss, SHOW_MASK);
    ev.push('wardenSkull', b.slot, p.x, 1, p.z);
  }
  if (crossed(s.skullAt)) ev.push('wardenMaskOn', b.slot, p.x, h * 0.85, p.z);
  if (crossed(s.eyeAt)) ev.push('wardenEye', b.slot, p.x, h * 0.85, p.z);
  if (crossed(s.silentAt)) ev.push('wardenHush', b.slot, p.x, h * 0.85, p.z);
  if (crossed(s.crouchFrom)) nextStage(boss, SHOW_CROUCH);
  if (crossed(s.leapAt)) {
    nextStage(boss, SHOW_AIR);
    ev.push('wardenLeap', b.slot, p.x, 0.5, p.z);
  }
  if (crossed(s.freezeFrom)) ev.push('wardenFreeze', b.slot, boss.pos.x, boss.pos.y + h * 0.5, boss.pos.z);
  if (crossed(s.freezeTo)) {
    nextStage(boss, SHOW_SLAM);
    ev.push('wardenThaw', b.slot, boss.pos.x, boss.pos.y + h * 0.5, boss.pos.z);
  }
  if (b.t < s.end) return;
  // It lands. The leap was its first attack: the ring's on its way to you, and the controls are yours.
  boss.pos.y = boss.prev.y = 0;
  ev.push('wardenLand', b.slot, boss.pos.x, 0.2, boss.pos.z);
  startQuake(combat.quakes, boss.pos.x, 0, boss.pos.z, v.showRing, 40, v.showLandDamage, BOSS.v.quakeClear, 'hellwarden');
  boss.move = LANDED;
  setPhase(boss, 'recover');
  b.beat = 'fight';
  b.t = 0;
}
