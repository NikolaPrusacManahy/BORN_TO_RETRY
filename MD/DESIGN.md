# BORN TO RETRY — Game Design

Status: first draft, 2026-10-27. Items marked **(placeholder)** are Claude's defaults and wait for the designer's call. Everything else was agreed in the planning chat.

---

## 1. Pitch
A first-person action roguelike. You start every run with your bare hands, tear through procedurally assembled arenas, grab weapons that break after a few uses, and fight your way to the final boss. It is fast, violent and built to feel great to control.

## 2. Pillars
1. **Feel first.** Movement, punching and hit feedback come before everything else. A feature that hurts feel is cut.
2. **Aggression pays.** Style earns more money, and breaking a weapon is a payoff. (Update 0.0.13, the designer: you no longer heal by fighting; healing comes from the shop.)
3. **Every run is different.** Hand-made arenas, combined and populated from a seed.
4. **Short runs.** A full run takes about 20–25 minutes.

## 3. Core facts
| | |
|---|---|
| Camera | First person |
| Players | Solo |
| Platform | Desktop browser; Steam later via Electron |
| Art | Quaternius low-poly (CC0): dark ruins, fog, rim light. **The dungeon is in daylight (Update 0.0.13, the designer: it was far too dark to play): open to the sky, sunlit, a pale haze.** |
| Run | **9 floors** (Update 0.3.47, for the playtest's public build, the designer: "no access to floor 10, access of floor 1 to 9"; was 7 since Update 0.2.2), each a way of fight rooms and a boss. Floor 9's way down (the Moon's, after Tidebreaker) ends the run: "Run complete — Survived". Floor 10 (Hell on Earth) only from the dev build's Lab. |
| Floors' order | **Update 0.3.25** (the designer: "Floor 7 is an easier Floor than 4, 5 and 6"): 1 The Dungeon, 2 The Venom Garden, 3 The Bone Keep, **4 Frozen Depths** (was 7), 5 The Drowned Temple, **6 The Desert** (was 4), **7 Skull Cove** (was 6), **8 Shrine Dimension** (a Japan floor, to come), **9 The Moon** (was 8), **10 Hell on Earth** (the Forge's rooms meanwhile). The run ends at Skull Cove's way down (floor 7) for now. A floor's number is how deep it is (its rooms and enemies' count); its place (`world/dungeon/floorOrder.ts`) is its look, rooms, enemies and boss. The sections below keep the numbers they had when written. Spec `MD_UPDATES/U0325_FLOOR_ORDER.md`. |
| Carries over between runs | Character unlocks and stats only. Money resets. |

---

## 4. Controls (all rebindable)
| Key | Action |
|---|---|
| WASD | Move |
| Mouse | Look |
| Space | Jump / wall jump |
| Shift | Dash |
| Left click | Attack: the held weapon, or a jab combo when barehanded |
| Right click | Parry when barehanded (a press; Update 0.3.5, 0.3.6), the weapon's alt attack otherwise |
| Ctrl | Ground pound (the slam), in the air from a real height (Update 0.0.12, the designer: F; Update 0.3.20, the designer: "Ground pound is now Control key by default"). Under water, held, it dives. |
| Q | Throw the held weapon |
| E | Interact: pick up, buy, open |
| Mouse wheel | Switch key, in front of a chest (Update 0.0.16) |
| 1–5 | Weapon slots: 1 your fists, 2–5 the weapons you carry (Update 0.0.17, the designer); no gaps: a weapon gone, the ones after it move down a slot (Update 0.2.13, the designer) |
| Esc | Pause |

Only the ground pound uses Ctrl (Update 0.3.20, the designer's choice). Ctrl+W closes a browser tab: during a run the page asks first, and in fullscreen the browser's keyboard lock hands Ctrl+W to the game; in the Steam build it is free. A save from before 0.3.20 moves its ground pound from F to Ctrl (if Ctrl isn't taken). **The slide is gone (Update 0.3.20; the designer: "remove the sliding mechanics and all the Sliding fate or anything related to it"):** its key, its move, its sounds and its cards (Slingshot, Bowling, Runaway).

**Rebinding (M1 step 9, the designer: anything players want):** every action takes any key (Ctrl too), any mouse button (side buttons too) or a wheel direction. Only Esc stays fixed (it pauses), and the OS keys. A key another action uses swaps with it.

---

## 5. The player

### Movement
- Fast base speed with quick acceleration and almost no friction in the air.
- **Jump**, with coyote time (a jump still counts just after leaving a ledge) and a jump buffer (a jump pressed just before landing still counts).
- **Dash:** a short burst in the movement direction, brief invincibility. 3 charges that refill over time. **(placeholder)**
- ~~**Slide**~~ (Update 0.0.3 to 0.3.19): **removed in Update 0.3.20** (the designer: "remove the sliding mechanics").
- **Wall run:** in the air beside a wall, holding forward and heading along it (not into it), you run on it for **1 s at most** (Update 0.0.4; first 2 s). Rising fast (a pad launch, the start of a jump) never grabs a wall. The view tilts **clockwise with the wall on your left, anticlockwise on your right**. Jump to push off towards the other side; the next wall catches you into a new run, so runs chain. A wall can't be run twice without landing. (Update 0.0.3, the designer.)
- **Wall jump:** up to 3 in a row before touching the ground, when you're against a wall but not running on it. **(placeholder)** Jumps off a wall run don't count.
- **Swimming (Update 0.2.11, floor 6 only: the designer, "full under water … the pain of being slower than them"):** you swim at 6.5 m/s (you run at 12); forward is where you look, up and down too; jump rises, the ground pound's key (Ctrl; the slide's till Update 0.3.20) dives; you speed up slowly and glide to a stop; doing nothing you sink slowly to the floor; jump on the floor pushes off it. The dash key **kicks** (14 m/s, bleeding back to swim speed, untouchable 0.3 s), its charges coming back 1.75 × slower. No wall runs, wall jumps or slides; the slam still dives. Your eyes never leave the water (its top is just over the walls). **(placeholders)**
- **Ground slam, the ground pound (F, Update 0.0.12, the designer; Ctrl since Update 0.3.20):** only from a real height (**2.8 m** or more above the ground, Update 0.1.7, the designer: higher, was 1.8: beyond a plain jump, so off a ledge, a pad, a wall jump or a slam's bounce), you slam straight down. As it drops both fists come up clasped side by side; as it lands they come down into the floor, with a hard shake and a jolt (Update 0.1.7; Update 0.1.8, the designer: wrists straight, the backs of the hands towards you). The landing is a blast: every enemy within **4 m** (wider and harder the further you fell, up to **7 m** and **90**) takes up to **35** damage (half at the edge) and is thrown outwards, with a shockwave, dust and a boom. Jumping right after landing bounces you higher. **(placeholder numbers)** **Update 0.2.21 (a tester's hands stuck up):** the fists follow the slam (a slam ended by a dash, a wall jump, a pad or the water lets them go back); barehanded, a click as you drop punches as you land. **Update 0.2.22 (a tester: "this can be a Build around ground smash instead of having it at the start"):** the blast is a Fate Card's, **Tremor**: without it the slam drops and lands but hurts nothing (with the Fate Cards off or on ARE YOU EVEN HUMAN?, the blast as before); Fate Cards below.

### Health
- 100 HP. **(placeholder)** No regeneration. Shown bottom left: the number and a bar.
- A short invincibility follows each hit (0.6 s **(placeholder)**), and the dash's invincibility stops damage too.
- **Death:** the world slows and fades to black. In the Feel Lab you're straight back at the start; in a run, death ends the run (M3).
- **A floor's name (Update 0.2.8, the designer: "display FLOOR 1 when they start playing the game"):** every floor's start shows its name ("FLOOR 1" …) as the screen clears: a new run's (after its loader), a Retry's, the way down's, a floor from the Lab. Not the Lab's lone boss rooms.
- **The death screen (Update 0.1.14, the designer: play, lose, learn, retry):** dead in a run, once it's black: "Killed by" and what killed you, large in crimson (an enemy by its name in the game, or the turret, spikes, lava, the fall; poison names who poisoned you), then the floor, the time played (m:ss, not counting the pause) and your kills. Retry starts a new run; Menu goes to the main menu. The world holds still behind it. No hints. Drawn big (1.5× the first draft, the designer).
- **The loader (Update 0.1.14, the designer):** after Play on the character select (Update 0.2.9: through the lobby's main gate) and the fade to black, the logo's retry arrow turns bottom right on the black for at least a second while the level loads, then fades with the black. No words. **Update 0.3.23** (the designer: "add few loading screens and give the game some time to load stuff"): it covers every way into a level (after Lab, after Start into the lobby, a new floor, the Lab's floors and boss rooms, a Retry or a Restart) and stays up till the level is really ready: its models loaded and its shaders compiled, a second at least. The world (the floor's name too) waits under it. Spec `MD_UPDATES/U0323_LOADING_SCREENS.md`. **Update 0.3.24**: a floor loads only the enemies it can bring in (12 at most of 78), the lobby none, the Lab all (spec `MD_UPDATES/U0324_FASTER_FLOORS.md`).
- **The Lab (Update 0.0.19, the designer; dev builds only):** the main menu's Lab goes straight into the Feel Lab. Its panel (F8) spawns any enemy or boss in front of you, any item, bonus, weapon or a chest, and takes you to a boss's real room (its show and fight, then back to the Lab). It also has Clear, Heal, the Lab's waves and invincibility. Spec `MD_UPDATES/M3_LAB.md`.
- **The capture kit (Update 0.3.37, the designer: "Might need to make a trailer for this game"; dev builds only):**
  for filming the trailer from the game itself. F7 (or \) turns it on: the HUD is gone at once (the screen's flashes
  and the boss show's bars and name card stay). Its keys while it's on: 6 the HUD, 7 the arms, 8 a free camera (WASD,
  jump up, dash down, the wheel its speed), 9 slow motion (1×, ½×, ¼×), 0 a freeze, - and = the field of view, [ a
  dolly point, ] the dolly played (a smooth glide through up to 8 points in 6, 10, 16 or 4 s, set with ,), ; stop,
  ' clear, . this floor's boss room alone, its show from the start. Spec `MD_UPDATES/U0337_CAPTURE_KIT.md` (with the
  trailer's plan).
- **Healing (Update 0.0.13, the designer): only from the shop.** The heart heals half your health (a chest can hold one too). Hits you land heal nothing (blood heal is gone). After a boss (Update 0.0.15): it leaves a heart (Update 0.2.0: in its chest). **Executions heal (Update 0.2.0, the designer): 15, a mini boss 25.**
- **Poison (Update 0.0.18):** the snake's bite and the wasp's sting poison you: 3 a second for 4 s, past your shield. **(placeholder)**
- **The shield (Update 0.0.13, the designer):** the silver armour plate gives a shield of half your health, shown as a blue bar just above the health bar. A hit takes the shield first, then your health. At most a full bar (two plates). **(placeholder cap)**

### Fists (always available, never break)
- **Jab combo** (left click, barehanded): fast alternating punches; the third hit knocks back. **7, 7, then 10** (Update 0.2.4, the designer: "make it 6 hits default damage to the grunts, so it stays the same across all enemies, cause I have been testing it like this for the last 30 hours": a Grunt's 40 in 6 hits; were 10 and 14, 4 hits).
- **Charged punch** (hold right click): hold **1 s** until it's ready (a cue sounds), then let go to throw it. Letting go sooner cancels it; right click is never a light punch. (Update 0.0.3, the designer.) **Gone since Update 0.3.5** (the designer: "no more heavy punches from fists, now right click is parry"): barehanded, right click is the parry; a weapon's charge still takes the 1 s.
- **Parry (on hold):** taken out for now at the designer's request (Update 0.0.3); it returns later (it did: Update 0.3.3, on right click since 0.3.5; see The parry below). When it does, punching an enemy projectile just before it hits sends it back at double damage and heals you a little, and parrying a melee attack staggers the attacker.
- Fist upgrades from the shop last for the rest of the run.

---

## 6. Weapons and items

### Weapons
- Dropped by grunts (**15%**; no other enemy drops one for now: the designer, Update 0.0.12) and sold in the shop.
- You hold one weapon at a time. Picking up another drops the current one.
- **Durability** counts uses (hits or shots). A weapon you pick up has **10 uses** (the designer, Update 0.1.10; was 4); shop weapons are sturdier. **(placeholder)** Misses cost nothing.
- **The Sword (M2):** held in the right hand; the left arm drops out of view. Left click slashes: a cut from the upper right through the middle to low left, straight back to ready. Holding right click points the tip at the crosshair; letting go pierces (longer and narrower than a slash, costs 2 uses). Q throws it after a short wind-up (drawn back, then thrust): it flies tip first, 70 damage and a hit-stop on the first thing it hits. Picking up uses E. **(placeholder numbers)**
- **Breaking is a payoff:** when durability hits 0, your next attack throws the weapon for a big hit. You can also throw it any time with Q.
  (Update 0.3.36, a tester: "if you are holding attack and pick up a weapon you can use it infinitely as long as you
  hold click": a broken weapon with the click still held is thrown too; it's never swung at 0 uses.)
- **The Gold Sword (Update 0.0.13, the designer):** the shop's sword: the sword's moves and damage, **30 uses** (Update 0.1.10; was 40). Buying it puts it in your hand (the weapon you held drops at your feet).
- **The Grimoire (Update 0.1.4, the designer; spec `MD_UPDATES/U014_GRIMOIRE.md`):** an open book (Ultimate RPG pack, `Book3_Open`). The right hand holds it open, palm up under its spine, low on the right; the left hand is palm up, low on the left, its fingers curled round a fireball (flames, embers, a flickering light). Left click casts a fireball every **0.5 s** while held: the left palm thrusts out, fingers up, and the ball leaves it, flying straight at **34 m/s** for up to **1.5 s**; it hits the first thing for **30** and bursts, **15** to everything within **1.6 m**; a wall bursts it too. **Right click held charges it like a Ki blast** (the designer): the palm held out in the cast stance, the ball growing before it; **each half second burns a use** (the designer: charging 50% faster), up to **10**; let go, it's cast, bigger, slower and harder the longer it was held: **2.5 s** ×8 damage, its burst **15 m** (half a room); **5 s** twice that, ×20 damage, **30 m** (the whole room). A tap is a plain fireball. **50 uses** (the designer, Update 0.2.12; was 25, first 12); every cast burns its uses, hit or miss. At 0 the next attack throws it; Q throws it any time. In the shop (a better item, **70**) and in rare chests. Fire is orange. **(placeholder numbers)**
- **The Gold Axe (Update 0.1.5, the designer; spec `MD_UPDATES/U015_AXE_HAMMER.md`):** one-handed, held near the end of the haft, its own hacks (**30**, every **0.5 s**). **Right click charges a throw** (Update 0.1.6): at full charge **2× as fast and 2× as hard**. That throw doesn't break: it drops where it hits (**55** uncharged), sticks in walls, and **right click again calls it back** like Thor's hammer, through walls, hitting what it passes once (**35**), into your hand. **Q throws it to break**, as any weapon. **30 uses.**
- **The Hammer (Update 0.1.5, the designer):** two-handed (right hand near the end, left just above it), slow heavy heaves (**50**, every **0.9 s**). Its charged smash lands on the floor (**80**), **only on the ground** (Update 0.1.7: a full charge let go in the air is held till you land), and a **shockwave rolls out before you, a half circle** (Update 0.1.6), to **30 m**: every enemy under it takes **40** once (not fliers over it, nor anything behind a wall). A smash costs **3 uses**, hit or miss. **15 uses** (Update 0.1.10; was 20).
- **The Gold Hammer (Update 0.1.10, the designer):** the Hammer in gold, **35 uses**.
- Both are in the shop (**70**) and rare chests.
- **The Dual Daggers (Update 0.1.9, the designer: "one in each hand, very fast hits, last very long, +15% move speed while held", then "mainly used to throw massive amounts continually", like the Trickster's Main Event in Dead by Daylight; spec `MD_UPDATES/U019_DAGGERS.md`):** a dagger in each fist. Left click cuts **right, left, right…**, a cut every **0.15 s** (**20** each: twice a jab). **Right click held 1.5 s throws a volley** (the designer: the Trickster's stance, each dagger flipped to be held by the tip): **25 daggers**, one every **0.12 s**, the hands taking turns, each flying where you aim as it's thrown (**20** each; a use each). **+15% run speed** while they're in your hand. Q throws the pair, to break. **30 uses** ("30 daggers", Update 0.1.10; was 100).
- **The Gold Daggers (Update 0.1.10, the designer):** the Dual Daggers in gold, **90 uses**; their thrown daggers fly gold. In the shop (**70**) and rare chests. **(placeholder numbers)**
- **No guns (Update 0.3.91, the designer: "scrap every guns"; spec `MD_UPDATES/U0391_NO_GUNS.md`):** the player has no gun of any kind. The Pistol (0.2.4 to 0.3.90; spec `MD_UPDATES/U024_PISTOL.md`) is gone, and five more built for it never landed. Enemies still shoot.
- Families: **melee** (swords, axes, maces from the Fantasy Props kit). **(placeholder mix)**

### Items (Update 0.0.13, the designer)
From the shop (70 coins each) and chests (Ultimate RPG Pack models):
| Item | Does |
|---|---|
| Heart | Heals half your health. |
| Great Heart (Update 0.1.10, the designer: "a better healing heart") | Heals all your health. A bigger, crimson heart in a pink glow. Chests only (uncommon). **(placeholder: how much it heals)** |
| Silver armour plate | 20 shield (the blue bar). (Update 0.0.17, the designer: was half your health.) |
| Gold armour (Update 0.0.17) | 40 shield. |
| Gold sword | A sword with 30 uses, into the next weapon slot and your hand. |
| Red ring | +15 max health (and the health to fill it), for the rest of the run. (Update 0.0.17, the designer: was +25% damage.) Rings stack. **(placeholder: stacking)** |
| Teal ring (Update 0.2.0, the designer) | +25 max health (and the health to fill it), for the rest of the run. **Mythic** (mythic chests), 110 in the shop (the Gold Daggers' price). The pack's teal band (Ring7). It replaces the purple ring (+20% damage): no ring or item adds damage any more. |
| Green ring (Update 0.0.17) | +15% melee attack speed (jabs and slashes), for the rest of the run. |
| Blue ring | +15% run speed (running; not the dash), for the rest of the run. (Update 0.0.17: was 20%.) |
| Key | Opens a chest. |
| White key (Update 0.0.16) | Opens a chest: rare or better. Pale silver, a blue aura. |
| Gold key (Update 0.0.16) | Opens a chest: epic or mythic. Gold, a yellow aura. |

What you carry (keys, rings, the shield) goes down to the next floor with you and is lost when you die.

### Blood (Update 0.2.26, the designer: "blood splashes", "Red, plentiful"; spec `MD_UPDATES/U0226_BLOOD.md`)
- Every hit on an enemy sprays its blood away from you (more the harder the hit); drops splat on the floor; a kill bursts
  and leaves a pool; an execution's end bursts with pools. Splats lie 40 s (260 at most). Each enemy its own: red,
  green ichor, bone chips, spores, a pale mist, amber sap, dark ink; a cloud under water. **Options → Blood: On / Less /
  Off.**

### The enemies' shots (Update 0.2.27; spec `MD_UPDATES/U0227_SHOTS.md`)
- Each its own shape: fireballs (a white-hot core in flickering flame, embers behind; the Blue Demon's blue), the
  Spitter's acid (a wobbling glob, dripping; it stains the floor where it lands), the Glubs' water bolts, a Tribal's
  spear, a Cactoro's thorn, a Mask Tribal's feather, a Rabbit's carrot (tumbling). Each bursts its own way where it ends.

### Your blows and the deaths (Update 0.2.28; spec `MD_UPDATES/U0228_BLOWS.md`)
- A swing leaves an arc across your view (silver, gold, a hammer's broad sweep, the daggers' thin one); a punch landing
  bursts a ring of dust; a hammer's smash throws rocks and dust; a hit squashes an enemy a moment; the dead sink into
  the floor before they go (not bosses, fliers or fish).

### The air and the glow; settings (Update 0.3.0; spec `MD_UPDATES/U030_AIR_AND_SETTINGS.md`)
- Each floor's motes drift round you; embers rise off lava; a soft glow (halos) round fire shots, lava and sludge,
  crystals, mushrooms and candles, never torches; no torch lights (they cost frames: the designer); at low health the
  screen's edge beats red. **Options in pages:** General, Graphics (display, field of view, Glow, Effects high/low,
  Blood), Audio, Controls; each page can restore its defaults.
- **Lighter to run (Update 0.3.38, the designer: "my PC go full fan speed"; spec `MD_UPDATES/U0338_LIGHTER.md`):**
  a floor's pieces are drawn square by square (30 m), so what's out of view or out of the sun's shadow box isn't drawn
  (about a third of a floor, not all of it). Graphics has **Frame rate** (30–240 fps or Unlimited; 144 at first); the
  menus and the pause menu at 60 at most. The menus' scenes merged by look (the gate 653 meshes → 20), their shadows
  drawn once. **Update 0.3.39** (spec `MD_UPDATES/U0339_FAR_PIECES.md`): a square more than 15 m off draws floor 1's
  tile, wall and cap as far copies, each stone its box (1,176 → 144 triangles a tile); floor 1 in view 5.7 → 1.8 million.
  **Update 0.3.44** (spec `MD_UPDATES/U0344_LAB_SPEED.md`): floors started from the Lab ran at 60–72 fps (from the lobby,
  144): every enemy slot's hidden body of every kind was in the scene, and the Lab loads all 97 kinds (48,689 objects
  walked a frame). A slot's body is in the scene now only while it shows it. **Update 0.3.45** (spec
  `MD_UPDATES/U0345_FPS_COUNTER.md`): a frame-rate counter players can show, top left (fps and the worst frame), on F2
  by default; its key in Graphics → **Show FPS**, under Frame rate.
- **Feedback (Update 0.3.46, for the playtest; spec `MD_UPDATES/U0346_FEEDBACK.md`):** pause menu → Feedback: fields for
  cards, level design, enemies, difficulty, ideas; the game adds the average frame rate of the session's play, the frame
  cap, glow and effects; Copy, to paste into the designer's Discord. Nothing is sent anywhere.

### The rush (Update 0.3.1, the designer: "like Doom or Ultrakill"; spec `MD_UPDATES/U031_EXECUTIONS_AND_RUSH.md`)
- Executions hold you where you grabbed the enemy (in the air too) till you let go. A freeze on every hit (jab 25 ms,
  finisher 70, charged up to 120, kill 90), harder shakes and kicks, more knockback, a deep thump under every blow. The
  dash 40 m/s for 0.14 s; the slide 22 m/s, lasting while held (1.5 s at most; the slide gone in Update 0.3.20); the view widens 14° in a dash, up to 16°
  at speed; speed lines. **(placeholder numbers, F1)**

### Brutal executions (Update 0.3.2; spec `MD_UPDATES/U032_BRUTAL_EXECUTIONS.md`)
- The finishing blow (the body let go, or bursting in your hands): the world at a quarter speed for half a second, the
  camera lunging in 14°, a red flash and a shake; a bone crunch under every blow; more blood, a thrown body bursting
  where it lands. **(placeholder numbers, F1 → Execution)**

### The parry (Update 0.3.3, the designer: "Yes, parrying"; spec `MD_UPDATES/U033_PARRY.md`)
- A fist punch (jab, finisher, charged) that meets an enemy's shot sends it back the way you look, onto the enemy
  nearest your aim (within 20°), 1.8× as fast and doing 60; it hits enemies, never you; it never heals. A freeze, a gold
  ring and flash, a clang. Fists only. **(placeholder numbers, F1 → Fists, Hit feel)**
- **Update 0.3.5 (the designer: "now right click is parry … it still has to time the hit with the projectile
  properly"; spec `MD_UPDATES/U035_PARRY_ON_RIGHT_CLICK.md`):** barehanded, **right click held is the block** (both fists
  up before the face, no jabs); **its press opens the parry for 0.2 s**: a shot within a fist's reach meanwhile goes
  back, the fists punching forward a hand's width. Held on, it doesn't parry; **0.4 s** from a press to the next.
  Punches no longer parry. Hair Trigger (the window twice as long), Cold Snap, Thunderclap, Powder Keg (where a parried
  shot hits) and Giant Killer (no wait) moved onto it from the charged punch. **(placeholder numbers, F1 → Fists)**
- **Update 0.3.6 (the designer: "do the quick animation and then continue gameplay, animation stays 0.5 sec on screen,
  no left hand"; "make the punch animation when a parry has been performed … 4 sec cooldown"; spec
  `MD_UPDATES/U036_QUICK_PARRY.md`):** no block held: a press opens the 0.2 s window (no jabs meanwhile), then the fists
  go on. The right fist snaps up before the face for half a second; the left stays in the guard. A parry that lands: the
  right fist punches the shot (half a second on screen with the freeze). **4 s** after a parry that lands; **0.5 s**
  after a press that caught nothing.

### Floor 6 — Skull Cove, reworked (floor 7 since Update 0.3.25) (Update 0.3.14; the plan `MD/FLOOR6_PIRATE_PLAN.md`; spec `MD_UPDATES/U0314_SKULL_COVE.md`)
- The designer reworked floor 6: a pirate floor (the Pirate Kit), its boss the Big Shark fought under water, new
  enemies. The Sunken Grove (0.2.11), its fish and the Old Whale are out of the game.
- Sand everywhere; **the sea** in channels and pools (fall in: hurt and bounced back out; a body knocked in sinks, as over any
  pit); **powder kegs** (a punch, a slam, a thrown body or a blast sets them off; up to 30 to you, 150 to enemies;
  chains); boardwalks, a beached wreck (its deck a platform), small boats on the sand, houses, outcrops, giant bones.
  **No cannons** (the designer: "far far unmanagable on fast gameplay"). Nine rooms of its own. **(placeholder
  numbers, F1 → Skull Cove)**
- **Its crew** (Update 0.3.15; spec `MD_UPDATES/U0315_COVE_CREW.md`): the **Corsair** (her hook drags you in, then her
  axe), the **Shanty Man** (his song quickens the crew round him; he keeps away), the **Bomber** (lit powder bombs that
  burn where they land: punch one back at him), the **Cursed Crewman** (brought down, it goes on headless and blind,
  hunting where it heard you), the **Thieving Gull** (snatches your coins: kill it before it's away; in pairs), the
  **Cave Bats** (a swarm of 4, diving one at a time), the **Kraken Tentacle** (the designer's: lurks in the sea and
  grabs you by surprise as you come near; click free or be slammed down, on the shore either way, never the sea; your
  clicks can't finish it: punch it from the shore while it reels). At most 3 Shanty Men a room. The Crewman sheds bone chips and has the Skeleton's execution;
  no blood lies on the sea.
- **Never tankier** (the designer, Update 0.3.15: "do not make enemies tankier NEVER"): a floor's enemies have no more
  health than the floors before's (regulars 12–60, mini bosses up to 340); harder means more AI (the Bomber leads his
  throws).
- **One standing keeps moving** (Update 0.3.68; spec `MD_UPDATES/U0368_IDLE_STANDS.md`): its idle loops at its own pace, through a flinch or a rise with no clip of its own. A corpse stops, and one in your execution plays it once and holds, since your hands follow its bones.
- **Every enemy's run plays at the pace it really goes** (Update 0.3.15, the designer: they "run on the same spot");
  one barely moving stands. Mini bosses: **Mako** (dives into the sand, its fin cutting to you, erupts under you; on boards
  it charges) and **Captain Barbarossa** (a red aim line that follows you slower than you run, then his shot; cover
  stops it). Its boss still stands in till the Big Shark. **(placeholder numbers, F1 → Floor 6 crew; Floor 6 kraken,
  Mako, Captain)**

- **Its boss, the Big Shark** (Update 0.3.16; spec `MD_UPDATES/U0316_BIG_SHARK.md`): its arena's walls half again as
  high (9 m), flooded to 8.4 m in its show (high over the corner as it floods, over its shoulder as it swims, ahead of it
  as it leaps out of the water slowed, its name on the right); you swim. Its lunge and its snap: an arrow, press move
  left or move right that way to escape its jaws. Its swallow: caught, your hands hold its jaws apart, click fast and
  punch its throat, or it's one shot. Its tail, its teeth stuck in a wall, its frenzy below half. 1260 health. Dead,
  the arena drains. **(placeholder numbers, F1 → Big Shark)**
- **The Big Shark by the Boss Design Bible** (Update 0.3.62; spec `MD_UPDATES/U0362_BIG_SHARK_BIBLE.md`): "The arena is a weapon". It stays under water with its jaw moves and swallow. New: a **Breach** (bubbles under you; it comes up through them and out, open in the air), a **Hull Ram** (into a sunken ship: a shock along the seabed, wreckage, its teeth stuck), an **Undertow** (a whirlpool whose eye bites). Phase 2: the ships keep coming apart; **Blood Scent** (hurt, you bleed; 2 s at one spot and it strikes there), **Deck Breaker** (planks bulge; it smashes out, stuck in the hole 3 s). Its ultimate, **Abyss Jaws**, as phase 2 starts then every 60 s: the water goes still, it waits under an anchor, its chain glowing: hit the chain and the anchor crushes it, stunned 7 s; not, it comes down on you, 50.

### Floor 8 — the Shrine Dimension (Update 0.3.32; the plan `MD/FLOOR8_SHRINE_PLAN.md`; spec `MD_UPDATES/U0332_SHRINE_LEVEL.md`)
- The designer: "Japan theme … karate or martial art enemies … Sakura trees and a shrine and this kind of thing, loads
  of sakura leaves"; the plan agreed ("go with that, without the Wolf yet, I will redesign him after").
- **Its level (0.3.32):** pale castle stone and grey paving under a soft spring sky, a pale pink haze; islands of rock
  floating far off all round, a pagoda, torii, the shrine hall and sakura on them.
  - **Sakura everywhere:** More_nature's Tree set, its blossom cut-outs made in code, in beds of earth. A carpet of
    fallen petals under each; petals falling everywhere, tumbling, in gusts.
  - **Pieces made in code:** vermilion torii over every doorway and across its paths; stone lanterns; red paper
    lanterns on the walls in place of torches; bamboo; maples; pines; small shrines; the shrine hall; a pagoda; a bell
    tower; raked gravel; a dojo's planks, dummies and racks; ponds (deep: you're hurt and bounced back out; a body knocked in drowns) under red railed
    bridges.
  - **Nine rooms:** the torii path, the sakura grove, the zen garden, the koi pond, the bamboo forest, the dojo, the
    lantern steps, the pagoda court, the tea garden. Its boss room is the Great Shrine.
  - Playable in the Lab; the run still ends at floor 7.
- **Its martial artists (0.3.33; spec `MD_UPDATES/U0333_SHRINE_FIGHTERS.md`).** The designer: "make sure enemies are
  indeed martial art experts, dashing, side steps … something challeging … match the proper animation".
  - **Their clips:** the Universal Animation Library's, retargeted onto the people's rig and baked into each model.
    Every move plays its own clip, and each blow lands where the clip's fist, foot or blade does.
  - **What they all share** (`sim/enemies/martial.ts`):
    - a stance at their own distance, side-stepping round you, backing off if crowded;
    - a sprinting dash ending in a blow;
    - side-steps from your blows, likelier the more you swing;
    - open after each strike.
  - **Karateka (40):** combos and a kick that throws you back; blocks blows from in front and counters at once.
  - **Karate Girl (30):** quicker, a flying knee, dodges more, back-flips away after her combo.
  - **Shinobi (28):** a fan of three shuriken; a dash cut through you; vanishes behind you.
  - **Kunoichi (24):** wall runs and leaps down on you (a blow all round her landing); kunai.
  - **Sand Ninjas (26):** smoke bombs (clouds you can't see through); caltrops that cut and slow; a roll away.
  - **Archer (22):** draws with a glint, then a shot or, every third, a volley of three; backs away; the perchers.
  - **The Sensei (320):** turns every blow from in front, and every third brings his counter; staff combos, a slam's
    ring, a ki palm.
  - **The Shadow (300):** a long cut along a red line through you; clones at two thirds and one third of his health
    (one hit each, half his blows, gone when he falls); a leap; vanishes behind you.
- **Its boss, Yokai : Okami (0.3.34; spec `MD_UPDATES/U0334_OKAMI.md`).** The designer: "Call it "Yokai : Okami" and
  yes build it".
  - **Its look:** the Bestiary's Lycan, 5.2 m, no sword. White fur, our own red kabuki-style markings, ember eyes; a
    fire mane down its spine, fire at its tail and paws; a straw shimenawa with two paper shide. 1295 health.
  - **Its show (the designer's intro):**
    1. The rooms are all destroyed at once and the arena grows to 120 m.
    2. The sky's islands come in over it.
    3. It comes down on its own, which crashes into the arena: far and wide, its shock wave blows everything away.
    4. Three temples fall across the way you came in.
    5. The other islands merge with the arena as mounds you walk up.
    6. Its leap in slow motion (0.56×) with its name.
    7. Its destroying landing, its monster transformation and scream, then back to your eyes.
  - **Its moves (0.3.35; spec `MD_UPDATES/U0335_OKAMI_MOVES.md`):** every pause it picks one by how far you are, never one
    three times running.
    - **Up close:** its claws (a swipe), its bite, or its roar of fire (a cone of flame, 26).
    - **Its clips are a beast's** (the designer: "he has human animations?"): the Library's Zombie set (hunched,
      prowling, running feral, claws, bite) and its monster roar, none of its fighters'.
    - **Further off:** its four leaps (each down where you are: 22, a shockwave), its blue fireball (charged, hurled,
      32 in its blast) or its fire dash (its line shown, through you once, 26; the line burning after).
    - **Its devastation**, first at 75% of its health, then every 40 s: in the middle, charging 7 s, a ring of fire
      filling to the walls that your hits drive back. Full at the end: its massive fireball, 70 everywhere. Broken: it
      reels 3 s.
- **Next:** Okami's rage and frenzy (when the designer wants them); then the run goes on past floor 7.

### Floor 8 — the Moon (floor 9 since Update 0.3.25) (Update 0.3.17; the plan `MD/FLOOR8_MOON_PLAN.md`; spec `MD_UPDATES/U0317_THE_MOON.md`)
- The designer: "BIG REWORK of FLOOR 8": a sci-fi moon floor (the Ultimate Space Kit, `ASSETS/QUATERNIUS/FLOOR-8`).
- A black space sky of stars with the Earth large in it, a ringed planet, the sun; bright all the same (a hard white
  sun on pale grey moon dust). Moon base modules, domes, rovers, solar panels, boulders, craters (meteorites in the big
  ones); alien plants only in the greenhouse's beds. No torches. **Moon gravity** (0.625: jumps 1.6 times as high,
  knocked enemies fly further). **Meteor showers** in three rooms (warned by a shadow and a glow; 20 to you, thrown; 60
  to an enemy). Nine rooms of its own. **(placeholder numbers, F1 → Moon)**
- **Its crew (Update 0.3.18; spec `MD_UPDATES/U0318_MOON_CREW.md`; the designer's roster):** each animal its role, on
  foot and in its tiny ship: Flamingo range (the Gunner's bursts, the Strafer's lines of bolts), Fox the flank (the
  Flanker round to your side, the Diver's ram), Frog the ground (the Leaper's leap and shock ring, the Mine-layer's
  floating mines). Every wave mixes the three roles. Mini bosses: the Bee's ship (passes, a bombing run down a marked
  line, then low and cooling) and the Bee mech (it glides on its jets firing salvos of homing missiles, lands and holds
  1 s), broken, Barbara climbs out and fights on foot. **(placeholder numbers, F1 → Moon crew, Moon mini bosses)**
  **Update 0.3.28 (the designer: "Mechs as minibosses, they are all the same just different looks … just add the
  remaning 3 as identical functions as bee mech"; spec `MD_UPDATES/U0328_MOON_MECHS.md`):** the Flamingo's, the Fox's
  and the Frog's mechs are mini bosses too, the Bee mech's in everything but their looks; broken, Fernando, Rae and Finn
  climb out and fight as Barbara. The four share the Bee mech's old share of the rooms.
- **Its boss, Tidebreaker** (Update 0.3.29, the designer: "Alien as Moon boss"; "It's the last boss before the last boss,
  make sure it is intense and full destructions, maybe they can grab a pillar … can shake the whole place"; spec
  `MD_UPDATES/U0329_TIDEBREAKER.md`): the Bestiary pack's big alien, blue, its anchor in hand (the Universal Animation
  Library's clips: `tools/ual_bake.py`), 5.4 m, in its own arena, the shattered crater (twelve pillars). Close: its
  anchor smash (a shockwave along the floor), a combo (raging, a finisher), its uppercut (throwing you high). Further:
  its moon leap (a ring where it lands; landing it rings out, snaps the pillars beside it, shakes rock down), a boulder
  ripped out of the floor and hurled, its shell roll (through the pillars, off the walls back at you, then dizzy), and a
  pillar torn out, swung down at you and hurled. Raging (55%): its quakes (three rings, every pillar near snapping, rock
  all round), rock falling near you; frenzied (22%): quicker still. The whole place shakes. 1330 health.
  **(placeholder numbers, F1 → Tidebreaker)** **Update 0.3.30 (the designer, having seen it; `MD_UPDATES/U0330_TIDEBREAKER_SEEN.md`):**
  no weapon (its fists); no shell roll ("remove the spinning attack"); its jump the three Jump clips (crouch,
  Jump_Start into Jump_Loop, Jump_Land); its own impact (a crater cracked into the dust, dust rising, rock flung out)
  and shockwaves (walls of dust); its run to a pillar twice as fast; no fan or mark before its pillar flies; raging,
  its quake far likelier. **Update 0.3.31 — its show (`MD_UPDATES/U0331_TIDEBREAKER_SHOW.md`):** its arena twice a
  boss room (120 m, 28 pillars); stepping in, the floor's other rooms blow up one after another, the furthest first,
  every piece flung into space, the sky bursting and the ringed planet with them; its walls slide out to a boss room's
  size, then twice it; the Earth shakes and bursts (a field of rock where it hung after); a meteor out of it (two
  angles) strikes the arena's middle, white; Tidebreaker rises out of the crater doing its MonsterTransformation,
  slowed, its name on the right, the whole place shaking. Won, only the way down opens (the rooms behind are gone).

### The Forge (Update 0.3.13; spec `MD_UPDATES/U0313_THE_FORGE.md`; Update 0.3.17 — out of floor 8, kept on floor 10; Update 0.3.25 — floor 10 is Hell on Earth, its rooms meanwhile)
- The designer: every floor's level first ("I want all designs to be done first"), then the enemies.
- Floor 3's stone sooty grey under a pale smoky sky, warmed by lava pits again (wider), swords on the walls,
  workbenches with glowing ore, embers rising. **Presses** (crusher cells side by side, one hammer): hang, clank (a shadow spreads), drop, rest
  (in the way), rise; landing on you 40 and you're thrown out, on an enemy 150. **Fire vents:** idle, sputter, jet
  4 m (15 to you once a jet, thrown up; 40 to an enemy). **Belts** carry you (2.6 m/s), enemies and bodies. A room's
  presses and vents go in waves. All of it holds still while an execution holds the world. Nine rooms of its own;
  stand-in enemies and boss. **(placeholder numbers, F1 → The Forge)**

### Floor 10 — Hell on Earth: its look (Update 0.3.43; the plan `MD/FLOOR10_HELL_PLAN.md`; spec `MD_UPDATES/U0343_HELL_LOOK.md`)
- **Its boss, Hellwarden** (Update 0.3.63; spec `MD_UPDATES/U0363_HELLWARDEN.md`; the Boss Design Bible's Blazing Sword Demon, "The final exam"): a **Blazing Arc** (blade flares; jump the swing; a wall of fire for 4 s; columns cut through), a **Hellfire Lunge** (embers, a whoosh from the side it'll arrive on; parry the thrust: open 2 s), a **Brand of Ruin** (sword in the floor; fire pillars along 8 lines: stand in the gaps). Phase 2, at half health: its columns come down, the floor cracks, its sword splits: **Echoes of the Fallen** (shadows of the Dragon, Giant, Raptor and Wolf, each dodged as it was), **Twin Blade Recall** (parry a blade: it's weak 12 s). Its ultimate, **Last Verdict**, as phase 2 starts then every 60 s: the screen drains of colour, a great sword charges 3 s, one parry at its flash: it shatters, down 8 s; anything else: dead, the only one-shot in the game. Its room: `world/dungeon/throne.ts`. 1330 health.
- **Its show** (Update 0.3.65, the designer's shot list; `sim/dungeon/wardenShow.ts`, spec `MD_UPDATES/U0365_HELLWARDEN_FORGED.md`; about 20 s, SPACE skips): an iron door slams behind you and the braziers die one after another; in the dark the walls go back, a river of lava opens and every bone on the floor is dragged into it (it's built from your dead; the more you've fallen, the more bones); a bare molten figure rises out of it; the chains snap and the rocks crack, its armor clamping on red hot, a hard cut on each metal hit: boots, gauntlets, hips, chest, the pauldrons last; its sword rises out of the lava dull grey, and the heat follows its claws from hilt to tip; a skull floats up off the heap on the bank, growing horns, and is its mask: a dark socket, the eye igniting white, then a hard cut to silence. It leaps at you, and mid-air everything stops, drained of colour: its name, and **"Forged from the 247 times you fell."** (the save counts your deaths). It lands 6.5 m from you and the controls are yours as it lands: the leap is its first attack, a ring reaching you about 0.55 s later for 20 (jump or dash it; no ring if you skipped). **Half health:** its mask cracks and its second eye lights. **Readability:** the orange sky stays drawn down through the fight (the floor's light isn't touched), and it has an orange rim and lava light from under it.
- The designer: "what do we design in floor 10? … a hell level?", then "Go with your mix", "Agreed, start". The
  plan's first step: the Forge's rooms and machinery turned to Hell's (its enemies, echo rooms and Hellwarden next).
- **Stone:** basalt walls, dark and a little glossy; red-brown paving; **seams of lava glowing** through both, hottest at
  the walls' feet, breathing; some stone left whole. Iron dark, bones scorched, wood charred.
- **Sky:** a furnace sky, bright orange at the walls' tops deepening to red overhead, a dull red sun, ash clouds
  drifting, smoke rising beyond the walls. Still bright (the designer's rule): a warm strong sky light, the lava's
  from below.
- **Dressing:** heavy chains on the walls (swags and straight drops, over your head, never by doors, torches or
  skulls); an iron brazier burning in each room's corners (solid); burnt trees in beds of ash in five rooms (solid
  trunks, never on paving); skulls on the walls; bones, rocks and glowing ore along them; basalt boulders for cover;
  embers and ash rising.
- **Brimstone** in three rooms (smelting hall, workshop, great press; never the lava crossing) while they fight: about
  every 4 s a burning rock is called down where you'll be, a ring of fire at its whole reach; 1.4 s later 18 to you
  and thrown, 60 to an enemy. **(placeholder numbers, F1 → Hell (floor 10))**

### Floor 7 — Frozen Depths (floor 4 since Update 0.3.25) (Update 0.3.11; the plan for floors 7–10: `MD/FLOORS_7_10_PLAN.md`; spec `MD_UPDATES/U0311_FROZEN_DEPTHS.md`)
- The run is **10 floors** (players polled: at least 10); for now it ends at floor 6's way down, moving on as each floor
  is done.
- Floor 3's stone frosted under a winter sky; snowy trees in beds of snow; snowy rocks for cover; ice-blue crystals;
  falling snow. **Ice:** your grip on it is 15% of stone's (what you start keeps going); a body knocked across it slides
  far. **Icicles** along the fight rooms' walls: they shake as you come under them (a creak, a shadow), fall after
  0.7 s, 20 to whatever's within 1.1 m. Nine rooms of its own. Its boss (the Frost Roc) is next; floor 4's Velociraptor
  stands in meanwhile. **(placeholder numbers, F1 → Frozen Depths)**
- **Its warband** (Update 0.3.22, the designer: "find enemies that would go together … Go with it"; plan
  `MD/FLOOR7_WARBAND_PLAN.md`, spec `MD_UPDATES/U0322_FROZEN_WARBAND.md`): a Viking warband frozen under the sea's ice
  that won't stay dead (the More-enemies pack's people; eyes lit ice-blue, the dead frost-blue). The **Raider** slides
  at where you stood, axe first (past it on ice: he can't stop; dazed into a wall); the **Axe Thrower** throws two axes
  in a V (one at you, one where you're going: change your way) and rolls away; the **Draugr** and **Barrow Maids** rise
  out of the snow (or the ice) as you pass, their grasp chilling you (10% slower, up to three); the **Völva** lobs rime
  that freezes the floor where it lands and chants a fallen Draugr back up (hit her to stop it; two a room at most).
  Mini bosses: the **Berserker** (roar, a spin that skids wide on ice, dizzy after; two spins below half health) and
  **Haugbui** (a stomp that throws you and ices the floor round him; blocks of ice torn from the floor and hurled).
  **Rime** is ice while it lasts (8 s). Never tankier. **(placeholder numbers, F1 → Frozen warband)**
  **Update 0.3.27 (the designer: "Do not make the enemies in Frozen Depths slide on ice at all, also make them 50% faster
  in speed, 70% speed increase on the blue enemies"; spec `MD_UPDATES/U0327_ROOMS_CHESTS_FROZEN.md`):** none of them
  slides on ice now (the Raider stops past you as on stone, the Berserker doesn't skid, a knocked body doesn't slide);
  every speed ×1.5, the Draugr's, the Barrow Maid's and Haugbui's ×1.7.
- **The Frost Roc by the Boss Design Bible** (Update 0.3.56, the designer: "Keep them, adapt", "Next boss, floor 4 * Arena / moves / intro"; spec `MD_UPDATES/U0356_FROST_ROC_BIBLE.md`): "Ground or air?", its moves punish whichever you overuse. Stomp Quake, Wing Clap, Ice Hurl, its belly slide and breath; phase 2 at half health, a pillar torn out: Pillar Swing (low: jump; high: stay down) and Fault Line (slabs of real ground). Its ultimate, Mountain Fall: break both knees in 6 s, or boulders rain over the whole plateau. Its room's the Frozen Plateau (`world/dungeon/plateau.ts`). It replaces the moves below.
- **Its show** (Update 0.3.57; `sim/dungeon/rocShow.ts`, spec `MD_UPDATES/U0357_FROST_ROC_SHOW.md`): a gale; the walls forced back on the peaks and a glacier in the plateau's middle, the Roc frozen in it; three thumps crack the ice, and its eyes open in it; it bursts out and hangs, slowed, its name on the right; it comes down in one stomp, with the ring you'll have to jump; it screams; then the fight.
- **Its boss, the Frost Roc** (Update 0.3.26, the designer: "Birb, the Frost Roc"; spec `MD_UPDATES/U0326_FROST_ROC.md`):
  Ultimate Monsters' Birb, huge. Its swipe close; its gust that blows you back across the ice; its belly slide (past you,
  far on ice; into a wall it's stunned); its leap that lands where you stood (a ring warns), hurting you there and
  freezing the floor; its sweeping frost breath (it chills you, lays rime). Below half health it rages: quicker, and it
  calls the dead up. 1190 health. **(placeholder numbers, F1 → Frost Roc)** Update 0.3.27: its walk ×1.5; its slide
  stops past you on ice as on stone.

### Parrying melee blows (Update 0.3.10, the designer: "Allow parries melee attacks, not mini bosses"; spec `MD_UPDATES/U0310_MELEE_PARRY_PILLARS.md`)
- An ordinary enemy's melee blow landing while the parry window is open: no harm; your fist punches back (the parry's
  damage, 60; a kill flings the body), it's staggered; the freeze, ring and clang; the 4 s wait. Mini bosses' and
  bosses' blows, blasts and bursts are never parried.
- (Pillars, Update 0.3.10: a broken one's stump stops you only as high as the break; its fallen top has collision where
  it lies. The stone columns' collision is as wide as their stone.)

### Launches and wall-splats (Update 0.3.7, the designer: "Punched enemies launching into the air and splatting against walls"; spec `MD_UPDATES/U037_LAUNCH_AND_SPLAT.md`)
- A killing punch (or a parried shot that kills) flings the body up and about 6 m away (bodies fly and slide with the
  blow that killed them). Not a boss's, not a large enemy's, not one on a ledge; a flier's body is flung, not thrown up.
  **A live enemy is never thrown up** (the designer: "no 3rd punch of a combo launches … it is like a stun I do not
  want").
- A body, or an enemy knocked hard, meeting a wall at 4.5 m/s or faster splats and stops: 30 damage if alive (and a
  stagger; no dodging it), its
  blood bursting and staining the wall, a pool, a crunch, a shake; "WALL SPLAT" on the style rank. **(placeholder
  numbers, F1 → Launch & splat)**

### The wall finisher (Update 0.3.8, the designer: "Finishers that interact with environment"; spec `MD_UPDATES/U038_WALL_FINISHER.md`)
- A Grunt, Skeleton, White Rabbit or Leaper flung dead into a wall (or killed by the splat) is pinned there, lifted,
  facing out, flickering white, for **3 s**; then it drops and dies as any body does.
- Meanwhile **E executes it for free** (the meter not spent): you're brought up to it, facing it; a left hook to its
  head, a right; its head grabbed between your palms, slammed down across the floor and pressed there; the ground
  slam's clasped fists smashed down on it; it bursts. **+5 HP**; its kill was counted when it died. **(F1 → Execution)**
- The Yeti's execution is the Blue Demon's barrage (the designer); those that had the Yeti's keep the old one.
- **The pillar finisher (Update 0.3.9; spec `MD_UPDATES/U039_PILLAR_FINISHER.md`):** pinned to a pillar (every column,
  every floor) instead: a right jab, a left, a heavy punch; it's driven straight through the pillar to the wall beyond
  and bursts there. The column is cut in two a quarter of the way up (below your eye), its top flying the way the body
  went and lying where it lands (across, if a wall is close); its collision stays. Free, +5 HP, as the wall finisher.

### The style rank (Update 0.3.4, the designer: "a nice visual for now"; spec `MD_UPDATES/U034_STYLE_RANK.md`)
- D DIRTY, C CRUEL, B BRUTAL, A ATROCIOUS, S SAVAGE, SS SLAUGHTERHOUSE, SSS UNKILLABLE, from what you do (blows, kills,
  parries, executions; the same move again adds less; air kills ×1.5, multikills); it drains, faster the higher; a hurt
  knocks a third off. A visual only. (The 0.3.1 speed lines: taken out, "too much space on the screen".)
- Update 0.3.12 (the designer: "combo bar isn't frozen during executions"): it doesn't drain through an execution, nor
  while the world holds still; the **pause menu pauses the game** (no time passes; spec `MD_UPDATES/U0312_PAUSE_AND_RANK.md`).

### Fate Cards (Update 0.2.16, the designer; spec `MD_UPDATES/U0216_FATE_CARDS.md`; Update 0.2.15's Scars became 14 of them)
- **Update 0.3.27 (the designer: "no more Card drops in chests that are not a challenge room chest", then "Boss chest
  gives cards too"):** only a challenge room's chest (its aura red) and the boss's deal Fate Cards. No lucky deals from
  keyed chests. What follows on when they're dealt is history.
- **When:** a boss's chest (not the run's last) and a challenge room's always **deal three Fate Cards**; a chest opened
  with a key deals them **one time in four instead of its loot** (the designer: "25% is fine"); a gold chest never. The
  boss's chest still gives its coins and heart (no key since 0.2.15). **Update 0.2.25 (the designer: "the card is like a
  bonus that can proc"; spec `U0225_ROOMS_AND_CHESTS.md`):** every chest gives its loot; the cards come **as well**, never
  instead (a keyed chest's one time in four, a challenge room's always: loot and cards guaranteed).
- **Rarity** (the designer: "grey, green, blue, purple, Red … same as drops"): **each card its own roll at the chests'
  odds** (Update 0.2.17, the designer: "a chance for each card"): no key and no big fight changes them. Each card once a
  run, lost when you die. No card heals.
- **On or off** (Update 0.2.17, the designer): a stand in the lobby past ARE YOU EVEN HUMAN?'s altar (a small table, a big
  card floating over it; Update 0.3.21: after the altars, along the east wall); off, no chest deals. Saved.
- **The deal:** the world holds still and blurs; a deck deals them one by one, face up, low on the screen; hover lifts one
  to read; a click takes it: it shrinks and flies to the card pile by your coins. You must take one.
- **TAB:** what you carry (cards, weapons, rings, keys, bonuses, health, armour, dashes, coins); the world holds still.
- **40 Fate Cards (46 since Update 0.2.22, below; 44 since Update 0.3.20: Slingshot and Bowling gone with the slide):** wave 1's 30 and (Update 0.2.18, the designer: "just build wave 2") wave 2's 10, with effects of their
  own: bleed, burn, lightning, blasts, homing knives, rings of fire and ice, a split throw (specs `U0216_FATE_CARDS.md`,
  `U0218_FATE_CARDS_WAVE2.md`; ideas from Risk of Rain 2's items, our names and effects). **(placeholder numbers)**
- **Death Cards and Traitor Cards (Update 0.2.19, the designer: "it also end up in the same 3 cards pull, it is all
  rng"; spec `U0219_DEATH_TRAITOR_CARDS.md`):** each card dealt rolls its family first: **a Death Card 15%, a Traitor
  Card 12%**, else a Fate Card. **16 Death Cards** only hurt the run (more damage taken, slower, fewer uses, dearer shop,
  fewer coins, a slower meter, worse luck…); **you take whichever card you like** (the designer: "just random and allow
  them to pick whatever they want"). **10 Traitor Cards** (9 since Update 0.3.20: Runaway, whose price was the slide, gone) give something and cost something (both on the card, the price in
  red). Their own faces: Death black, bone and sickly green with a skull; Traitor split gold and purple. Max health never
  under 10. **(placeholder numbers)**
- **The shop's Fate Card (Update 0.2.20, the designer: "the shop has only one fate card. floating near, cost 100"; spec
  `U0220_SHOP_CARD_CHEST_GOLD.md`):** one Fate Card floats past the end of the shop's row of tiles, turning, lit in its
  rarity's colour, its price over it: **100** (Haggler and Taxman count; Fasting: not sold). Its rarity rolled like a
  deal's; never one you carry; the floor's own. E buys it. None with Fate Cards off or on ARE YOU EVEN HUMAN?.
- **Builds (Update 0.2.22, testers: "build variety around Fate cards"; spec `U0222_BUILDS.md`):** each Fate Card is of a
  build by its move: **Fists, Kills, Throws, Movement, Slam, Executions** (body, coins, bonuses and luck: none). A deal
  leans to your builds (each card of a build makes its cards likelier). **Three of a build light its bonus:** fists 25%
  harder; the cards' hits 50% harder; throws 50% harder; a dash charge more; slam from 1.6 m; the meter 2 kills fewer.
  **Tremor** (the slam's blast) opens the Slam build: Crater, Pogo, **Aftershock** (a second blast) and **Scorched Earth**
  come only with it. **II:** 13 cards can be dealt again, stronger (never a third time; never the shop's). **Pair cards**
  (epic, dealt with a card of both builds): Scorched Earth (Slam + Kills), **Static Step** (Movement + Fists: a dash's
  lightning), **Shrapnel** (Throws + Kills: a killing throw bursts), **Last Rites** (Executions + Fists: an execution
  makes those near bleed). **46 Fate Cards.** The deal has a **Reroll** (25 coins, then 50, 75… in that deal).
  **(placeholder numbers, F1 → Builds)**

---

### Gravity Sean's deck (Update 0.5.0, the designer: "he won't be able to get any weapons like Joseph"; spec `MD_UPDATES/U0500_SEAN_CARDS.md`)
- **40 cards of his own: 20 Fate, 10 Traitor, 10 Death** (`sim/cards/seanDeck.ts`; numbers in F1 → Gravity Sean Cards, placeholders). Each changes a move of his. He's dealt only these and no one else is dealt them, in the same deals, at the same odds.
- **Only out of a challenge room's chest:** his boss chests don't deal, and his shop has no Fate Card.
- **Not in the manor's gallery:** its walls hold 70 cards.

## 7. Money and style
- Kills give money (Update 0.0.12): coins burst out of what you kill and fly to you. **Update 0.0.17 (the designer): half what they were:** a grunt **1**, a spitter **2**, a brute **5**, a leaper **2**, a stinger **1.5**, a wraith **2.5** (a half is one more coin half the time), the Demon **30** (out of its burst). Elites will give more.
- **Kill bonuses (Update 0.0.17, the designer: like CoD Zombies' power-ups):** a kill may drop a snowflake (7 s: every melee hit freezes what it hits for 1 s; never a boss), gold ingots (10 s: +50% coins) or a blue potion (7 s: +30% speed): gold 10%, the snowflake and the potion 6% (Update 0.2.0, the designer: 4% less; was 10%), at most 2 a fight room **(placeholder)**. Walk over one to take it; left lying, it fades after 20 s. Your coins show just above the health bar. **(placeholder amounts)**
- **Style meter (D → C → B → A → S):** rises with variety, air kills, parries, throw kills and not getting hit; drops when you're hit or stop fighting.
- Style multiplies money from ×1.0 at D to ×2.0 at S. **(placeholder)**
- Money resets at the end of every run.

- **Constant pressure (Update 0.1.0, the designer):** a fight room never lets its field fall under 5 enemies while it has more to send: its first wave (at least 5), then one more each time one falls, until its plan is spent.
- **Execution Power meter (Update 0.1.0, the designer):** a bar just above the dash charges, filled by kills (10 to fill). Update 0.1.1: twice the size, with the dash charges.
- **Showing you can execute (Update 0.1.12, the designer: "a proper UI"):** a crimson skull floats over the head of the enemy you can execute, drawn on top of everything at one size on screen; it snaps in, beats like a heart and fades. The full meter flares once, then burns with rising embers. A low sting when one comes into reach (after a while with none). No text.
- **Executions (Update 0.1.1, the designer: like Doom Eternal's):** with the meter full, **E** near an enemy you can execute (it pulses crimson; within 2.6 m of its edge, 60° of where you look) grabs it and empties the meter. **Update 0.2.0 (the designer): as it dies, it heals you 15; a mini boss 25.**
  - Until you let go (or it dies in your hands) you can't be hurt and the world holds still; your view is turned with the moves.
  - It dies as one kill (which doesn't refill the meter); enemies within 2.5 m of where it dies take 40 and are knocked back.
  - **Update 0.1.2 — every enemy has one** (the designer: "it needs to look like the hands of the player are performing the move"), the bosses none:
    - **Snake:** both hands round its tail (left on the tip, right beside it, arms never crossed); slam ahead, swing round your right, slam there, throw 9 m.
    - **Orc:** (Update 0.1.3) your right palm grabs its head; it's tossed up, the view following; an uppercut into its belly as it comes down bursts it into pieces. **Update 0.3.40 (the designer: "make stuff more accurate", the animation library; "the right hand looks absolutly crazy bad when lifting the body"):** your claw takes its face (the palm on it, the fingers curled over its brow, the wrist straight) and it buckles, is drawn up arching, hangs kicking and clawing at your arm, flails as it's tossed and curls round the blow (its own clips, baked from the Universal Animation Library); the uppercut is the library's (the fist dropped by your hip, then straight up into its belly, knuckles up, the palm towards you, on up past it); it bursts where you hold it, in front of your fist. (The others that share its moves are as they were till their models get the clips. Spec `MD_UPDATES/U0340_ORC_EXECUTION.md`.)
    - **Wizard:** both palms on its sides; swung round your right and thrown at the nearest wall (16 m), where it bursts into pieces.
    - **Ninja:** (Update 0.1.3) pulled in; the arm on your right torn off by your right fist, the other chopped off by your left hand; punched in the face left, right, and a last right that sends it flying.
    - **Slime:** the ground slam's (Update 0.1.8, the designer: "use the same ground slam with the F key"): both fists come up clasped as you look up and come down onto its head, landing as the slam does (its ring, dust, shake, jolt and boom); it's left flat.
    - **Frog:** its tongue shoots to your right hand; yanked up and whirled twice overhead; thrown high into the air.
    - **Armabee:** (Update 0.1.3) held by its neck in your right fist; smashed on the floor twice; it's left there.
    - **Ghost:** both palms on its sides, crushed to a third of its width; (Update 0.1.3) held in the left palm and punched away by the right.
    - **Wasp:** fists at its two ends (Update 0.1.3: its neck, the tip of its abdomen); torn in half; both halves thrown on the floor.
    - **Yeti:** the right fist drawn back, trembling; one punch to the belly; it bursts into pieces.
    - **Spider:** three legs chopped off one by one (open hands; Update 0.1.3: wound up high, carried through, harder); the ground slam's fists smash it flat, as the slime's (Update 0.1.8).
    - **Blue Demon:** 30 punches, left and right in turn; one last to its face (Update 0.1.3); it bursts into pieces.
    - **Big Ninja** (floor 3's mini boss; Update 0.2.2, the designer: "the same leaper execution basically"): the leaper's (the Ninja above, the same model): an arm torn off, the other chopped off, three punches to its face and away. It stands further off (1.7 m) and the view is higher, as it's 2.6 m tall.
    - **Mushnub** (Update 0.2.2, the designer: "same as the slime"): the slime's ground slam; it's left flat.
    - **Skeleton** (Update 0.2.2, the designer: "a telekinesis execution"): it's pulled in front of you (2.1 m) and lifted off the floor, shaking, as your right hand reaches out, open, its palm to it; your fist closes and it bursts into its bones (each limb in two, its head, its ribs, its hips) where it hangs. One shot: an executed Skeleton never rebuilds. One lying in pieces can't be executed.
  - Pieces are cut from the enemy's own model where its bones divide; they fly, bounce and lie for 6 s.
  - Specs: `MD_UPDATES/U011_EXECUTION.md`, `MD_UPDATES/U012_EXECUTIONS.md`, `MD_UPDATES/U013_EXECUTIONS.md`, `MD_UPDATES/U022_FLOOR3_EXECUTIONS.md`. **(placeholders)**
- **Enemies left (Update 0.0.21, the designer):** in a fight, a skull and the number of enemies left (alive and still to come), top middle.

## 8. Shop and chests (Update 0.0.13, the designer)
- **The shop** is a room with **five floor tiles**, each showing something to buy, turning above it with its price. One on every floor, a side room off the second to fourth fight room. **(placeholder: where)**
- **Prices (Update 0.1.10, the designer's sort), floor 1, every floor down +15%:** **45** a heart, the silver plate, the Hammer, a key; **65** every ring, the Dual Daggers, a white key; **80** the gold sword, the gold armour, a gold key; **100** the Gold Hammer, the Gold Axe; **110** the Grimoire, the Gold Daggers. The shop's three drawn tiles come from all of these but the heart and plate (always there); a key tile is a normal, white or gold key by its odds.
- **Prices before (Update 0.0.18, the designer):** an item's normal version **50**, a better version of it **70**, a version above that **100** (heart, silver plate, rings and the key 50; gold armour, gold sword and the white key 70; the gold key 100). These are floor 1's: **every floor down is +15%** (58 / 81 / 115 on floor 2). (Was 70 for everything.) **Update 0.0.16 (the designer):** the **heart and the armour plate are always there**; the other three tiles are drawn from the gold sword, the two rings and a key (Update 0.1.4: and the Grimoire) (normal 70%, white 25%, gold 5%), and the five are shuffled. Keys float on their tiles, standing on end, and turn.
- Stand by a tile and press E to buy. Not enough coins, or an item that would do nothing (a heart at full health, a plate with a full shield): a buzz, nothing taken. **(placeholder)**
- **Chests** stand in some fight rooms: **every room with a Yeti** (Update 0.0.16, the designer: the Yeti carries its key), and one more, sometimes two (35%). **(placeholder)** With a key, E in front of one (once its room isn't fighting) **kneels you down and you open it with both hands**: the view lowers and turns to it, the fists lift the lid, and what's inside comes out as it opens (about 1.3 s). Without a key it rattles.
  - **Update 0.2.1 (the designer):** **every room's chest rises out of the floor once its room is won**, the view going to it as it comes up (as the challenge room's does: 3.2 s, the letterbox, you don't move). **Update 0.2.21 (a tester fell into lava during it):** the shot waits until you're on the ground (a chest that rose while you were in the air is shown as you land within 4 s, else not), and the world holds still while it runs (only the chest comes up). It isn't there while you fight. A chest in a room with **no mini boss** (nothing there drops a key) is a **gold chest**: **no key opens it**, E alone does (your keys stay yours), and it gives **gold only** (10, 20, 30 or 40 coins: a common chest's amounts; **Update 0.2.20: halved**, below). A room with a mini boss still needs a key (its mini boss drops it).
  - **Update 0.2.1 (the designer: "an aura around the chests that needs a key, like a gold aura, little bit"):** a chest a key opens (a mini boss's room's, the challenge room's) glows **soft gold** while it's shut: a faint halo round it and a pool of light on the floor under it, breathing slowly. It comes up with the chest and fades as the lid lifts. Gold chests and the boss's chest don't glow. **Update 0.3.27 (the designer: "challenge room chest have now a Red aura"; "Make Gold aura and red aura on chest better visually, more visible and impressive"):** a challenge room's is **red**; both far bigger: a column of light in slow-turning shafts, a halo with a pulsing core, a wide pool, rings running out across the floor, motes drifting up.
- **Picking the key (Update 0.0.16, the designer):** in front of a chest with keys, your left hand comes up palm open with the key you'll use on it, and your keys show in a row low in the middle; Switch key (the mouse wheel) goes to the next kind you carry; E uses it.
- **Seeing what it is (Update 0.1.20, the designer: "walking close to an item displays an overlay near the object stating what it is and what it does, with the appropriate rarity"):** near an item (a shop tile, a chest's item, a weapon or an item on the floor; the nearest within 4 m), a card hangs over it: its name in its rarity's colour, the rarity, one line on what it does. In reach, the card also says what E does: **[E] to buy**, **[E] to pick up**. At a chest: **[E] to open** (no key: **Needs a key**). Over an enemy you can execute: **[E] TO EXECUTE** (the designer: in capitals). The key shown is the one Interact is bound to. **(placeholder: 4 m)**
- **Taking a chest's item (Update 0.1.11, the designer):** it rises out and hovers over the open chest until you press **E** near it (it's never taken by itself, and never fades). Coins still fly to you.
- **A won room's keys are yours (Update 0.2.5, the designer found a chest needing a key in a room with none):** the keys lying in it and any its mini boss owed, as a challenge room's always were. A new drop never takes a key's place.
- **What a chest holds (Update 0.1.10, the designer's sort), by rarity:** common 45% (coins: 10, 20, 30 or 40; a heart; or the silver plate), uncommon 30% (the gold armour or the Great Heart), rare 15% (the gold sword or a ring), epic 8% (the Gold Axe or the Gold Hammer; it gave 60 coins too), **mythic** 2% (the Gold Daggers, the Grimoire or the teal ring; it gave 100 coins too; mythic replaces legendary, and its light is **red**). **Update 0.2.1 (the designer: "too unbalanced for lucky players"): no coins with an epic or mythic chest's item.** A white key never gives common or uncommon; a gold key only epic or mythic. The rarity weights are placeholders. **Update 0.2.20 (the designer: "reduce the amount of gold in chest by x2"): every chest's coins halved** (Chest gold ×0.5, F1 → Items): a chest of coins holds 5, 10, 15 or 20; a gold chest the same; a boss's chest 7.5 (7 or 8; the Old Whale's 9).
- **What a chest held before (Update 0.0.16, the designer), by rarity:** common 45% (20, 35, 45 or 70 coins), uncommon 30% (a heart or a plate), rare 15% (the gold sword; Update 0.1.4: or the Grimoire), epic 8% (a ring), legendary 2% (nothing yet: an epic instead). A **white key** never gives common or uncommon; a **gold key** only epic or legendary. As the lid comes up, a light in its rarity's colour: none for common, green, blue, purple, yellow for legendary.
- A chest holds **50–80 coins**, a **silver plate**, a **heart** or **a ring** (either). Coins 40%, the rest alike. **(placeholder odds)**

---

- **Gravity Sean's runs (Update 0.5.0, the designer: "no need for keys in Gravity Sean runs"; "a 50% chance to spawn a chests in rooms with a higher chance to get only gold"):** no keys at all: every chest opens with E, none drops, his shop sells none. Each fight room has a **50%** chance of a chest, the challenge room always. A room's chest holds **only coins 70%** of the time (a placeholder), else a heart, armour or a ring, never a weapon. A challenge room's deals and always holds an item, a ring at least.

## 9. Enemies **(placeholder roster)**
Rule: every attack is telegraphed (a flash and a sound) before it can hit, and every projectile can be parried unless it is clearly marked.

**The crowd takes turns (Update 0.1.15, the designer: not "a big swarm").** At once, at most **2 close fighters**, **2 ranged** and **1 big one** may go for you; bosses always may. Turns go to the nearest ready enemy, one in front of you before one behind, never two at the same moment (0.35 s apart). After its attack (or a flinch) an enemy rests 1 s before another turn. Close fighters waiting their turn circle you 1.5 m beyond their reach; ranged ones keep their distance and hold their fire. **Spreading out** (the designer: "they still move in swarm"): each enemy has its own angle round you, at least 30° from its neighbours', and slides onto it as it comes at you on open ground, so a group fans out instead of arriving as one; a group from in front stays in front. **(placeholder numbers; F1 → Enemy crowd)**

| Enemy | Role |
|---|---|
| Grunt | Melee chaser in groups. Fodder. **(M2: the Orc from Ultimate Monsters; 40 HP, 7 m/s, a 0.45 s warned wind-up, 15 damage; any hit flinches it; drops a sword 15%.)** |
| Spitter | Keeps distance and fires slow orbs that can be parried. **(Update 0.0.12: the Wizard from Ultimate Monsters; 30 HP; holds 7–16 m from you, coming closer when it can't see you, backing off when you're close, circling between; a 0.6 s warning (it rears, glows green, gurgles), then a 13 m/s orb for 12; a hit cancels the shot; 1.8 s between shots.)** |
| Brute | Slow and heavy, telegraphed ground slam. **(Update 0.0.12: the Yeti from Ultimate Monsters, 2.8 m; 160 HP, 3.5 m/s; in 3 m it rears up for 0.9 s while a ring on the ground shows its 3.6 m reach, then slams: 30 damage and thrown away if you're on the ground inside (jump it); 1.2 s winded after; only a hit of 40 or more staggers it. Drops no weapon: the designer. Update 0.0.16 (the designer): the mini boss; a room with a Yeti has a chest, and the first Yeti killed there drops a key, normal, white or gold (70 / 25 / 5%), one per room.)** |
| Leaper | Jumps at you from range; punish it on landing. **(Update 0.0.13: the Ninja from Ultimate Monsters; 45 HP, 8 m/s; within 13 m with nothing tall between (it leaps over low cover) it crouches 0.55 s (glows violet, hisses), then leaps a 2.6 m arc to where you stood: 18 and thrown if you're on or beside the landing (jump it); then 0.9 s stuck; too close, it backs off; a hit knocks it out of the air; 2.2 s between leaps.)** |
| Stinger | **(Update 0.0.13, the designer: a flier.)** The Armabee: 25 HP, flies 3.4 m up. Within 10 m with a clear line it rears back 0.6 s (glows red, buzzes), then dives at 20 m/s through where your chest was and on: 14 and a knock if it goes through you. The dive ends on the floor, a wall or a crate: 1 s low and dazed (punch it). A hit cancels the dive. |
| Wraith | **(Update 0.0.13, the designer: a flier.)** The Ghost: 35 HP, floats 3.6 m up, keeps 8–18 m from you (closer over cover, away when you're close, circling between). 0.7 s warning (glows pale, wails), then a fan of three slow orbs (11 m/s, 10 each, 14° apart). A hit cancels the cast. |
| Slime | **(Update 0.0.18, the designer: floor 2, kamikaze.)** 20 HP. Slides at you; within 2.2 m it swells and glows green (0.6 s), then bursts: 22 and thrown within 3 m (not through a wall). It's gone, no coins; killed first, it just dies. |
| Frog | **(Update 0.0.18, the designer: floor 2, mid range.)** 35 HP; 0.75 m (Update 0.0.20, the designer: 1.5× smaller). Hops about 4.5–9 m from you; its throat glows (0.5 s, its aim locking for the end of it), then its tongue shoots 9 m in a line: 12 and pulled to it. Step off the line. |
| Snake | **(Update 0.0.18, the designer: floor 2, its bite poisons.)** 30 HP. Slithers at you at 10.5 m/s; close, it hisses and bites at once (0.1 s): 4 and poisoned. (Update 0.0.20, the designer: 1.5× faster, half the damage, biting right away; was 7 m/s, 0.35 s, 8.) |
| Wasp | **(Update 0.0.18, the designer: floor 2, poison stings; a flier.)** 20 HP, 3.2 m up, 6–14 m off. **Update 0.0.19 (the designer: it stings, it doesn't shoot):** it swoops down in front of your chest, buzzes (0.45 s), then stabs: 6 and poisoned within 1.6 m. Dash away during the warning; down there your fists reach it. |
| Spider | **(Update 0.0.18, the designer: floor 2's big one.)** 140 HP. From 5–13 m it rears (0.6 s) and leaps to where you stood: 22 and thrown (jump it); close up it bites (16). Only a hit of 40+ staggers it. A mini boss: its room has a chest and it carries the key. |
| Blue Demon | **(Update 0.0.18, the designer: floor 2's big one.)** 160 HP, 2.8 m. Warns (blue glow), then charges (20, thrown; a wall stuns it 1.6 s) or, from afar, throws a fireball (14). Only a hit of 40+ staggers it. A mini boss like the Spider. |
| Skeleton | **(Update 0.1.19, the designer: floor 3; "they revive as they rebuilt from pieces to body".)** 35 HP, 1.9 m. A warned swing (14). Brought down it falls to pieces, lies 2.5 s and rebuilds whole (1.6 s), once; hit its bones while they lie there and it stays down. **(placeholder numbers)** |
| Mushnub | **(Update 0.1.19, the designer: floor 3.)** 30 HP, 1.1 m. A warned bite (10). **(placeholder numbers)** |
| Ninja | **(Update 0.1.19, the designer: floor 3's mini boss; "can teleport away as an evasion trick when player trying to hit them, like 20% chance".)** 150 HP, 2.6 m, a warned sword slash (22). One hit in five it teleports away and the hit misses: it reappears 5–7 m on, along the blow; then not again for 1.5 s. Only a hit of 40+ staggers it. A mini boss like the Spider. **(placeholder numbers)** |
| Shieldbearer | Blocks attacks from the front; a charged blow (a weapon's; the charged punch is gone since 0.3.5) or a parried shot breaks the shield. |
| Elites | Glowing versions with more health and one extra trick. Always drop a weapon. |

Models come from Quaternius's Bestiary/Dungeon Monsters and Ultimate Monsters packs.

**Each floor its own (Update 0.0.18, the designer):** floor 1 sends the grunt, spitter, Yeti, leaper, stinger and wraith; floor 2 the same small ones plus the slime, frog, snake and wasp, and the Spider and Blue Demon as its big ones (no Yeti); floor 3 floor 2's for now **(placeholder)**.

**Floor 2, the Venom Garden (Update 0.2.23; the designer: floors "need to match their enemies"; spec `MD_UPDATES/U0223_VENOM_GARDEN.md`).** Floor 1's brick ruins overgrown in bright sun: mossy brick, earth beds with flowers and trees, bushes as low cover (each in its bed), cobwebs, **green sludge** in the pits (as lava, and it poisons you: 6 s). **Nine rooms of its own** (the toad pond, the hive hall, the web cellar, the snake grass, the overgrown cloister, the sludge channels, the rot bridges, the sludge gauntlet, the pillar hall), each round its enemies: **webs** on the floor (40% of your speed in one; a dash keeps its own), **tall grass** that parts round whatever walks through it (the snakes hunt in it), **wasps' hives** on the walls (while the room fights each lets out a wasp every 7 s, 3 a hive, never with 3 of theirs flying; 40 health: punch one down, it stops), sludge ponds with banks (the frogs), stout pillars (the Blue Demon). Its boss room is **the Scorched Grove** (charred trees in ash, scorch marks). Floor 1 keeps its rooms. **(placeholder numbers, F1 → Venom Garden)**

**Lava (Update 0.0.20, the designer):** some rooms from floor 2 on have lava pits (the lava lake, the lava bridges, the gauntlet; Update 0.2.23: floor 3's only, floor 2 has sludge; Update 0.2.24: retired, floor 3's bone bridges have lava), with walls in or beside the lava to wall-run across and a walkway round every pit. Falling in costs 50 health and puts you back at the floor's start (the fight you left starts over; Update 0.2.12: at your checkpoint, outside the room you were in); with 50 or less, you die.
**Pits (Update 0.3.67, the designer: "just take a few amount of damage and bounce back out, not teleporting away"; spec `MD_UPDATES/U0367_PIT_BOUNCE.md`):** this replaces what's above about being sent back. Every pit, lava, sludge, the sea or a pond, costs 10 health (with that or less you die) and throws you in a short arc, about 0.9 s, back to where you last stood on solid ground. No teleport, no fight reset, your view left alone. No control and no damage through the arc. Sludge still poisons. An enemy knocked in still dies.

**Floor 3's enemies (Update 0.1.18, the designer: no Grunt, Leaper or Blue Demon; Update 0.1.19: the Skeleton, the Mushnub, the Ninja):** the Spitter, the Stinger, the Wraith, the Slime, the Frog, the Snake, the Wasp, the Skeleton and the Mushnub, and the Spider and the Ninja as its mini bosses. Its boss is the **Bone King** (Update 0.2.3, the designer: a massive Skeleton; it was to be the Dino, the Dragon standing in).
**Floor 3's newcomers (Update 0.2.7, the designer; spec `MD_UPDATES/U027_FLOOR3_NEWCOMERS.md`):** the **Dragonling** in the Stinger's place ("a dangerous brat": it zig-zags round you, spits bursts of 3 fireballs where you're running to, and spits in your face and darts off if you come within 5 m), the **Skull Wraith** in the Wraith's (its moves, but your first 2 hits it teleports from, anywhere over open floor in the room), the **White Rabbit** in the Snake's (hops at you, bonks you with its carrot; throws the carrot from 10 m, or from 6 m if you're running away), the **Big Mushnub** in the Spider's as the mini boss (spiked-arm smash in front and a spin beside or behind, both throwing you back; killed, it splits into 2 Mushnubs). The **Bone King** calls up 3 more skeletons after its final blast. The four they replace stay on floors 1–2. Then (the designer, seeing the spawn shares): **no Spitter and no Wasp on floor 3**; the Dragonling has the Spitter's place, coming in on the keep rooms' perches.

**Floor 4, the desert (Update 0.2.4, the designer: "a dessert theme floor"; spec `MD_UPDATES/U024_DESERT.md`).** Floor 3's stone pieces recoloured sandstone, a sand floor, a warm sky and sun (the "Sun Temple" mock-up); palms and cacti (the Nature pack) standing in beds of sand, never on paving; quicksand (you move at 45% of your speed in it, your enemies don't). **Eleven rooms of its own** (the designer: at least 10, each with its identity): the oasis (a quicksand pool ringed by palms), the sunken market (aisles between stalls), the step pyramid (Tribals throwing from its top), the dune sea (quicksand rivers crossing in an X), the obelisk field (pillars, spikes), the canyon (walls with cliffs, Tribals on them), the sun pits (burning pits round pad islands), the tomb halls (walled chambers), the cactus garden (dense cactus beds), the quicksand crossing (stepping stones over quicksand), the terraces (raised corners with Tribals). Floors 5–7 have floor 5's (Update 0.2.10).
**Floor 4's enemies (the designer's third list, same update: "Actually, let's remove all the mobs that were present on previous floor like snake, and wraith etc." (the Wasp stays): a Flying Tribal (the masked feather creature), the Skull Orc mini boss (the skull-masked green goblin), a yellow Lizard and a little Green Blob, the Velociraptor boss; "think of move sets, challenging Floor 4 is the goal"):** none of the earlier floors' enemies but the Wasp. Small: the **Tribal**, the **Cactoro**, the **Dino**, the **Lizard**, the **Green Blob**; flying: the **Hywirl**, the Wasp, the **Flying Tribal**; mini bosses: the **big Cactoro** and the **Skull Orc**. They are hard by being smart, not tanky (the designer: "They evade", "smarter than ordinary enemies"):
- **Tribal:** a spear thrower that keeps its distance (backs off within 8 m, closes beyond 15, circles between); it throws **where you'll be** (your run carried on for the spear's flight); **aim at it for a quarter second and it springs aside** out of your sights; it rolls away from 35% of your blows. On a perch it throws from above, from up to **34 m**; with you out of its sight or reach for **1.5 s** it **jumps down** towards you and hunts you (Update 0.2.5, the designer: "they jump down or just try to take a better position where they can see them").
- **Cactoro:** **travels under the sand** (out of reach of every blow), makes for a spot **behind you**; the sand bulges for 0.5 s, then it bursts up in a ring of spines; it stays up **2.6 s** (hit it now; Update 0.2.5, the designer: "stay 0.8 sec longer") and digs in again; it **ducks back under** half the blows aimed at it while it's up.
- **Big Cactoro (mini boss):** throws a fan of spines; **ambushes**: digs in, hunts you under the sand, the ground cracks under you for 0.7 s and it bursts up there; close by, a ring of spines. **Hit it 3 times within 1.5 s and it shuts itself in its thorns** for 1.6 s: nothing hurts it.
- **Dino (the designer's second list: "the dino boss doesn't look like a boss to me, turn him into a Blob monster and give him frustrating moves"):** the blob Dino, 1.6 m. **Hit and run:** it circles you out of reach (6 m), crouches and hisses (0.4 s), **pounces** at you and bites (12), stands **open** for 0.7 s, then **springs back out of reach**. Any other time it **hops away from 85% of your blows**; open, or mid-pounce, it can't. Let it come, step aside, hit it while it's open.
- **Hywirl (flier):** circles to your back; **looked at, it darts out of your sights**; it **strikes only from your blind side** (more than 80° off where you look): it gathers its wind, then rushes through you (hurt and thrown). Turn to face it and it breaks off. It darts from 30% of your blows.
- **Lizard (the yellow one):** **camouflaged**: creeping, it is barely seen (12%); it keeps 7–14 m off you. Every 3 s it shows itself (0.5 s) and **spits a glob that lands as a poison puddle** (1.8 m across, 6 s): stand in one and you're poisoned. It makes the room's floor the danger: keep moving, and kill it when it shows.
- **Green Blob:** squashes down (0.5 s) and **hops onto you** (12). **Killed, it splits into two Bloblings**: small, quick (8 m/s), weak (15 health, 6 a bite); they don't split again.
- **Flying Tribal (flier, the masked feather creature):** a shaman. It keeps 12 m off you, **behind the ally nearest you**; every 3.5 s it chants (0.6 s: **hit it then and the chant breaks**) and **wards that ally: its next two blows are turned** (a golden shell round it). Kill it first, or every fight drags on. Alone, it throws three feathers at you (8 each).
- **Skull Orc (mini boss, the skull-masked green goblin):** 3 m, 260 health; only a hard hit staggers it. **It guards its front**: every blow from in front of it it turns on its club, and **two turned in a row and it strikes back at once** (a riposte, 0.25 s warning, hard). Get round it (a dash to its side or back), or hit it while it swings or leaps. Every 1.4 s: its **club combo** (0.6 s warning, three swings 0.45 s apart, each a step at you, 16) or a **leap** (0.5 s warning; its landing glows; a slam, 20 close by, and a quake ring to jump). It carries its room's key.
**The Velociraptor (floor 4's boss, the designer's model: `boss/Velociraptor.blend`; Update 0.2.8, its moves anew: the designer, "moves sets that were not in the game yet … Make a challenging boss", then "Build all of them" for Claude's proposal; spec `MD_UPDATES/U028_VELOCIRAPTOR.md`):** 5 m, 1260 health, never flinches. **The hunt:** a **charge** that's half the time a **feint** (a real one scrapes the sand twice in its warning; a feint stops dead and pounces where you went), a **wall launch** (it sprints to the nearest wall or column, claws up it and dives at you), a **sand kick** (its back to you, then sand: your view blurred 2 s, and it charges). **Below 50%, its frenzy** (quicker): a **sandstorm** (sight 8 m for 8 s; it circles out of sight, eyes glowing, and lunges after a hiss), a **pounce that pins you** (each bite glows first: dash in the glow to twist out, too soon wastes it; 3 dodges kick it off, 5 bites and it lets go), a **screech** (in the open within 30 m: no dash for 3 s; then it charges). **Below 25%, its blitz**: it zig-zags at you with **two afterimages** (only it casts a shadow) and slashes 3 times; hit it first and it reels. A wall or a column still stuns its charge. 15 coins in its chest.
**The Velociraptor by the Boss Design Bible** (Update 0.3.60; spec `MD_UPDATES/U0360_VELOCIRAPTOR_BIBLE.md`; it replaces the moves above): "Trust your ears". Sounds can pan left and right now. A **Sickle Pounce** (it crouches, hissing; its landing follows you for the first of its flight, so dodge late; missed, it skids, open 2 s), **Stalk & Ambush** (it runs off and it's gone; clicks, louder and quicker, from the way it's coming; hit it as it shows and it trips), a **Tail Lash** (side-on, its tail flicks, it spins: jump it; dizzy 1 s), its **charge** kept. Phase 2, at half health, its eyes burning: its **Pack Call** (it barks twice; 2 small Dinos, one each side; while they live it only ambushes), its **Feint** (a crouch with no hiss, then a real pounce from your other side), and a pounce landing on you pins you. Its ultimate, **Apex Hunt**, as phase 2 starts then every 60 s: the light dies, a heart beats, clicks; its eyes flash 0.5 s and it kicks a stone: hit it, or parry the stone back: blinded on its back 6 s; not, a lunge out of the dark, 45. Its room: `world/dungeon/ruins.ts`.
**Its show** (Update 0.3.61; `sim/dungeon/dinoShow.ts`, spec `MD_UPDATES/U0361_VELOCIRAPTOR_SHOW.md`): its walls go back, sand blowing, nothing there; a click off to one side, the view turns, it crosses a gap; a click from the other side, again; a hiss, and it's crouched on the far wall, eyes burning; it leaps and hangs, slowed, its name on the right; it lands in a ring of sand, roars; then the fight.

**Floor 5, the Drowned Temple (Update 0.2.10; the designer chose the theme from Claude's three; spec `MD_UPDATES/U0210_DROWNED_TEMPLE.md`).** Floor 3's stone, wet and mossy, open to a pale grey-green sky; weeping willows in beds of mud, mossy rocks, stumps and logs; lily pads; no pits (the designer took the deep pools out). **The tide:** every fight room floods and drains on one clock (8 s low, a horn and 2.5 s rising, 10 s high, 2.5 s falling); at high water the low floor is knee-deep and you wade at 70% of your speed; ledges, islands and perches stay dry. **Ten rooms of its own** (the flooded nave, the lily pond, the sunken stair, the drowned cloister, the reed maze, the twin banks, the perch towers, the broken colonnade, the islands, the altar of the tide). 7 fight rooms on the way, 12–30 enemies a room.

**Floor 6, the Sunken Grove (Update 0.2.11; the designer: "full under water gameplay … enemies swims faster than you and you have to deal with the pain of being slower than them … a floor that has been fully flooded … moss, rotten surface, trees"; the design is Claude's; spec `MD_UPDATES/U0211_SUNKEN_GROVE.md`).** Below the temple the water has won: the grove it was built over, drowned to the brim of its walls. You never leave the water: **you swim** (§5). Floor 3's stone rotted dark green-brown with algae; no sky: the water's surface overhead, bright and rippling, caustics dancing on every floor, light shafts, a bright blue-green haze, drifting specks, bubbles from the silt; drowned trees (dead willows, trees and birches) in beds of silt, seaweed swaying out of silt; mossy logs, stumps and rocks; mossy boulders for low cover; no torches; sounds muffled. **Ten rooms of its own** (the drowned grove, kelp rows, sunken nave, root hollow, the terraces, pillar forest, fallen colonnade, drowned towers, the drift, sunken altar): no pits, no pads; height is for cover and sight lines, not escape. 7 fight rooms on the way. **Its own challenge room, the drowned heart** (the designer: "Yes, design one"): bigger (64 m), cloister walks in the corners, four perch towers, a ring of eight drowned trees in silt in the middle; always floor 6's challenge room, never on the way. **Its enemies** (the designer's fish, Claude's moves as accepted; the designer: "no porting floor 5 monster … maybe a smaller version of Drowned king?"): all faster than you, hitting at any height. The **Clownfish** circle you and dart through you; the **Tuna** charges through you from afar (dazed in a wall); the **Angelfish** works round to your back and bites from there (keep facing it); the **Dolphin** rams up from under you (not while you're on the floor); the **Drowned Prince**, a small Drowned King on the perches: its jet at your height, its geysers under you. Mini bosses: the **Manta Ray** (its blanket drop where its shadow falls, its poison barb, its gust) and the **Shark** (circling tighter, lunging; a punch on the nose stuns it; its death roll holds and shakes you until you hit it hard enough; it frenzies below half). **The Old Whale** (its boss): laps round its room, its wake dragging you; its ram and its song (get behind something); below half its brood of 5 Clownfish once, its inhale (swim away from its mouth) and its breach (be off the floor when it crashes).
**Floor 5's enemies (all new models, most playing the tide):** the **Snapper** (at high water it swims under, its fin showing, and comes up biting under you: the water rings first; at low water it flops after you and lunges), the **Urchin** (curls up spiked and rolls at you; hit it spiked and its thorns hurt you; then its spikes go in), the **Jelly** (glows, then shocks: through the water it reaches you wading 10 m off; dry, only close by), the **Glub** (flier: keeps off, spits 2 water bolts), the **Big Glub** (the floor's percher: lobs bubbles that burst where you're going), the **Squidle** (flier: dives through you, ink over your view 2 s), the **Spawnling** (small, fast, weak, many); mini bosses the **Deep One** (a tentacle lash down a glowing line: caught, dragged in and slammed; dash through it) and the **Bog Brute** (at high water it dives and comes up under you; at low water it leaps at you; either sends a wave out).

**Floor 3, the Bone Keep (Update 0.2.24; the designer: "finish floor 2 and 3"; spec `MD_UPDATES/U0224_BONE_KEEP.md`).** Floor 3's stone bleached bone-white under a pale lavender sky: skulls on the walls and along their feet, stone tombs as low cover, candelabra, open graves (a headstone at each), beds of glowing mushrooms, burrows, violet crystals that glow. **Its enemies come out of lairs:** Skeletons climb out of open graves (rising as a fallen one rebuilds), Mushnubs out of mushroom beds, White Rabbits out of burrows; a Skull Wraith's blink takes it beside a crystal. **Ten rooms:** eight new (the ossuary, the graveyard court, the tomb hall, the fungal crypt, the warren, the crystal shrine, the warden's court, the bone bridges, its lava) and the ramparts and the towers. The Bone King's room is **the Throne Hall** (two rows of skull pillars). The keep, the bridgeworks and the lava rooms are retired. **Update 0.2.25 (the designer: enemies "can't navigate through this room or any room with a lot of these blocks or pillars"):** the tomb hall's tombs halved and set 4 m apart at least, the ossuary's alcoves gone (its graves round a pit of fire); no lane between blocks narrower than 4 m in floor 3's rooms.

**Floor 3's rooms (Update 0.0.21, the designer; Update 0.2.24: the Bone Keep's, above):** none of floors 1–2's rooms; the lava rooms and four of its own with an upper floor 2.5 m up (the keep, ramparts, towers, bridgeworks), reached by steps, jump pads and wall runs. Spitters stand on perches up there and shoot down: climb up and take them out.

**Floor 3's look (Update 0.0.20, the designer):** grey stone (the dungeon pack's part 2): stone walls and floor, deep stone arches, stacked stone columns, and gates that are a portcullis dropping from above when a room shuts and drawn back up when it's won.

**Poison (Update 0.0.18):** 3 damage a second for 4 s, straight off your health (not the shield); a new dose starts it over; the screen's edge pulses green. **(placeholder numbers)**

### Bosses
- **Any boss's show can be skipped** (Update 0.3.36, the designer: "Add a skip button while the Intro is played for any
  boss -> "SPACE" to skip"): press the jump key (SPACE) and the fight starts at once, everything as the show would
  have left it. The key shows in the bottom bar while a show plays.

One per floor, each with 2 phases. **Update 0.3.41 (the designer: "take Boss 1, remove it and take Boss 2 (dragon) to floor 1 boss"; spec `MD_UPDATES/U0341_BOSS_SWAP.md`): floor 1's is the Dragon, at its full strength ("Keep its strength"); the Demon is gone. Update 0.3.42: the Venom Garden's is The Swarm (below).** Before: floor 1's the Demon, floor 2's the Dragon (Update 0.0.18), floor 3's the Bone King (Update 0.2.3), floor 4's the Velociraptor (Update 0.2.4), floor 5's the Drowned King (Update 0.2.10); floors 6–7 have floor 5's for now.

**The Drowned King (floor 5's boss, Update 0.2.10; reworked in the same update: the designer, "frustrating and challenging … use the water … only one wave of smaller minions, once only … different in phase 1 & 2"; the moves are Claude's; spec `MD_UPDATES/U0210_DROWNED_TEMPLE.md`):** the big Fish, 6 m, 1400 health, crowned, never flinches. Its room floods knee-deep as it rises, and down it goes. **Phase 1, beneath:** under the water, out of reach, circling you (its fin shows), it strikes every 1.8 s: an **ambush** (the water rings under you 0.8 s, then it bursts up: 28), an **undertow** (a ring opens where you stand and the water drags you into it for 2 s: get out, or it bursts up there), a **jet** (it comes up and sweeps a jet of water across you at the water's height: jump it; 20). Only after each is it up to be hit (1.4–1.6 s). **Phase 2, risen** (below 50%, the next time it's up): it rises for good, raises the water (you wade at 60%), calls its **brood of 6 Spawnlings, once**, and wades at you: a **tidal wall** too high to jump rolls across the room with one gap (30), a **surf** straight at you (26; into a wall or column it's stunned 2.2 s, hits do more), **geysers** (5 in a row where you stand; 16 each), and close up **two bites** (24 each). 15 coins in its chest.
**The Drowned King by the Boss Design Bible** (Update 0.3.58, the designer: "Keep them, adapt"; spec `MD_UPDATES/U0358_DROWNED_KING_BIBLE.md`; it replaces the moves above): "Master the parry". Phase 1, under the water between moves: a **Jaw Launch** (the little heads on its body snap twice, then 3 fly at you, homing; parried, each does 90 to it; shot or punched, it pops), a **Fin Dive** (its fin circles, speeding up, then disappears: dash; it bursts up, 28, then it's in the air and open), a **Frenzy Combo** (its shoulders hunch; 3 claws, the third late; parried, it's open 3 s). Phase 2, at half health, up for good: the water rises and the low stones go under, it swims faster than you run, **Blood Frenzy** (a hit marks you 5 s, red mist at your screen's edges: its heads come faster), a **Riptide** (it leans back, the water dragging you, then a wave you jump at the crest; taken by it, it Fin Dives you at once), its **surf** kept. Its ultimate, **Maw of Many**, as it rises then every 60 s: its heads merge into a maw on its chest and it pulls you in; parry the bite at the flash and its jaw jams open, stunned 7 s; not parried, 50 and thrown into the water. Its brood of 6 Spawnlings comes after its first Maw, once. Its room: `world/dungeon/temple.ts`.
**Its show** (Update 0.3.59; `sim/dungeon/drownedShow.ts`, spec `MD_UPDATES/U0359_DROWNED_KING_SHOW.md`): a dry temple; its walls weep, then burst, water falling down all four as the room floods to your knees; low on the water its fin circles you, speeding up, and disappears; silence, and its crown comes slowly up in the middle; it bursts up and hangs, slowed, its name on the right; it lands in a wave; its heads snap at you, twice; then the fight, and the first thing it does is launch them.

**The Demon (Update 0.0.15, the designer: build it as pitched, bigger, with an aura; spec `MD_UPDATES/M3_BOSS.md`). Removed in Update 0.3.41 (the designer); kept here as it was. What it shared stays: the charge (the Dragon's swoop, the Velociraptor's, the Blue Demon's, the Drowned King's surf), the stunned bonus, the quake ring, the death show.** The Demon from Ultimate Monsters, 6.5 m tall, 1200 health, never flinches. Its aura: a glow behind it, embers, a ring of fire at its feet, a red light. Every pause it picks a move by how far you are, each warned (glow, sound, a mark on the floor):
- **Charge:** lowers its head (red), then runs straight across the room: 25 and thrown aside if it hits you; into a wall or a column it's stunned 2.2 s and takes 1.5× damage.
- **Leap:** crouches (orange), leaps to where you stood (a ring shows where): 30 close by; a **quake ring** rolls out over the floor (15 unless you jump it).
- **Volley:** raises its trident, then a fan of five fire orbs.
- **Phase 2 (half health):** it roars and calls grunts (again every 18 s while few are left); quicker warnings, shorter pauses, faster; a charge runs into a leap; two fans. **(placeholder numbers)**
- **Death:** the world slows; it hangs frozen in the air, sinks flickering white and bursts. (Update 0.2.0: what it leaves, a key, a heart and its coins, is in its chest. Update 0.2.1, the designer: **15 coins**.)

**The Swarm (floor 2's boss, Update 0.3.42, the designer: "try floor 2 Boss 'The Swarm'"; spec `MD/the-knot-3d-boss.md`, `MD_UPDATES/U0342_THE_SWARM.md`).** A heap of 220 thin simulated worms (the designer: "make the worm models 2 times smaller and increase the amount": 6.5 cm thick, 1.5 m long; beads moved by Verlet steps and held by constraints, the way its reel built them) coiled round one eye, about 3.7 m across; it drifts at you and keeps 5 m off.
- **Lash:** every 2.6 s the 5 worms on your side glow orange and draw back (0.6 s), then are flung at where you stood: 12 each.
- **Punching it:** the first worm between your blow and the eye takes it (5 health: a jab kills one); killed, it drops off and its share goes (the worms are 60% of its 1120); **through a gap the eye takes the whole blow**; a charged punch or a slam tears out every worm near (as many as it's worth); thinned, the heap comes in towards the eye.
- **Death:** its worms drop off in a wave, then the eye's show is every boss's; 15 coins. Never staggered. Still to come (the spec's order): parryable lashes, Spew, the phases (roll and charge, worm rain, swallow), its own intro, real sounds. **(placeholder numbers, F1 → The Swarm)**
- **Its nest (Update 0.3.52, the designer: "each boss their designed room"; `world/dungeon/nest.ts`, spec `MD_UPDATES/U0352_SWARM_NEST.md`):** a round cavern of flesh, a boss room's size: a veined, breathing floor, ribbed walls 12 m high, 12 pillars sheathed in flesh, open to the sky.
- **Its show (Update 0.3.52):** the walls that shut you in are forced back; behind them its worms have been lying all over the floor, and they wake and flood in; they pile into a heap round its eye; its eye opens, slowed, its name on the right; its laser goes once round the room; then the fight.
- **Its eye's moves (Update 0.3.51, the Boss Design Bible's Boss 2, "Pick your target"; spec `MD_UPDATES/U0351_SWARM_BIBLE.md`):** tells of 1.1 s. Gaze Beam: a thin laser following you slowly for 3 s (outrun it, or a pillar). Burrow Ambush: the floor bulges under you, following you till 0.3 s before; 3 big worms burst up one after another, each hanging 1 s (two jabs; 25 off its bar). Acid Tears: 3 globs arcing at you, leaving puddles; parry one back, through the worms to its eye, and it reels 1.5 s.
- **Below half:** its worms brighten; Tethered Shield: 4 big worms feed a shield, nothing hurts it till they're all dead, then its eye drops 4 s, worms slack, hits do more. Split Pupil: 3 low lasers turning for 4 s (jump them, or turn with the gaps). Its worms lash at you all through, if you're close.
- **Abyssal Stare, its ultimate (once as phase 2 starts, then about every 60 s):** it rises just over your head, the room goes dark, its heart beats. HIT THE EYE (Update 0.3.77, the designer: "we just hit the eye - that is it"; spec `MD_UPDATES/U0377_HISS_AND_STARE.md`): any 3 blows on it in 6 s, or one parried tear (it weeps through it). Cancelled, it drops and reels 4 s. Not: its glare at everything it can see, 65 and thrown; a pillar between you saves you.

**The Dragon (floor 1's boss since Update 0.3.41, floor 2's before; Update 0.3.49: its moves are the Boss Design Bible's, Boss 1 "Read the tell"; spec `MD_UPDATES/U0349_DRAGON_BIBLE.md`).** The Dragon from Ultimate Monsters, 7 m tall, flying low, 1120 health, never flinches; a gold aura. Tells of 1.2 s.
- **Its courtyard (Update 0.3.50, the designer: "each boss their designed room"; `world/dungeon/courtyard.ts`, spec `MD_UPDATES/U0350_DRAGON_COURTYARD.md`):** a ruined castle courtyard, a boss room's size. 10 m walls with battlements, a tower in each corner, the bible's 4 stone pillars with a low ruin behind each to shelter at, ash beds with charred trees, rubble, scorched paving.
- **Its show (Update 0.3.50):** it comes in over your head from behind and away over the far wall; laps the courtyard breathing fire, a ring of flame driving the walls back, knocking the crown off each tower it passes; climbs straight up over the middle; dives head first, slowed, its name on the right, its shadow growing; strikes the middle (a flash, a fireball, a wall of shock, a crater left for good); staggers, rears and screams fire at the sky; then the fight.
- **Flame Sweep:** head rears, throat glows, a deep inhale; fire low across the floor over 140° (20; jump it or dash through; a wall stops it). Its head stays low 1.6 s after.
- **Wing Gust:** wings lift; the wind pushes you back (strafe out of its 80°), 4 chunks of rubble fly at you (12 each; parry them back).
- **Tail Quake:** it turns its back, its tail shakes; the slam sends a ring over the floor (20; jump it). Its back stays to you 2 s.
- **Phase 2 (half health):** it screams and takes to the sky for good, circling 12 m up; its ultimate first; its old moves tell in 0.9 s.
- **Dive Bomb:** its shadow grows on you, following you, a screech; it locks on and dives in 0.3 s (30, thrown; dash aside). Stuck in the ground 3 s (hits do more), then it chains its Tail Quake.
- **Ember Rain:** it hovers, its chest pulsing 3 times; 7 fireballs fall (18), the first on you, each leaving a burning pool for 8 s.
- **Sweep chain:** or it comes down and chains its Flame Sweep into its Wing Gust.
- **Inferno Core, its ultimate (once as phase 2 starts, then about every 60 s; `sim/enemies/ultimate.ts` is what every boss's shares):** it lands in the room's middle, its chest open on a glowing core; the ground shakes, the music cuts. On screen, BREAK THE CORE and a bar. Blows on its front go to the core (150), not its health. Broken within 8 s: it's stunned 4.5 s (hits do more). Not: the whole room's blast, 70 and thrown; a pillar between you saves you and breaks.
- **Death:** every boss's show; a heart and its coins in its chest (**15 coins**). **(placeholder numbers past the bible's: F1 → Dragon)**

**The Bone King (Update 0.2.3, the designer: "the boss of floor 3 is also Skeleton, but massive"; spec `MD_UPDATES/U023_BONE_KING.md`).** The Skeleton, 6 m tall, never flinches; it rises out of the portal and **roars** in its stance. **Two lives, one lighter bar** (1000 a life; the Dragon has 1600): brought down the first time it **falls to pieces like its skeletons**, lies there 3 s (nothing hurts it) and **rebuilds** over 3 s, its bar filling again: **phase 2** (quicker between moves). Every pause it picks a move by how far you are, each warned:

**The Bone King by the Boss Design Bible (Update 0.3.53, the designer: "just go next boss, arena / moves and intro"; spec `MD_UPDATES/U0353_BONE_KING_BIBLE.md`).** "Go vertical": its body is a platform you climb. The bible's moves replace those above: Rib Boomerang, Grave Grasp, Arm Slam (then its arm is a real ramp to its skull, which takes double); rebuilt wrong in its second life (a crooked spine, two more arms), Shatter & Rebuild and Rib Cage Trap; its ultimate, Bone Colossus (twice its height, one arm lowered: climb it and break the vertebra behind its shoulders in 7 s, or its club crosses the whole floor and only a ledge is clear). Its room's the Bone Pit (`world/dungeon/pit.ts`): 12 m walls and a 2.5 m ledge along all four.

**Its show (Update 0.3.54; `sim/dungeon/kingShow.ts`, spec `MD_UPDATES/U0354_BONE_KING_SHOW.md`):** the walls are forced back on the whole pit; loose bones float up and stream to the middle, and a skeleton builds itself from the feet up, headless; it stoops for its skull on the floor and sets it on its own neck; green fire catches in its eyes, slowed, its name on the right; it roars and brings its arm down flat, the shock throwing the spare bones back across the pit; then the fight.
- **Thrown skeletons:** it reaches down and throws **3 skeletons** at you, one every 0.6 s (the designer: "a moderate pace"); each lands where you stood as it was thrown, its spot glowing on the floor while it flies, and smashes into bones (16, thrown back). Keep moving.
- **Jump-smash:** it crouches and **jumps, smashes, jumps again, smashes**, each jump for where you are then (its landing glows on the floor while it's in the air): 24 close by, and a quake ring each time (jump it).
- **The grab (close by):** it reaches for you; caught, you're **held up in front of its face** (the world holds still) and the screen calls for hits: **HIT!** with your attack key, a **combo count** slamming in with each hit, a pip per hit, the time draining. **10 hits in 3.2 s**: you break free (BROKE FREE) and it reels 2 s (hits do more). Too few: it **throws you at the nearest wall** (30, THROWN).
- **Phase 2, once:** it opens its second life calling **3 skeletons** up out of the floor round it (they fight as any Skeleton, revive and all).
- **Phase 2 at 25% or less, once: the final blast.** It stands and **charges for 3 s**, the floor trembling more and more, and **its reach shows on the floor** (a ring, a disc filling it): **half the room's floor** round it. Inside when it goes off: 60 and thrown. Get out past the ring. (Its bar's mark sits at 25% in its second life.)
- **Death:** it crumbles where it stands and its bones burst; its chest (15 coins, a key, a heart) rises by the wooden gate. **(placeholder numbers)**

**The boss room (Update 0.0.15, the designer):** stepping in, the view leaves your eyes and rises over the room; its walls slide back as it grows; a portal opens in the middle and the boss rises out of it, takes its stance beside its name; the view glides back and the fight starts. Once it's dead, a wooden gate in the far wall swings open onto the dark: the way down.

---

## 10. The run
- **A floor (Update 0.0.12, the designer: like Soul Knight's levels):** a map of rooms joined by corridors that you explore. From the start room a winding way of five fight rooms (Update 0.2.2, the designer: "every 2 floors, an additional room is added, floor 3 = 6, floor 5 = 7, floor 7 = 8": one more every 2 floors) leads to the way down (**Update 0.3.27, the designer: "there is only 4 main room, 1 challenge room, 1 shop, boss room"; "increases by 1 every 4 floors, starting by floor 4 - 8": 4 fight rooms on floors 1–3, 5 on 4–7, 6 on 8–10**); side rooms branch off it: the shop (Update 0.0.13) and sometimes a fight. One or two fight rooms hold a chest. A small minimap (top right) shows the rooms you've been in and the ones beside them (the shop in gold, the boss room in red). **The way ends in the boss room (Update 0.0.15).** (Later: reward rooms.)
- **A room:** you step in → its doors slam shut → 2–3 waves of enemies → room cleared → the doors open.
- **Signs (Update 0.1.20, the designer):** over every doorway into a room, on the corridor's side, a word says what's through it: **ROOM**, **CHALLENGE**, **SHOP** or **BOSS**.
- **The challenge room (Update 0.1.20, the designer: "a challenging run but rewarding if mastered"):** one on every floor, off the way, so you choose to go in. **6 more enemies** than a room as deep, always **2 mini bosses** (the floor's), always **a chest**; its mini boss drops **a white key or a gold key**, never a normal one (one key a room, as everywhere). Outlined in fire on the minimap. **(placeholder: one key)** **Update 0.2.1 (the designer: "put 10 enemies at the same time, and it adds a new one from the counter when it gets reduced to 9", "harder on purpose"):** it opens with **10 at once** (its first wave if that's bigger) and keeps **10 fighting** while it has more to send: when one dies, the next comes (any other room keeps 5). Its count is as before.
  - **Update 0.2.0 (the designer):** always exactly one, and it's the floor's only fight room that leads nowhere (there's no plain side fight room any more). Its chest isn't there until you've won: then the view goes to where it **rises out of the floor** and comes back to you. **You can't leave until you've taken your reward**: the gates stay shut until the chest is open and its item taken (they open anyway if you have no key at all, or you're no longer in the room). Any of its keys still lying on the floor are yours as you win.
- **The boss's chest (Update 0.2.0, the designer: "bosses no longer drop the rewards right away"):** as the wooden gate opens, a chest rises out of the floor 3 m in front of it (seen in the gate's shot). It opens without a key, like any chest (you kneel, lift the lid): the boss's coins burst out (Update 0.2.1, the designer: **15**, every boss), and its key and heart wait over it for E. **Update 0.2.15 (the designer: "the chest on a boss won does not give a key anymore, it gives scars"): no key: its heart; Update 0.2.16: and a deal of Fate Cards (below).**
- **CHEST IN CURRENT ROOM ! (Update 0.2.0, the designer):** just under the minimap, while the room you're in has a chest still to open.
- **The way down** (Update 0.0.15: the dark beyond the boss room's wooden gate, which opens once the boss is dead; it was a trapdoor in an exit room) fades to black and takes you to the next floor, its name showing as the black clears, with your health, coins and weapon. Dying starts a new run on a new floor plan. (Earlier plan: choose one of two doors showing their rewards; replaced by the explored floor.)
- **After a boss:** a part-heal (Update 0.0.15: the heart it leaves; Update 0.2.0: in its chest), then the next floor.
- **Win:** beat the floor 3 boss. The run ends and the next character unlocks.
- **Lose:** you die. You see a run summary (rooms cleared, kills, best style, time, seed) and return to the hub. (Update 0.1.14: the death screen shows what killed you, the floor, the time and your kills; Retry or Menu. No hub yet.)

## 11. Procedural generation
Arenas are **hand-made templates assembled from a seed**, not random geometry, because random shapes play badly at high speed.
1. **Room pool (Update 0.0.12):** nine hand-made fight rooms (colonnade, crossfire, altar, spike hall, ledges, maze, arena, twin, crypt), a start room and an exit room (Update 0.0.15: the boss room, 60 m square), drawn as text layouts on a 2 m grid and built from the Modular Dungeon Pack (parts 1 and 2: we're in dungeons). No room twice on a floor. **Update 0.0.13 (the designer): the fight rooms are twice the size** (24–36 cells, 48–72 m a side), with more long walls to wall-run and hide behind; the shop room.
2. **Variation per room:** mirroring and quarter turns, optional cover on or off, and where enemies appear, all chosen from the seed.
3. **The floor plan:** rooms on a 5 × 5 board; the way and its side rooms laid out from the seed; 4 m corridors join arched doorways in the middle of the walls.
4. **Enemies per room (Update 0.3.27, the designer: "we do not increases the amount of enemies in each room every 2 floors anymore, start with 8 and each rooms increases the count by 2"): 8, 10, 12, 14, 16, 18 along the way, on every floor.** Before: **(Update 0.1.1, the designer; was a point budget):** a fight room sends **8 + 3 per room deeper + 2 more every 2 floors down, from floor 2** (Update 0.1.16, the designer; it was 3 more every floor): floor 1: 8, 11, 14, 17, 20; floors 2–3 start at 10; 4–5 at 12; 6–7 at 14 (Update 0.2.2: floor 7 is the last; its 8th fight room has 35), drawn from a weighted table (the cheap kinds more often), at most 2 mini bosses, in 2 waves (3 from 18). On floor 1 the leaper and the stinger come from the second room, the wraith and the brute from the third. **(placeholders)**
5. **Rewards:** one shop per floor and one or two chests (Update 0.0.13); reward rooms drawn from a weighted table **(later)**.
6. **Same seed, same run.** The seed shows on the run summary, so daily or shared-seed runs are easy later.

## 12. Characters **(placeholder)**
- **What new players have (Update 0.5.1, the designer; spec `MD_UPDATES/U0501_UNLOCKS.md`):** Joseph, and WEAKLING EXPERIENCE and THE REAL EXPERIENCE. A run won is a clear, counted by difficulty (`sim/unlocks.ts`). One clear on any difficulty opens ARE YOU EVEN HUMAN?. One on THE REAL EXPERIENCE or harder opens Gravity Sean. The Demon opens with one clear on ARE YOU EVEN HUMAN?, or 5 on WEAKLING EXPERIENCE and THE REAL EXPERIENCE together. This overrides how the two were earned before (below). Old saves keep what they had; Lab wins count for nothing.
- **The roster (Update 0.0.8, the designer):** Joseph (the Adventurer): fists only, picks up used weapons. (Alpha Team, a locked silhouette with no kit, was scrapped in Update 0.3.91: the designer, "scrap every guns and the swat character".) **Gravity Sean (Update 0.3.80; spec `MD_UPDATES/U0380_GRAVITY_SEAN.md`)**, the space suit, replaced the Fallen King and William Rich: earned by winning a whole run on any difficulty, **His kit (Update 0.3.81 on; bible `enemy_bibles/Born to Retry — Gravity Sean.docx`; specs `MD_UPDATES/U0381_SEAN_STANCES.md` to `U0387`; the designer's rework, from 0.3.84, overrides the bible):** two stances on E, with an Instability meter that overloads at max. Normal mode is ranged and environmental: Gravity Punch; Grab on right click, which held past a moment joins his palms and raises a sphere of stone over the arena full in 5.5 s, held at most 10 s, to bring down where he aims; Ground Slam on Ctrl, a plunge in the air. Unstable is close-range and aggressive: Gravity Fists; Black Hole on right click, held in his palm and thrown, 18 s cooldown; kills give health back, by the stance of the attack (Unstable 4, a mini-boss 12; normal 2, a mini-boss 5); Shockwave Punch on Ctrl, on the ground or in the air, 5 s cooldown. One meter for his ultimates, on Q by his stance: Time Stop in normal mode, Meteor in Unstable. Calm gravity orbits his arms in normal mode, broken gravity crackles round them in Unstable.
- **The Playable Demon (Update 0.3.70; spec `MD_UPDATES/U0370_PLAYABLE_DEMON_1.md`; the bible `enemy_bibles/Born to Retry — Playable Demon.docx`):** beating the final boss on any difficulty unlocks it, for good: the fifth figure on the dais, a silhouette till then. Your eye stays where it is; the arms are Hellwarden's, and a massive blade (2.8 m) is always in the right hand, in a hammer grip. No other weapon is yours: the shop offers armour, rings and keys instead, a chest's weapon is coins. **Its left click, Blazing Arc (Update 0.3.71; spec `MD_UPDATES/U0371_BLAZING_ARC.md`):** three hits, slash, backslash, overhead, each wound up, fastest as it meets, carried on by its weight; the hit lands as the blade arrives, to everything in its arc; a burning trail, the blade flaring, the shoulders and the view turning with it. **Its main moves (Update 0.3.72; spec `MD_UPDATES/U0372_DEMON_MOVES.md`):** the overhead leaves a short wall of fire. Held, left click keeps swinging (Update 0.3.78). Shift: Hellfire Lunge, the dash a thrust through everything on its way, twice as far, the same 3 charges. Ctrl: Brand of Ruin, the sword planted, lines of fire pillars erupting outward, untouchable for its moment; in the air, Plunge, a dive that lands as a Brand, more and wider the higher the fall. **Its big moves (Update 0.3.73; spec `MD_UPDATES/U0373_DEMON_BIG_MOVES.md`; reworked by the designer in Update 0.3.74, spec `MD_UPDATES/U0374_DEMON_REWORK.md`):** hits and kills heat the sword, shown on the orange bar and on the blade; stop and it drains. High heat: bigger arcs, longer fire walls, a Lunge that leaves fire. Every kill gives back a little health. Right click throws the sword, spinning through all it meets, and you fight with your gauntlets; right click again regains it, cutting on the way; with it out, E teleports you to it, if you can see it. Q with heat full is Last Verdict: the world stops, colour drains, both hands on the hilt, the sword grows huge, and one horizontal slash crosses the whole arena: everything in it dies, a boss loses 40% of its full health. Its release sounds as a boss dying does. The Demon has no parry, no block and no executions; the few boss blows only a parry answers, it meets with a swing of its sword as they land. Its HUD is its own: its inputs bottom right, a demon boss's look. **Its weight (Update 0.3.75; spec `MD_UPDATES/U0375_DEMON_FEEL.md`):** a freeze on every sword hit, heavy low footsteps that dip the view (only the Demon has footsteps), ordinary enemies flinching or backing off as it comes near. **Its sword is a light (Update 0.3.76; spec `MD_UPDATES/U0376_SWORD_LIGHT.md`):** warm, on the blade wherever it is, brighter with heat and through a strike. **Mode Switch (Update 0.3.78; spec `MD_UPDATES/U0378_MODE_SWITCH.md`; its stance in Update 0.3.79, `U0379_HAND_SIGN.md`):** E, its sword in hand, puts the sword away and raises the right hand in a sign, two fingers up: left click, or held, slashes with it, slash after slash with no limit, one way and then the other, each throwing a flaming crescent through everything in its line. With the sword away it has a plain dash and slam, as with it thrown; right click and Q bring it out for their moves. Its balance is still to come (phase 5 of 5).
- **The lobby (Update 0.2.9, the designer; it replaced the character select's prison corridor):** Start opens the gate onto a closed, roofed dungeon hall you walk round in first person. Its areas: the characters on a dais (one playable, the rest dark silhouettes), the difficulties at their altars, the credits on the wall, feast tables, and the big main gate showing your difficulty and character; walking into it (or E) starts the run. Spec `MD_UPDATES/U029_LOBBY.md`.
- **The manor (Update 0.3.21, the designer: "come back to the old one but you visually upgrade it … like it looks like
  an explorable manor and we have database of enemies still like upstairs"; the plan `MD/LOBBY_MANOR_PLAN.md`, spec
  `MD_UPDATES/U0321_MANOR_LOBBY.md`):** the great hall (the gate north, the grand stairs climbing to landings in its
  north corners, the characters on their dais west, the altars and the Fate Cards' stand east, the great crystal over
  its dais in the middle, the ten floor paintings south: playable from 0.3.23); through its side arches the wings'
  **galleries** (the designer: "display all weapon align them all properly and put their name and effect as player get
  closer"): every weapon turning over its pedestal on the left, everything else (health, armour, rings, keys, the kill
  bonuses) on the right, each one's card as you come near; behind them the dining hall (west) and the library (east);
  upstairs from the landings, the **bestiary** west (all ten floors: a row of plinths a floor, its boss's at the far
  wall; statues from 0.3.22) with the **credits**, and the **cards gallery** east (every card on its walls in gilt
  frames, each shown as you come near). Windows lit from outside.
- **Difficulties (Update 0.2.9, the designer):** WEAKLING EXPERIENCE, THE REAL EXPERIENCE, ARE YOU EVEN HUMAN?, chosen in the lobby and saved. The gate asks before letting you through: THE REAL EXPERIENCE "Ready for pain?", "Are you sure?", "Don't cry when you die", "Did I mention you only have 1 life? oops"; ARE YOU EVEN HUMAN? "Let's just assume you are not human"; each with two answers. What each changes (Update 0.2.12, the designer; spec `MD_UPDATES/U0212_ALPHA.md`): **WEAKLING EXPERIENCE** is easy, no one-life punishment: dead, you're back at your checkpoint, full health, all you carry kept, the fight starting over. **THE REAL EXPERIENCE**: one life. **ARE YOU EVEN HUMAN?**: just fists and nothing else: no coins, swords, keys, bonuses, chests, shop or rewards (executions still heal); one life. The gate mocks WEAKLING three times ("Hmm? Not feeling like playing properly?", "Bro, just play it normally", "Alright “Weakling”, go on and enjoy your run…").
- **Boot screens (Update 0.2.12, the designer; as Last Ward's):** black, the studio's logo typing itself out ("DEVELOPED BY NIKO GAME COLLECTION"), then "[F11] Play in full screen for a better experience" (the logo as long as its animation, about 6 s; the tip 3 s); a click fades the one that's up within 0.5 s. Then the main menu ("Alpha v…" bottom right during the alpha).
- **Checkpoints (Update 0.2.12, the designer):** going into a fight room or the boss room saves one, just outside the door you came in by (under its "Room" or "Boss" sign), facing in. Lava sends you there (every difficulty); so does dying on WEAKLING.
- You start with one character. Winning a run unlocks the next one.
- Each character has a **fist style**, a **movement twist** and a **passive**. Examples:
  - The Boxer (starter): fast jab combo, standard movement.
  - The Brawler: slower but heavier punches, the slam leaves a shockwave.
  - The Dancer: an extra dash charge, parries refill a dash.
- Names, looks and kits are the designer's call.

## 13. Between runs **(placeholder)**
- **Main menu (Update 0.0.4):** a low shot up a staircase at a dungeon gate with a portcullis, torches and banners, glowing white behind the bars. Rearing horse statues guard the stairs, with crates, a campfire and pale dead trees (Update 0.0.5). The BORN TO RETRY logo sits in the sky (RETRY with a red drop, upright in the pixel face since Update 0.3.16, echoes trailing off it, a turning retry arrow; tagline "Die · Learn · Retry"). Start grinds the portcullis up and fades to black into the game (the designer cut the first-person walk-in). No hints on the menu (no key labels; the designer's rule for every interface).
- **Settings (Update 0.0.7, the designer):** the main menu has Start and Settings. Settings moves to a night camp in a forest clearing: sat on a log by a campfire, the options beside it, in two tabs (General, Controls: the controls live inside the settings). Back returns to the gate. The pause menu shows the same options. **Update 0.2.21 (the designer, to a tester: "adaptative UI scalling"):** the in-play HUD is the same share of the screen at any size, as at 1080p (counted in the screen's own pixels), and General has **UI size** (70–140%) on top; the menus keep their own fit to the window.
- A small hub: pick a character, start a run, see stats and settings. (Update 0.2.9: the lobby is that hub; stats to come.)
- Saved: unlocked characters, wins, best time, total kills, settings and key bindings.

---

## 14. Art and audio
- **Packs:** Modular Dungeon (the main menu's gate), Ultimate Nature (flat colour; the menu's dead trees), Modular Ruins, Bestiary/Dungeon Monsters, Ultimate Monsters, Fantasy Props MegaKit (melee weapons), Universal Base Characters (first-person arms).
- **Look:** dark palette, fog, strong rim light so enemies read clearly against the background. Baked lighting in Blender for the arenas.
- **The interface's look (Update 0.3.16, the designer; spec `MD_UPDATES/U0316_THE_LOOK.md`):** every word in one pixel
  face (Pixelify Sans) with a hard ink edge and, on big words, a hard coloured drop, never a soft glow; upright, never
  slanted; bars and panels in brass frames with an ink line outside, rivets in panels' corners; the keys to press on grey
  key caps, as bound; a number, then its mark. Drawn in code (CSS, canvas), no image files.
- **The controls on the HUD (Update 0.3.20, the designer: "Bottom Right, display the controls like in the game Blood
  rush … display jab control, parry and it's cooldown like a filling effect … weapons slots and all that can just be the
  level above"; spec `MD_UPDATES/U0320_HUD_CONTROLS.md`):** bottom right, three round badges with their keys on caps
  under them: the **jab** (your fist, or the weapon in hand), the **parry** (drained of colour while it waits, its icon
  and ring filling back round like a clock; a flash once it's ready; dimmed with a weapon in hand) and the **ground
  pound** (lit while you're high enough to pound). The weapon slots a row above them.
- **Audio:** hits matter more than music. Every punch, impact, parry, dash and kill needs a clear, punchy sound. Music rises with the action. The menus' track plays on the menus only, not in the lobby (Update 0.2.13, the designer).
- **Recorded sounds (Update 0.1.17, the designer):** human-made only, so the Steam page needs no AI notice: the Sonniss GDC 2026 bundle (royalty-free) and the designer's own recordings. Six batches picked by ear in the Lab (Sounds): combat, coins and chests, the bosses and magic, the enemies' warnings, the player's moves, the executions. No footsteps (the designer: "no need in this game"); the slide, the jump and the dash keep their made sounds. The rest is still made in code until its round. **Music (Update 0.1.17):** the designer's own; the menus' track loops on the menus and fades out into a run. **The fights' music (Update 0.3.19; spec `MD_UPDATES/U0319_COMBAT_MUSIC.md`):** the designer's three Combat OST tracks (Ogg, so they loop clean), only while a fight is on (a room's, a challenge room's, the boss's show and fight; the designer: "when a fight done, BGM fades away"): fading away (3 s) as it's won, the next fight going on where it left off; off when dead; each floor a random one, never the floor before's. Credited on the lobby's MUSIC board.

## 15. Tech
Browser game: Three.js + Rapier, React for menus and HUD, Blender scripts for asset conversion and arena building, Electron for Steam later. If milestone 1 shows the browser holding back the feel, we switch to Godot before building more.

## 16. Milestones
| | Milestone | What it proves |
|---|---|---|
| **M1** | **Feel lab:** one gray-box arena, movement, fists, two simple enemies, tuning panel | The core feels great, and the browser can deliver it. **Done (2026-10-27); browser kept.** |
| M2 | Combat sandbox: the enemy roster, weapons with durability and throwing, style meter, money | Fighting stays fun for minutes |
| M3 | Run structure: rooms, doors, procedural assembly, shop, first boss | One floor is a real roguelike run. **Started (Update 0.0.12): the dungeon floors, the room loop, the minimap. Update 0.0.13: rooms twice the size, the shop, chests. Update 0.0.15: the first boss (the Demon), its room and its show, the wooden gate onto the dark.** |
| M4 | Art pass: Quaternius models, arena kits, first-person arms, real sound effects | It looks and sounds like a game |
| M5 | Full run: 3 floors, 3 bosses, characters and unlocks, hub, saves | The complete game loop |
| M6 | Steam prep: Electron build, Steam achievements and cloud saves, store assets | Ready to sell |

## 17. Open questions for the designer
1. ~~The name~~ — decided: **Born To Retry** (2026-10-27).
2. The theme: are dark ruins and monsters right, or something else (sci-fi, hell, modern)?
3. Firearms: in the game from the start, or melee-only at first?
4. Boss ideas for floors 2 and 3 (floor 1: the Demon, Update 0.0.15).
5. The starter character and the unlock order.
