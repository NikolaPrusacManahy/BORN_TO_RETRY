# Update 0.3.49 — the Dragon by the Boss Design Bible, and ultimates

Status: built (2026-11-05). The designer: "go check enemies bible. This is how we will work away with bosses", then "Keep them, adapt" (the Frost Roc, the Drowned King and the underwater Big Shark fight stay, adapted). In floor order, so the Dragon first, as the template for the rest.

Source: `enemy_bibles/Born to Retry — Boss Design Bible.docx`, Boss 1, "Read the tell".

## The Dragon's moves

| Phase | Move | What it does | Tell | Counter / punish |
|---|---|---|---|---|
| 1 | Flame Sweep | Fire low across the floor, one side to the other, over 140° | Head rears, throat glows, deep inhale, 1.2 s | Jump it or dash through it; a wall stops it. Its head stays low 1.6 s after |
| 1 | Wing Gust | Wind pushes you back, 4 chunks of rubble fly at you | Wings lift high, 1.2 s | Strafe out of the 80° wind; parry the rubble back (60 damage) |
| 1 | Tail Quake | Turns its back, slams its tail: a ring rolls out over the floor | Back turns, tail shakes, 1.2 s | Jump the ring. Its back stays to you 2 s |
| 2 | Dive Bomb | Circles above, then dives where you are | Shadow grows on you, screech, 1.2 s; it follows you till it locks on | Dash aside in the 0.3 s fall. Stuck in the ground 3 s (hits do 1.5×), then it chains its Tail Quake |
| 2 | Ember Rain | 7 fireballs fall, the first on you, each leaving a burning pool for 8 s | It hovers, chest pulses 3 times, 1.2 s | Keep moving |
| Ult | Inferno Core | Lands in the room's middle, chest opens on a core, charges a whole-room blast | Ground shakes, music cuts, core swells | See below |

- **Phase 2 at half health:** it screams and takes to the sky for good, then its ultimate first. Its old moves tell in 0.9 s, and it comes down to chain Flame Sweep into Wing Gust.
- **Tells:** Boss 1's 1.2 s on every move, as the bible's dial says.

## Inferno Core and the shared ultimate
`sim/enemies/ultimate.ts` holds what every boss's ultimate shares, for the bosses to come: once as phase 2 starts, then about every 60 s; a window; a cue on screen; a bar of progress; the music cut.

- **The cancel:** blows on its front (70° either side) go to the core, which has 150 health. The core takes them, so the Dragon's health doesn't move. Any weapon counts: fists, a thrown weapon, the pistol, fireballs.
- **Cancelled:** "BREAK THE CORE" filled within 8 s, and it's stunned 4.5 s (hits do 1.5×).
- **Failed:** the whole room's blast: 70 damage and thrown. A pillar between you and it saves you, and that pillar breaks. Dashing doesn't slip it: it lasts 0.35 s, longer than a dash.
- **Fair to fists:** jabs alone break it from a far corner of the room in 6.9 s of the 8 (ARE YOU EVEN HUMAN? has nothing else).

## What went
The bible's list replaces its old moves: the fire beam, the fireballs, the claw swoop, the wing swing, the tail swing, the sky bombing and the flame burst. The beam burning other enemies went with them.

## Choices past the bible (placeholders; F1 → Dragon)
- The core takes its hits instead of the Dragon. With the 0.3.48 health, core hits plus the stagger would have ended phase 2 almost at once, before Dive Bomb or Ember Rain were seen.
- Numbers the bible doesn't give: damages, reaches, speeds, the arcs, core health, the stagger, the chain after a sweep.
- **Slide:** the bible's Dragon doesn't need it. The clash with the removed slide starts at the Giant's moves on floor 4.

## What it isn't yet
- **Arena:** it's still floor 1's boss room, which already has the bible's 4 stone pillars (tested). It's not dressed as a ruined castle courtyard.
- **Chest:** the model has no chest to open, so the core and its scales are made in code, on its chest plate.
- **Sounds:** its new sounds are code-made placeholders, except its scream, its fire and its fireballs, which keep their samples.
- **Intro:** still the shared portal one.

## Files
- **New:** `sim/enemies/ultimate.ts`, `sim/enemies/dragonCore.ts`, `engine/boss/dragonCoreView.ts`, `engine/boss/flameLineView.ts`, `ui/theme/theme-47-ultimate.css`.
- **Rules:** `sim/enemies/dragon.ts`, `dragonMoves.ts`, `dragonSky.ts`, `enemy.ts`, `tick.ts`; `sim/combat/bombs.ts`, `puddles.ts`, `pillars.ts`, `events2.ts`, `targets.ts`; `sim/dungeon/bossRoom.ts`; `tuning/dragon.ts`.
- **View and sound:** `engine/boss/dragonView.ts`, `bossFx.ts`; `engine/foeFeedback.ts`, `desertFx.ts`, `shotLooks.ts`, `shotsView.ts`, `overlayFeed.ts`, `hudStore.ts`, `run.ts`; `screens/BossHud.tsx`; `audio/dragonSounds.ts`, `music.ts`.
- **Tests:** `test-dragon.ts` rewritten (the old moves' checks went with them), including a simulated 400 s fight checking nothing gets stuck; `test-ultimate.ts` new.

## Unseen
- Not played: feel, timing and difficulty are all unverified.
- The core's place was checked in Blender renders of its model and pose, with approximate colours. The flame line, shadow, pools, rubble and cue have not been seen at all.
