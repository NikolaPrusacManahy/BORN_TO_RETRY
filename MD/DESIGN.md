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
| F | Quick punch. Always available, even holding a weapon. (It will also be the parry, which is on hold.) |
| Q | Throw the held weapon |
| E | Interact: pick up, buy, open |
| Esc | Pause |

No default uses Ctrl, because Ctrl+W closes the browser tab. In fullscreen we test whether the browser's keyboard lock can capture Ctrl; in the Steam build it is free. **(placeholder: C for slide)**

---

## 5. The player

### Movement
- Fast base speed with quick acceleration and almost no friction in the air.
- **Jump**, with coyote time (a jump still counts just after leaving a ledge) and a jump buffer (a jump pressed just before landing still counts).
- **Dash:** a short burst in the movement direction, brief invincibility. 3 charges that refill over time. **(placeholder)**
- **Slide:** eases up to slide speed, keeps it, lowers your height; slide-jump carries the momentum. Lasts **0.5 s at most**; press again to slide again (holding doesn't chain). Pressed in the air, it waits for the landing and eases in. (Update 0.0.3, the designer.)
- **Wall run:** in the air beside a wall, holding forward and heading along it (not into it), you run on it for **1 s at most** (Update 0.0.4; first 2 s). Rising fast (a pad launch, the start of a jump) never grabs a wall. The view tilts **clockwise with the wall on your left, anticlockwise on your right**. Jump to push off towards the other side; the next wall catches you into a new run, so runs chain. A wall can't be run twice without landing. (Update 0.0.3, the designer.)
- **Wall jump:** up to 3 in a row before touching the ground, when you're against a wall but not running on it. **(placeholder)** Jumps off a wall run don't count.
- **Ground slam (later: an unlockable skill):** in the air, slam straight down; jumping right after landing bounces you higher. Not in the base kit: the designer wants it unlocked later as a skill. Its code is kept, keyless, until then. (The slide key in the air used to fire it; since Update 0.0.3 that key waits to slide on landing.)

### Health
- 100 HP. **(placeholder)** No regeneration.
- **Blood heal:** damage you deal within a few metres heals you a little. Aggression is the main way to heal. **(placeholder amounts)**
- Other healing: health drops, shop, a part-heal after each boss.

### Fists (always available, never break)
- **Jab combo** (left click, barehanded): fast alternating punches; the third hit knocks back.
- **Charged punch** (hold right click): hold **1 s** until it's ready (a cue sounds), then let go to throw it. Letting go sooner cancels it; right click is never a light punch. (Update 0.0.3, the designer.)
- **Quick punch** (F): a fast punch, ready even mid-charge.
- **Parry (on hold):** taken out for now at the designer's request (Update 0.0.3); it returns later. When it does, punching an enemy projectile just before it hits sends it back at double damage and heals you a little, and parrying a melee attack staggers the attacker.
- Fist upgrades from the shop last for the rest of the run.

---

## 6. Weapons and items

### Weapons
- Dropped by some enemies (elites always, others sometimes) and sold in the shop.
- You hold one weapon at a time. Picking up another drops the current one.
- **Durability** counts uses (hits or shots). Drops are low (about 8–20 uses); shop weapons are sturdier. **(placeholder)**
- **Breaking is a payoff:** when durability hits 0, your next attack throws the weapon for a big hit. You can also throw it any time with Q.
- Families: **melee** (swords, axes, maces from the Fantasy Props kit) and **firearms** (Ultimate Guns, rarer). **(placeholder mix)**

### Items **(placeholder list)**
- Health orb (heals), coins, Rage (more damage for 10 s), Second Wind (refills dash charges).

---

## 7. Money and style
- Kills give money. Elites and bosses give more.
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
| Grunt | Melee chaser in groups. Fodder. |
| Spitter | Keeps distance and fires slow orbs that can be parried. |
| Brute | Slow and heavy, telegraphed ground slam. Often drops a weapon. |
| Leaper | Jumps at you from range; punish it on landing. |
| Shieldbearer | Blocks attacks from the front; a charged punch breaks the shield. |
| Elites | Glowing versions with more health and one extra trick. Always drop a weapon. |

Models come from Quaternius's Bestiary/Dungeon Monsters and Ultimate Monsters packs.

### Bosses **(placeholder)**
One per floor, three in total, each with 2 phases. Designs to come from the designer.

---

## 10. The run
- **A floor:** rooms 1–5, then the boss room.
- **A room:** you enter → doors lock → 2–3 waves of enemies → room cleared → reward → choose one of two doors.
- **Doors** show their reward before you pick: money, weapon cache, shop, health, or a harder room with a better reward.
- **After a boss:** a part-heal, then the next floor.
- **Win:** beat the floor 3 boss. The run ends and the next character unlocks.
- **Lose:** you die. You see a run summary (rooms cleared, kills, best style, time, seed) and return to the hub.

## 11. Procedural generation
Arenas are **hand-made templates assembled from a seed**, not random geometry, because random shapes play badly at high speed.
1. **Template pool:** each floor has its own pool of arena templates (pit, tower, courtyard, corridor arena, and so on), built from the modular ruins kit.
2. **Variation per room:** mirroring and rotation, cover layouts, hazards, jump pads and spawn points, all chosen from the seed.
3. **Enemy budget:** each room has a budget that grows with the room and floor number. It is spent on enemies from a weighted table, split into waves.
4. **Rewards:** door rewards are drawn from a weighted table, with guarantees (one shop per floor).
5. **Same seed, same run.** The seed shows on the run summary, so daily or shared-seed runs are easy later.

## 12. Characters **(placeholder)**
- You start with one character. Winning a run unlocks the next one.
- Each character has a **fist style**, a **movement twist** and a **passive**. Examples:
  - The Boxer (starter): fast jab combo, standard movement.
  - The Brawler: slower but heavier punches, the slam leaves a shockwave.
  - The Dancer: an extra dash charge, parries refill a dash.
- Names, looks and kits are the designer's call.

## 13. Between runs **(placeholder)**
- **Main menu (Update 0.0.4):** a low shot up a staircase at a dungeon gate with a portcullis, torches and banners, glowing white behind the bars. Rearing horse statues guard the stairs, with crates, a campfire and pale dead trees (Update 0.0.5). The BORN TO RETRY logo sits in the sky (skewed RETRY with a red offset, echoes trailing off it, a turning retry arrow; tagline "Die · Learn · Retry"). Start grinds the portcullis up and fades to black into the game (the designer cut the first-person walk-in). No hints on the menu (no key labels; the designer's rule for every interface).
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
| **M1** | **Feel lab:** one gray-box arena, movement, fists, two simple enemies, tuning panel | The core feels great, and the browser can deliver it |
| M2 | Combat sandbox: the enemy roster, weapons with durability and throwing, style meter, money | Fighting stays fun for minutes |
| M3 | Run structure: rooms, doors, procedural assembly, shop, first boss | One floor is a real roguelike run |
| M4 | Art pass: Quaternius models, arena kits, first-person arms, real sound effects | It looks and sounds like a game |
| M5 | Full run: 3 floors, 3 bosses, characters and unlocks, hub, saves | The complete game loop |
| M6 | Steam prep: Electron build, Steam achievements and cloud saves, store assets | Ready to sell |

## 17. Open questions for the designer
1. ~~The name~~ — decided: **Born To Retry** (2026-10-27).
2. The theme: are dark ruins and monsters right, or something else (sci-fi, hell, modern)?
3. Firearms: in the game from the start, or melee-only at first?
4. Boss ideas for floors 1–3.
5. The starter character and the unlock order.
