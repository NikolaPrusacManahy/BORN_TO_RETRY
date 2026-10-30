# Update 0.2.1 — rising chests everywhere, gold chests, fewer coins, a keyed chest's aura, 10 at once

Status: built (2026-10-30). The designer's list:
- "let's remove the coins from epic and Mythic chests, too unbalanced for lucky players"
- "reduce the coins gained by bosses to 15 coins"
- "every chest that are located in rooms now does the cinematic pov panning to chest locations as it emerge from the
  ground"
- "every time a normal room without any key drops enemy - mini boss, the chest can be opened with no key, players just
  gets gold"

Then, before it was committed (same update):
- "Can you add an aura around the chests that needs a key? like a gold aura? , little bit"
- "challenge room does want less than 10 enemies at the same time, put 10 enemies at the same time, and it adds a new
  one from the counter when it gets reduced to 9, like the same logic but making this room harder on purpose"

## Chests rise in every room
- A fight room's chest isn't there while the room fights. As the room is won, the gates open and the chest **rises out
  of the floor**; the view goes to it and comes back to you (3.2 s, the letterbox; you don't move meanwhile), as the
  challenge room's does.
- Only the challenge room holds you until its reward is taken; any other room's gates open at once.
- The boss's chest is as in 0.2.0 (seen in the wooden gate's shot).

## Gold chests
- A chest in a room with **no mini boss** (nothing there drops a key) is a gold chest: **no key opens it**, E alone
  does, and the keys you carry stay yours.
- It gives **gold only**: 10, 20, 30 or 40 coins (a common chest's amounts).
- A chest in a mini boss's room still needs a key (the mini boss drops it); the challenge room's too (it gives you its
  keys).

## Coins
- An epic or mythic chest gives its item only (it gave 60 or 100 coins with it).
- A boss's chest gives **15 coins** (the Demon's was 30, the Dragon's 40); its key and heart as before.

## A keyed chest's gold aura
- A chest a key opens (a mini boss's room's, the challenge room's) glows **soft gold** while it's shut: a faint halo
  round it and a pool of light on the floor under it, breathing slowly.
- It comes up out of the floor with the chest and fades as the lid lifts. Gold chests and the boss's chest don't glow.

## The challenge room: 10 at once
- It opens with **10 enemies** (its first wave, if that's more) and keeps **10 fighting** while it has more to send:
  when one dies and 9 are left, the next comes from the counter (one every Reinforcement gap, as in any room).
- Any other room keeps 5, as before. The challenge room's count is as before (a room as deep + 6, 2 mini bosses).

## (placeholders)
- The gold chest's amounts (the common chest's four, Chest coins 1–4 in F1).
- The aura's strength (judged on a stand-in render, not in the game). Challenge: on field (10, F1 → Rooms).
