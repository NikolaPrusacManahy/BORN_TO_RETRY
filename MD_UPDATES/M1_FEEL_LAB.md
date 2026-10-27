# Milestone 1 — The Feel Lab

Status: in progress. Steps 1–5 are done (Update 0.0.1). Step 6 (the arms and fists) and the hit-feel part of step 8 are done too, with static dummies and an orb turret in place of the Grunt and Spitter (Update 0.0.3, the designer's call). Changes from this plan are listed in `HANDOVER.md`. Update 0.0.4 added the main menu (the designer's idea, not part of this plan).

## Goal
A gray-box arena where moving, punching and parrying feel great. Nothing else gets built until the designer says it does.

M1 also tests the browser: if Three.js + Rapier in the browser can't deliver the feel, we switch to Godot now, while only one small arena would need rebuilding.

## In scope
- Project scaffold and gates.
- Fixed-step game loop with smooth rendering and frame-time stats.
- Player movement: run, jump, dash, slide, wall jump, ground slam.
- Camera feel: raw mouse look, FOV kick, landing dip, strafe tilt, screen shake.
- Fists: jab combo, charged punch, quick punch / parry. First-person arms are gray boxes animated in code.
- Two simple enemies, as capsules: **Grunt** (melee) and **Spitter** (parryable orbs). Two instead of one, because the parry needs a projectile to hit back.
- Hit feedback: hit-stop, shake, knockback, flinch, hit markers, death bursts, placeholder synth sounds.
- Health with blood heal; HUD with health and dash charges.
- The tuning panel (F1) and debug overlay (F2).
- Pause menu, settings (sensitivity, FOV, volume) and key rebinding.

## Not in M1
Procedural generation, rooms and doors, the shop, money, the style meter, weapons and durability, bosses, characters, menus beyond pause and settings, Quaternius art, Electron.

---

## Reused from Last Ward (`../LAST_WARD/game`)
| Last Ward file | New home | Change |
|---|---|---|
| `src/engine/input.ts` | `src/input/input.ts` | Keep the mouse-spike filter and action lookup. Add the new actions. |
| `src/state/bindings.ts` | `src/input/bindings.ts` | New action list (section 4 of the design). No Ctrl defaults. |
| `src/state/settings.ts` | `src/state/settings.ts` | Same hydrate pattern: sensitivity, FOV, volumes, bindings. Drop co-op and map fields. |
| `src/state/devTools.ts` | `src/state/devTools.ts` | Dev-only gating for F1–F4 and `?debug`. |
| `src/world/rng.ts` | `src/core/rng.ts` | As is (mulberry32). |
| `src/ui/uiScale.ts` | `src/ui/uiScale.ts` | As is. |
| `src/screens/KeyBindings.tsx`, `SettingsPanel.tsx`, `PauseMenu.tsx` | `src/screens/` | Restyle to the new art direction. |
| `src/audio/audio.ts` (bus layout only) | `src/audio/` | Master → compressor, SFX and music buses, sample + synth fallback. Not the horror sounds. |
| `tests/harness.ts`, `tests/run-all.ts`, `verify.mjs`, `START_GAME.bat` | same places | As is, renamed. |
| `tools/convert-character.mjs` | `tools/` | Copied for M4 (Mixamo FBX → GLB). |

**Not reused:** Last Ward's player controller and collision are flat 2D grid movement with no jumping. Movement is new, built on Rapier. `Game.ts` is not copied (it's the 2,254-line file we're avoiding).

---

## Planned modules
```
src/core/       loop.ts (fixed step + interpolation), frameStats.ts, pool.ts, rng.ts
src/platform/   pointerLock.ts (raw input when supported), fullscreen.ts (+ keyboard lock), leaveGuard.ts
src/tuning/     schema.ts, movement.ts, camera.ts, fists.ts, feedback.ts, enemies.ts, store.ts (overrides, export/import)
src/sim/        player/{ground,air,jump,dash,slide,wallJump,slam}.ts, fists/{jab,charge,parry}.ts,
                health.ts, hitStop.ts, enemies/{grunt,spitter}.ts, projectiles.ts, collisionWorld.ts (interface)
src/physics/    rapierWorld.ts (implements CollisionWorld), characterBody.ts
src/world/      arenas/feelLab.ts (the gray-box layout as data)
src/engine/     Game.ts (thin wiring), renderer.ts, cameraRig.ts, shake.ts, viewmodel.ts (arms), arenaView.ts,
                enemyView.ts, fx/{hitSpark,deathBurst,telegraph}.ts, postfx.ts
src/audio/      audio.ts, synth.ts (placeholder hit/dash/parry/jump sounds)
src/screens/    App.tsx, GameView.tsx, Hud.tsx, TuningPanel.tsx, DebugOverlay.tsx, PauseMenu.tsx, SettingsPanel.tsx, KeyBindings.tsx
```

---

## Starting values
These are placeholders that the designer tunes in the lab. Every one is a slider in the tuning panel.

| Group | Value | Start |
|---|---|---|
| Loop | Sim rate | 120 Hz (max 8 steps per frame) |
| Movement | Run speed | 12 m/s |
| | Ground acceleration / friction | reach full speed in about 0.08 s |
| | Air control | 40% of ground |
| | Gravity | 30 m/s² |
| | Jump height | 2.0 m |
| | Coyote time / jump buffer | 0.10 s / 0.12 s |
| Dash | Speed / duration | 30 m/s / 0.18 s |
| | Charges / refill | 3 / 1 charge per 1.2 s |
| | Invincibility | the whole dash |
| Slide | Speed floor / slide-jump boost | 16 m/s / keeps 100% of speed |
| Wall jump | Count before landing / push | 3 / 9 m/s up, 10 m/s out |
| Slam | Fall speed / bounce window / bounce height | 45 m/s / 0.15 s / ×1.6 |
| Camera | FOV (horizontal, in settings) | 100° |
| | Dash FOV kick / landing dip / strafe tilt | +8° / 0.12 m / 1.5° |
| Fists | Jab damage / interval / combo window | 10 / 0.18 s / 0.40 s |
| | Third jab knockback | 8 m/s |
| | Reach / hit radius | 2.2 m / 0.6 m |
| | Charged punch | 25 → 60 damage, full after 0.6 s |
| | Quick punch cooldown / parry window | 0.35 s / projectile within 0.20 s of impact |
| | Parry | reflects at ×2 speed and ×2 damage, heals 10 |
| Feedback | Hit-stop: jab / heavy / parry / kill | 0 / 70 / 120 / 50 ms (the longest one wins; they don't add) |
| | Shake | trauma model: amount fades out, shake = amount² |
| Health | Max HP / blood heal | 100 / 20% of damage dealt within 5 m |
| Grunt | HP / speed / wind-up / damage | 40 / 7 m/s / 0.45 s / 15 |
| Spitter | HP / range kept / orb speed / fire every / wind-up / damage | 30 / 12–20 m / 9 m/s / 2.5 s / 0.5 s / 20 |

---

## The tuning panel (F1, dev build only)
- Opens over the game and frees the mouse; the game keeps running behind it.
- Sliders grouped as in the table above. Each shows its value, range and a one-line description.
- Changes apply at once and are saved in the browser, so they survive a refresh.
- **Export** copies all changed values as JSON. Paste it in the chat and Claude makes those the new defaults.
- **Import**, **Reset group** and **Reset all**.
- Extras: time scale (slow motion), invincibility, respawn enemies.
- If the browser opens its help page on F1, the panel moves to the ` key.

## The debug overlay (F2, dev build only)
- FPS, a frame-time graph for the last 2 seconds, and the worst frame.
- Sim steps per frame, player speed (m/s), movement state (ground / air / slide / wall / dash), dash charges.
- Whether raw mouse input is active.

## Dev keys
F1 tuning panel · F2 debug overlay · F3 respawn enemies · F4 invincibility.

---

## The gray-box arena
- About 60 × 60 m, with a 1 m grid on every surface so speed is easy to read.
- Tall walls for wall-jump chains, pillars to dash around, ramps and a raised ring for slide-jumps, a pit for slams, and one jump pad.
- Enemy spawn points around the edge; endless waves, and F3 respawns them.

---

## Build order
1. **Scaffold:** `game/` with Vite + React + TS (strict), three, Rapier; `START_GAME.bat`, `verify.mjs`, test harness, `.nvmrc`, `.gitignore` (root ignores `ASSETS/`).
2. **Loop and platform:** fixed step + interpolation, frame stats, pools; pointer lock with raw input, fullscreen with keyboard lock, leave-page guard.
3. **Tuning system:** schema, stores, F1 panel. From here on, every new feel number is added through it.
4. **Arena:** layout data → meshes and colliders.
5. **Movement and camera:** each move in its own module, Rapier collision behind `CollisionWorld`.
6. **Fists:** jab combo, charge, parry; first-person gray-box arms on springs.
7. **Enemies:** Grunt and Spitter with telegraphs, flinch, knockback, death bursts; pooled orbs.
8. **Feedback and health:** hit-stop, shake, hit markers, synth sounds, blood heal, HUD.
9. **Pause, settings, rebinding.**
10. **Docs:** `DEVELOPMENT.md` module map, `HANDOVER.md`.

The designer can try it after step 5 (movement only) and again after step 8.

---

## Tests (`game/tests/`)
| Test | Checks |
|---|---|
| `test-loop` | Steps per frame, the max-steps clamp, interpolation alpha |
| `test-movement` | Reaching run speed, air control, jump height matches tuning, coyote time, jump buffer |
| `test-dash` | Charges, refill, invincibility window |
| `test-slide` | Speed is kept, slide-jump carries momentum |
| `test-walljump` | Count limit, reset on landing |
| `test-slam` | Bounce window and height |
| `test-fists` | Combo timing and reset, third-hit knockback, charge scaling |
| `test-parry` | Parry window, ×2 reflect, heal |
| `test-hitstop` | Durations; the longest wins instead of adding |
| `test-health` | Blood heal radius and amount, max-HP clamp |
| `test-enemies` | No enemy attack lands before its telegraph; Grunt and Spitter decisions |
| `test-tuning` | Overrides are clamped to range, unknown keys ignored, export/import round trip |
| `test-bindings` | No Ctrl defaults, rebinding swaps instead of unbinding |
| `test-rng` | Same seed, same sequence |

---

## Browser checks recorded during M1
Each result goes in `HANDOVER.md`:
- Does Brave/Chrome give raw mouse input (`unadjustedMovement`)?
- In fullscreen, does keyboard lock capture Ctrl+W? If so, Ctrl can become a default.
- Can the page capture F1?
- Is frame time steady with 15 enemies, punching and particles? No hitch over twice the normal frame time.

## Done when
1. The designer plays it and says movement and punching feel great.
2. Tuned values are exported and baked into the defaults.
3. Frame time stays steady on the designer's PC at their screen's refresh rate.
4. `npm run verify` passes.
5. The browser-or-Godot decision is recorded in `HANDOVER.md`.

## What the designer does in M1
- Run `START_GAME.bat`, play, and tune with F1.
- Send feel notes in plain words ("the dash is too short", "punches feel weak") and paste exported values.
- Download the Quaternius packs into `ASSETS/QUATERNIUS/<pack>/` at any time. They aren't needed until M4.
