// Update 0.5.0 — Gravity Sean's own deck (the designer: "let's have fate cards for Gravity Sean cause he won't be able to get any weapons like Joseph"; "20 different fate cards, 10 traitor and 10 death cards"):
// each changes a move of his, so none would do anything for anyone else, and he's dealt no other. They come out of a challenge room's chest and nowhere else. What each does is in place (seanPowers.ts has the numbers). Pure.
import { SEAN_CARDS } from '../../tuning/seanCards';
import type { Rarity } from '../dungeon/loot';
import type { CardFace } from './cards';

export type SeanCardKind =
  // Common.
  | 'longArm'
  | 'wideRipple'
  | 'looseStone'
  | 'thinAir'
  | 'prospector'
  // Uncommon.
  | 'coolingCore'
  | 'cleanVent'
  | 'hardLanding'
  | 'tidalForce'
  | 'recoilDampers'
  // Rare.
  | 'eventHorizon'
  | 'wideFront'
  | 'deepWell'
  | 'storedForce'
  // Epic.
  | 'bulwark'
  | 'headStart'
  | 'fullReset'
  | 'stoneRain'
  // Mythic.
  | 'singularity'
  | 'escapeVelocity'
  // Traitor Cards.
  | 'overclock'
  | 'hollowFrame'
  | 'borrowedMass'
  | 'reactorLeak'
  | 'stolenMinutes'
  | 'meteorDebt'
  | 'coldReactor'
  | 'blackMarket'
  | 'strippedSuit'
  | 'pointBlank'
  // Death Cards.
  | 'shortReach'
  | 'leakyCore'
  | 'badVent'
  | 'slowCollapse'
  | 'stuckGears'
  | 'heavyStone'
  | 'dimMeter'
  | 'lostHours'
  | 'deadWeight'
  | 'coldComfort';

const v = () => SEAN_CARDS.v;
const pct = (share: number) => `${Math.round(share * 100)}%`;
const fate = (rarity: Rarity, move: string, name: string, does: () => string): CardFace => ({ sean: true, rarity, move, name, does });
const traitor = (move: string, name: string, does: () => string, cost: () => string): CardFace => ({ sean: true, family: 'traitor', rarity: 'common', move, name, does, cost });
const death = (move: string, name: string, does: () => string): CardFace => ({ sean: true, family: 'death', rarity: 'common', move, name, does });

export const SEAN_DECK: Record<SeanCardKind, CardFace> = {
  longArm: fate('common', 'Punch', 'Long Arm', () => `Gravity Punch reaches ${pct(v().longArm)} further.`),
  wideRipple: fate('common', 'Punch', 'Wide Ripple', () => `The third Gravity Punch’s wave is ${pct(v().wideRipple)} wider and harder.`),
  looseStone: fate('common', 'Grab', 'Loose Stone', () => `Pieces you throw hit ${pct(v().looseStone)} harder.`),
  thinAir: fate('common', 'Hover', 'Thin Air', () => `Your hover lasts ${pct(v().thinAir)} longer.`),
  prospector: fate('common', 'Coins', 'Prospector', () => `Chests give ${pct(v().prospector)} more coins.`),
  coolingCore: fate('uncommon', 'Stance', 'Cooling Core', () => `Instability rises ${pct(v().coolingCore)} slower.`),
  cleanVent: fate('uncommon', 'Stance', 'Clean Vent', () => `Switching back hits ${pct(v().cleanVent)} harder and reaches ${v().cleanVentReach} m further.`),
  hardLanding: fate('uncommon', 'Ground Slam', 'Hard Landing', () => `Ground Slam and your plunge reach ${v().hardLanding} m further.`),
  tidalForce: fate('uncommon', 'Black Hole', 'Tidal Force', () => `Black Hole hurts ${pct(v().tidalForce)} harder.`),
  recoilDampers: fate('uncommon', 'Shockwave', 'Recoil Dampers', () => `Shockwave Punch is ready ${pct(v().recoilDampers)} sooner.`),
  eventHorizon: fate('rare', 'Black Hole', 'Event Horizon', () => `Black Hole pulls from ${pct(v().eventHorizon)} further.`),
  wideFront: fate('rare', 'Shockwave', 'Wide Front', () => `Shockwave Punch is ${pct(v().wideFront)} wider.`),
  deepWell: fate('rare', 'Ultimate', 'Deep Well', () => `Your ultimate meter fills ${pct(v().deepWell)} faster.`),
  storedForce: fate('rare', 'Time Stop', 'Stored Force', () => `Blows held in Time Stop land ${pct(v().storedForce)} harder.`),
  bulwark: fate('epic', 'Grab', 'Bulwark', () => `While you hold a piece, hits on you are ${pct(v().bulwark)} weaker.`),
  headStart: fate('epic', 'Ultimate', 'Head Start', () => `Every floor starts with your ultimate meter at least ${pct(v().headStart)} full.`),
  fullReset: fate('epic', 'Ultimate', 'Full Reset', () => 'An ultimate makes Black Hole, Shockwave Punch and Ground Slam ready at once.'),
  stoneRain: fate('epic', 'Grab', 'Stone Rain', () => `A piece you throw splits off two more, each ${pct(v().rainShare)} as hard.`),
  singularity: fate('mythic', 'Black Hole', 'Singularity', () => 'Black Hole pulls in mini bosses too.'),
  escapeVelocity: fate('mythic', 'Body', 'Escape Velocity', () => 'The first time you’d die, this card burns instead: you’re left on 1 health, and time stops.'),
  overclock: traitor('Stance', 'Overclock', () => `Unstable mode hits ${pct(v().overclockHit)} harder.`, () => `Instability rises ${pct(v().overclockRise)} faster.`),
  hollowFrame: traitor('Black Hole', 'Hollow Frame', () => `Black Hole’s cooldown is ${pct(1 - v().hollowWait)} shorter.`, () => `${v().hollowHp} less max health.`),
  borrowedMass: traitor('Grab', 'Borrowed Mass', () => `Pieces you throw hit ${pct(v().borrowedHit)} harder.`, () => `Grab waits ${v().borrowedWait} times as long.`),
  reactorLeak: traitor('Ultimate', 'Reactor Leak', () => `Your ultimate meter fills ${pct(v().leakRate)} faster.`, () => `Every ultimate costs ${v().leakCost} health.`),
  stolenMinutes: traitor('Time Stop', 'Stolen Minutes', () => `Time Stop lasts ${v().stolenTime} s longer.`, () => `You take ${pct(v().stolenTaken)} more damage.`),
  meteorDebt: traitor('Meteor', 'Meteor Debt', () => `Meteor hits ${pct(v().debtHit)} harder.`, () => `In its zone it hits you too, for ${v().debtSelf}.`),
  coldReactor: traitor('Stance', 'Cold Reactor', () => 'Instability never overloads: it stays at full.', () => 'Unstable mode kills don’t heal you.'),
  blackMarket: traitor('Coins', 'Black Market', () => `The shop is ${pct(v().blackMarket)} cheaper.`, () => 'Chests hold only coins.'),
  strippedSuit: traitor('Body', 'Stripped Suit', () => `You run ${pct(v().strippedSpeed)} faster.`, () => `Armour gives ${pct(1 - v().strippedArmour)} less.`),
  pointBlank: traitor('Punch', 'Point Blank', () => `Gravity Punch hits ${pct(v().pointBlankHit)} harder.`, () => `It reaches ${pct(1 - v().pointBlankReach)} less far.`),
  shortReach: death('Punch', 'Short Reach', () => `Gravity Punch reaches ${pct(v().shortReach)} less far.`),
  leakyCore: death('Stance', 'Leaky Core', () => `Instability rises ${pct(v().leakyCore)} faster.`),
  badVent: death('Stance', 'Bad Vent', () => `Switching back hits you too, for ${v().badVent}.`),
  slowCollapse: death('Black Hole', 'Slow Collapse', () => `Black Hole’s cooldown is ${pct(v().slowCollapse)} longer.`),
  stuckGears: death('Ground Slam', 'Stuck Gears', () => `Ground Slam and Shockwave Punch wait ${pct(v().stuckGears)} longer.`),
  heavyStone: death('Grab', 'Heavy Stone', () => `Pieces you throw fly ${pct(v().heavyStone)} slower.`),
  dimMeter: death('Ultimate', 'Dim Meter', () => `Your ultimate meter fills ${pct(v().dimMeter)} slower.`),
  lostHours: death('Time Stop', 'Lost Hours', () => `Time Stop is ${v().lostHours} s shorter.`),
  deadWeight: death('Hover', 'Dead Weight', () => 'You can’t hover.'),
  coldComfort: death('Body', 'Cold Comfort', () => `Your kills heal you ${pct(v().coldComfort)} less.`),
};
