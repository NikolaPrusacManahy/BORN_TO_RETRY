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
import { group, knob } from './schema';

export const ITEMS = group('items', 'Shop & chests', {
  price: knob(70, 0, 500, 5, 'Price', 'Coins for anything in the shop.'),
  heartHeal: knob(0.5, 0.05, 1, 0.05, 'Heart heal', 'Share of max health a heart heals.'),
  silverShield: knob(20, 1, 200, 1, 'Silver plate shield', 'Shield points the silver armour plate gives.'),
  goldShield: knob(40, 1, 200, 1, 'Gold armour shield', 'Shield points the gold armour gives.'),
  shieldMax: knob(1, 0.25, 2, 0.05, 'Shield cap', 'Most shield you can carry, as a share of max health.'),
  goldSwordUses: knob(40, 5, 200, 1, 'Gold sword hits', 'Uses of the gold sword.'),
  redRingHp: knob(15, 0, 100, 1, 'Red ring health', 'Extra max health per red ring.'),
  purpleRing: knob(0.25, 0, 1, 0.05, 'Purple ring damage', 'Extra damage per purple ring (0.25: +25%).'),
  greenRing: knob(0.15, 0, 1, 0.05, 'Green ring attack speed', 'Faster melee attacks per green ring (0.15: +15%).'),
  blueRing: knob(0.15, 0, 1, 0.05, 'Blue ring speed', 'Extra run speed per blue ring (0.15: +15%).'),
  buyReach: knob(1.6, 0.5, 4, 0.1, 'Buy reach', 'How close to an item (m) E buys it.'),
  chestReach: knob(2, 0.8, 4, 0.1, 'Chest reach', 'How close to a chest (m) E opens it.'),
  chestTime: knob(1.3, 0.5, 3, 0.05, 'Chest opening', 'Seconds you kneel and lift the lid.'),
  common: knob(45, 0, 100, 1, 'Chest: common', 'Weight of a common chest (coins).'),
  uncommon: knob(30, 0, 100, 1, 'Chest: uncommon', 'Weight of an uncommon chest (a heart or a plate).'),
  rare: knob(15, 0, 100, 1, 'Chest: rare', 'Weight of a rare chest (the gold sword or the gold armour).'),
  epic: knob(8, 0, 100, 1, 'Chest: epic', 'Weight of an epic chest (a ring: red, blue, green or purple).'),
  legendary: knob(2, 0, 100, 1, 'Chest: legendary', 'Weight of a legendary chest (none yet: an epic instead).'),
  coins1: knob(10, 0, 300, 5, 'Chest coins 1', 'A common chest holds one of the four amounts.'),
  coins2: knob(20, 0, 300, 5, 'Chest coins 2', 'A common chest holds one of the four amounts.'),
  coins3: knob(30, 0, 300, 5, 'Chest coins 3', 'A common chest holds one of the four amounts.'),
  coins4: knob(40, 0, 300, 5, 'Chest coins 4', 'A common chest holds one of the four amounts.'),
  keyOdds: knob(70, 0, 100, 1, 'Key: normal', 'Weight of a normal key (shop, Yeti).'),
  whiteKeyOdds: knob(25, 0, 100, 1, 'Key: white', 'Weight of a white key: no common or uncommon loot.'),
  goldKeyOdds: knob(5, 0, 100, 1, 'Key: gold', 'Weight of a gold key: only epic or legendary loot.'),
});
