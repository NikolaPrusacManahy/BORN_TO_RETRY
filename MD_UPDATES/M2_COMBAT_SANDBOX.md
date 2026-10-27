# Milestone 2 — The Combat Sandbox

Status: started (2026-10-27). First slice built: the Grunt and the Sword in the Feel Lab (Update 0.0.9); the sword arm reworked from the designer's notes (Update 0.0.10).

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
- **Walls** (the designer, Update 0.0.11): they find their way round walls, blocks and spikes to you, never end up inside one, never swing through one, and wait at the foot of a block you're standing on.

### The Sword (design §6)
- **Model:** the Sword from the Ultimate RPG Pack, held in the right hand, the grip through the curled fingers.
- **No left hand** (the designer, Update 0.0.10): holding a weapon, the left arm drops out of view.
- **Left click:** a slash: the whole arm cuts down from the upper right through the middle of the view to low left, then goes straight back to ready (the designer: no rest on the left). A slash before it's back swings back the other way. Holding left click slashes every interval. **22 damage, 2.6 m reach, a slash every 0.42 s.** **(placeholder)** (Redone in Update 0.0.10: the designer found the first one atrocious.)
- **Right click:** hold 1 s (like the charged punch): the sword draws back and points its tip at the crosshair (the designer, Update 0.0.10). Let go: a **pierce**, a straight thrust along the aim: **55 damage**, a big knockback, **3.2 m reach, 0.5 m wide** (longer and narrower than a slash). Letting go sooner cancels. **(placeholder numbers)**
- **Uses:** each hit costs one (a pierce costs two; misses are free). At 0 the sword is broken: **your next attack throws it** (design §6).
- **Q:** throw it any time. A throw winds up for **0.12 s** (drawn back like the pierce, then thrust; the designer, Update 0.0.10) and the sword leaves the hand flying tip first at 30 m/s; it hits the first thing for **70 damage**, a big knockback and a hit-stop, and is gone. Nothing else attacks while it winds up. **(placeholder numbers)**
- **No quick punch** (the designer, Update 0.0.10): F does nothing, with a sword or barehanded; it's kept for something later.
- **E:** pick up a weapon within 2 m. Picking one up while holding another drops yours at your feet.
- **HUD:** bottom right, the weapon's name and uses left. Nothing when barehanded.
- **In the lab:** a sword lies on a stand near the start, back 3 s after you take it.

## Second slice (Update 0.0.12, the designer's list)
- **The Spitter** (the Wizard, Ultimate Monsters): 30 health, 5 m/s. Keeps 7–16 m from you: closer when it can't see you (round walls), backs off when you're close, circles you in between (turning round every 2.5 s or at a wall). With you in sight and its shot ready: a 0.6 s warning (it rears, glows green, gurgles), then an orb at your chest (13 m/s, 12 damage; dash through or sidestep it). A hit flinches it and cancels the shot. 1.8 s between shots. 4 coins. **(placeholder numbers)**
- **The Brute** (the Yeti, Ultimate Monsters): 160 health, 3.5 m/s, 2.8 m tall, 0.85 m wide (its own, wider walk grid; it still fits 2 m gaps). In 3 m: a 0.9 s warning (it rears up, a red ring on the ground shows its 3.6 m reach, a roar), then the slam: 30 damage and thrown back if you're on the ground in the ring (a jump clears it), not through a wall. Then 1.2 s winded. Only a hit of 40 or more staggers it (and cancels the slam); lighter hits hurt it and barely move it. 10 coins. No weapon drop (the designer). **(placeholder numbers)**
- **Coins:** every kill bursts its coins (grunt 2, spitter 4, brute 10); they fly to you with a ding. The count sits just above the health bar. **(placeholder amounts)**
- **The ground slam on F** (the designer): only 1.8 m or more above the ground; the landing blasts every enemy within 4 m for up to 35 (half at the edge), harder and wider the further you fell (up to 90 and 7 m), with a shockwave, dust and a boom.
- **Weapons:** a picked-up weapon has 4 uses; only grunts drop one, 15% (the designer).
- **The lab's waves:** 2 grunts, a spitter and a brute.

## Later in M2
More enemies (Leaper, Shieldbearer, elites), more weapons (dagger, axe, hammer, bow) when the designer says, the style meter (design §7).

## Tests
`test-enemies.ts` (the spitter's distance, warning, shot and cooldown, a hit cancelling it, no shot through a wall; the brute's walk, warning, slam in and out of its ring and in the air, stagger only from a hard hit, the 2 m gap), `test-slam.ts` (F from a real height only, the blast's reach and fall-off, walls, height), `test-money.ts` (coins per kind, all collected, seeded, never lost), `test-grunt.ts` (chase and stop in reach, every strike warned for the full wind-up, a strike only lands in reach and in front, flinch cancels a wind-up, death, drops from the seeded RNG, waves), `test-nav.ts` (the walk grid, round a wall and out of a pen, never inside a wall, no swing through one, waiting below a block, every lab spawn reaching you), `test-sword.ts` (pickup and swap, the slash's pace, uses only on hits, the pierce's reach, broken means the next attack throws after the wind-up, Q throws, nothing else during the wind-up, the thrown sword's hit), `test-arms.ts` (the grip in the fingers under the guard, a nearly straight wrist in every held pose, the left arm out of view, the slash crossing the crosshair with the whole arm and going straight back, swinging back if slashed again first, freezing on contact, the pierce pointing at the crosshair, the thrust and the throw going forward).
