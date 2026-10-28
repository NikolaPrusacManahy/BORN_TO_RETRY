# M3, fourth slice — Update 0.0.16: keys, loot by rarity, the Yeti's key, a shuffled shop

Status: built (2026-10-28), from the designer's list:
- The Yeti (mini boss) drops a key. A room that has a Yeti must have a chest, and the Yeti drops a key every time.
- With two or more Yetis in a room, there is still only one key drop per room, whichever Yeti drops it.
- Chests hold much more:
  - Common: gold (20, 35, 45 or 70).
  - Uncommon: a heart or a shield.
  - Rare: the gold sword.
  - Epic: rings.
- A light effect as a chest opens, by rarity: none for common, green for uncommon, blue for rare, purple for epic, yellow for legendary (no legendary items exist yet).
- Rarity odds: common 45%, uncommon 30%, rare 15%, epic 8%, legendary 2%.
- New items: the white key and the gold key, dropped by the mini boss.
  - A white key never gives common or uncommon loot.
  - A gold key gives only epic or legendary loot.
- In front of a chest, an interface lets the player pick the key to use.
- An open-palm animation holds the key as the player is about to open a chest, to show which key will be used.
- The shop's five items shuffle so players get different offers. The heart and the armour are always there.
- Key odds in the shop: normal 70%, white 25%, gold 5%. All cost the same.
- Keys float on the shop's tiles and turn.
- The white key has a blue aura and the gold key a yellow one.

## Loot (`sim/dungeon/loot.ts`; Shop & chests tab)
| Rarity | Weight | Holds | Light |
|---|---|---|---|
| Common | 45 | 20, 35, 45 or 70 coins (alike) | none |
| Uncommon | 30 | a heart or an armour plate (alike) | green |
| Rare | 15 | the gold sword | blue |
| Epic | 8 | a ring, red or blue (alike) | purple |
| Legendary | 2 | nothing yet: gives an epic instead | yellow (unused until there are legendary items) |

- Which rarities each key can give:
  - **Normal key:** all of them.
  - **White key:** rare, epic, legendary (weights 15 : 8 : 2).
  - **Gold key:** epic and legendary (all epic for now).
- Each chest's three rolls are made when the floor is laid out. The same chest opened with the same key always gives the same thing (seeded).
- As the lid comes up:
  - a coloured light and a column of glow rise from the chest;
  - more sparks the rarer the loot;
  - a chime with one note more for each rarity above common.
- The old chest knobs (coins 50–80, coin odds) are gone.

## Keys
- **Three kinds:** the normal key, the white key (pale silver in a blue aura) and the gold key (gold in a yellow aura). They are the RPG pack's key, recoloured in code (`engine/keyLooks.ts`).
- **Shown standing on end everywhere:** on the shop's tiles (floating and turning), on the floor, flying to you, in your hand.
- **HUD:** each kind beside your coins (the white and gold keys glow).
- **At a chest** (in front of it, with keys, its room not fighting):
  - Your keys show in a row low in the middle; the one you'll use is raised and lit.
  - **Switch key** (a new action, mouse wheel down by default, rebindable) goes to the next kind you carry.
  - E opens the chest with it.
  - **(placeholder: the normal key is picked first; switching goes normal → white → gold)**
- **The open palm:**
  - The left hand comes up into view, turns palm up toward you and opens (the fingers and thumb untuck), with the picked key lying on it in its aura. With a sword in hand, the left arm comes up the same way.
  - Switching swaps the key on the palm.
  - Kneeling to open the chest, the hand closes and goes back, and both fists take the lid.
  - The arms model's finger bones are turned back by the curl the arms pipeline baked in (`ArmsRig.openHand`).
  - Checked in renders of the game's own arms code (`tools/view-shots.ts`: `palm-key`, `palm-white`, `palm-gold-armed`).

## The Yeti's key
- Each fight room's waves are now planned when the floor is laid out (`sim/dungeon/wavePlan.ts`, the room's own seed), so the floor knows which rooms hold a Yeti (the brute).
- **Every room with a Yeti gets a chest.** One more chest stands in another fight room, sometimes two (35%), opened with keys from elsewhere. On floor 3 a Yeti can be in every fight room, leaving no room for the extra. **(placeholder)**
- In a Yeti room, the first Yeti killed drops a key where it fell: normal, white or gold by the same odds as the shop. **(placeholder: the drop's odds)**
  - Other Yetis in that room drop none.
  - The key floats and turns there until you walk over it.
- The waves themselves are bought as before (same budgets, kinds and weights). They come from the plan instead of being bought as you walk in, so the same seed gives the same rooms whatever order you clear them in.

## The shop
- **The heart and the armour plate always.** The other three tiles are drawn from the gold sword, the red ring, the blue ring and a key. The key is normal 70%, white 25% or gold 5%, all at 70 coins. The five are shuffled across the tiles.
- **A key is no longer always on offer** (keys come from Yetis now). **(placeholder)**

## Tests
- **`test-keys.ts`:**
  - **Loot over 20 000 chests:** the rarity shares, every item, the four coin amounts; the white key never gives common or uncommon; the gold key gives only epic.
  - **Picking a key at a chest:** the first pick; switching round the keys you carry; E uses the picked key; its loot.
  - **The shop:** heart and plate always, at most one key, the key odds, the shuffle.
  - **The Yeti:** its room has a chest; one key a room; you take it by walking over it.
  - **The palm:** the hand opens, the key lies on the palm in view, all three keys the same size, the hand closes again.
- **`test-shop.ts`:** updated for the shop's heart and plate, chests in Yeti rooms, and loot by rarity.
