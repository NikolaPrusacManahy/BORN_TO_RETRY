# Born To Retry development

The game is in `game/` (Vite + React 18 + TypeScript strict, Three.js, Rapier). Node 24.

## Commands (from `game/`)
- `npm run dev` (or `START_GAME.bat` at the root): dev server on port 5173, with the dev tools.
- `npm run verify:quick`: type check + rule tests.
- `npm run verify`: type check + rule tests + production build.

## Module map

### Core and platform
| Module | Owns |
|---|---|
| `core/fixedStep.ts` | The fixed-step clock: ticks per frame, the max-ticks cap, the interpolation alpha |
| `core/frameStats.ts` | Frame-time ring buffer: FPS, worst and median frame |
| `core/eventQueue.ts` | Fixed-size event queue (no garbage) for sim → camera/sound events |
| `core/rng.ts` | Seeded RNG (mulberry32). All run randomness goes through it |
| `platform/pointerLock.ts` | Pointer lock with raw input when offered |
| `platform/fullscreen.ts` | Fullscreen plus keyboard lock |
| `platform/leaveGuard.ts` | "Leave page?" prompt while the mouse is locked |

### Input and settings
| Module | Owns |
|---|---|
| `input/bindings.ts` | Actions, default keys (no Ctrl), rebinding (any key, mouse button or wheel direction; swaps on a clash), hydrate. Esc and the OS keys are never bindable; the dev keys only while the dev tools are on |
| `input/input.ts` | Key and mouse state. Presses last until a sim tick reads them (`clearPressed`) |
| `input/mouseSpike.ts` | Last Ward's filter for Chrome's impossible mouse jumps |
| `state/settings.ts` | Saved settings and hydrate; horizontal → vertical FOV |
| `state/devTools.ts` | Dev-only gating and the dev-key map |

### Tuning
| Module | Owns |
|---|---|
| `tuning/schema.ts` | Knobs (default, range, label, help) and live values `group.v.<key>` |
| `tuning/movement.ts`, `camera.ts`, `combat.ts`, `health.ts`, `enemies.ts`, `weapons.ts`, `arms.ts`, `lab.ts` | The knob groups |
| `tuning/light.ts` | Update 0.0.13 — the dungeon's daylight: sun, sky light, torches, haze, sun shadows |
| `tuning/foes.ts`, `tuning/items.ts` | Update 0.0.13 — the Leaper, Stinger and Wraith ("Leaper & fliers"); the shop's prices and items, chests ("Shop & chests") |
| `tuning/foes2.ts`, `tuning/dragon.ts` | Update 0.0.18 — floor 2's enemies and poison ("Floor 2 enemies": the Slime, Frog, Snake, Wasp, Spider, Blue Demon, poison, their Lab counts); the Dragon ("Dragon (boss)": its moves, rage, scream shake, summons, Lab dragon) |
| `tuning/boss.ts`, `tuning/cinema.ts` | Update 0.0.15 — the Demon ("Demon (boss)": its moves, rage, death show, Lab demon); the boss room's show ("Boss show": its beats, the view's height and boss shot, the death's slow motion, the gate, the fade into the dark) |
| `tuning/store.ts` | Group list, export/import, saving overrides |

### Enemies and weapons (pure) — M2
| Module | Owns |
|---|---|
| `sim/enemies/enemy.ts` | Update 0.0.12 — every enemy's body: the pool, spawning, its hit capsule, taking a hit (a flinch cancels its attack; the brute only flinches from a hard hit), walking the floor and out of walls, turning, pushing apart, the player pushed out of them |
| `sim/enemies/kinds.ts` | Update 0.0.12 — the enemy catalog: each kind's numbers (from `tuning/enemies.ts`), radius and walk-grid size; `Record<EnemyKind, …>` so a new kind is asked for everywhere |
| `sim/enemies/grunt.ts`, `spitter.ts`, `brute.ts` | Each kind's moves: the grunt's chase and warned swing; the spitter's ring round you, warned spit and cooldown; the brute's walk, warned slam (on the ground inside its ring) and winded recovery |
| `sim/enemies/leaper.ts`, `stinger.ts`, `wraith.ts` | Update 0.0.13 — the leaper's warned leap (an arc to where you stood; hurts on landing) and stuck recovery; the stinger's warned dive through you and dazed recovery; the wraith's distance, warned fan of orbs |
| `sim/enemies/slime.ts`, `frog.ts`, `snake.ts`, `wasp.ts`, `spider.ts`, `blueDemon.ts`, `moves.ts` | Update 0.0.18 — floor 2's enemies, one file each: the slime's swell and burst (gone, no coins; `struck` marks it), the frog's tongue (its aim locks late; `mouthOf`, `TONGUE_TIME`), the snake's poisoning bite, the wasp's sting (Update 0.0.19: a swoop down to your chest and a stab, no shot), the spider's leap and bite, the Blue Demon's charge (the Demon's, with its own `ChargeSpec`) or fireball. `moves.ts`: closing in round walls, keeping a ring round you, an arc to a spot |
| `sim/enemies/dragon.ts`, `dragonMoves.ts` | Update 0.0.18 — the Dragon (floor 2's boss): picking a move by your distance and side (seeded; the tail when you're behind it), each warned; its rage scream (once). Its moves: the fire beam (phase `'breath'`: its line in `Enemy.aim`, stopped by the floor and walls; hurts you, burns other enemies away with `'burnt'`), the fireballs (a burst counted in `Enemy.shots`), the claws (the Demon's charge with `swoopSpec`), the wing (an arc in front), the tail (all round, low). Its death show is `doomDemon` |
| `sim/enemies/demon.ts`, `demonMoves.ts` | Update 0.0.15 — the Demon: picking a move by your distance (seeded), each warned; its rage at half health (once); its death show (rises, hangs, sinks, bursts). Its moves: the charge (throws you once; a wall or column stuns it), the leap (lands where you stood, starts a quake), the volley (a fan; two raging) |
| `sim/combat/quakes.ts` | Update 0.0.15 — quake rings rolling out over the floor: hurt you once on the ground as they pass, never in the air |
| `sim/enemies/fly.ts` | Update 0.0.13 — what fliers share: keeping their height, seeing you through the air (a ray), coming closer on their own grid, circling you |
| `sim/enemies/update.ts` | Update 0.0.12 — one tick of every enemy, in a fixed order: the ways to the player per size, each one's shared start, its kind's moves, then pushing apart |
| `sim/enemies/chase.ts` | Update 0.0.11 — the way to the player for floor-bound enemies: a flow field over the walk grid, and the steering that reads it (straight when it can, else the farthest cell down the flow in a straight line) |
| `world/navGrid.ts` | Update 0.0.11 — where a floor-bound enemy can stand, built from an arena: blocked cells (with the body's radius), the walls' footprints, line tests, and pushing a body out of walls. Update 0.0.13 — a band per grid (`FOOT`, `AIR`: fliers are blocked only by walls and columns); each footprint marks only the cells near it |
| `sim/enemies/waves.ts` | The lab's waves (seeded RNG, away from the player): Update 0.0.12 — mixed kinds; `spawnAt` also serves the dungeon's waves |
| `sim/weapons/catalog.ts` | Weapon kinds, their names and stats (from `tuning/weapons.ts`); Update 0.0.13 — the Gold Sword (the sword's stats, 40 uses) |
| `sim/weapons/weapons.ts` | The held weapon, weapons on the ground (stands, drops), in flight; pick up, swap, drop, throw |
| `sim/weapons/swing.ts` | The held weapon's slashes (one 'slash' event; the arms pick the way); the charge becomes its pierce; what a hit costs |
| `sim/weapons/thrown.ts` | Thrown weapons flying, hitting the first target or a wall, and breaking |
| `sim/combat/strike.ts` | What a sweep hits (the nearest dummy, turret or grunt) and landing a hit: kills, the kill hit-stop, drops |

### The dungeon (pure) — Update 0.0.12
| Module | Owns |
|---|---|
| `world/dungeon/rooms.ts` | The room legend, the start, boss (Update 0.0.15: was the exit room) and shop rooms (Update 0.0.13), and the per-run variations (mirrored, turned, optional cover); chest spots and shop tiles |
| `world/dungeon/fightRooms.ts` | Update 0.0.13 — the nine fight rooms at twice the size, each drawn as its top-left quarter and mirrored |
| `world/dungeon/floorPlan.ts` | A floor from a seed: rooms on a 5 × 5 board (the way, the shop and maybe a fight off it; Update 0.0.13 — columns and rows as wide as their rooms), chests, doors, corridors, all stamped on one grid of 2 m cells. Update 0.0.15 — the way ends in the boss room |
| `world/dungeon/wayOut.ts` | Update 0.0.15 — the way down: the wooden gate's doorway opposite the boss room's door, the dark beyond it, walled round |
| `world/dungeon/assemble.ts` | The floor as a level: merged collision boxes, jump pads, a gate per doorway, and per room its inside, spawns, gates and its own arena (for its walk grid). Update 0.0.15 — the boss room's layout: where its walls start and end, the portal, the wooden gate (the last gate), the dark |
| `world/dungeon/dressing.ts` | Where each Modular Dungeon Pack piece goes (walls three high with caps, floor tiles, arches, columns, crates, ledges, spikes, torches, banners, litter); Update 0.0.14 — the walls' and ledges' solid cores. Update 0.0.15 — no trapdoor; the wall over the wooden gate, a torch either side |
| `sim/dungeon/roomLoop.ts` | The room loop: in a fight room its gates shut, waves bought from its budget (Update 0.0.13: weighted over the kinds open to the room), gates open when it's clear; the boss room (Update 0.0.15: `bossRoom.ts`); the way down (once the boss is dead); rooms visited; each room's walk grids (walkers, the brute, fliers) |
| `sim/dungeon/treasure.ts` | Update 0.0.13 — the shop's offers (always a key) and buying with E; the chests' loot (seeded), opening one with a key (you kneel), its loot coming out as the lid is up |
| `sim/dungeon/bossRoom.ts` | Update 0.0.15 — the boss room: the show's beats (`introBeats`, shared with the view), the walls sliding (`wallsOpen`), the portal (`portalOpen`), the boss rising out of it, the fight (its calls for grunts once it rages), its death (grunts die with it, its loot when its body bursts), the wooden gate opening |
| `sim/items/items.ts` | Update 0.0.13 — the items (heart, plate, gold sword, rings, key), what each does when taken, what you carry (keys, rings) and the damage and speed it gives. Update 0.0.16 — three keys (normal, white, gold), the key you'd use and switching it, a key by its odds |
| `sim/items/drops.ts` | Update 0.0.16 — items lying on the floor (the Yeti's key), taken by walking over them. Update 0.0.17 — and kill bonuses, which fade if left |
| `sim/items/bonuses.ts` | Update 0.0.17 — kill bonuses (snowflake, gold ingots, blue potion): the roll on a kill and a room's cap, their time, a kill's coins (halves and the gold ingots' boost), the potion's speed |
| `sim/weapons/slots.ts` | Update 0.0.17 — weapon slots: fists in slot 1, a weapon you get into the next free slot and your hand, picking a slot, a throw emptying its slot, the hand and the slots kept agreeing |
| `sim/dungeon/loot.ts` | Update 0.0.16 — a chest's loot by rarity and by the key it's opened with, from rolls made with the floor |
| `sim/dungeon/wavePlan.ts` | Update 0.0.16 (moved out of roomLoop.ts) — room budgets, buying a wave, each fight room's waves planned with the floor (so Yeti rooms are known: they get chests). Update 0.0.18 — each floor's roster (`rosterOf`); `hasYeti` means any mini boss (`MINI_BOSSES` in kinds.ts: Yeti, Spider, Blue Demon) |

### Characters (pure)
| Module | Owns |
|---|---|
| `sim/characters.ts` | Update 0.0.8 — the roster in cell order (id, name, kit, playable); stepping between cells |

### Movement (pure, `sim/player/`)
| Module | Owns |
|---|---|
| `step.ts` | One tick's order: timers → actions → velocity → collision → landing. Nothing else |
| `state.ts` | `PlayerState`, its events, `moveMode` |
| `intent.ts` | What the player asked for this tick |
| `ground.ts`, `air.ts` | Ground acceleration/stop/overspeed; air steering (Quake-style: only pushes while you're under run speed in the wanted direction, never past it) and gravity |
| `jump.ts` | Ground jumps, coyote time, jump buffer; dash-jump, slide-jump, slam bounce |
| `dash.ts`, `slide.ts`, `wallJump.ts`, `wallRun.ts`, `slam.ts`, `jumpPad.ts` | One move each (the slam has no key since Update 0.0.3) |
| `health.ts` | M1 step 8 — damage (and what stops it), healing, death. Update 0.0.13 — no blood heal; the shield takes a hit first |
| `kneel.ts` | Update 0.0.13 — kneeling at a chest: no moving, eased onto the spot in front of it, facing it |
| `hazards.ts` | M1 step 8 — spike strips (arena boxes of kind `hazard`): hurt and pop you up |
| `body.ts` | The player's size and step height |
| `sim/collisionWorld.ts` | The collision interface the sim uses |

### Combat (pure, `sim/combat/`) — M1 step 6
Update 0.0.12: `slamHit.ts` (your ground slam's blast: every target in reach, half at the edge, never through a wall) and `coins.ts` (coins burst from kills, fly to you, counted).
| Module | Owns |
|---|---|
| `step.ts` | One combat tick's order: fists (and the punch they throw) → dummies → turrets → orbs. Nothing else |
| `state.ts` | `CombatState`, its events (`CombatEvent`), create/reset |
| `fists.ts` | Jab combo (hold to repeat), charged punch on release (the quick punch was cut in Update 0.0.10) |
| `punch.ts` | Landing a punch: sweep from the eye; nearest target takes the hit; hit-stop requests |
| `dummy.ts`, `turret.ts`, `turretDamage.ts`, `orbs.ts` | Training dummies (spring wobble, break, respawn); the turret (warn → fire, line of sight); orbs (hit you unless dashing, pop on walls). The turret is out of the Feel Lab until the parry returns |
| `hitStop.ts` | The freeze: longest request wins, counted down on real time |
| `targets.ts`, `geometry.ts` | Target data and shapes; segment–segment distance |

### Physics, world, engine, audio, screens
| Module | Owns |
|---|---|
| `physics/rapierWorld.ts` | The only Rapier import: arena colliders, the floating player capsule, ground probe, wall probe, stand check |
| `world/arena.ts` | Arena data types; `boxAt`, `rampZ` helpers |
| `world/arenas/feelLab.ts` | The M1 gray-box arena |
| `engine/Game.ts` | The shell: renderer, input, sound, mouse lock, fullscreen, and the frame loop in three modes: `menu` (the gate scene), `intro` (Start pressed: the gate opening), `play` (the lab, run by `LabRun`) |
| `engine/run.ts` | The play loop (was labRun.ts): player, fists, targets, camera, arms; ticks, events, render, death and respawn. Update 0.0.12 — plays a level: the lab, or a dungeon floor with its room loop; the way down loads the next floor (health, coins and weapon kept), a death a new run |
| `engine/level.ts` | Update 0.0.12 — a level: arena, physics, how it's drawn, the room loop (dungeon); the lab and dungeon floors; a run's seed |
| `engine/dungeonView.ts` | Update 0.0.12 — a dungeon floor drawn from the kit as instanced meshes; the gates' bars; pads; torch lights that follow you. Update 0.0.13 — day time: a sun whose shadows follow you, a sky light, a pale haze. Update 0.0.15 — the boss room's sliding walls, portal and wooden gate (`boss/`), following its show |
| `engine/mapFeed.ts`, `screens/Minimap.tsx` | Update 0.0.12 — the minimap: known, visited and current rooms, corridors, you |
| `engine/deathFlow.ts` | M1 step 8 — the death timing: slow motion, then respawn once the fade is black |
| `engine/overlayFeed.ts` | What the HUD and the F2 overlay show, read from the sim once a frame |
| `engine/menu/menuScene.ts` | The main menu's gate scene: loads `public/models/menu/gate.glb`, reads the menu shot, lights, flickering flames (torches, campfire), dust, idle drift; raises the portcullis after Start |
| `engine/menu/introTimeline.ts` | What Start plays, as pure timing: the gate lift, when the fade to black starts, how long it lasts |
| `engine/menu/prisonScene.ts` | Update 0.0.8 — the character select's prison corridor: loads `public/models/menu/prison.glb`; the camera's glide in and its move from cell to cell, the bars lifting or rattling, cell lights and torches, the characters breathing |
| `engine/menu/campScene.ts` | Update 0.0.7 — the settings screen's night camp: loads `public/models/menu/camp.glb`, the fire light, embers, stars, the crackle, and the camera's glide in |
| `engine/menu/sceneBits.ts` | What the menu scenes share: marker positions, readying materials (fires glow), flickering flame lights |
| `engine/fx/dust.ts` | Drifting motes (one `Points` cloud, updated in place): the gate's dust and the camp's embers |
| `engine/cameraRig.ts` | Eye height, landing spring, step smoothing, FOV kick, roll, shake |
| `engine/look.ts`, `shake.ts` | Mouse look; trauma shake |
| `engine/arenaView.ts`, `renderer.ts` | Meshes, grid texture, light, fog; the WebGL renderer |
| `engine/moveFeedback.ts` | Movement events → camera kicks, arm dips and sounds |
| `engine/intents.ts` | Keys and mouse → `PlayerIntent` and `CombatIntent` each tick |
| `engine/combatScene.ts` | Owns the combat visuals and sounds; reads and clears combat events each frame |
| `engine/combatFeedback.ts` | Combat events → arm punches, sparks, chunks, shake, camera kick, HUD markers, sounds |
| `engine/targetsView.ts` | Dummy, turret and orb meshes |
| `engine/enemiesView.ts` | The enemies (was gruntsView.ts): one animated body per slot of its kind (Orc, Wizard, Yeti), clips by phase (the blow timed to land as the wind-up ends), the wind-up's glow, hit flash, the brute's slam ring |
| `engine/coinsView.ts`, `engine/fx/shockwave.ts` | Update 0.0.12 — the flying coins (instanced); slam shockwave rings |
| `engine/treasureView.ts` | Update 0.0.13 — the shop's tiles, turning items and price tags; the chests and their lids; items flying into you; where an opening lid's front edge is (for the hands) |
| `engine/keyLooks.ts`, `engine/treasureFx.ts` | Update 0.0.16 — the three keys' looks (on end, tinted, the white and gold in auras); items on the floor; each chest's light by rarity |
| `engine/viewmodel/palm.ts` | Update 0.0.16 — the left hand palm up with the key you'd use on it (`ArmsRig.openHand` opens the fingers) |
| `screens/KeyPicker.tsx` | Update 0.0.16 — the key icons, and the row of keys at a chest with the picked one raised |
| `screens/HudSlots.tsx` | Update 0.0.17 — the weapon slots (bottom right) and the kill bonuses that are on (bottom left) |
| `engine/viewmodel/chestReach.ts` | Update 0.0.13 — both fists on a chest's lid while you kneel: the lid's edge carried from the world camera to the arms camera, nudged until the knuckles are on it |
| `engine/boss/shell.ts`, `portal.ts`, `woodGate.ts` | Update 0.0.15 — the boss room's sliding walls (dark masses with the kit's brick faces, updated in place), the portal (shaders, sparks, a light), the wooden gate (boxes) and the black dark behind it with the next floor's name. Drawn by `DungeonView` |
| `engine/boss/dragonView.ts`, `beamView.ts`, `aura.ts`, `bossTint.ts` | Update 0.0.18 — the Dragon's body (hovering, its clips by phase: the lunge held for the beam and fireballs, the strike held through the swoop, a spin for the tail), its beam (from its head bone to `Enemy.aim`); a boss's aura and its glow (shared with the Demon's view). `demonFx.ts` also draws the Dragon's swoop lane and its wing and tail reach |
| `sim/lab/labCommands.ts`, `world/dungeon/bossStart.ts` | Update 0.0.19 — the Lab: its panel's commands (`runLab`: enemies, items, weapons, chests in front of where you look; Clear; Heal) and where its boss rooms start you (just inside, facing the portal) |
| `screens/LabPanel.tsx`, `ui/theme/theme-19-lab.css` | Update 0.0.19 — the Lab's panel (F8, dev builds): enemies ×1/×3/×5, bosses here or in their room, items, weapons, a chest, Clear, Heal, Waves, God, Back |
| `engine/bodyMeasure.ts` | Update 0.0.19 — a model's body as drawn (skinned, in its idle pose): how the newer pack's enemies and the Dragon are sized |
| `engine/runLinks.ts` | Update 0.0.19 (out of run.ts) — what the Game tells a run: death and respawn callbacks, where levels come from |
| `engine/tongueView.ts`, `foeFeedback.ts` | Update 0.0.18 — the frog's tongue (one rope per slot, inside `EnemiesView`); what floor 2's and the Dragon's blows look like (rings, dust, sparks, shake), called by `CombatFeedback` for events it doesn't know |
| `engine/boss/demonView.ts`, `demonFx.ts` | Update 0.0.15 — the Demon's body (its clips by phase, fitted to its warnings), its aura, its warning glows, its frozen pose and white flicker when killed; the charge's lane, the leap's landing ring, the quake rings, the burst's flash. Drawn by `CombatScene` (`EnemiesView` skips the Demon) |
| `engine/boss/cinema.ts`, `bossShow.ts` | Update 0.0.15 — the show's shots (eased between, pure maths); the run's side of it: taking the view, holding you still, facing you to the boss at the end, the death's slow motion, the gate shot, the fade into the dark, and what the HUD shows (`screens/BossHud.tsx`) |
| `engine/weaponsView.ts` | M2 — weapons on the ground (turning above a glowing ring), the lab stand, weapons in flight (spinning), and the one in hand (given to the arms) |
| `engine/fx/burst.ts` | Pooled instanced pieces (sparks, chunks) |
| `engine/viewmodel/viewmodel.ts` | The arms' own scene and camera, sway, bob, landing dip, dash/slide poses, punch aim; draws over the world. M2: with a weapon, the left arm drops out of view and the right holds the sword |
| `engine/viewmodel/armsRig.ts`, `armsMath.ts`, `armsAnim.ts`, `guard.ts` | Loading and posing the arms (IK, bone aiming, ported from `cut_arms.py`); punch timelines; the approved guard. M2: the grip in the right fist, and the arm pose that holds a sword where a pose says |
| `engine/viewmodel/swordAnim.ts`, `swordPoses.ts` | Update 0.0.10 — the sword arm's moves (ready, the pierce's charge, forehand and backhand slashes, the pierce, the throw) and their key poses |
| `engine/hudStore.ts` | HUD state (dash, hit marker, hurt flash) and live debug numbers |
| `audio/audio.ts`, `synth.ts`, `moveSounds.ts`, `combatSounds.ts` | Buses; placeholder synth sounds; movement and combat sounds. Update 0.0.15 — `bossSounds.ts` (the Demon and its room). Update 0.0.18 — `foeSounds.ts` (floor 2's), `dragonSounds.ts` |
| `screens/*` | App shell (`App.tsx`: menu → intro → playing ⇄ paused; the menu's gate and camp views), main menu, the camp's settings screen (`CampMenu.tsx`), pause menu, the options both show (`Options.tsx`: General / Controls tabs), shared settings fields, the controls screen (`KeyBindings.tsx`, key names in `keyLabel.ts`), HUD (health bottom left), F1 tuning panel, F2 debug overlay |

### Asset tools (`game/tools/`)
| Tool | Does |
|---|---|
| `tools/blender/cut_arms.py` | Cuts first-person arms from a rigged Quaternius `.blend`, renders previews, exports a rest-pose `.glb`. Process: `MD/PIPELINE_CHARACTER_ARMS.md` |
| `tools/blender/build_menu_scene.py` | Builds the main menu's gate scene from the Modular Dungeon Pack, renders previews, exports `public/models/menu/gate.glb`. Process: `MD/PIPELINE_MENU_SCENE.md` |
| `tools/blender/build_camp_scene.py` | Builds the settings camp (nature pack trees, the dungeon pack's fire, low-poly logs and stones), renders previews, exports `public/models/menu/camp.glb` |
| `tools/blender/build_prison_scene.py` | Builds the prison corridor (dungeon pack cells, the roster's Quaternius characters posed and baked), renders previews, exports `public/models/menu/prison.glb` |
| `tools/blender/scene_kit.py` | Helpers the scene builders import: load and place pieces, markers, flat materials, posing a rig's bones and baking a pose, previews, export |
| `tools/blender/export_monster.py` | M2 — a monster with its animations to a `.glb`; prints when its weapon swing lands. Process: `MD/PIPELINE_ENEMIES_WEAPONS.md` |
| `tools/blender/export_weapon.py` | M2 — a held weapon to a `.glb`, its origin in the grip, blade up |
| `tools/blender/export_dungeon_kit.py` | Update 0.0.12 — the Modular Dungeon Pack (parts 1 and 2) pieces to `public/models/dungeon/kit.glb`. Process: `MD/PIPELINE_DUNGEON.md` |
| `tools/blender/export_items.py` | Update 0.0.13 — the shop's and chests' things (RPG pack items, the dungeon chest's base and hinged lid, a display tile) to `public/models/items/items.glb` |
| `tools/dungeon-shots.ts`, `tools/blender/render_dungeon.py` | Update 0.0.12 — a floor for a seed drawn by Blender with the real kit: an overview and eye-height views |
| `tools/view-shots.ts` (+ `view-shots-list.ts`), `tools/blender/render_view.py` | Update 0.0.10 — the first-person arms posed by the game's own code for a list of moments, rendered by Blender (no browser); prints each shot's wrist bend and where the sword's tip lands |
| `tools/boss-shots.ts` | Update 0.0.15 — the boss room for a seed with its walls at k, the gate shut or open, the Demon in its stance, from the show's own shots; drawn by `render_dungeon.py --day --demon public/models/enemies/demon.glb` |
| `tools/contact_sheet.py` | Tiles preview renders into one labelled sheet to compare variants (Python 3 + Pillow) |

## Contracts
- **Sim purity:** `sim/`, `world/`, `tuning/` and `state/` never import Rapier, React or the DOM. They may use Three.js math.
- **Collision:** the sim only calls `CollisionWorld` (`movePlayer`, `probeWall`, `canStand`). Tests use `tests/fakes/flatWorld.ts`; `tests/test-physics.ts` runs the real Rapier world headless.
- **Floating capsule:** the player's capsule floats `BODY.stepHeight` (0.4 m) above the feet. Sideways and upward moves go through Rapier's character controller. Downward moves first try the ground probe (a ball cast), which stands the feet on ground in reach: stepping up, landing, or following the ground down while grounded. With no ground in reach, the fall goes through the controller. Rapier's own autostep is off: it only climbed at more than ~5 cm a tick.
- **Walls** count only when they actually held the player back, so step risers and grazes don't kill speed.
- **Frame order:** mouse look (every frame, unscaled) → fixed ticks (input presses cleared after each tick) → events → camera → render. Time scale slows the sim and camera effects, never the mouse.
- **Events:** sim ticks push to `PlayerState.events`; the Game reads them once per frame, then clears them.
- **Tuning:** gameplay reads `GROUP.v.key`. Every new feel number is added as a knob.
- **Slide (Update 0.0.3):** a press arms the next slide (`slideArmed`) and letting go disarms it; a slide starts on the ground only when armed, so holding never chains slides and a press in the air starts the slide on landing. `slideCur` eases up to `slideSpeed` over `rampTime`; a slide ends at `maxTime`, except while there's no room to stand.
- **Wall run (Update 0.0.3):** starts in the air when `probeWall` finds a wall, forward is held, you head along the wall (within `facingAngle` of its line), you're not rising faster than `maxRise`, and the speed along the wall is at least `minSpeed`. Each tick it re-probes (the run ends at a corner, off the wall's end, on landing, when forward is let go, or at `maxTime`) and pushes `WALL_STICK` into the wall so contact holds. A wall-run jump keeps the speed along the wall, pushes away from it, and doesn't use wall jumps. The last wall can't be run again until you land (`lastWallSet`). The camera rolls by `wallRunTilt`: clockwise (negative roll) with the wall on the left.
- **Charged punch (Update 0.0.3):** fires only if right click was held the full `chargeTime` (`chargeReady`); otherwise `chargeCancel`. It always does `chargeDamage`/`chargeKnock`.
- **Combat tick order:** movement first, then combat, in the same tick. Punches land the instant they're thrown (no wind-up delay); the arms' animation is only visual.
- **Hit-stop** is a sim freeze: the Game counts it down on real time and runs no ticks while it lasts, and a tick that starts one ends that frame's ticks. Mouse look, camera shake and the arms' sway keep running; punch animations, targets, sparks and chunks freeze.
- **Targets are solid:** dummies and turrets get static Rapier capsules from the arena data. `rayDistance` (punch reach, orbs, turret sight) sees walls and targets but never the player. Rays from inside a target's own collider stop at once, so the turret's sight and shots start outside its head.
- **Every turret shot is warned:** a shot only fires after its full warning time (`test-combat.ts` checks this).
- **The arms** are drawn in their own scene with their own **vertical** FOV (68°) after a depth clear, so they never clip into walls, FOV kicks never stretch them, and wide screens frame them like 16:9. The posing math matches `tools/blender/cut_arms.py` (same `GUARD` table, in Blender axes there). The arms tilt up by the preview's 10° look-down, so the game frames the guard the same way as `fp.png`, and punches aim that much lower in the model so they still hit the crosshair. `test-arms.ts` poses the shipped `.glb`, checks each wrist lands on its target, and checks that both fists stay low on their own side of the screen (the centre stays clear).
- **The parry was removed** (the designer's call, Update 0.0.3). It returns later; the turret and orbs stay in the code for it.
- **Arms model:** `public/models/arms/<id>.glb` comes out of the pipeline with the fists baked closed. Bone names arrive without the dot (`UpperArmL`).
- **Health (M1 step 8):** `PlayerState` holds `hp`, `hurtTime` and `dead`. Everything that hurts the player goes through `damagePlayer`, which a dash (`invuln`), the hurt invincibility (`hurtTime`, set by each hit) and F4 (`LAB.god`) all stop; it pushes `'hurt'` (value = damage) and, at 0 HP, `'death'` once. `killPlayer` (falling out) ignores dashes. Blood heal: `stepCombat` heals `bloodHeal` × the punch's damage when it lands within `bloodRange`. The dead read no input. `LabRun` turns `'death'` into `DeathFlow`: the sim slows to `deathSlow` and the App fades to black over `deathFade`; then `restart()` puts you back with full health and the black clears.
- **Bindings (M1 step 9):** a binding is any `KeyboardEvent.code`, `Mouse0`..`Mouse4`, or `WheelUp` / `WheelDown`. The wheel has no held state: a notch is a press that also counts as held until the tick that reads it. The controls screen listens in the capture phase and stops the event, so menus, dev keys and the game never see the key being bound; Esc cancels.
- **One way to hit things (M2):** punches, sword swings and thrown weapons all find their target with `nearestTarget` and land with `landHit` (strike.ts): the hit event, then on a kill the 'kill' event, the kill hit-stop, and a grunt's drop roll. A new target kind is added there once.
- **The boss room (Update 0.0.15):** the way's last room is kind `'boss'`; its wooden gate is the last of `DungeonLevel.gates` (no bars: the dressing's gates are only the doors'), shut from the start, opened by `stepBoss` with the room's own gates. The show's beats (`introBeats`) are the one timeline: the sim spawns and raises the boss and starts the fight by them, the view slides the walls, opens the portal and moves the camera by them. `BossShow.locked` blanks your intents and the mouse during the show, the gate shot and the fade into the dark. The way down (`floorExit`) only fires once the gate is open. A boss's slot stays in use while its death show plays (`EnemyStats.boss`: its body doesn't fall; `doomDemon` places it and pushes 'bossBurst' once, marked by `Enemy.struck`).
- **`EnemyWorld` (Update 0.0.15)** carries the quake rings and the fight's RNG too (the Demon picks its moves with it); `CombatState` is one. Update 0.0.18 — and every enemy (`enemies`: the Dragon's beam burns them); the test fake's `worldFor` takes them as a last argument (none by default).
- **Each floor's boss (Update 0.0.18):** `bossOf(floor)` in kinds.ts (floor 1 the Demon, then the Dragon) decides `BossRun.kind`; the boss room, the show's name card (`BOSS_NAMES`), the boss bar (`bossIn`), the cinema's framing and the death show all read the kind. A boss's stance start is `BossRun.stance` (the Dragon's 'dragonScream'; `BossShow` shakes the cinema view through it).
- **Poison (Update 0.0.18):** `PlayerState.poison` (seconds left) and `poisonDps`; `poisonPlayer` doses, `updateHealth` ticks it (past the shield and the hurt invincibility). An orb with `poison` > 0 doses on hitting you. The HUD's `poisoned` shows the green edge.
- **The Lab (Update 0.0.19):** `Game.inLab` marks a Lab session (the main menu's Lab, or F9). Its levels: `labLevel()` and `bossRoomLevel(seed, floor)` (`Level.bossRoom`); in a Lab session `Levels.fresh` and `next` lead back to the Lab, and `again` rebuilds a boss room. `Run.waves` (the Feel Lab's knob waves) and `Run.hold` (no ticks while the panel is open) are set by the Game. Every level has a `Treasure` now (`emptyTreasure()` outside the dungeon), so floor items and Lab chests are drawn and stepped everywhere; `TreasureView` builds a chest body for each chest as it comes. The App keeps `labRef` beside `tuningRef`: freeing the mouse for the panel doesn't pause.
- **Shop prices (Update 0.0.18):** `priceOf(kind, floor)` in items.ts (each item's `GRADE`: 50 / 70 / 100, +15% a floor); each `Offer` carries its price, set when the shop is stocked.
- **Every enemy is one Enemy (Update 0.0.12):** kinds live in `kinds.ts`; `updateEnemies` runs them in slot order; hits, coins and drops go through `strike.ts` for every kind. Only grunts drop a weapon. Every attack warns for its full wind-up ('gruntWindup', 'spitterWindup', 'bruteWindup', and Update 0.0.13's 'leaperWindup', 'stingerWindup', 'wraithWindup').
- **Fliers (Update 0.0.13):** size class 'air' has its own grid (`AIR` band) and flow; `pos.y` is their height. What needs a clear line in the air (a dive, a cast) asks the `CollisionWorld` (`updateEnemies` gets it). Walls push a walker only on the ground (a leap carries it over); bodies at different heights don't push each other.
- **One damage factor (Update 0.0.13):** every hit you land goes through `landHit`, which multiplies it by the red rings (`damageFactor`). Run speed reads `PlayerState.speedMul`, set each tick from the blue rings.
- **E (Update 0.0.13):** the run asks the shop and chests first (`stepTreasure`); only if they don't use it does combat pick up a weapon.
- **Weapon slots (Update 0.0.17):** `CombatState.weapon` is always the weapon in the picked slot (`bag[slot]`; slot 0 is your fists, null). Anything that gives you a weapon goes through `giveWeapon`; a throw ends with `emptyHand`; `settleHand` (start of each combat tick) files a weapon put straight into your hand into a slot.
- **Max health (Update 0.0.17):** `maxHpOf(p)` is the base plus `PlayerState.hpBonus` (red rings, set each tick like `speedMul`); healing caps there. Run speed is the blue rings times the blue potion.
- **Frozen enemies (Update 0.0.17):** `Enemy.frozen` stops `beginTick` (no move, no time: an attack waits); only a melee hit with the snowflake on sets it (`resolvePunch`), never on a boss.
- **Keys and loot (Update 0.0.16):** a chest's loot is rolled when it opens, from its three rolls (made with the floor) and the key used (`rollLoot`), so it's seeded whatever the order. `Treasure.choosing` is the chest you're picking a key for; the run shows the palm and the picker from it. A fight room's waves are planned in `planFloor` (each room's own RNG), so its chest and its key are known up front; `CombatState.keyDrops` is set when you step into a room and `landHit` spends it on the first Yeti killed.
- **The dungeon's rooms are data (Update 0.0.12):** a new room is a text layout in `rooms.ts` (the middle two cells of each side clear two deep); `test-dungeon.ts` lays out 40 floors and checks every floor cell is reachable, every spawn free, and no pocket the grunts can't reach. The level's collision (assemble.ts) and its look (dressing.ts) come from the same grid; the gates are physics colliders switched on and off (`RapierWorld.setGates`).
- **A room's enemies walk its own grid (Update 0.0.12):** `roomLoop` swaps `CombatState.nav` and `flow` to the room's (built when the floor loads); the dungeon never builds a whole-floor grid.
- **Enemies never stay inside walls (Update 0.0.11):** anything that moves a floor-bound enemy (its run, knockback, other enemies, a spawn) ends with `pushOutOfWalls`; its steering comes from `chaseDir`, never a straight line through a wall; `wallBetween` stops a swing through one. `CombatState.nav` is built once in `createCombat`, `CombatState.flow` follows the player.
- **Every enemy attack is warned (M2):** a grunt's swing only lands after its full wind-up (`gruntWindup`), which starts with 'gruntWindup' (the growl, the glow, the swing animation). It turns only `gruntWindupTurn` rad/s meanwhile, so a dash round it dodges. `test-grunt.ts` checks no swing lands early.
- **Weapons (M2):** holding one, left click is `updateSlashes` and a full charge from `updateFists(…, armed)` is a 'pierce' that takes the weapon's numbers. Uses drop only on hits. At 0 the weapon is broken: the next attack press (or Q, any time) starts a throw: 'throwStart', `throwWindup` seconds in which nothing else attacks, then 'throw'. Drops and waves use `CombatState.rng` (`LAB_SEED`), reset with the lab.
- **The sword arm picks its own way (Update 0.0.10):** the rules push one 'slash'; `SwordAnim.slash()` swings a forehand from the right half of the slash path and a backhand from the left half, so the arm never jumps. 'chargeStart' while armed and 'pierce' bring the sword to ready. The throw's arm move lasts `throwWindup`, so the sword leaves the hand as 'throw' arrives.
- **Hit-stop freezes a swing on contact (Update 0.0.10):** hits land on the click, so `SwordAnim.update(gameDt, realDt)` runs a slash or pierce on real time until its contact point (a slash half-way along its path, a pierce at full stretch), then on game time.
- **Sword poses are where the sword is (Update 0.0.10):** `swordPoses.ts` gives the grip, blade, edge, grip tilt and elbow in the arms camera's view; `ArmsRig.gripPose` turns that into the right arm's pose and `holdMatrix` hangs the sword in the fist to match. Check a new pose with `tools/view-shots.ts` (renders, and the wrist bend it prints) and keep the wrist under ~40° in held poses (`test-arms.ts`).
- **Character select (Update 0.0.8):** the gate's intro ends in the prison view (`onIntroDone`), not the lab; the App is then in its `select` phase. `selectCell` moves the camera and opens or shuts bars; Play (only for a playable character) locks the mouse in its click, fades over `PRISON.fade`, then `startRun(id)` starts the lab and calls `onRunStart(locked)`. The prison's node names (`PRISON_NODES`, built from the roster's ids) are a contract with `build_prison_scene.py`; `test-prison.ts` checks them on the shipped `.glb`.
- **Menu views (Update 0.0.7):** in `menu` mode the Game draws the gate, the camp or the prison (`showMenuView`). The App swaps them under a fade to black (`CAMP_FADE` each way) and the camp's camera glides in (`CAMP_GLIDE`). Both scenes load before the menu is ready. The camp's node names (`CAMP_NODES`) are a contract with `build_camp_scene.py`; `test-camp.ts` checks them on the shipped `.glb`.
- **Main menu (Update 0.0.4):** the Game starts in `menu` mode and nothing simulates until `play`. Start locks the mouse inside the click or key press (browsers require one), then the gate opens (`intro`), ignoring the mouse; the App ignores lock changes until it's over. `MenuScene.update` returns `'fade'` (the App fades to black over `INTRO.fade`) and `'done'` (the Game restarts the lab, clears input, and the black clears). If the gate scene fails to load, Start goes straight to the lab. The scene's node names (`MENU_NODES`) are a contract with `build_menu_scene.py`; `test-menu.ts` checks them on the shipped `.glb`, plus the framing, that the doorway is open by the fade, and that the raised bars stay inside the wall (`INTRO.gateLift` ≤ ~3 m, the script's `GATE_LIFT`).
