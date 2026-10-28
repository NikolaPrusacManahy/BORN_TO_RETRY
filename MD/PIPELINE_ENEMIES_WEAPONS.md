# Pipeline: enemies and weapons

M2. Enemies come from Quaternius's **Ultimate Monsters** (in `ASSETS/QUATERNIUS/Ultimate Monsters/`, unzipped beside each zip: `big`, `blob`, `flying`); weapons from the **Ultimate RPG Pack**. Both are flat colour (the monsters through one small palette texture).

## An enemy: `game/tools/blender/export_monster.py`
Exports one monster with its skinned mesh, anything on its rig (the Orc's club), every animation (Idle, Run, Walk, Weapon, Punch, HitReact, Death, Jump…) and its palette texture.

```
blender --background --disable-autoexec --python tools/blender/export_monster.py -- --blend "<Ultimate Monsters>/big/<zip folder>/Orc.blend" --glb public/models/enemies/orc.glb --previews <a scratch folder>
```

- It prints **when the "Weapon" swing lands** (the frame where the monster reaches furthest forward and down). The Orc's lands at frame 16 of 26 (30 fps). The game times the swing so that frame lands as the wind-up ends: `ORC_SWING_LANDS` in `game/src/engine/gruntsView.ts`. A new monster needs its own number.
- Previews: `Idle.png`, and `Weapon.png` at the landing frame.
- The game scales it to `ENEMIES.gruntHeight` (its hit capsule's height) and finds clips by name.

## Update 0.0.13 — the new monsters and items
```
blender --background --disable-autoexec --python tools/blender/export_monster.py -- --blend "<Ultimate Monsters>/big/…/Ninja.blend" --glb public/models/enemies/ninja.glb --previews <folder> --attack Duck
blender --background --disable-autoexec --python tools/blender/export_monster.py -- --blend "<Ultimate Monsters>/flying/…/Armabee.blend" --glb public/models/enemies/armabee.glb --previews <folder> --attack Headbutt
blender --background --disable-autoexec --python tools/blender/export_monster.py -- --blend "<Ultimate Monsters>/flying/…/Ghost.blend" --glb public/models/enemies/ghost.glb --previews <folder> --attack Punch
blender --background --disable-autoexec --python tools/blender/export_weapon.py -- --blend "<Ultimate RPG Pack>/Sword_Golden.blend" --glb public/models/weapons/gold_sword.glb --length 1.05 --previews <folder>
blender --background --disable-autoexec --python tools/blender/export_items.py -- --rpg "<Ultimate RPG Pack>" --dungeon "<Modular Dungeon Pack - part 1>" --glb public/models/items/items.glb --previews <folder>
```
- The flying monsters' meshes float above their origin; the game places every body by its lowest point.
- Each monster's frame where its blow lands (printed by `export_monster.py`) goes into `LOOKS` in `engine/enemiesView.ts`: Ninja Duck 44/30, Armabee Headbutt 9/30, Ghost Punch 12/30.
- The dungeon chest's pieces are hidden from renders in its `.blend`; `export_items.py` shows them. Its lid keeps its origin on the hinge.

## Update 0.0.15 — the Demon (the first boss)
```
blender --background --disable-autoexec --python tools/blender/export_monster.py -- --blend "<Ultimate Monsters>/big/…/Demon.blend" --glb public/models/enemies/demon.glb --previews <folder> --attack Weapon
```
- The `big` Demon (the one with the trident; the `flying` folder has another). Clips: Death, Duck, HitReact, Idle, Jump, Jump_Idle, Jump_Land, No, Punch, Run, Walk, Wave, Weapon, Yes.
- A boss is drawn by its own view (`engine/boss/demonView.ts`, `DEMON_CLIPS`), not `enemiesView.ts`. Its trident thrust lands at 16/30 (Weapon). Its stance is Wave, the roar Punch (arms wide), stunned No, the charge Duck then Run, the leap Jump, Jump_Idle, Jump_Land.
- It's 2.9 m tall as it comes; the game scales it to `BOSS.demonHeight` (6.5 m).
- Rule tests parse it with its textures taken out (`tests/fakes/glb.ts`): Node can't decode images.

## Update 0.0.17 — more items
`export_items.py` (same command as Update 0.0.13) now also exports item_goldPlate (Armor_Golden), item_greenRing (Ring6), item_purpleRing (Ring5, gem purple), item_blueRing (now Ring4, gem blue), item_snowflake (Snowflake1, icy), item_goldIngots (Gold_Ingots) and item_bluePotion (Potion5_Filled, liquid and glass blue). A recolour gives the part a plain flat material: some pack colours live in shader nodes the glTF export drops (the liquids and the snowflake came out mint green).

## A held weapon: `game/tools/blender/export_weapon.py`
Exports one weapon with its origin in the middle of the grip, the blade (or head) pointing up and the edge across x, scaled to a set length. The grip is found from the shape: past the pommel, up the narrow handle to where the guard (or the head) widens.

```
blender --background --disable-autoexec --python tools/blender/export_weapon.py -- --blend "<Ultimate RPG Pack>/Sword.blend" --glb public/models/weapons/sword.glb --length 1.05 --previews <a scratch folder>
```

- The arms hold it in the right fist (Update 0.0.10): its grip through the curled fingers, just under the guard (Arms → "Sword in the fist": how far up the handle from its middle), the blade out of the index finger's side, leaning towards the knuckles by each pose's grip tilt. The sword arm's poses (`game/src/engine/viewmodel/swordPoses.ts`) say where the sword is; the arm is posed to hold it there. `game/tests/test-arms.ts` checks the grip sits in the fingers, the wrist stays nearly straight, and the sword keeps clear of the crosshair when ready.
- A new weapon is a new kind in `game/src/sim/weapons/catalog.ts` (the compiler then asks for its stats and name everywhere), its numbers in `game/src/tuning/weapons.ts`, and its model through this script. A weapon held differently (an axe, a hammer) wants its own poses.

## Looking at the arms without a browser: `game/tools/view-shots.ts`
Poses the game's own arms code (the real models) at the moments listed in `game/tools/view-shots-list.ts` and writes the posed meshes; Blender renders them through the arms camera, a red dot on the crosshair.

```
npx tsx tools/view-shots.ts <out folder> [shot names…]
blender --background --python tools/blender/render_view.py -- --json <out folder>/shots.json --out <out folder> [--crop 0.6,0,1,0.45]
```

- Each shot prints how far the right wrist bends (keep held poses under ~40°), where the elbow and wrist are on screen, and where the sword's tip lands.
- `film-forehand-*` and `film-backhand-*` film a slash every 15 ms; `tools/contact_sheet.py` tiles frames into one image.
- `--crop` renders part of the frame larger (fractions: left, bottom, right, top), for the hand's grip.
- Flat light and no world behind: it shows poses, not the game's look.
