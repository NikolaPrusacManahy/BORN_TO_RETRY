// Update 0.3.33 — how floor 8's martial artists are drawn (enemyLooks.ts): the More-enemies pack's people with the
// Universal Animation Library's clips baked on (tools/ual_people.py, ual_fighters.py), and a clip for every move
// (sim/enemies/shrineShared.ts) played as the sim runs it: their stance held between blows; jogging left, right and back
// as they side-step round you; sprinting in on a dash; the dodge clips for a side-step; each strike's own clip, through
// in its time (its blows land where the clip's do: tools/ual_lands.py), held a moment after; the block; the wall runs,
// the ninja jumps, the bow drawn and loosed, the staff's combos, the Shadow's split.
import type { Look } from '../enemyLooks';
import type { KindShrine } from '../../sim/enemies/kindsShrine';
import { FOES_SHRINE } from '../../tuning/foesShrine';
import { FOES_SHRINE_B } from '../../tuning/foesShrineB';
import { BLOCK_TIME, strikeTime, Style } from '../../sim/enemies/martial';
import { KARATE_GIRL, KARATEKA } from '../../sim/enemies/karate';
import { SHINOBI } from '../../sim/enemies/shinobi';
import { CROUCH, KUNOICHI } from '../../sim/enemies/kunoichi';
import { SAND } from '../../sim/enemies/sandNinja';
import { SENSEI } from '../../sim/enemies/sensei';
import { SHADOW } from '../../sim/enemies/shadow';
import {
  AIM, BACK, BACKFLIP, BLOCK, CALTROPS, COMBO, CROSS, CUT_SET, DASH, DASH_CUT, DODGE_L, DODGE_R, FLYING_KNEE, FOLDED, HEAVY_CUT, HOOK, JAB, KI, KICK, KNEE, KUNAI, LAND, LEAP,
  LONG_CUT, LOOSE, ROLL, SLAM, SLASH_A, SLASH_COMBO, SMOKE, SPLIT, STAFF, STAFF_COUNTER, STAFF_HEAVY, STRAFE_L, STRAFE_R, THROW, UPPERCUT, VOLLEY, WALLRUN_L, WALLRUN_R,
} from '../../sim/enemies/shrineShared';

type Clips = Record<string, readonly [string, boolean?, number?, number?]>;

/** Every fighter's: side-stepping, backing off, the dash's sprint, the dodges. */
const MOVING: Clips = {
  [`chase:${STRAFE_L}`]: ['Jog_Left_Loop'],
  [`chase:${STRAFE_R}`]: ['Jog_Right_Loop'],
  [`chase:${BACK}`]: ['Jog_Bwd_Loop'],
  [`charge:${DASH}`]: ['Sprint_Loop'],
  [`dive:${DODGE_L}`]: ['Dodge_Left', true],
  [`dive:${DODGE_R}`]: ['Dodge_Right', true],
};
/** The blockers' block (only its start: its warning). */
const BLOCKING: Clips = { [`windup:${BLOCK}`]: ['Sword_Block', true, 0.3] };

/** Each strike its clip: through in its warning, held after it. */
function strikes(map: Readonly<Record<number, string>>): Clips {
  const out: Clips = {};
  for (const [move, clip] of Object.entries(map)) {
    out[`windup:${move}`] = [clip, true];
    out[`recover:${move}`] = [clip, true];
  }
  return out;
}

/** Its warning (the look's): a strike's whole clip at its style's pace; the rest as the sim has them. */
const windupOf = (pace: number, own: Readonly<Record<number, () => number>> = {}) => (move: number) => own[move]?.() ?? (move === BLOCK ? BLOCK_TIME : strikeTime(move, pace));

const PEOPLE = { idle: 'Stance', move: 'Jog_Fwd_Loop', attack: 'Punch_Jab', hit: 'Hit_Chest', death: 'Death01', air: 'Jog_Fwd_Loop' };
/** (Each one's attack clip one its model has: its first cut.) */
const SWORD = (attack: string) => ({ ...PEOPLE, idle: 'Sword_Idle', attack });

/** The karate fighters' strikes' clips (each plays only its own style's: its model has only those). */
const KARATE: Readonly<Record<number, string>> = { [JAB]: 'Punch_Jab', [CROSS]: 'Punch_Cross', [KICK]: 'Kick', [COMBO]: 'Melee_Combo', [HOOK]: 'Melee_Hook', [KNEE]: 'Melee_Knee', [UPPERCUT]: 'Melee_Uppercut', [FLYING_KNEE]: 'Melee_Knee', [BACKFLIP]: 'BackFlip' };
const ownOf = (st: Style, map: Readonly<Record<number, string>>) => Object.fromEntries(st.strikes.filter((k) => map[k.move]).map((k) => [k.move, map[k.move]]));

const karate = (url: string, death: string, st: Style, glow: [number, number, number]): Look => ({
  url,
  clips: { ...PEOPLE, death },
  lands: 0.25,
  windup: windupOf(st.pace),
  glow,
  posed: true,
  moveClips: { ...MOVING, ...(st.block ? BLOCKING : {}), ...strikes(ownOf(st, KARATE)) },
});

const sand = (url: string, death: string): Look => ({
  url,
  clips: { ...PEOPLE, idle: 'Crouch_Idle_Loop', death },
  lands: 0.25,
  windup: windupOf(SAND.pace),
  glow: [1, 0.75, 0.3],
  posed: true,
  moveClips: { ...MOVING, ...strikes({ [SMOKE]: 'OverhandThrow', [CALTROPS]: 'Farm_ScatteringSeeds', [JAB]: 'Punch_Jab', [HOOK]: 'Melee_Hook', [ROLL]: 'Roll' }) },
});

const shadowLook = (url: string): Look => ({
  url,
  clips: SWORD('Sword_Heavy_A'),
  lands: 0.25,
  windup: windupOf(SHADOW.pace, { [CUT_SET]: () => FOES_SHRINE_B.v.cutWarn, [LEAP]: () => 0.4, [SPLIT]: () => 0.6 }),
  glow: [1, 0.15, 0.1],
  posed: true,
  moveClips: {
    ...MOVING,
    ...strikes({ [SLASH_COMBO]: 'Sword_Light_Combo', [HEAVY_CUT]: 'Sword_Heavy_A', [LONG_CUT]: 'Sword_Dash', [LAND]: 'NinjaJump_Land' }),
    [`windup:${CUT_SET}`]: ['Sword_Idle'],
    [`windup:${SPLIT}`]: ['Spell_Double_Enter', true],
    [`windup:${LEAP}`]: ['NinjaJump_Start', true, 0.4],
    [`leap:${LEAP}`]: ['NinjaJump_Double', true],
  },
});

export const SHRINE_LOOKS: Record<KindShrine, Look> = {
  karateka: karate('/models/enemies/karateka.glb', 'Death01', KARATEKA, [1, 0.35, 0.2]),
  karateGirl: karate('/models/enemies/karate_girl.glb', 'Death02', KARATE_GIRL, [1, 0.45, 0.6]),
  shinobi: {
    url: '/models/enemies/shinobi.glb',
    clips: SWORD('Sword_Light_A'),
    lands: 0.25,
    windup: windupOf(SHINOBI.pace),
    glow: [1, 0.25, 0.25],
    posed: true,
    moveClips: { ...MOVING, ...strikes({ [THROW]: 'OverhandThrow', [DASH_CUT]: 'Sword_Dash', [SLASH_A]: 'Sword_Light_A', [SLASH_COMBO]: 'Sword_Light_Combo' }) },
  },
  kunoichi: {
    url: '/models/enemies/kunoichi.glb',
    clips: { ...PEOPLE, attack: 'Melee_Hook', death: 'Death02', air: 'NinjaJump_Idle_Loop' },
    lands: 0.25,
    windup: windupOf(KUNOICHI.pace, { [LEAP]: () => CROUCH }),
    glow: [1, 0.4, 0.9],
    posed: true,
    moveClips: {
      ...MOVING,
      ...strikes({ [KUNAI]: 'Spell_Simple_Shoot', [HOOK]: 'Melee_Hook', [KICK]: 'Kick', [LAND]: 'NinjaJump_Land' }),
      [`charge:${WALLRUN_L}`]: ['WallRun_L_Loop'],
      [`charge:${WALLRUN_R}`]: ['WallRun_R_Loop'],
      [`windup:${LEAP}`]: ['NinjaJump_Start', true, 0.4],
      [`leap:${LEAP}`]: ['NinjaJump_Double', true],
    },
  },
  sandNinja: sand('/models/enemies/sand_ninja.glb', 'Death01'),
  sandNinjaF: sand('/models/enemies/sand_ninja_f.glb', 'Death02'),
  archer: {
    url: '/models/enemies/archer.glb',
    clips: { ...PEOPLE, idle: 'Idle_Loop', attack: 'Bow_Shoot', death: 'Death02' },
    lands: 0.25,
    windup: (move) => (move === AIM ? FOES_SHRINE.v.aimTime : 0.5),
    glow: [0.6, 0.85, 1],
    posed: true,
    moveClips: { ...MOVING, [`windup:${AIM}`]: ['Bow_Aim_Neutral'], [`recover:${LOOSE}`]: ['Bow_Shoot', true], [`recover:${VOLLEY}`]: ['Bow_RapidShoot_Loop'] },
  },
  sensei: {
    url: '/models/enemies/sensei.glb',
    clips: { ...SWORD('Sword_Regular_Combo'), move: 'Walk_Loop' },
    lands: 0.25,
    windup: windupOf(SENSEI.pace),
    glow: [1, 0.8, 0.3],
    posed: true,
    moveClips: {
      ...MOVING,
      ...BLOCKING,
      ...strikes({ [STAFF]: 'Sword_Regular_Combo', [STAFF_HEAVY]: 'Sword_Heavy_Combo', [SLAM]: 'Sword_GroundPound', [KI]: 'Spell_Simple_Shoot', [STAFF_COUNTER]: 'Sword_UpperCut' }),
      [`chase:${FOLDED}`]: ['Idle_FoldArms_Loop'],
    },
  },
  shadow: shadowLook('/models/enemies/shadow.glb'),
  shadowClone: shadowLook('/models/enemies/shadow.glb'),
};
