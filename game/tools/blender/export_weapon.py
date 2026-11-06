# Born To Retry — exports a held weapon from the Ultimate RPG Pack to a .glb for the game: one mesh, its origin at the
# middle of the grip, the blade (or head) pointing up (+y in the game), the edge across x, scaled to a set length.
# The grip is found from the shape: going up from the bottom, past the pommel, the narrow handle runs until the
# cross-section widens at the guard (or the head).
# Update 0.1.5 — `--handle-center`: centred on the handle where it's held (an axe's head sticks out to one side, so the
# whole model's middle is beside the handle); `--edge-out`: the side the head reaches furthest (an axe's blade) turned
# to +x, the way the knuckles face.
# Update 0.1.6 — `--thin TOP,RMAX,K`: the handle made K times as thick across (everything below TOP m up the weapon and
# within RMAX m of its middle line: the haft and its wraps, not the head), so its grip is as thick as the sword's, the
# one the fist is shaped round (thicker, it pokes through the fingers).
# Update 0.1.9 — `--edge-out` looks only at the top half (the head or blade), so a dagger's wide guard doesn't decide
# it: the dagger's serrated belly goes to +x, the way the knuckles face.
# Update 0.3.70 — `--only NAME`: a weapon that's one mesh of a character's file (the Demon's blade, in Hellwarden.blend);
# `--flip`: its blade points down its long axis' negative end; `--tex N`: its textures no bigger than N px;
# `--blade LONG,WIDE,TOP,RAMP`: the blade above TOP m up the weapon LONG times as long and WIDE times as broad, the guard and
# hilt below as they are (a massive blade on a hilt that still fits the fist; grown whole, the guard balloons, and the
# blade, which runs away from your eye, hardly seems longer), broadening over RAMP m so there's no step.
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
    p.add_argument('--handle-center', action='store_true', help='centre x and y on the handle at the grip')
    p.add_argument('--edge-out', action='store_true', help='turn the side the head reaches furthest to +x')
    p.add_argument('--thin', default=None, help='TOP,RMAX,K: the handle below TOP and within RMAX of the middle, K times as thick')
    p.add_argument('--only', default=None, help='only this mesh is the weapon')
    p.add_argument('--flip', action='store_true', help='its blade points the negative way along its long axis')
    p.add_argument('--tex', type=int, default=0, help='its textures no bigger than this (px)')
    p.add_argument('--blade', default=None, help='LONG,WIDE,TOP,RAMP: above TOP m up the weapon, that much longer and broader; the guard and hilt as they are')
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
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and (not args.only or o.name == args.only)]
    for o in list(bpy.data.objects):
        if o not in meshes:
            bpy.data.objects.remove(o, do_unlink=True)
    for o in meshes:
        o.modifiers.clear()
        o.vertex_groups.clear()
    if args.tex:
        for m in bpy.data.materials:
            if m.use_nodes:
                for n in list(m.node_tree.nodes):
                    if n.type == 'SEPARATE_COLOR' or (n.type == 'TEX_IMAGE' and n.image and 'ORM' in n.image.name):
                        m.node_tree.nodes.remove(n)
        for im in bpy.data.images:
            wanted = args.tex // 2 if 'Normal' in im.name else args.tex
            if im.size[0] > wanted:
                im.scale(wanted, wanted)
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
    if args.flip:
        w.data.transform(Matrix.Rotation(math.radians(180), 4, 'X'))
    vs = [v.co.copy() for v in w.data.vertices]
    if (max(v.y for v in vs) - min(v.y for v in vs)) > (max(v.x for v in vs) - min(v.x for v in vs)):
        w.data.transform(Matrix.Rotation(math.radians(90), 4, 'Z'))
        vs = [v.co.copy() for v in w.data.vertices]
    grip = find_grip(vs, 2)
    length = max(v.z for v in vs) - min(v.z for v in vs)
    cx = (max(v.x for v in vs) + min(v.x for v in vs)) / 2
    cy = (max(v.y for v in vs) + min(v.y for v in vs)) / 2
    if args.handle_center:
        band = [v for v in vs if abs(v.z - grip) < length * 0.03]
        cx = (max(v.x for v in band) + min(v.x for v in band)) / 2
        cy = (max(v.y for v in band) + min(v.y for v in band)) / 2
        print(f'handle centre ({cx:.3f}, {cy:.3f}) from {len(band)} vertices')
    # (The head or blade: the top half, so a dagger's guard doesn't count.)
    top = (max(v.z for v in vs) + min(v.z for v in vs)) / 2
    head = [v for v in vs if v.z > top]
    wider_left = (cx - min(v.x for v in head)) > (max(v.x for v in head) - cx)
    if args.edge_out and wider_left:
        w.data.transform(Matrix.Rotation(math.radians(180), 4, 'Z'))
        vs = [v.co.copy() for v in w.data.vertices]
        cx, cy = -cx, -cy
        print('turned the head\'s edge to +x')
    w.data.transform(Matrix.Scale(args.length / length, 4) @ Matrix.Translation((-cx, -cy, -grip)))
    print(f'grip at {grip:.3f} of a {length:.2f} m model; scaled to {args.length} m')
    if args.thin:
        top, rmax, k = (float(x) for x in args.thin.split(','))
        n = 0
        for v in w.data.vertices:
            if v.co.z <= top and math.hypot(v.co.x, v.co.y) <= rmax:
                v.co.x *= k
                v.co.y *= k
                n += 1
        print(f'thinned {n} handle vertices by {k}')
    if args.blade:
        long, broad, top, ramp = (float(x) for x in args.blade.split(','))
        for v in w.data.vertices:
            if v.co.z > top:
                t = min(1.0, (v.co.z - top) / ramp)
                wide = 1 + (broad - 1) * t * t * (3 - 2 * t)
                v.co.x *= wide
                v.co.y *= wide
                v.co.z = top + (v.co.z - top) * long
        zs = [v.co.z for v in w.data.vertices]
        print(f'blade {long} times as long, {broad} as broad: {max(zs) - min(zs):.2f} m in all, {max(zs):.2f} m above the fist')

    setup_previews(args.engine, args.previews)
    world = bpy.context.scene.world or bpy.data.worlds.new('World')
    bpy.context.scene.world = world
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.rotation_euler = (math.radians(40), 0, math.radians(30))
    bpy.context.scene.collection.objects.link(sun)
    shoot(args.engine, os.path.join(args.previews, 'weapon.png'), Vector((1.6, -1.6, 0.4)), Vector((0, 0, 0.25)), size=(900, 900), vfov=40)
    bpy.data.objects.remove(sun, do_unlink=True)
    export_glb(args.glb, **(dict(export_image_format='JPEG', export_jpeg_quality=88) if args.tex else {}))


main()
