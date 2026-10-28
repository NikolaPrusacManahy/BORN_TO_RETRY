// Update 0.0.13 — the shop and the chests (the designer): what each item does and costs, and what a chest holds.
// The designer's numbers: every item 70 coins; the heart heals half your health; the silver armour plate gives a
// shield of half your health; the gold sword lasts 40 hits; the red ring +25% damage; the blue ring +20% speed; a key
// opens a chest; a chest holds 50–80 coins, a plate, a heart or a ring. The rest are placeholders.
import { group, knob } from './schema';

export const ITEMS = group('items', 'Shop & chests', {
  price: knob(70, 0, 500, 5, 'Price', 'Coins for anything in the shop.'),
  heartHeal: knob(0.5, 0.05, 1, 0.05, 'Heart heal', 'Share of max health a heart heals.'),
  plateShield: knob(0.5, 0.05, 1, 0.05, 'Plate shield', 'Shield an armour plate gives, as a share of max health.'),
  shieldMax: knob(1, 0.25, 2, 0.05, 'Shield cap', 'Most shield you can carry, as a share of max health.'),
  goldSwordUses: knob(40, 5, 200, 1, 'Gold sword hits', 'Uses of the gold sword.'),
  redRing: knob(0.25, 0, 1, 0.05, 'Red ring damage', 'Extra damage per red ring (0.25: +25%).'),
  blueRing: knob(0.2, 0, 1, 0.05, 'Blue ring speed', 'Extra run speed per blue ring (0.2: +20%).'),
  buyReach: knob(1.6, 0.5, 4, 0.1, 'Buy reach', 'How close to an item (m) E buys it.'),
  chestReach: knob(2, 0.8, 4, 0.1, 'Chest reach', 'How close to a chest (m) E opens it.'),
  chestTime: knob(1.3, 0.5, 3, 0.05, 'Chest opening', 'Seconds you kneel and lift the lid.'),
  chestCoinsMin: knob(50, 0, 300, 5, 'Chest coins (least)', 'Fewest coins a chest of coins holds.'),
  chestCoinsMax: knob(80, 0, 300, 5, 'Chest coins (most)', 'Most coins a chest of coins holds.'),
  chestCoinOdds: knob(0.4, 0, 1, 0.05, 'Chest: coins', 'Chance a chest holds coins; the rest is split between a plate, a heart and a ring.'),
});
