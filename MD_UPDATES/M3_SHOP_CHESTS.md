# M3, second slice — Update 0.0.13: the shop, chests, and rooms twice the size

Status: built (2026-10-28), from the designer's list:
- Make the rooms twice as big: more walls to use and more room to fight in.
- At least three more enemies: at least two flying, and another on the ground that causes problems (see `M2_COMBAT_SANDBOX.md`, third slice).
- No more healing from hits; only heal from the shop.
- A shop: a room with five floor tiles showing five things to buy.
- The heart heals 50%. The silver armour plate is a 50% shield (a blue bar, extra defence). The gold sword lasts 40 hits. The ring with a red gem gives +25% damage; the ring with blue gems +20% speed. A normal key opens a chest found in some rooms. Everything costs 70 coins.
- Some rooms hold a chest, opened with a key: as the player walks up, they crouch and open it with their hands.
- A chest holds 50–80 coins, a silver plate, a heart or any ring.

## Rooms twice the size
- The nine fight rooms are redrawn at twice the width and length: 24–36 cells (48–72 m) a side. Each is drawn as its top-left quarter in `game/src/world/dungeon/fightRooms.ts`, then mirrored right and down.
- More long inner walls (to wall-run along and hide behind), ledges, and pads to launch a slam from.
- The start room is 12 × 12 cells and the exit room 16 × 16. **(placeholder)**
- Each column of the floor's board is as wide as its widest room, and each row as tall as its tallest. This keeps corridors short between rooms of different sizes (at least 8 m).
- Room budgets grow with the rooms: 6 + 3 × depth + 4 × (floor − 1), in 2 waves (3 waves from a budget of 18). **(placeholder)**
- The fog starts at 20 m and ends at 95 m, there are eight torch lights, and the minimap shows twice the area.

## Healing
- No blood heal (the designer). You heal only from a heart: bought in the shop or found in a chest.

## The shop
- One per floor: a side room off the second to fourth fight room on the way **(placeholder)**, gold on the minimap. It never fights.
- Five display tiles (a gold-rimmed marble slab each). An item turns above each tile with its price over it; the price is red when you can't pay.
- Six items, five tiles: the key is always offered (every floor has a chest), plus four of the other five, chosen by the floor's seed. **(placeholder)**
- Stand by a tile and press E (the design's "pick up, buy, open"). You need 70 coins, and the item must do something (no heart at full health, no plate with a full shield). Otherwise a buzz, and nothing is taken.
- A bought item flies into you and its tile is left bare.

| Item | Model (Ultimate RPG Pack) | Does |
|---|---|---|
| Heart | Heart | Heals half your health |
| Silver armour plate | Armor_Metal2 | A shield of half your health: a blue bar above the health bar that takes hits before your health does. At most a full bar (two plates). **(placeholder)** |
| Gold sword | Sword_Golden | The sword's moves and damage, 40 uses, into your hand (your weapon drops at your feet) |
| Ring with a red gem | Ring3 | +25% damage on every hit you land; rings stack. **(placeholder: stacking)** |
| Ring with blue gems | Ring5 | +20% run speed (running, the air, the slide; not the dash). **(placeholder: what it speeds)** |
| Key | Key1 | Opens a chest |

## Chests
- One on every floor, sometimes two (35%), each in a different fight room. It stands at one of the room's chest spots, against a wall. **(placeholder)**
- The chest is the Modular Dungeon Pack's (part 1), with a hinged lid. It has a solid box the size of the model.
- With a key, press E in front of it once its room isn't fighting. You kneel:
  - you're eased onto the spot in front of it;
  - the view lowers and turns down to it;
  - both fists reach for the lid's front edge and lift it as it swings up;
  - what's inside comes out as the lid is up.
- The opening takes 1.3 s; you don't move or fight meanwhile. Without a key, the lid rattles.
- A chest holds 50–80 coins (they burst out and fly to you), a silver plate, a heart, or a ring (red or blue). Odds: coins 40%, the rest alike. **(placeholder)**

## What you carry
- Keys and rings show beside your coins.
- Your shield, keys and rings go down to the next floor with you. Dying loses them, like your coins.

## Tests
- `test-shop.ts` covers:
  - every floor's shop: five tiles, always a key;
  - one or two chests, each in a fight room with room to kneel;
  - buying: with and without the coins, nothing twice, no use;
  - what each item does (the shield; rings through a real jab and a real run);
  - chests: no key, a room fighting, the kneel, the loot and its timing, the odds;
  - the models;
  - the view: offers, sold tiles, the lid opening and its edge rising;
  - the game's own arms putting both fists on the lid's edge on screen.
- `test-health.ts`: the shield, and no blood heal.
- `test-dungeon.ts`: rooms twice the size, chest spots, the shop on every floor.
