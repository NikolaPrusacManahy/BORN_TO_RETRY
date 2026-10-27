# HANDOVER.md — where things stand

Read `CLAUDE.md` first (kept on this PC only, never in the repo), then `MD/DESIGN.md`, then the current milestone plan.

## Current state (2026-10-27): M1 done, M2 started — Update 0.0.9
- **Update 0.0.9 — M2's first slice: the Grunt and the Sword** (`MD_UPDATES/M2_COMBAT_SANDBOX.md`).
  - **Grunts:** the Orc (Ultimate Monsters), animated. Three come at a time from the lab's spawn points (the first wave 3 s after you arrive, the next 3 s after the last dies). One runs at you, stops in reach, winds up for 0.45 s (its club swing starts, it glows red, it growls) and swings: 15 damage and a shove, only if you're still in reach and in front. Every hit flinches it, cancelling the swing. 40 health. It may drop a worn sword (30%). You can't walk through one.
  - **The sword:** the RPG pack's, on a stand right of the start. E picks it up; left click slashes (alternating, 22 damage, longer reach than fists); a full right-click charge cleaves (55); F still quick-punches. Hits cost uses (shown bottom right; a cleave costs 2), misses are free. At 0 it's broken (red) and the next attack throws it; Q throws it any time: 70 damage and a hit-stop on whatever it hits, and it's gone. Picking up another drops yours at your feet.
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
  - F: quick punch, always ready, even mid-charge.
- **Targets:** four dummies in front of the start (they wobble, slide back, break, and return 2 s later).
- **Grunts and the sword (Update 0.0.9):** wait 3 s for the first three Orcs. The sword stands right of the start: E to take it, left click to slash, hold right click to cleave, Q to throw. Kill grunts with it until it breaks, then throw it; pick up what they drop. F1 → Enemies (set "Lab grunts" to 0 to practise movement in peace) and Weapons; the Arms tab has the held weapon's lean and size.
- **Health:** the spike strip east of the start (hurts, pops you up; dash over it to stay unhurt). Punch the dummies to heal. Fall off the edge or run out of health to die and restart.
- **Controls:** main menu → Settings → Controls, or pause → Controls. Click an action's key, then press anything (a key, a mouse button, the wheel); Esc cancels; Reset restores the defaults. The wheel has no "held", so a wheel-bound slide or charged punch is only a tap.
- **Hit feel:** hit-stop on finisher, charged and kill hits; screen shake; a small camera nod; sparks; chunks when a dummy breaks; a hit marker around the crosshair (red on a kill); placeholder sounds.
- **Arms:** both fists low in the corners, the centre clear (`MD/reference/arms_guard_gameplay.webp`); a gentle run bob (about 4 a second at run speed).
- **Dev keys:** F1 (or `) tuning panel, F2 debug overlay (shows the hit-stop, health and invincibility), F3 resets the player and all targets, F4 invincible on/off. Esc pauses.
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
| `MD_UPDATES/M2_COMBAT_SANDBOX.md` | M2's plan; its first slice is the Grunt and the Sword |
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
- Fists: both fists low in the corners; jabs go left, right, left; the charged punch is the right hand; the quick punch is the left.
- The ground slam is not in the base kit: it comes later as an unlockable skill (its code is kept, with no key).
- **The roster (Update 0.0.8):** Joseph (the Adventurer), Fallen King (King), William Rich (Suit), Alpha Team (Swat), in that cell order. Only Joseph is playable for now. The first list also had a Cowboy and a Horse Guy; the designer's later list names these four.
- The name is **Born To Retry**. The main menu is the gate scene; Start opens the gate and fades to black (Update 0.0.4: the first-person walk-in was cut).
- **No hints players already understand** on any interface: no key labels beside buttons, no how-to text, no status notes (Update 0.0.4).
- **Scenes make physical sense** even off camera: trees grow from earth, never paving; props stand on real ground (Update 0.0.5). `test-menu.ts` raycasts down from each to check.

## Open questions waiting on the designer
1. ~~The game's name~~: decided, **Born To Retry**.
2. The theme: dark ruins and monsters, or something else?
3. Firearms from the start, or melee only at first?
4. Boss ideas for floors 1–3.
5. The starter character and the unlock order.

## Browser checks (filled in during M1)
| Check | Result |
|---|---|
| Raw mouse input (`unadjustedMovement`) in Brave | **Yes** (F2: "raw mouse yes"; 2026-10-27) |
| Keyboard lock captures Ctrl+W in fullscreen | **Ctrl+W was stopped** (the designer, 2026-10-27), but the test ran in a window (F2: fullscreen no, kb lock no): the leave-page guard's "Leave site?" prompt caught it. Keyboard lock in fullscreen is still untested, so Ctrl stays off the default keys (players can bind it) |
| F1 can be captured by the page | **Yes**: it opens the tuning panel (2026-10-27) |
| Steady frame time with many targets and effects | **Yes**: 144 fps steady, worst frame 7.1 ms, nothing dropped, on the designer's 144 Hz PC with the dummies and effects (2026-10-27) |

## Not verified
Claude has seen and heard none of this in the game: the feel, the arms on screen, the targets, effects, sounds and menus are all unverified until played. The tests check the rules, the collision, and that the shipped arms pose correctly.
- **The main menu:** only the Blender previews of the scene were seen. In the browser, unseen: the logo and buttons over the scene, the statues, crates and trees under the game's own lighting, the lighting itself (torch and campfire flicker, gate light, shadows, fog), the dust, the gate's pace, the fade to black and back, and the gate's synth grind. `test-menu.ts` checks the scene's nodes, the menu shot's framing, that the gate is open before the fade (and never pokes out of the wall's top), and the timing.
- **Health and rebinding (Update 0.0.6):** unseen in the browser: the health bar, its trail and low pulse, the hurt flash and shake, the hurt and death sounds, the spikes, the death slow motion and fade, and the controls screen (binding a mouse button, the wheel, Esc to cancel). `test-health.ts` checks the health rules, blood heal through a real punch, orbs, spikes and the death timing; `test-bindings.ts` checks that any key, mouse button and wheel direction binds, with swaps.
- **The settings camp (Update 0.0.7):** only the Blender previews were seen. Unseen in the browser: the camp under the game's lighting (fire light, moon, fog, stars, embers), the glide in, the fades between the gate and the camp, the crackle, and the panel over the scene. `test-camp.ts` checks the scene's nodes, that every tree, bush and log stands on the ground with nothing grown into anything else, the fire in sight on the left, and the glide.
- **The character select (Update 0.0.8):** only the Blender previews were seen. Unseen in the browser: the corridor under the game's lighting, the glide in, the camera moving between cells, the bars lifting and rattling (and their sounds), the breathing, the name card, arrows and dots, and the fades. Also the bigger health readout. `test-prison.ts` checks the roster, the scene's nodes, each character on the floor in its cell clear of its bars, raised bars hidden in the wall, the glide, and the select (Joseph's bars lift, a locked cell stays shut, the camera follows).
- **Grunts and the sword (Update 0.0.9):** nothing seen in the browser. Unseen: the Orcs' look, scale, animations and their timing (the swing should land as the wind-up ends), the red glow, the growl; the sword in the hand (placed by measurement: up the right of the screen), the slashes' sweep, the cleave (for now the arm's move is the charged punch's thrust), the throw's spin, the stand, the HUD readout, and every sound. `test-grunt.ts` and `test-sword.ts` check the rules; `test-arms.ts` checks the held sword stays clear of the crosshair.
- **Known limits (Update 0.0.9):** grunts walk on the floor only (no climbing, no jumping: on a block you're out of their reach), and steer round walls with feelers rather than a path. Fine for the lab; real rooms (M3) will want proper navigation.
