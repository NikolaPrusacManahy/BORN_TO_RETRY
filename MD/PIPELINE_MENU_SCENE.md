# Pipeline: the main menu's gate scene

Update 0.0.4. The main menu is a 3D scene built in Blender from Quaternius's **Modular Dungeon Pack** (CC0) by a script, then loaded by the game as one `.glb`.

## What the script builds
`game/tools/blender/build_menu_scene.py`:
- A lower floor, a 4 m staircase up to a landing, and a sandstone gate wall with an arch and a portcullis (`Arch_bars`).
- Stacked columns, wall torches, banners, cobwebs, skulls and loose bricks.
- A glowing panel behind the bars (`GateGlow`).
- **Markers** (empties) the game reads. Their names are a contract with `src/engine/menu/menuScene.ts` (`MENU_NODES`):

| Node | Used for |
|---|---|
| `Portcullis` | Raised when Start is pressed |
| `Torch_L`, `Torch_R` | Flickering torch lights |
| `GateGlow` | The light through the gate |
| `Cam_Menu`, `Cam_Menu_Look` | The low menu shot (camera, look-at point), vertical FOV `MENU_VFOV` (50°) |

- **Previews:** Eevee renders of the menu shot at 50°, 1600 × 800: `Cam_Menu.png` (gate shut) and `Cam_Menu_open.png` (raised by `GATE_LIFT`, as Start leaves it). The preview lights only exist in Blender; the game lights the scene itself.
- **`GATE_LIFT` (2.6 m)** must match `INTRO.gateLift` in the game. The wall above the arch hides at most ~3 m of bars; more and they poke out of its top.

## Run (from `game/`)
```
blender --background --disable-autoexec --python tools/blender/build_menu_scene.py -- --kit "../ASSETS/QUATERNIUS/Modular Dungeon Pack" --glb public/models/menu/gate.glb --previews <a scratch folder>
```

## Axes
Blender is z up and the scene's front faces −y. glTF (and the game) is y up: Blender (x, y, z) becomes (x, z, −y), so in the game the camera stands at +z looking towards −z.

## Changing the scene
1. Edit the layout or a marker in `build()` (the constants `LANDING`, `WALL_Y`, `HALF_WIDTH` at the top drive most of it).
2. Re-run the script and look at the previews. The menu shot should keep the gate near the middle, with sky across the top quarter for the logo.
3. Run `npm run verify`. `tests/test-menu.ts` parses the shipped `.glb` and checks the nodes, the framing, that the doorway is open by the fade to black, and that the raised bars stay inside the wall.
4. What Start plays (the gate's timing, the fade) lives in `src/engine/menu/introTimeline.ts` (`INTRO`), not in Blender.
