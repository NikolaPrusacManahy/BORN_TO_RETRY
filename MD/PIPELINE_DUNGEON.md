# Pipeline: the dungeon

Update 0.0.12. The dungeon floors are built from the **Modular Dungeon Pack** parts 1 and 2 (`ASSETS/QUATERNIUS/Modular Dungeon Pack - part 1`, `… - part2`): flat colour, a 2 m module (floor tiles 2 × 2, wall pieces 2 m wide and 2 m tall).

## The kit: `game/tools/blender/export_dungeon_kit.py`
Exports the pieces the game uses into one `.glb`, each centred on its origin, standing on it, named `kit_p1_<piece>` or `kit_p2_<piece>`.

```
blender --background --disable-autoexec --python tools/blender/export_dungeon_kit.py -- --part1 "<…part 1>" --part2 "<…part2>" --glb public/models/dungeon/kit.glb --previews <a scratch folder>
```

- The list of pieces is at the top of the script. A new piece: add it there, then use it in `game/src/world/dungeon/dressing.ts`. `test-dungeon.ts` checks every piece the dressing uses is in the kit.
- Fronts face −y in Blender (+z in the game). The arch's opening is 2.3 m × 3.1 m as it comes; the game stretches it (1.75 × 1.2) to the 4 m doorway.

## A room: `game/src/world/dungeon/rooms.ts`
Drawn from above, one character per 2 m cell, only the inside (the walls round it and the doors are added). North (the top row) is −z.

| | |
|---|---|
| `.` floor | `#` wall (6 m) |
| `C` column (5 m) | `b` low cover, crates (1.3 m) |
| `B` high cover, broken column (2.9 m) | `p` ledge (1 m) |
| `P` high ledge (2.5 m) | `^` spikes |
| `J` jump pad | `?` low cover or floor, chosen per run |
| `E` where enemies may appear | `X` the way down (exit room) |
| `T` where a chest may stand (against a wall, floor in front) | `S` a shop's display tile |

Update 0.0.13: fight rooms are drawn as their **top-left quarter** in `fightRooms.ts` (mirrored right and down): the quarter's last column (rows 0–1) and last row (columns 0–1) stay clear for the doors. At most `MAX_ROOM` (36) cells a side. Rules: even width and height; the middle two cells of every side clear (`.` or `E`) two deep; at least 6 `E`; at least one `T`. Run `npm run verify:quick`: `test-dungeon.ts` lays out 40 floors and says if a room has a cell nobody can reach, a stuck spawn point or a pocket the grunts can't get into.

## Looking at a floor without a browser
```
npx tsx tools/dungeon-shots.ts <out folder> [seed] [floor]
blender --background --python tools/blender/render_dungeon.py -- --json <out folder>/dungeon.json --kit public/models/dungeon/kit.glb --out <out folder>
```
An overview from above (`overview.png`) and eye-height views from the start and the first fight room, with the gates' bars down. Flat light: it shows the layout and the pieces, not the game's lighting. Update 0.0.13 — add `--day` for Blender's sun and sky in the game's daylight colours and strengths (EEVEE): a rough stand-in for how bright the game's daylight is.
