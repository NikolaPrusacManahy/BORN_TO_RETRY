# Update 0.0.12 — draws a dungeon floor written by tools/dungeon-shots.ts with the real kit (public/models/dungeon/
# kit.glb): every placement as a linked copy of its kit piece, the gates' bars down (as when a room fights), then an
# overview from above and the camera spots it lists. The game is y up, Blender z up: (x, y, z) → (x, −z, y).
#   blender --background --python tools/blender/render_dungeon.py -- --json <folder>/dungeon.json --kit public/models/dungeon/kit.glb --out <folder>
# Update 0.0.13 — `--day`: Blender's sun and sky in place of the flat studio light, a rough stand-in for the game's
# daylight (engine/dungeonView.ts): the same sky colour and sun direction, not its renderer.
import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--json', required=True)
    p.add_argument('--kit', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--width', type=int, default=1280)
    p.add_argument('--day', action='store_true')
    return p.parse_args(argv)


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
    bars = protos.get('kit_p1_Arch_bars')
    for g in data['gates'] if bars else []:
        place(bars, {'x': g['x'], 'y': 0, 'z': g['z'], 'rot': g['rot'], 'sx': 1.69, 'sy': 1.12, 'sz': 1})
    # Update 0.0.13 — the walls' and ledges' solid cores (dark), and the slab under the floor.
    core_mat = bpy.data.materials.new('Core')
    core_mat.use_nodes = True
    core_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.196, 0.147, 0.096, 1)
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
        bpy.ops.mesh.primitive_plane_add(size=1000, location=(0, 0, -0.45))
        bpy.context.active_object.data.materials.append(core_mat)
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
