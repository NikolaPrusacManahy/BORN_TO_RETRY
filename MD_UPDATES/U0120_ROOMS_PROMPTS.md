# Update 0.1.20 — signs, challenge rooms, item cards, [E] prompts

Status: built (2026-10-29). The designer, with a screenshot of a corridor leading to an arched doorway:
- "can we have like a text just above the room entrance saying either Room, Challenge, Shop, Boss"
- "A room is the usual thing, a challenge room has 6 more enemies of the norm and has a guaranteed 2 mini boss and a
  chest is guaranteed, the mini boss drop only either a white key or a gold key. It is a challenging run but rewarding
  if mastered"
- "I need a feature that allows players to see what they are about to pick up. Just walking close to an item displays
  an overlay near the object stating what it is and what it does, with the appropriate rarity if applicable"
- "You need to display [E] to interact or pick up - none of it is displayed"
- "Same with execution [E] TO EXECUTE, capital to show it"

## Signs
- Over every doorway into a room, on the corridor's side, a word: **ROOM** (a fight room), **CHALLENGE**, **SHOP**,
  **BOSS**. None on the start room's doorways (you begin in it).
- On the wall over the arch, 4.85 m up, as wide as the arch (3.6 m). The HUD's display face (Anton) with a dark edge:
  ROOM ivory, CHALLENGE fire orange, SHOP gold, BOSS crimson. Unlit, so it reads in the shade.

## The challenge room
- **One on every floor, off the way:** a dead end you choose to go into. It hangs off a fight room on the way (from the
  second); with no space there, off any room but the boss's.
- **6 more enemies** than a fight room as deep would have.
- **Always 2 mini bosses**, the floor's (the Yeti on floor 1; the Spider or Blue Demon on floor 2; the Spider or Ninja
  on floor 3): one in the first wave, one in the last. No others.
- **Always a chest.**
- **Its key is white or gold** (by their odds: about 5 white to 1 gold), never a normal key: one key from the room, the
  first mini boss killed, as in every room.
- Outlined in fire on the minimap.
- The rest of the floor is laid out as it would have been without it (its own seed).

## Item cards
- Near an item, the nearest within **4 m**, a card hangs over it:
  - its **name** in its rarity's colour;
  - its **rarity** (common, uncommon green, rare blue, epic purple, mythic red);
  - **what it does**, with the numbers as set (a heart: "Heals 50% of your health."; the red ring: "+15 max
    health."; a white key: "Opens a chest: rare loot or better."; a weapon: what it does and its uses).
- On the shop's tiles, over a chest's item, on weapons and items on the floor (keys, kill bonuses).
- Rarity: a chest's tiers; the rest by where they stand among them (the Hammer and the normal key common, the Dual
  Daggers and the white key rare, the gold key epic); the kill bonuses have none.

## [E] prompts
- In reach, the card says what E does: **[E] to buy**, **[E] to pick up**.
- In front of a chest: **[E] to open**; with no key, **Needs a key**.
- Over an enemy you can execute, over its skull: **[E] TO EXECUTE**, crimson capitals, beating with it.
- The key shown is the one Interact is bound to.
- The prompt is about what E would do right now, in the order the game takes E: a chest's item, a chest, a shop tile,
  an execution, a weapon on the floor.
- Hidden while paused, dead, in the boss room's show or holding an execution.

## (placeholders)
- One challenge room a floor; one key from it (F1 → Rooms: "Challenge: keys"); 6 more, 2 mini bosses (also there).
- The 4 m for the card; the sign's height and size; the words' colours.
