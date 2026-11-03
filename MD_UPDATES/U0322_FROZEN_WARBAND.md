# Update 0.3.22 — floor 7's enemies, the frozen warband

Status: built (2026-11-03). The plan: `MD/FLOOR7_WARBAND_PLAN.md`. The designer: "I have more enemies models in More
enemies folder; let's sort things out for Floor 7; look in folder and find enemies that would go together and if you
can't match them with floor 7, we change floor 7 design with something that would match", then "Go with it".

## The match
The folder (`ASSETS/QUATERNIUS/More-enemies`) is 52 people from one Quaternius pack: one rig, the same 17 clips, flat
colours, the pack's dark faces with white eyes. Its Vikings and its zombies fit Frozen Depths as it is: under the frozen
sea lies a Viking warband that froze there and won't stay dead. Floor 7's level is unchanged. The other groups (ninjas,
knights, goblins, soldiers, cowboys, pirates, townsfolk) wait for later floors.

## The warband (floor 7 only; none of the floors before's)
Their eyes are lit ice-blue; the dead are frost-blue, recoloured in code (`engine/norse/norseLooks.ts`). The Vikings
hold the RPG pack's axes in their right fists.
1. **Raider** (Viking_Male, a small axe). From 6–12 m, with his turn and a clear line, he raises his axe and crouches
   (0.5 s, his boots scraping), then **slides at where you stood**, axe first (14 m/s), into you once (18; it can be
   parried). On stone he stops 1.5 m past where you stood; **on ice, or rime, he carries on 10 m past**: he can't stop
   or turn, so step aside and he goes by. Into a wall fast, he's **dazed** (1.5 s). Up close, his chop (16).
2. **Axe Thrower** (Viking_Female, small axes). Keeps 6–16 m off; with her turn, her arm back (0.6 s), then **two axes
   at once in a V**, spinning flat: one at where you are, one at where you're going. **Stand still and the first finds
   you, run straight and the second does; change your way and both miss.** A punch sends one back. Come within 3.5 m
   and she **rolls away** to a random side (every 3 s); cornered meanwhile, she shoves you (8). On a perch she stays up
   there and throws (floor 7's percher).
3. **Draugr** and **Barrow Maid** (Zombie_Male and Zombie_Female, frost-blue: one kind of moves, as men and women in
   turn, a few in a room). They come **buried in the beds of snow** (out of sight and reach; in a room with none, under
   its ice) and **rise** (0.9 s, snow bursting off them) as you come within 4.5 m, or after 6 s anyway. Slow; their
   grasp is **frostbite** (10, and you're **chilled**: 10% slower for 3 s, up to three at once). They lie a while dead.
4. **Völva** (the Witch, her robe pale, her hat-band lit). Keeps 8–18 m off; with her turn her hand glows (0.8 s) and
   she lobs a **rime bolt** where you stand: it bursts (12, and you're chilled) and leaves **a patch of rime** 2.6 m
   across: ice, for you and for them, for 8 s. Every 8 s, a fallen Draugr near her (12 m) and she **chants over it**
   (3 s, arms up; a ring of frost closing on the body): it **stands up whole**. Hit her, or knock the body 1 m away, and
   the chant breaks. A body is raised once. At most **2 Völvas a room** (the rest Raiders).

### Mini bosses (only a hard hit staggers them; their blows are never parried)
- **Berserker** (VikingHelmet, 1.3× big, a double axe, his eyes red; 300). With his turn, from 12 m, he **roars**
  (0.7 s) and **spins** with his axe out (2.5 s), drifting at you (5 m/s; **on ice 9 m/s, his drift turning slowly: he
  skids wide**), catching you (14, thrown). Then he's **dizzy** (1.6 s, holding his head): your hits do more. **Below
  half health, two spins** before he's dizzy. Up close, his chop (24).
- **Haugbui, the barrow-dweller** (Zombie_Male, 1.6× big, frost-dark; 320). Slow. Near you he raises a foot (1 s, **a
  ring shows its reach**) and **stomps**: on the ground within 4.5 m, 18 and thrown back (jump it), and **the floor round
  him freezes** (7 m of rime). Further off (5–18 m), he **tears a block of ice out of the floor** (1 s) and **hurls it**
  where you're going (he leads you): it shatters (20) and leaves rime. Up close, his fist (26).

**Never tankier** (the designer's rule): regulars 20–40 health (the floors before's go to 60), the mini bosses within
340. **(placeholder numbers, F1 → Frozen warband, Frozen warband: mini bosses)**

## Rime and the chill (`sim/combat/frost.ts`)
Rime is ice while it lasts: your grip on it is Ice grip (as on the floor's sheets), and a body knocked across it slides
far. It settles in, then fades over its last 1.5 s. The chill slows your run and dash (10% each, up to three); it wears
off 3 s after the last.

## Seen and heard
The thrown axe (a haft and a steel head, spinning flat), the rime bolt (a ball of glowing frost) and the block of ice (a
pale cube, tumbling), their landing rings ice-blue; the patches of rime on the floor (pale glassy ice, a frosted rim);
the chant's closing ring; Haugbui's stomp ring; snow bursting off the rising dead; jolts for the stomp, a shattering
block and a Raider into a wall. Sounds made in code (`audio/norseSounds.ts`) until recorded ones are picked: a Raider's
boots scraping (loud off to your side), the axes' whirr, the dead's crunch and groan, the Völva's glassy cast and low
chant, the Berserker's roar, Haugbui's groan of ice, a cold breath when you're chilled.

## Executions, the Lab, the bestiary
The people take the Orc's execution (the same bones), the mini bosses the Yeti's; all but the mini bosses can be pinned
to a wall. The Lab's floor 7 is a column now (its enemies; its boss still floor 4's Velociraptor till the Frost Roc). In
the lobby's bestiary, floor 7's row has its seven plinths (only floors 9 and 10 COMING SOON).

## What was built
`tools/blender/export_people.py` (new: the pack's people, a weapon in the right fist, the blows' timing, pose renders)
and the models (`public/models/enemies/raider.glb`, `axe_thrower.glb`, `berserker.glb`, `draugr.glb`,
`barrow_maid.glb`, `volva.glb`); `tuning/foesNorse.ts`, `foesNorseB.ts` (new), `store.ts`; `sim/enemies/kindsNorse.ts`,
`raider.ts`, `axeThrower.ts`, `draugr.ts`, `volva.ts`, `berserker.ts`, `haugbui.ts` (new), `kinds.ts`, `update.ts`,
`tokens.ts`, `brawler.ts` (a blow's `onHit`), `flight.ts`; `sim/combat/frost.ts`, `eventsNorse.ts` (new), `events.ts`,
`bombs.ts` (rime bolts, blocks of ice), `targets.ts` (the axe), `step.ts`, `execMoves.ts`; `sim/dungeon/ground.ts` (the
frost), `warbandWaves.ts` (new), `wavePlan.ts`, `lairs.ts`, `roomLoop.ts`; `world/dungeon/lairs.ts` (barrows),
`floorPlan.ts`; `engine/norse/norseLooks.ts`, `warbandFx.ts` (new), `enemyLooks.ts`, `enemiesView.ts`, `shotLooks.ts`,
`shotsView.ts`, `boss/bombView.ts`, `depthsFeedback.ts`, `combatScene.ts`, `run.ts` (the chill, rime's grip);
`audio/norseSounds.ts` (new), `combatSounds.ts`; `screens/deathText.ts`, `labLists.ts`; `sim/lobby/collection.ts`.
Tests: `test-floor7-warband.ts` (new), `test-lab.ts`, `test-lobby.ts`, `test-crowd.ts`, `test-floor6-crew.ts`.

## Checked without a browser
Rules (tests): the roster (none elsewhere), never tankier, the roles, executions and pins, every clip in its model and
the Vikings' axes; the rooms (two Völvas at most, the dead in turn and a few a room, snow or ice for them in every room);
the Raider's slide (it reaches you, short on stone, long on ice, dazed by a wall), the Thrower's V (one finds you
standing still) and her roll, the Draugr buried, rising near you or late, their chill stacking and wearing off, the
Völva's bolt (its burst, chill, rime that's ice and thaws), her raising (once; broken by a hit), the Berserker's roar,
spin, hit, daze, two spins in his rage, his drift faster on ice, Haugbui's stomp (its hit, its rime) and his block (its
shatter, its rime); the recolours and lit eyes on the real models. The exports' poses rendered in Blender.
**Not yet seen in the game**: their size against you, the recolours under the floor's light, the lit eyes, the slides
and spins on the ice, the axes in flight, the rime, the rising dead, the sounds, how the fights play.
