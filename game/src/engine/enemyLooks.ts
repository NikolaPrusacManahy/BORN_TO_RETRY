// Update 0.1.19 (out of enemiesView.ts, which had reached its size) — each kind's look (its model, its clips by role,
// when its blow lands, its wind-up's glow) and the role a phase plays. Floor 3's: the Skeleton, the Mushnub, the Ninja;
// a Skeleton rebuilding rises (its own clip, `rise`), after lying in pieces (its death, held).
// Update 0.2.3 — the Bone King: the Skeleton's model, massive; holding you, and charging its blast, it stands.
// Update 0.2.4 — floor 4's: the Tribal (the Orc's rig: its spear throw is the Weapon swing), the Cactoro (the Mushnub's
// rig), the big Cactoro and the Dino (the Orc's rig), the Hywirl (the Ghost's); under the sand, nothing shows.
// Update 0.2.10 — floor 5's: the blobs (the Snapper, the Urchin, the Jelly, the Spawnling: Bite_Front 7/30), the fliers
// (the Glubs' spit is a Punch, 6/30 and 9/30; the Squidle's dive a Headbutt, 7/30), the mini bosses (the big rig's
// Weapon, 15/30); under the water, nothing shows (the Snapper's fin is drownedFx.ts's).
import { bratWindup } from '../sim/enemies/dragonling';
import { rabbitWindup } from '../sim/enemies/rabbit';
import { mushWindup } from '../sim/enemies/bigMushnub';
import type { EnemyPhase } from '../sim/enemies/enemy';
import type { EnemyKind } from '../sim/enemies/kinds';
import { blueWindup } from '../sim/enemies/blueDemon';
import { ENEMIES } from '../tuning/enemies';
import { FOES } from '../tuning/foes';
import { FOES2 } from '../tuning/foes2';
import { FOES3 } from '../tuning/foes3';
import { BONE_KING } from '../tuning/boneKing';
import { FOES4 } from '../tuning/foes4';
import { windupOf as bigWindup } from '../sim/enemies/cactoroBig';
import { dinoWindup } from '../sim/enemies/dino';
import { orcWindup } from '../sim/enemies/skullOrc';
import { FOES5 } from '../tuning/foes5';
import { deepWindup } from '../sim/enemies/deepOne';
import { bogWindup } from '../sim/enemies/bogBrute';
import { drownedWindup } from '../sim/enemies/drownedKing';
import { FOES6 } from '../tuning/foes6';
import { FOES6B } from '../tuning/foes6b';
import { mantaWindup } from '../sim/enemies/manta';
import { whaleWindup } from '../sim/enemies/whale';

export type Role = 'idle' | 'move' | 'attack' | 'hit' | 'death' | 'air' | 'rise';
export const ROLES: Role[] = ['idle', 'move', 'attack', 'hit', 'death', 'air', 'rise'];
export const ONCE: Role[] = ['attack', 'hit', 'death', 'rise'];
/** Cross-fade between clips (s). */
export const FADE = 0.12;

export interface Look {
  url: string;
  clips: Record<Exclude<Role, 'rise'>, string> & { rise?: string };
  /** Seconds into its attack clip when the blow lands (export_monster.py measured it), and the wind-up it fits. */
  lands: number;
  /** `move`: the move it winds up (Enemy.move). */
  windup: (move: number) => number;
  /** The wind-up's glow (r, g, b at full). */
  glow: [number, number, number];
  /** Update 0.0.18 — a model that doesn't face +z: its turn (rad). */
  turn?: number;
  /** Update 0.0.19 — measured from its skinned body (the newer pack's meshes are stored turned). */
  posed?: boolean;
}

/** Update 0.0.18 — a newer-pack monster's clips (`<Name>_Idle`, …); `move` and `air` name their own. */
/** Update 0.2.10 — the blobs', the fliers' and the big rig's clips. */
const BLOB = { idle: 'Idle', move: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death', air: 'Jump' };
const FLIER = { idle: 'Flying_Idle', move: 'Fast_Flying', attack: 'Punch', hit: 'HitReact', death: 'Death', air: 'Fast_Flying' };
const BIG = { idle: 'Idle', move: 'Walk', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' };
/** Update 0.2.11 — floor 6's fish have one clip, their swim: everything is it (their wind-ups beat it faster; the rest
 *  is turned in code: fishPose.ts). */
const swimming = (clip: string) => ({ idle: clip, move: clip, attack: clip, hit: clip, death: clip, air: clip });
const SWIM = swimming('Swim');

const newer = (name: string, move: string, air: string): Record<Exclude<Role, 'rise'>, string> => ({
  idle: `${name}_Idle`,
  move: `${name}_${move}`,
  attack: `${name}_Attack`,
  hit: `${name}_Idle`,
  death: `${name}_Death`,
  air: `${name}_${air}`,
});

export const LOOKS: Record<EnemyKind, Look | null> = {
  grunt: { url: '/models/enemies/orc.glb', clips: { idle: 'Idle', move: 'Run', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Run' }, lands: 16 / 30, windup: () => ENEMIES.v.gruntWindup, glow: [0.9, 0.06, 0.04] },
  spitter: { url: '/models/enemies/wizard.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death', air: 'Walk' }, lands: 7 / 30, windup: () => ENEMIES.v.spitterWindup, glow: [0.35, 0.9, 0.1] },
  brute: { url: '/models/enemies/yeti.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Walk' }, lands: 15 / 30, windup: () => ENEMIES.v.bruteWindup, glow: [1, 0.25, 0.05] },
  // Update 0.0.13 — the Leaper crouches (Duck: deepest as the leap goes) and flies (Jump_Idle); the Stinger rears for a
  // headbutt and dives (Fast_Flying); the Wraith casts with a punch. export_monster.py timed the frames.
  leaper: { url: '/models/enemies/ninja.glb', clips: { idle: 'Idle', move: 'Run', attack: 'Duck', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 44 / 30, windup: () => FOES.v.leaperWindup, glow: [0.65, 0.2, 1] },
  stinger: { url: '/models/enemies/armabee.glb', clips: { idle: 'Flying_Idle', move: 'Fast_Flying', attack: 'Headbutt', hit: 'HitReact', death: 'Death', air: 'Fast_Flying' }, lands: 9 / 30, windup: () => FOES.v.stingerWindup, glow: [1, 0.15, 0.05] },
  wraith: { url: '/models/enemies/ghost.glb', clips: { idle: 'Flying_Idle', move: 'Flying_Idle', attack: 'Punch', hit: 'HitReact', death: 'Death', air: 'Flying_Idle' }, lands: 12 / 30, windup: () => FOES.v.wraithWindup, glow: [0.7, 0.85, 1] },
  demon: null,
  dragon: null,
  // Update 0.0.18 — floor 2's (export_monster.py timed the frames, 24 fps; the Slime's whole clip fills its fuse).
  slime: { url: '/models/enemies/slime.glb', clips: newer('Slime', 'Walk', 'Walk'), lands: 15 / 24, windup: () => FOES2.v.slimeFuse, glow: [0.35, 1, 0.1], posed: true },
  frog: { url: '/models/enemies/frog.glb', clips: newer('Frog', 'Jump', 'Jump'), lands: 11 / 24, windup: () => FOES2.v.frogWindup, glow: [1, 0.75, 0.1], posed: true },
  snake: { url: '/models/enemies/snake.glb', clips: newer('Snake', 'Walk', 'Jump'), lands: 9 / 24, windup: () => FOES2.v.snakeWindup, glow: [0.4, 1, 0.15], posed: true },
  wasp: { url: '/models/enemies/wasp.glb', clips: { ...newer('Wasp', 'Flying', 'Flying'), idle: 'Wasp_Flying', hit: 'Wasp_Flying' }, lands: 11 / 24, windup: () => FOES2.v.waspWindup, glow: [0.5, 1, 0.1], turn: -Math.PI / 2, posed: true },
  spider: { url: '/models/enemies/spider.glb', clips: newer('Spider', 'Walk', 'Jump'), lands: 10 / 24, windup: () => FOES2.v.spiderWindup, glow: [1, 0.1, 0.1], posed: true },
  // Update 0.1.19 — floor 3's: the Skeleton (its swing lands at 18/30; rebuilding plays Skeleton_Spawn, from its
  // pieces to standing); the Mushnub bites (8/30); the Ninja is the Leaper's model, bigger, with its sword (Weapon,
  // 20/30).
  skeleton: { url: '/models/enemies/skeleton.glb', clips: { ...newer('Skeleton', 'Running', 'Running'), rise: 'Skeleton_Spawn' }, lands: 18 / 30, windup: () => FOES3.v.skeletonWindup, glow: [0.85, 0.9, 1], posed: true },
  mushnub: { url: '/models/enemies/mushnub.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death', air: 'Jump' }, lands: 8 / 30, windup: () => FOES3.v.mushnubWindup, glow: [0.2, 0.8, 1] },
  boneKing: { url: '/models/enemies/skeleton.glb', clips: { ...newer('Skeleton', 'Running', 'Running'), rise: 'Skeleton_Spawn' }, lands: 18 / 30, windup: (move) => [BONE_KING.v.throwWindup, BONE_KING.v.smashWindup, BONE_KING.v.grabWindup, 1.2][move] ?? 1, glow: [0.55, 0.85, 1], posed: true },
  tribal: { url: '/models/enemies/tribal.glb', clips: { idle: 'Idle', move: 'Run', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 15 / 30, windup: () => FOES4.v.tribalWindup, glow: [1, 0.45, 0.1] },
  cactoro: { url: '/models/enemies/cactoro.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death', air: 'Jump' }, lands: 8 / 30, windup: () => FOES4.v.cactoroRise, glow: [0.5, 1, 0.2] },
  cactoroBig: { url: '/models/enemies/cactoro_big.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 15 / 30, windup: bigWindup, glow: [1, 0.6, 0.1] },
  hywirl: { url: '/models/enemies/hywirl.glb', clips: { idle: 'Flying_Idle', move: 'Flying_Idle', attack: 'Headbutt', hit: 'HitReact', death: 'Death', air: 'Fast_Flying' }, lands: 9 / 30, windup: () => FOES4.v.hywirlWindup, glow: [0.85, 0.4, 1] },
  // (The Dino: the Dino's model, small; crouching to pounce it ducks.)
  dinoBlob: { url: '/models/enemies/dino.glb', clips: { idle: 'Idle', move: 'Run', attack: 'Duck', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 44 / 30, windup: () => FOES4.v.dinoBlobWindup, glow: [1, 0.35, 0.6] },
  // Update 0.2.4 — the third list: the Lizard (the big Frog), the Green Blob and its Bloblings, the Flying Tribal, the
  // Skull Orc; the boss is the Velociraptor (its own clips; its id stays 'dino').
  lizard: { url: '/models/enemies/lizard.glb', clips: { idle: 'Idle', move: 'Run', attack: 'Punch', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 12 / 30, windup: () => FOES4.v.lizardWindup, glow: [0.6, 1, 0.2] },
  greenBlob: { url: '/models/enemies/green_blob.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death', air: 'Jump' }, lands: 8 / 30, windup: () => FOES4.v.blobWindup, glow: [0.4, 1, 0.3] },
  blobling: { url: '/models/enemies/green_blob.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death', air: 'Jump' }, lands: 8 / 30, windup: () => FOES4.v.blobWindup * 0.7, glow: [0.4, 1, 0.3] },
  maskTribal: { url: '/models/enemies/tribal_mask.glb', clips: { idle: 'Flying_Idle', move: 'Flying_Idle', attack: 'Punch', hit: 'HitReact', death: 'Death', air: 'Fast_Flying' }, lands: 12 / 30, windup: () => FOES4.v.wardWindup, glow: [1, 0.85, 0.2] },
  skullOrc: { url: '/models/enemies/skull_orc.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 15 / 30, windup: orcWindup, glow: [1, 0.2, 0.1] },
  // Update 0.2.7 — floor 3's newcomers: the Dragonling (Dragon_Evolved), the Skull Wraith (Ghost_Skull, the Wraith's
  // clips), the White Rabbit (Bunny: its carrot swing is its attack), the Big Mushnub (MushroomKing).
  dragonling: { url: '/models/enemies/dragonling.glb', clips: { idle: 'Flying_Idle', move: 'Fast_Flying', attack: 'Headbutt', hit: 'HitReact', death: 'Death', air: 'Fast_Flying' }, lands: 9 / 30, windup: bratWindup, glow: [1, 0.45, 0.08] },
  skullWraith: { url: '/models/enemies/skull_wraith.glb', clips: { idle: 'Flying_Idle', move: 'Flying_Idle', attack: 'Punch', hit: 'HitReact', death: 'Death', air: 'Flying_Idle' }, lands: 12 / 30, windup: () => FOES.v.wraithWindup, glow: [0.95, 0.9, 0.7] },
  rabbit: { url: '/models/enemies/rabbit.glb', clips: { idle: 'Idle', move: 'Run', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 15 / 30, windup: rabbitWindup, glow: [1, 0.6, 0.2] },
  bigMushnub: { url: '/models/enemies/mushroom_king.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 15 / 30, windup: mushWindup, glow: [0.3, 0.75, 1] },
  dino: { url: '/models/enemies/velociraptor.glb', clips: { idle: 'Velociraptor_Idle', move: 'Velociraptor_Run', attack: 'Velociraptor_Attack', hit: 'Velociraptor_Idle', death: 'Velociraptor_Death', air: 'Velociraptor_Jump' }, lands: 10 / 24, windup: dinoWindup, glow: [1, 0.3, 0.08], posed: true },
  ninja: { url: '/models/enemies/ninja.glb', clips: { idle: 'Idle', move: 'Run', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' }, lands: 20 / 30, windup: () => FOES3.v.ninjaWindup, glow: [1, 0.1, 0.35] },
  // Update 0.2.10 — floor 5's.
  snapper: { url: '/models/enemies/snapper.glb', clips: BLOB, lands: 7 / 30, windup: (move) => (move === 1 ? FOES5.v.snapperRise : FOES5.v.snapperWindup), glow: [0.3, 0.9, 1] },
  urchin: { url: '/models/enemies/urchin.glb', clips: BLOB, lands: 7 / 30, windup: () => FOES5.v.urchinWindup, glow: [1, 0.3, 0.2] },
  jelly: { url: '/models/enemies/jelly.glb', clips: BLOB, lands: 7 / 30, windup: () => FOES5.v.jellyGlow, glow: [1, 0.55, 0.95] },
  spawnling: { url: '/models/enemies/spawnling.glb', clips: BLOB, lands: 7 / 30, windup: () => FOES5.v.spawnWindup, glow: [0.75, 0.3, 1] },
  glub: { url: '/models/enemies/glub.glb', clips: FLIER, lands: 6 / 30, windup: () => FOES5.v.glubWindup, glow: [0.3, 0.8, 1] },
  bigGlub: { url: '/models/enemies/big_glub.glb', clips: FLIER, lands: 9 / 30, windup: () => FOES5.v.bubbleWindup, glow: [0.4, 0.95, 1] },
  squidle: { url: '/models/enemies/squidle.glb', clips: { ...FLIER, attack: 'Headbutt' }, lands: 7 / 30, windup: () => FOES5.v.squidleWindup, glow: [1, 0.3, 0.6] },
  deepOne: { url: '/models/enemies/deep_one.glb', clips: BIG, lands: 15 / 30, windup: deepWindup, glow: [0.7, 0.3, 1] },
  bogBrute: { url: '/models/enemies/bog_brute.glb', clips: BIG, lands: 15 / 30, windup: bogWindup, glow: [0.5, 1, 0.3] },
  // (Its boss: the Fish, huge, a crown on its head: tools/blender/export_monster.py --crown.)
  drownedKing: { url: '/models/enemies/drowned_king.glb', clips: BIG, lands: 15 / 30, windup: drownedWindup, glow: [0.3, 1, 0.85] },
  // Update 0.2.11 — floor 6's: the designer's fish (export_monster.py, their one clip), the Prince the King's model.
  clownfish: { url: '/models/enemies/clownfish.glb', clips: SWIM, lands: 0.6, windup: () => FOES6.v.clownWindup, glow: [1, 0.55, 0.2] },
  tuna: { url: '/models/enemies/tuna.glb', clips: SWIM, lands: 1.6, windup: () => FOES6.v.tunaWindup, glow: [0.6, 0.85, 1] },
  angelfish: { url: '/models/enemies/angelfish.glb', clips: swimming('Swim.001'), lands: 0.8, windup: () => FOES6.v.angelWindup, glow: [1, 0.9, 0.3] },
  dolphin: { url: '/models/enemies/dolphin.glb', clips: SWIM, lands: 1.2, windup: () => FOES6.v.dolphinWindup, glow: [0.5, 0.9, 1] },
  drownedPrince: { url: '/models/enemies/drowned_king.glb', clips: BIG, lands: 15 / 30, windup: () => FOES6.v.princeWindup, glow: [0.3, 1, 0.85] },
  mantaRay: { url: '/models/enemies/manta_ray.glb', clips: SWIM, lands: 1.5, windup: mantaWindup, glow: [0.6, 0.4, 1] },
  shark: { url: '/models/enemies/shark.glb', clips: SWIM, lands: 1, windup: () => FOES6B.v.sharkWindup, glow: [1, 0.2, 0.15] },
  whale: { url: '/models/enemies/whale.glb', clips: SWIM, lands: 2, windup: whaleWindup, glow: [0.4, 0.8, 1] },
  blueDemon: { url: '/models/enemies/bluedemon.glb', clips: { idle: 'Idle', move: 'Walk', attack: 'Punch', hit: 'HitReact', death: 'Death', air: 'Run' }, lands: 17 / 30, windup: blueWindup, glow: [0.2, 0.55, 1] },
};

/** The role a phase plays; once its attack is over, a recovering enemy stands. */
export function roleFor(phase: EnemyPhase, attackOver: boolean): Role {
  switch (phase) {
    case 'chase':
      return 'move';
    case 'windup':
      return 'attack';
    case 'recover':
      return attackOver ? 'idle' : 'attack';
    case 'flinch':
      return 'hit';
    case 'dead':
      return 'death';
    case 'leap':
    case 'dive':
      return 'air';
    // (The Demon's own phases: drawn by boss/demonView.ts.) Update 0.0.18 — the Blue Demon charges: it runs.
    case 'charge':
      return 'air';
    case 'breath':
      return 'attack';
    case 'sky':
      return 'air';
    case 'held':
      return 'move';
    case 'stun':
      return 'hit';
    case 'roar':
    case 'intro':
      return 'idle';
    // Update 0.1.19 — a Skeleton in pieces (enemiesView.ts: rising once it rebuilds).
    case 'rebuild':
      return 'death';
    // Update 0.2.3 — the Bone King holding you up to its face (standing: its arm reaching to you is kingView.ts's), and
    // charging its blast.
    case 'grab':
    case 'blast':
      return 'idle';
    // Update 0.2.4 — a Cactoro under the sand (not drawn).
    case 'burrow':
      return 'idle';
  }
}

/** The clip name a look plays for `role` (one with no rise of its own stands). */
export const clipOf = (look: Look, role: Role) => (role === 'rise' ? (look.clips.rise ?? look.clips.idle) : look.clips[role]);
