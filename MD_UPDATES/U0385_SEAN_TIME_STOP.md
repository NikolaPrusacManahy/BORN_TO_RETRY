# Update 0.3.85 — Gravity Sean's Time Stop

Status: built (2026-11-06), not played. The designer:

> New Q key ultimate - you unleash a gravity zone that covers the whole room and act like a time stop (when you hit an enemy they looks unfazed and hit will register when time stop ends)

It's normal mode's ultimate, on the meter he shares with Meteor, where Black Hole was. (`sim/combat/gravityStop.ts`)

## What stops
**For 5 s, everything but him:** every enemy, boss or not, in any room (their walking, their clips, their timers), shots, bombs, puddles, quakes, bleeds and burns, turrets, a Black Hole he's already thrown. The rooms' loop waits too (`run.ts`): hazards, waves, the tide, a boss's show. Walk into a new room meanwhile and it starts when time does.

**What doesn't:** him, the rocks he throws, your coins coming to you, and lava: step in it and it still burns.

## A hit
It's held back, in `landHit`, which every blow of his goes through (`storeHit`, `gravityMeter.ts`). The enemy doesn't flinch, lose health, flash or die: "they looks unfazed". You get a soft thud, a small kick in the view, and a spark on the spot that grows with what it's holding. Your swing isn't stalled by a hit-stop. His meters don't wait: hits fill Instability and the ultimate meter as they're stored.

## It ends
Each target takes **one blow, the sum of all it was given**, thrown along the sum of their pushes (26 m/s at most), with a ring and a thump for each. Nothing dodges it: a Ninja can't slip it. Kills count and fling as usual.

My calls:
- **One blow per target, not all of them in turn**, so you see one big number and hear one thump. The exception's a boss with its cancel window open, whose window counts blows: those land one by one.
- **A boss stops too**, since you didn't say otherwise. It's 5 s of free hits: to watch when played. It's the meter's other half against Meteor's 350.
- Everything of his goes on in stopped time, and E too: go Unstable and the fists, the punch and the rest all store.
- If he dies (lava), or the Lab swaps him out, it ends there and everything lands.

## How it looks and sounds (placeholders)
- A violet shell rolls out over the room from him (`engine/sean/stopView.ts`), through the walls' surfaces, with a ring over the floor. As it ends it rushes back to him.
- The screen drains of colour, the music cuts, sounds go muffled.
- 420 motes of dust hang dead still in the air where he cast it, for you to walk through.
- Both his palms thrust out for its first 0.35 s.

## Also
`enemiesView.ts` no longer plays an enemy's clip while the world's held (`worldHeld`), which fixes Meteor too: enemies were running on the spot through it.

## Still placeholders
Every number (F1, Gravity Sean: Time Stop time, knock, grey), the sounds, the look. Not played by me; the shell and the dust have never been seen.

## Tests
`tests/test-sean-stop.ts`, through `stepCombat` with real blows.
