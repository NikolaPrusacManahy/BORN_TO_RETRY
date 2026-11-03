# Update 0.3.27 — the rooms' new rules, the chests' cards and auras, Frozen Depths, the dash bars, floor 2's loop

Status: built (2026-11-03). The designer's list, after 0.3.26.

## Floor 2: the count looping back
The designer: "the enemy count would loop back to 2 after killing the last enemy and spawns them again, back 0 then
loop to 2 and spawn enemies, I think it lasted 3 times before it actually ended the room". The Venom Garden's hives
kept letting wasps out after the room's own enemies were all dead: each tick the hives went first, so as you killed
the last wasps two more came out, until every hive was empty. Now a room's hives let wasps out only while its own
enemies are still coming or fighting; once they're all down, the wasps already flying are the last
(`sim/dungeon/roomLoop.ts`, `hives.ts` `flyingWasps`).

## The rooms' new rules
- "we do not increases the amount of enemies in each room every 2 floors anymore, start with 8 and each rooms
  increases the count by 2": **8, 10, 12, 14, 16, 18** along the way, on every floor (was 8 + 3 a room + 2 every two
  floors). A challenge room: its count plus Challenge extra (6), as before.
- "there is only 4 main room, 1 challenge room, 1 shop, boss room. No more 5 main room": **4 fight rooms on the way**
  (was 5).
- "the amount of room needed to pass increases by 1 every 4 floors, starting by floor 4 - 8, and remain the same until
  10": **4 on floors 1–3, 5 on floors 4–7, 6 on floors 8–10** (was one more every 2 floors).
- F1 → Rooms: Per room deeper 2; Rooms on the way 4; One more room every 4. The two knobs for the floors' extra
  enemies are gone. (`tuning/rooms.ts`, `sim/dungeon/wavePlan.ts` `roomCount`, `world/dungeon/floorPlan.ts`
  `pathFights`.)

## Fate Cards: a challenge room's chest and the boss's only
"no more Card drops in chests that are not a challenge room chest", then "Boss chest gives cards too": only a
challenge room's chest (with its loot, as since 0.2.25) and the boss's (not on the run's last floor, as before) deal
Fate Cards. A chest opened with a key no longer deals them one time in four (the Deal chance knob is gone). The shop's
Fate Card is unchanged. (`sim/dungeon/treasure.ts`: `Chest.challenge`.)

## The auras
- "challenge room chest have now a Red aura on them" (the rules unchanged): a challenge room's chest glows **red**.
- "Make Gold aura and red aura on chest better visually, more visible and impressive": both are far bigger now
  (`engine/chestAura.ts`, out of `treasureFx.ts`): a **column of light** rising out of the chest (4.4 m, bright at its
  foot, in shafts turning slowly), a brighter **halo** with a hot core that pulses, a wider **pool** of light on the
  floor (4.4 m), **rings of light running out** across the floor every 0.9 s, and **motes drifting up** round it. All
  made in code. It comes up with the chest and fades as the lid lifts, as before; gold chests and the boss's still
  don't glow.

## Frozen Depths
- "Do not make the enemies in Frozen Depths slide on ice at all": on ice and rime they move as on stone. A body
  knocked across the ice no longer slides far (the Ice slide knob is gone); the **Raider's** slide stops 1.5 m past
  where you stood on ice too; the **Berserker's** spin no longer skids; the **Frost Roc's** belly slide stops 5 m past
  you on ice too. A wall still dazes the Raider and stuns the Roc when they meet it fast (stand with your back to one).
  You still slide on the ice; only they don't.
- "make them 50% faster in speed": the Raider 6.9, the Axe Thrower 6, the Völva 4.8, the Berserker 6 (his spin's drift
  7.5, so he's no slower spinning than walking), and the Frost Roc's walk 4.8.
- "70% speed increase on the blue enemies … they are very slow": the Draugr and the Barrow Maid 4.4 (were 2.6), and
  Haugbui 3.7 (was 2.2).
- Health unchanged (never tankier). **(placeholders, F1 → Frozen warband, Frost Roc)**

## The dash bars
"the UI when we have 5 dashes, little tweaking please": more than three dash charges share the Execution meter's width
(300 px) under it, each narrower (5: about 50 px each), so the row and its key no longer run past the meter or into
the health on the left. Up to three, as before. (`ui/theme/theme-03-hud.css`, `screens/Hud.tsx`.)

## What was built
`sim/dungeon/roomLoop.ts`, `hives.ts`, `wavePlan.ts`, `treasure.ts`; `tuning/rooms.ts`, `cards.ts`, `frozen.ts`,
`foesNorse.ts`, `foesNorseB.ts`, `frostRoc.ts`; `world/dungeon/floorPlan.ts`; `sim/enemies/flight.ts`, `tick.ts`,
`update.ts`, `raider.ts`, `berserker.ts`, `frostRoc.ts`; `sim/lab/labCommands.ts`; `engine/chestAura.ts` (new),
`treasureFx.ts`, `treasureView.ts`, `level.ts`; `screens/Hud.tsx`; `ui/theme/theme-03-hud.css`. Tests:
`test-venom.ts` (the loop), `test-dungeon.ts`, `test-challenge.ts`, `test-floor3-executions.ts`, `test-boss-room.ts`,
`test-floor5.ts`, `test-floor6.ts` (the counts),
`test-cards.ts`, `test-chest-pan.ts`, `test-rewards.ts`, `test-gold-chests.ts` (the cards, the red aura),
`test-floor7.ts`, `test-floor7-warband.ts`, `test-frost-roc.ts`, `test-floor8.ts` (no sliding), `test-hud-controls.ts`
(the dash bars).

## Checked without a browser
Tests: the hives let none out once the room's own are down, and the room is won (without the fix the test fails); the
counts and rooms on every floor; only a challenge room's chest and the boss's deal (not the run's last boss); the red aura and the aura's parts;
no sliding on ice for the Raider, the Berserker, the Roc or a knocked body; walls still daze and stun; the dash row no
wider than the meter for 3 to 6 charges. **Not yet seen in the game**: the new auras' look, the dash bars, the faster
warband's feel.
