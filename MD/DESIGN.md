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
| Mouse wheel | Switch key, in front of a chest (Update 0.0.16) |
| 1–5 | Weapon slots: 1 your fists, 2–5 the weapons you carry (Update 0.0.17, the designer) |
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
- **Ground slam (F, Update 0.0.12, the designer):** only from a real height (**2.8 m** or more above the ground, Update 0.1.7, the designer: higher, was 1.8: beyond a plain jump, so off a ledge, a pad, a wall jump or a slam's bounce), you slam straight down. As it drops both fists come up clasped side by side; as it lands they come down into the floor, with a hard shake and a jolt (Update 0.1.7; Update 0.1.8, the designer: wrists straight, the backs of the hands towards you). The landing is a blast: every enemy within **4 m** (wider and harder the further you fell, up to **7 m** and **90**) takes up to **35** damage (half at the edge) and is thrown outwards, with a shockwave, dust and a boom. Jumping right after landing bounces you higher. **(placeholder numbers)**

### Health
- 100 HP. **(placeholder)** No regeneration. Shown bottom left: the number and a bar.
- A short invincibility follows each hit (0.6 s **(placeholder)**), and the dash's invincibility stops damage too.
- **Death:** the world slows and fades to black. In the Feel Lab you're straight back at the start; in a run, death ends the run (M3).
- **The death screen (Update 0.1.14, the designer: play, lose, learn, retry):** dead in a run, once it's black: "Killed by" and what killed you, large in crimson (an enemy by its name in the game, or the turret, spikes, lava, the fall; poison names who poisoned you), then the floor, the time played (m:ss, not counting the pause) and your kills. Retry starts a new run; Menu goes to the main menu. The world holds still behind it. No hints. Drawn big (1.5× the first draft, the designer).
- **The loader (Update 0.1.14, the designer):** after Play on the character select and the fade to black, the logo's retry arrow turns bottom right on the black for at least a second while the level loads, then fades with the black. No words.
- **The Lab (Update 0.0.19, the designer; dev builds only):** the main menu's Lab goes straight into the Feel Lab. Its panel (F8) spawns any enemy or boss in front of you, any item, bonus, weapon or a chest, and takes you to a boss's real room (its show and fight, then back to the Lab). It also has Clear, Heal, the Lab's waves and invincibility. Spec `MD_UPDATES/M3_LAB.md`.
- **Healing (Update 0.0.13, the designer): only from the shop.** The heart heals half your health (a chest can hold one too). Hits you land heal nothing (blood heal is gone). After a boss (Update 0.0.15): it leaves a heart (Update 0.2.0: in its chest). **Executions heal (Update 0.2.0, the designer): 15, a mini boss 25.**
- **Poison (Update 0.0.18):** the snake's bite and the wasp's sting poison you: 3 a second for 4 s, past your shield. **(placeholder)**
- **The shield (Update 0.0.13, the designer):** the silver armour plate gives a shield of half your health, shown as a blue bar just above the health bar. A hit takes the shield first, then your health. At most a full bar (two plates). **(placeholder cap)**

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
- **Durability** counts uses (hits or shots). A weapon you pick up has **10 uses** (the designer, Update 0.1.10; was 4); shop weapons are sturdier. **(placeholder)** Misses cost nothing.
- **The Sword (M2):** held in the right hand; the left arm drops out of view. Left click slashes: a cut from the upper right through the middle to low left, straight back to ready. Holding right click points the tip at the crosshair; letting go pierces (longer and narrower than a slash, costs 2 uses). Q throws it after a short wind-up (drawn back, then thrust): it flies tip first, 70 damage and a hit-stop on the first thing it hits. Picking up uses E. **(placeholder numbers)**
- **Breaking is a payoff:** when durability hits 0, your next attack throws the weapon for a big hit. You can also throw it any time with Q.
- **The Gold Sword (Update 0.0.13, the designer):** the shop's sword: the sword's moves and damage, **30 uses** (Update 0.1.10; was 40). Buying it puts it in your hand (the weapon you held drops at your feet).
- **The Grimoire (Update 0.1.4, the designer; spec `MD_UPDATES/U014_GRIMOIRE.md`):** an open book (Ultimate RPG pack, `Book3_Open`). The right hand holds it open, palm up under its spine, low on the right; the left hand is palm up, low on the left, its fingers curled round a fireball (flames, embers, a flickering light). Left click casts a fireball every **0.5 s** while held: the left palm thrusts out, fingers up, and the ball leaves it, flying straight at **34 m/s** for up to **1.5 s**; it hits the first thing for **30** and bursts, **15** to everything within **1.6 m**; a wall bursts it too. **Right click held charges it like a Ki blast** (the designer): the palm held out in the cast stance, the ball growing before it; **each half second burns a use** (the designer: charging 50% faster), up to **10**; let go, it's cast, bigger, slower and harder the longer it was held: **2.5 s** ×8 damage, its burst **15 m** (half a room); **5 s** twice that, ×20 damage, **30 m** (the whole room). A tap is a plain fireball. **25 uses** (the designer; was 12); every cast burns its uses, hit or miss. At 0 the next attack throws it; Q throws it any time. In the shop (a better item, **70**) and in rare chests. Fire is orange. **(placeholder numbers)**
- **The Gold Axe (Update 0.1.5, the designer; spec `MD_UPDATES/U015_AXE_HAMMER.md`):** one-handed, held near the end of the haft, its own hacks (**30**, every **0.5 s**). **Right click charges a throw** (Update 0.1.6): at full charge **2× as fast and 2× as hard**. That throw doesn't break: it drops where it hits (**55** uncharged), sticks in walls, and **right click again calls it back** like Thor's hammer, through walls, hitting what it passes once (**35**), into your hand. **Q throws it to break**, as any weapon. **30 uses.**
- **The Hammer (Update 0.1.5, the designer):** two-handed (right hand near the end, left just above it), slow heavy heaves (**50**, every **0.9 s**). Its charged smash lands on the floor (**80**), **only on the ground** (Update 0.1.7: a full charge let go in the air is held till you land), and a **shockwave rolls out before you, a half circle** (Update 0.1.6), to **30 m**: every enemy under it takes **40** once (not fliers over it, nor anything behind a wall). A smash costs **3 uses**, hit or miss. **15 uses** (Update 0.1.10; was 20).
- **The Gold Hammer (Update 0.1.10, the designer):** the Hammer in gold, **35 uses**.
- Both are in the shop (**70**) and rare chests.
- **The Dual Daggers (Update 0.1.9, the designer: "one in each hand, very fast hits, last very long, +15% move speed while held", then "mainly used to throw massive amounts continually", like the Trickster's Main Event in Dead by Daylight; spec `MD_UPDATES/U019_DAGGERS.md`):** a dagger in each fist. Left click cuts **right, left, right…**, a cut every **0.15 s** (**20** each: twice a jab). **Right click held 1.5 s throws a volley** (the designer: the Trickster's stance, each dagger flipped to be held by the tip): **25 daggers**, one every **0.12 s**, the hands taking turns, each flying where you aim as it's thrown (**20** each; a use each). **+15% run speed** while they're in your hand. Q throws the pair, to break. **30 uses** ("30 daggers", Update 0.1.10; was 100).
- **The Gold Daggers (Update 0.1.10, the designer):** the Dual Daggers in gold, **90 uses**; their thrown daggers fly gold. In the shop (**70**) and rare chests. **(placeholder numbers)**
- Families: **melee** (swords, axes, maces from the Fantasy Props kit) and **firearms** (Ultimate Guns, rarer). **(placeholder mix)**

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
| Blue ring | +15% run speed (running and sliding; not the dash), for the rest of the run. (Update 0.0.17: was 20%.) |
| Key | Opens a chest. |
| White key (Update 0.0.16) | Opens a chest: rare or better. Pale silver, a blue aura. |
| Gold key (Update 0.0.16) | Opens a chest: epic or mythic. Gold, a yellow aura. |

What you carry (keys, rings, the shield) goes down to the next floor with you and is lost when you die.

---

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
    - **Orc:** (Update 0.1.3) your right palm grabs its head; it's tossed up, the view following; an uppercut into its belly as it comes down bursts it into pieces.
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
  - Pieces are cut from the enemy's own model where its bones divide; they fly, bounce and lie for 6 s.
  - Specs: `MD_UPDATES/U011_EXECUTION.md`, `MD_UPDATES/U012_EXECUTIONS.md`, `MD_UPDATES/U013_EXECUTIONS.md`. **(placeholders)**
- **Enemies left (Update 0.0.21, the designer):** in a fight, a skull and the number of enemies left (alive and still to come), top middle.

## 8. Shop and chests (Update 0.0.13, the designer)
- **The shop** is a room with **five floor tiles**, each showing something to buy, turning above it with its price. One on every floor, a side room off the second to fourth fight room. **(placeholder: where)**
- **Prices (Update 0.1.10, the designer's sort), floor 1, every floor down +15%:** **45** a heart, the silver plate, the Hammer, a key; **65** every ring, the Dual Daggers, a white key; **80** the gold sword, the gold armour, a gold key; **100** the Gold Hammer, the Gold Axe; **110** the Grimoire, the Gold Daggers. The shop's three drawn tiles come from all of these but the heart and plate (always there); a key tile is a normal, white or gold key by its odds.
- **Prices before (Update 0.0.18, the designer):** an item's normal version **50**, a better version of it **70**, a version above that **100** (heart, silver plate, rings and the key 50; gold armour, gold sword and the white key 70; the gold key 100). These are floor 1's: **every floor down is +15%** (58 / 81 / 115 on floor 2). (Was 70 for everything.) **Update 0.0.16 (the designer):** the **heart and the armour plate are always there**; the other three tiles are drawn from the gold sword, the two rings and a key (Update 0.1.4: and the Grimoire) (normal 70%, white 25%, gold 5%), and the five are shuffled. Keys float on their tiles, standing on end, and turn.
- Stand by a tile and press E to buy. Not enough coins, or an item that would do nothing (a heart at full health, a plate with a full shield): a buzz, nothing taken. **(placeholder)**
- **Chests** stand in some fight rooms: **every room with a Yeti** (Update 0.0.16, the designer: the Yeti carries its key), and one more, sometimes two (35%). **(placeholder)** With a key, E in front of one (once its room isn't fighting) **kneels you down and you open it with both hands**: the view lowers and turns to it, the fists lift the lid, and what's inside comes out as it opens (about 1.3 s). Without a key it rattles.
- **Picking the key (Update 0.0.16, the designer):** in front of a chest with keys, your left hand comes up palm open with the key you'll use on it, and your keys show in a row low in the middle; Switch key (the mouse wheel) goes to the next kind you carry; E uses it.
- **Seeing what it is (Update 0.1.20, the designer: "walking close to an item displays an overlay near the object stating what it is and what it does, with the appropriate rarity"):** near an item (a shop tile, a chest's item, a weapon or an item on the floor; the nearest within 4 m), a card hangs over it: its name in its rarity's colour, the rarity, one line on what it does. In reach, the card also says what E does: **[E] to buy**, **[E] to pick up**. At a chest: **[E] to open** (no key: **Needs a key**). Over an enemy you can execute: **[E] TO EXECUTE** (the designer: in capitals). The key shown is the one Interact is bound to. **(placeholder: 4 m)**
- **Taking a chest's item (Update 0.1.11, the designer):** it rises out and hovers over the open chest until you press **E** near it (it's never taken by itself, and never fades). Coins still fly to you.
- **What a chest holds (Update 0.1.10, the designer's sort), by rarity:** common 45% (coins: 10, 20, 30 or 40; a heart; or the silver plate), uncommon 30% (the gold armour or the Great Heart), rare 15% (the gold sword or a ring), epic 8% (the Gold Axe or the Gold Hammer, **and 60 coins**), **mythic** 2% (the Gold Daggers or the Grimoire, **and 100 coins**; mythic replaces legendary, and its light is **red**). A white key never gives common or uncommon; a gold key only epic or mythic. The rarity weights are placeholders.
- **What a chest held before (Update 0.0.16, the designer), by rarity:** common 45% (20, 35, 45 or 70 coins), uncommon 30% (a heart or a plate), rare 15% (the gold sword; Update 0.1.4: or the Grimoire), epic 8% (a ring), legendary 2% (nothing yet: an epic instead). A **white key** never gives common or uncommon; a **gold key** only epic or legendary. As the lid comes up, a light in its rarity's colour: none for common, green, blue, purple, yellow for legendary.
- A chest holds **50–80 coins**, a **silver plate**, a **heart** or **a ring** (either). Coins 40%, the rest alike. **(placeholder odds)**

---

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
| Shieldbearer | Blocks attacks from the front; a charged punch breaks the shield. |
| Elites | Glowing versions with more health and one extra trick. Always drop a weapon. |

Models come from Quaternius's Bestiary/Dungeon Monsters and Ultimate Monsters packs.

**Each floor its own (Update 0.0.18, the designer):** floor 1 sends the grunt, spitter, Yeti, leaper, stinger and wraith; floor 2 the same small ones plus the slime, frog, snake and wasp, and the Spider and Blue Demon as its big ones (no Yeti); floor 3 floor 2's for now **(placeholder)**.

**Lava (Update 0.0.20, the designer):** some rooms from floor 2 on have lava pits (the lava lake, the lava bridges, the gauntlet), with walls in or beside the lava to wall-run across and a walkway round every pit. Falling in costs 50 health and puts you back at the floor's start (the fight you left starts over); with 50 or less, you die.

**Floor 3's enemies (Update 0.1.18, the designer: no Grunt, Leaper or Blue Demon; Update 0.1.19: the Skeleton, the Mushnub, the Ninja):** the Spitter, the Stinger, the Wraith, the Slime, the Frog, the Snake, the Wasp, the Skeleton and the Mushnub, and the Spider and the Ninja as its mini bosses. Its boss is to be the Dino (the Dragon stands in).

**Floor 3's rooms (Update 0.0.21, the designer):** none of floors 1–2's rooms; the lava rooms and four of its own with an upper floor 2.5 m up (the keep, ramparts, towers, bridgeworks), reached by steps, jump pads and wall runs. Spitters stand on perches up there and shoot down: climb up and take them out.

**Floor 3's look (Update 0.0.20, the designer):** grey stone (the dungeon pack's part 2): stone walls and floor, deep stone arches, stacked stone columns, and gates that are a portcullis dropping from above when a room shuts and drawn back up when it's won.

**Poison (Update 0.0.18):** 3 damage a second for 4 s, straight off your health (not the shield); a new dose starts it over; the screen's edge pulses green. **(placeholder numbers)**

### Bosses
One per floor, three in total, each with 2 phases. Floor 1's is the Demon, floor 2's the Dragon (Update 0.0.18); floor 3's is to come from the designer, and until then the Dragon guards it.

**The Demon (Update 0.0.15, the designer: build it as pitched, bigger, with an aura; spec `MD_UPDATES/M3_BOSS.md`).** The Demon from Ultimate Monsters, 6.5 m tall, 1200 health, never flinches. Its aura: a glow behind it, embers, a ring of fire at its feet, a red light. Every pause it picks a move by how far you are, each warned (glow, sound, a mark on the floor):
- **Charge:** lowers its head (red), then runs straight across the room: 25 and thrown aside if it hits you; into a wall or a column it's stunned 2.2 s and takes 1.5× damage.
- **Leap:** crouches (orange), leaps to where you stood (a ring shows where): 30 close by; a **quake ring** rolls out over the floor (15 unless you jump it).
- **Volley:** raises its trident, then a fan of five fire orbs.
- **Phase 2 (half health):** it roars and calls grunts (again every 18 s while few are left); quicker warnings, shorter pauses, faster; a charge runs into a leap; two fans. **(placeholder numbers)**
- **Death:** the world slows; it hangs frozen in the air, sinks flickering white and bursts. (Update 0.2.0: what it leaves, 60 coins, a key and a heart, is in its chest.)

**The Dragon (Update 0.0.18, the designer: an intro where it screams and the scream shakes; fire breath like a laser beam that annihilates even its own side; fireballs, claws, wing swings, tail swings; spec `MD_UPDATES/M3_FLOOR2.md`).** The Dragon from Ultimate Monsters, 7 m tall, flying low, 1600 health, never flinches; a gold aura. In its show it **screams** as it takes its stance, and the view shakes. Every pause it picks a move by how far you are (the tail when you're behind it), each warned:
- **Fire beam:** charges 1.5 s (Update 0.0.20, the designer: a thin red line shows where it will burn, fire gathers in its mouth), then a beam of fire through your chest to the floor for 2.2 s, following you slowly (dash across it); a wall stops it; **any other enemy in its line burns away**.
- **Fireballs:** three at you, one after another.
- **Claws:** a red lane, then it swoops along it claws out (22, thrown); into a wall it's stunned.
- **Wing swing:** close in front, a wide sweep: 16 and blown away.
- **Tail swing:** it spins, the tail sweeping all round it low: 20 (jump it).
- **Its choices (Update 0.0.20, the designer):** close to it, its wing, tail and claws, more often; far off, the beam and fireballs; between, the swoop, the beam and fireballs.
- **Phase 2 (half health; Update 0.0.21, the designer):** it screams and flies up at once, 5–8 s in the air, bombing the ground round you with massive fireballs (each landing spot shows as a ring until it lands); then it's back down, quicker and faster. No minions (no more wasps).
- **Flame burst (Update 0.0.21, the designer: rare):** stay close to it for about 30 s in all and it charges up (glowing, its reach ringed on the floor) and bursts into flame round it: run.
- **Death:** the Demon's show; 40 coins, a key, a heart (Update 0.2.0: in its chest). **(placeholder numbers)**

**The boss room (Update 0.0.15, the designer):** stepping in, the view leaves your eyes and rises over the room; its walls slide back as it grows; a portal opens in the middle and the boss rises out of it, takes its stance beside its name; the view glides back and the fight starts. Once it's dead, a wooden gate in the far wall swings open onto the dark: the way down.

---

## 10. The run
- **A floor (Update 0.0.12, the designer: like Soul Knight's levels):** a map of rooms joined by corridors that you explore. From the start room a winding way of five fight rooms leads to the way down; side rooms branch off it: the shop (Update 0.0.13) and sometimes a fight. One or two fight rooms hold a chest. A small minimap (top right) shows the rooms you've been in and the ones beside them (the shop in gold, the boss room in red). **The way ends in the boss room (Update 0.0.15).** (Later: reward rooms.)
- **A room:** you step in → its doors slam shut → 2–3 waves of enemies → room cleared → the doors open.
- **Signs (Update 0.1.20, the designer):** over every doorway into a room, on the corridor's side, a word says what's through it: **ROOM**, **CHALLENGE**, **SHOP** or **BOSS**.
- **The challenge room (Update 0.1.20, the designer: "a challenging run but rewarding if mastered"):** one on every floor, off the way, so you choose to go in. **6 more enemies** than a room as deep, always **2 mini bosses** (the floor's), always **a chest**; its mini boss drops **a white key or a gold key**, never a normal one (one key a room, as everywhere). Outlined in fire on the minimap. **(placeholder: one key)**
  - **Update 0.2.0 (the designer):** always exactly one, and it's the floor's only fight room that leads nowhere (there's no plain side fight room any more). Its chest isn't there until you've won: then the view goes to where it **rises out of the floor** and comes back to you. **You can't leave until you've taken your reward**: the gates stay shut until the chest is open and its item taken (they open anyway if you have no key at all, or you're no longer in the room). Any of its keys still lying on the floor are yours as you win.
- **The boss's chest (Update 0.2.0, the designer: "bosses no longer drop the rewards right away"):** as the wooden gate opens, a chest rises out of the floor 3 m in front of it (seen in the gate's shot). It opens without a key, like any chest (you kneel, lift the lid): the boss's coins burst out, and its key and heart wait over it for E.
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
4. **Enemies per room (Update 0.1.1, the designer; was a point budget):** a fight room sends **8 + 3 per room deeper + 2 more every 2 floors down, from floor 2** (Update 0.1.16, the designer; it was 3 more every floor): floor 1: 8, 11, 14, 17, 20; floors 2–3 start at 10; 4–5 at 12; 6–7 at 14; 8–9 at 16; floor 10 at 18 (its last fight room 30), drawn from a weighted table (the cheap kinds more often), at most 2 mini bosses, in 2 waves (3 from 18). On floor 1 the leaper and the stinger come from the second room, the wraith and the brute from the third. **(placeholders)**
5. **Rewards:** one shop per floor and one or two chests (Update 0.0.13); reward rooms drawn from a weighted table **(later)**.
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
- **Recorded sounds (Update 0.1.17, the designer):** human-made only, so the Steam page needs no AI notice: the Sonniss GDC 2026 bundle (royalty-free) and the designer's own recordings. Six batches picked by ear in the Lab (Sounds): combat, coins and chests, the bosses and magic, the enemies' warnings, the player's moves, the executions. No footsteps (the designer: "no need in this game"); the slide, the jump and the dash keep their made sounds. The rest is still made in code until its round. **Music (Update 0.1.17):** the designer's own; the menus' track loops on the menus and fades out into a run; the fights' music to come.

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
