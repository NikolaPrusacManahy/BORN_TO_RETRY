# M3, sixth slice — Update 0.0.18: floor 2's enemies, the Dragon, prices by floor

Status: built (2026-10-28), from the designer's list:
- **Boss Dragon:**
  - An intro cinematic where he screams, and the scream shakes.
  - Fire breath like a laser beam that annihilates even the enemies on his side.
  - Fireballs, dragon claws, wing swings, tail swings.
- **Big enemies:** the Spider and the Blue Demon.
- **Blobs:** the same as floor 1, plus:
  - the Slime (kamikaze);
  - the Frog (mid range);
  - the Snake (its bite poisons);
  - the Wasp (poison stings).
- **Shop prices:**
  - an item's normal version costs 50;
  - a better version of the same item costs 70;
  - a version above that costs 100 (for example armour at 50 and 70).
- "The prices are the basic prices along the game. Every new floor up increases the shop prices by 15% every time."

Models: Ultimate Monsters, from the designer's folders `ASSETS/QUATERNIUS/Ultimate Monsters/{big,blob,flying,boss}/`. Exported by `tools/blender/export_monster.py` to `game/public/models/enemies/` as `spider`, `bluedemon`, `slime`, `frog`, `snake`, `wasp` and `dragon.glb`.
- These models come from the pack's newer set: their clip names carry the monster's name (`Spider_Walk`), and they have no hit clips (a flinch plays the idle).
- The Wasp's model faces sideways and is turned in the view.
- Some of the files were saved in pose mode, so the script now selects objects by hand.

## Floor 2's rooms
- **Each floor sends its own kinds** (`sim/dungeon/wavePlan.ts` ROSTER):
  - **Floor 1:** as before (grunt, spitter, Yeti, leaper, stinger, wraith).
  - **Floor 2:** floor 1's small ones and all six new ones from its first room, but **no Yeti**.
  - **Floor 3:** floor 2's for now. **(placeholder)**
- **Cost / weight:**
  - Slime 1 / 2;
  - Frog 2 / 1.5;
  - Snake 1 / 2;
  - Wasp 2 / 1.5;
  - Spider 4 / 0.6;
  - Blue Demon 4 / 0.6.
  - **(placeholders)**
- **Mini bosses:** the Spider and the Blue Demon are floor 2's, as the Yeti is floor 1's. A room with one has a chest, and the first one killed drops its key (normal, white or gold: 70 / 25 / 5%), one per room. **(placeholder: the designer named them big enemies)**

## The six (Floor 2 enemies tab; every number a knob; placeholders)
| Enemy | Model | Health | What it does |
|---|---|---|---|
| **Slime** (kamikaze) | Slime (blob) | 20 | Slides at you at 6.5 m/s. Within 2.2 m it swells and glows green, bubbling (0.6 s), then bursts: 22 damage and thrown within 3 m, unless a wall is between. It's gone (no coins). Killed first, it just dies. |
| **Frog** (mid range) | Frog (blob) | 35 | Hops about 4.5–9 m from you. With you in sight, its throat glows yellow and it croaks (0.5 s), then its tongue shoots 9 m in a straight line: 12 damage and a pull towards it. **Its aim locks for the last 40% of the warning:** step off the line then. **(Frog aim lock, added so the tongue can be dodged.)** |
| **Snake** (poison bite) | Snake (blob) | 30 | Slithers at you. In 1.8 m it rears and hisses (0.35 s; it turns slowly meanwhile), then bites: 8 damage, and **poisoned**. |
| **Wasp** (poison stings) | Wasp (flying) | 20 | Flies 3.2 m up, keeps 6–14 m off (circling). With you in sight it buzzes (0.45 s), then shoots a green sting at 22 m/s: 6 damage, and **poisoned**. |
| **Spider** (big) | Spider (big) | 140 | Scuttles at you; 1.4 m tall, its legs much wider. From 5–13 m, with nothing tall between, it rears and glows red (0.6 s), then leaps a 3.5 m arc to where you stood: 22 damage and thrown on or beside the landing (jump it). Close up it rears and bites (16). Then 0.9 s still, and 2.5 s between leaps. Only a hit of 40+ staggers it. |
| **Blue Demon** (big) | BlueDemon (big) | 160 | Walks at you; 2.8 m. Every 1.6 s it warns (glowing blue; a growl or a crackle). Then either it charges (the Demon's charge: 18 m/s, 22 m, 20 damage and thrown; into a wall it's stunned 1.6 s and takes 1.5×), or from over 8 m away (half the time) it throws a fireball (14 m/s, 14). Only a hit of 40+ staggers it. |

- **Coins:**
  - Slime 1, Frog 1.5, Snake 1, Wasp 1;
  - Spider 5, Blue Demon 5.
- **Poison** (the snake's bite, the wasp's sting):
  - 3 damage a second for 4 s, straight off your health;
  - the shield doesn't stop it, and nor does a dash or the hurt invincibility **(placeholder)**;
  - a new dose starts it over;
  - while it lasts, the screen's edge pulses green.
- **Lab:** Lab slimes / frogs / snakes / wasps / spiders / blue demons (0 by default) add them to the Feel Lab's waves.

## The Dragon (Dragon (boss) tab; spec numbers are placeholders)
Floor 2's boss, and floor 3's for now **(placeholder)**. The Dragon from Ultimate Monsters:
- 7 m tall, flying 1 m off the floor and bobbing, 1600 health.
- It never flinches.
- Its aura burns gold, and red once it rages.

**The show:** the Demon's (the walls slide back, a portal opens, it rises out of it). As it takes its stance it **screams**: its whole lunge clip, about 1.7 s, with a shriek, while **the view shakes**, hardest mid-scream (Scream shake). Its name card reads **THE DRAGON**, "Warden of Floor 2".

**Its moves:** every pause (1 s) it picks one by how far you are and where you are. Each warns with a glow in its own colour and its own sound:
| Move | Warning | What it does |
|---|---|---|
| **Fire beam** | 1 s: it rears, head forward, throat glowing white-gold, a rising inhale | A beam of fire from its mouth for 2.2 s, through your chest to the floor behind you. While it catches you, 18 a time (about 30 a second). It follows you at 0.7 rad/s: dash across it. A wall stops it. **Any other enemy in its line burns away** (its own side too; no coins). |
| **Fireballs** | 0.7 s, orange, a crackle | Three fireballs at you, 0.3 s apart (18 m/s, 14 each). |
| **Claws** (swoop) | 0.7 s, red, a growl, a red lane on the floor | It swoops 26 m along the lane at 22 m/s, claws out: 22 and thrown if it catches you. Into a wall or a column it's stunned 2 s (hits do 1.5×). |
| **Wing swing** | 0.55 s, pale gold, a ring on the floor at its reach | Close up: a sweep 160° in front, 7 m: 16 and blown away. |
| **Tail swing** | 0.6 s, violet, a ring on the floor at its reach | Behind it and close (always, when you're there): it spins round and its tail sweeps everything within 7.5 m, low. 20 and thrown. **Jump it.** |

- **Choice:**
  - close up (8 m): wing 50%, beam 30%, tail 20%;
  - mid range: claws 40%, beam 35%, fireballs 25%;
  - far: fireballs 45%, beam 35%, claws 20%;
  - never the same move three times running. **(placeholders)**
- **Rage, at half health:** it screams again (the view shakes) and calls three wasps (again every 20 s while fewer than two are left). Then quicker warnings (×0.75), shorter pauses (×0.6), faster flight and swoop (×1.25).
- **Death:** the Demon's show (the world slows, the body hangs, sinks flickering and bursts). It leaves 40 coins, a key and a heart.
- **Lab dragon** (0/1) puts one in the Feel Lab's waves.

## Shop prices (Shop & chests tab)
| Grade | Items | Floor 1 | Floor 2 | Floor 3 |
|---|---|---|---|---|
| Normal | heart, silver plate, the four rings, key | 50 | 58 | 66 |
| Better | gold armour, gold sword, white key | 70 | 81 | 93 |
| Best | gold key | 100 | 115 | 132 |

- Each floor down is **+15%** on the last (Price rise per floor), rounded to the nearest coin (a half rounds up).
- **Placeholders:**
  - rings are "normal", since they have no lesser versions;
  - the gold sword is "better" (the sword you find is the normal one);
  - the gold key is "best" (the key, then the white key, then the gold key).

## Feel and looks — unverified
None of this has been played. Things to check in-game:
- The Dragon's hover height and size in the room.
- The beam's look, and that its start sits at the Dragon's mouth.
- The scream shake.
- Each new enemy's size and facing (the Wasp's turn especially).
- The tongue.
- The slime's swell.
- The poison edge.
- The new models' clip choices.

The sounds are placeholder synth sounds.
