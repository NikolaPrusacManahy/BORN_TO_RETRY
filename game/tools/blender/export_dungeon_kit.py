# Update 0.0.12 — the dungeon kit: the Modular Dungeon Pack's pieces (parts 1 and 2, as the designer asked) the game
# builds floors from, one prototype each, named kit_<pack>_<piece>, each standing centred on its origin (Blender z up;
# the .glb is y up). The game lays them out on its 2 m grid (engine/dungeonView.ts); the packs' modules are 2 m.
#   blender --background --disable-autoexec --python tools/blender/export_dungeon_kit.py -- --part1 <folder> --part2 <folder>
#       --glb public/models/dungeon/kit.glb [--previews <folder>]
# Update 0.0.20 — part 2's stone walls, floor, doorway, portcullis and column pieces for floor 3. Part 2's wall pieces
# face +x; they're turned to face −y (the game's +z) as part 1's do.
import argparse
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import export_glb, load_pieces, setup_previews, shoot  # noqa: E402

# Part 1: brick dungeon walls and floors, doors, props. Part 2: rock columns, torches, rubble.
PART1 = ['Floor_Modular', 'Wall_Modular', 'WallCover_Modular', 'Arch', 'Arch_bars', 'Column', 'Crate', 'Barrel', 'Barrel2', 'Trap_spikes',
         'Trapdoor_open', 'Banner_wall', 'Skull', 'Cobweb', 'Vase', 'Bucket', 'Chest', 'Pedestal', 'Woodfire']
PART2 = ['Column', 'Column_Broken2', 'Rock1', 'Rock2', 'Rock3', 'Bones', 'Bones2', 'Torch_wall', 'Candelabrum_tall', 'Carpet',
         'ModularStoneWall', 'ModularStoneWall_top', 'ModularStoneWall_EntranceTop', 'ModularFloor', 'Entrance', 'Bars', 'WallRocks',
         'ModularColumn_bottom', 'ModularColumn_middle', 'ModularColumn_top', 'Rock4', 'Rock5']
# Faced +x as they come: turned a quarter so they face −y.
TURN = {'ModularStoneWall', 'ModularStoneWall_top', 'ModularStoneWall_EntranceTop', 'Entrance', 'Bars', 'WallRocks'}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--part1', required=True)
    p.add_argument('--part2', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', default=None)
    return p.parse_args(argv)


def main():
    args = parse_args()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    pieces = []
    for prefix, folder, names in (('p1', args.part1, PART1), ('p2', args.part2, PART2)):
        protos = load_pieces(folder, names, {}, bake=True, recenter=names)
        for name, o in protos.items():
            if prefix == 'p2' and name in TURN:
                o.data.transform(Matrix.Rotation(-math.pi / 2, 4, 'Z'))
            o.name = f'kit_{prefix}_{name}'
            o.data.name = o.name
            bpy.context.scene.collection.objects.link(o)
            pieces.append(o)
    for o in pieces:
        d = o.dimensions
        print(f'{o.name:28s} {d.x:5.2f} x {d.y:5.2f} x {d.z:5.2f}')
    if args.previews:
        # Spread out in rows for a look; the export puts them all back on the origin.
        for i, o in enumerate(pieces):
            o.location = Vector(((i % 6) * 3.0, (i // 6) * 3.0, 0))
        setup_previews('BLENDER_WORKBENCH', args.previews)
        bpy.context.scene.display.shading.light = 'STUDIO'
        bpy.context.scene.display.shading.color_type = 'MATERIAL'
        for m in bpy.data.materials:
            if m.use_nodes and 'Principled BSDF' in m.node_tree.nodes:
                m.diffuse_color = m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
        shoot('BLENDER_WORKBENCH', os.path.join(args.previews, 'kit_front.png'), Vector((7.5, -14, 7)), Vector((7.5, 6, 0.5)), size=(1600, 1000), vfov=50)
        shoot('BLENDER_WORKBENCH', os.path.join(args.previews, 'kit_back.png'), Vector((7.5, 26, 7)), Vector((7.5, 6, 0.5)), size=(1600, 1000), vfov=50)
        for o in pieces:
            o.location = Vector((0, 0, 0))
    export_glb(args.glb)


main()
