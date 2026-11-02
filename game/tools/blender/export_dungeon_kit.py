# Update 0.0.12 — the dungeon kit: the Modular Dungeon Pack's pieces (parts 1 and 2, as the designer asked) the game
# builds floors from, one prototype each, named kit_<pack>_<piece>, each standing centred on its origin (Blender z up;
# the .glb is y up). The game lays them out on its 2 m grid (engine/dungeonView.ts); the packs' modules are 2 m.
#   blender --background --disable-autoexec --python tools/blender/export_dungeon_kit.py -- --part1 <folder> --part2 <folder>
#       --glb public/models/dungeon/kit.glb [--previews <folder>]
# Update 0.0.20 — part 2's stone walls, floor, doorway, portcullis and column pieces for floor 3. Part 2's wall pieces
# face +x; they're turned to face −y (the game's +z) as part 1's do.
# Update 0.2.4 — the Ultimate Nature Pack's desert pieces for floor 4 (palms, cacti, rocks: kit_n_<piece>; `--nature`).
#       ... --nature <Ultimate Nature Pack folder>
# Update 0.2.10 — and floor 5's, the Drowned Temple: weeping willows, lily pads, mossy rocks, a mossy stump and log.
# Update 0.2.11 — and floor 6's, the Sunken Grove: drowned trees and seaweed.
# Update 0.2.23 — and floor 2's, the Venom Garden: bushes, flowers, short grass and plants, birches and trees, a stump
# and a log, a mossy rock, and part 1's second cobweb.
# Update 0.2.24 — and floor 3's, the Bone Keep: the Ultimate RPG Pack's crystals, skulls and bone (kit_r_<piece>;
# `--rpg`), part 2's short candelabrum and candle.
#       ... --rpg <Ultimate RPG Pack folder>
# Update 0.3.11 — and floor 7's, Frozen Depths: the Nature pack's snow set (snowy pines, birches and trees, dead ones,
# a bush, rocks, a stump and a log).
# Update 0.3.14 — and floor 6's, Skull Cove: the Pirate Kit's pieces (kit_pf_<piece>; `--pirate`), the only textured
# ones: they share one 32 px palette (Atlas_Pirate.png), packed in each file; loaded, it's one image and one material
# again (not forty copies in the .glb).
#       ... --pirate <ASSETS/QUATERNIUS/FLOOR-6>
# Update 0.3.13 — and floor 8's, The Forge: part 1's small table (the workbenches) and swords on a wall mount, the RPG
# pack's gold ingots and ore. Shape keys come off every piece (the ore had some): the game draws the kit instanced, and
# an instanced piece with morph targets threw on every frame (floor 8 froze).
# Update 0.3.17 — and floor 8's again, the Moon: the Ultimate Space Kit's pieces (kit_m_<piece>; `--moon`): the moon
# base, rocks, alien plants, rovers, a crate, the planets for the sky. Like the Pirate Kit's, one 32 px palette
# (Atlas_Moon.png), one material.
#       ... --moon <ASSETS/QUATERNIUS/FLOOR-8>
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
         'Trapdoor_open', 'Banner_wall', 'Skull', 'Cobweb', 'Vase', 'Bucket', 'Chest', 'Pedestal', 'Woodfire', 'Cobweb2',
         # Update 0.3.13 — floor 8's.
         'Table_Small', 'Sword_WallMount']
PART2 = ['Column', 'Column_Broken2', 'Rock1', 'Rock2', 'Rock3', 'Bones', 'Bones2', 'Torch_wall', 'Candelabrum_tall', 'Carpet',
         'ModularStoneWall', 'ModularStoneWall_top', 'ModularStoneWall_EntranceTop', 'ModularFloor', 'Entrance', 'Bars', 'WallRocks',
         'ModularColumn_bottom', 'ModularColumn_middle', 'ModularColumn_top', 'Rock4', 'Rock5', 'Candelabrum', 'Candle']
# Update 0.2.4 — floor 4's desert: palms and cacti in their sand beds, desert rocks.
NATURE = ['PalmTree_1', 'PalmTree_3', 'Cactus_1', 'Cactus_3', 'CactusFlowers_2', 'Rock_2', 'Rock_5',
          # Update 0.2.10 — floor 5's.
          'Willow_1', 'Willow_3', 'Willow_Dead_2', 'Lilypad', 'Rock_Moss_1', 'Rock_Moss_4', 'Rock_Moss_6', 'TreeStump_Moss', 'WoodLog_Moss',
          # Update 0.2.11 — floor 6's: drowned trees, seaweed (the grass and a plant, stretched tall).
          'Willow_Dead_4', 'CommonTree_Dead_2', 'CommonTree_Dead_3', 'BirchTree_Dead_3', 'Grass', 'Grass_2', 'Plant_3',
          # Update 0.2.23 — floor 2's, the Venom Garden.
          'Bush_1', 'Bush_2', 'BushBerries_1', 'Flowers', 'Grass_Short', 'Plant_1', 'Plant_2', 'Plant_5', 'BirchTree_1',
          'BirchTree_2', 'CommonTree_1', 'CommonTree_2', 'TreeStump', 'WoodLog', 'Rock_Moss_2',
          # Update 0.3.11 — floor 7's, Frozen Depths.
          'PineTree_Snow_1', 'PineTree_Snow_3', 'PineTree_Snow_5', 'BirchTree_Snow_2', 'CommonTree_Snow_1', 'CommonTree_Dead_Snow_2',
          'BirchTree_Dead_Snow_3', 'Bush_Snow_1', 'Rock_Snow_1', 'Rock_Snow_3', 'Rock_Snow_6', 'TreeStump_Snow', 'WoodLog_Snow']
# Update 0.2.24 — floor 3's: crystal clusters (the Skull Wraiths blink between them), skulls and a bone.
RPG = ['Crystal1', 'Crystal2', 'Crystal3', 'Crystal4', 'Crystal5', 'Skull', 'Skull2', 'Bone',
       # Update 0.3.13 — floor 8's.
       'Gold_Ingots', 'Mineral']
# Update 0.3.14 — floor 6's, Skull Cove (the Pirate Kit).
PIRATE = ['Environment_Cliff1', 'Environment_Cliff2', 'Environment_Cliff3', 'Environment_Cliff4', 'Environment_Dock', 'Environment_Dock_Broken',
          'Environment_Dock_Pole', 'Environment_House1', 'Environment_House2', 'Environment_House3', 'Environment_LargeBones',
          'Environment_PalmTree_1', 'Environment_PalmTree_2', 'Environment_PalmTree_3', 'Environment_Rock_1', 'Environment_Rock_2',
          'Environment_Rock_3', 'Environment_Rock_4', 'Environment_Rock_5', 'Environment_Sawmill', 'Environment_Skulls', 'Prop_Anchor',
          'Prop_Barrel', 'Prop_Bomb', 'Prop_Bottle_1', 'Prop_Bottle_2', 'Prop_Bucket', 'Prop_Bucket_Fishes', 'Prop_Cannon', 'Prop_CannonBall',
          'Prop_Chest_Closed', 'Prop_Chest_Gold', 'Prop_Coins', 'Prop_Fish_Mackerel', 'Prop_Fish_Tuna', 'Prop_GoldBag', 'Prop_Skull',
          'Ship_Large', 'Ship_Small']
# Update 0.3.17 — floor 8's, the Moon (the Ultimate Space Kit: its environment, vehicles and items folders).
MOON = ['Base_Large', 'Building_L', 'Connector', 'GeodesicDome', 'House_Cylinder', 'House_Long', 'House_Single', 'House_Open',
        'House_Door', 'MetalSupport', 'Ramp', 'Stairs', 'Roof_Antenna', 'Roof_Radar', 'Roof_VentL', 'SolarPanel_Ground',
        'SolarPanel_Structure', 'Rock_1', 'Rock_2', 'Rock_3', 'Rock_4', 'Rock_Large_1', 'Rock_Large_2', 'Rock_Large_3',
        'Plant_1', 'Plant_2', 'Plant_3', 'Bush_1', 'Bush_2', 'Grass_2', 'Grass_3', 'Tree_Blob_1', 'Tree_Light_1',
        'Tree_Spiral_1', 'Tree_Swirl_1', 'Tree_Spikes_2'] + [f'Planet_{i}' for i in range(1, 12)]
MOON_VEHICLES = ['Rover_1', 'Rover_2', 'Rover_Round']
MOON_ITEMS = ['Pickup_Crate']
# Faced +x as they come: turned a quarter so they face −y.
TURN = {'ModularStoneWall', 'ModularStoneWall_top', 'ModularStoneWall_EntranceTop', 'Entrance', 'Bars', 'WallRocks'}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--part1', required=True)
    p.add_argument('--part2', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', default=None)
    p.add_argument('--nature', default=None)
    p.add_argument('--rpg', default=None)
    p.add_argument('--pirate', default=None)
    p.add_argument('--moon', default=None)
    return p.parse_args(argv)


def one_atlas(pieces, name='Atlas_Pirate'):
    """Update 0.3.14 — the Pirate Kit's pieces each bring their own copy of its palette (Atlas_Pirate.png.001…) and
    material (Atlas.001…): one of each for all of them. Its material is a Diffuse shader, which the glTF export doesn't
    read (the palette was left out): made a Principled one, the palette its base colour, sampled to the nearest pixel
    (a 32 px palette: its colours don't bleed). Update 0.3.17 — a pack at a time (`name`: the Space Kit's Atlas_Moon)."""
    image = None
    mat = None
    for o in pieces:
        for slot in o.material_slots:
            m = slot.material
            if not m or not m.name.startswith('Atlas') or not m.use_nodes:
                continue
            if mat is None:
                mat = m
                mat.name = name
                image = next((n.image for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
                if image:
                    image.name = name + '.png'
                nodes = mat.node_tree.nodes
                nodes.clear()
                out = nodes.new('ShaderNodeOutputMaterial')
                bsdf = nodes.new('ShaderNodeBsdfPrincipled')
                bsdf.inputs['Roughness'].default_value = 1
                tex = nodes.new('ShaderNodeTexImage')
                tex.image = image
                tex.interpolation = 'Closest'
                mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
                mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
            slot.material = mat
    for m in [m for m in bpy.data.materials if m.users == 0]:
        bpy.data.materials.remove(m)
    for i in [i for i in bpy.data.images if i.users == 0]:
        bpy.data.images.remove(i)


def main():
    args = parse_args()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    pieces = []
    packs = [('p1', args.part1, PART1), ('p2', args.part2, PART2)] + ([('n', args.nature, NATURE)] if args.nature else [])
    packs += [('r', args.rpg, RPG)] if args.rpg else []
    packs += [('pf', args.pirate, PIRATE)] if args.pirate else []
    if args.moon:
        packs += [('m', os.path.join(args.moon, 'environment'), MOON), ('m', os.path.join(args.moon, 'vehicles'), MOON_VEHICLES), ('m', os.path.join(args.moon, 'items'), MOON_ITEMS)]
    for prefix, folder, names in packs:
        protos = load_pieces(folder, names, {}, bake=True, recenter=names)
        for name, o in protos.items():
            if o.data.shape_keys:
                o.shape_key_clear()
            if prefix == 'p2' and name in TURN:
                o.data.transform(Matrix.Rotation(-math.pi / 2, 4, 'Z'))
            o.name = f'kit_{prefix}_{name}'
            o.data.name = o.name
            bpy.context.scene.collection.objects.link(o)
            pieces.append(o)
    one_atlas([o for o in pieces if o.name.startswith('kit_pf_')], 'Atlas_Pirate')
    one_atlas([o for o in pieces if o.name.startswith('kit_m_')], 'Atlas_Moon')
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
