# Born To Retry — exports a held weapon from the Ultimate RPG Pack to a .glb for the game: one mesh, its origin at the
# middle of the grip, the blade (or head) pointing up (+y in the game), the edge across x, scaled to a set length.
# The grip is found from the shape: going up from the bottom, past the pommel, the narrow handle runs until the
# cross-section widens at the guard (or the head).
#
# Run (from game/):
#   blender --background --disable-autoexec --python tools/blender/export_weapon.py -- \
#     --blend "<Ultimate RPG Pack>/Sword.blend" --glb public/models/weapons/sword.glb --length 1.05 --previews <folder>
import argparse
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import export_glb, setup_previews, shoot  # noqa: E402

BANDS = 20


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--blend', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--length', type=float, required=True, help='total length in the game (m)')
    p.add_argument('--previews', required=True)
    p.add_argument('--engine', default='BLENDER_EEVEE')
    return p.parse_args(argv)


def find_grip(vs, axis):
    """The middle of the handle along `axis`: from the bottom, past the pommel, up to where the guard widens."""
    lo = min(v[axis] for v in vs)
    hi = max(v[axis] for v in vs)
    step = (hi - lo) / BANDS
    widths = []
    for b in range(BANDS):
        band = [v for v in vs if lo + step * b <= v[axis] <= lo + step * (b + 1)]
        others = [i for i in range(3) if i != axis]
        widths.append(max((max(v[i] for v in band) - min(v[i] for v in band)) for i in others) if band else 0.0)
    handle = min(w for w in widths[: int(BANDS * 0.4)] if w > 0)
    start = next(b for b in range(BANDS) if 0 < widths[b] < handle * 1.5)
    guard = next(b for b in range(start, BANDS) if widths[b] > handle * 2)
    print(f'handle width {handle:.3f}, handle from band {start} to the guard at band {guard}')
    return lo + step * (start + guard) / 2


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
    w = meshes[0]
    w.name = 'Weapon'
    vs = [v.co.copy() for v in w.data.vertices]
    size = [max(v[i] for v in vs) - min(v[i] for v in vs) for i in range(3)]
    axis = max(range(3), key=lambda i: size[i])
    # Turn the long axis to +z and the wider cross axis (the edge) to x.
    if axis == 0:
        w.data.transform(Matrix.Rotation(math.radians(-90), 4, 'Y'))
    elif axis == 1:
        w.data.transform(Matrix.Rotation(math.radians(90), 4, 'X'))
    vs = [v.co.copy() for v in w.data.vertices]
    if (max(v.y for v in vs) - min(v.y for v in vs)) > (max(v.x for v in vs) - min(v.x for v in vs)):
        w.data.transform(Matrix.Rotation(math.radians(90), 4, 'Z'))
        vs = [v.co.copy() for v in w.data.vertices]
    grip = find_grip(vs, 2)
    length = max(v.z for v in vs) - min(v.z for v in vs)
    cx = (max(v.x for v in vs) + min(v.x for v in vs)) / 2
    cy = (max(v.y for v in vs) + min(v.y for v in vs)) / 2
    w.data.transform(Matrix.Scale(args.length / length, 4) @ Matrix.Translation((-cx, -cy, -grip)))
    print(f'grip at {grip:.3f} of a {length:.2f} m model; scaled to {args.length} m')

    setup_previews(args.engine, args.previews)
    world = bpy.context.scene.world or bpy.data.worlds.new('World')
    bpy.context.scene.world = world
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.rotation_euler = (math.radians(40), 0, math.radians(30))
    bpy.context.scene.collection.objects.link(sun)
    shoot(args.engine, os.path.join(args.previews, 'weapon.png'), Vector((1.6, -1.6, 0.4)), Vector((0, 0, 0.25)), size=(900, 900), vfov=40)
    bpy.data.objects.remove(sun, do_unlink=True)
    export_glb(args.glb)


main()
