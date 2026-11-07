// Update 0.5.0 — what Gravity Sean's cards (seanDeck.ts) make of his numbers: each move asks here, so a card's whole effect, and how its gift and curses add up, is in one line. Pure.
import { SEAN } from '../../tuning/sean';
import { SEAN_CARDS } from '../../tuning/seanCards';
import type { CardKind } from './cards';

/** Whatever carries the run's cards. */
export interface Carries {
  items: { cards: ReadonlySet<CardKind> };
}

const c = () => SEAN_CARDS.v;
export const has = (s: Carries, k: CardKind) => s.items.cards.has(k);
const more = (s: Carries, k: CardKind, by: number) => (has(s, k) ? 1 + by : 1);
const less = (s: Carries, k: CardKind, by: number) => (has(s, k) ? 1 - by : 1);

// Gravity Punch.
export const punchReachOf = (s: Carries) => SEAN.v.punchReach * more(s, 'longArm', c().longArm) * less(s, 'shortReach', c().shortReach) * (has(s, 'pointBlank') ? c().pointBlankReach : 1);
export const punchPower = (s: Carries) => more(s, 'pointBlank', c().pointBlankHit);
export const rippleFactor = (s: Carries) => more(s, 'wideRipple', c().wideRipple);
// His stance.
export const instabRate = (s: Carries) => less(s, 'coolingCore', c().coolingCore) * more(s, 'overclock', c().overclockRise) * more(s, 'leakyCore', c().leakyCore);
export const unstableHit = (s: Carries) => more(s, 'overclock', c().overclockHit);
export const ventFactor = (s: Carries) => more(s, 'cleanVent', c().cleanVent);
export const ventReach = (s: Carries) => (has(s, 'cleanVent') ? c().cleanVentReach : 0);
// Ground Slam and the plunge.
export const landingReach = (s: Carries) => (has(s, 'hardLanding') ? c().hardLanding : 0);
export const slamWaitOf = (s: Carries) => SEAN.v.slamWait * more(s, 'stuckGears', c().stuckGears);
// Shockwave Punch.
export const shockWaitOf = (s: Carries) => SEAN.v.shockWait * less(s, 'recoilDampers', c().recoilDampers) * more(s, 'stuckGears', c().stuckGears);
export const shockConeOf = (s: Carries) => Math.min(80, SEAN.v.shockCone * more(s, 'wideFront', c().wideFront));
// Black Hole.
export const holeWaitOf = (s: Carries) => SEAN.v.holeWait * (has(s, 'hollowFrame') ? c().hollowWait : 1) * more(s, 'slowCollapse', c().slowCollapse);
export const holeReachOf = (s: Carries) => SEAN.v.holeReach * more(s, 'eventHorizon', c().eventHorizon);
export const holePower = (s: Carries) => more(s, 'tidalForce', c().tidalForce);
// Grab.
export const thrownHit = (s: Carries) => more(s, 'looseStone', c().looseStone) * more(s, 'borrowedMass', c().borrowedHit);
export const throwSpeed = (s: Carries) => less(s, 'heavyStone', c().heavyStone);
export const grabWaitOf = (s: Carries) => SEAN.v.grabWait * (has(s, 'borrowedMass') ? c().borrowedWait : 1);
// His ultimates.
export const ultRate = (s: Carries) => more(s, 'deepWell', c().deepWell) * more(s, 'reactorLeak', c().leakRate) * less(s, 'dimMeter', c().dimMeter);
export const storedFactor = (s: Carries) => more(s, 'storedForce', c().storedForce);
export const stopTimeOf = (s: Carries) => Math.max(1, SEAN.v.stopTime + (has(s, 'stolenMinutes') ? c().stolenTime : 0) - (has(s, 'lostHours') ? c().lostHours : 0));
export const meteorHit = (s: Carries) => more(s, 'meteorDebt', c().debtHit);
export const startingUlt = (s: Carries, ult: number) => (has(s, 'headStart') ? Math.max(ult, c().headStart) : ult);
// What a kill gives back.
export function mendFactor(s: Carries, unstable: boolean): number {
  return (unstable && has(s, 'coldReactor') ? 0 : 1) * less(s, 'coldComfort', c().coldComfort);
}
// Coins and armour.
export const chestCoins = (s: Carries) => more(s, 'prospector', c().prospector);
export const armourFactor = (s: Carries) => (has(s, 'strippedSuit') ? c().strippedArmour : 1);
export const runFactor = (s: Carries) => more(s, 'strippedSuit', c().strippedSpeed);
export const shopCut = (s: Carries) => less(s, 'blackMarket', c().blackMarket);
