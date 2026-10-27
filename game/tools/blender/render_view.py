# M2 — draws the first-person shots written by tools/view-shots.ts: each shot's posed meshes are already in the arms
# camera's space (three.js: the camera at the origin looking down -z, +y up), which is a Blender camera with no
# rotation. A small red dot marks the crosshair.
#   blender --background --python tools/blender/render_view.py -- --json <folder>/shots.json --out <folder>
import argparse
import json
import math
import os
import sys

import bpy


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--json', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--width', type=int, default=1280)
    p.add_argument('--crop', default=None, help='only this part of the frame, as fractions: left,bottom,right,top')
    return p.parse_args(argv)


def material(rgb):
    name = 'm_%.3f_%.3f_%.3f' % tuple(rgb)
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    return mat


def clear():
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)


def add_mesh(m):
    pos = m['pos']
    verts = [(pos[i], pos[i + 1], pos[i + 2]) for i in range(0, len(pos), 3)]
    idx = m['idx']
    faces = [(idx[i], idx[i + 1], idx[i + 2]) for i in range(0, len(idx), 3)]
    me = bpy.data.meshes.new('shot')
    me.from_pydata(verts, [], faces)
    me.validate()
    o = bpy.data.objects.new('shot', me)
    o.data.materials.append(material(m['color']))
    bpy.context.scene.collection.objects.link(o)


def crosshair():
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.004, location=(0, 0, -1))
    bpy.context.active_object.data.materials.append(material((1, 0.05, 0.05)))


def main():
    args = parse_args()
    with open(args.json, encoding='utf-8') as f:
        data = json.load(f)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = False
    scene.view_settings.view_transform = 'Standard'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('ShotWorld')
    scene.world.color = (0.03, 0.025, 0.035)
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_x = args.width
    scene.render.resolution_y = round(args.width / data['aspect'])
    cam = bpy.data.objects.new('ShotCam', bpy.data.cameras.new('ShotCam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle = math.radians(data['fov'])
    cam.data.clip_start = 0.01
    if args.crop:
        scene.render.border_min_x, scene.render.border_min_y, scene.render.border_max_x, scene.render.border_max_y = (float(n) for n in args.crop.split(','))
        scene.render.use_border = True
        scene.render.use_crop_to_border = True
    os.makedirs(args.out, exist_ok=True)
    for shot in data['shots']:
        clear()
        for m in shot['meshes']:
            add_mesh(m)
        crosshair()
        scene.render.filepath = os.path.join(args.out, shot['name'] + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', shot['name'])


main()
