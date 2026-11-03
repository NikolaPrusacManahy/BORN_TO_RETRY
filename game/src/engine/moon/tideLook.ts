// Update 0.3.29 — how the Moon's boss, Tidebreaker, is drawn (enemyLooks.ts): its model (the Bestiary pack's big alien,
// blue, Universal Animation Library clips baked on: tools/ual_bake.py) and a clip for each move, each warning played up
// to where its blow lands (measured from its fist: tools/ual_bake.py's clips), the rest after it.
// Update 0.3.30 (the designer, having seen it) — no weapon; its jump the three Jump clips ("after start jump is performed
// then you see him jump and land with ground shake": crouched, Jump_Start into Jump_Loop up in the air, Jump_Land); its
// run to a pillar played twice as fast; its shell roll gone.
// Update 0.3.31 — rising out of its meteor's crater in its show, its MonsterTransformation (the designer: "revealing the
// boss doing the monster transformation animation"), a little slowed (it's slowed with the show too).
import type { Look } from '../enemyLooks';
import { COMBO, COMBO_C, COMBO_D, HURL, LEAP, PILLAR, QUAKE, ROAR, SMASH, SWING, THROW, UPPERCUT } from '../../sim/enemies/tideShared';
import { tideWindup } from '../../sim/enemies/tidebreaker';
import { TIDEBREAKER } from '../../tuning/tidebreaker';

/** Its run to a pillar played this much faster (the designer: "perform the animation x2 faster too"). Its show's
 *  transformation this fast. */
const RUN_PLAY = 2;
const RISE_PLAY = 0.8;

/** Its warning at its stage (raging, frenzied: quicker), as the sim has it. */
const windup = (move: number, stage = 0) => tideWindup(move) / (stage >= 2 ? TIDEBREAKER.v.frenzyPace : stage === 1 ? TIDEBREAKER.v.ragePace : 1);

export const TIDE_LOOK: Look = {
  url: '/models/enemies/tidebreaker.glb',
  clips: { idle: 'Idle_Loop', move: 'Walk_Loop', attack: 'Sword_Heavy_A', hit: 'Hit_Knockback', death: 'Death01', air: 'Jump_Air' },
  lands: 0.3,
  windup,
  glow: [0.45, 0.75, 1],
  posed: true,
  moveClips: {
    [`windup:${SMASH}`]: ['Sword_Heavy_A', true, 0.41],
    [`recover:${SMASH}`]: ['Sword_Heavy_A', true],
    [`windup:${COMBO}`]: ['Sword_Heavy_B', true, 0.8],
    [`windup:${COMBO_C}`]: ['Sword_Heavy_C', true, 0.76],
    [`recover:${COMBO_C}`]: ['Sword_Heavy_C', true],
    [`windup:${COMBO_D}`]: ['Sword_Heavy_D', true, 0.3],
    [`recover:${COMBO_D}`]: ['Sword_Heavy_D', true],
    [`windup:${UPPERCUT}`]: ['Melee_Uppercut', true, 0.28],
    [`recover:${UPPERCUT}`]: ['Melee_Uppercut', true],
    [`windup:${LEAP}`]: ['Jump_Crouch', true],
    [`leap:${LEAP}`]: ['Jump_Air', true],
    [`recover:${LEAP}`]: ['Jump_Land', true],
    [`windup:${THROW}`]: ['PickUp_Kneeling', true],
    [`windup:${HURL}`]: ['OverhandThrow', true, 0.33],
    [`recover:${HURL}`]: ['OverhandThrow', true],
    [`charge:${PILLAR}`]: ['Jog_Fwd_Loop', false, undefined, RUN_PLAY],
    [`windup:${PILLAR}`]: ['PickUp_Kneeling', true],
    [`windup:${SWING}`]: ['Sword_Heavy_A', true, 0.41],
    [`windup:${QUAKE}`]: ['Sword_GroundPound', true, 0.37],
    [`charge:${QUAKE}`]: ['Sword_GroundPound', true],
    [`intro:${ROAR}`]: ['MonsterTransformation', true, undefined, RISE_PLAY],
    [`windup:${ROAR}`]: ['MonsterTransformation', true, 0.3],
    [`recover:${ROAR}`]: ['MonsterTransformation', true],
  },
};
