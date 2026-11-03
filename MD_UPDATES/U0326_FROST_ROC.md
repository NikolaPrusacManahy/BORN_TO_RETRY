# Update 0.3.26 — floor 4's boss, the Frost Roc

Status: built (2026-11-03). The designer: "before we move to floor 8, we need floor 4 boss — suggestions? do I need to
seek a model", then, of the ones we had (Birb, Goleling Evolved, Alpaking Evolved, a giant Jarl): "Birb, the Frost Roc".

## The model
Ultimate Monsters' Birb (the big one), unused till now: huge (6 m), blue and white, its own palette. It walks and leaps
(no flying clips): a ground bird. `ASSETS`: its `.blend` moved to `used_monster/Boss`; the same-named blob Birb went to
the Recycle Bin (the designer's rule for leftovers named like a used model). Exported by `export_monster.py`
(`public/models/enemies/frost_roc.glb`; its swipe lands at 15/30 of its Weapon clip).

## The fight
Hræsvelgr of the frozen warband. It rises out of the portal in the boss room's show and roars ("THE FROST ROC", Warden
of Floor 4). It waddles at you; every pause (1.3 s) it picks a move by where you are (never one three times running) and
warns with a shrill cry:
- **Close: its swipe** (its wing drawn back 0.7 s; 26, in front, thrown) or **its gust**: wings spread, then beating
  (1.6 s): in front of it, within 18 m, **you're blown back** (on ice you can't hold); half the time its belly slide
  follows at once.
- **Between: its frost breath** (it rears 0.8 s, then sweeps across you 1.6 s, ±0.7 rad, 13 m: each time it catches you
  9 and a chill, every 0.35 s at most; it lays rime along its sweep), **its belly slide** (crouched 0.9 s, then at where
  you stood at 18 m/s, into you once for 30 and thrown; it stops 5 m past on stone, **14 m past on ice or rime: it can't
  stop or turn. Into a wall fast, it's stunned 2.5 s: your hits do more**), now and then a gust or a leap.
- **Far: its leap** (crouched 0.8 s, up 7 m for 1.2 s, **a ring on the floor where it'll land**, closing in) to where you
  stood: landing, 24 and thrown if you're on the ground within 5.5 m (jump it), and **the floor round it freezes** (9 m
  of rime); or its slide.
- **Below half health it rages**: a roar, everything 1.35× quicker, and it **calls the dead up** (3 Draugr, again every
  14 s while few are left).
- 1700 health (the Velociraptor 1800, the Drowned King 2000); 15 coins in its chest. Its death is the bosses' show.
**(placeholder numbers, F1 → Frost Roc)**

Its rime is the warband's (Update 0.3.22): ice while it lasts, for you and for it, so the fight's floor grows slick.

## Seen and heard
Each move its own clip (the view's per-move clips, new: `Look.moveClips`): its swipe its Weapon, its gust its wings
spread (Punch), its slide and crouch Duck, in the air Jump_Idle, landing Jump_Land, its breath rearing (Yes) and
sweeping (No), its roar Wave. On the floor: the landing ring, its breath's pale-blue fan, its gust's white one
(`engine/norse/rocFx.ts`). Its sounds in code (a shrill cry, a roar of wind, a long scrape, deep thuds, a hiss of
frost); a hard jolt as it lands or crashes.

## Also fixed
Since 0.3.22 a boss's entrance played its rise clip (the dead's rise out of the snow had made the intro phase a rise):
the Bone King assembled from its bones as it rose from the portal. A boss's show stands again.

## Elsewhere
Floor 4's boss is its own now: the Lab lists the Frost Roc under Frozen Depths (its boss room a button), the lobby's
bestiary gives it floor 4's big plinth, floor 4 loads its model and the Draugr it calls.

## What was built
`tuning/frostRoc.ts` (new), `store.ts`; `sim/enemies/frostRoc.ts` (new), `kindsNorse.ts`, `kinds.ts` (floor 4's boss
its own), `update.ts`, `tokens.ts`; `sim/dungeon/bossRoom.ts` (its calls, coins, roar), `wavePlan.ts`;
`sim/combat/eventsNorse.ts`; `engine/enemyLooks.ts` (`moveClips`), `enemiesView.ts` (per-move clips; a boss's show
stands), `enemyPose.ts` (new: `sinkOf`, out of enemiesView.ts), `norse/rocFx.ts` (new), `combatScene.ts`,
`boss/bossShow.ts`, `depthsFeedback.ts`; `audio/norseSounds.ts`; `screens/deathText.ts`, `labLists.ts`;
`engine/gameBase.ts`; the model. Tests: `test-frost-roc.ts` (new), `test-floor7.ts`, `test-lab.ts`, `test-lobby.ts`.

## Checked without a browser
Rules (tests): its place and range, its name, its calls, every clip in its model; its swipe, its gust's push, its
slide (it reaches you; stops past you on stone, far past on ice; a wall stuns it), its leap (high, down where you stood,
its hit, its rime), its breath (its hit, the chill, the rime), its picks over a minute, its rage. The export's poses
rendered. **Not yet seen in the game**: its size in the boss room, its clips' timing, the floor marks, the sounds, and
whether the fight is fun and fair.
