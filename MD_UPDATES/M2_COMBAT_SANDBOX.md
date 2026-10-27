# Milestone 2 — The Combat Sandbox

Status: started (2026-10-27). First slice built: the Grunt and the Sword in the Feel Lab (Update 0.0.9); waiting on the designer's play notes.

## Goal
Fighting stays fun for minutes: enemies that fight back, weapons that wear out and get thrown, money and the style meter. Movement and fists from M1 stay as they are.

## First slice: the Grunt and the Sword
Numbers are placeholders the designer tunes in F1 (new tabs: Enemies, Weapons).

### The Grunt (design §9: "melee chaser in groups, fodder")
- **Model:** the Orc from Ultimate Monsters (`big`), about 2 m tall, with its own animations: Idle, Run, Weapon (its club swing), HitReact, Death. **(placeholder pick: the designer may swap it)**
- **Health 40, runs at 7 m/s** (from the M1 plan). It runs at you and stops in reach.
- **Attack:** in reach (1.8 m), it winds up for **0.45 s**, then strikes. The wind-up is the warning: its club swing starts, it flashes red, it growls. The strike hits only if you're still in reach and in front of it: **15 damage** and a shove. Then 0.6 s to recover. **(placeholder: reach, shove, recovery)**
- **Hits on it:** every hit flinches it for 0.25 s, cancelling a wind-up, and knocks it back. **(placeholder: fodder is easy to interrupt)**
- **Death:** its death animation, a burst of chunks, gone after 1.5 s. Kills count for blood heal like any hit.
- **Drops:** a worn sword 30% of the time (8–20 uses; design §6: drops are low). **(placeholder chance)**
- **In the lab:** three at a time; when the last one dies, three more come 3 s later at the lab's spawn points. F3 resets them. They block each other and you (you can't walk through them).

### The Sword (design §6)
- **Model:** the Sword from the Ultimate RPG Pack, held in the right hand.
- **Left click:** slashes, alternating directions; hold to keep slashing. **22 damage, 2.6 m reach, a slash every 0.42 s.** **(placeholder)**
- **Right click:** hold 1 s (like the charged punch), let go: a heavy cleave, **55 damage** and a big knockback. Letting go sooner cancels. **(placeholder alt attack)**
- **F:** the quick punch still works (left fist).
- **Uses:** each hit costs one (a cleave costs two; misses are free). At 0 the sword is broken: **your next attack throws it** (design §6).
- **Q:** throw it any time: it spins out at 30 m/s, hits the first thing for **70 damage**, a big knockback and a hit-stop, and is gone. **(placeholder numbers)**
- **E:** pick up a weapon within 2 m. Picking one up while holding another drops yours at your feet.
- **HUD:** bottom right, the weapon's name and uses left. Nothing when barehanded.
- **In the lab:** a sword lies on a stand near the start, back 3 s after you take it.

## Later in M2
More enemies (Spitter, Brute, Leaper, Shieldbearer, elites), more weapons (dagger, axe, hammer, bow), coins and money, the style meter (design §7), and enemy waves that feel like a room.

## Tests
`test-grunt.ts` (chase and stop in reach, every strike warned for the full wind-up, a strike only lands in reach and in front, flinch cancels a wind-up, death, drops from the seeded RNG, waves), `test-sword.ts` (pickup and swap, uses only on hits, broken means the next attack throws, Q throws, the thrown sword's hit, quick punch with a sword).
