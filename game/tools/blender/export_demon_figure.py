# Update 0.3.70 — the Playable Demon on the lobby's dais: Hellwarden standing with its sword (public/models/enemies/hellwarden.glb,
# held in a frame of its idle), baked into one static mesh named Char_demon, feet centred on the origin, facing −y, as
# build_lobby_kit.py bakes the others (its own file: the lobby kit's other sources needn't be at hand to add it).
#   blender --background --python tools/blender/export_demon_figure.py -- --model public/models/enemies/hellwarden.glb --glb public/models/menu/demon_figure.glb --previews <folder>
import argparse
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import bake_posed, export_glb, setup_previews, shoot  # noqa: E402

CLIP = 'Sword_Idle'


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--model', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', required=True)
    p.add_argument('--tex', type=int, default=1024)
    return p.parse_args(argv)


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.model))
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    act = bpy.data.actions.get(CLIP) or next(a for a in bpy.data.actions if CLIP in a.name)
    arm.animation_data_create()
    arm.animation_data.action = act
    slots = arm.animation_data.action_suitable_slots
    if slots:
        arm.animation_data.action_slot = slots[0]
    bpy.context.scene.frame_set(int(act.frame_range[0]))
    bpy.context.view_layer.update()
    # (Only what's skinned: the importer also makes a sphere it draws the bones with.)
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and not any(m.type == 'ARMATURE' for m in o.modifiers)]:
        bpy.data.objects.remove(o, do_unlink=True)
    objs = [o for o in bpy.data.objects if o.type in ('ARMATURE', 'MESH')]
    for o in objs:
        if o.type == 'MESH':
            while o.data.color_attributes:
                o.data.color_attributes.remove(o.data.color_attributes[0])
    body = bake_posed(objs, 'Char_demon')
    body.data.name = body.name
    vs = [v.co for v in body.data.vertices]
    floor = min(v.z for v in vs)
    # (Centred on its legs: its sword reaches far out to one side.)
    legs = [v for v in vs if v.z < floor + 0.5]
    cx = (min(v.x for v in legs) + max(v.x for v in legs)) / 2
    cy = (min(v.y for v in legs) + max(v.y for v in legs)) / 2
    body.data.transform(Matrix.Translation((-cx, -cy, -floor)))
    body.data.update()
    d = body.dimensions
    print(f'{body.name}: {d.x:.2f} x {d.y:.2f} x {d.z:.2f} m, {len(body.data.vertices)} vertices')
    for o in list(bpy.data.objects):
        if o is not body:
            bpy.data.objects.remove(o, do_unlink=True)
    for im in bpy.data.images:
        wanted = args.tex // 2 if 'Normal' in im.name else args.tex
        if im.size[0] > wanted:
            im.scale(wanted, wanted)
    setup_previews('BLENDER_WORKBENCH', args.previews)
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    bpy.context.scene.collection.objects.link(sun)
    bpy.context.scene.display.shading.color_type = 'TEXTURE'
    shoot('BLENDER_WORKBENCH', os.path.join(args.previews, 'figure.png'), Vector((0.4, -5, 1.3)), Vector((0, 0, 1.05)), size=(700, 900), vfov=32)
    bpy.data.objects.remove(sun, do_unlink=True)
    export_glb(args.glb, export_image_format='JPEG', export_jpeg_quality=85)


main()
