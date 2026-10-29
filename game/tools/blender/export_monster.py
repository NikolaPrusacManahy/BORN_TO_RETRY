# Born To Retry — exports an Ultimate Monsters character to a .glb for the game's enemies: the skinned mesh, any
# weapon on its rig, every animation (Idle, Run, Weapon, HitReact, Death, …) and its palette texture. Also prints
# when its weapon swing lands (where the weapon's tip is lowest and furthest forward in the "Weapon" clip), so the
# game can time a strike to the animation.
#
# Run (from game/):
#   blender --background --disable-autoexec --python tools/blender/export_monster.py -- \
#     --blend "<Ultimate Monsters>/used_monster/blobs/Orc.blend" --glb public/models/enemies/orc.glb --previews <folder>
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import setup_previews, shoot  # noqa: E402


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--blend', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', required=True)
    p.add_argument('--engine', default='BLENDER_EEVEE')
    # Update 0.0.12 — the clip to time (where its blow lands): 'Weapon' for the Orc and the Yeti, 'Bite_Front' for the
    # Wizard's spit.
    p.add_argument('--attack', default='Weapon')
    return p.parse_args(argv)


def swing_timing(arm, action_name):
    """Frame by frame through `action_name`: where the character's lowest-and-most-forward point is (the swing
    landing). Characters face −y; returns (impact frame, frame count)."""
    action = bpy.data.actions.get(action_name)
    if not action:
        return None
    arm.animation_data.action = action
    f0, f1 = (int(round(f)) for f in action.frame_range)
    best = None
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        reach = -1e9
        for o in bpy.data.objects:
            if o.type != 'MESH':
                continue
            e = o.evaluated_get(dg)
            m = e.to_mesh()
            for v in m.vertices:
                w = e.matrix_world @ v.co
                # Forward (−y) counts, height above the waist counts against: a club coming down in front.
                score = -w.y - 0.5 * max(0.0, w.z - 0.9)
                reach = max(reach, score)
            e.to_mesh_clear()
        print(f'  {action_name} frame {f}: reach {reach:.2f}')
        if best is None or reach > best[1]:
            best = (f, reach)
    return best[0] - f0, f1 - f0


def main():
    args = parse_args()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(args.blend), load_ui=False, use_scripts=False)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    if not arm.animation_data:
        arm.animation_data_create()
    print('actions:', ', '.join(a.name for a in bpy.data.actions))
    timing = swing_timing(arm, args.attack)
    if timing:
        hit, frames = timing
        fps = bpy.context.scene.render.fps
        print(f'{args.attack.upper()} SWING: lands at frame {hit} of {frames} ({hit / frames:.2f} of the clip; {frames / fps:.2f} s at {fps} fps)')

    setup_previews(args.engine, args.previews)
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.rotation_euler = (math.radians(50), 0, math.radians(20))
    bpy.context.scene.collection.objects.link(sun)
    # Update 0.1.19 — some packs hide the mesh from renders (the Skeleton): show it for the previews; an idle clip may
    # carry the monster's name (Skeleton_Idle).
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            o.hide_render = False
    idle = next((a.name for a in bpy.data.actions if a.name == 'Idle' or a.name.endswith('_Idle')), 'Idle')
    for name, frame in ((idle, 0), (args.attack, timing[0] if timing else 0)):
        if bpy.data.actions.get(name):
            arm.animation_data.action = bpy.data.actions[name]
            bpy.context.scene.frame_set(frame)
            shoot(args.engine, os.path.join(args.previews, f'{name}.png'), Vector((2.8, -5.5, 2.2)), Vector((0, 0, 1.2)), size=(900, 900), vfov=40)
    bpy.data.objects.remove(sun, do_unlink=True)
    arm.animation_data.action = bpy.data.actions.get(idle)
    bpy.context.scene.frame_set(0)

    # Update 0.0.18 — some packs were saved in pose mode, where the select operator won't run: select by hand.
    for o in bpy.context.scene.objects:
        o.select_set(o.type in ('MESH', 'ARMATURE'))
    os.makedirs(os.path.dirname(os.path.abspath(args.glb)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=args.glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_animations=True, export_animation_mode='ACTIONS', export_skins=True, export_lights=False, export_cameras=False)
    print(f'exported {args.glb}')


main()
