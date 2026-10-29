# Pipeline: enemies and weapons

M2. Enemies come from Quaternius's **Ultimate Monsters** (in `ASSETS/QUATERNIUS/Ultimate Monsters/`, unzipped beside each zip: `big`, `blob`, `flying`); weapons from the **Ultimate RPG Pack**. Both are flat colour (the monsters through one small palette texture).

**Update 0.0.21 — the designer's sorting:** every monster already in the game lives in `Ultimate Monsters/used_monster/`, by role: `Boss/` (Demon, Dragon), `mini_boss/` (Yeti, Spider, BlueDemon), `flying/` (Armabee, Ghost, Wasp), `blobs/` (Orc, Wizard, Ninja, Slime, Frog, Snake), each with a copy of `Atlas_Monsters.png`. What's left in `big/`, `blob/`, `flying/` and `boss/` isn't used yet; a monster that comes into the game moves to `used_monster/`. (Same-named files can be different models: `blob/Orc` is the round blob Orc, the game's is the big one. The paths below are from when each was exported.)

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
- Each monster's frame where its blow lands (printed by `export_monster.py`) goes into `LOOKS` in `engine/enemyLooks.ts` (in `enemiesView.ts` before Update 0.1.19): Ninja Duck 44/30, Armabee Headbutt 9/30, Ghost Punch 12/30.
- **Update 0.1.19 — floor 3's:**
  ```
  blender --background --disable-autoexec --python tools/blender/export_monster.py -- --blend "<Ultimate Monsters>/used_monster/blobs/Skeleton.blend" --glb public/models/enemies/skeleton.glb --previews <folder> --attack Skeleton_Attack
  blender --background --disable-autoexec --python tools/blender/export_monster.py -- --blend "<Ultimate Monsters>/used_monster/blobs/Mushnub.blend" --glb public/models/enemies/mushnub.glb --previews <folder> --attack Bite_Front
  ```
  (Update 0.2.0 — `export_items.py` takes the teal ring, `item_tealRing` from the RPG pack's `Ring7`, in place of the purple ring.)
  Skeleton_Attack lands 18/30, Bite_Front 8/30; the Ninja mini boss is `ninja.glb` with Weapon (20/30). The Skeleton's clips are named `Skeleton_*`, its idle `Skeleton_Idle` (the exporter takes `Idle` or `*_Idle`; it also shows meshes hidden for renders in the previews); rebuilding plays `Skeleton_Spawn` (2.9 s, from a pile of bones to standing). `blob/Ninja.blend` is a round-head Ninja, not the game's.
- The dungeon chest's pieces are hidden from renders in its `.blend`; `export_items.py` shows them. Its lid keeps its origin on the hinge.

## Update 0.0.15 — the Demon (the first boss)
```
blender --background --disable-autoexec --python tools/blender/export_monster.py -- --blend "<Ultimate Monsters>/boss/Demon.blend" --glb public/models/enemies/demon.glb --previews <folder> --attack Weapon
```
- The `big` Demon (the one with the trident; the `flying` folder has another). The designer sorts enemies in `ASSETS`: a boss's `.blend` goes in `ASSETS/QUATERNIUS/Ultimate Monsters/boss/`, with a copy of `Atlas_Monsters.png` beside it (the monsters find their texture in their own folder). Clips: Death, Duck, HitReact, Idle, Jump, Jump_Idle, Jump_Land, No, Punch, Run, Walk, Wave, Weapon, Yes.
- A boss is drawn by its own view (`engine/boss/demonView.ts`, `DEMON_CLIPS`), not `enemiesView.ts`. Its trident thrust lands at 16/30 (Weapon). Its stance is Wave, the roar Punch (arms wide), stunned No, the charge Duck then Run, the leap Jump, Jump_Idle, Jump_Land.
- It's 2.9 m tall as it comes; the game scales it to `BOSS.demonHeight` (6.5 m).
- Rule tests parse it with its textures taken out (`tests/fakes/glb.ts`): Node can't decode images.

## Update 0.0.17 — more items
`export_items.py` (same command as Update 0.0.13) now also exports item_goldPlate (Armor_Golden), item_greenRing (Ring6), item_purpleRing (Ring5, gem purple), item_blueRing (now Ring4, gem blue), item_snowflake (Snowflake1, icy), item_goldIngots (Gold_Ingots) and item_bluePotion (Potion5_Filled, liquid and glass blue). A recolour gives the part a plain flat material: some pack colours live in shader nodes the glTF export drops (the liquids and the snowflake came out mint green).

## A held weapon: `game/tools/blender/export_weapon.py`

Update 0.1.5: a weapon whose head sticks out to one side (an axe) needs `--handle-center` (centre on the handle where it's held), and `--edge-out` (turn its blade to +x, the way the knuckles face). The Gold Axe and the Hammer:

```
blender --background --disable-autoexec --python tools/blender/export_weapon.py -- --blend "<Ultimate RPG Pack>/Axe_small_Golden.blend" --glb public/models/weapons/gold_axe.glb --length 0.75 --previews <folder> --handle-center --edge-out --thin 0.37,0.05,0.85
blender --background --disable-autoexec --python tools/blender/export_weapon.py -- --blend "<Ultimate RPG Pack>/Hammer_Double.blend" --glb public/models/weapons/hammer.glb --length 1.35 --previews <folder> --handle-center --thin 0.54,0.06,0.7
```

Update 0.1.6: `--thin TOP,RMAX,K` makes the handle (below TOP m, within RMAX m of its middle line: not the head) K times as thick across, so the wrapped grip is no thicker as held than the sword's (radius ≈ 21 mm), the size the fist is shaped round. Put the hand on the weapon's wrapped grip (its `LightWood` wraps): `test-weapon-arms.ts` checks both.

Update 0.1.9: the Dual Daggers' dagger, its serrated belly (the edge) to the knuckles. `--edge-out` now looks only at the top half (the head or blade), so the dagger's wide guard doesn't decide it. At 0.8 m (the designer: 1.6× the first 0.5) its handle and pommel are thinned to the sword's grip. `items.glb` has one too (`item_daggers`, 0.96 m), crossed with a second in the game:

```
blender --background --disable-autoexec --python tools/blender/export_weapon.py -- --blend "<Ultimate RPG Pack>/Dagger.blend" --glb public/models/weapons/dagger.glb --length 0.8 --previews <folder> --handle-center --edge-out --thin 0.113,0.04,0.75
```

Each weapon then gets its own moves (`engine/viewmodel/weaponMoves.ts`): look at them with `npx tsx tools/weapon-shots.ts <kind> <folder>` and `render_view.py`.
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
