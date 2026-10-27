# Born To Retry — builds the character select screen's scene: a prison corridor (Modular Dungeon Pack) with a row of
# barred cells, one character standing in each, torches on the wall opposite. Characters come from their Quaternius
# .blend, posed out of the T-pose (arms down) and baked into static meshes. A character whose .blend isn't in the
# folder yet stands as a dark silhouette (the Adventurer's shape) until it is. Exports one .glb with named nodes:
#   Char_<id>               the character in cell <id> (ids as in src/sim/characters.ts, in cell order)
#   Door_<id>               the cell's bars (they lift when the character is selected)
#   Cell_<id>               where the character stands
#   Cam_<id>, Look_<id>     the camera facing that cell, and what it looks at
#   CellLight_<id>          a dim light over the cell
#   Torch_<n>               torch flames on the corridor wall
#   Cam_Prison_From, Look_Prison_From   the camera's start, at the corridor's end, looking down the row of cells
# and renders previews with Eevee.
#
# Run (from game/):
#   blender --background --disable-autoexec --python tools/blender/build_prison_scene.py -- \
#     --kit "<Modular Dungeon Pack folder>" --characters "<folder with the character .blend files>" \
#     --glb public/models/menu/prison.glb --previews <folder>
#
# Layout (Blender: z up). The cells' fronts are on y = 0, cell i centred on x = i * CELL_PITCH, running back to
# y = 4; the corridor is y = −4..0. Characters face −y, out of their cells.
import argparse
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import bake_posed, export_glb, flat_material, load_pieces, marker, orient_bone, place, setup_previews, shoot  # noqa: E402

PIECES = ['Arch', 'Arch_bars', 'Wall_Modular', 'WallCover_Modular', 'Column', 'Floor_Modular', 'Torch', 'Cobweb', 'Bucket', 'Skull']
# The roster in cell order (ids as in src/sim/characters.ts), and each character's .blend (a missing file means a
# silhouette until it's there).
CHARACTERS = [('adventurer', 'Adventurer'), ('king', 'King'), ('suit', 'Suit'), ('swat', 'Swat')]
SILHOUETTE_OF = 'Adventurer'
PRISON_VFOV = 58  # wide enough that a cell's neighbours show at the edges; the game's prison camera uses the same
CELL_PITCH = 4.4  # one arch (4.1 m) plus the column between arches
DOOR_LIFT = 2.6  # how far a cell's bars lift (the game's PRISON.doorLift); the 2 m of wall above hides at most ~2.6
EYE = 1.65


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--kit', required=True)
    p.add_argument('--characters', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', required=True)
    p.add_argument('--engine', default='BLENDER_EEVEE')
    return p.parse_args(argv)


def build(protos):
    n = len(CHARACTERS)
    x0, x1 = -4, (n - 1) * CELL_PITCH + 4
    # Floor and ceiling: tiles on a 2 m grid over the corridor (y −4..0) and the cells (y 0..4).
    for x in range(int(x0) + 1, int(x1) + 2, 2):
        for y in (-3, -1, 1, 3):
            place(protos, 'Floor_Modular', (x, y, -0.13))
            place(protos, 'Floor_Modular', (x, y, 6.0))
    # The corridor's back wall and the cells' back wall, three blocks high; the wall over the arches.
    for x in range(int(x0) + 1, int(x1) + 2, 2):
        for z in (1, 3, 5):
            place(protos, 'Wall_Modular', (x, -4.22, z))
            place(protos, 'Wall_Modular', (x, 4.22, z))
        place(protos, 'Wall_Modular', (x, 0, 5))
    # The corridor's end walls.
    for x in (x0 - 0.22, x1 + 0.22):
        for y in (-3, -1, 1, 3):
            for z in (1, 3, 5):
                place(protos, 'Wall_Modular', (x, y, z), rot_z=90)
    for i, (cid, _) in enumerate(CHARACTERS):
        cx = i * CELL_PITCH
        # The cell's front: an arch with its bars; columns between the arches; walls between the cells.
        place(protos, 'Arch', (cx, 0, 0))
        place(protos, 'Arch_bars', (cx, 0, 0), name=f'Door_{cid}')
        for side in (-1, 1):
            place(protos, 'Column', (cx + side * CELL_PITCH / 2, 0, 0))
            for y in (1.5, 3.5):
                for z in (1, 3, 5):
                    place(protos, 'Wall_Modular', (cx + side * CELL_PITCH / 2, y, z), rot_z=90)
        # A torch on the corridor wall facing the cell; a dim light over the cell; a bucket and a cobweb inside.
        place(protos, 'Torch', (cx, -4.0 + 0.29, 2.4), rot_z=180, name=f'TorchMount_{i}')
        marker(f'Torch_{i}', (cx, -4.0 + 0.25, 2.4 + 0.75))
        marker(f'CellLight_{cid}', (cx, 1.8, 3.6))
        place(protos, 'Bucket', (cx + 1.25, 3.4, 0), rot_z=25 * i)
        place(protos, 'Cobweb', (cx - 1.5, 3.7, 4.2), rot_z=180)
        if i % 2 == 1:
            place(protos, 'Skull', (cx - 1.1, 3.2, 0), rot_z=40 + 30 * i)
        # Where the character stands (near the bars, so it reads through them), and the camera facing the cell from
        # the far side of the corridor.
        marker(f'Cell_{cid}', (cx, 1.0, 0))
        marker(f'Cam_{cid}', (cx, -3.2, 1.55))
        marker(f'Look_{cid}', (cx, 1.0, 1.15))
    marker('Cam_Prison_From', (x0 + 1.2, -2.8, 1.8))
    marker('Look_Prison_From', ((n - 1) * CELL_PITCH * 0.45, 1.0, 1.3))


def pose_standing(arm):
    """Out of the T-pose: arms hanging a little away from the body, elbows soft, palms in."""
    for side, s in (('L', 1), ('R', -1)):
        orient_bone(arm, f'UpperArm.{side}', (0.2 * s, 0.03, -1), (s, 0, 0))
        orient_bone(arm, f'LowerArm.{side}', (0.12 * s, -0.16, -1), (s, 0.1, 0))
        orient_bone(arm, f'Hand.{side}', (0.1 * s, -0.12, -1), (s, 0.1, 0))


def load_character(folder, cid, file):
    """The character from `file`.blend, posed and baked into one mesh named Char_<cid> at the origin (feet at z 0,
    facing −y); a silhouette of the Adventurer if the file isn't there."""
    path = os.path.join(os.path.abspath(folder), file + '.blend')
    silhouette = not os.path.exists(path)
    if silhouette:
        print(f'{cid}: {file}.blend not found, standing a silhouette in its cell')
        path = os.path.join(os.path.abspath(folder), SILHOUETTE_OF + '.blend')
    else:
        print(f'{cid}: {file}.blend')
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        dst.objects = [n for n in src.objects]
    objs = [o for o in dst.objects if o is not None]
    for o in objs:
        bpy.context.scene.collection.objects.link(o)
    arm = next(o for o in objs if o.type == 'ARMATURE')
    pose_standing(arm)
    body = bake_posed(objs, f'Char_{cid}')
    if silhouette:
        body.data.materials.clear()
        body.data.materials.append(flat_material('Silhouette', (0.012, 0.012, 0.016), 0.7))
    return body


def preview_lights():
    """Lights for the Blender previews only (the game adds its own)."""
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.01, 0.015, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 2
    for o in list(bpy.data.objects):
        if o.name.startswith('Torch_') or o.name.startswith('CellLight_'):
            torch = o.name.startswith('Torch_')
            l = bpy.data.lights.new(o.name + '_light', 'POINT')
            l.energy = 500 if torch else 120
            l.color = (1.0, 0.55, 0.22) if torch else (1.0, 0.8, 0.6)
            l.use_shadow = False
            lo = bpy.data.objects.new(o.name + '_light', l)
            lo.location = o.location
            scene.collection.objects.link(lo)


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    protos = load_pieces(args.kit, PIECES, {})
    build(protos)
    for cid, file in CHARACTERS:
        body = load_character(args.characters, cid, file)
        body.location = bpy.data.objects[f'Cell_{cid}'].location

    setup_previews(args.engine, args.previews)
    preview_lights()
    m = bpy.data.objects
    shoot(args.engine, os.path.join(args.previews, 'From.png'), m['Cam_Prison_From'].location, m['Look_Prison_From'].location, size=(1600, 900), vfov=PRISON_VFOV)
    door = m['Door_adventurer']
    for cid, _ in CHARACTERS:
        shoot(args.engine, os.path.join(args.previews, f'Cell_{cid}.png'), m[f'Cam_{cid}'].location, m[f'Look_{cid}'].location, size=(1600, 900), vfov=PRISON_VFOV)
    door.location.z += DOOR_LIFT
    shoot(args.engine, os.path.join(args.previews, 'Cell_adventurer_open.png'), m['Cam_adventurer'].location, m['Look_adventurer'].location, size=(1600, 900), vfov=PRISON_VFOV)
    door.location.z -= DOOR_LIFT

    # Some source meshes carry broken bits the exporter warns about: repair them first, and say which.
    for me in bpy.data.meshes:
        if me.users and me.validate(verbose=False):
            print(f'repaired mesh {me.name} (used by {", ".join(o.name for o in bpy.data.objects if o.data == me)[:80]})')
    export_glb(args.glb)


main()
