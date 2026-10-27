# BORN TO RETRY — Game Design

Status: first draft, 2026-10-27. Items marked **(placeholder)** are Claude's defaults and wait for the designer's call. Everything else was agreed in the planning chat.

---

## 1. Pitch
A first-person action roguelike. You start every run with your bare hands, tear through procedurally assembled arenas, grab weapons that break after a few uses, and fight your way to the final boss. It is fast, violent and built to feel great to control.

## 2. Pillars
1. **Feel first.** Movement, punching and hit feedback come before everything else. A feature that hurts feel is cut.
2. **Aggression pays.** You heal by fighting up close, style earns more money, and breaking a weapon is a payoff.
3. **Every run is different.** Hand-made arenas, combined and populated from a seed.
4. **Short runs.** A full run takes about 20–25 minutes.

## 3. Core facts
| | |
|---|---|
| Camera | First person |
| Players | Solo |
| Platform | Desktop browser; Steam later via Electron |
| Art | Quaternius low-poly (CC0): dark ruins, fog, rim light |
| Run | 3 floors × (5 rooms + a boss) = 18 rooms |
| Carries over between runs | Character unlocks and stats only. Money resets. |

---

## 4. Controls (all rebindable)
| Key | Action |
|---|---|
| WASD | Move |
| Mouse | Look |
| Space | Jump / wall jump |
| Shift | Dash |
| C | Slide. Pressed in the air, the slide starts when you land. |
| Left click | Attack: the held weapon, or a jab combo when barehanded |
| Right click | Heavy: charged punch when barehanded, the weapon's alt attack otherwise |
| F | Ground slam, in the air from a real height (Update 0.0.12, the designer). (The quick punch it used to be was cut in Update 0.0.10.) |
| Q | Throw the held weapon |
| E | Interact: pick up, buy, open |
| Esc | Pause |

No default uses Ctrl, because Ctrl+W closes the browser tab. In fullscreen we test whether the browser's keyboard lock can capture Ctrl; in the Steam build it is free. **(placeholder: C for slide)**

**Rebinding (M1 step 9, the designer: anything players want):** every action takes any key (Ctrl too), any mouse button (side buttons too) or a wheel direction. Only Esc stays fixed (it pauses), and the OS keys. A key another action uses swaps with it.

---

## 5. The player

### Movement
- Fast base speed with quick acceleration and almost no friction in the air.
- **Jump**, with coyote time (a jump still counts just after leaving a ledge) and a jump buffer (a jump pressed just before landing still counts).
- **Dash:** a short burst in the movement direction, brief invincibility. 3 charges that refill over time. **(placeholder)**
- **Slide:** eases up to slide speed, keeps it, lowers your height; slide-jump carries the momentum. Lasts **0.5 s at most**; press again to slide again (holding doesn't chain). Pressed in the air, it waits for the landing and eases in. (Update 0.0.3, the designer.)
- **Wall run:** in the air beside a wall, holding forward and heading along it (not into it), you run on it for **1 s at most** (Update 0.0.4; first 2 s). Rising fast (a pad launch, the start of a jump) never grabs a wall. The view tilts **clockwise with the wall on your left, anticlockwise on your right**. Jump to push off towards the other side; the next wall catches you into a new run, so runs chain. A wall can't be run twice without landing. (Update 0.0.3, the designer.)
- **Wall jump:** up to 3 in a row before touching the ground, when you're against a wall but not running on it. **(placeholder)** Jumps off a wall run don't count.
- **Ground slam (F, Update 0.0.12, the designer):** only from a real height (**1.8 m** or more above the ground: near the top of a jump, or off a ledge, a pad or a wall), you slam straight down. The landing is a blast: every enemy within **4 m** (wider and harder the further you fell, up to **7 m** and **90**) takes up to **35** damage (half at the edge) and is thrown outwards, with a shockwave, dust and a boom. Jumping right after landing bounces you higher. **(placeholder numbers)**

### Health
- 100 HP. **(placeholder)** No regeneration. Shown bottom left: the number and a bar.
- A short invincibility follows each hit (0.6 s **(placeholder)**), and the dash's invincibility stops damage too.
- **Death:** the world slows and fades to black. In the Feel Lab you're straight back at the start; in a run, death ends the run (M3).
- **Blood heal:** damage you deal within a few metres heals you a little. Aggression is the main way to heal. **(placeholder amounts)**
- Other healing: health drops, shop, a part-heal after each boss.

### Fists (always available, never break)
- **Jab combo** (left click, barehanded): fast alternating punches; the third hit knocks back.
- **Charged punch** (hold right click): hold **1 s** until it's ready (a cue sounds), then let go to throw it. Letting go sooner cancels it; right click is never a light punch. (Update 0.0.3, the designer.)
- **Parry (on hold):** taken out for now at the designer's request (Update 0.0.3); it returns later. When it does, punching an enemy projectile just before it hits sends it back at double damage and heals you a little, and parrying a melee attack staggers the attacker.
- Fist upgrades from the shop last for the rest of the run.

---

## 6. Weapons and items

### Weapons
- Dropped by grunts (**15%**; no other enemy drops one for now: the designer, Update 0.0.12) and sold in the shop.
- You hold one weapon at a time. Picking up another drops the current one.
- **Durability** counts uses (hits or shots). A weapon you pick up has **4 uses** (the designer, Update 0.0.12); shop weapons are sturdier. **(placeholder)** Misses cost nothing.
- **The Sword (M2):** held in the right hand; the left arm drops out of view. Left click slashes: a cut from the upper right through the middle to low left, straight back to ready. Holding right click points the tip at the crosshair; letting go pierces (longer and narrower than a slash, costs 2 uses). Q throws it after a short wind-up (drawn back, then thrust): it flies tip first, 70 damage and a hit-stop on the first thing it hits. Picking up uses E. **(placeholder numbers)**
- **Breaking is a payoff:** when durability hits 0, your next attack throws the weapon for a big hit. You can also throw it any time with Q.
- Families: **melee** (swords, axes, maces from the Fantasy Props kit) and **firearms** (Ultimate Guns, rarer). **(placeholder mix)**

### Items **(placeholder list)**
- Health orb (heals), coins, Rage (more damage for 10 s), Second Wind (refills dash charges).

---

## 7. Money and style
- Kills give money (Update 0.0.12): coins burst out of what you kill and fly to you: a grunt **2**, a spitter **4**, a brute **10**. Elites and bosses will give more. Your coins show just above the health bar. **(placeholder amounts)**
- **Style meter (D → C → B → A → S):** rises with variety, air kills, parries, throw kills and not getting hit; drops when you're hit or stop fighting.
- Style multiplies money from ×1.0 at D to ×2.0 at S. **(placeholder)**
- Money resets at the end of every run.

## 8. Shop
- Appears as a door choice at least once per floor (guaranteed by room 4). **(placeholder)**
- Sells: healing, fist upgrades, sturdier weapons, weapon repair, an extra dash charge. **(placeholder list and prices)**

---

## 9. Enemies **(placeholder roster)**
Rule: every attack is telegraphed (a flash and a sound) before it can hit, and every projectile can be parried unless it is clearly marked.

| Enemy | Role |
|---|---|
| Grunt | Melee chaser in groups. Fodder. **(M2: the Orc from Ultimate Monsters; 40 HP, 7 m/s, a 0.45 s warned wind-up, 15 damage; any hit flinches it; drops a sword 15%.)** |
| Spitter | Keeps distance and fires slow orbs that can be parried. **(Update 0.0.12: the Wizard from Ultimate Monsters; 30 HP; holds 7–16 m from you, coming closer when it can't see you, backing off when you're close, circling between; a 0.6 s warning (it rears, glows green, gurgles), then a 13 m/s orb for 12; a hit cancels the shot; 1.8 s between shots.)** |
| Brute | Slow and heavy, telegraphed ground slam. **(Update 0.0.12: the Yeti from Ultimate Monsters, 2.8 m; 160 HP, 3.5 m/s; in 3 m it rears up for 0.9 s while a ring on the ground shows its 3.6 m reach, then slams: 30 damage and thrown away if you're on the ground inside (jump it); 1.2 s winded after; only a hit of 40 or more staggers it. Drops no weapon: the designer.)** |
| Leaper | Jumps at you from range; punish it on landing. |
| Shieldbearer | Blocks attacks from the front; a charged punch breaks the shield. |
| Elites | Glowing versions with more health and one extra trick. Always drop a weapon. |

Models come from Quaternius's Bestiary/Dungeon Monsters and Ultimate Monsters packs.

### Bosses **(placeholder)**
One per floor, three in total, each with 2 phases. Designs to come from the designer.

---

## 10. The run
- **A floor (Update 0.0.12, the designer: like Soul Knight's levels):** a map of rooms joined by corridors that you explore. From the start room a winding way of five fight rooms leads to the way down; one or two side rooms branch off it. A small minimap (top right) shows the rooms you've been in and the ones beside them. (Later: the boss room at the end of the way, and the shop and reward rooms as side rooms.)
- **A room:** you step in → its doors slam shut → 2–3 waves of enemies → room cleared → the doors open.
- **The way down** (a trapdoor in the exit room) takes you to the next floor, with your health, coins and weapon. Dying starts a new run on a new floor plan. (Earlier plan: choose one of two doors showing their rewards; replaced by the explored floor.)
- **After a boss:** a part-heal, then the next floor.
- **Win:** beat the floor 3 boss. The run ends and the next character unlocks.
- **Lose:** you die. You see a run summary (rooms cleared, kills, best style, time, seed) and return to the hub.

## 11. Procedural generation
Arenas are **hand-made templates assembled from a seed**, not random geometry, because random shapes play badly at high speed.
1. **Room pool (Update 0.0.12):** nine hand-made fight rooms (colonnade, crossfire, altar, spike hall, ledges, maze, arena, twin, crypt), a start room and an exit room, drawn as text layouts on a 2 m grid and built from the Modular Dungeon Pack (parts 1 and 2: we're in dungeons). No room twice on a floor.
2. **Variation per room:** mirroring and quarter turns, optional cover on or off, and where enemies appear, all chosen from the seed.
3. **The floor plan:** rooms on a 5 × 5 board; the way and its side rooms laid out from the seed; 4 m corridors join arched doorways in the middle of the walls.
4. **Enemy budget:** each room has a budget that grows with how deep the room is and the floor number (grunt 1, spitter 2, brute 4; no brutes before the third room of floor 1), spent from a weighted table and split into waves.
5. **Rewards:** reward rooms drawn from a weighted table, with guarantees (one shop per floor). **(later)**
6. **Same seed, same run.** The seed shows on the run summary, so daily or shared-seed runs are easy later.

## 12. Characters **(placeholder)**
- **The roster (Update 0.0.8, the designer):** Joseph (the Adventurer): fists only, picks up used weapons. Fallen King, William Rich and Alpha Team are in the select screen, locked; their kits come later.
- **Character select:** Start opens the gate onto a prison corridor, one character per barred cell. Selecting a playable character lifts his cell's bars; a locked cell stays shut.
- You start with one character. Winning a run unlocks the next one.
- Each character has a **fist style**, a **movement twist** and a **passive**. Examples:
  - The Boxer (starter): fast jab combo, standard movement.
  - The Brawler: slower but heavier punches, the slam leaves a shockwave.
  - The Dancer: an extra dash charge, parries refill a dash.
- Names, looks and kits are the designer's call.

## 13. Between runs **(placeholder)**
- **Main menu (Update 0.0.4):** a low shot up a staircase at a dungeon gate with a portcullis, torches and banners, glowing white behind the bars. Rearing horse statues guard the stairs, with crates, a campfire and pale dead trees (Update 0.0.5). The BORN TO RETRY logo sits in the sky (skewed RETRY with a red offset, echoes trailing off it, a turning retry arrow; tagline "Die · Learn · Retry"). Start grinds the portcullis up and fades to black into the game (the designer cut the first-person walk-in). No hints on the menu (no key labels; the designer's rule for every interface).
- **Settings (Update 0.0.7, the designer):** the main menu has Start and Settings. Settings moves to a night camp in a forest clearing: sat on a log by a campfire, the options beside it, in two tabs (General, Controls: the controls live inside the settings). Back returns to the gate. The pause menu shows the same options.
- A small hub: pick a character, start a run, see stats and settings.
- Saved: unlocked characters, wins, best time, total kills, settings and key bindings.

---

## 14. Art and audio
- **Packs:** Modular Dungeon (the main menu's gate), Ultimate Nature (flat colour; the menu's dead trees), Modular Ruins, Bestiary/Dungeon Monsters, Ultimate Monsters, Fantasy Props MegaKit (melee weapons), Ultimate Guns (firearms), Universal Base Characters (first-person arms).
- **Look:** dark palette, fog, strong rim light so enemies read clearly against the background. Baked lighting in Blender for the arenas.
- **Audio:** hits matter more than music. Every punch, impact, parry, dash and kill needs a clear, punchy sound. Music rises with the action.

## 15. Tech
Browser game: Three.js + Rapier, React for menus and HUD, Blender scripts for asset conversion and arena building, Electron for Steam later. If milestone 1 shows the browser holding back the feel, we switch to Godot before building more.

## 16. Milestones
| | Milestone | What it proves |
|---|---|---|
| **M1** | **Feel lab:** one gray-box arena, movement, fists, two simple enemies, tuning panel | The core feels great, and the browser can deliver it. **Done (2026-10-27); browser kept.** |
| M2 | Combat sandbox: the enemy roster, weapons with durability and throwing, style meter, money | Fighting stays fun for minutes |
| M3 | Run structure: rooms, doors, procedural assembly, shop, first boss | One floor is a real roguelike run. **Started (Update 0.0.12): the dungeon floors, the room loop, the minimap.** |
| M4 | Art pass: Quaternius models, arena kits, first-person arms, real sound effects | It looks and sounds like a game |
| M5 | Full run: 3 floors, 3 bosses, characters and unlocks, hub, saves | The complete game loop |
| M6 | Steam prep: Electron build, Steam achievements and cloud saves, store assets | Ready to sell |

## 17. Open questions for the designer
1. ~~The name~~ — decided: **Born To Retry** (2026-10-27).
2. The theme: are dark ruins and monsters right, or something else (sci-fi, hell, modern)?
3. Firearms: in the game from the start, or melee-only at first?
4. Boss ideas for floors 1–3.
5. The starter character and the unlock order.
