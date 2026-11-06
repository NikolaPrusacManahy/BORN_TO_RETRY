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
    # Update 0.1.6 — the game draws only the front of each face (three.js FrontSide): this draws it the same, so a
    # face seen from behind vanishes here as it does there (the fingers once looked whole here and were gone in game).
    p.add_argument('--cull', action='store_true', help='hide faces seen from behind, as the game does')
    # Update 0.3.70 — a character whose colours are in its texture (the Playable Demon): the shots carry UVs.
    p.add_argument('--image', default=None, help="draw every mesh with UVs with this texture")
    # Update 0.3.71 — the Demon's trail (it has its own vertex colours, added over the rest): 'solid' leaves it out, 'trail'
    # draws only it, on black, to add over the solid pass.
    # Update 0.3.89 — 'vsolid': as 'solid', but a mesh with `vcol` is drawn in those colours (Gravity Sean's stone plates).
    p.add_argument('--pass', dest='part', default=None, choices=['solid', 'trail', 'vsolid'])
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


def textured(path):
    mat = bpy.data.materials.get('textured')
    if mat:
        return mat
    mat = bpy.data.materials.new('textured')
    mat.use_nodes = True
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = bpy.data.images.load(os.path.abspath(path))
    mat.node_tree.nodes.active = node
    return mat


def add_mesh(m, image=None):
    pos = m['pos']
    verts = [(pos[i], pos[i + 1], pos[i + 2]) for i in range(0, len(pos), 3)]
    idx = m['idx']
    faces = [(idx[i], idx[i + 1], idx[i + 2]) for i in range(0, len(idx), 3)]
    me = bpy.data.meshes.new('shot')
    me.from_pydata(verts, [], faces)
    me.validate()
    # (Update 0.3.42 — a mesh the game shades smooth (`smooth`: The Swarm's tubes) drawn smooth here too.)
    if m.get('smooth'):
        me.shade_smooth()
    colors = m.get('colors')
    if colors:
        layer = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        for i in range(len(verts)):
            layer.data[i].color = (colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2], 1)
    o = bpy.data.objects.new('shot', me)
    uv = m.get('uv') if image else None
    if uv:
        layer = me.uv_layers.new(name='UV')
        for loop in me.loops:
            i = loop.vertex_index
            layer.data[loop.index].uv = (uv[i * 2], 1 - uv[i * 2 + 1])  # (glTF's v runs down)
    o.data.materials.append(textured(image) if uv else material(m['color']))
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
    scene.display.shading.color_type = 'VERTEX' if args.part in ('trail', 'vsolid') else 'TEXTURE' if args.image else 'MATERIAL'
    if args.part == 'trail':
        scene.display.shading.light = 'FLAT'
    scene.display.shading.show_shadows = False
    scene.display.shading.show_backface_culling = args.cull
    scene.view_settings.view_transform = 'Standard'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('ShotWorld')
    scene.world.color = (0, 0, 0) if args.part == 'trail' else (0.03, 0.025, 0.035)
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
            if (args.part in ('solid', 'vsolid') and m.get('colors')) or (args.part == 'trail' and not m.get('colors')):
                continue
            if args.part == 'vsolid':
                m['colors'] = m.get('vcol') or m['color'] * (len(m['pos']) // 3)
            add_mesh(m, args.image)
        # (Update 0.2.4 — a shot may have its own lens: the Pistol aimed narrows the arms'.)
        cam.data.angle = math.radians(shot.get('fov', data['fov']))
        if args.part != 'trail':
            crosshair()
        scene.render.filepath = os.path.join(args.out, shot['name'] + '.png')
        bpy.ops.render.render(write_still=True)
        print('rendered', shot['name'])


main()
