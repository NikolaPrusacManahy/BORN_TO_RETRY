# Update 0.1.19 — floor 3's Skeleton, Mushnub and Ninja

Status: built (2026-10-29). After cutting the Grunt, the Leaper and the Blue Demon from floor 3 (0.1.18), the designer
asked for three of the Ultimate Monsters models:
- "Blob - Skeleton (they revive as they rebuilt from pieces to body)"
- "Blob - Mushnub"
- "MiniBoss - Ninja (can teleport away as an evasion trick when player trying to hit them, like 20% chance)"

## The Skeleton
- A close fighter: 35 health, 1.9 m. It comes in and swings after a warning (0.55 s): 14.
- Brought to 0 health it **falls to pieces** (its model's death). That isn't a kill yet: no coins, no kill, nothing
  for the execution meter.
- It lies there **2.5 s**, then **rebuilds** (its model's own clip, from a pile of bones to standing; 1.6 s) and
  fights on at full health.
- It does that **once**. Brought down again, it stays down.
- **Hit its bones while they lie there** and it stays down (the way to stop it coming back). Executed, it stays down.
- Its pieces don't block you or the others.

## The Mushnub
- A small close fighter: 30 health, 1.1 m. A quick warning (0.4 s), then a bite: 10.

## The Ninja (mini boss)
- 150 health, 2.6 m: the big Ninja with the sword (the Leaper's model, bigger). Its room has a chest and it carries
  the key, like the Spider.
- It comes in and slashes after a warning (0.45 s): 22. Only a hit of 40+ staggers it.
- About **one hit in five** (20%), it **teleports away** as the blow comes: the hit misses (no damage), a puff where
  it stood and another where it appears, 5–7 m on along the blow (up to 60° to one side, on free floor).
- Then it can't again for **1.5 s**, so a quick follow-up lands. Never while held in an execution.

## Where they come
- Floor 3 sends the Spitter, Stinger, Wraith, Slime, Frog, Snake, Wasp, Spider, Skeleton, Mushnub and Ninja.
- How often each is picked: Skeleton and Mushnub 16% each; Spitter, Stinger, Slime and Snake 10% each; Frog and Wasp
  8%; Wraith 5%; Spider and Ninja 3% (at most 2 mini bosses a room, as before).
- Taking turns (0.1.15): the Skeleton and Mushnub are close fighters, the Ninja a big one.

## Looks and sounds
- Models from `Ultimate Monsters/used_monster/blobs/` (Skeleton and Mushnub moved there from `blob/`). The Ninja is
  the game's `ninja.glb`; `blob/Ninja.blend` is a different model (a round head, no body, no sword) and stays unused.
- Sparks on each blow; bones flying when a Skeleton falls apart, sparks as it rises; puffs for the Ninja.
- Code-made sounds for now: bones rattling, a squeak, a blade drawn; a clatter, a rattle as it rises, a puff.
- The Lab lists all three; the death screen names them.

## Not yet
- **Executions** for the three (they can't be executed yet).
- **Recorded sounds** for them.
- **Floor 3's boss, the Dino:** waiting on how it should fight.

## (placeholders)
Every number: health, heights, reaches, wind-ups, damage, the 2.5 s down and 1.6 s rise, one revive, the 20%, the
1.5 s rest, 5–7 m, the weights and coins. All in F1 → "Floor 3 enemies".
