# Born To Retry — Update 0.1.4: exports an open book from the Ultimate RPG Pack to a .glb for the game (the Grimoire):
# one mesh lying open, its pages facing up (+y in the game), its spine along the game's z, its origin under the middle
# of the spine (where a hand holds it from below), scaled so its open width is a set size.
#
# Run (from game/):
#   blender --background --disable-autoexec --python tools/blender/export_book.py -- \
#     --blend "<Ultimate RPG Pack>/Book2_Open.blend" --glb public/models/weapons/grimoire.glb --width 0.38 --previews <folder>
#   (--glb omitted: only the preview)
import argparse
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import export_glb, setup_previews, shoot  # noqa: E402


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--blend', required=True)
    p.add_argument('--glb', default=None)
    p.add_argument('--width', type=float, default=0.38, help='open width in the game (m)')
    p.add_argument('--previews', required=True)
    p.add_argument('--engine', default='BLENDER_EEVEE')
    return p.parse_args(argv)


def main():
    args = parse_args()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(args.blend), load_ui=False, use_scripts=False)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in bpy.data.objects:
        if o.type != 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
    for o in meshes:
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
    if len(meshes) > 1:
        with bpy.context.temp_override(active_object=meshes[0], object=meshes[0], selected_objects=meshes, selected_editable_objects=meshes):
            bpy.ops.object.join()
    b = meshes[0]
    b.name = 'Grimoire'
    # (The pack's file may keep it out of the scene it opens with, or hidden from renders.)
    scene = bpy.context.scene
    if b.name not in scene.objects:
        scene.collection.objects.link(b)
    b.hide_render = False
    b.hide_viewport = False
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.exposure = 0
    print('IN SCENE', [o.name for o in scene.objects], 'collections', [c.name for c in b.users_collection])
    vs = [v.co.copy() for v in b.data.vertices]
    lo = Vector([min(v[i] for v in vs) for i in range(3)])
    hi = Vector([max(v[i] for v in vs) for i in range(3)])
    size = hi - lo
    # Lying open: thin along z. The pages spread along the longer of x and y; the spine runs along the other.
    if size.y > size.x:
        b.data.transform(Matrix.Rotation(math.radians(90), 4, 'Z'))
        vs = [v.co.copy() for v in b.data.vertices]
        lo = Vector([min(v[i] for v in vs) for i in range(3)])
        hi = Vector([max(v[i] for v in vs) for i in range(3)])
        size = hi - lo
    mid = (lo + hi) / 2
    k = args.width / size.x
    b.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation((-mid.x, -mid.y, -lo.z)))
    print(f'BOOK {os.path.basename(args.blend)}: {size.x:.3f} x {size.y:.3f} x {size.z:.3f}, scaled {k:.3f} to {args.width} m wide')

    setup_previews(args.engine, args.previews)
    world = bpy.context.scene.world or bpy.data.worlds.new('World')
    bpy.context.scene.world = world
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.rotation_euler = (math.radians(40), 0, math.radians(30))
    bpy.context.scene.collection.objects.link(sun)
    name = os.path.splitext(os.path.basename(args.blend))[0]
    w = args.width
    shoot(args.engine, os.path.join(args.previews, name + '.png'), Vector((0.2 * w, -1.6 * w, 1.4 * w)), Vector((0, 0, 0.02)), size=(700, 500), vfov=40)
    bpy.data.objects.remove(sun, do_unlink=True)
    if args.glb:
        export_glb(args.glb)


main()
