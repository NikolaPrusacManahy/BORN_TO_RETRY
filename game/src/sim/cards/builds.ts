// Update 0.2.22 — builds (testers: "build variety around Fate cards that allows a multiple of gameplay diversities";
// the designer: "Everything at once"). Each Fate Card is of a build by its move: Fists, Kills, Throws (weapons),
// Movement (dash, jump; Update 0.3.20 — no slide), Slam, Executions (body, coins, bonuses and luck are of none). A deal leans to the builds
// you carry (each card of a build makes its cards likelier); three of a build light its bonus. A card you carry that
// can grow may be dealt again as II (stronger: cards.ts `up`). Some cards are dealt only with another: Tremor (the slam's
// blast) opens the Slam build; a pair card both its builds. Pure.
import { BUILDS } from '../../tuning/builds';
import type { CombatState } from '../combat/state';
import { Build, CARD, CardKind, familyOf } from './cards';

export const BUILD_NAME: Record<Build, string> = { fists: 'Fists', kills: 'Kills', throws: 'Throws', movement: 'Movement', slam: 'Slam', executions: 'Executions' };
export const BUILD_LIST = Object.keys(BUILD_NAME) as readonly Build[];
/** The builds' own cards (buildPowers.ts): Tremor's and the pair cards. */
export const BUILD_CARDS: readonly CardKind[] = ['tremor', 'aftershock', 'scorchedEarth', 'staticStep', 'shrapnel', 'lastRites'];
const OF_MOVE: Partial<Record<string, Build>> = { Fists: 'fists', Kills: 'kills', Weapons: 'throws', Dash: 'movement', Jump: 'movement', Slam: 'slam', Executions: 'executions' };

const pct = (share: number) => `${Math.round(share * 100)}%`;
/** What each build's bonus does (on TAB). */
export const BONUS_TEXT: Record<Build, () => string> = {
  fists: () => `Your fists hit ${pct(BUILDS.v.fists)} harder.`,
  kills: () => `Your cards’ bleeds, burns, bolts and blasts hit ${pct(BUILDS.v.kills)} harder.`,
  throws: () => `Thrown weapons hit ${pct(BUILDS.v.throws)} harder.`,
  movement: () => `${Math.round(BUILDS.v.movement)} more dash ${BUILDS.v.movement === 1 ? 'charge' : 'charges'}.`,
  slam: () => `You can slam from ${BUILDS.v.slamHeight} m up: a jump is enough.`,
  executions: () => `The execution meter needs ${Math.round(BUILDS.v.executions)} fewer kills.`,
};

/** The build a card is of (a Fate Card's, by its move; null: none). */
export const buildOf = (k: CardKind): Build | null => (familyOf(k) === 'fate' ? (OF_MOVE[CARD[k].move] ?? null) : null);

/** How many Fate Cards of build `b` are in `cards`. */
export function countOf(cards: ReadonlySet<CardKind>, b: Build): number {
  let n = 0;
  for (const k of cards) if (buildOf(k) === b) n++;
  return n;
}

/** Build `b`'s bonus is lit (three of it, or Build bonus's many). */
export const lit = (cards: ReadonlySet<CardKind>, b: Build) => countOf(cards, b) >= Math.round(BUILDS.v.set);

/** How card `k` can be dealt now: new, again as II (one you carry that can grow, not yet II), or not at all (carried
 *  for good, its keystone not carried, a pair card without both its builds). */
export function dealable(state: CombatState, k: CardKind): 'new' | 'twice' | null {
  const { cards, twice } = state.items;
  const f = CARD[k];
  // (Update 0.3.73 — the Playable Demon takes no weapons, executes nothing and, since 0.3.74, doesn't parry: those cards would do nothing for it.)
  // (Update 0.3.81 — so too Gravity Sean.)
  if ((state.demon || state.sean) && (f.move === 'Weapons' || f.move === 'Executions' || k === 'hairTrigger')) return null;
  if (cards.has(k)) return f.up && !twice.has(k) ? 'twice' : null;
  if (f.needs && !cards.has(f.needs)) return null;
  if (f.pair && !f.pair.every((b) => countOf(cards, b) > 0)) return null;
  return 'new';
}

/** Card `k`'s weight in a deal, dealt `as`: leaning to the builds you carry; a II at its chance. */
export function weightOf(state: CombatState, k: CardKind, as: 'new' | 'twice'): number {
  const b = buildOf(k);
  const lean = b ? 1 + BUILDS.v.lean * countOf(state.items.cards, b) : 1;
  return lean * (as === 'twice' ? BUILDS.v.twice : 1);
}
