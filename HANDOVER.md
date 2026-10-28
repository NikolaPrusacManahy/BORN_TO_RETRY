# HANDOVER.md — where things stand

Read `CLAUDE.md` first (kept on this PC only, never in the repo), then `MD/DESIGN.md`, then the current milestone plan.

## Current state (2026-10-28): M1 done, M2 under way, M3 under way — Update 0.1.1
- **Update 0.1.1 — bigger bars, more enemies per floor, the snake execution** (the designer's list; spec `MD_UPDATES/U011_EXECUTION.md`).
  - **Bars:** the dash charges and the Execution Power meter are twice the size.
  - **Enemies per room:** 8 + 3 per room deeper + 3 per floor down (floor 2 starts at 11, floor 3 at 14), at most 2 mini bosses. The point budget is gone.
  - **The snake execution:** with the meter full, a snake in reach pulses crimson. E grabs its tail and plays the moves: slam ahead, swing round your right, slam on your right, throw 9 m. It dies where it lands and hurts what's beside it. You can't be hurt and the world holds still until you let go.
  - **The grip** (the designer: no crossed arms, really grab the tail): both hands hold the tail like a rope (`viewmodel/heldGrip.ts`, `ArmsRig.gripPose` for either hand). The left hand holds the tip, the right is beside it, and the snake is turned about its body line so its tail runs to your right. The tail joints are held still; the body thrashes. `test-exec-grip.ts` checks it with the real models.
  - **Lab:** the panel's **Meter** (on at first) keeps the Execution Power meter full, in the Lab only.
  - Key poses checked as Blender renders (`tools/exec-shots.ts`): as you see it and from the side. The motion, timing, sounds and effects are unseen.
  - **Files over the split limit:** `engine/Game.ts` (336 lines), `App.tsx` (347), `sim/combat/state.ts` (312), `engine/run.ts` (305), `engine/viewmodel/viewmodel.ts` (301) and `sim/enemies/enemy.ts` (300). Split them before adding more.
- **Update 0.1.0 — constant pressure, the Execution Power meter** (the designer's list; spec `MD_UPDATES/U010_PRESSURE.md`).
  - **Rooms:**
    - A room's planned enemies come as one stream: an opening of at least 5, then one more whenever fewer than 5 are fighting (every 0.35 s), until the room's plan is all sent.
    - No more emptying the room between waves.
  - **Execution Power meter:** a crimson bar above the dash charges. Kills fill it (10 to full), it carries between floors, and it does nothing yet.
- **Update 0.0.21 — floor 3's rooms, the Dragon's sky phase, enemies left** (the designer's list; spec `MD_UPDATES/M3_KEEP.md`).
  - **ASSETS:** the 14 monsters in the game moved to `Ultimate Monsters/used_monster/{Boss,mini_boss,flying,blobs}/`, each with the atlas. What's left elsewhere is unused.
  - **HUD:** enemies left in the fight (alive plus waves to come), top middle.
  - **Dragon:**
    - No wasps.
    - At half health it flies up for 5–8 s and lobs fire bombs, their landing rings shown.
    - Stay within 6 m of it for 30 s in all and it charges a flame burst (9 m).
  - **Floor 3:**
    - Only its own rooms: the three lava rooms plus the keep, ramparts, towers and bridgeworks. Each new room has an upper floor (2.5 m) with steps, pads and walls up to it.
    - Perched spitters (2 a wave) stay up there and shoot down.
- **Update 0.0.20 — lava rooms, floor 3's look, Dragon and snake balance** (the designer's list; spec `MD_UPDATES/M3_FLOOR3.md`).
  - **Frog and snake:** the Frog is 1.5× smaller (0.75 m). The snake is 1.5× faster (10.5 m/s), bites for half (4), and bites the moment it's close (0.1 s warning).
  - **Dragon:**
    - The beam charges 1.5 s: a red line shows where it will burn, and fire gathers in its mouth.
    - Close, it strikes (wing, tail, claws) and pauses half as long; far, it breathes fire and throws fireballs.
  - **Lava** (from floor 2):
    - Three new rooms (lava lake, lava bridges, gauntlet), each with a walkway joining its doors and walls in or beside the lava for wall runs.
    - Falling in costs 50 health and puts you back at the floor's start (the fight you left resets); with 50 or less you die.
  - **Floor 3 is stone:** part 2's walls, floor, stone arches, stacked columns, and a portcullis that drops when a room shuts and is drawn back up when you win. The look is chosen per floor (`world/dungeon/styles.ts`).
  - **Lab:** Floor 1/2/3 buttons start a run from that floor.
- **Update 0.0.19 — the Lab, the wasp's sting, enemy sizes** (the designer's list; spec `MD_UPDATES/M3_LAB.md`).
  - **Sizes fixed:** the Slime and the Snake were drawn about 3× and 10× too big. The newer pack's meshes are stored turned on their side, so their mesh box measured them wrong. They (and the Frog, Wasp, Spider and Dragon) are now measured from their skinned body in their idle pose (`engine/bodyMeasure.ts`), and `test-floor2.ts` checks each drawn height.
  - **The Wasp stings:**
    - It swoops down in front of your chest, buzzes, then stabs (poison). Dash away during the warning.
    - Its venom shots and the poisoned-orb code are gone.
  - **The Lab (dev builds):**
    - The main menu's **Lab** goes straight into the Feel Lab, with its waves off.
    - **F8** opens its panel and the world holds still. It spawns any enemy (×1/×3/×5) or boss in front of you, any item, bonus, weapon or a chest.
    - **Demon room / Dragon room** plays that boss's real room (show and fight); leaving or dying returns to the Lab.
    - Clear, Heal, Waves and God toggles.
    - Floor items are now drawn outside the dungeon too.
    - F9's lab is the Lab now (its waves off until switched on).
- **Update 0.0.18 — floor 2's enemies, the Dragon, prices by floor** (the designer's list; spec `MD_UPDATES/M3_FLOOR2.md`).
  - **Each floor sends its own:** floor 2 has floor 1's small ones plus four new small ones and two big ones (no Yeti); floor 3 has floor 2's for now.
  - **Six new enemies** (Ultimate Monsters' newer set):
    - **Slime:** a kamikaze; it swells, then bursts.
    - **Frog:** mid range; its tongue lashes along a line and pulls you in; its aim locks late, so step off the line.
    - **Snake:** its bite poisons.
    - **Wasp:** a flier; its sting poisons.
    - **Spider:** big; it leaps to where you stood, or bites.
    - **Blue Demon:** big; it charges or throws fire.
    - The Spider and the Blue Demon are floor 2's mini bosses (a chest in their room; the first killed drops the key).
  - **Poison:** 3 a second for 4 s, past the shield; the screen's edge pulses green.
  - **The Dragon**, floor 2's boss (and floor 3's for now):
    - The Demon's show, but it **screams** in its stance and the view shakes.
    - A fire beam that follows you slowly and burns away any enemy in its line.
    - Fireballs, a claw swoop, a wing swing in front, a tail spin all round (jump it).
    - Rage at half health: it screams and calls wasps.
    - Its name card is THE DRAGON.
  - **Prices:** normal 50, better 70, best 100, +15% every floor down (58/81/115, then 66/93/132).
  - **Tuning tabs:** "Floor 2 enemies" (with Lab counts) and "Dragon (boss)" (with Lab dragon).
  - **Feel and looks unverified:**
    - the models' sizes, facings and clip choices (the Wasp turned 90°);
    - the Dragon's hover and its beam lining up with its mouth;
    - the scream shake;
    - the tongue;
    - the slime's swell.
- **Update 0.0.17 — less gold, reworked rings, kill bonuses, weapon slots** (the designer's list; spec `MD_UPDATES/M3_LOADOUT.md`).
  - **Gold:**
    - chests hold 10/20/30/40 coins;
    - kills give half what they did (grunt 1, spitter 2, brute 5, leaper 2, stinger 1.5, wraith 2.5, Demon 30); a half is one more coin half the time.
  - **Armour:** the silver plate gives 20 shield; the new **gold armour** gives 40.
  - **Rings** (for the run): red +15 max health; **purple** +25% damage; **green** +15% melee attack speed; blue +15% run speed.
  - **Chests and the shop:**
    - Chests can hold the gold armour (rare) and all four rings (epic).
    - The shop always has a heart and the silver plate; its other three tiles are drawn from the gold sword, the gold armour, the four rings and a key.
  - **Melee reach +30%:** punch 2.9 m, slash 3.4 m, pierce 4.15 m.
  - **Kill bonuses**, like CoD Zombies' power-ups. A kill may drop one (10% each, at most 2 a room); walk over it:
    - **snowflake:** for 7 s, every melee hit freezes the enemy for 1 s (icy blue, still; not a boss);
    - **gold ingots:** for 10 s, +50% coins;
    - **blue potion:** for 7 s, +30% speed.
    Each shows bottom left with its time draining. Left lying, it blinks and fades after 20 s.
  - **Weapon slots:**
    - Your fists are slot 1. A weapon you get goes in the next slot (2, 3, 4, 5) and into your hand, and **keys 1–5 swap**.
    - Getting another weapon no longer drops yours. A thrown weapon empties its slot.
    - The slots show bottom right with their uses; the one in hand is raised.
- **Update 0.0.16 — keys, loot by rarity, the Yeti's key, a shuffled shop** (the designer's list; spec `MD_UPDATES/M3_KEYS_LOOT.md`).
  - **Chest loot by rarity:**
    - common 45%: 20, 35, 45 or 70 coins;
    - uncommon 30%: a heart or a plate;
    - rare 15%: the gold sword;
    - epic 8%: a ring;
    - legendary 2%: nothing yet, so an epic.
  - **As the lid comes up**, a coloured light and column rise from the chest: none for common, green, blue, purple; yellow is ready for legendary items.
  - **Three keys:** the normal key, the **white key** (no common or uncommon; pale silver in a blue aura) and the **gold key** (only epic or legendary; gold in a yellow aura).
  - **At a chest:** your keys show in a row low in the middle. The **mouse wheel** (Switch key, rebindable) changes the key you'll use, and **your left hand comes up palm open with that key lying on it**. E uses it.
  - **The Yeti is the mini boss:**
    - Every room with a Yeti has a chest.
    - The first Yeti killed there drops a key (normal/white/gold 70/25/5%), one per room however many Yetis. Walk over it to take it.
    - Rooms' waves are now planned with the floor, so this is known up front.
  - **The shop:**
    - Always a heart and an armour plate; three more drawn from the gold sword, the rings and a key (normal/white/gold 70/25/5%), all shuffled.
    - A key is no longer always on offer.
    - Keys stand on end and turn on their tiles.
- **Update 0.0.15 — the first boss, the Demon** (the designer: build it as pitched, bigger, with an aura; a cinematic entrance; a death that hangs, flickers and bursts; a wooden gate onto the dark). Spec: `MD_UPDATES/M3_BOSS.md`.
  - **The boss room** replaces the exit room at the end of the way: 60 m square, four columns and eight broken ones, a pad in each corner, red on the minimap. You walk into a smaller room built against the wall you came in by.
  - **The show:**
    - Stepping in shuts the gates, and the view rises out of your eyes over the room (black bars, the HUD fades).
    - The walls slide back to the real walls with a grinding rumble.
    - A portal opens in the middle (a swirling red-violet disc, a column of light, sparks, a light flooding the room), and the Demon rises out of it.
    - The view comes down in front of it as it raises its trident, its name card on the right (**THE DEMON**, "Warden of Floor 1").
    - The view glides back into your eyes, facing it, and the fight starts (about 8 s).
    - You don't move during it.
  - **The Demon:** 6.5 m tall, 1200 health, never flinches. Its aura: a glow, embers, a ring of fire, a red light.
    - **Charge:** red warning and a red lane on the floor, then a run straight across the room. 25 damage and thrown if it hits you. Into a wall or a column it is stunned 2.2 s and takes 1.5× damage.
    - **Leap:** orange warning, then it lands where you stood (a ring shows where). 30 damage close by, and a quake ring rolls out over the floor (15 damage): jump it.
    - **Volley:** a fan of five fire orbs.
    - **Rage, at half health:** it roars and calls four grunts (again later while few are left). Quicker warnings and shorter pauses, faster, a charge into a leap, two fans.
    - **Death:** the world slows. It rises, hangs frozen, sinks flickering white faster and faster, and bursts: 60 coins, a key and a heart.
  - **The wooden gate:**
    - A timber frame with two iron-bound plank doors, a torch on each side, in the middle of the far wall.
    - It swings open into pure black a moment after the burst; the view turns to it and back, and the room's own gates lift.
    - "FLOOR 2" glows faintly in the dark.
    - Stepping into the dark fades to black, and the next floor loads with its name as the black clears.
  - **Every floor's boss is the Demon** for now; floor 3's doesn't end the run yet (M5).
  - **Fixed after the designer's first play:** after the boss died the screen froze and the gate shot never came. The room's clock stopped once the room was cleared, so the gate shot stayed at its first frame and kept you locked. It runs on now (`test-boss-room.ts`, `test-boss-show.ts` regression checks).
  - **Tuning tabs:** "Demon (boss)" (every number, Lab demon to try it in the Feel Lab) and "Boss show" (the show's timings, the view's height, the slow motion, the gate shot, the fade).
- **Update 0.0.14 — no sky through the walls** (the designer's screenshots: pale lines in the room corners and along the feet of the walls, a pale crack up a corner seen close). In daylight the gaps between the kit's pieces showed the sky behind them: the brick faces have jagged edges, and nothing filled the wall cells behind them (the old black fog hid it). Now every wall and ledge cell has a solid core in the kit's darkest brick colour, set just behind its faces where it has them and flush with the walls beside it, and a dark slab lies under the whole floor. A notch now reads as a mortar line. Seen in Blender (`render_dungeon.py --day`, before and after, a room corner close up), not in the game. `test-dungeon.ts` checks every wall and ledge cell is filled and the cores never poke out past the faces (and fails with them flush everywhere).
- **Update 0.0.13 — bigger rooms, three new enemies, the shop and chests, no blood heal** (the designer's list).
  - **Rooms twice the size** (the designer: more walls to use, more room to fight in): the nine fight rooms are redrawn at twice the width and length (24–36 cells a side, 48–72 m), each drawn as a quarter and mirrored (`world/dungeon/fightRooms.ts`), with more long inner walls to wall-run along and hide behind, and pads to launch from. The start room is 12 × 12 cells, the exit 16 × 16. Each column of the floor's board is as wide as its widest room, so corridors stay short. Room budgets are bigger to fill them (6 + 3 × depth + 4 × (floor − 1); 3 waves from 18). Fog pushed back to 20–95 m, eight torch lights, the minimap shows twice the area.
  - **The Leaper** (the Ninja; design §9's "jumps at you from range, punish it on landing"): runs at you; within 13 m, with nothing tall between (it leaps over crates), it crouches for 0.55 s (glows violet, hisses), then leaps in a 2.6 m arc to where you stood: 18 damage and thrown if you're on or beside the landing (jump it). Then 0.9 s stuck: your opening. Too close, it backs off to leap again. A hit knocks it out of the air. 45 health.
  - **The Stinger** (the Armabee, flying): flies about 3.4 m up on its own grid (over low cover, round walls and columns). Within 10 m, with a clear line, it rears back for 0.6 s (glows red, buzzes), then dives at 20 m/s through where your chest was and on past it: 14 damage and a knock if it goes through you. The dive ends on the floor, a wall or a crate, leaving it low and dazed for 1 s: punch it then. 25 health.
  - **The Wraith** (the Ghost, flying): floats 3.6 m up, keeps 8–18 m from you (drifts closer over cover, away when you're close, circles between); a 0.7 s warning (glows pale, wails), then a fan of three slow orbs at you (10 each, 14° apart). 35 health. Reach it with a jump, a wall run, a pad or a thrown sword. Fliers aren't hit by your ground slam up there; their bodies fall when they die.
  - **The rooms send them** from the second room of floor 1 (leapers, stingers) and the third (wraiths, brutes); every kind from floor 2. The lab sends one of each too (Leaper & fliers tab: Lab leapers, Lab stingers, Lab wraiths).
  - **No more healing from hits** (the designer): blood heal is gone; only the shop (and a chest's heart) heals.
  - **The shop** (the designer: a room with five floor tiles, each showing something to buy): a side room on every floor, off the second to fourth fight room (gold on the minimap). Each tile has an item turning above it and its price over it (red when you can't pay). Stand by one and press E to buy it. Everything costs **70**: the **heart** heals half your health; the **silver armour plate** gives a **shield** of half your health (a blue bar above the health bar; it takes hits before your health does, up to a full bar); the **gold sword** goes in your hand with **40 uses**; the **ring with a red gem** gives +25% damage, the **ring with blue gems** +20% run speed (rings stack); the **key** opens a chest. Six items, five tiles: the key is always there (every floor has a chest), plus four of the other five. No heart at full health or plate with a full shield (a buzz).
  - **Chests** (the designer): one in a fight room on every floor, sometimes two. With a key, E (once the room isn't fighting) kneels you in front of it: the view lowers and turns to it, both hands reach for the lid's front edge and lift it, and what's inside comes out as it opens: 50–80 coins (they burst out and fly to you), a plate, a heart or a ring. About 1.3 s. Without a key the lid rattles.
  - **What you carry** shows beside your coins: keys, red and blue rings. Your shield, keys and rings come down to the next floor with you; dying loses them.
  - **Day time in the dungeon** (the designer: way too dark to play): it's open to the sky. A sun overhead casts shadows round you (floor tiles take them, walls and props cast them), a bright sky light fills the shade, a pale sky-blue haze far off replaces the black fog, and the torches stay as warm accents. New tuning tab **Dungeon light**: Sun 3, Sky light 1.8, Torches 12, Haze 60–200 m, Sun shadows on (0 turns them off if the frame rate drops).
- **Update 0.0.12 — the dungeon, the Spitter and the Brute, coins, the slam** (the designer's list).
  - **Play starts a dungeon run** (`MD_UPDATES/M3_DUNGEON.md`): a floor of rooms joined by corridors, laid out from a new seed every run (like Soul Knight's levels). From the start room a winding way of five fight rooms leads to the way down (a trapdoor in the exit room); one or two side rooms branch off it. Nine hand-made fight rooms (text layouts on a 2 m grid: colonnade, crossfire, altar, spike hall, ledges, maze, arena, twin, crypt), each mirrored, turned and with its optional cover chosen per run; none twice on a floor. Built from the Modular Dungeon Pack, parts 1 and 2 (`tools/blender/export_dungeon_kit.py` → `public/models/dungeon/kit.glb`): brick walls, slate floors, arched doorways, columns, crates, broken columns, spike traps, ledges, wall torches, banners, bones.
  - **The room loop:** step into a fight room and its gates (iron bars in the arches) crash down; a moment later the waves come (2–3, bought from a budget that grows with the room's depth and the floor: grunt 1, spitter 2, brute 4); when the last one dies the bars sink and the gates open. The way down takes you to the next floor with your health, coins and weapon; dying starts a new run on a new floor plan.
  - **The minimap**, top right: rooms you've been in filled, the ones beside them outlined, the one you're in bright, the way down in purple, you as an arrow.
  - **The Spitter** (the Wizard): keeps 7–16 m from you, comes closer when it can't see you, backs off when you're close, circles in between; warns 0.6 s (rears, glows green, gurgles), then spits a slow orb (13 m/s, 12 damage); a hit cancels the shot.
  - **The Brute** (the Yeti, 2.8 m, 160 health): walks at you; in reach it rears up for 0.9 s while a red ring on the ground shows its slam's 3.6 m reach, then slams (30 damage and thrown, if you're on the ground inside: jump it); then it stands winded 1.2 s. Only a hit of 40 or more staggers it.
  - **Enemies share one body now** (`sim/enemies/enemy.ts`): each kind's numbers in `kinds.ts`, its moves in `grunt.ts`, `spitter.ts`, `brute.ts`. The brute walks its own, wider grid.
  - **Coins:** kills burst coins (grunt 2, spitter 4, brute 10) that fly to you with a ding; your count sits just above the health bar. Money resets with each run.
  - **F is the ground slam** (the designer): only from 1.8 m or more above the ground (near the top of a jump, off a ledge, a pad or a wall). The landing is a blast: every enemy within 4 m takes up to 35 (half at the edge), harder and wider the further you fell (up to 90 and 7 m), thrown outwards; a shockwave ring, dust, a boom. Old saves get F for it.
  - **Weapons:** a weapon you pick up has 4 uses; only grunts drop one (15%).
  - **The Feel Lab** is still there: F9 (dev only) swaps between it and a fresh dungeon run. It now sends mixed waves (2 grunts, a spitter, a brute).
- **Update 0.0.11 — grunts and walls** (the designer: the grunts are mostly fine, but with a wall in the way they ran into it forever, and some got stuck inside walls and blocks).
  - **They find their way round:** a walk grid of half-metre cells is built once from the arena (`world/navGrid.ts`): a cell is blocked off the floor or where a grunt's body would touch a wall, a block taller than a step, a roof lower than its head, or spikes. A flow field over it (`sim/enemies/chase.ts`) gives every cell its number of steps to you, redone when you move to another cell. A grunt with a clear straight line runs straight at you; otherwise it heads for the farthest cell down the flow it can run straight to, so it rounds corners and backs out of dead ends.
  - **Never inside a wall:** after any move (running, knockback, grunts pushing each other apart, a spawn) a grunt is pushed back out of every wall it overlaps.
  - **No swing through a wall**, and none at you up on a block: there they come to the foot of it and wait (they still walk the floor only).
- **Update 0.0.10 — the sword arm** (the designer's notes on 0.0.9: a real grip, no left hand, a pointed pierce, a throw that looks like it).
  - **The grip:** the handle now runs through the curled fingers (it sat in the palm, 6 cm too far back, and tilted 40° through the fist), and the fist sits right under the guard (the designer: "more inside the grip"; Arms → "Sword in the fist"). Each pose sets how far the blade leans in the fist: a hammer grip when ready, a fencer's grip for slashes and the pierce, so arm and blade swing as one.
  - **No left hand:** with a weapon the left arm drops out of view.
  - **No quick punch** (the designer): F is unbound, with a sword or barehanded, and kept free for something later. Its knobs, sounds and arm move are gone; an old save's binding for it is dropped.
  - **Its own moves** (`engine/viewmodel/swordAnim.ts`, poses in `swordPoses.ts`): ready low right, blade up.
  - **The slash** (redone after the designer called the first one atrocious: the hand stayed at the screen's edge while only the wrist turned, it rested stiffly with the arm flat across the view, and the backhand drove the hand into the camera). Left click: the hand rises a little and the whole arm cuts down from the upper right through the middle of the view (the blade crosses the crosshair about 20 ms in), reaching low left, then gliding straight back to ready along the bottom (about 0.3 s from the click). The designer: no rest on the left (it waited 0.7 s, which read as a freeze); Arms → "Slash rest" can bring a wait back. A slash before it's back swings back to ready (the backhand, on the other edge). The arms choose the way from where the sword is; the rules just say "slash". On a hit-stop the swing now plays on to its contact and freezes there (it used to freeze before it moved, since the hit lands on the click).
  - **The pierce** (was "cleave"): holding right click draws the sword back low right and points the tip at the crosshair, trembling when full; letting go thrusts straight along the aim. It reaches further (3.2 m) and is narrower (0.5 m) than a slash.
  - **The throw** (broken + any attack, or Q): a 0.12 s wind-up (drawn back like the pierce, then thrust), and the sword leaves the hand at the end, flying tip first. In the world it starts where the hand let it go and joins its true path over 0.12 s.
  - The poses were picked from renders of the game's own arms code (`game/tools/view-shots.ts` + `tools/blender/render_view.py`) with the wrist kept nearly straight.
- **Update 0.0.9 — M2's first slice: the Grunt and the Sword** (`MD_UPDATES/M2_COMBAT_SANDBOX.md`).
  - **Grunts:** the Orc (Ultimate Monsters), animated. Three come at a time from the lab's spawn points (the first wave 3 s after you arrive, the next 3 s after the last dies). One runs at you, stops in reach, winds up for 0.45 s (its club swing starts, it glows red, it growls) and swings: 15 damage and a shove, only if you're still in reach and in front. Every hit flinches it, cancelling the swing. 40 health. It may drop a worn sword (30%). You can't walk through one.
  - **The sword:** the RPG pack's, on a stand right of the start. E picks it up; left click slashes (22 damage, longer reach than fists); a full right-click charge pierces (55; it was a cleave until 0.0.10). Hits cost uses (shown bottom right; a pierce costs 2), misses are free. At 0 it's broken (red) and the next attack throws it; Q throws it any time: 70 damage and a hit-stop on whatever it hits, and it's gone. Picking up another drops yours at your feet.
- **M1 — The Feel Lab is done** (2026-10-27): the designer says the feel is good; no tuning changes to bake in (the defaults stand); 144 fps steady on the designer's PC; **we stay in the browser** (Godot not needed).
- **Milestone: M2 — The Combat Sandbox** (`MD_UPDATES/M2_COMBAT_SANDBOX.md`). First slice: the Grunt (the Orc from Ultimate Monsters) and the Sword (Ultimate RPG Pack) in the Feel Lab.
- **The settings camp now uses the full Ultimate Nature Pack:** real logs, a ring of rocks round the fire, a stump, grass, plants, mossy rocks and pines (the stand-in logs and stones are gone). The packs in `ASSETS/` are complete now (nature 150, RPG 106, monsters 50 in three zips, unzipped beside them).
- **Update 0.0.8 — the character select** (the designer's idea): Start opens the gate onto a prison corridor. A row of barred cells holds the roster: **Joseph** (the Adventurer: fists only, picks up used weapons), **Fallen King**, **William Rich** (the suit) and **Alpha Team** (the Swat). Only Joseph is playable; the others are there to show the roster. Walking the corridor moves the camera from cell to cell: a playable character's bars lift as he's selected, a locked cell's bars rattle. Play locks the mouse and fades into the lab; Esc fades back to the gate. The characters are the Quaternius models, posed out of their T-pose and baked in Blender, breathing a little in the game.
  - The HUD's health readout is twice the size.
- **Update 0.0.7 — the settings camp** (the designer's idea): Settings on the main menu fades through black to a night camp in a forest clearing. The camera glides in to sit on a log by a campfire (embers, stars, crackling), and the options panel sits on the right. The controls live inside Settings now (tabs: General, Controls), in the camp and in the pause menu; the main menu has only Start and Settings. Back or Esc fades back to the gate.
  - The camp's logs and fire-ring stones are simple low-poly shapes made in Blender: the Ultimate Nature Pack in `ASSETS/` is still partial (no logs, stumps, rocks, pines or grass). With the rest of the pack, its own logs and rocks can replace them.
- **Update 0.0.6 — M1 steps 8 and 9:** health and rebinding.
  - **Health:** 100 HP and no regeneration. It's shown bottom left: the number and a bar, with a pale trail showing what a hit took, pulsing when low. A short invincibility follows each hit, and dashes still stop damage. Blood heal: punches that land heal 20% of their damage. Death (including falling out of the world) slows the world, fades to black, and puts you back at the start with full health.
  - **Spike strip** in the Feel Lab (east of the start) to test it: touching it hurts and pops you up; a dash carries you over unhurt. Nothing else in the lab hurts you yet (no enemies; the turret is out with the parry).
  - **Rebinding:** every action takes any key (Ctrl included), any mouse button (side buttons too) or a wheel direction. Esc and the Windows key are off limits, and so are the dev keys, but only while the dev tools are on. A key another action uses swaps with it. The controls screen is the main menu's Controls panel and the pause menu's Controls tab.
- **Update 0.0.5 — the menu scene dressed:** two rearing horse statues guard the foot of the stairs; crates, barrels and a campfire on the right; a pale dead tree at each side (Ultimate Nature Pack), each growing from a bed of earth where a flagstone was lifted (the designer: no trees on paving). The yard is now paved right up to the wall (it stopped 4 m short, under the statues).
  - **The Ultimate Nature Pack in `ASSETS/` looks partial:** 50 `.blend` files, stopping at `CommonTree_Autumn_4` (birches, bushes, cacti, common trees). The rocks, logs, stumps, grass and pines aren't there, likely the rest of a split download.
- **Update 0.0.4 — the main menu** (the designer's idea, outside the M1 plan): a low shot up a staircase at a dungeon gate built from the Modular Dungeon Pack, with the BORN TO RETRY logo in the sky. Start grinds the portcullis up, the screen fades to black, and the black clears off the Feel Lab.
- **M1 — The Feel Lab** (`MD_UPDATES/M1_FEEL_LAB.md`), done.
  - **Done:** steps 1–5 (scaffold, loop, tuning, arena, movement and camera), step 6 (the arms and fists), step 8 (hit feel, health, HUD), step 9 (pause, settings, rebinding) and step 10 (docs).
  - **Changed by the designer:** no real enemies yet; static training dummies replace the Grunt and Spitter of step 7 for now. The parry is removed for now, and with it the orb turret leaves the Feel Lab (its code stays).
  - **Closed (2026-10-27):** the feel approved, the defaults stand, frame time steady, browser kept.
- Game: **Born To Retry**, a first-person action roguelike, solo, desktop browser. Steam later via Electron.
- Tech: Vite + React + TypeScript, Three.js 0.186, Rapier 0.21 (`@dimforge/rapier3d-compat`), Node 24.

## What to try in-game
Run `START_GAME.bat`. The main menu opens on the gate.
- **Main menu:** the torches and the campfire flicker, dust drifts, the camera sways slowly. Start (or Enter / Space): the portcullis grinds up into the wall (about 1.3 s), the screen fades to black, and you're in the prison corridor to pick a character. ←/→ (or your left/right keys) walk the cells; Play (or Enter) locks the mouse and fades into the lab; Esc goes back to the gate. Settings fades to the night camp (General and Controls tabs); Back or Esc returns. The pause menu has the same tabs, and **Main menu** to come back.
- If Esc is pressed while the gate opens, the lab starts paused (click Resume).
- **Moves:** WASD, Space jump / wall jump, Shift dash (3 charges).
  - C slides for up to 0.5 s; press again to slide again. Pressed in the air, the slide starts on landing and eases in.
  - Wall run: in the air beside a wall, hold W while heading along it (up to 1 s); rising fast (pads, jump starts) never grabs a wall. The view tilts clockwise with the wall on your left, anticlockwise on your right. Jump to push off to the other side and catch the next wall. Try the wall-run lane (north-west: three panels on alternating sides) or the outer walls.
- **Fists:**
  - Left click: jab combo. Hold it to keep punching: left, right, then a left finisher that knocks back.
  - Right click: hold 1 s (the fist draws back and trembles, a cue sounds when ready), then let go to punch. Letting go sooner cancels.
- **Targets:** four dummies in front of the start (they wobble, slide back, break, and return 2 s later).
- **Update 0.0.15:** clear the five fight rooms (or F4 and run) to the boss room at the end of the way (red on the minimap). Watch the show, then fight:
  - Bait its charge into a column and punish it while it's stunned.
  - Jump the quake ring after its leap.
  - Sidestep the fire fans.
  - At half health, deal with the grunts it calls.
  - Kill it and watch it hang, flicker and burst.
  - Walk through the wooden gate into the dark for floor 2.

  F1 → Demon (boss) → Lab demon 1 sends one into the Feel Lab (F9) to practise without the show.
- **Update 0.0.13:** the rooms are twice the size: try wall runs along their inner walls. From the second room on, leapers (jump their landing, punch them while they're stuck), stingers (sidestep or dash the dive, punch them low and dazed) and, from the third, wraiths (step out of the fan; jump or wall-run up to them). Your hits don't heal you now. Find the shop (gold on the minimap): stand by a tile, E buys (70 each); buy the key, find the chest (in a fight room, once it's clear) and press E in front of it. The shield is the blue bar above your health. In the lab (F9) a leaper, a stinger and a wraith come with every wave.
- **The dungeon (Update 0.0.12):** Play → you start in a small room facing its door. Walk into the next room: the gates crash down and the waves come. Clear it, follow the corridors (watch the minimap), find the trapdoor in the exit room and step on it for the next floor. Try the slam (F) off a ledge or after a jump pad into a crowd; jump the brute's slam; dodge the spitter's orbs. F9 swaps to the Feel Lab and back; F3 lays the floor out again from its start.
- **Grunts and the sword (Updates 0.0.9 and 0.0.10):** wait 3 s for the first three Orcs. The sword stands right of the start: E to take it, left click to slash (tap for a forehand, keep going for forehand and backhand by turns), hold right click to point it and let go to pierce, Q to throw. Kill grunts with it until it breaks, then throw it; pick up what they drop. F1 → Enemies (set "Lab grunts" to 0 to practise movement in peace) and Weapons (pierce reach and width, throw wind-up, throw spin); the Arms tab moves the sword arm, slides it in the fist, and times its slash, its return, the pierce and the swap.
- **Health:** the spike strip east of the start (hurts, pops you up; dash over it to stay unhurt). Punch the dummies to heal. Fall off the edge or run out of health to die and restart.
- **Controls:** main menu → Settings → Controls, or pause → Controls. Click an action's key, then press anything (a key, a mouse button, the wheel); Esc cancels; Reset restores the defaults. The wheel has no "held", so a wheel-bound slide or charged punch is only a tap.
- **Hit feel:** hit-stop on finisher, charged and kill hits; screen shake; a small camera nod; sparks; chunks when a dummy breaks; a hit marker around the crosshair (red on a kill); placeholder sounds.
- **Arms:** both fists low in the corners, the centre clear (`MD/reference/arms_guard_gameplay.webp`); a gentle run bob (about 4 a second at run speed).
- **Dev keys:** F1 (or `) tuning panel, F2 debug overlay (shows the hit-stop, health and invincibility), F3 resets the player and all targets (in the dungeon: the floor again from its start), F4 invincible on/off, F9 the Feel Lab / a fresh dungeon run. Esc pauses.
- **Tuning tabs added:** Health (max, blood heal, hurt invincibility, spikes, death slow motion and fade, hurt shake); Lab gained Invincible. Earlier: Fists, Hit feel, Arms (guard nudges per fist, roll, wrist bend, punch timing, sway, bob), Targets, Wall run. Slide gained a length and an ease-in; Camera gained the wall-run tilt (negative flips its direction).

## First-person arms
- **Pipeline:** `MD/PIPELINE_CHARACTER_ARMS.md`, tool `game/tools/blender/cut_arms.py`. The game's guard: `MD/reference/arms_guard_gameplay.webp`. The first, photo-based guard (`arms_guard_adventurer.webp`) covered the crosshair in play.
- **In the game:** `game/public/models/arms/adventurer.glb`, with the fists baked closed. The game poses only the upper arm, forearm and hand, using the same math as the Blender previews.
- The designer plans more characters in future updates; each one goes through the same pipeline.

## Changes from the M1 plan
- **Floating capsule:** Rapier's own step climbing only worked above ~6 m/s, so a player starting next to a step got stuck. The capsule now floats 0.4 m above the feet and a ground probe places the feet. Steps up to 0.4 m work at any speed (`DEVELOPMENT.md`, Contracts).
- The slide height is 1.2 m (it was planned as 1.0), so the floating capsule fits. The tunnel roof is 1.3 m.
- The tunnel sits just south of the ramp, so a slide through it carries onto the ramp.
- No Grunt or Spitter yet (the designer's call): static dummies instead.
- No parry yet (the designer's call, Update 0.0.3); the orb turret is out of the lab until it returns.
- The arms bob was about 23 bobs a second at run speed (a units slip); it is now about 4.
- The designer's fixes after playing Update 0.0.3:
  - The slide key in the air used to fire the ground slam (a 45 m/s drop that looked like a teleport). Now it waits to slide on landing, and the slam has no key.
  - Slides need a fresh press and last 0.5 s at most (first 1 s, then shortened).
  - Right click needs a full 1 s hold (first 1.5 s, then shortened).
  - Wall running was added, with a tilt and chaining. The Feel Lab gained a wall-run lane.
  - Wall runs last 1 s at most (first 2 s; Update 0.0.4).
  - Wall runs grabbed the drop tower from the jump pad. Now a run only starts when you're heading along the wall (within 50° of its line) and not rising faster than 6 m/s. The regression test tries the turn angle that used to stick you at 5.5 m.
- Air steering is now Quake-style: holding forward no longer bleeds off sideways speed. Without this, wall-run chains couldn't reach the next wall.
- Health came with a spike strip to test it, since there are no enemies yet (the designer's call). Hurt invincibility (0.6 s) was added so a hazard can't hit every tick.
- Death in the lab is a quick restart (slow motion, fade to black, back at the start). A real death screen comes with runs (M3).
- `Game.ts` was split: the lab's play loop is now `engine/labRun.ts`.

## Files
| File | What it is |
|---|---|
| `MD/DESIGN.md` | The full game design, with placeholders marked |
| `MD_UPDATES/M1_FEEL_LAB.md` | M1 scope, starting values, build order, tests |
| `MD/PIPELINE_CHARACTER_ARMS.md` | How to cut first-person arms for a new character |
| `MD/PIPELINE_ENEMIES_WEAPONS.md` | How a monster (with its animations) and a held weapon get from the packs into the game |
| `MD_UPDATES/M2_COMBAT_SANDBOX.md` | M2's plan: the Grunt and the Sword, then the Spitter, the Brute, coins and the slam |
| `MD_UPDATES/M3_DUNGEON.md` | M3's first slice: the dungeon floors, their rooms, the room loop and the minimap |
| `MD/PIPELINE_DUNGEON.md` | How the dungeon kit is exported, how a room is drawn, and how to look at a floor without a browser |
| `MD_UPDATES/M3_SHOP_CHESTS.md` | Update 0.0.13: the shop, the chests, the items, the shield, and rooms twice the size |
| `MD_UPDATES/M3_BOSS.md` | Update 0.0.15: the Demon, the boss room and its show, the wooden gate onto the dark |
| `MD_UPDATES/M3_KEYS_LOOT.md` | Update 0.0.16: keys, loot by rarity, the Yeti's key, the shuffled shop, the open palm |
| `MD_UPDATES/M3_LOADOUT.md` | Update 0.0.17: less gold, armour and rings reworked, melee reach, kill bonuses, weapon slots |
| `game/tools/boss-shots.ts` | Renders the boss room (walls at any point of their slide, the gate shut or open, the Demon's stance) from the show's own shots, without a browser |
| `game/tools/view-shots.ts`, `game/tools/blender/render_view.py` | Renders the first-person arms (the game's own code and models) at chosen moments, without a browser |
| `MD/PIPELINE_MENU_SCENE.md` | How the menu's scenes (the gate, the settings camp, the prison corridor) are built, and how to change them |
| `DEVELOPMENT.md` | Module map and contracts |
| `ASSETS/QUATERNIUS/` | Downloaded Quaternius packs, one folder per pack (git-ignored) |

## Git
- Commit titles are `Update X.Y.Z`, then a blank line and `- ` bullet lines. No co-author line.
- `CLAUDE.md`, `CLAUDE.local.md`, `.claude/` and the raw `ASSETS/` folder are git-ignored.
- The repo is local; the designer publishes through GitHub Desktop.

## Decisions made
- First person, solo only, no online features.
- Browser (Three.js + Rapier), not raylib or Godot. **Confirmed after M1 (2026-10-27): we stay in the browser.**
- Arenas are hand-made templates assembled from a seed, not random geometry.
- Weapons break; breaking throws the weapon for a big hit.
- Only character unlocks and stats carry over between runs.
- Fists: both fists low in the corners; jabs go left, right, left; the charged punch is the right hand.
- **No quick punch (Update 0.0.10).** **F is the ground slam (Update 0.0.12, the designer)**, from a real height only.
- **Floors are explored maps of rooms (Update 0.0.12, the designer: like Soul Knight)**, not a chain of door choices. Rooms are hand-made layouts on a 2 m grid, varied per run; the Modular Dungeon Pack (parts 1 and 2) dresses them.
- **Weapons: 4 uses when picked up; only grunts drop them, 15% (Update 0.0.12).**
- **No healing from hits (Update 0.0.13, the designer): only the shop's heart (and a chest's) heals.** Blood heal and its knobs are gone.
- **The shop and chests (Update 0.0.13, the designer):** five tiles; heart, silver armour plate (a blue shield bar), gold sword (40 hits), red-gem ring (+25% damage), blue-gem ring (+20% speed), key (opens a chest); all 70. Chests hold 50–80 coins, a plate, a heart or any ring; you kneel and open them with both hands.
- **Rooms twice the size (Update 0.0.13, the designer).** Three more enemies: the Leaper, and two fliers, the Stinger and the Wraith.
- **The first boss is the Demon (Update 0.0.15, the designer):** bigger, with an aura; a cinematic entrance (walls sliding back, a portal, its stance beside its name); a death that hangs in the air, flickers white and bursts; a wooden gate onto the dark as the way down (no trapdoor, no exit room).
- **The roster (Update 0.0.8):** Joseph (the Adventurer), Fallen King (King), William Rich (Suit), Alpha Team (Swat), in that cell order. Only Joseph is playable for now. The first list also had a Cowboy and a Horse Guy; the designer's later list names these four.
- The name is **Born To Retry**. The main menu is the gate scene; Start opens the gate and fades to black (Update 0.0.4: the first-person walk-in was cut).
- **No hints players already understand** on any interface: no key labels beside buttons, no how-to text, no status notes (Update 0.0.4).
- **Scenes make physical sense** even off camera: trees grow from earth, never paving; props stand on real ground (Update 0.0.5). `test-menu.ts` raycasts down from each to check.

## Open questions waiting on the designer
1. ~~The game's name~~: decided, **Born To Retry**.
2. The theme: dark ruins and monsters, or something else?
3. Firearms from the start, or melee only at first?
4. Boss ideas for floors 2 and 3 (floor 1: the Demon). Until then the Demon guards every floor.
5. The starter character and the unlock order.
6. ~~F with a sword~~: decided, the quick punch is gone; F is the ground slam (Update 0.0.12).
7. ~~What the side rooms hold~~: the shop (Update 0.0.13); the boss room ends the way (Update 0.0.15). Still open: reward rooms.
8. **Update 0.0.13 placeholders to confirm:** five tiles for six items (the key always offered, four of the other five); E to buy and to open a chest (the design's E: "pick up, buy, open"); a chest opens only when its room isn't fighting; one chest a floor (35%: two); chest odds (coins 40%, then a plate, a heart or a ring alike); the shield caps at a full bar (two plates), rings stack; the blue ring speeds running and sliding, not the dash; buying the gold sword drops your sword at your feet; the new enemies' numbers (Leaper & fliers tab); bigger room budgets.

12. **Update 0.1.1:** which enemies get executions next, and whether each gets its own moves or one shared set (the snake's are keyframes in `sim/combat/execution.ts`).
11. **Update 0.0.17 placeholders to confirm:**
   - bonuses: at most 2 a room, 20 s on the floor;
   - the snowflake never freezing a boss, and only from punches and swings (not throws or the slam);
   - the green ring speeding jabs and slashes but not the charge;
   - five weapon slots;
   - a new weapon going straight into your hand;
   - all slots full: the new one replaces the one in your hand;
   - after a throw, your fists come out;
   - the shield's cap staying at 100.
10. **Update 0.0.16 placeholders to confirm:**
   - the Yeti's key odds (the shop's 70/25/5);
   - one or two extra chests beside the Yeti rooms;
   - the shop no longer always selling a key;
   - the normal key picked first, the wheel going normal → white → gold;
   - E opening with the picked key at once (no confirm);
   - legendary rolls giving an epic until there are legendary items;
   - where the open palm sits.
9. **Update 0.0.15 placeholders to confirm:**
   - the boss's name and title (THE DEMON, "Warden of Floor N");
   - all the Demon's numbers (Demon (boss) tab), and how it picks its moves (by distance);
   - its loot (60 coins, a key, a heart; the heart is the design's part-heal);
   - the room's size and pillars, and the small room you walk into (16 × 14 cells);
   - the show's timings and shots (Boss show tab), and whether the gate shot should stay;
   - the room's gates lifting with the wooden gate (you can go back to the shop);
   - the wooden gate swinging outward into the dark, and "FLOOR 2" in the dark;
   - the floor's name on arrival;
   - the Demon on every floor;
   - floor 3's boss not ending the run yet.

## Browser checks (filled in during M1)
| Check | Result |
|---|---|
| Raw mouse input (`unadjustedMovement`) in Brave | **Yes** (F2: "raw mouse yes"; 2026-10-27) |
| Keyboard lock captures Ctrl+W in fullscreen | **Ctrl+W was stopped** (the designer, 2026-10-27), but the test ran in a window (F2: fullscreen no, kb lock no): the leave-page guard's "Leave site?" prompt caught it. Keyboard lock in fullscreen is still untested, so Ctrl stays off the default keys (players can bind it) |
| F1 can be captured by the page | **Yes**: it opens the tuning panel (2026-10-27) |
| Steady frame time with many targets and effects | **Yes**: 144 fps steady, worst frame 7.1 ms, nothing dropped, on the designer's 144 Hz PC with the dummies and effects (2026-10-27) |

## Not verified
Claude has seen and heard none of this in the game: the feel, the arms on screen, the targets, effects, sounds and menus are all unverified until played. The tests check the rules, the collision, and that the shipped arms pose correctly.
- **The snake execution (Update 0.1.1):** seen only as still renders of the real rules and view code (`tools/exec-shots.ts`, flat light, a tiled floor). Unseen in the game: the moves in motion and their pace, the view turning, the hands on the tail in motion (checked as stills and by `test-exec-grip.ts`), the snake's thrash (its walk clip 3× fast), the crimson pulse, the slam freezes, rings, debris and shake, the synth sounds, the flight and the landing. `test-execution.ts` checks the target rules, the grab, the world holding still, the two slams reaching the floor, the body never passing through your head, the view looking down at each slam, invulnerability, the throw short of a wall, the one-shot kill and the splash.
- **The main menu:** only the Blender previews of the scene were seen. In the browser, unseen: the logo and buttons over the scene, the statues, crates and trees under the game's own lighting, the lighting itself (torch and campfire flicker, gate light, shadows, fog), the dust, the gate's pace, the fade to black and back, and the gate's synth grind. `test-menu.ts` checks the scene's nodes, the menu shot's framing, that the gate is open before the fade (and never pokes out of the wall's top), and the timing.
- **Health and rebinding (Update 0.0.6):** unseen in the browser: the health bar, its trail and low pulse, the hurt flash and shake, the hurt and death sounds, the spikes, the death slow motion and fade, and the controls screen (binding a mouse button, the wheel, Esc to cancel). `test-health.ts` checks the health rules, orbs, spikes and the death timing (blood heal was removed in Update 0.0.13: a real punch now heals nothing); `test-bindings.ts` checks that any key, mouse button and wheel direction binds, with swaps.
- **The settings camp (Update 0.0.7):** only the Blender previews were seen. Unseen in the browser: the camp under the game's lighting (fire light, moon, fog, stars, embers), the glide in, the fades between the gate and the camp, the crackle, and the panel over the scene. `test-camp.ts` checks the scene's nodes, that every tree, bush and log stands on the ground with nothing grown into anything else, the fire in sight on the left, and the glide.
- **The character select (Update 0.0.8):** only the Blender previews were seen. Unseen in the browser: the corridor under the game's lighting, the glide in, the camera moving between cells, the bars lifting and rattling (and their sounds), the breathing, the name card, arrows and dots, and the fades. Also the bigger health readout. `test-prison.ts` checks the roster, the scene's nodes, each character on the floor in its cell clear of its bars, raised bars hidden in the wall, the glide, and the select (Joseph's bars lift, a locked cell stays shut, the camera follows).
- **Grunts and the sword (Update 0.0.9):** nothing seen in the browser. Unseen: the Orcs' look, scale, animations and their timing (the swing should land as the wind-up ends), the red glow, the growl; the stand, the HUD readout, and every sound. `test-grunt.ts` and `test-sword.ts` check the rules.
- **The sword arm (Update 0.0.10):** seen only as still renders of the game's arms code (Blender, flat light, no world behind). Unseen in the game: the moves in motion (how fast the slash reads, the backhand coming back, the pierce's draw and thrust, the throw), the left arm dropping, the thrown sword leaving the hand, the swap back to fists, and the new pierce and wind-up sounds. The redone slash was checked as a film of frames 15 ms apart (wrist under 30° throughout). `test-arms.ts` checks the grip sits in the fingers under the guard, the wrist stays nearly straight in every held pose, the left arm is out of view, a forehand sweeps the blade across the crosshair with the whole arm and goes straight back, a slash before it's back swings back, and a hit-stop freezes it on contact, the pierce points at the crosshair, and the thrust and throw go forward.
- **Grunts and walls (Update 0.0.11):** unseen in the browser. `test-nav.ts` checks the lab's grid, a grunt going round a wall and out of a pen, never inside a wall (running, knocked, shoved, spawned in one), no swing through a wall, waiting at the foot of a block you're on, and grunts from every lab spawn reaching you at the start, behind the low cover and between the pillars.
- **The dungeon, the Spitter, the Brute, coins and the slam (Update 0.0.12):** nothing seen in the browser. Seen only as Blender renders of the game's own floor plans with the real kit (`tools/dungeon-shots.ts`): an overview and a few eye-height views, flat light. Unseen: the dungeon under the game's lights (torch lights following you, fog, the exit glow: the brightness is a guess), the bars crashing and sinking, the minimap, the Wizard and the Yeti in motion (their scale, clips, the swing timing, the glow, the brute's ring), the slam's shockwave and dust, the coins flying in, and every new sound. Load time per floor measured at about 35 ms in Node. `test-dungeon.ts` (rooms, floor plans over 40 seeds, the level, the room loop, the kit), `test-enemies.ts`, `test-slam.ts`, `test-money.ts` check the rules.
- **Bigger rooms, the Leaper, the Stinger, the Wraith, the shop, chests, the shield, rings (Update 0.0.13):** nothing seen in the browser. Seen only as Blender renders: a floor's overview and an eye-height view with the real kit (the rooms at their new size), the item models (`export_items.py` previews: the chest's lid swung open on its hinge), and the new monsters' previews. Daylight seen only as a Blender stand-in (`render_dungeon.py --day`: the same sky colour, sun direction and strengths, not the game's renderer): bright and readable there; the game's real brightness, the shadows' look and their cost per frame are unverified. Unseen: the shop under the game's lights (tiles, turning items, price tags), the chest opening (the kneel, the view turning, the hands on the lid: a rule test checks through the game's own arms and cameras that both fists land on the lid's front edge on screen, within a fifth of the screen), items flying in, the shield bar and its blue flash, the HUD's keys and rings, the three new enemies in motion (their scale, clips, timing, glows, the leaper's arc, the stinger's dive, the wraith's fan), their sounds, and how the bigger rooms play. A floor now loads in about 10 ms in Node (the walk grids are built faster: identical cells, checked over 525 grids). `test-shop.ts`, `test-foes.ts`, and new checks in `test-dungeon.ts` and `test-health.ts` check the rules.
- **Less gold, rings, bonuses, weapon slots (Update 0.0.17):** nothing seen in the browser.
  - **Seen only as a Blender preview:** the new item models (gold armour, the four rings, the snowflake, the gold ingots, the blue potion).
  - **Unseen:**
    - how the longer reach feels;
    - the bonuses on the floor, their glows and blinking, and their HUD timers;
    - frozen enemies;
    - the weapon slots bar and swapping (the arms change from sword to fists and back);
    - the new sounds.
  - `test-loadout.ts` checks the rules.
- **Keys and loot (Update 0.0.16):** nothing seen in the browser.
  - **Seen only as renders** of the game's own arms code (`tools/view-shots.ts`: the open palm with each key, barehanded and with a sword; all three keys the same size).
  - **Unseen:** the palm in motion (coming up, switching keys, closing as you kneel); the keys' auras (sprites, not in the renders); the chest lights; the keys standing and turning on the shop's tiles and on the floor; the key picker on the HUD; the new sounds.
  - `test-keys.ts` and `test-shop.ts` check the rules, the palm's pose and the key sizes.
- **The first boss (Update 0.0.15):** nothing seen in the browser.
  - **Seen only as Blender renders** of the game's own code (`tools/boss-shots.ts`, `render_dungeon.py --day`): the room with its walls at 0, ½ and 1 (the small room you walk into, brick-faced); the gate shut and open (black behind it); the Demon's stance shot from the show's camera, standing left of the middle.
  - **Unseen:** the show in motion (the camera's glide, the walls sliding, the portal's shaders and sparks, the rise, the name card and black bars, the glide back); the Demon in motion (its clips, the warnings' glows, the charge lane, the landing ring, the quake rings); its aura (a shader glow, embers, the fire ring, the light); the death show (slow motion, the frozen pose, the white flicker, the burst's flash); the gate swinging; the fade into the dark and the floor's name; every new sound; and whether the fight is fun or fair.
  - `test-boss.ts` and `test-boss-show.ts` check the rules, the model's clips and size, the camera's path, the walls, the gate and the run's side.
- **Known limits:** walkers walk the floor only (no climbing, no steps: on a block, a ledge or the steps you're out of their reach; the leaper only leaps along the floor), and the walk grids are at floor height (the dungeon builds three per room: walkers, the brute, fliers). Fliers keep below the 6 m walls and have no ceiling to mind (there is none). The way down fades to black now (Update 0.0.15). No reward rooms yet. The boss room's show has no player body (the view never looks back at you). Fine for the lab; rooms with levels (M3) will want grids per floor or links between them.
