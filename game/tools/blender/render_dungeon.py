# Update 0.0.12 — draws a dungeon floor written by tools/dungeon-shots.ts with the real kit (public/models/dungeon/
# kit.glb): every placement as a linked copy of its kit piece, the gates' bars down (as when a room fights), then an
# overview from above and the camera spots it lists. The game is y up, Blender z up: (x, y, z) → (x, −z, y).
#   blender --background --python tools/blender/render_dungeon.py -- --json <folder>/dungeon.json --kit public/models/dungeon/kit.glb --out <folder>
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
    return p.parse_args(argv)


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
