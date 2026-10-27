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

## A held weapon: `game/tools/blender/export_weapon.py`
Exports one weapon with its origin in the middle of the grip, the blade (or head) pointing up and the edge across x, scaled to a set length. The grip is found from the shape: past the pommel, up the narrow handle to where the guard (or the head) widens.

```
blender --background --disable-autoexec --python tools/blender/export_weapon.py -- --blend "<Ultimate RPG Pack>/Sword.blend" --glb public/models/weapons/sword.glb --length 1.05 --previews <a scratch folder>
```

- The arms hold it in the right fist: the blade out of the thumb side, leaning forward and right by the Arms tab's weapon knobs. `game/tests/test-arms.ts` checks the held sword shows and keeps clear of the crosshair.
- A new weapon is a new kind in `game/src/sim/weapons/catalog.ts` (the compiler then asks for its stats and name everywhere), its numbers in `game/src/tuning/weapons.ts`, and its model through this script.
