# Pipeline: the menu's scenes

Two scenes, each built by its own Blender script with shared helpers (`game/tools/blender/scene_kit.py`): the main menu's gate (below) and the settings camp (at the end).

## The gate (Update 0.0.4)
The main menu is a 3D scene built in Blender from Quaternius's **Modular Dungeon Pack** and **Ultimate Nature Pack** (both CC0, both flat colour) by a script, then loaded by the game as one `.glb`.

## What the script builds
`game/tools/blender/build_menu_scene.py`:
- A lower floor, a 4 m staircase up to a landing, and a sandstone gate wall with an arch and a portcullis (`Arch_bars`).
- Stacked columns, wall torches, banners, cobwebs, skulls and loose bricks.
- **The dressing** (Update 0.0.5, `dress()`): two horse statues at the foot of the stairs, crates, barrels and a campfire on the right, a dead birch at each side. Dressing pieces load with their file's transforms baked in and multi-part pieces joined (`join_baked`); the statue is also recentred (`RECENTER`).
  - The low shot never sees the yard's floor (its bottom edge crosses the retaining wall about 0.9 m up), so only tall things read. Bushes and green trees behind the wall only showed as lumps.
  - The left stays calm behind the menu's buttons; the right is warm.
  - **Trees grow from earth, never paving** (the designer): `TREE_BEDS` leaves a floor tile out for a bed of earth with loose stones round it, and the tree stands in it.
- A glowing panel behind the bars (`GateGlow`).
- **Markers** (empties) the game reads. Their names are a contract with `src/engine/menu/menuScene.ts` (`MENU_NODES`):

| Node | Used for |
|---|---|
| `Portcullis` | Raised when Start is pressed |
| `Torch_L`, `Torch_R`, `Campfire` | Flickering flame lights |
| `GateGlow` | The light through the gate |
| `Cam_Menu`, `Cam_Menu_Look` | The low menu shot (camera, look-at point), vertical FOV `MENU_VFOV` (50°) |

- **Previews:** Eevee renders of the menu shot at 50°, 1600 × 800: `Cam_Menu.png` (gate shut) and `Cam_Menu_open.png` (raised by `GATE_LIFT`, as Start leaves it), plus close-ups of the tree beds (`Detail_TreeBed_R.png`, `_L.png`). The preview lights only exist in Blender; the game lights the scene itself.
- **`GATE_LIFT` (2.6 m)** must match `INTRO.gateLift` in the game. The wall above the arch hides at most ~3 m of bars; more and they poke out of its top.

## Run (from `game/`)
```
blender --background --disable-autoexec --python tools/blender/build_menu_scene.py -- --kit "../ASSETS/QUATERNIUS/Modular Dungeon Pack" --nature "../ASSETS/QUATERNIUS/Ultimate Nature Pack" --glb public/models/menu/gate.glb --previews <a scratch folder>
```

## Axes
Blender is z up and the scene's front faces −y. glTF (and the game) is y up: Blender (x, y, z) becomes (x, z, −y), so in the game the camera stands at +z looking towards −z.

## Changing the scene
1. Edit the layout or a marker in `build()` (the constants `LANDING`, `WALL_Y`, `HALF_WIDTH` at the top drive most of it).
2. Re-run the script and look at the previews. The menu shot should keep the gate near the middle, with sky across the top quarter for the logo.
3. Run `npm run verify`. `tests/test-menu.ts` parses the shipped `.glb` and checks the nodes, the framing, that every tree stands in earth and every prop on the ground, that the doorway is open by the fade to black, and that the raised bars stay inside the wall.
4. What Start plays (the gate's timing, the fade) lives in `src/engine/menu/introTimeline.ts` (`INTRO`), not in Blender.

## The settings camp (Update 0.0.7)
`game/tools/blender/build_camp_scene.py` builds a forest clearing at night: the forest floor and a dirt clearing (`Ground`, `Clearing`), the dungeon pack's `Woodfire` ringed by low-poly stones, three low-poly logs (one under the camera), and two rings of nature-pack trees with a few bushes. Trees and bushes are placed from a fixed seed (`SEED`), so every export is the same, and keep apart (`TREE_GAP`, `BUSH_GAP`) so nothing grows into anything.

| Node | Used for |
|---|---|
| `Campfire` | The fire's flickering light, and where the embers rise |
| `Cam_Camp`, `Cam_Camp_Look` | The settings shot: sat on a log, the fire on the left, room on the right for the panel (`CAMP_VFOV`, 50°) |
| `Cam_Camp_From` | Where the camera glides in from |
| `Ground` | The forest floor |

Run (from `game/`):
```
blender --background --disable-autoexec --python tools/blender/build_camp_scene.py -- --kit "../ASSETS/QUATERNIUS/Modular Dungeon Pack" --nature "../ASSETS/QUATERNIUS/Ultimate Nature Pack" --glb public/models/menu/camp.glb --previews <a scratch folder>
```
Previews: `Cam_Camp.png` (the shot), `Cam_Camp_From.png` (the glide's start) and `Overview.png`. Then `npm run verify`: `tests/test-camp.ts` checks the nodes, that everything stands on the ground with nothing grown together, the fire in sight on the left, and the glide.
