# Update 0.1.17 — recorded sounds (six batches) and the menus' music

Status: built (2026-10-29). The designer wants human-made sounds only, so the Steam page needs no AI notice. They
downloaded the Sonniss GDC 2026 bundle (`ASSETS/Sonniss_Game_Audio_Bundle`, five packs, 347 WAVs) and asked for
"combat first". Mid-way they added their own footsteps and a landing (`ASSETS/AUDIO`): "you can fast it to make it
sound like running, also landing, and you can keep the same sliding sfx".

## Licence
Sonniss's bundle licence: royalty-free, personal and commercial use, unlimited projects, no attribution. The raw files
may not be sold as they are, nor used to train or build AI. Each clip's source is listed in
`public/sounds/manifest.json` (the licence log).

## The sounds (candidates to pick from by ear)
| Sound | Candidates |
|---|---|
| Punch hit | 4 body punches (Cinematic Fight), a crunchy punch (Anime Game), a wet splat (Tower Defense) |
| Finisher hit | the crunchy punch, 2 body punches, a gore smash (Halloween) |
| Heavy hit | the gore smash, 4 heavy swing-to-thud takes (Melee Weapons 2), a colossal impact |
| Kill | an enemy-death crunch (Anime Game), the splat, the gore smash |
| Blade swing | a long-blade swing (Melee Weapons 2), a sword slice swish, a short sweep |
| Blade hit | 6 metallic sword cuts (Historical Weapons 2), a metal swing hit |
| Hammer swing | a debris whoosh, a wind rush, a slow metal whoosh (the designer: the hammer had the blade's swing and hit) |
| Hammer hit | 5 heavy thuds (Melee Weapons 2), 3 wooden stick impacts, the gore smash |
| Hammer smash | the colossal impact, a trailer boom, a low metal thud (Moaning Metal), 2 heavy thuds |
| Ground slam | 3 trailer booms, a bass drop, the colossal impact |
| Yeti slam | the metal thud, a trailer boom, the colossal impact |
| Grunt growl | an orc attack yell (Humanoid Creatures 4: the Grunt is the Orc), a creature exhale, a werewolf growl |
| Grunt swing | a debris whoosh, the blade swing, 2 heavy swing takes |
| Footstep | 11 steps from the designer's walk (later removed: the designer, "no need in this game") |
| Landing | the designer's landing |

## Batch 1: picked (the designer, from the Lab)
Punch hit 2, Finisher hit 4, Heavy hit 2, Kill 2, Blade swing 3, Blade hit 6, Hammer swing 1, Hammer hit 4, Hammer
smash 2, Ground slam 5, Yeti slam 1, Grunt growl 2, Grunt swing 3, every Footstep, Landing 1. Only these clips stay
(the recipe's `_keep`); the Lab lists only what's left to pick.

## Batch 2 (the designer: "now next batch")
| Sound | Candidates |
|---|---|
| Coin | a coin ting, a coin flip, a coin tap, a high pop (a little higher with every coin in a run) |
| Buy | happy UI blips and plucks, a collect burst |
| No money | two deny blips |
| Chest opens | an antique suitcase opening (3 takes), a lid, a latch |
| Chest locked | an antique lock rattled, a suitcase being locked (3), a loose mechanism |
| Chest rarity | arpeggio twinkles, a power-up, a kalimba, a xylophone, a music box, a spell (none for common; higher and louder the rarer) |
| Loot appears | a confetti spill, a swoosh, a magic creation, a cracker pop |
| Item taken | a collect burst, plucks, a happy blip, a power-up, a pop |
| Weapon pickup | a bag flip, a carabiner flick (2), a metal tap, a sword slide |
| Key switch | a vintage click, a latch, a typewriter key, a carabiner lock, a case click |
| Key drops | a spring-wire clatter, a metal tap, a measuring tape, a carabiner (quieter far off) |
| Weapon swap | sword slides (2), a blade swing, a bag flip, a carabiner flick |
| Freeze | a freeze shatter, ice cracks and crushing (quieter far off) |
| Gates shut | metal door bangs (4) and heavy wooden hits (3) from a haunted-door recording |
| Gates open | a low metal scrape, a bowed metal screech, a power-up, an arpeggio twinkle |

The kill bonuses (three sounds of their own) stay made in code for now.

**Picked (the designer):** coin 2, buy 1, no money 2, chest opens 2, chest locked 4, chest rarity 7, loot appears 1,
item taken 1, weapon pickup 4, key switch 1, key drops 3, weapon swap 5, freeze 2, gates shut 3, gates open 4.

## Batch 3: the bosses and magic
| Sound | Candidates |
|---|---|
| Demon roar | a T. rex, a large herbivore's roar, a werewolf growl, a sea beast's yell |
| Dragon scream | a raptor, an alien creature swell, roars, the sea beast |
| Boss rises | two horn braams, a slow dark braam, a death whistle |
| Walls grind | a low metal scrape, a bowed screech, a rattling downer |
| Boss down | bass drops and downers, a death whistle |
| Boss bursts | firework bangs, an enemy-death blast, two trailer booms |
| Demon slam | trailer booms, bass drops, a rapid impact |
| Demon crash | metal door bangs, heavy wooden hits, heavy thuds |
| Quake hit | a wooden hit, a thud, a stick impact |
| Dragon breath | a deep fire whoosh with a growl, fire crackles, a magic onslaught |
| Fire shot | a fire whoosh, a jet blast-off, a crystal whoosh (the Dragon's, the Blue Demon's and the Demon's shots) |
| Fire bomb | firework bangs, the blast, a boom (quieter far off) |
| Grimoire cast | the fire whoosh, the blast-off, an electric impact, the onslaught (bigger and lower when charged) |
| Fireball burst | firework bangs, the blast, the electric impact (bigger and lower when charged) |
| Ki charge | electric arcs, an energy swell, a sci-fi ping (higher each step) |
| Wraith cast | an ethereal pain cry, a harsh whisper, a death whistle |

**Picked (the designer):** Demon roar 2, Dragon scream 4, boss rises 3, walls grind 1, boss down 4, boss bursts 3,
Demon slam 3, Demon crash 4, quake hit 2, Dragon breath 4, fire shot 1, fire bomb 5, Grimoire cast 1, fireball burst
2, Ki charge 1, wraith cast 2.

## Batch 4: the enemies' warnings and attacks
Every attack is heard coming (the goal: deaths you learn from). All quieter far off.

| Sound | Candidates |
|---|---|
| Spitter gurgle | an aquatic creature's gurgle, a frog, a screeching breath, a water hit |
| Spit | bubbles, water hits |
| Yeti growl | a werewolf, a dog's grunt, a T. rex, a monster wobble |
| Leaper hiss | the screeching breath, a raptor, a hatchling, a death whistle |
| Leaper lands | heavy thuds, a wooden hit, a stick impact |
| Stinger buzz | a toy quadcopter, an electric buzz, an insect creature |
| Stinger dive | a wind rush, a swoosh, a jet pass |
| Wraith charge | an ethereal cry, a death-whistle drone, an evil spell, an alien swell |
| Slime swells | the gurgle, bubbles, a deep water hit |
| Slime bursts | water hits, an egg cracking, a dinosaur eating |
| Frog croak | a frog, the gurgle, a hatchling |
| Frog tongue | a whip crack, a swoosh, a wind rush |
| Snake hiss | the screeching breath, a wind rush, a death whistle |
| Bite | a dinosaur eating (3), an egg cracking, body punches (the Snake's and the Spider's) |
| Spider warns | the insect creature, the monster wobble, the electric buzz |
| Wasp buzz | the quadcopter, the insect creature, the buzz |

**Batch 4 picked (the designer):** Spitter gurgle 3, spit 2, Yeti growl 2, Leaper hiss 4, Leaper lands 4, Stinger buzz
2, Stinger dive 1, Wraith charge 3, Slime swells 1, Slime bursts 1, Frog croak 1, Frog tongue 1, Snake hiss 2, bite 5,
Spider warns 3, Wasp buzz 3.

## Batch 5: the player
| Sound | Candidates |
|---|---|
| Jump | shirt cloth (2), a pat, a yell, a wind rush (the jump, slide jump and dash jump) |
| Wall jump | a pat, a basket pat, a body punch, cloth (the wall jump and wall-run jump) |
| Dash | a wind rush, a jet, a metal whoosh, a swoosh, cloth |
| Slam drop | a bass jump-start drop, a wind rush, a bass-down swoosh |
| Jump pad | cartoon springs (2), a boing, the jump-start drop |
| Hurt | a man's gasp, a body hit, a yell |
| Shield hit | a metal swing hit with a ring, a buckler (2), a metal tap |
| Shield breaks | glass shards, a freeze shatter, ice cracking, a cracker bang |
| Death | bass drops and downers (4), a creature's death |
| Lava burn | a fire put out with water (2: a sizzle), a fire crackle |
| Punch whoosh | a wind rush, a pat, cloth, a swoosh (either fist) |
| Heavy whoosh | a metal whoosh, a wind rush, a jet, a swoosh (louder the more charged) |
| Fists charged | a pop, a snap, a sci-fi ping |

**Batch 5 picked (the designer):** jump Code (stays made in code), wall jump 3, dash Code, slam drop 2, jump pad 2, hurt
2, shield hit 1, shield breaks 2, death 1, lava burn 1, punch whoosh 1, heavy whoosh 2, fists charged 1.

## Batch 6: the executions
| Sound | Candidates |
|---|---|
| Can execute | a death whistle, a sci-fi ping, a horn braam, a bass-down swoosh |
| Grab | velcro, cloth, a basket, a carabiner, a dog's grunt |
| Exec slam | heavy thuds (3), a boom, a bass drop |
| Exec throw | a metal whoosh, a jet, a swoosh, a debris whoosh |
| Body lands | a dinosaur eating (2), an egg cracking, a thud, the gore smash (quieter far off) |
| Body bursts | firework bangs (3), a boom (quieter far off) |
| Blow: punch | a crunchy punch, heavy thuds (2), a stick impact |
| Blow: chop | sword cuts (3), a cracker bang, a snap |
| Blow: tear | velcro (2), paper (2), a dinosaur eating |
| Blow: crush | a dinosaur eating (2), an egg cracking, the gore smash, a basket |

A smash blow is the ground slam's: its clip and its thud.

**Batch 6 picked (the designer):** can execute Code, grab Code, exec slam 1, exec throw Code, body lands 5, body bursts
3, blow punch 2, chop 4, tear 2, crush 4.

## The menus' music
The designer: "put the BGM for the main menu, there is a BGM folder" (`ASSETS/BGM/MAIN MENU/MainMenu.mp3`, the
designer's own).
- It loops on the main menu, through the gate and on the character select, and fades out as a run starts (Play, or
  the Lab). Back on the menu, it plays again.
- It fades in over 1.5 s and out over 0.8 s. Its loudness: 1.05 (×3 for a file mixed quiet, then 65% quieter, the
  designer).
- Browsers start sound only after a click or a key, so it starts on the first one.
- Settings has a **Music** slider now.
- `ASSETS/BGM/Combat` is empty: the fights' music when it comes.

The rest of the bosses' sounds (their warnings, the Dragon's wing, tail, bomb whistle and flame burst, the Demon's charge,
leap and gore, the boss's loot, the wooden gate) stay made in code for now.

## In the game
- The hammer and the Gold Hammer swing and hit with their own sounds; every other weapon (the axe too) with the
  blade's. (A hit doesn't say whose it is: the weapon that swung last is remembered.)
- A sound plays one of its picks at random, a few % higher or lower each time. With no pick (Code), or before the
  clips have loaded (the first click starts them), the old sound made in code plays.
- The Dual Daggers' cut keeps its swish; the slide keeps its scrape (the designer).
- **No footsteps:** they came (one every 3 m, the walk's steps played 1.35× as fast) and went (the designer: "no need in
  this game"). **Landing:** louder the harder.
- F1 → Sounds: the landing's volume.

## Picking (the Lab)
F8 in the Lab → **Sounds**. Each sound has Code (the old one), All (random among every candidate) and its candidates by
number. A number plays it and puts it in the game at once (until a reload). Tell Claude the ones to keep.

## How clips are made
`tools/sfx/cut_clips.py` (Python and numpy; PyAV for MP3):
1. A recipe lists each sound's sources by library and file name. The cutter takes either the separate takes it finds
   by loudness, or a stretch of the file.
2. `snap` starts an impact on its hit.
3. Each clip is mixed to mono, brought to 48 kHz, faded and peaked at −3 dBFS, then written as a 16-bit WAV.

Run `python tools/sfx/cut_clips.py analyse <library part> <file part>` to list a file's takes, and
`python tools/sfx/cut_clips.py cut tools/sfx/recipes/combat.json` to cut a recipe.

## (placeholders)
- Every pick and loudness (Claude can't hear), the 3 m stride, the 1.35× speed.
- Later rounds: UI, coins and chests; the bosses and magic; ambience. Missing from the bundle: more punch variety and a
  voice set per monster (earlier years' free Sonniss bundles could fill these).
