# Update 0.2.9 — the lobby's own pieces (the hall itself is the dungeon kit, public/models/dungeon/kit.glb): its
# furniture and decorations from the Modular Dungeon Pack (parts 1 and 2) and the Ultimate RPG Pack, one prototype each,
# named lobby_<pack>_<piece>, standing centred on its origin; and the roster's characters (ids as in
# src/sim/characters.ts), posed out of the T-pose and baked into static meshes named Char_<id>, feet on the origin,
# facing −y (the game's +z). The game lays them out (src/world/lobby/, engine/lobby/lobbyView.ts) and draws the locked
# characters as dark silhouettes. A character whose .blend isn't there yet stands as the Adventurer's shape.
#   blender --background --disable-autoexec --python tools/blender/build_lobby_kit.py -- \
#     --part1 "<Modular Dungeon Pack - part 1>" --part2 "<Modular Dungeon Pack - part2>" --rpg "<Ultimate RPG Pack>" \
#     --characters "<Humanoid Rig/Individual Characters/Blend>" --glb public/models/menu/lobby.glb [--previews <folder>]
# (Moved here from build_prison_scene.py, the old character select's corridor: the posing and baking of the roster.)
# Update 0.3.21 — the manor (MD/LOBBY_MANOR_PLAN.md): its stairs and their side covers, fences (the landings' rails),
# arched doors, columns, the big pedestal (the bestiary's plinths), barrels and chests; windows, an entrance, the tall
# candelabrum, more potions; the RPG pack's armour, weapons (the armoury), books open and closed (the library), crystals
# (the great hall's), gold, chests, crowns, coins (the treasury).
import argparse
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import bake_posed, export_glb, load_pieces, orient_bone, setup_previews, shoot  # noqa: E402

PART1 = ['Table_Big', 'Table_Small', 'Chair', 'Banner', 'Pedestal2', 'Statue_Horse', 'Sword_WallMount', 'Chest_Gold',
         'Coin_Pile', 'Bag_Coins', 'Bag_Standing', 'Decorative_Wall', 'Stairs_Modular', 'Stairs_SideCover',
         'Fence_Straight_Modular', 'Fence_End_Modular', 'Arch_Door', 'Column2', 'Pedestal', 'Barrel', 'Chest']
PART2 = ['Candelabrum', 'Candle', 'Book2', 'Book3', 'Book_Open', 'Potion2', 'Potion3', 'Window', 'Entrance2',
         'Candelabrum_tall', 'Potion4', 'Potion5', 'Potion6']
RPG = ['Chalice', 'ChickenLeg', 'Sword_big', 'Skull2', 'Crown', 'Scroll', 'Book1_Closed', 'Potion1_Filled', 'Heart',
       'Armor_Black', 'Armor_Golden', 'Armor_Leather', 'Armor_Metal', 'Armor_Metal2', 'Axe_Double', 'Axe_Double_Golden',
       'Hammer_Double', 'Bow_Wooden', 'Bow_Golden', 'Sword_big_Golden', 'Sword', 'Book2_Closed', 'Book3_Closed',
       'Book4_Closed', 'Book1_Open', 'Crystal1', 'Crystal2', 'Gold_Ingots', 'Chest_Closed', 'Chest_Ingots', 'Crown2',
       'Coin_Star', 'Parchment', 'Potion4_Filled', 'Potion6_Filled', 'Necklace1']
CHARACTERS = [('adventurer', 'Adventurer'), ('king', 'King'), ('suit', 'Suit'), ('swat', 'Swat')]
SILHOUETTE_OF = 'Adventurer'


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--part1', required=True)
    p.add_argument('--part2', required=True)
    p.add_argument('--rpg', required=True)
    p.add_argument('--characters', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', default=None)
    return p.parse_args(argv)


def pose_standing(arm):
    """Out of the T-pose: arms hanging a little away from the body, elbows soft, palms in."""
    for side, s in (('L', 1), ('R', -1)):
        orient_bone(arm, f'UpperArm.{side}', (0.2 * s, 0.03, -1), (s, 0, 0))
        orient_bone(arm, f'LowerArm.{side}', (0.12 * s, -0.16, -1), (s, 0.1, 0))
        orient_bone(arm, f'Hand.{side}', (0.1 * s, -0.12, -1), (s, 0.1, 0))


def load_character(folder, cid, file):
    """The character from `file`.blend, posed and baked into one mesh named Char_<cid>: feet centred on the origin,
    facing −y. The Adventurer's shape if the file isn't there."""
    path = os.path.join(os.path.abspath(folder), file + '.blend')
    if not os.path.exists(path):
        print(f'{cid}: {file}.blend not found, the Adventurer\'s shape stands in')
        path = os.path.join(os.path.abspath(folder), SILHOUETTE_OF + '.blend')
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        dst.objects = [n for n in src.objects]
    objs = [o for o in dst.objects if o is not None]
    for o in objs:
        bpy.context.scene.collection.objects.link(o)
    pose_standing(next(o for o in objs if o.type == 'ARMATURE'))
    body = bake_posed(objs, f'Char_{cid}')
    body.data.name = body.name
    vs = [v.co for v in body.data.vertices]
    cx = (min(v.x for v in vs) + max(v.x for v in vs)) / 2
    cy = (min(v.y for v in vs) + max(v.y for v in vs)) / 2
    body.data.transform(Matrix.Translation((-cx, -cy, -min(v.z for v in vs))))
    d = body.dimensions
    print(f'{body.name:28s} {d.x:5.2f} x {d.y:5.2f} x {d.z:5.2f}')
    return body


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    pieces = []
    for prefix, folder, names in (('p1', args.part1, PART1), ('p2', args.part2, PART2), ('r', args.rpg, RPG)):
        for name, o in load_pieces(folder, names, {}, bake=True, recenter=names).items():
            o.name = f'lobby_{prefix}_{name}'
            o.data.name = o.name
            bpy.context.scene.collection.objects.link(o)
            d = o.dimensions
            print(f'{o.name:28s} {d.x:5.2f} x {d.y:5.2f} x {d.z:5.2f}')
            pieces.append(o)
    pieces += [load_character(args.characters, cid, file) for cid, file in CHARACTERS]
    if args.previews:
        # Spread out in rows for a look; the export puts them all back on the origin.
        for i, o in enumerate(pieces):
            o.location = Vector(((i % 8) * 3.0, (i // 8) * 3.0, 0))
        setup_previews('BLENDER_WORKBENCH', args.previews)
        scene = bpy.context.scene
        scene.display.shading.light = 'STUDIO'
        scene.display.shading.color_type = 'MATERIAL'
        for m in bpy.data.materials:
            if m.use_nodes and 'Principled BSDF' in m.node_tree.nodes:
                m.diffuse_color = m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
        shoot('BLENDER_WORKBENCH', os.path.join(args.previews, 'lobby_kit.png'), Vector((10.5, -16, 9)), Vector((10.5, 5, 0.5)), size=(1600, 1000), vfov=50)
        for o in pieces:
            o.location = Vector((0, 0, 0))
    # Some source meshes carry broken bits the exporter warns about: repair them first, and say which.
    for me in bpy.data.meshes:
        if me.users and me.validate(verbose=False):
            print(f'repaired mesh {me.name}')
    export_glb(args.glb)


main()
