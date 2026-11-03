# Update 0.3.39 — the floors' heaviest kit pieces again, lighter, drawn in their place when they're far from you
# (engine/floorPieces.ts; the designer: "my PC go full fan speed", fix 4). Floor 1's stone floor tile alone is 1,176
# triangles, laid 5,466 times; its wall piece 1,672. Both are separate stones (12 and 18), each bevelled and chipped:
# far off, each stone is its box (12 triangles: its size and place, its colour), so a tile is 144 and a wall 216, the
# stones' pattern and the gaps between them as they were. The pieces' sides are where they were (a stone's box reaches
# just as far), so a far piece meets the next one, near or far, with no gap. (Decimating them was tried: on separate
# stones it eats whole ones and leaves holes. Part 2's stone floor and wall are one mesh each, already lean (473 and
# 552): they're left as they are.) Read from the game's own kit (public/models/dungeon/kit.glb); written as
# kit_far.glb, the same names and materials.
#   blender --background --disable-autoexec --python tools/blender/kit_far.py -- --kit public/models/dungeon/kit.glb
#       --glb public/models/dungeon/kit_far.glb [--previews <folder>]
# --previews: each piece near and far side by side, and a hall of them as the game would draw it (far past FAR_FROM)
# beside the same hall all near.
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

# The pieces made of separate stones.
FAR = ['kit_p1_Floor_Modular', 'kit_p1_Wall_Modular', 'kit_p1_WallCover_Modular']
# The previews' hall: far pieces from this far (m), as near as the game ever draws them (floorPieces.ts FAR_FROM).
FAR_FROM = 15


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--kit', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', default='')
    return p.parse_args(argv)


def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def stones(o):
    """`o`'s separate stones, each made its box (its size and place in `o`'s own space, its most-used material).
    Returns (triangles before, after, stones)."""
    me = o.data
    before = tris(me)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.faces.ensure_lookup_table()
    seen = set()
    found = []
    for f in bm.faces:
        if f.index in seen:
            continue
        seen.add(f.index)
        stack = [f]
        verts = set()
        mats = {}
        while stack:
            g = stack.pop()
            mats[g.material_index] = mats.get(g.material_index, 0) + 1
            verts.update(g.verts)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen:
                        seen.add(h.index)
                        stack.append(h)
        lo = Vector([min(v.co[k] for v in verts) for k in range(3)])
        hi = Vector([max(v.co[k] for v in verts) for k in range(3)])
        found.append((lo, hi, max(mats, key=mats.get)))
    bm.free()
    out = bmesh.new()
    for lo, hi, mat in found:
        cube = bmesh.ops.create_cube(out, size=1.0)
        for v in cube['verts']:
            v.co = Vector([lo[k] + (v.co[k] + 0.5) * (hi[k] - lo[k]) for k in range(3)])
        for face in {f for v in cube['verts'] for f in v.link_faces}:
            face.material_index = mat
    bmesh.ops.triangulate(out, faces=out.faces)
    out.to_mesh(me)
    out.free()
    for p in me.polygons:
        p.use_smooth = False
    me.update()
    return before, tris(me), len(found)


def flat(name, rgb):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    return m


def previews(folder, near, far):
    """Each piece near and far side by side; a hall all near beside the same hall as the game draws it."""
    os.makedirs(folder, exist_ok=True)
    scene = bpy.context.scene
    # (The kit's own pieces out of the pictures: only the copies placed here show.)
    for o in scene.objects:
        o.hide_render = True
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.image_settings.file_format = 'PNG'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('W')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.7, 0.8, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.data.energy = 3.0
    sun.data.color = (1.0, 0.94, 0.84)
    sun.rotation_euler = Vector((-0.45, -0.35, 1)).normalized().to_track_quat('Z', 'Y').to_euler()
    scene.collection.objects.link(sun)
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    cam.data.clip_start = 0.05
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle = math.radians(58)
    scene.collection.objects.link(cam)
    scene.camera = cam
    made = []

    def put(src, loc, rot=0.0):
        o = bpy.data.objects.new(src.name + '_copy', src.data)
        o.location = loc
        o.rotation_euler = (0, 0, rot)
        o.scale = src.scale
        scene.collection.objects.link(o)
        made.append(o)
        return o

    def shoot(name, at, look, size=(1280, 720)):
        cam.location = at
        cam.rotation_euler = (Vector(look) - Vector(at)).to_track_quat('-Z', 'Y').to_euler()
        scene.render.resolution_x, scene.render.resolution_y = size
        scene.render.filepath = os.path.join(folder, name)
        bpy.ops.render.render(write_still=True)
        print('rendered', scene.render.filepath)

    def clear():
        for o in made:
            bpy.data.objects.remove(o, do_unlink=True)
        made.clear()

    # Each piece: near on the left, far on the right.
    for name in FAR:
        if name not in near or name not in far:
            continue
        put(near[name], (-1.4, 0, 0))
        put(far[name], (1.4, 0, 0))
        shoot(f'piece-{name}.png', (0, -5.2, 2.6), (0, 0, 0.6))
        clear()
    # A hall: floor tiles 4 wide, 24 long, a wall two high down each side; all near, then as the game draws it.
    for floor, wall, tag in (('kit_p1_Floor_Modular', 'kit_p1_Wall_Modular', 'brick'),):
        if floor not in near or wall not in near:
            continue
        eye = Vector((0, -2, 1.6))
        for mode in ('near', 'game'):
            pick = lambda n, at: far[n] if mode == 'game' and n in far and (at - eye).length >= FAR_FROM else near[n]  # noqa: E731
            for j in range(24):
                y = j * 2.0
                for i in range(4):
                    at = Vector((-3 + i * 2.0, y, 0))
                    put(pick(floor, at), at)
                for side in (-1, 1):
                    for h in range(2):
                        at = Vector((side * 4.2, y, h * 2.0))
                        put(pick(wall, at), at, math.pi / 2 * side)
            shoot(f'hall-{tag}-{mode}.png', eye, (0, 30, 0.6))
            clear()


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.kit))
    near = {}
    far = {}
    for name in FAR:
        src = bpy.data.objects.get(name)
        if not src or src.type != 'MESH':
            print('MISSING', name)
            continue
        near[name] = src
        o = src.copy()
        o.data = src.data.copy()
        bpy.context.scene.collection.objects.link(o)
        before, after, n = stones(o)
        print(f'{name}: {before} -> {after} triangles ({n} stones)')
        far[name] = o
    if args.previews:
        previews(args.previews, near, far)
    # Only the far pieces, under their own names.
    for o in list(bpy.data.objects):
        if o not in far.values():
            bpy.data.objects.remove(o, do_unlink=True)
    for name, o in far.items():
        o.name = name
        o.data.name = name
    bpy.ops.object.select_all(action='DESELECT')
    for o in far.values():
        o.select_set(True)
    os.makedirs(os.path.dirname(os.path.abspath(args.glb)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(args.glb), export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_lights=False, export_cameras=False)
    print('exported', args.glb)


main()
