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
| `tuning/store.ts` | Group list, export/import, saving overrides |

### Enemies and weapons (pure) — M2
| Module | Owns |
|---|---|
| `sim/enemies/grunt.ts` | The Grunt: chase, the warned wind-up, the swing (in reach and in front only), flinch, death; grunts pushing apart; the player pushed out of them |
| `sim/enemies/waves.ts` | The lab's waves of grunts (seeded RNG, away from the player) |
| `sim/weapons/catalog.ts` | Weapon kinds, their names and stats (from `tuning/weapons.ts`) |
| `sim/weapons/weapons.ts` | The held weapon, weapons on the ground (stands, drops), in flight; pick up, swap, drop, throw |
| `sim/weapons/swing.ts` | The held weapon's slashes (one 'slash' event; the arms pick the way); the charge becomes its pierce; what a hit costs |
| `sim/weapons/thrown.ts` | Thrown weapons flying, hitting the first target or a wall, and breaking |
| `sim/combat/strike.ts` | What a sweep hits (the nearest dummy, turret or grunt) and landing a hit: kills, the kill hit-stop, drops |

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
| `health.ts` | M1 step 8 — damage (and what stops it), healing, blood heal, death |
| `hazards.ts` | M1 step 8 — spike strips (arena boxes of kind `hazard`): hurt and pop you up |
| `body.ts` | The player's size and step height |
| `sim/collisionWorld.ts` | The collision interface the sim uses |

### Combat (pure, `sim/combat/`) — M1 step 6
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
| `engine/labRun.ts` | M1 step 8 — the lab's play loop: player, fists, targets, camera, arms; ticks, events, render, death and respawn (split out of `Game.ts`) |
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
| `engine/gruntsView.ts` | M2 — the grunts: one animated Orc per slot, clips by phase (the swing timed to land as the wind-up ends), the wind-up's red glow, hit flash |
| `engine/weaponsView.ts` | M2 — weapons on the ground (turning above a glowing ring), the lab stand, weapons in flight (spinning), and the one in hand (given to the arms) |
| `engine/fx/burst.ts` | Pooled instanced pieces (sparks, chunks) |
| `engine/viewmodel/viewmodel.ts` | The arms' own scene and camera, sway, bob, landing dip, dash/slide poses, punch aim; draws over the world. M2: with a weapon, the left arm drops out of view and the right holds the sword |
| `engine/viewmodel/armsRig.ts`, `armsMath.ts`, `armsAnim.ts`, `guard.ts` | Loading and posing the arms (IK, bone aiming, ported from `cut_arms.py`); punch timelines; the approved guard. M2: the grip in the right fist, and the arm pose that holds a sword where a pose says |
| `engine/viewmodel/swordAnim.ts`, `swordPoses.ts` | Update 0.0.10 — the sword arm's moves (ready, the pierce's charge, forehand and backhand slashes, the pierce, the throw) and their key poses |
| `engine/hudStore.ts` | HUD state (dash, hit marker, hurt flash) and live debug numbers |
| `audio/audio.ts`, `synth.ts`, `moveSounds.ts`, `combatSounds.ts` | Buses; placeholder synth sounds; movement and combat sounds |
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
| `tools/view-shots.ts` (+ `view-shots-list.ts`), `tools/blender/render_view.py` | Update 0.0.10 — the first-person arms posed by the game's own code for a list of moments, rendered by Blender (no browser); prints each shot's wrist bend and where the sword's tip lands |
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
- **Every enemy attack is warned (M2):** a grunt's swing only lands after its full wind-up (`gruntWindup`), which starts with 'gruntWindup' (the growl, the glow, the swing animation). It turns only `gruntWindupTurn` rad/s meanwhile, so a dash round it dodges. `test-grunt.ts` checks no swing lands early.
- **Weapons (M2):** holding one, left click is `updateSlashes` and a full charge from `updateFists(…, armed)` is a 'pierce' that takes the weapon's numbers. Uses drop only on hits. At 0 the weapon is broken: the next attack press (or Q, any time) starts a throw: 'throwStart', `throwWindup` seconds in which nothing else attacks, then 'throw'. Drops and waves use `CombatState.rng` (`LAB_SEED`), reset with the lab.
- **The sword arm picks its own way (Update 0.0.10):** the rules push one 'slash'; `SwordAnim.slash()` swings a forehand from the right half of the slash path and a backhand from the left half, so the arm never jumps. 'chargeStart' while armed and 'pierce' bring the sword to ready. The throw's arm move lasts `throwWindup`, so the sword leaves the hand as 'throw' arrives.
- **Hit-stop freezes a swing on contact (Update 0.0.10):** hits land on the click, so `SwordAnim.update(gameDt, realDt)` runs a slash or pierce on real time until its contact point (a slash half-way along its path, a pierce at full stretch), then on game time.
- **Sword poses are where the sword is (Update 0.0.10):** `swordPoses.ts` gives the grip, blade, edge, grip tilt and elbow in the arms camera's view; `ArmsRig.gripPose` turns that into the right arm's pose and `holdMatrix` hangs the sword in the fist to match. Check a new pose with `tools/view-shots.ts` (renders, and the wrist bend it prints) and keep the wrist under ~40° in held poses (`test-arms.ts`).
- **Character select (Update 0.0.8):** the gate's intro ends in the prison view (`onIntroDone`), not the lab; the App is then in its `select` phase. `selectCell` moves the camera and opens or shuts bars; Play (only for a playable character) locks the mouse in its click, fades over `PRISON.fade`, then `startRun(id)` starts the lab and calls `onRunStart(locked)`. The prison's node names (`PRISON_NODES`, built from the roster's ids) are a contract with `build_prison_scene.py`; `test-prison.ts` checks them on the shipped `.glb`.
- **Menu views (Update 0.0.7):** in `menu` mode the Game draws the gate, the camp or the prison (`showMenuView`). The App swaps them under a fade to black (`CAMP_FADE` each way) and the camp's camera glides in (`CAMP_GLIDE`). Both scenes load before the menu is ready. The camp's node names (`CAMP_NODES`) are a contract with `build_camp_scene.py`; `test-camp.ts` checks them on the shipped `.glb`.
- **Main menu (Update 0.0.4):** the Game starts in `menu` mode and nothing simulates until `play`. Start locks the mouse inside the click or key press (browsers require one), then the gate opens (`intro`), ignoring the mouse; the App ignores lock changes until it's over. `MenuScene.update` returns `'fade'` (the App fades to black over `INTRO.fade`) and `'done'` (the Game restarts the lab, clears input, and the black clears). If the gate scene fails to load, Start goes straight to the lab. The scene's node names (`MENU_NODES`) are a contract with `build_menu_scene.py`; `test-menu.ts` checks them on the shipped `.glb`, plus the framing, that the doorway is open by the fade, and that the raised bars stay inside the wall (`INTRO.gateLift` ≤ ~3 m, the script's `GATE_LIFT`).
