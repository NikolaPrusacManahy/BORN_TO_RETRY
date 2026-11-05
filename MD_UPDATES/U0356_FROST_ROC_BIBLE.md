# Update 0.3.56 — The Frost Roc by the Boss Design Bible

Status: built (2026-11-05). The designer: "Next boss, floor 4 * Arena / moves / intro", and earlier "Keep them, adapt": the Roc stays, taking the bible's Boss 4 lesson, "Ground or air?", with moves that suit a bird. Its intro is 0.3.57.

**One plain language:** what's on the floor, you jump. What's in the air, you stay under.

## Its moves
Tells last 0.9 s (0.72 s in phase 2).

| Phase | Move | What it does | Tell | Counter / punish |
|---|---|---|---|---|
| 1 | Stomp Quake | 3 stomps, each a ring along the ground, 16 per ring | Knee lifted high, the ground trembling | Be in the air as each passes. It stands 1.8 s after the third |
| 1 | Wing Clap (the bible's Sky Clap) | Hits anyone in the air in front of it, 26, and slams them down | Wings spread wide at head height, a pale sheet in the air | Stay on the ground: it does nothing to you |
| 1 | Ice Hurl (Boulder Hurl) | A block of ice at where you stand; it shatters into 6 shards | Talons in the ground, then a marked spot | Dodge aside. Parry a shard back at it and it staggers 1.8 s |
| 1 | Belly Slide (its own, kept) | At where you stood, past it | It crouches | Dash aside. Into a wall it's stunned 2.5 s |
| 1 | Frost Breath (its own, kept) | Sweeps along the floor, chilling you, leaving rime | It rears | Jump it (now it only catches you low) |
| 2 | Pillar Swing | 3 swings of its torn-out pillar, alternating low and high, 30 | Pillar drawn back at hip or shoulder height, a warm sheet at the knee or a pale one overhead, each with its own creak | Low: jump. High: stay down, it passes over your head. Reading the height is the test |
| 2 | Fault Line | Slabs erupt along 3 cracks from its feet, 20 under one | Wing drawn high, cracks running out | Get off the cracks. The slabs stand 9 s as real ground: cover, and a place a stomp ring can't reach. It smashes through ones it walks into |
| Ult | Mountain Fall | At the foot of the cliff, wings up, tearing the cornice loose | Roar, the ground shaking, the music cuts | See below |

- **It watches you:** the more you've been in the air over the last few seconds, the more it claps; the more you've stayed down, the more it stomps. That's the bible's "its moves punish whichever one you overuse".
- **Phase 2 at half health:** it roars, hops to the nearest pillar and tears it out. Everything's 25% quicker.

## Mountain Fall
On the shared ultimate (`sim/enemies/ultimate.ts`): once as phase 2 starts, then about every 60 s.

- **The cancel:** "BREAK BOTH KNEES", 6 s (the bible's). 3 blows on each glowing knee.
- **Any weapon:** the bible says shoot them, but the knees are low enough to punch, so fists-only players can do it too.
- **Cancelled:** it collapses and the cornice lands on its own back: 110 off its bar, and it's down 5 s, hits doing 1.5×.
- **Failed:** the cornice smashes and 16 boulders rain over the plateau, each spot marked, 26 per hit. Heavy, never an instant death. Every third comes for you. Shelter at a pillar and it takes that boulder and snaps, so you move on to the next. Boulders can't land near a standing pillar otherwise. That's my version of the bible's "dodge falling boulders under a pillar".

## The Frozen Plateau (`world/dungeon/plateau.ts`, `engine/norse/plateauView.ts`, replaces the shared room)
- The bible's "mountain plateau with breakable rock pillars": 16 pillars, an open middle, snow beds with trees and sheets of ice about the edges.
- Snowy peaks all round where the floor leaves room, and a cliff on a side with no doorway, its ice cornice hanging over the plateau. All made in code, with no collision.

## Choices past the bible (placeholders; F1 → Frost Roc)
- Every damage, reach, speed and time not quoted from the bible.
- **The slide clash:** the bible's "high swing: slide under" can't work, as the slide was removed in 0.3.20. A high swing passes over your head if you stay down instead, which suits "Ground or air?" better.
- **Fault Line:** no sunken slabs, since the floor can't drop; only raised ones.
- **Removed:** its swipe, gust, leap and calling up the dead. They didn't teach the lesson and would muddy reading the moves. Its health stays 1190 (never tankier).

## Files
- **New:** `sim/enemies/rocBody.ts`, `rocMoves.ts`, `rocFall.ts`, `engine/norse/rocPose.ts`, `plateauView.ts`, `world/dungeon/plateau.ts`.
- **Rewritten:** `sim/enemies/frostRoc.ts`, `tuning/frostRoc.ts`, `engine/norse/rocFx.ts`, `tests/test-frost-roc.ts`.
- **Changed:** `sim/enemies/enemy.ts`, `update.ts`; `sim/combat/strike.ts`, `targets.ts`, `parry.ts`, `bombs.ts`, `eventsNorse.ts`; `sim/cards/cardHits.ts`; `sim/dungeon/bossRoom.ts`; `world/dungeon/rooms.ts`; `engine/run.ts`, `pillarEvents.ts`, `combatScene.ts`, `enemyLooks.ts`, `shotLooks.ts`, `shotsView.ts`, `depthsFeedback.ts`, `boss/bombView.ts`, `boss/showViews.ts`, `boss/kingPose.ts`; `audio/norseSounds.ts`; `tools/boss-shots.ts`.

## Unseen
- Not played: feel, timing and difficulty are unverified. Sounds are code-made placeholders plus the floor's existing ones.
- Poses and the plateau were checked in Blender renders of the game's own pose code; not seen moving, nor in the game's renderer. Fog may hide the far peaks there.
- The torn-out pillar in its grip isn't in the renders: it needs the game's own floor view.
