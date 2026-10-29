# Born To Retry — Update 0.0.13: the shop's and the chests' things (the designer: a heart, a silver armour plate, a gold
# sword, a ring with a red gem, a ring with blue gems, a plain key; chests opened with a key) to one .glb. From the
# Ultimate RPG Pack (Heart, Armor_Metal2, Sword_Golden, Ring3, Ring5, Key1) and the Modular Dungeon Pack part 1 (Chest:
# its base and its lid, the lid's origin on its hinge so the game can swing it open). Each item is centred on its
# origin and scaled to a set size; a display tile for the shop floor is made here (a marble slab with a gold rim).
# Update 0.0.17 — the gold armour (Armor_Golden), four rings (red Ring3; blue Ring4, its gem made blue; green Ring6;
# purple Ring5, its gem made purple), and the kill bonuses: a snowflake (Snowflake1, made icy), gold ingots and a blue
# potion (Potion5, its liquid and glass made blue). Recoloured parts get a plain flat material (some pack colours live in nodes
# the glTF export drops).
#   blender --background --disable-autoexec --python tools/blender/export_items.py -- --rpg <Ultimate RPG Pack>
#       --dungeon <Modular Dungeon Pack - part 1> --glb public/models/items/items.glb [--previews <folder>]
import argparse
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import export_glb, flat_material, setup_previews, shoot  # noqa: E402

# name in the game: (.blend in the RPG pack, its largest side in the game (m), {material name start: new colour})
ITEMS = {
    'item_heart': ('Heart', 0.45, {}),
    'item_plate': ('Armor_Metal2', 0.6, {}),
    'item_goldPlate': ('Armor_Golden', 0.6, {}),
    'item_goldSword': ('Sword_Golden', 1.0, {}),
    # Update 0.1.4 — the Grimoire (the held one is export_book.py's).
    'item_grimoire': ('Book3_Open', 0.6, {}),
    # Update 0.1.5 — the Gold Axe and the hammer.
    'item_goldAxe': ('Axe_small_Golden', 0.8, {}),
    'item_hammer': ('Hammer_Double', 1.0, {}),
    # Update 0.1.9 — the Dual Daggers (one; the game crosses two, engine/pairLook.ts), 1.6x the first size (the designer).
    'item_daggers': ('Dagger', 0.96, {}),
    # Update 0.1.10 — the Gold Hammer and the Gold Daggers.
    'item_goldHammer': ('Hammer_Double_Golden', 1.0, {}),
    'item_goldDaggers': ('Dagger_Golden', 0.96, {}),
    # Update 0.1.10 — the Great Heart (a chest's better heart): the heart, bigger and brighter.
    'item_greatHeart': ('Heart', 0.6, {'Red': (1.0, 0.06, 0.22)}),
    'item_redRing': ('Ring3', 0.36, {}),
    'item_blueRing': ('Ring4', 0.36, {'Cyan': (0.08, 0.25, 1.0)}),
    'item_greenRing': ('Ring6', 0.36, {'Green': (0.1, 0.85, 0.2)}),
    'item_purpleRing': ('Ring5', 0.36, {'Lilac': (0.55, 0.08, 0.9)}),
    'item_key': ('Key1', 0.42, {}),
    'item_snowflake': ('Snowflake1', 0.5, {'Snowflake': (0.72, 0.9, 1.0)}),
    'item_goldIngots': ('Gold_Ingots', 0.5, {}),
    'item_bluePotion': ('Potion5_Filled', 0.5, {'Liquid': (0.1, 0.35, 1.0), 'Glass': (0.45, 0.7, 1.0)}),
}


def recolor(o, colours):
    """Each material whose name starts with a key gets a flat material of that colour."""
    for slot in o.material_slots:
        m = slot.material
        for start, rgb in colours.items():
            if m and m.name.startswith(start):
                slot.material = flat_material(f'{start}_{o.name}', rgb, 0.35)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--rpg', required=True)
    p.add_argument('--dungeon', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', default=None)
    return p.parse_args(argv)


def load(path):
    with bpy.data.libraries.load(os.path.abspath(path), link=False) as (src, dst):
        dst.objects = [n for n in src.objects]
    objs = [o for o in dst.objects if o is not None and o.type == 'MESH']
    for o in objs:
        bpy.context.scene.collection.objects.link(o)
        # Some pack files hide pieces from renders (the chest does): the exporter and previews need them.
        o.hide_render = False
    bpy.context.view_layer.update()
    return objs


def bake(o):
    """Its transform baked into its mesh (shared meshes are copied first)."""
    if o.data.users > 1:
        o.data = o.data.copy()
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix.Identity(4)


def centre_and_size(o, size):
    vs = [v.co for v in o.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    s = size / max(hi - lo)
    o.data.transform(Matrix.Scale(s, 4) @ Matrix.Translation(-(lo + hi) / 2))


def main():
    args = parse_args()
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    made = []
    for name, (blend, size, colours) in ITEMS.items():
        objs = load(os.path.join(args.rpg, blend + '.blend'))
        for o in objs:
            bake(o)
            recolor(o, colours)
        if len(objs) > 1:
            with bpy.context.temp_override(active_object=objs[0], object=objs[0], selected_objects=objs, selected_editable_objects=objs):
                bpy.ops.object.join()
        o = objs[0]
        centre_and_size(o, size)
        o.name = o.data.name = name
        made.append(o)
        bpy.context.view_layer.update()
        d = o.dimensions
        print(f'{name:16s} {d.x:.2f} x {d.y:.2f} x {d.z:.2f}')

    # The chest: its base as it stands, its lid with its origin on the hinge (where the file has it).
    chest = load(os.path.join(args.dungeon, 'Chest.blend'))
    for o in chest:
        if 'Top' in o.name:
            o.name = o.data.name = 'item_chestLid'
            if o.data.users > 1:
                o.data = o.data.copy()
            # Keep its location (the hinge); bake rotation and scale.
            loc = o.location.copy()
            o.data.transform(o.matrix_world.to_3x3().to_4x4())
            o.matrix_world = Matrix.Translation(loc)
            print(f'chest lid hinge at {tuple(round(x, 3) for x in loc)}')
        else:
            bake(o)
            o.name = o.data.name = 'item_chestBase'
        made.append(o)

    # The shop's display tile: a gold rim round a dark marble slab, 1.7 m across.
    bpy.ops.mesh.primitive_cube_add(size=1)
    rim = bpy.context.active_object
    rim.scale = (1.7, 1.7, 0.06)
    rim.location = (0, 0, 0.03)
    rim.data.materials.append(flat_material('ShopGold', (0.62, 0.46, 0.12), 0.45))
    bpy.ops.mesh.primitive_cube_add(size=1)
    slab = bpy.context.active_object
    slab.scale = (1.5, 1.5, 0.08)
    slab.location = (0, 0, 0.04)
    slab.data.materials.append(flat_material('ShopMarble', (0.16, 0.15, 0.18), 0.6))
    bpy.context.view_layer.update()
    for o in (rim, slab):
        bake(o)
    with bpy.context.temp_override(active_object=rim, object=rim, selected_objects=[rim, slab], selected_editable_objects=[rim, slab]):
        bpy.ops.object.join()
    rim.name = rim.data.name = 'item_tile'
    made.append(rim)

    if args.previews:
        spots = {}
        for i, o in enumerate(made):
            spots[o.name] = o.location.copy()
            o.location = o.location + Vector(((i % 5) * 1.4, -(i // 5) * 1.6, 0.6 if o.name.startswith('item_') and 'chest' not in o.name and o.name != 'item_tile' else 0))
        setup_previews('BLENDER_WORKBENCH', args.previews)
        bpy.context.scene.display.shading.light = 'STUDIO'
        bpy.context.scene.display.shading.color_type = 'MATERIAL'
        for m in bpy.data.materials:
            if m.node_tree and 'Principled BSDF' in m.node_tree.nodes:
                m.diffuse_color = m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
        shoot('BLENDER_WORKBENCH', os.path.join(args.previews, 'items.png'), Vector((2.8, -7.5, 4)), Vector((2.8, -0.8, 0.4)), size=(1400, 900), vfov=45)
        # The lid opened 100° about its hinge, to check the hinge.
        lid = bpy.data.objects['item_chestLid']
        base = bpy.data.objects['item_chestBase']
        lid.location = spots['item_chestLid'] + (base.location - spots['item_chestBase'])
        lid.rotation_euler = (-1.75, 0, 0)
        shoot('BLENDER_WORKBENCH', os.path.join(args.previews, 'chest_open.png'), base.location + Vector((1.6, -2.4, 1.6)), base.location + Vector((0, 0, 0.5)), size=(900, 700), vfov=45)
        lid.rotation_euler = (0, 0, 0)
        for o in made:
            o.location = spots[o.name]
    export_glb(args.glb)


main()
