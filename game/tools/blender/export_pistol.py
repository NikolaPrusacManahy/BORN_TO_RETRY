# Born To Retry — Update 0.2.4: exports the Pistol (the designer: "the pistol gun (not revolver)", Quaternius Guns pack,
# Pistol.blend: a 1911 rigged with Slide, Trigger and Magazine bones) for the game, in parts the game moves itself:
# Frame (the frame, grip and barrel), Slide, Trigger and Magazine, each a mesh of its own (split by the vertex group its
# vertices follow), and markers: Muzzle (the bore's mouth), FrontSight and RearSight (the sights' tops), Ejector (the
# ejection port, where a spent case leaves) and MagBase (the magazine's floor plate).
# Held like the other weapons (armsHold.ts): its origin in the middle of the grip, +y up the grip (the magazine's way
# in), +x across it towards the muzzle (the knuckles' side), scaled to Length metres from muzzle to grip's back.
#
# Run (from game/):
#   blender --background --disable-autoexec --python tools/blender/export_pistol.py -- \
#     --blend "<QUATERNIUS>/Guns/Pistol.blend" --glb public/models/weapons/pistol.glb --length 0.215 --previews <folder>
import argparse
import math
import os
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import export_glb, setup_previews, shoot  # noqa: E402

PARTS = ('Slide', 'Trigger', 'Magazine')
# The game's (x, y, z) as Blender's (x, −z, y): y up there is z up here.
TO_BLENDER = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0))).to_4x4()
# The pack's flat colours (its Diffuse nodes), a little sheen on the metal.
LOOK = {
    'Muzzle': (0.731, 0.743, 0.828, 0.55, 0.35),
    'Magazine': (0.127, 0.129, 0.142, 0.4, 0.5),
    'Metal': (0.27, 0.275, 0.305, 0.45, 0.4),
    'DarkerMetal': (0.17, 0.172, 0.19, 0.45, 0.45),
    'Material.003': (0.219, 0.222, 0.246, 0.45, 0.45),
    'Wood': (0.402, 0.199, 0.071, 0.0, 0.7),
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--blend', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--length', type=float, required=True, help='muzzle to the back of the grip in the game (m)')
    p.add_argument('--previews', required=True)
    p.add_argument('--engine', default='BLENDER_EEVEE')
    return p.parse_args(argv)


def materials():
    for m in bpy.data.materials:
        r, g, b, metal, rough = LOOK.get(m.name, (0.25, 0.25, 0.28, 0.4, 0.45))
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        bsdf.inputs['Base Color'].default_value = (r, g, b, 1)
        bsdf.inputs['Metallic'].default_value = metal
        bsdf.inputs['Roughness'].default_value = rough
        nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])


def part_of(obj, v):
    """The part a vertex moves with: the bone (other than Control) it is weighted to, or the frame."""
    best, weight = 'Frame', 0.01
    for g in v.groups:
        name = obj.vertex_groups[g.group].name
        if name in PARTS and g.weight > weight:
            best, weight = name, g.weight
    return best


def main():
    args = parse_args()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(args.blend), load_ui=False, use_scripts=False)
    src = bpy.data.objects['Muzzle']
    arm = bpy.data.objects['PistolArmature']
    # The grip's line: the magazine bone's, tail (top) minus head (bottom), in world space.
    mag = arm.data.bones['Magazine']
    up = (arm.matrix_world.to_3x3() @ (mag.tail_local - mag.head_local)).normalized()
    if up.z < 0:
        up = -up
    world = src.matrix_world.copy()
    verts = [world @ v.co for v in src.data.vertices]
    parts = [part_of(src, v) for v in src.data.vertices]
    # The muzzle's way: along the slide, +x in the pack's file; across the grip's line, in the plane of the gun.
    ahead = Vector((1, 0, 0))
    ahead = (ahead - up * ahead.dot(up)).normalized()
    side = ahead.cross(up)
    # Into the gun's frame: x ahead, y up the grip, z = x × y (the gun's right). Blender holds it z-up (`TO_BLENDER`), so
    # the .glb, exported y-up, has it so.
    to_gun = Matrix((ahead, up, ahead.cross(up))).to_4x4()
    gun = [to_gun @ v for v in verts]
    mag_pts = [gun[i] for i, p in enumerate(parts) if p == 'Magazine']
    frame_pts = [gun[i] for i, p in enumerate(parts) if p == 'Frame']
    slide_pts = [gun[i] for i, p in enumerate(parts) if p == 'Slide']
    # The grip: from the magazine's floor up to the slide's underside; held in the middle, centred front to back in the
    # frame there.
    lo = min(p.y for p in mag_pts)
    hi = min(p.y for p in slide_pts)
    mid = lo + (hi - lo) * 0.45
    band = [p for p in frame_pts if abs(p.y - mid) < (hi - lo) * 0.08]
    back = min(p.x for p in band)
    # (The grip's front strap: the band's points behind the trigger guard, which reaches further forward.)
    mag_front = max(p.x for p in mag_pts)
    print(f'magazine {min(p.x for p in mag_pts):.2f}..{mag_front:.2f} deep; the band {sorted(round(p.x, 2) for p in band)}')
    front = min((p.x for p in band if p.x > mag_front), default=mag_front)
    cz = (max(p.z for p in band) + min(p.z for p in band)) / 2
    grip = Vector(((back + front) / 2, mid, cz))
    length = max(p.x for p in gun) - back
    scale = args.length / length
    print(f'grip axis {tuple(round(c, 3) for c in up)}, {math.degrees(math.acos(up.z)):.1f} deg from upright')
    print(f'grip {lo:.2f}..{hi:.2f} high, {back:.2f}..{front:.2f} deep; model {length:.2f} long; scale {scale:.4f}')
    place = TO_BLENDER @ Matrix.Scale(scale, 4) @ Matrix.Translation(-grip) @ to_gun @ world

    # Markers, in the gun's frame before scaling.
    xmax = max(p.x for p in slide_pts)
    xmin = min(p.x for p in slide_pts)
    span = xmax - xmin
    front_top = max((p for p in slide_pts if p.x > xmax - span * 0.12), key=lambda p: p.y)
    rear_top = max((p for p in slide_pts if p.x < xmin + span * 0.15), key=lambda p: p.y)
    barrel = [gun[i] for i, p in enumerate(parts) if p == 'Frame' and gun[i].y > hi - 0.1 * (hi - lo)]
    tip = max(p.x for p in barrel)
    mouth = [p for p in barrel if p.x > tip - span * 0.02]
    muzzle = Vector((tip, sum(p.y for p in mouth) / len(mouth), sum(p.z for p in mouth) / len(mouth)))
    top = max(p.y for p in slide_pts)
    eject = Vector((xmin + span * 0.42, top - (top - hi) * 0.25, max(p.z for p in slide_pts)))
    floor = Vector((sum(p.x for p in mag_pts) / len(mag_pts), lo, cz))
    marks = {'Muzzle': muzzle, 'FrontSight': Vector((front_top.x, front_top.y, cz)), 'RearSight': Vector((rear_top.x, rear_top.y, cz)), 'Ejector': eject, 'MagBase': floor}

    # Split the mesh by part.
    materials()
    bm = bmesh.new()
    bm.from_mesh(src.data)
    out = {}
    for name in ('Frame',) + PARTS:
        part = bm.copy()
        drop = [f for f in part.faces if any(parts[v.index] != name for v in f.verts)]
        bmesh.ops.delete(part, geom=drop, context='FACES')
        loose = [v for v in part.verts if not v.link_faces]
        bmesh.ops.delete(part, geom=loose, context='VERTS')
        me = bpy.data.meshes.new(name)
        part.to_mesh(me)
        part.free()
        for m in src.data.materials:
            me.materials.append(m)
        me.transform(place)
        o = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(o)
        out[name] = o
        print(f'{name}: {len(me.vertices)} vertices')
    bm.free()
    for o in list(bpy.data.objects):
        if o.name not in out:
            bpy.data.objects.remove(o, do_unlink=True)
    for name, at in marks.items():
        e = bpy.data.objects.new(name, None)
        e.empty_display_size = 0.01
        e.location = TO_BLENDER @ Matrix.Scale(scale, 4) @ Matrix.Translation(-grip) @ at
        bpy.context.scene.collection.objects.link(e)
        print(f'{name} at {tuple(round(c, 4) for c in e.location)}')

    setup_previews(args.engine, args.previews)
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.rotation_euler = (math.radians(40), 0, math.radians(30))
    bpy.context.scene.collection.objects.link(sun)
    # (Its right side, then from behind and above.)
    shoot(args.engine, os.path.join(args.previews, 'pistol_side.png'), Vector((0.05, -0.45, 0.03)), Vector((0.05, 0, 0.03)), size=(900, 700), vfov=35)
    shoot(args.engine, os.path.join(args.previews, 'pistol_back.png'), Vector((-0.4, -0.12, 0.14)), Vector((0.05, 0, 0.04)), size=(900, 700), vfov=35)
    bpy.data.objects.remove(sun, do_unlink=True)
    export_glb(args.glb)


main()
