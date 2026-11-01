// Update 0.2.15 — the Scars. Update 0.2.16 — Fate Cards (the designer: "scars are turned into "Fate cards"", "if you
// are lucky, you might not get a normal drop but you get sets of card you pick", "We need rarity too, grey, green,
// blue, purple, Red … different effects that matches the rarity and power of the card"; ideas taken from Risk of Rain
// 2's items, the names our own: "the names are very similar if not same soo.. let's not do that"). The 14 Scars are 14
// of them. Which there are (wave 1: 30; Update 0.2.18, wave 2 — the designer: "just build wave 2" — 10 more, the ones
// with effects of their own: bleed, burn, lightning, blasts, spirit knives, rings, a split throw), their rarity (a
// chest's: common to mythic), what each changes and does (its face), the ones you carry (each once; lost when you die),
// taking one. Update 0.2.19 — two more families in the same deals (the designer): Death Cards, 16 curses ("annoying cards
// … can make the run a bit painful"), and Traitor Cards, 10 with a gift and a price ("a good part and a counter part
// costs"). A deal is deal.ts; what each does is where its move is (cardMoves.ts, cardPowers.ts and in place). Update
// 0.2.20 — the shop's own Fate Card: shopCard.ts. Pure.
import { CARDS } from '../../tuning/cards';
import type { CombatState } from '../combat/state';
import type { Rarity } from '../dungeon/loot';
import type { PlayerState } from '../player/state';
import { WEAPON_STATS, WeaponKind } from '../weapons/catalog';

export type CardKind =
  // Common.
  | 'slingshot'
  | 'secondWind'
  | 'hoarder'
  | 'collector'
  | 'hardHead'
  | 'lightBones'
  | 'quickHands'
  | 'bloodMoney'
  | 'haggler'
  // Uncommon.
  | 'shoulderCharge'
  | 'bowling'
  | 'crater'
  | 'hairTrigger'
  | 'airButcher'
  | 'bloodrush'
  | 'killingSpree'
  | 'coldSnap'
  | 'jaggedKnuckles'
  // Rare.
  | 'pogo'
  | 'ricochet'
  | 'ironKnuckles'
  | 'adrenaline'
  | 'mercyKill'
  | 'updraft'
  | 'thunderclap'
  | 'deathThroes'
  | 'pyre'
  // Epic.
  | 'bloodbath'
  | 'restless'
  | 'giantKiller'
  | 'spiritKnives'
  | 'powderKeg'
  | 'fireAndIce'
  | 'stormHeart'
  // Mythic.
  | 'fortune'
  | 'reapersRhythm'
  | 'bornAgain'
  | 'allIn'
  | 'chainReaction'
  | 'splinter'
  // Update 0.2.19 — Death Cards.
  | 'brittleBones'
  | 'leadenFeet'
  | 'shortBreath'
  | 'rust'
  | 'rottenGrip'
  | 'taxman'
  | 'emptyPurse'
  | 'illOmen'
  | 'heavyHands'
  | 'anchor'
  | 'glassHeart'
  | 'bluntedRage'
  | 'festering'
  | 'cramp'
  | 'blackCat'
  | 'shaken'
  // Update 0.2.19 — Traitor Cards.
  | 'bloodPact'
  | 'fragileFortune'
  | 'runaway'
  | 'fasting'
  | 'ironSkin'
  | 'bottledLightning'
  | 'misersOath'
  | 'berserker'
  | 'gambler'
  | 'executionersDeal';

/** Update 0.2.19 — a Fate Card (good), a Traitor Card (a gift and a price), a Death Card (a curse). */
export type CardFamily = 'fate' | 'traitor' | 'death';

interface CardFace {
  /** A Fate Card's (a Traitor's or a Death Card's is 'common', unused: they have none). */
  rarity: Rarity;
  /** What it changes (shown on its face). */
  move: string;
  name: string;
  /** What it does (a Traitor Card's: its gift). */
  does: () => string;
  /** Update 0.2.19 — a Traitor or a Death Card (none: a Fate Card); a Traitor Card's price. */
  family?: CardFamily;
  cost?: () => string;
}

const pct = (share: number) => `${Math.round(share * 100)}%`;
const times = (n: number) => (n === 2 ? 'twice' : `${n} times`);
const v = () => CARDS.v;
const death = (move: string, name: string, does: () => string): CardFace => ({ family: 'death', rarity: 'common', move, name, does });
const traitor = (move: string, name: string, does: () => string, cost: () => string): CardFace => ({ family: 'traitor', rarity: 'common', move, name, does, cost });

export const CARD: Record<CardKind, CardFace> = {
  slingshot: { rarity: 'common', move: 'Slide', name: 'Slingshot', does: () => `A jump out of a slide carries ${pct(v().slingshot - 1)} more speed.` },
  secondWind: { rarity: 'common', move: 'Dash', name: 'Second Wind', does: () => 'A wall run gives you back a dash.' },
  hoarder: { rarity: 'common', move: 'Bonuses', name: 'Hoarder', does: () => `Kill bonuses last ${times(v().hoarder)} as long.` },
  collector: { rarity: 'common', move: 'Weapons', name: 'Collector', does: () => `New weapons have ${pct(v().collector)} more uses.` },
  hardHead: { rarity: 'common', move: 'Body', name: 'Hard Head', does: () => `Every ${Math.round(v().hardHead)}th hit on you does nothing.` },
  lightBones: { rarity: 'common', move: 'Jump', name: 'Light Bones', does: () => `You jump ${pct(v().lightBones)} higher.` },
  quickHands: { rarity: 'common', move: 'Weapons', name: 'Quick Hands', does: () => `Reloads and throws are ${pct(v().quickHands)} quicker.` },
  bloodMoney: { rarity: 'common', move: 'Coins', name: 'Blood Money', does: () => `Every hit you take drops ${Math.round(v().bloodMoney)} coins for you.` },
  haggler: { rarity: 'common', move: 'Coins', name: 'Haggler', does: () => `The shop is ${pct(v().haggler)} cheaper.` },
  shoulderCharge: { rarity: 'uncommon', move: 'Dash', name: 'Shoulder Charge', does: () => 'Dashing into an enemy throws it back and staggers it.' },
  bowling: { rarity: 'uncommon', move: 'Slide', name: 'Bowling', does: () => 'Sliding into an enemy throws it back and staggers it.' },
  crater: { rarity: 'uncommon', move: 'Slam', name: 'Crater', does: () => `The higher you slam from, the wider its ring: up to ${times(v().craterGrowth)} as wide.` },
  hairTrigger: { rarity: 'uncommon', move: 'Fists', name: 'Hair Trigger', does: () => 'Your charged punch is ready in half the time, for a dash.' },
  airButcher: { rarity: 'uncommon', move: 'Executions', name: 'Air Butcher', does: () => `Kills while you're in the air count ${times(v().airButcher)} on the execution meter.` },
  bloodrush: { rarity: 'uncommon', move: 'Kills', name: 'Bloodrush', does: () => `A kill makes you ${pct(v().bloodrush)} faster for ${v().bloodrushFor} s.` },
  killingSpree: { rarity: 'uncommon', move: 'Kills', name: 'Killing Spree', does: () => `${Math.round(v().spreeKills)} kills within ${v().spreeWithin} s: your attacks are ${pct(v().spreeRate)} quicker for ${v().spreeFor} s.` },
  coldSnap: { rarity: 'uncommon', move: 'Fists', name: 'Cold Snap', does: () => `Charged punches and slams freeze what they hit for ${v().coldSnap} s.` },
  jaggedKnuckles: { rarity: 'uncommon', move: 'Fists', name: 'Jagged Knuckles', does: () => `Your jabs make enemies bleed: ${v().bleedDps} a second for ${v().bleedFor} s.` },
  pogo: { rarity: 'rare', move: 'Slam', name: 'Pogo', does: () => 'A slam that kills bounces you back up, high enough to slam again.' },
  ricochet: { rarity: 'rare', move: 'Weapons', name: 'Ricochet', does: () => 'A thrown weapon bounces on to the nearest enemy.' },
  // (Any hit already staggers the rest: only a mini boss shrugs a jab off.)
  ironKnuckles: { rarity: 'rare', move: 'Fists', name: 'Iron Knuckles', does: () => 'A punch on a mini boss winding up makes it start over.' },
  adrenaline: { rarity: 'rare', move: 'Executions', name: 'Adrenaline', does: () => `An execution refills your dashes; you're untouchable for ${v().adrenaline} s after.` },
  mercyKill: { rarity: 'rare', move: 'Kills', name: 'Mercy Kill', does: () => `Any hit finishes an enemy under ${pct(v().mercyKill)} health (not a boss).` },
  updraft: { rarity: 'rare', move: 'Jump', name: 'Updraft', does: () => 'One more jump in the air.' },
  thunderclap: { rarity: 'rare', move: 'Fists', name: 'Thunderclap', does: () => `A charged punch arcs lightning to the ${Math.round(v().zapTargets)} nearest enemies (${v().zapDamage} each).` },
  deathThroes: { rarity: 'rare', move: 'Kills', name: 'Death Throes', does: () => `A kill has a ${pct(v().throesChance)} chance to burst: ${v().throesDamage} to everything within ${v().throesRadius} m.` },
  pyre: { rarity: 'rare', move: 'Kills', name: 'Pyre', does: () => `A kill sets the enemies within ${v().pyreRadius} m of it on fire.` },
  bloodbath: { rarity: 'epic', move: 'Executions', name: 'Bloodbath', does: () => `An execution's blast reaches ${v().bloodbath} m.` },
  restless: { rarity: 'epic', move: 'Dash', name: 'Restless', does: () => `${Math.round(v().restless)} more dash charges, refilling ${pct(v().restlessRefill)} quicker.` },
  spiritKnives: { rarity: 'epic', move: 'Kills', name: 'Spirit Knives', does: () => `Every kill throws ${Math.round(v().spiritKnives)} knives that home in on enemies near it (${v().spiritDamage} each).` },
  powderKeg: { rarity: 'epic', move: 'Weapons', name: 'Powder Keg', does: () => `Thrown weapons and charged punches explode: ${v().kegDamage} within ${v().kegRadius} m.` },
  fireAndIce: { rarity: 'epic', move: 'Fists', name: 'Fire and Ice', does: () => `A hit of ${v().bandHit} or more throws a ring of fire, the next a ring of ice (every ${v().bandEvery} s).` },
  stormHeart: { rarity: 'epic', move: 'Body', name: 'Storm Heart', does: () => `Every ${v().stormEvery} s, lightning strikes the ${Math.round(v().zapTargets)} nearest enemies within ${v().stormRange} m.` },
  giantKiller: { rarity: 'epic', move: 'Kills', name: 'Giant Killer', does: () => `Kill a mini boss: for ${v().giantKiller} s your dashes are free and your charged punch instant.` },
  fortune: { rarity: 'mythic', move: 'Luck', name: "Fortune's Favour", does: () => 'Every chest and deal rolls its rarity twice and keeps the better.' },
  reapersRhythm: { rarity: 'mythic', move: 'Executions', name: "Reaper's Rhythm", does: () => `The execution meter fills in ${Math.round(v().reaperKills)} kills; an execution leaves it half full.` },
  bornAgain: { rarity: 'mythic', move: 'Body', name: 'Born Again', does: () => `The first time you'd die, this card burns instead: you're left on 1 health, untouchable for ${v().bornAgain} s.` },
  allIn: { rarity: 'mythic', move: 'Fists', name: 'All In', does: () => 'Your fists hit twice as hard; your max health is halved.' },
  chainReaction: { rarity: 'mythic', move: 'Kills', name: 'Chain Reaction', does: () => `Every enemy you kill explodes (${v().chainDamage} within ${v().chainRadius} m), and its blast can set off the next.` },
  splinter: { rarity: 'mythic', move: 'Weapons', name: 'Splinter', does: () => 'Every weapon you throw splits into three.' },
  // Update 0.2.19 — Death Cards: curses.
  brittleBones: death('Body', 'Brittle Bones', () => `You take ${pct(v().brittle)} more damage.`),
  leadenFeet: death('Body', 'Leaden Feet', () => `You run ${pct(v().leaden)} slower.`),
  shortBreath: death('Dash', 'Short Breath', () => `Your dashes refill ${pct(v().shortBreath)} slower.`),
  rust: death('Weapons', 'Rust', () => `New weapons have ${pct(v().rust)} fewer uses.`),
  rottenGrip: death('Weapons', 'Rotten Grip', () => 'Your weapons wear out twice as fast.'),
  taxman: death('Coins', 'Taxman', () => `The shop costs ${pct(v().taxman)} more.`),
  emptyPurse: death('Coins', 'Empty Purse', () => `Kills give ${pct(v().emptyPurse)} fewer coins.`),
  illOmen: death('Bonuses', 'Ill Omen', () => 'Kill bonuses drop half as often.'),
  heavyHands: death('Fists', 'Heavy Hands', () => `Charged attacks take ${pct(v().heavyHands)} longer to charge.`),
  anchor: death('Jump', 'Anchor', () => `You jump ${pct(v().anchor)} lower.`),
  glassHeart: death('Body', 'Glass Heart', () => `${v().glassHeart} less max health.`),
  bluntedRage: death('Executions', 'Blunted Rage', () => `The execution meter needs ${Math.round(v().blunted)} more kills.`),
  festering: death('Body', 'Festering', () => `Every hit on you festers: ${v().festerDps} a second for ${v().festerFor} s.`),
  cramp: death('Fists', 'Cramp', () => `Your attacks are ${pct(v().cramp)} slower.`),
  blackCat: death('Luck', 'Black Cat', () => 'Every chest and deal rolls its rarity twice and keeps the worse.'),
  shaken: death('Executions', 'Shaken', () => 'A hit on you empties your execution meter.'),
  // Update 0.2.19 — Traitor Cards: a gift, and its price.
  bloodPact: traitor('Body', 'Blood Pact', () => `Your hits deal ${pct(v().bloodPact)} more.`, () => `You take ${pct(v().bloodPact)} more.`),
  fragileFortune: traitor('Luck', 'Fragile Fortune', () => 'Every chest and deal rolls one rarity higher.', () => `${v().fragileHp} less max health.`),
  runaway: traitor('Body', 'Runaway', () => `You run ${pct(v().runaway)} faster.`, () => 'You can’t slide.'),
  fasting: traitor('Executions', 'Fasting', () => `The execution meter fills in ${Math.round(v().fastingKills)} kills.`, () => 'The shop won’t sell to you.'),
  ironSkin: traitor('Body', 'Iron Skin', () => `Hits on you are ${pct(v().ironSkin)} weaker.`, () => `You run ${pct(v().ironSlow)} slower.`),
  bottledLightning: traitor('Dash', 'Bottled Lightning', () => 'Your dashes refill twice as fast.', () => `${v().bottledHp} less max health.`),
  misersOath: traitor('Coins', 'Miser’s Oath', () => 'Kills give twice the coins.', () => `Every hit you take costs ${Math.round(v().misersCost)} coins.`),
  berserker: traitor('Fists', 'Berserker', () => `Your attacks are ${pct(v().berserk)} quicker.`, () => `Your dashes refill ${pct(v().shortBreath)} slower.`),
  gambler: traitor('Luck', 'Gambler', () => 'Deals show one card more.', () => 'One of them is always a Death Card.'),
  executionersDeal: traitor('Executions', 'Executioner’s Deal', () => `The execution meter fills in ${Math.round(v().executionerKills)} kills.`, () => 'Executions don’t heal you.'),
};

/** Update 0.2.19 — the family a card is of. */
export const familyOf = (k: CardKind): CardFamily => CARD[k].family ?? 'fate';

export const CARD_KINDS = Object.keys(CARD) as readonly CardKind[];

/** Does the run (its fight) carry `kind`? */
export const holds = (state: CombatState, kind: CardKind) => state.items.cards.has(kind);
/** Does your body carry `kind` (the run's cards, copied to you each tick)? */
export const bears = (p: PlayerState, kind: CardKind) => p.cards.has(kind);
/** Update 0.2.20 — the shop's prices, times this (Haggler: less; Taxman: more). */
export const shopFactor = (state: CombatState) => (holds(state, 'haggler') ? 1 - CARDS.v.haggler : 1) * (holds(state, 'taxman') ? 1 + CARDS.v.taxman : 1);
/** The cards in `cards`, in their order (rarest last). */
export const cardsIn = (cards: ReadonlySet<CardKind>) => CARD_KINDS.filter((k) => cards.has(k));

/** Takes card `kind`: it's yours for the rest of the run. */
export function takeCard(state: CombatState, player: PlayerState, kind: CardKind) {
  state.items.cards.add(kind);
  player.cards = state.items.cards;
  state.events.push('cardTaken', CARD_KINDS.indexOf(kind), player.pos.x, player.pos.y + 1, player.pos.z);
}

/** Collector: the uses a new `kind` you get comes with (drops, chests, the shop). Update 0.2.19 — Rust (a Death Card):
 *  fewer. */
export function newUses(state: CombatState, kind: WeaponKind): number {
  const uses = WEAPON_STATS[kind]().uses * (holds(state, 'collector') ? 1 + CARDS.v.collector : 1) * (holds(state, 'rust') ? 1 - CARDS.v.rust : 1);
  return Math.max(1, Math.round(uses));
}
