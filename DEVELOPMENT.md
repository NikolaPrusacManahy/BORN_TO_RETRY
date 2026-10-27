# Ruinbreaker development

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
| `input/bindings.ts` | Actions, default keys (no Ctrl), rebinding, hydrate. Dev keys are reserved |
| `input/input.ts` | Key and mouse state. Presses last until a sim tick reads them (`clearPressed`) |
| `input/mouseSpike.ts` | Last Ward's filter for Chrome's impossible mouse jumps |
| `state/settings.ts` | Saved settings and hydrate; horizontal → vertical FOV |
| `state/devTools.ts` | Dev-only gating and the dev-key map |

### Tuning
| Module | Owns |
|---|---|
| `tuning/schema.ts` | Knobs (default, range, label, help) and live values `group.v.<key>` |
| `tuning/movement.ts`, `camera.ts`, `lab.ts` | The knob groups |
| `tuning/store.ts` | Group list, export/import, saving overrides |

### Movement (pure, `sim/player/`)
| Module | Owns |
|---|---|
| `step.ts` | One tick's order: timers → actions → velocity → collision → landing. Nothing else |
| `state.ts` | `PlayerState`, its events, `moveMode` |
| `intent.ts` | What the player asked for this tick |
| `ground.ts`, `air.ts` | Ground acceleration/stop/overspeed; air steering and gravity |
| `jump.ts` | Ground jumps, coyote time, jump buffer; dash-jump, slide-jump, slam bounce |
| `dash.ts`, `slide.ts`, `wallJump.ts`, `slam.ts`, `jumpPad.ts` | One move each |
| `body.ts` | The player's size and step height |
| `sim/collisionWorld.ts` | The collision interface the sim uses |

### Physics, world, engine, audio, screens
| Module | Owns |
|---|---|
| `physics/rapierWorld.ts` | The only Rapier import: arena colliders, the floating player capsule, ground probe, wall probe, stand check |
| `world/arena.ts` | Arena data types; `boxAt`, `rampZ` helpers |
| `world/arenas/feelLab.ts` | The M1 gray-box arena |
| `engine/Game.ts` | Wiring and the frame loop only |
| `engine/cameraRig.ts` | Eye height, landing spring, step smoothing, FOV kick, roll, shake |
| `engine/look.ts`, `shake.ts` | Mouse look; trauma shake |
| `engine/arenaView.ts`, `renderer.ts` | Meshes, grid texture, light, fog; the WebGL renderer |
| `engine/moveFeedback.ts` | Movement events → camera kicks and sounds |
| `engine/hudStore.ts` | HUD state and live debug numbers |
| `audio/audio.ts`, `synth.ts`, `moveSounds.ts` | Buses; placeholder synth sounds; movement sounds |
| `screens/*` | App shell, title card, pause menu, HUD, F1 tuning panel, F2 debug overlay |

## Contracts
- **Sim purity:** `sim/`, `world/`, `tuning/` and `state/` never import Rapier, React or the DOM. They may use Three.js math.
- **Collision:** the sim only calls `CollisionWorld` (`movePlayer`, `probeWall`, `canStand`). Tests use `tests/fakes/flatWorld.ts`; `tests/test-physics.ts` runs the real Rapier world headless.
- **Floating capsule:** the player's capsule floats `BODY.stepHeight` (0.4 m) above the feet. Sideways and upward moves go through Rapier's character controller. Downward moves first try the ground probe (a ball cast), which stands the feet on ground in reach: stepping up, landing, or following the ground down while grounded. With no ground in reach, the fall goes through the controller. Rapier's own autostep is off: it only climbed at more than ~5 cm a tick.
- **Walls** count only when they actually held the player back, so step risers and grazes don't kill speed.
- **Frame order:** mouse look (every frame, unscaled) → fixed ticks (input presses cleared after each tick) → events → camera → render. Time scale slows the sim and camera effects, never the mouse.
- **Events:** sim ticks push to `PlayerState.events`; the Game reads them once per frame, then clears them.
- **Tuning:** gameplay reads `GROUP.v.key`. Every new feel number is added as a knob.
