# Update 0.3.18 — exports one of the Ultimate Space Kit's spaceships (no rig: it flies in code) to a .glb for the
# game's enemies: its mesh (all its parts joined), centred over its origin with its base at it, its palette made a
# Principled base colour (nearest pixel), as export_monster.py does for the kit's characters. A top view and a side
# view to see which way its nose points.
#   blender --background --disable-autoexec --python tools/blender/export_ship.py -- --blend <ship.blend> --glb <out.glb> --previews <folder>
import argparse
import os
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import setup_previews, shoot  # noqa: E402


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--blend', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', required=True)
    return p.parse_args(argv)


def principled():
    """Its Diffuse material made Principled, its palette the base colour, sampled to the nearest pixel."""
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nodes = m.node_tree.nodes
        tex = next((n for n in nodes if n.type == 'TEX_IMAGE' and n.image), None)
        if not tex or not any(n.type == 'BSDF_DIFFUSE' for n in nodes):
            continue
        image = tex.image
        nodes.clear()
        out = nodes.new('ShaderNodeOutputMaterial')
        bsdf = nodes.new('ShaderNodeBsdfPrincipled')
        bsdf.inputs['Roughness'].default_value = 1
        t = nodes.new('ShaderNodeTexImage')
        t.image = image
        t.interpolation = 'Closest'
        m.node_tree.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        m.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])


def main():
    args = parse_args()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(args.blend), load_ui=False, use_scripts=False)
    principled()
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in bpy.data.objects:
        o.select_set(o in meshes)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    ship = bpy.context.view_layer.objects.active
    ship.data.transform(ship.matrix_world)
    ship.matrix_world = Matrix.Identity(4)
    vs = [v.co for v in ship.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    ship.data.transform(Matrix.Translation((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)))
    size = hi - lo
    print(f'SHIP size {size.x:.2f} x {size.y:.2f} x {size.z:.2f}')
    setup_previews('BLENDER_WORKBENCH', args.previews)
    bpy.context.scene.display.shading.light = 'STUDIO'
    bpy.context.scene.display.shading.color_type = 'TEXTURE'
    far = max(size) * 1.6
    shoot('BLENDER_WORKBENCH', os.path.join(args.previews, 'top.png'), Vector((0, 0.01, far)), Vector((0, 0, 0)), size=(700, 700), vfov=40)
    shoot('BLENDER_WORKBENCH', os.path.join(args.previews, 'side.png'), Vector((far, 0, size.z / 2)), Vector((0, 0, size.z / 2)), size=(700, 700), vfov=40)
    for o in bpy.data.objects:
        o.select_set(o == ship)
    os.makedirs(os.path.dirname(os.path.abspath(args.glb)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=args.glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=True)
    print(f'exported {args.glb}')


main()
