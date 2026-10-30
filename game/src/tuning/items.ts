// Update 0.0.13 — the shop and the chests (the designer): what each item does and costs, and what a chest holds.
// The designer's numbers: every item 70 coins; the heart heals half your health; the silver armour plate gives a
// shield of half your health; the gold sword lasts 40 hits; the red ring +25% damage; the blue ring +20% speed; a key
// opens a chest; a chest holds 50–80 coins, a plate, a heart or a ring. The rest are placeholders.
// Update 0.0.16 (the designer): chest loot by rarity — common 45% (coins: 20, 35, 45 or 70), uncommon 30% (a heart or a
// plate), rare 15% (the gold sword), epic 8% (a ring), legendary 2% (nothing yet: an epic instead). Keys: normal 70%,
// white 25%, gold 5% (in the shop, and what a Yeti drops).
// Update 0.0.17 (the designer): chest coins 10, 20, 30 or 40; the silver plate gives 20 shield, the gold armour 40; the
// red ring +15 max health, the purple ring +25% damage, the green ring +15% melee attack speed, the blue ring +15% run
// speed (rings last the run).
// Update 0.0.18 (the designer): prices by how good the item is — a normal one 50, a better version 70, the best 100
// (the silver plate 50 and the gold armour 70; the keys 50, 70, 100) — and 15% more on every floor down.
// Update 0.1.10 (the designer's sort): a price for each item (45, 65, 80, 100, 110 on floor 1, still 15% more every
// floor down); chests common (coins, a heart, the silver plate), uncommon (the gold armour, the Great Heart), rare (the
// gold sword, every ring), epic (the Gold Axe or the Gold Hammer, and 60 coins), mythic (the Gold Daggers or the
// Grimoire, and 100 coins; it replaces legendary, its colour red); the purple ring +20% damage.
// Update 0.2.1 (the designer: "too unbalanced for lucky players") — no coins with an epic or mythic chest's item.
import { group, knob } from './schema';

const price = (def: number, what: string) => knob(def, 0, 500, 5, `Price: ${what}`, `Coins for ${what} on floor 1.`);

export const ITEMS = group('items', 'Shop & chests', {
  priceHeart: price(45, 'a heart'),
  pricePlate: price(45, 'the silver armour plate'),
  priceHammer: price(45, 'the Hammer'),
  priceKey: price(45, 'a key'),
  priceRedRing: price(65, 'the red ring'),
  priceBlueRing: price(65, 'the blue ring'),
  priceGreenRing: price(65, 'the green ring'),
  priceDaggers: price(65, 'the Dual Daggers'),
  priceWhiteKey: price(65, 'a white key'),
  priceGoldSword: price(80, 'the gold sword'),
  priceGoldPlate: price(80, 'the gold armour'),
  priceGoldKey: price(80, 'a gold key'),
  priceGoldHammer: price(100, 'the Gold Hammer'),
  priceGoldAxe: price(100, 'the Gold Axe'),
  priceGrimoire: price(110, 'the Grimoire'),
  priceGoldDaggers: price(110, 'the Gold Daggers'),
  priceTealRing: price(110, 'the teal ring (the Gold Daggers\' price: the designer)'),
  priceGreatHeart: price(90, 'the Great Heart (not sold: chests only)'),
  priceRise: knob(0.15, 0, 1, 0.01, 'Price rise', 'Prices go up this share on every floor down (0.15: +15%, on top of the last).'),
  heartHeal: knob(0.5, 0.05, 1, 0.05, 'Heart heal', 'Share of max health a heart heals.'),
  greatHeartHeal: knob(1, 0.05, 1, 0.05, 'Great Heart heal', 'Share of max health the Great Heart (a chest\'s better heart) heals.'),
  silverShield: knob(20, 1, 200, 1, 'Silver plate shield', 'Shield points the silver armour plate gives.'),
  goldShield: knob(40, 1, 200, 1, 'Gold armour shield', 'Shield points the gold armour gives.'),
  shieldMax: knob(1, 0.25, 2, 0.05, 'Shield cap', 'Most shield you can carry, as a share of max health.'),
  // (Update 0.1.10 — the designer: 30, was 40.)
  goldSwordUses: knob(30, 5, 200, 1, 'Gold sword hits', 'Uses of the gold sword.'),
  redRingHp: knob(15, 0, 100, 1, 'Red ring health', 'Extra max health per red ring.'),
  // Update 0.2.0 — the teal ring (the designer: "increases Health by 25 and is Mythic"; the purple ring's +20% damage
  // is gone: "no more damage increases").
  tealRingHp: knob(25, 0, 100, 1, 'Teal ring health', 'Extra max health per teal ring.'),
  greenRing: knob(0.15, 0, 1, 0.05, 'Green ring attack speed', 'Faster melee attacks per green ring (0.15: +15%).'),
  blueRing: knob(0.15, 0, 1, 0.05, 'Blue ring speed', 'Extra run speed per blue ring (0.15: +15%).'),
  buyReach: knob(1.6, 0.5, 4, 0.1, 'Buy reach', 'How close to an item (m) E buys it.'),
  chestReach: knob(2, 0.8, 4, 0.1, 'Chest reach', 'How close to a chest (m) E opens it.'),
  chestTime: knob(1.3, 0.5, 3, 0.05, 'Chest opening', 'Seconds you kneel and lift the lid.'),
  chestRise: knob(1.4, 0.2, 5, 0.1, 'Chest rising', 'Seconds a chest takes to rise out of the floor once its room is won.'),
  common: knob(45, 0, 100, 1, 'Chest: common', 'Weight of a common chest (coins, a heart or the silver plate).'),
  uncommon: knob(30, 0, 100, 1, 'Chest: uncommon', 'Weight of an uncommon chest (the gold armour or the Great Heart).'),
  rare: knob(15, 0, 100, 1, 'Chest: rare', 'Weight of a rare chest (the gold sword or a ring).'),
  epic: knob(8, 0, 100, 1, 'Chest: epic', 'Weight of an epic chest (the Gold Axe or the Gold Hammer).'),
  mythic: knob(2, 0, 100, 1, 'Chest: mythic', 'Weight of a mythic chest (the Gold Daggers, the Grimoire or the teal ring).'),
  coins1: knob(10, 0, 300, 5, 'Chest coins 1', 'Coins in a common or a gold chest: one of the four amounts.'),
  coins2: knob(20, 0, 300, 5, 'Chest coins 2', 'Coins in a common or a gold chest: one of the four amounts.'),
  coins3: knob(30, 0, 300, 5, 'Chest coins 3', 'Coins in a common or a gold chest: one of the four amounts.'),
  coins4: knob(40, 0, 300, 5, 'Chest coins 4', 'Coins in a common or a gold chest: one of the four amounts.'),
  keyOdds: knob(70, 0, 100, 1, 'Key: normal', 'Weight of a normal key (shop, Yeti).'),
  whiteKeyOdds: knob(25, 0, 100, 1, 'Key: white', 'Weight of a white key: no common or uncommon loot.'),
  goldKeyOdds: knob(5, 0, 100, 1, 'Key: gold', 'Weight of a gold key: only epic or mythic loot.'),
});
