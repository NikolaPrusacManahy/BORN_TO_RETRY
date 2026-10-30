# Update 0.0.12 — draws a dungeon floor written by tools/dungeon-shots.ts with the real kit (public/models/dungeon/
# kit.glb): every placement as a linked copy of its kit piece, the gates' bars down (as when a room fights), then an
# overview from above and the camera spots it lists. The game is y up, Blender z up: (x, y, z) → (x, −z, y).
#   blender --background --python tools/blender/render_dungeon.py -- --json <folder>/dungeon.json --kit public/models/dungeon/kit.glb --out <folder>
# Update 0.0.13 — `--day`: Blender's sun and sky in place of the flat studio light, a rough stand-in for the game's
# daylight (engine/dungeonView.ts): the same sky colour and sun direction, not its renderer.
# Update 0.0.15 — the boss room (tools/boss-shots.ts): coloured boxes by their game matrices (the wooden gate, the
# dark), and the Demon in its stance (`--demon` <its .glb>).
import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--json', required=True)
    p.add_argument('--kit', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--width', type=int, default=1280)
    p.add_argument('--day', action='store_true')
    p.add_argument('--demon', default='')
    return p.parse_args(argv)


# Game (y up) to Blender (z up): (x, y, z) → (x, −z, y).
TO_B = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def game_boxes(boxes):
    """Unit cubes placed by game matrices (column-major, as Three.js writes them), each in its colour; black ones
    shadeless (the dark)."""
    for i, b in enumerate(boxes):
        e = b['m']
        gm = Matrix([[e[c * 4 + r] for c in range(4)] for r in range(4)])
        bpy.ops.mesh.primitive_cube_add(size=1)
        o = bpy.context.active_object
        o.matrix_world = TO_B @ gm @ TO_B.inverted()
        mat = bpy.data.materials.new(f'Box{i}')
        mat.use_nodes = True
        col = (*b['color'], 1)
        bsdf = mat.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = col
        if sum(b['color']) == 0:
            # The dark: drawn from the inside only, as the game does (its near side never hides what's in it).
            bsdf.inputs['Roughness'].default_value = 1
            bsdf.inputs['Specular IOR Level'].default_value = 0
            mat.use_backface_culling = True
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.flip_normals()
            bpy.ops.object.mode_set(mode='OBJECT')
        mat.diffuse_color = col
        o.data.materials.append(mat)


def demon_at(path, d):
    """The Demon in its stance (Wave, trident raised), scaled to its size, facing as the game turns it."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
    new = [o for o in bpy.data.objects if o not in before]
    arm = next((o for o in new if o.type == 'ARMATURE'), None)
    root = next((o for o in new if o.parent is None), new[0])
    if arm and arm.animation_data is None:
        arm.animation_data_create()
    act = next((a for a in bpy.data.actions if a.name.endswith('Wave')), None)
    if arm and act:
        arm.animation_data.action = act
        bpy.context.scene.frame_set(30)
    bpy.context.view_layer.update()
    zs = [(o.matrix_world @ Vector(c)).z for o in new if o.type == 'MESH' for c in o.bound_box]
    h = max(zs) - min(zs) if zs else 1
    k = d['height'] / h
    root.scale = (k, k, k)
    root.location = to_blender(d['x'], 0, d['z'])
    root.rotation_mode = 'XYZ'
    root.rotation_euler.z = d['yaw'] + math.pi
    bpy.context.view_layer.update()
    zs = [(o.matrix_world @ Vector(c)).z for o in new if o.type == 'MESH' for c in o.bound_box]
    if zs:
        root.location.z -= min(zs)


def srgb(h):
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def recolour(style, protos):
    """Update 0.2.4 — each kit material to the look's colour (by its name before any ".001"); the floor tile's own."""
    tint, floor_tint = style.get('tint') or {}, style.get('floorTint') or {}
    if not tint and not floor_tint:
        return
    fl = protos.get(style.get('floor'))
    for o in protos.values():
        for i, m in enumerate(o.data.materials):
            if m is None or not m.use_nodes or 'Principled BSDF' not in m.node_tree.nodes:
                continue
            base = m.name.split('.')[0]
            want = floor_tint.get(base) if o is fl and base in floor_tint else tint.get(base)
            if want is None:
                continue
            mm = m.copy()
            mm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb(want), 1)
            o.data.materials[i] = mm


def sand_cells(cells, style):
    """Update 0.2.4 — loose sand: a flat tile per cell (quicksand darker)."""
    for quick in (False, True):
        mat = bpy.data.materials.new('Quicksand' if quick else 'Sand')
        mat.use_nodes = True
        col = srgb(style.get('quicksand' if quick else 'sand', 0xb98a4c if quick else 0xe6c27e))
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*col, 1)
        mat.diffuse_color = (*col, 1)
        for c in cells:
            if c['quick'] != quick:
                continue
            bpy.ops.mesh.primitive_plane_add(size=2, location=to_blender(c['x'], 0.015, c['z']))
            bpy.context.active_object.data.materials.append(mat)


def daylight(scene):
    """EEVEE with a sun (the game's direction, from the south-west) and a pale sky lighting the shade."""
    scene.render.engine = 'BLENDER_EEVEE'
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.data.energy = 3.0
    sun.data.color = (1.0, 0.94, 0.84)
    sun.data.angle = math.radians(2)
    # The game's way to the sun: (-0.45, 1, 0.35) y up → Blender (-0.45, -0.35, 1).
    to_sun = Vector((-0.45, -0.35, 1)).normalized()
    sun.rotation_euler = to_sun.to_track_quat('Z', 'Y').to_euler()
    scene.collection.objects.link(sun)
    if scene.world is None:
        scene.world = bpy.data.worlds.new('W')
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.58, 0.69, 0.79, 1)
    bg.inputs['Strength'].default_value = 1.0


def to_blender(x, y, z):
    return Vector((x, -z, y))


def place(proto, p):
    o = bpy.data.objects.new(proto.name + '_i', proto.data)
    o.location = to_blender(p['x'], p['y'], p['z'])
    o.rotation_euler = (0, 0, p['rot'])
    o.scale = (p['sx'], p['sz'], p['sy'])
    bpy.context.scene.collection.objects.link(o)
    return o


def shoot(cam, path, at, to, lens_deg=75):
    cam.data.type = 'PERSP'
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle = math.radians(lens_deg)
    cam.location = at
    cam.rotation_euler = (to - at).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('rendered', path)


def main():
    args = parse_args()
    with open(args.json, encoding='utf-8') as f:
        data = json.load(f)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.kit))
    protos = {o.name: o for o in bpy.data.objects if o.name.startswith('kit_') and o.type == 'MESH'}
    for o in protos.values():
        o.hide_render = True
    for p in data['pieces']:
        if p['piece'] in protos:
            place(protos[p['piece']], p)
    # Update 0.0.20 — the floor's look's bars and cores (`style`: floor 3 is stone).
    style = data.get('style', {})
    bars = protos.get(style.get('bars', 'kit_p1_Arch_bars'))
    bs = style.get('barsScale', [1.69, 1.12, 1])
    for g in data['gates'] if bars else []:
        place(bars, {'x': g['x'], 'y': 0, 'z': g['z'], 'rot': g['rot'], 'sx': bs[0], 'sy': bs[1], 'sz': bs[2]})
    # Update 0.0.13 — the walls' and ledges' solid cores (dark), and the slab under the floor.
    core_mat = bpy.data.materials.new('Core')
    core_mat.use_nodes = True
    core_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*style.get('core', [0.196, 0.147, 0.096]), 1)
    verts, faces = [], []
    for b in data.get('cores', []):
        c = to_blender(b['x'], b['y'], b['z'])
        hx, hy, hz = b['w'] / 2, b['d'] / 2, b['h'] / 2
        k = len(verts)
        verts += [(c.x + sx * hx, c.y + sy * hy, c.z + sz * hz) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
        faces += [(k + a, k + b_, k + c_, k + d) for a, b_, c_, d in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3))]
    if verts:
        me = bpy.data.meshes.new('Cores')
        me.from_pydata(verts, [], faces)
        me.materials.append(core_mat)
        cores = bpy.data.objects.new('Cores', me)
        bpy.context.scene.collection.objects.link(cores)
        # Update 0.0.20 — under the lava when the floor has pits (`slabY`).
        bpy.ops.mesh.primitive_plane_add(size=1000, location=(0, 0, data.get('slabY', -0.45)))
        bpy.context.active_object.data.materials.append(core_mat)
    game_boxes(data.get('boxes', []))
    # Update 0.2.4 — the look's colours (the desert's sandstone: `tint`, the floor tile's own `floorTint`) and its sand.
    recolour(style, protos)
    sand_cells(data.get('sand', []), style)
    if args.demon and data.get('demon'):
        demon_at(args.demon, data['demon'])
    for pad in data['pads']:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.85, depth=0.08, location=to_blender(pad['x'], 0.04, pad['z']))
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    scene.view_settings.view_transform = 'Standard'
    for m in bpy.data.materials:
        if m.use_nodes and 'Principled BSDF' in m.node_tree.nodes:
            m.diffuse_color = m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
    if scene.world is None:
        scene.world = bpy.data.worlds.new('W')
    scene.world.color = (0.03, 0.025, 0.035)
    if args.day:
        daylight(scene)
        # Update 0.2.4 — the look's own sky and sun.
        if style.get('sky') is not None:
            scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (*srgb(style['sky']), 1)
        for o in scene.objects:
            if o.type == 'LIGHT' and o.data.type == 'SUN' and style.get('sun') is not None:
                o.data.color = srgb(style['sun'])
    scene.render.resolution_x = args.width
    scene.render.resolution_y = round(args.width * 9 / 16)
    scene.render.image_settings.file_format = 'PNG'
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.clip_start = 0.05
    cam.data.clip_end = 600
    os.makedirs(args.out, exist_ok=True)
    # From above: the whole floor.
    e = data['extent']
    cx = (e['min']['x'] + e['max']['x']) / 2
    cz = (e['min']['z'] + e['max']['z']) / 2
    span = max(e['max']['x'] - e['min']['x'], e['max']['z'] - e['min']['z'])
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = span * 1.05
    cam.location = to_blender(cx, 120, cz)
    cam.rotation_euler = (0, 0, 0)
    scene.render.resolution_y = args.width
    scene.render.filepath = os.path.join(args.out, 'overview.png')
    bpy.ops.render.render(write_still=True)
    scene.render.resolution_y = round(args.width * 9 / 16)
    for c in data['cams']:
        shoot(cam, os.path.join(args.out, c['name'] + '.png'), to_blender(*c['at']), to_blender(*c['to']))


main()
