# Update 0.1.10 — weapon uses, the Gold Hammer and the Gold Daggers, the shop and the chests

Status: built (2026-10-29), from the designer's list:
- "Daggers limit is 30; normal sword is 10; golden sword is 30; hammer is 15; golden hammer is 35; golden dagger is 90."

## Uses
| Weapon | Uses | Was |
|---|---|---|
| Sword (grunts' drop, the Lab's stand) | **10** | 4 |
| Gold Sword | **30** | 40 |
| Hammer | **15** | 20 |
| Gold Hammer (new) | **35** | |
| Dual Daggers | **30** | 100 |
| Gold Daggers (new) | **90** | |
| Gold Axe, Grimoire | 30, 25 (unchanged) | |

## The Gold Hammer and the Gold Daggers
- The pack's `Hammer_Double_Golden` and `Dagger_Golden`, the same shapes as the silver ones, exported with the same
  settings (`gold_hammer.glb`, `gold_dagger.glb`), so the same grips, moves and numbers. Only their uses differ.
- The Gold Daggers' thrown daggers fly gold.
- In `items.glb` (`item_goldHammer`, `item_goldDaggers`); a gold slot icon each.

## The designer's sort (after a list of every object in the game)
**Shop** (floor 1; every floor down +15%, as before):
| Price | Items |
|---|---|
| 45 | Heart, silver armour plate, Hammer, key |
| 65 | Every ring, Dual Daggers, white key |
| 80 | Gold sword, gold armour, gold key |
| 100 | Gold Hammer, Gold Axe |
| 110 | Grimoire, Gold Daggers |
- Each item has its own price (Shop & chests tab); the old grades (50, 70, 100) are gone.
- The heart and the plate are still always there; the other three tiles are drawn from everything else above,
  the Gold Hammer and Gold Daggers included. A key tile is a normal, white or gold key by its odds.

**Chests**, by rarity (the weights unchanged: 45, 30, 15, 8, 2):
| Rarity | Holds |
|---|---|
| Common | Coins (10, 20, 30 or 40), a heart or the silver plate |
| Uncommon | The gold armour or the **Great Heart** |
| Rare | The gold sword or a ring (any of the four) |
| Epic | The Gold Axe or the Gold Hammer, **and 60 coins** |
| Mythic | The Gold Daggers or the Grimoire, **and 100 coins** |
- **Mythic replaces legendary**, its light **red**. A white key gives rare or better; a gold key epic or mythic.
- The Hammer, the Dual Daggers and the keys are in no chest now.

**Items:**
- **The Great Heart** ("a better healing heart"): a chest's heart (uncommon), it **heals all your health**. The
  heart, bigger (0.6 m) and crimson, in a pink glow (`item_greatHeart`).
- **Rings:** all rare in chests; the red ring +15 max health (as it was), the **purple ring +20% damage** (was 25%).

## (placeholders)
- The Great Heart heals fully; its look; its price if it's ever sold (90).
- A common chest's three (coins, a heart, the plate) come up alike.
- The gold weapons' damage is the silver ones'; only the uses differ, as with the Gold Sword.
