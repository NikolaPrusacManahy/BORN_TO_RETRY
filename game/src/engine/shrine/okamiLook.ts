// Update 0.3.34 — how floor 8's boss, Yokai : Okami, is drawn (enemyLooks.ts, through shrineLooks.ts): the Lycan repainted
// (tools/okami_paint.py), the Universal Animation Library's clips baked on (tools/ual_bake.py okami), the sword's stance
// with no sword (the designer: "the same pose with the katana but just no katana"), a clip for each move: its claws'
// swipe and combo, each through in its time (its blows land where the clip's hands do); in its show, coming down out
// of the sky, crouched on its island as it falls, roaring, its leap and its landing. Its fire, its rope and its shide:
// okamiFx.ts.
// Update 0.3.35 — its moves' clips: crouched, up and down for each of its leaps; hunched as its blue fireball swells,
// a claw's swing throwing it; hunched low for its fire dash, its feral run along it; its roar for its roar of fire;
// hunched charging in the middle, its roar as its massive fireball goes up; hunched, slowed, its charge broken. The
// designer: "why does the boss still do the fighter stancing and the hits??? he has human animations?" — the library's
// most beast-like clips (its Zombie set: hunched, prowling, running feral, its claws, its bite) in place of its
// fighting ones; no flinch (a boss doesn't: its hit's flash and squash).
import type { Look } from '../enemyLooks';
import { okamiWindup } from '../../sim/enemies/okami';
import { VANISH } from '../../sim/enemies/okamiDevastation';
import { OKAMI } from '../../tuning/okami';
import { ARRIVE, BREATH, CLAW, COMBO, DASH, DEVASTATE, FIREBALL, HURL, LAND, LEAP, LEAPS, RIDE, ROAR } from '../../sim/enemies/okamiShared';

/** Its held stances (loops, at their own pace: their clips' lengths, s): its fireball's, its dash's crouch. */
const LOOPS: Readonly<Record<number, number>> = { [FIREBALL]: 1.33, [DASH]: 1.33 };

export const OKAMI_LOOK: Look = {
  url: '/models/enemies/okami.glb',
  clips: { idle: 'Zombie_Idle_Loop', move: 'Zombie_Walk_Fwd_Loop', attack: 'Zombie_Scratch', hit: 'Zombie_Idle_Loop', death: 'Death01', air: 'Jump_Air' },
  lands: 0.33,
  // (Its devastation's roar: slowed to its whole charge, the designer: "animation?".)
  windup: (move) => (move === DEVASTATE ? VANISH + OKAMI.v.devastateCharge : (LOOPS[move] ?? okamiWindup(move))),
  glow: [1, 0.45, 0.2],
  posed: true,
  moveClips: {
    [`windup:${CLAW}`]: ['Zombie_Scratch', true],
    [`windup:${COMBO}`]: ['Zombie_Bite', true],
    [`windup:${LEAPS}`]: ['Jump_Crouch', true],
    [`leap:${LEAPS}`]: ['Jump_Air', true],
    [`recover:${LEAPS}`]: ['Jump_Land', true],
    [`windup:${FIREBALL}`]: ['Zombie_Idle_Loop'],
    [`recover:${FIREBALL}`]: ['Zombie_Scratch', true],
    [`windup:${DASH}`]: ['Zombie_Idle_Loop'],
    [`charge:${DASH}`]: ['Zombie_Run_Fwd_Loop', false, undefined, 1.6],
    [`recover:${DASH}`]: ['Zombie_Idle_Loop'],
    [`windup:${BREATH}`]: ['MonsterTransformation', true],
    [`windup:${DEVASTATE}`]: ['MonsterTransformation', true],
    [`stun:${DEVASTATE}`]: ['Zombie_Idle_Loop', false, undefined, 0.5],
    [`windup:${HURL}`]: ['Zombie_Scratch', true],
    [`intro:${ARRIVE}`]: ['Jump_Air', true],
    [`intro:${RIDE}`]: ['Zombie_Idle_Loop'],
    [`intro:${ROAR}`]: ['MonsterTransformation', true],
    [`intro:${LEAP}`]: ['Jump_Air', true],
    [`intro:${LAND}`]: ['Jump_Land', true],
  },
};
