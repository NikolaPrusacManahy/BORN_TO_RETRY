# Floor 10 — Hell on Earth (plan, agreed)

Status: agreed 2026-11-04 (the designer: "Agreed, start"); its open questions still open. Step 1, Hell's look, built in
Update 0.3.43 (`MD_UPDATES/U0343_HELL_LOOK.md`).

The designer: "what do we design in floor 10? crazy versions of current enemies? a hell level?", then "Go with your
mix". This is Claude's plan, to be agreed before building. Built as the other late floors were: **the level, then its
enemies, then its boss (with its own show)**, each its own update with a spec in `MD_UPDATES/`. It replaces floor 10 in
`MD/FLOORS_7_10_PLAN.md` ("The Last Floor": its echo rooms and The Retrier live on here).

**The mix, in one line:** a hell built on the Forge's machinery; its own hell monsters in most rooms; your crazy
versions of every floor's enemies, "hell-touched", in its harder rooms; Hellwarden at the bottom.

## What there is to build it from
- **The level, already built (0.3.13, floor 10 since 0.3.25):** the Forge's nine rooms, its presses, fire vents,
  belts and lava (`MD_UPDATES/U0313_THE_FORGE.md`). It plays from the Lab today with stand-in enemies and the
  Velociraptor.
- **The Bestiary** (`ASSETS/QUATERNIUS/High-quality-enemies`: textured, on the Universal Animation Library's skeleton,
  so its 254 clips play on them through `tools/ual_bake.py`, as Tidebreaker's and Okami's do; no clips of their own):
  - **Hellwarden:** a skull-faced knight in plate, a greatsword: the boss (agreed in 0.3.28).
  - **Imp:** lanky, a spiked mace, chains and a spiked collar (no wings).
  - **Puglin:** squat, tusked, a club; about a metre tall.
  - **Skeleton A:** horned helm, an axe. **Skeleton B:** helm, a sword. (Not floor 3's skeletons: armoured, on the
    animation library's skeleton, so they can fight properly.)
- **Ultimate Monsters left over** (`unused_monster/`): the **Demon** (floor 1's boss until 0.3.41; its code is in git
  at 0.3.40), and round blob heads (Dog, Cat, **Chicken**, **Mushnub Evolved**), **Armabee Evolved**, Alpaking,
  Goleling, Bat, Pigeon. Of the blobs only the Chicken (a kamikaze) and Mushnub Evolved suit Hell; Dog and Cat are too
  cute for it.
- **More_nature:** DeadTree, DeadBirch (kept for "Hell's burnt woods" since floor 8's plan).
- **The Moon's meteors** (falling rock with a ring where it lands): brimstone, here.

## The look: hell, still bright (the designer: keep play spaces bright)
- **The Forge's stone turned to hell's:** basalt and obsidian (near black, glossy), cracked with glowing seams of lava;
  the paving a dark red-brown so the black iron and orange lava stand out.
- **The sky:** a red-orange furnace sky, lit from below by the lava, ash and embers drifting up. The sun a dull red
  disc. **Bright:** the light is hot and strong (lava glow, braziers), never a dark dungeon.
- **Dressing:** chains hanging from the walls and over pits, bone piles (floor 3's bones, scorched), braziers, burnt
  dead trees in the open rooms, spikes, the Forge's racks and anvils.
- **The floor's name card:** HELL ON EARTH (as now).

## Its mechanics
- **The Forge's, all kept:** presses (lure enemies under them), fire vents (in waves), belts, lava pits.
- **New: brimstone rain** in some rooms (the Moon's meteors, burning): rocks fall where rings show, now and then; on an
  enemy too. Turned off while an execution holds the world, as the rest is.
- **Lava kills nothing new:** it sends you back to the room's door as now (every difficulty).

## Its rooms
- **The Forge's nine**, re-dressed as hell's: the smelting hall, belt loop, lava crossing, bellows, foundry line,
  workshop, great press, furnace, press gallery.
- **Echo rooms (new, its challenge rooms):** each the room of an earlier floor (its layout and a hint of its look:
  the brick hall, the garden, the bone keep, the ice, the temple, the desert, the cove, the shrine, the moon), set in
  Hell's stone, with **that floor's enemies, hell-touched** (below). Which floors a run echoes is picked by the run's
  seed: a different set each run.
- Floors 8–10 have 6 fight rooms each; **proposal: 4 Hell rooms and 2 echo rooms**, the echo rooms the ones with the
  chest (Fate Cards).

## Its own enemies (proposal)
Health in floors 8–9's range (the designer: "do not make enemies tankier NEVER": 22–40 a regular, about 300 a mini
boss); harder by what they do. Every attack warned.

| Enemy | Model | Role | What it does |
| --- | --- | --- | --- |
| **Imp** | Bestiary Imp | fast melee and fire | Blinks a few metres in a puff of smoke (flank, behind you), swings its spiked mace; from range throws a fireball. Comes in threes. |
| **Puglin** | Bestiary Puglin | pack rusher | Small and quick, rushes in packs of 4, clubs you; one punch each. Leaps over belts. |
| **Bone Axeman** | Skeleton A | heavy | A slow overhead axe chop that splits the floor in a burning line (shown first); a wide spin when you're behind it. |
| **Bone Guard** | Skeleton B | shield-breaker test | Guards with its sword up: punches in front glance off (a charged punch or a parry breaks the guard; flank it). Counters a whiffed punch. |
| **Cinder Chicken** | Chicken (blob, charred, its comb on fire) | kamikaze | Sprints at you squawking and bursts into flame (a ring shows its reach). Punched, it flies; into a crowd, it bursts there. |
| **Brimstone Bee** | Armabee Evolved | flier | Hovers over the fight and drops fire bombs (their rings shown); the floor's percher. |

**Mini bosses (a room with one has a chest, as now):**
- **The Demon, back** (its charge, its leap and quake ring, its fire volley, as it was in 0.3.40), as a mini boss:
  smaller (about 4.5 m), mini boss health, no grunts called. Its looks and moves come back from git, not rebuilt.
- **Mushnub Evolved, the Spore Lord:** spreads burning spore clouds that drift (stand in one and you burn), slams;
  its spores catch fire from vents and lava (a cloud near one bursts).

Executions: the Imp, Puglin and skeletons are humanoid on the animation library's skeleton, so they get **proper
executions made the 0.3.40 way** (their own reaction clips; your hands keyed on them).

## Hell-touched: your crazy versions (the echo rooms)
Every earlier floor's enemies, **same health** (never tankier), each given **one hell trait by its role**. Few traits,
applied by role, so every enemy in the game can be hell-touched without making 80 new ones:

| Trait | Who | What it adds |
| --- | --- | --- |
| **Scorched trail** | walkers, chargers | Where it runs, the floor burns a moment behind it. |
| **Death burst** | the small and quick | Killed, it glows and bursts in flame after half a second (a ring shows): punish standing close; it hurts other enemies too (chain them). |
| **Ember shots** | anything that throws or shoots | Its shots leave a patch of fire where they land. |
| **Undying** | the bony and the dead (Skeleton, Draugr, Crewman…) | Rises again once, burning, unless executed. |
| **Quickened** | mini bosses | Shorter warnings and pauses (still warned). |

All hell-touched enemies **look** it: charred dark, cracks glowing, embers rising off them, eyes lit. Tuning per trait
(F1 → Hell).

## The boss: Hellwarden
- **Its model:** the Bestiary's Hellwarden, about 6 m, its greatsword; animated from the library (sword heavies,
  combos, dash, block, ground pound, uppercut…). Agreed in 0.3.28.
- **Its arena, the Throne of Cinders:** a boss room twice the size (as Tidebreaker's), ringed by pillars and chains,
  lava in channels across it.
- **Phase 1:** sword chains (2–4 swings, the last a heavy), a **dash slash** across the room, **guard and counter**
  (it raises its sword; punching it then gets you countered: wait or parry), a **ground slam** that splits the floor
  in burning lines.
- **Phase 2 (half health):** its sword catches fire. A **fire wave** that rolls out (jump it), the **plunge** (it leaps
  and drives its sword into the floor where you stood, cracking a lava fissure), and it **calls Imps** (once, then
  every so often while few are left). Its fight **wrecks the arena** (the designer, late bosses): pillars cut through,
  the floor cracking into lava, chains falling.
- **Its show** at Tidebreaker's standard (every boss gets one): proposal, the arena's floor splits, a river of lava
  rises in the middle and Hellwarden walks up out of it, drags its sword along the stone (sparks), it catches fire,
  the name card in slow motion, the room shaking.

## The Retrier (optional, after Hellwarden)
From the old plan: past Hellwarden's way down, a dark copy of you that fights with your moves (dash, slam, parry,
executing you). The game is *Born To Retry*: the last thing you beat is yourself. To decide once Hellwarden is in.

## The run
- The run ends at floor 7 now (`LAST_FLOOR`). **Proposal:** once floor 10 is whole, the run ends at floor 10
  (after Hellwarden, or The Retrier if made). Floors 8 and 9 are built (Okami's rage and frenzy still to do).
- Floors 8–10: 6 fight rooms, enemy counts capped (as floors 7–9).

## Order of work (each an update, with renders and tests)
1. **Hell's look** on the Forge's rooms: stone, sky, light, dressing, burnt trees, brimstone rain. **(Done: 0.3.43.)**
2. **The Bestiary enemies:** Imp, Puglin, Bone Axeman, Bone Guard (the clips retargeted and rendered first).
3. **The rest of its roster:** Cinder Chicken, Brimstone Bee; the Demon back and Mushnub Evolved as mini bosses.
4. **Hell-touched traits and the echo rooms.**
5. **Hellwarden:** its model and moves.
6. **Hellwarden's show** and its arena wrecked.
7. Then: the run's end to floor 10; The Retrier if wanted.

## Open questions for the designer
1. The Demon back as Hell's mini boss: yes or no?
2. Echo rooms: 2 a run (my proposal), or more?
3. The Retrier after Hellwarden: in, or Hellwarden the last boss?
4. Anything from your own packs you'd like in Hell (more monster models are welcome: the floor uses about 8 kinds)?
