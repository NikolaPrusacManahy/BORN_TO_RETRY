// Update 0.3.63 — how floor 10's boss, Hellwarden, is drawn (enemyLooks.ts): its model (the Bestiary pack's skull-faced knight, Universal
// Animation Library clips baked on: tools/ual_bake.py) and a clip for each move.
// Update 0.3.65 — its show's clips; through its leap, where in its clip it is is the show's time's, so the freeze frame holds.
// Update 0.3.66 (the designer: "like he is faking the swing") — its Blazing Arc played Sword_Heavy_B, the second hit of a combo: it starts with the sword already out, goes up, dips,
// goes up again and comes down, and its blow fell at 42% of it with the sword on its way up. Now Sword_Heavy_A, the opening swing, its blow in the middle of the sweep; B only as what
// it's made for, its second swing once risen. Its Brand's blow on its slam, and its sword stays in the floor as long as the rules say it's there to be hit.
import { wardenWindup } from '../../sim/enemies/hellwarden';
import { ARC, ARC_TWO, BRAND, ECHOES, LUNGE, paceOf, ROAR, THRUST, TWIN, VERDICT } from '../../sim/enemies/wardenMoves';
import { LANDED, SHOW_AIR, SHOW_CROUCH, SHOW_FORGE, SHOW_HEAT, SHOW_MASK, SHOW_RISE, SHOW_SLAM, SHOW_SWORD, SHOW_UNDER } from '../../sim/dungeon/wardenShow';
import type { Enemy } from '../../sim/enemies/enemy';
import { HELLWARDEN } from '../../tuning/hellwarden';
import type { Look } from '../enemyLooks';

/** In its ground pound (s): its sword up on one leg; its blade hitting the floor; the clip's end. */
const RAISED = 0.164;
const SLAM = 0.41;
const POUND_END = 1.17;

function poundAt(e: Enemy): number | null {
  const v = HELLWARDEN.v;
  if (e.phase === 'intro' && e.move === SHOW_CROUCH) return RAISED * Math.min(1, e.t / v.showCrouch);
  if (e.phase === 'intro' && e.move === SHOW_AIR) return RAISED;
  if (e.phase === 'intro' && e.move === SHOW_SLAM) return RAISED + (SLAM - RAISED) * Math.min(1, e.t / v.showFall);
  if (e.phase === 'recover' && e.move === LANDED) return SLAM + (POUND_END - SLAM) * Math.min(1, e.t / v.recover);
  if (e.phase === 'dive' && e.move === BRAND) return SLAM;
  if (e.phase === 'recover' && e.move === BRAND) return SLAM + (POUND_END - SLAM) * Math.min(1, e.t / (v.recover / paceOf(e)));
  return null;
}

export const WARDEN_LOOK: Look = {
  url: '/models/enemies/hellwarden.glb',
  // (Update 0.3.66 — a `rise` of its own, one it never plays: with none, its idle is its rise too, one action, so its idle played once, sped up, and stopped: enemiesView.ts.)
  clips: { idle: 'Sword_Idle', move: 'Walk_Loop', attack: 'Sword_Heavy_A', hit: 'Hit_Knockback', death: 'Death01', air: 'Jump_Air', rise: 'Jump_Crouch' },
  lands: 0.3,
  windup: wardenWindup,
  glow: [1, 0.35, 0.08],
  posed: true,
  clipAt: poundAt,
  moveClips: {
    [`windup:${ARC}`]: ['Sword_Heavy_A', true, 0.55],
    [`dive:${ARC}`]: ['Sword_Heavy_A', true, undefined, 1.25],
    [`recover:${ARC}`]: ['Sword_Heavy_A', true],
    [`dive:${ARC_TWO}`]: ['Sword_Heavy_B', true, undefined, 1.25],
    [`recover:${ARC_TWO}`]: ['Sword_Heavy_B', true, undefined, 1.25],
    [`windup:${LUNGE}`]: ['Sword_Block'],
    [`recover:${THRUST}`]: ['Sword_Dash', true],
    [`stun:${THRUST}`]: ['Hit_Knockback', true],
    [`windup:${BRAND}`]: ['Sword_GroundPound', true, 0.35],
    [`dive:${BRAND}`]: ['Sword_GroundPound', true],
    [`recover:${BRAND}`]: ['Sword_GroundPound', true],
    [`windup:${ECHOES}`]: ['MonsterTransformation', true, 0.5],
    [`recover:${ECHOES}`]: ['MonsterTransformation', true],
    [`windup:${TWIN}`]: ['OverhandThrow', true, 0.45],
    [`recover:${TWIN}`]: ['OverhandThrow', true],
    [`windup:${ROAR}`]: ['MonsterTransformation', true],
    [`blast:${VERDICT}`]: ['Sword_Idle'],
    [`stun:${VERDICT}`]: ['Hit_Knockback', true],
    [`recover:${VERDICT}`]: ['Sword_Heavy_D', true],
    [`intro:${SHOW_UNDER}`]: ['Idle_Loop'],
    [`intro:${SHOW_RISE}`]: ['Idle_Loop'],
    [`intro:${SHOW_FORGE}`]: ['Idle_Loop'],
    [`intro:${SHOW_SWORD}`]: ['Idle_Loop'],
    [`intro:${SHOW_HEAT}`]: ['Idle_Loop'],
    [`intro:${SHOW_MASK}`]: ['Sword_Idle'],
    [`intro:${SHOW_CROUCH}`]: ['Sword_GroundPound', true],
    [`intro:${SHOW_AIR}`]: ['Sword_GroundPound', true],
    [`intro:${SHOW_SLAM}`]: ['Sword_GroundPound', true],
    [`recover:${LANDED}`]: ['Sword_GroundPound', true],
  },
};
