# Update 0.3.29 — the Moon's boss, Tidebreaker

Status: built (2026-11-03). The designer: "I bought the source files for the Higher quality enemies … I mainly want the
Big alien and the Demon with the blade right now … Alien as Moon boss & demon on floor 10 boss", then for this one:
"It's the last boss before the last boss, make sure it is intense and full destructions, maybe they can grab a pillar
or idk, can shake the whole place".

## The model
The Bestiary – Dungeon Monsters Kit's big alien, **Tidebreaker**
(`ASSETS/QUATERNIUS/High-quality-enemies`), blue (its second colour), its anchor in its right hand. The pack has no
animations: its clips are the **Universal Animation Library**'s (`ASSETS/QUATERNIUS/ULA 1`, `ULA 2`, the Source
versions, CC0), on the same 65-bone skeleton. `game/tools/ual_bake.py` (new, plain Python) bakes them onto the
monster's own GLB: each bone's turn carried over in world space from its own rest pose (Tidebreaker's legs and hips sit
up to 33° from the mannequin's), the pelvis's bob scaled to its leg, its anchor hand's fingers held closed (a sword
grip), its textures at 1024 px (JPEG colour and ORM, PNG normals). 24 clips, 3.6 MB
(`public/models/enemies/tidebreaker.glb`). The pack's own textures, as they come (the designer: "Do not texture them").
In the game it stands 5.4 m.

## The fight
Its arena is the Moon's own boss room now, **the shattered crater**: 60 m across, **twelve stone pillars** (four round
its middle, eight further out), moon rock and high cover, landing pads. It stomps at you; every pause (1.1 s) it picks a
move by where you are (never one three times running) and growls a warning:
- **Close:** its **anchor smash** (30; a shockwave runs out along the floor from where it hits: jump it; a pillar there
  snaps), a **combo** of two swings (20 each; raging, a third, the finisher, smashes too), its **uppercut** when you're
  right in front (18, and it throws you high: the moon lets you float down slowly).
- **Further:** its **moon leap** (up 13 m for 1.8 s, a ring on the floor where it'll land: 30 to you on the ground there,
  a shockwave, the pillars beside it snap, rock shaken down near you), the **boulder** it kneels and rips out of the
  floor and hurls high where you'll be (26 where it smashes), its **shell roll** (curled, 15 m/s, into you once each
  pass for 26, **smashing through every pillar in its way**, off the walls back at you three times, then it reels
  **dizzy** 2.6 s: your hits do more), and **a pillar torn out** (the designer's): it goes to a pillar near it, kneels and
  tears it out of the floor (its stump left), swings it down at you (34, reaching 9.5 m; it smashes the floor and any
  pillar there) and hurls it (32 where it smashes).
- **Below 55% it roars and rages:** quicker, rock comes down near you every few seconds, and its **quake** joins: its
  anchor brought down on the floor, **three rings rolling out one after another** (jump each), **every pillar within 9 m
  snapping**, ten rock shaken down all round you. **Below 22%, frenzied:** quicker still, rock twice as often, two
  more bounces to its roll.
- Its rock falls as the Moon's meteors do (their warning shadow, their strike), and it spares the boss.
- **The whole place shakes:** its quakes, its landings and its roar shake your view anywhere in its arena; its smash,
  the pillars and the boulder fling rock.
- 1900 health (the bosses' range: the Drowned King 2000), 15 coins in its chest; its death the bosses' show.
  **(placeholder numbers, F1 → Tidebreaker)**

Two minutes of it in its arena, you circling it: it took down 7 of the 12 pillars, tore one out and hurled it
(test-tidebreaker.ts).

## Seen and heard
Each move its own clip, each warning played up to where its blow lands (measured from its anchor hand: the smash's at
41%, the ground pound's at 37%, the throw's release at 33%) and the rest after it. Its shell spins as it rolls; its
anchor is set aside while it holds a pillar (the pillar in its hand along the anchor's line, gripped near its end, the
real pillar's stone); the boulder in its hand from the rip to the throw; where its leap lands (a ring); its blow's reach
in front of it as it winds up (a fan). Its sounds in code (a growl, whooshes, cracks of stone, deep thuds, a rumble, its
roar).

## The Moon's three mechs
Not its boss any more (0.3.28: mini bosses).

## What was built
`tools/ual_bake.py` (new); the model. `tuning/tidebreaker.ts` (new), `store.ts`; `sim/enemies/tidebreaker.ts`,
`tideShared.ts`, `tideMoves.ts`, `tideWreck.ts` (new), `kindsMoon.ts`, `kinds.ts` (the Moon's boss its own),
`update.ts`, `tokens.ts`; `sim/combat/pillars.ts` (a pillar torn out, the pillars near snapped), `bombs.ts` (the
boulder, the pillar), `eventsMoon.ts`; `sim/dungeon/ground.ts` (rock called down), `meteors.ts` (it falls as a meteor,
sparing the boss), `bossRoom.ts`, `wavePlan.ts`; `world/dungeon/moonRooms.ts` (its arena), `rooms.ts`;
`engine/moon/tideLook.ts`, `tideFx.ts`, `pillarEvents.ts` (new: out of `run.ts`), `pillarBreak.ts` (uproot, shatter),
`enemyLooks.ts` (a clip played up to its blow), `enemiesView.ts`, `dungeonView.ts`, `level.ts`, `run.ts`,
`combatScene.ts`, `depthsFeedback.ts`, `boss/bombView.ts`, `boss/bossShow.ts`, `gameBase.ts`; `audio/moonSounds.ts`;
`screens/deathText.ts`, `labLists.ts`. Tests: `test-tidebreaker.ts`, `test-tidebreaker-view.ts` (new),
`test-floor8.ts`, `test-lobby.ts`.

## Checked without a browser
Rules (tests): its place, name, model and every clip; each move (the smash's shockwave, the combo's finisher, the
uppercut's throw, the leap's landing and what it snaps and shakes down, the boulder, the roll's bounces, hits and the
pillar it smashes through, the pillar torn out, swung and hurled, the quake's rings and what it snaps); rage and frenzy;
its rock as meteors, sparing it; a two-minute fight in its arena. Drawn: the pillar torn out (its collision, its pieces
out of the floor), held, hurled and smashed; the anchor set aside; the shell spinning; the boulder in hand; the landing
ring. Rendered in Blender: its colours, its clips on its body, the pillar in its hand along its anchor's line through
the swing and the throw (the anchor's posed mesh measured on that line). **Not yet seen in the game**: its size in its
arena, the clips' timing, the shakes and sounds, and whether the fight is fair and fun.
