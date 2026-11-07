# Born To Retry: marketing brief

Snapshot of **Update 0.3.91, 2026-11-07** (committed, not played yet; the brief was written at 0.3.90 and corrected for it). Written from the game's code and design docs, for a Claude that can't see them. The game changes almost daily, so ask the designer what's new before relying on anything here.

**How to read it**
- Plain statements are facts from the code or docs.
- **Decided:** the designer has said so.
- **Suggestion:** from the Claude that wrote this brief. Nobody has approved it.
- **Not decided:** the sources say nothing. Ask the designer (section 12). Don't fill it in.

"The designer" runs the project, writes the design, plays the builds and approves anything public. Claude Code writes the code.

---

## 1. Read this first

**The final game (Decided, 2026-11-06, one change on 2026-11-07): 10 floors, 3 difficulties, 3 playable characters, locked characters to unlock. "Surpass your limit."**

The designer's line said 4 characters. Alpha Team was scrapped on 2026-11-07, which leaves 3. Whether a fourth is coming is not decided (section 12).

That's what you're selling. Not all of it is built or open yet, so keep "the game will have" apart from "you can play today" (section 11).

1. **10 floors in the final game; today's public build stops at 9.** Floor 10, its boss Hellwarden and the playable Demon can't be reached by players yet. Don't say they can.
2. **No Steam page is on record.** No price, no date, no app ID. "Wishlist on Steam" only works once a page exists.
3. **No AI-made art, audio, music or video, in the game or on the store page.** Never generate them or suggest tools that do (section 8).
4. **Never write "made without AI" or "100% human-made".** The code is written with Claude (section 8).
5. **You may draft store text and posts (Decided).** The no-AI rule doesn't cover text (section 8).
6. **The player has no guns (Decided, 2026-11-07).** Fists and melee weapons only; only enemies shoot. Don't show or mention player guns (section 4).
7. **Most balance numbers are placeholders.** Don't put damage, health or timing numbers in public copy without checking.

---

## 2. The game

| | |
|---|---|
| **Name** | Born To Retry. The working title, Ruinbreaker, is internal only. |
| **Studio** | Niko Game Collection ("Developed by Niko Game Collection" on the boot screen; © 2026). |
| **Genre** | First-person action roguelike. |
| **Players** | Single-player only. No online features, accounts or analytics. |
| **Plays on today** | Desktop browser, keyboard and mouse, WebGL 2. Chrome or Edge recommended. No mobile, no controller support in the code. |
| **Language** | English only. No translation system in the code. |
| **Status** | Pre-release. The main menu reads "Alpha v0.3.91". |
| **Look** | Low-poly 3D from Quaternius model packs, in bright, sunlit play spaces, each floor with its own sky and palette. Pixel-font interface. |
| **Tagline** | "Die · Learn · Retry" (on the logo). Trailer card: "Born to retry." The designer's line for the final game: "Surpass your limit." |

**Pitch (the README's, set to the final 10 floors; not store copy):** a fast, hard, single-player roguelike played in first person. Every run starts with bare hands and ten floors to fight through, each with its own enemies and its own boss. Weapons break, healing is scarce, and on the standard difficulty you get one life. Losing is part of the design: play, lose, learn, retry.

**Who it's for (Decided):** hardcore players. The designer turned down softening the enemies' random dodges: "I am not aiming at casual gamers with this." It's meant to be hard but doable with effort.

**Reference points the designer used:** Ultrakill for intensity, Doom Eternal for executions. **Suggestion:** fine for targeting and "for fans of" lines if the designer agrees. Both are shooters and this game has no player guns, so say what the comparison is for. Never imply a link to those games.

**Design rules behind it**
- Feel comes first: movement, punching and hit feedback beat everything else.
- Aggression pays: breaking a weapon is a payoff, and executions win back health.
- Every run differs: hand-made rooms assembled from a seed.
- Every attack is telegraphed by a flash and a sound.
- Enemies are never made tankier (Decided: "do not make enemies tankier NEVER"). Harder means more AI and worse mixes.

### The core loop
1. **The manor.** A walkable lobby. Pick a difficulty at its altar, pick a character once earned, turn Fate Cards on or off, walk through the main gate.
2. **A floor.** A seeded map of rooms and corridors: 4 fight rooms on floors 1 to 3, 5 on floors 4 to 7, 6 on floors 8 to 10, plus a shop, an optional challenge room and a boss room.
3. **A fight room.** The gates slam shut and enemies keep coming, 8 in the first room and 2 more each room along. At least 5 stay on you while any are left to send. Clear it and the gates open.
4. **Money and loot.** Kills drop coins. Mini-bosses drop keys, keys open chests, coins buy from the shop.
5. **The boss.** Its own room, its own cinematic, then a chest with coins, a heart and a deal of Fate Cards.
6. **The way down.** Next floor, with what you carry.
7. **Death.** The screen names what killed you ("Killed by"), with the floor, time and kills. Retry starts a new run. Coins, weapons, items and cards are gone. Character unlocks stay.
8. **Win.** The last floor's way down. Today that's floor 9, after Tidebreaker; in the final game a run goes to floor 10. The screen reads "Run complete" and "Survived". It unlocks Gravity Sean.

---

## 3. Steam

**Status**
- **Decided:** selling on Steam is the goal, through an Electron wrapper, later.
- **No Steam page on record.** The last note says a "Coming Soon" page and a store kit (text, tags, requirements, capsule briefs, screenshot and trailer list) were offered and not started. Nothing later mentions one.
- **The Electron build isn't started.** It's not in the project's dependencies.
- **Planned, not built:** Steam achievements and cloud saves. Saves are in browser storage today.
- **The repo's note on Steam's terms:** the $100 Steamworks fee, store assets, at least 2 weeks of Coming Soon before release. Check Steamworks for the current rules.

**Store fields**

| Field | Value | Status |
|---|---|---|
| Title | Born To Retry | Decided |
| Developer | Niko Game Collection | From the logo and licence line |
| Publisher | | Not decided (**Suggestion:** same as developer) |
| Genre field | Action, Indie | **Suggestion** |
| Players | Single-player | Fact |
| Input | Keyboard and mouse; every action rebindable but Esc | Fact |
| Controller, Steam Deck | No controller support today | Not decided |
| Languages | English | Fact today; more not decided |
| Operating systems | | Not decided |
| Price | | Not decided. The intent is a paid game; there are no real-money purchases in the game. |
| Release date | | Not decided |
| Early Access or full release | | Not decided |
| Demo or Next Fest | | Not decided |
| Age rating, mature content survey | Blood and gore on by default, with dismemberment in executions; Options has Blood On / Less / Off | Answers not decided |
| System requirements | | Not decided. Only data: the designer's RX 6950 XT ran every floor at 144 fps at 0.3.44. A build was 95 MB at 0.3.47. No low-end tests, no Electron measurements. |
| AI disclosure | Intent is to need none | **Decided** intent; see section 8 |

**Tags: all Suggestion, in priority order.** Valve's guidance, in short: at least 5 before launch and up to 20 are advised; only the top 20 show and affect visibility; the top 5 describe the game; some filters favour the first 15; generic tags like "indie" and "singleplayer" add little. [Valve's tag page](https://partner.steamgames.com/doc/store/tags) didn't show its full table when read, so check each name in the Tag Wizard.

- **Top 5:** Action Roguelike, First-Person, Fast-Paced, Hack and Slash, Difficult.
- **6 to 15:** Roguelike, Perma Death, Gore, Violent, Beat 'em up, Parkour, Procedural Generation, Replay Value, Stylized, 3D.
- **16 to 20:** Action, Fantasy, Sci-fi, Martial Arts, Singleplayer.
- **Low Poly:** use it in place of Stylized if the Tag Wizard offers it.

**Tags to hold back (Suggestion)**
- **FPS:** promises a shooter, and the player has no guns.
- **Deckbuilding, Card Game:** the cards are passive run modifiers. You never play a hand.
- **Multiplayer, Co-op:** solo only.
- **Pixel Graphics:** only the interface font is pixel. The game is 3D.
- **Boss Rush, Souls-like:** neither is what it is.
- **Early Access:** only if that's chosen.

---

## 4. Features and highlights

**What to lead with (Suggestion)**
1. Bare hands, then executions: your own hands doing the killing, in first person.
2. A boss per floor, each with its own arena and its own cinematic.
3. Bosses that teach one skill each: "Read the tell", "Go vertical", "Trust your ears".
4. Floors that change how you move: ice, tide, quicksand, moon gravity, under water.
5. One life, and a gate that mocks you for asking for less.
6. Weapons that break, where the break is the payoff.
7. 69 cards, and not all of them are on your side.
8. The final scope in one line: 10 floors, 3 difficulties, 3 characters, 2 of them to earn.

### Movement
- Run at 12 m/s, with almost no friction in the air.
- Dash: 40 m/s for 0.14 s, 3 charges that refill, brief invincibility.
- Wall run up to 1 s a wall, chaining wall to wall. Up to 3 wall jumps in a row.
- Ground pound from 2.8 m or higher: both fists clasped, slammed into the floor. Its blast comes from a Fate Card, Tremor.
- Coyote time and a jump buffer.
- The game runs at 120 ticks a second with interpolated rendering. Mouse look applies every rendered frame, on raw input where the browser allows it, and hit-stop never slows the mouse.

### Fists and feedback
- Every run opens barehanded: a jab combo whose third hit knocks back.
- **Parry** on right click: a short window. A shot goes back at the enemy nearest your aim. An ordinary enemy's melee blow is punched back and it staggers. A parry that lands has a 4 s wait. Boss melee mostly can't be parried; some boss moves are built around a parry.
- Hit-stop on every blow, harder shakes on heavy ones, a kill freeze.
- Killing punches launch bodies. A body knocked hard into a wall splats on it.
- Blood per enemy type: red, green ichor, bone chips, spores, ink. Options has Blood On / Less / Off.
- **Style rank:** D DIRTY, C CRUEL, B BRUTAL, A ATROCIOUS, S SAVAGE, SS SLAUGHTERHOUSE, SSS UNKILLABLE. A visual only: it doesn't pay out.

### Executions
- Kills fill a meter (10 to full). Press E near an enemy to grab it. You can't be hurt while it holds, and the world stands still.
- Heals 15, or 25 on a mini-boss.
- Hits and kills heal Joseph nothing: health comes from hearts, rings and executions.
- 64 of the 73 enemy kinds on floors 1 to 9 have one. The Moon's ships and mechs and the Kraken Tentacle don't, and bosses don't. **Don't say each is unique:** many share moves.
- Examples: a Skeleton lifted by telekinesis and burst as your fist closes; a Wasp torn in half; a Spider's legs chopped off one by one; a Blue Demon punched 30 times.
- **Wall and pillar finishers:** some enemies flung dead into a wall hang pinned for 3 s. E finishes one for free. On a pillar, it's driven through and the pillar is cut in two.
- A rework of the executions with a new animation library is under way: the Orc's only, so far.

### Weapons
Eight in the game. Each has limited uses. Q throws a weapon at any time, and a broken one is thrown for a big hit. Rarities: common, uncommon, rare, epic, mythic.

| Weapon | Rarity | Uses | Hook |
|---|---|---|---|
| Sword | Common | 10 | Slash, or hold right click to pierce |
| Hammer | Common | 15 | Slow, two-handed; a charged smash sends a shockwave rolling across the room |
| Gold Sword | Rare | 30 | The sword, lasting longer |
| Dual Daggers | Rare | 30 | Very fast cuts, +15% run speed, a held volley of 25 thrown daggers |
| Gold Axe | Epic | 30 | Thrown with right click, it sticks where it lands and flies back to your hand |
| Gold Hammer | Epic | 35 | The Hammer, lasting longer |
| Gold Daggers | Mythic | 90 | The daggers, lasting far longer |
| Grimoire | Mythic | 50 | Open book in one hand, fireballs from the other; a long charge can fill the whole room |

**No guns (Decided, 2026-11-07):** the designer scrapped the Pistol, and five more guns built after it never shipped. The player has no gun, ammo or reload. Only enemies shoot. Don't use old footage of the Pistol.

**Items:** Heart, Great Heart; silver and gold armour; red, green, blue and teal rings (max health, attack speed, run speed); plain, white and gold keys; kill drops (snowflake, gold ingots, blue potion). No item adds damage.

**The shop:** one a floor, five tiles, prices rising 15% a floor, plus one Fate Card for 100.

### Fate Cards
- **69 in all:** 44 Fate Cards, 16 Death Cards (they only hurt), 9 Traitor Cards (a gift with a price on the card).
- **The deal:** three cards dealt, take one. Each card's family is rolled: Death 15%, Traitor 12%, otherwise Fate. A Reroll costs coins, rising each time.
- **Where:** a challenge room's chest, a boss's chest (not the run's last), and one in each shop.
- **Builds:** Fists, Kills, Throws, Movement, Slam, Executions. Three of a build lights a bonus, and deals lean towards what you've taken.
- **Depth:** 13 cards can be dealt a second time, stronger. 4 pair cards need two builds.
- **Optional:** a stand in the lobby turns them off. ARE YOU EVEN HUMAN? has none.

### Difficulty
Chosen at altars in the manor. The main gate questions you before you go through.

| Difficulty | Rules |
|---|---|
| WEAKLING EXPERIENCE | A death sends you back to your checkpoint with what you carry. The gate mocks you for it. |
| THE REAL EXPERIENCE (default) | One life. |
| ARE YOU EVEN HUMAN? | One life and fists only: no coins, weapons, keys, chests, shop or rewards. Executions still heal. |

The gate's lines, in the designer's words: "Ready for pain?", "Are you sure?", "Don't cry when you die", "Did I mention you only have 1 life? oops", "Let's just assume you are not human". At WEAKLING it says "Bro, just play it normally"; the docs don't say who wrote that one.

### The manor (lobby)
A walkable first-person hub: great hall, grand stairs, a weapons gallery and an items gallery (each thing turning on a pedestal, its card as you come near), a cards gallery in gilt frames, a bestiary of statues on plinths (a row a floor), a dining hall, a library, the credits on boards.

### Options and player tools
Field of view 80 to 130, frame cap 30 to 240 or unlimited, glow, effects, blood level, UI size 70 to 140%, every action rebindable but Esc. A frame-rate counter on F2. A Feedback box in the pause menu copies the player's notes, version and frame-rate figures to paste into the designer's Discord; the game sends nothing itself.

### Enemies
- **73 kinds on floors 1 to 9:** 53 regular and 20 mini-bosses, plus 9 bosses. Counted from the code; male and female Sand Ninjas count as two. **Suggestion:** say "over 70 enemies".
- The crowd takes turns: at most 2 close fighters, 2 ranged and 1 big one go for you at once. The rest circle and fan out.
- Later floors win by AI: enemies that sidestep your aim, travel under the sand, ward each other or strike only from your blind side.

---

## 5. Floors and bosses

### The floors
Each has its own hand-made rooms (9 to 11 a floor in the specs), its own enemies and its own hazards.

| # | Floor | What makes it different | Enemies |
|---|---|---|---|
| 1 | The Dungeon | Brick ruins open to the sky | Orcs, wizards, ninjas, giant bees, ghosts; a Yeti as mini-boss |
| 2 | The Venom Garden | Overgrown ruins: poison sludge, webs that slow you, tall grass that hides snakes, wasp hives | Slimes, frogs, snakes, wasps; Spider, Blue Demon |
| 3 | The Bone Keep | Bone-white under a lavender sky; enemies come out of graves and burrows | Skeletons that rebuild, skull wraiths, carrot-throwing rabbits; Big Mushnub, Big Ninja |
| 4 | Frozen Depths | Ice with little grip for you, while the enemies don't slide; falling icicles | A Viking warband that won't stay dead; Berserker, Haugbui |
| 5 | The Drowned Temple | Fight rooms flood and drain on a clock; you wade at high water | Sea creatures that play the tide; Deep One, Bog Brute |
| 6 | The Desert | Quicksand that slows only you | Evasive enemies: spear throwers who sidestep your aim, cacti under the sand, a camouflaged lizard; Big Cactoro, Skull Orc |
| 7 | Skull Cove | Pirates, the sea, powder kegs that chain | A hook that drags you, a shanty that quickens the crew, a headless crewman, coin-stealing gulls, a kraken's tentacle; Mako, Captain Barbarossa |
| 8 | The Shrine Dimension | Sakura everywhere, torii, floating islands | Martial artists who side-step, dash and wall run; Sensei, The Shadow |
| 9 | The Moon | Low gravity (jumps 1.6× as high), meteor showers | Animal crews on foot and in tiny ships; a ship and four mechs as mini-bosses, their pilots climbing out |
| 10 | Hell on Earth | **In the final game, not public yet.** Its look is done; its rooms still send stand-in enemies | |

### The bosses
Eight of the ten are built to one template, the designer's Boss Design Bible: a lesson, tell-attack-punish, a second phase at half health, and an ultimate with its own way to cancel it, about every 60 s. Floors 8 and 9 were built before it, and the designer has left them as they are.

Every boss has its own arena and its own intro, skippable with Space. Those with a stated length run about 10 to 20 s.

| # | Boss | Lesson | The fight | The intro |
|---|---|---|---|---|
| 1 | The Dragon | Read the tell | Ground, then the sky. Inferno Core: break its chest core or take a room-wide blast | Laps a castle courtyard breathing fire, knocks the crowns off its towers, dives and leaves a crater for good |
| 2 | The Swarm | Pick your target | 220 simulated worms coiled round one eye; lasers you put pillars between. Abyssal Stare: hit the eye | The walls are forced back, the worms flood in and heap round the eye, which opens |
| 3 | The Bone King | Go vertical | Its body's a platform: run up its arm to its skull. Rebuilt wrong in its second life. Bone Colossus: climb it and break a vertebra | Bones stream in, a headless skeleton builds itself, stoops, and sets its own skull on its neck |
| 4 | The Frost Roc | Ground or air? | Punishes whichever you overuse; tears out a pillar. Mountain Fall: break both knees in 6 s | Frozen in a glacier; its eyes open in the ice; it bursts out |
| 5 | The Drowned King | Master the parry | Parry its flying heads back at it. Maw of Many: parry the bite and its jaw jams | The walls weep, then burst; a fin circles; a crown rises from the water |
| 6 | The Velociraptor | Trust your ears | Often out of sight; its tells are sounds panned left and right. Apex Hunt: hunted in the dark | Clicks from either side, a shape crossing the gaps, then it's on the wall |
| 7 | The Big Shark | The arena is a weapon | Fought swimming, under water, among sunken ships. Swallowed, you hold its jaws apart. Abyss Jaws: hit the anchor's chain | The arena floods; it leaps out of the water, slowed |
| 8 | Yokai : Okami | | A huge white wolf of fire: claws, bite, leaps, a fire dash, a ring of fire you drive back with hits | The rooms are destroyed at once, a floating island crashes in, temples fall, a slow-motion leap with its name |
| 9 | Tidebreaker | | A giant alien that tears out pillars, hurls boulders and shakes the whole place | The floor's rooms blow up one by one, the Earth bursts, a meteor strikes, and it rises from the crater |
| 10 | Hellwarden | The final exam | **Not public yet.** A blazing sword demon. Its ultimate, Last Verdict, kills you unless you parry it | Forged on screen from a river of lava and your dead: "Forged from the 247 times you fell." (the real count from the save) |

---

## 6. Playable characters

The game has these three. You start with Joseph and earn the other two. The Demon can't be reached by players yet.

| Character | How you get it | Open to players today? | Kit |
|---|---|---|---|
| **Joseph** | Default | Yes | Fists, parry, executions, weapons |
| **Gravity Sean** (he) | Win a whole run, on any difficulty | Yes, earnable; numbers still placeholders | Two stances on E, no weapons or executions. Normal: Gravity Punch, Grab (held, his palms join and a sphere of stone rises over the arena, to bring down where he aims), Ground Slam, and Time Stop (7 s; every hit stored, landing at once when it ends). Unstable: Gravity Fists, a thrown Black Hole, Shockwave Punch, Meteor. An Instability meter that overloads. Kills heal him |
| **The Demon** (it) | Beat Hellwarden | **Not yet:** floor 10 is closed, so it can't be earned | A 2.8 m blade always in hand: three-hit Blazing Arc, Hellfire Lunge, Brand of Ruin, heat, a thrown sword you teleport to, ranged crescents. Last Verdict kills everything in the arena; a boss loses 40%. No parry, by the designer's choice. Kills heal it. Balance still to come |

Alpha Team, once a locked silhouette on the roster, was scrapped on 2026-11-07 (Decided). Don't mention it.

---

## 7. Updates

### How versions go
- Each update is `Update X.Y.Z`: one commit, a title and short bullets in plain player-facing words. Example, shortened:
  ```
  Update 0.2.0
  - One challenge room on every floor, the only fight room that leads nowhere
  - Executions heal 15, mini bosses 25
  ```
- The version shows on the main menu ("Alpha v0.3.91") and in each Feedback report.
- 163 updates between 2026-10-27 and 2026-11-06. These are development builds, not releases. **Suggestion:** don't advertise the pace or the dates unless the designer wants to.
- **No patch notes exist for players:** no screen in the game, no public changelog. Where and how to publish them is not decided.
- **Suggestion for public notes:** keep the commit style, cover only what's in the public build, and group many updates under one note.

### History

| Version | Date | What came in |
|---|---|---|
| 0.0.1 | Oct 27 | First build: a grey-box Feel Lab, movement only |
| 0.0.12 | Oct 27 | First dungeon run: seeded floors, the room loop, a minimap |
| 0.0.13 to 0.0.15 | Oct 28 | Shop and chests, healing only from hearts, the first boss and its show |
| 0.1.0 to 0.1.2 | Oct 28 | Constant pressure, the execution meter, executions for every enemy then in the game |
| 0.1.14 | Oct 29 | The death screen: play, lose, learn, retry |
| 0.1.20, 0.2.0 | Oct 29 | Challenge rooms; executions heal |
| 0.2.4 | Oct 30 | The Desert floor; the Pistol |
| 0.2.9 | Oct 30 | The walkable lobby; the three difficulties |
| 0.2.10 | Oct 31 | The Drowned Temple |
| 0.2.12 | Oct 31 | First alpha: floors 1 to 5, about 4 testers on Netlify |
| 0.2.16 to 0.2.22 | Oct 31 to Nov 1 | Fate Cards, Death and Traitor Cards, builds (from tester feedback) |
| 0.2.23, 0.2.24 | Nov 1 | The Venom Garden; the Bone Keep |
| 0.2.26 to 0.3.0 | Nov 1 | Graphics pass: blood, enemy shots, blows, air and glow |
| 0.3.1 to 0.3.10 | Nov 1 to 2 | More rush, brutal executions, parry, style rank, launches, wall splats, wall and pillar finishers |
| 0.3.11 to 0.3.18 | Nov 2 | After a poll where players asked for at least 10 floors: Frozen Depths, Skull Cove, the Big Shark, the Moon |
| 0.3.19, 0.3.20 | Nov 2 | Fight music; controls on the HUD; the slide removed |
| 0.3.21 to 0.3.26 | Nov 3 | The manor; the Viking warband; floors reordered; the Frost Roc |
| 0.3.29 to 0.3.31 | Nov 3 | Tidebreaker and its show |
| 0.3.32 to 0.3.35 | Nov 3 | The Shrine Dimension and Yokai : Okami |
| 0.3.37 | Nov 3 | The capture kit, for the trailer |
| 0.3.41, 0.3.42 | Nov 4 | The Dragon moved to floor 1; The Swarm |
| 0.3.45 to 0.3.47 | Nov 4 | Frame-rate counter, Feedback box, public runs set to floors 1 to 9 |
| 0.3.48 | Nov 5 | All boss health cut by 30% |
| 0.3.49 to 0.3.62 | Nov 5 to 6 | Bosses of floors 1 to 7 rebuilt by the Boss Design Bible, each with its own room and intro |
| 0.3.63 to 0.3.66 | Nov 5 to 6 | Hellwarden (dev builds only) |
| 0.3.67 | Nov 6 | Pits cost 10 health and bounce you out, no more teleport |
| 0.3.70 to 0.3.79 | Nov 6 | The Playable Demon, phases 1 to 4 of 5 |
| 0.3.80 to 0.3.90 | Nov 6 | Gravity Sean: unlock, kit, the designer's rework |
| 0.3.91 | Nov 7 | The player's guns and Alpha Team scrapped. **Current version** |

---

## 8. Rules for marketing

### No AI in what players see or hear (Decided)
- The designer doesn't want Steam's AI content disclosure, because of how players see that label.
- **Never generate** art, capsules, key art, video, music, sound effects or voice with AI, and never suggest tools that do.
- Trailers and screenshots come from the game itself.
- **Text is fine (Decided, 2026-11-06):** Claude may draft store text, posts and patch notes.
- Valve's rule, as reported: code assistants need no disclosure so long as no generative AI content reaches the product, and the disclosure covers the store page and marketing too ([VGC](https://www.videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use), [TweakTown](https://www.tweaktown.com/news/109743/valve-changes-ai-disclosure-guidelines-ai-powered-tools-are-now-exempt/index.html)). The repo's note dates the change to 16 Jan 2026. Check Valve's current form before filing.

### Valve's form: not settled
The project's rule above is decided. How to answer Valve's form isn't, and these matter before anyone files it or says anything public about AI. **Not decided.**
1. **Store text Claude drafts.** Allowed by the project, but the disclosure as reported covers store pages and marketing. Check how the form treats it.
2. **Things made in code.** Effects, shaders, some textures and some sounds are "made in code", and Claude wrote that code. The docs treat this as not AI. Nobody has checked that reading against Valve's form.
3. **Some in-game words.** Claude wrote at least some, such as the reply buttons at the Weakling gate.

So never claim "made without AI" or "100% human-made". What the docs support: the models, the recorded sound effects and the fight music come from named third-party sources.

### Credit and naming
- **Models:** Quaternius packs (CC0 or the Quaternius Asset License). They're public packs, so never call the art original or exclusive. **Suggestion:** sell it in motion, since still low-poly shots can read as stock.
- **Sound:** Sonniss #GameAudioGDC 2026 (royalty-free, commercial, no attribution needed; it forbids reselling the files as they are and using them to train or build AI). Other sounds are made in code.
- **Fight music:** three tracks credited to Polarnyne (Izakaya Funes' Metal Pack; its licence asks for a credit) and Intersonic Sound (Replica · Extreme Cyber Metal). **Don't call this an original soundtrack.**
- **Menu music:** recorded in the docs as "the designer's own". Who made it isn't stated.
- **Gravity Sean's stone-sphere move** came from the designer's reference pictures from a manga. The move's spec says to keep that manga's name out of the game and the store page.
- **Yokai : Okami:** **Suggestion:** a white wolf with red markings called Okami invites comparison with Capcom's *Ōkami*. Ask before featuring the name or look.
- Don't use the working title Ruinbreaker.

### Voice
The designer's rule for the game's text is terse: state the effect in a few words, with no hand-holding. The game's humour is mocking and dry (the gate, the difficulty names, the style ranks). **Suggestion:** match that, and let footage carry it.

"Surpass your limit" is the designer's line for the final game. "Die · Learn · Retry" is on the logo. How the two sit together isn't decided (section 12).

### Public links
- A public playtest build has been hosted on Netlify. Its URL isn't in the repo, and neither is whether it's still up.
- A Discord takes playtest feedback. Its invite isn't in the repo.
- No website, press contact or social accounts are recorded. Ask.

---

## 9. Trailer and capture kit

**The plan on file (about 75 s).** It's in the capture kit's spec; the docs don't mark it approved. Gameplay in the first seconds. It must read without sound.

| Time | Beat |
|---|---|
| 0 to 4 s | Cold open: first person, mid-fight on floor 1, ending on an execution |
| 4 to 10 s | The hook: a death, the death screen, straight back in. One card: "Born to retry." |
| 10 to 30 s | The floors, 2 s each, cut on the beat: Dungeon, Venom Garden, Bone Keep, Frozen Depths, Drowned Temple, Desert, Skull Cove under water, the Shrine, the Moon, Hell |
| 30 to 38 s | Weapons: katana, guns, ki, executions |
| 38 to 62 s | Bosses, each with a name card: Okami's island crash and slow-motion name, Tidebreaker's arrival, the Big Shark, the Dragon, the Bone King |
| 62 to 70 s | Escalation: fastest cuts, one more death, the retry |
| 70 to 75 s | The logo, one line, "Wishlist on Steam" |

**Check these against the plan (it was written at 0.3.37)**
- **Hell** is floor 10: in the final game, but not public yet, and its rooms still send stand-in enemies. Film what's finished.
- **Katana:** no player weapon. Only enemies use one. Use the sword.
- **Guns:** none. The player has no guns since 0.3.91, so cut them from this beat, and don't use footage of the Pistol.
- **Ki** means the Grimoire's charged fireball.
- **Bosses:** all ten now have their own intro, so the picks can change.
- **"Wishlist on Steam"** needs a page first.
- **Music:** the plan says the designer's Combat OST tracks plus Sonniss hits (Trailer Booms, Horn Braams, Colossal Impacts). The OST is credited to third parties, so check its licence covers a trailer.

**The capture kit** is in dev builds only, and the designer has confirmed it works. The designer records and edits; Claude can't open the game.
- **Recording:** OBS, 1920×1080 at 60 fps, 40,000+ kbps CBR or CQP 16 to 18, into MKV, then remux to MP4. Fullscreen first.
- **F7** (or `\`): capture mode on or off. The HUD goes at once; screen flashes and a boss show's bars and name card stay.
- **While on:** `6` HUD, `7` arms, `8` free camera, `9` slow motion (1×, ½×, ¼×), `0` freeze, `-` and `=` field of view (30° to 150°), `.` this floor's boss room with its show from the start.
- **Dolly:** `[` mark a point (up to 8), `]` play, `;` stop, `'` clear, `,` length (6, 10, 16 or 4 s).
- **Also dev only:** F4 invincibility, F3 replay the floor, F8 the Lab (any floor, boss room, enemy, weapon or chest).
- **Big moments:** freeze with `0` as it lands, then fly round it or play a dolly through the frozen frame.
- **Boss shows:** mark points round where it lands, press `.`, press `]` when the moment comes. The room is the same every take.
- Sounds don't slow with slow motion: replace them in the edit.

---

## 10. Assets available

| File (repo root) | What it is | Note |
|---|---|---|
| `game_logo.png` | 1152×461. "BORN TO RETRY" in white pixel letters with an orange-red drop, a retry arrow, tagline "DIE · LEARN · RETRY" | Opaque dark background, ghost letters behind, props cut off at the bottom edge. Not a clean logo for store use |
| `logo.png` | 689×141. "DEVELOPED BY NIKO GAME COLLECTION" in a typewriter face | Opaque, near black |
| `studio_gif_new.gif` | 689×141. The same logo typing itself out | The game's boot screen |

- In the game, the logo is drawn in code using the Pixelify Sans font, so a clean export could be made from it.
- **Colours:** cream letters, orange-red (`#e8452a` on the README's badge), near-black background.
- **Fonts:** Pixelify Sans and IBM Plex Mono.
- **Not in the repo:** capsule art, key art, screenshots, a trailer, a press kit. Who makes the capsule art is not decided.
- **Licence line:** © 2026 Niko Game Collection, all rights reserved. Third-party assets stay under their own licences.

---

## 11. Not finished or not public

Don't say any of this is playable today, and don't give dates for it.

**How to count (Decided scope)**
- About the final game, say 10 floors, 3 difficulties, 3 playable characters.
- About today's public build, say 9 floors and 3 difficulties. Joseph and Gravity Sean are the only characters players can reach.

**In the final game, not open yet**
- **Floor 10, Hell on Earth.** Reachable only from a dev tool. Its boss, look and intro exist. Its own enemies (Imps, Puglins, Bone Axemen and others), echo rooms and The Retrier don't.
- **Hellwarden.** Built, dev builds only.
- **The Demon.** Its kit is in, but public players can't earn it while floor 10 is closed. Balance (phase 5 of 5) hasn't been done.

**Being built**
- Gravity Sean's numbers, sounds and effects. Hover on a held jump and his Unstable dash pull are undecided.
- Executions rework: only the Orc's is done, with 27 more sharing its moves still to go, then others.
- Okami's rage and frenzy phase isn't built.
- The Swarm's real sounds are still to come.

**Young content**
- The boss reworks from 0.3.49 on are days old. Most were checked by tests and renders first, and the docs record little outside play. Ask before calling them polished or balanced.

**In the design doc but not in the game**
- Elites, Shieldbearers, a fist style per character (Boxer, Brawler, Dancer), reward rooms, daily or shared-seed runs, a stats hub. The Bow and the Necromancy Skull are only ideas.
- **Floor select:** the manor's ten floor paintings are decoration. Runs always start at floor 1.
- **Bestiary progress:** the save holds no kill record, so don't promise a collection that fills in.
- **Left-right audio** is only on the Velociraptor's and Hellwarden's cues so far. Don't advertise positional audio.

**Steam**
- The page, the Electron build, achievements and cloud saves. See section 3.

---

## 12. Open questions for the designer

**Launch**
1. Price?
2. Release date or window?
3. Early Access or full release? Does launch wait until all of the final scope is in?
4. A demo, or Next Fest? Is the playtest build going to stay public?
5. Is a Steam page started? Who's the publisher of record?
6. Which operating systems? Controller or Steam Deck? More languages?
7. System requirements: who measures them, on what hardware?
8. Age rating and mature content answers?

**What can be said**
9. May marketing name Hellwarden and the Demon before they're open, or only give the counts?
10. How long is a full run? The design's 20 to 25 minutes dates from when a run was three floors. Nobody has measured nine or ten.
11. Is it fine to name Ultrakill and Doom in "for fans of" lines?
12. The name and look of Yokai : Okami: fine for store copy?
13. Is "Surpass your limit" a public tagline, beside or instead of "Die · Learn · Retry"?

**Characters**
14. The final game's line said 4 playable characters before Alpha Team was scrapped. Is it three now, or is a fourth coming?
15. When floor 10 opens, winning a run and beating Hellwarden become the same moment, so Gravity Sean and the Demon would unlock together. Is that intended?

**AI**
16. How does Valve's form get answered, given Claude-drafted store text, code-made effects and sounds, and Claude-written in-game words?

**Assets and rights**
17. Do the fight music licences allow a trailer and store page? Who made the menu track?
18. Who makes the capsule art, and who exports a clean logo?
19. Is the Quaternius credit right? The in-game board says CC0 and omits two packs the README lists (Bestiary, Universal Animation Library).

**Channels**
20. The playtest URL, the Discord invite, a website, a press email, social accounts?
21. Where do public patch notes go, and from which version?
22. Can playtest results or the floor poll be quoted?

---

## 13. Where the sources disagree

The designer may share other project files. This is what this brief chose, and why.

| Older or conflicting text | This brief |
|---|---|
| "Three floors", runs ending at floor 7, the README's "nine floors" | Final game: 10 (Decided). Today's public runs stop at floor 9, the code's last floor |
| "Dark ruins, fog and strong rim light" | Bright play spaces: the designer found the dark version unplayable |
| Style multiplies money | Visual only, since 0.3.4 |
| Floor paintings "playable" | Decoration: the code has no way to start a floor from them |
| "Every enemy has an execution" | 64 of 73 on floors 1 to 9 |
| Combat OST is "the designer's own" | Credited to Polarnyne and Intersonic Sound, in the game and the README |
| README roadmap lists Hellwarden, The Swarm's phases and the remaining boss intros as to do | All built |
| Five characters, the Fallen King, William Rich | Three: those two were removed in 0.3.80, Alpha Team in 0.3.91 |
| The Pistol, firearms, an R key to reload, Alpha Team, "4 playable characters" | All gone in 0.3.91. Older docs and update specs still mention them as history |
| The slide | Removed in 0.3.20 |
| "No live site yet" | A public build has been hosted on Netlify |
