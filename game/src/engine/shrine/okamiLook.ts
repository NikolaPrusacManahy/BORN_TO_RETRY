// Update 0.3.34 — how floor 8's boss, Yokai : Okami, is drawn (enemyLooks.ts, through shrineLooks.ts): the Lycan repainted
// (tools/okami_paint.py), the Universal Animation Library's clips baked on (tools/ual_bake.py okami), the sword's stance
// with no sword (the designer: "the same pose with the katana but just no katana"), a clip for each move: its claws'
// swipe and combo, each through in its time (its blows land where the clip's hands do); in its show, coming down out
// of the sky, crouched on its island as it falls, roaring, its leap and its landing. Its fire, its rope and its shide:
// okamiFx.ts.
import type { Look } from '../enemyLooks';
import { okamiWindup } from '../../sim/enemies/okami';
import { ARRIVE, CLAW, COMBO, LAND, LEAP, RIDE, ROAR } from '../../sim/enemies/okamiShared';

export const OKAMI_LOOK: Look = {
  url: '/models/enemies/okami.glb',
  clips: { idle: 'Sword_Idle', move: 'Walk_Loop', attack: 'Zombie_Scratch', hit: 'Hit_Knockback', death: 'Death01', air: 'Jump_Air' },
  lands: 0.33,
  windup: (move) => okamiWindup(move),
  glow: [1, 0.45, 0.2],
  posed: true,
  moveClips: {
    [`windup:${CLAW}`]: ['Zombie_Scratch', true],
    [`windup:${COMBO}`]: ['Melee_Combo', true],
    [`intro:${ARRIVE}`]: ['Jump_Air', true],
    [`intro:${RIDE}`]: ['Crouch_Idle_Loop'],
    [`intro:${ROAR}`]: ['MonsterTransformation', true],
    [`intro:${LEAP}`]: ['Jump_Air', true],
    [`intro:${LAND}`]: ['Jump_Land', true],
  },
};
