// Update 0.5.4 — how floor 10's own fighters are drawn (enemyLooks.ts): the Bestiary pack's Imp, Puglin and two armoured skeletons, each with
// its weapon, the Universal Animation Library's clips baked on (tools/ual_bake.py), a clip for every move (sim/enemies/hellShared.ts) played as
// the sim runs it, as floor 8's fighters are (shrine/shrineLooks.ts): their stance between blows; jogging left, right and back as the Imps and
// Puglins circle you; the Imps' side-steps; each strike's own clip, through in its time (its blows land where its weapon reaches furthest:
// tools/foe-poses.ts), held a moment after; the skeletons standing their ground, the Bone Guard's guard up (its block's raised moment, still),
// its block before its riposte, its guard broken (it reels).
// Update 0.5.5 — the second batch, the Ultimate Monsters (tools/blender/export_monster.py, in Hell's colours: tools/hell_paint.py): the Cinder
// Chicken dancing frantic as its fuse burns; the Brimstone Bee rearing back to drop; the Pit Fiend's clips as the old Demon's view played them
// (head down to charge, running; a crouch, the leap, the landing; its trident's thrust; shaking its head stunned; arms flung wide to roar); the
// Spore Lord shaking out its spores, squatting into its hop, its bite.
import type { Look } from '../enemyLooks';
import { FOES_HELL_B } from '../../tuning/foesHellB';
import { fiendWindup } from '../../sim/enemies/pitFiend';
import { sporeWindup } from '../../sim/enemies/sporeLord';
import type { KindHell } from '../../sim/enemies/kindsHell';
import { BONE_AXEMAN } from '../../sim/enemies/boneAxeman';
import { BONE_GUARD } from '../../sim/enemies/boneGuard';
import { IMP } from '../../sim/enemies/imp';
import { PUGLIN } from '../../sim/enemies/puglin';
import { BEE_BOMB, BITE, BROKEN, CHOP, CLUB_A, CLUB_B, CUT, FIEND_CHARGE, FIEND_LEAP, FIEND_ROAR, FIEND_VOLLEY, FIREBALL, FUSE, GUARD, GUARD_COMBO, MACE_COMBO, PUFF, RIPOSTE, RUSH, SPIN, SPLIT_FLOOR, SPORE_SLAM, STAND, SWING_A, SWING_B } from '../../sim/enemies/hellShared';
import { BACK, STRAFE_L, STRAFE_R } from '../../sim/enemies/shrineShared';
import { BLOCKING, Clips, MOVING, strikes, windupOf } from '../shrine/shrineLooks';

/** Their clips by role (each one's attack its first blow). */
const SWORD = { idle: 'Sword_Idle', move: 'Jog_Fwd_Loop', attack: 'Sword_Regular_A', hit: 'Hit_Chest', death: 'Death01', air: 'Jog_Fwd_Loop' };
/** The Puglins circle you but never side-step a blow, nor dash in but by their rush. */
const CIRCLING: Clips = { [`chase:${STRAFE_L}`]: ['Jog_Left_Loop'], [`chase:${STRAFE_R}`]: ['Jog_Right_Loop'], [`chase:${BACK}`]: ['Jog_Bwd_Loop'] };

export const HELL_LOOKS: Record<KindHell, Look> = {
  imp: {
    url: '/models/enemies/imp.glb',
    clips: SWORD,
    lands: 0.25,
    windup: windupOf(IMP.pace),
    glow: [1, 0.45, 0.15],
    posed: true,
    moveClips: { ...MOVING, ...strikes({ [SWING_A]: 'Sword_Regular_A', [SWING_B]: 'Sword_Regular_B', [MACE_COMBO]: 'Sword_Regular_Combo', [FIREBALL]: 'Spell_Simple_Shoot' }) },
  },
  puglin: {
    url: '/models/enemies/puglin.glb',
    clips: { ...SWORD, attack: 'Sword_Light_A', death: 'Death02' },
    lands: 0.25,
    windup: windupOf(PUGLIN.pace),
    glow: [1, 0.6, 0.2],
    posed: true,
    moveClips: { ...CIRCLING, ...strikes({ [CLUB_A]: 'Sword_Light_A', [CLUB_B]: 'Sword_Light_B', [RUSH]: 'Sword_Dash' }) },
  },
  boneAxeman: {
    url: '/models/enemies/bone_axeman.glb',
    clips: { ...SWORD, move: 'Walk_Loop', attack: 'Sword_Heavy_A' },
    lands: 0.25,
    windup: windupOf(BONE_AXEMAN.pace),
    glow: [1, 0.3, 0.1],
    posed: true,
    moveClips: { [`chase:${STAND}`]: ['Sword_Idle'], ...strikes({ [CHOP]: 'Sword_Heavy_A', [SPLIT_FLOOR]: 'Sword_GroundPound', [SPIN]: 'Sword_Heavy_C' }) },
  },
  boneGuard: {
    url: '/models/enemies/bone_guard.glb',
    clips: { ...SWORD, move: 'Walk_Loop', death: 'Death02' },
    lands: 0.25,
    windup: windupOf(BONE_GUARD.pace),
    glow: [0.9, 0.75, 0.4],
    posed: true,
    moveClips: {
      ...BLOCKING,
      ...strikes({ [CUT]: 'Sword_Regular_A', [GUARD_COMBO]: 'Sword_Regular_Combo', [RIPOSTE]: 'Sword_Heavy_B' }),
      [`chase:${GUARD}`]: ['Guard_Hold'],
      [`chase:${STAND}`]: ['Sword_Idle'],
      [`stun:${BROKEN}`]: ['Idle_Shield_Break', true],
    },
  },
  cinderChicken: {
    url: '/models/enemies/cinder_chicken.glb',
    clips: { idle: 'Idle', move: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death', air: 'Jump' },
    lands: 7 / 30,
    windup: (move) => (move === FUSE ? FOES_HELL_B.v.chickenFuse : 0.3),
    glow: [1, 0.45, 0.05],
    moveClips: { [`windup:${FUSE}`]: ['Dance'] },
  },
  brimBee: {
    url: '/models/enemies/brimstone_bee.glb',
    clips: { idle: 'Flying_Idle', move: 'Fast_Flying', attack: 'Headbutt', hit: 'HitReact', death: 'Death', air: 'Fast_Flying' },
    lands: 9 / 30,
    windup: () => FOES_HELL_B.v.beeWindup,
    glow: [1, 0.3, 0.05],
    moveClips: { [`windup:${BEE_BOMB}`]: ['Headbutt', true, 0.3] },
  },
  pitFiend: {
    url: '/models/enemies/pit_fiend.glb',
    clips: { idle: 'Idle', move: 'Walk', attack: 'Weapon', hit: 'HitReact', death: 'Death', air: 'Jump_Idle' },
    lands: 16 / 30,
    windup: fiendWindup,
    glow: [1, 0.22, 0.04],
    moveClips: {
      [`windup:${FIEND_CHARGE}`]: ['Duck', true],
      [`charge:${FIEND_CHARGE}`]: ['Run'],
      [`stun:${FIEND_CHARGE}`]: ['No'],
      [`recover:${FIEND_CHARGE}`]: ['Idle'],
      [`windup:${FIEND_LEAP}`]: ['Duck', true],
      [`leap:${FIEND_LEAP}`]: ['Jump_Idle'],
      [`recover:${FIEND_LEAP}`]: ['Jump_Land', true],
      // (Its thrust lands at 16 of 30 frames, as its fire flies at the warning's end; the rest after.)
      [`windup:${FIEND_VOLLEY}`]: ['Weapon', true, 0.61],
      [`recover:${FIEND_VOLLEY}`]: ['Weapon', true],
      [`roar:${FIEND_ROAR}`]: ['Punch', true],
    },
  },
  sporeLord: {
    url: '/models/enemies/spore_lord.glb',
    clips: { idle: 'Idle', move: 'Walk', attack: 'Bite_Front', hit: 'HitRecieve', death: 'Death', air: 'Jump' },
    lands: 7 / 30,
    windup: sporeWindup,
    glow: [1, 0.4, 0.1],
    moveClips: {
      [`windup:${PUFF}`]: ['Dance'],
      [`windup:${SPORE_SLAM}`]: ['Jump', true, 0.3],
      [`leap:${SPORE_SLAM}`]: ['Jump', true],
      [`windup:${BITE}`]: ['Bite_Front', true, 0.58],
      [`recover:${BITE}`]: ['Bite_Front', true],
    },
  },
};
