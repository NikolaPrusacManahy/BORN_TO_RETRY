# Update 0.2.25 — floor 3's crowded rooms opened up; chests give loot and cards

Status: built (2026-11-01). The designer, after playing floor 3.

## Floor 3's crowded rooms
- The designer (a screenshot of the tomb hall): "In floor 3, many enemies can't navigate through this room or any room
  with a lot of these blocks or pillars, they are having a rough time."
- **Why:** the tomb hall had 128 cells of tombs and columns in rows a single cell (2 m) apart, and the ossuary had its
  graves in alcoves 2 m wide: 48 such lanes each, where every other floor 3 room had none. A Big Mushnub is over 2 m
  wide, so it wedged in them, and a crowd jams a 2 m lane.
- **Now:** the tomb hall has fewer tombs (16 pairs, was 32), at least 4 m apart; the ossuary has no alcoves: its
  graves round a pit of fire in the middle (a causeway across it, walls in it to wall-run). `test-bone.ts` checks that no
  floor 3 room has a lane between blocks narrower than 4 m.
- `tools/nav-probe.ts` (new): sends a floor's enemies across each room to you and prints how many got there.

## Chests: loot, and cards as a bonus
- The designer: "in chest, I want players to get the normal loot in there and the card is like a bonus that can proc
  … while having the loot taking in mind"; "in challenge room, you get loot and also cards guaranteed".
- **A chest always gives its loot** (its item and coins). A chest opened with a key **also** deals Fate Cards 25% of
  the time (Deal chance, F1 → Cards; it used to deal them *instead* of its loot). A gold chest still never deals.
- **A challenge room's chest gives its loot and a deal, every time.** Its gates open once the card is taken and its
  item picked up.
- A boss's chest: as before (its coins, key and heart, and a deal).

## What was built
`world/dungeon/boneRooms.ts` (the tomb hall, the ossuary), `sim/dungeon/treasure.ts` (`giveLoot`: no loot replaced),
`tuning/cards.ts` (Deal chance's words), `tools/nav-probe.ts`. Tests: `test-bone.ts` (lanes), `test-cards.ts`,
`test-rewards.ts`.
