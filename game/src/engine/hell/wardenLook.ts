// Update 0.3.63 — how floor 10's boss, Hellwarden, is drawn (enemyLooks.ts): its model (the Bestiary pack's skull-faced knight, Universal
// Animation Library clips baked on: tools/ual_bake.py) and a clip for each move.
import { wardenWindup } from '../../sim/enemies/hellwarden';
import { ARC, BRAND, ECHOES, LUNGE, ROAR, THRUST, TWIN, VERDICT } from '../../sim/enemies/wardenMoves';
import { SHOW_BLOW, SHOW_DRAG, SHOW_RAISE, SHOW_ROAR, SHOW_WALK } from '../../sim/dungeon/wardenShow';
import type { Look } from '../enemyLooks';

export const WARDEN_LOOK: Look = {
  url: '/models/enemies/hellwarden.glb',
  clips: { idle: 'Sword_Idle', move: 'Walk_Loop', attack: 'Sword_Heavy_A', hit: 'Hit_Knockback', death: 'Death01', air: 'Jump_Air' },
  lands: 0.3,
  windup: wardenWindup,
  glow: [1, 0.35, 0.08],
  posed: true,
  moveClips: {
    [`windup:${ARC}`]: ['Sword_Heavy_B', true, 0.42],
    [`dive:${ARC}`]: ['Sword_Heavy_B', true],
    [`recover:${ARC}`]: ['Sword_Heavy_B', true],
    [`windup:${LUNGE}`]: ['Sword_Block'],
    [`recover:${THRUST}`]: ['Sword_Dash', true],
    [`stun:${THRUST}`]: ['Hit_Knockback', true],
    [`windup:${BRAND}`]: ['Sword_GroundPound', true, 0.5],
    [`dive:${BRAND}`]: ['Sword_GroundPound', true],
    [`windup:${ECHOES}`]: ['MonsterTransformation', true, 0.5],
    [`recover:${ECHOES}`]: ['MonsterTransformation', true],
    [`windup:${TWIN}`]: ['OverhandThrow', true, 0.45],
    [`recover:${TWIN}`]: ['OverhandThrow', true],
    [`windup:${ROAR}`]: ['MonsterTransformation', true],
    [`blast:${VERDICT}`]: ['Sword_Idle'],
    [`stun:${VERDICT}`]: ['Hit_Knockback', true],
    [`recover:${VERDICT}`]: ['Sword_Heavy_D', true],
    [`intro:${SHOW_WALK}`]: ['Walk_Carry_Loop'],
    [`intro:${SHOW_DRAG}`]: ['Sword_Idle'],
    [`intro:${SHOW_RAISE}`]: ['Sword_Idle'],
    [`intro:${SHOW_BLOW}`]: ['Sword_GroundPound', true],
    [`intro:${SHOW_ROAR}`]: ['MonsterTransformation', true],
  },
};
