# M1 — cuts first-person arms out of a rigged Quaternius character and renders previews. The process for a new
# character is in MD/PIPELINE_CHARACTER_ARMS.md.
#
# Every mesh skinned to the character's skeleton keeps only the vertices mostly moved by an arm bone (upper arm
# down to the fingertips): sleeves, gloves and bracers stay, the head, torso, legs, feet and props go. The
# skeleton stays, and a .glb is exported in the rest pose. Previews:
#   rest.png  the cut arms in the rest (T) pose, from the front, to check what was kept
#   fp.png    the arms in the guard from the player's eye, framed exactly like the game (68° vertical FOV, 2:1)
#   side.png  the guard from the side
#   hand.png  a close-up of the left fist, to judge the fingers and thumb
#   export.png  what the .glb holds: the rest pose with the fists already closed (unless --open-hands)
#
# Run (from game/):
#   blender --background --disable-autoexec <character.blend> --python tools/blender/cut_arms.py -- \
#     --glb <out.glb> --previews <folder> [--keep 0.5] [--thumb 0,0,0.9]
import argparse
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ARM_PREFIXES = ('UpperArm', 'LowerArm', 'Hand', 'Wrist', 'Fist', 'Index', 'Middle', 'Ring', 'Pinky', 'Thumb')
FINGERS = ('Index', 'Middle', 'Ring', 'Pinky')
# Bones the cut and the guard pose rely on (Quaternius' humanoid naming). A rig without them stops the script.
REQUIRED_BONES = ['Head'] + [f'{b}.{s}' for s in 'LR' for b in ('UpperArm', 'LowerArm', 'Hand', 'Middle2', 'Middle3', 'Middle4')]


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', required=True)
    p.add_argument('--keep', type=float, default=0.5, help='arm weight a vertex needs to be kept')
    # 0,0,0.9 tucks the Quaternius thumb across the fist (picked from close-ups of six x/y/z variants).
    p.add_argument('--thumb', default='0,0,0.9', help='thumb joint rotation in the guard pose (x,y,z radians, left hand)')
    # The game poses only the arms, so the export's rest pose has the fists already closed.
    p.add_argument('--open-hands', dest='bake_fists', action='store_false', help='export open hands (T-pose) instead of baked fists')
    p.add_argument('--guard-json', default=None, help='a JSON file overriding GUARD entries, to preview other guards: {"L": {"fist": [x, y, z], ...}}')
    return p.parse_args(argv)


def is_arm_group(name):
    return name.startswith(ARM_PREFIXES)


def skinned_meshes(arm):
    """Every mesh the skeleton deforms (body, clothes, gloves...)."""
    return [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object is arm for m in o.modifiers)]


def apply_mirrors(o):
    """Bakes Mirror modifiers in: the glTF export skips them, and a mirrored glove would lose its other half."""
    for m in [m for m in o.modifiers if m.type == 'MIRROR']:
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
            bpy.ops.object.modifier_apply(modifier=m.name)


def cut_arms(mesh, keep):
    """Deletes every vertex of `mesh` whose arm-bone weight is under `keep`. Returns (kept, removed)."""
    arm_groups = {g.index for g in mesh.vertex_groups if is_arm_group(g.name)}
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    deform = bm.verts.layers.deform.active
    if deform is None:
        doomed = list(bm.verts)
    else:
        doomed = [v for v in bm.verts if sum(w for gi, w in v[deform].items() if gi in arm_groups) < keep]
    bmesh.ops.delete(bm, geom=doomed, context='VERTS')
    kept = len(bm.verts)
    bm.to_mesh(mesh.data)
    bm.free()
    mesh.data.validate()  # deleting vertices can leave bad edges the glTF exporter warns about
    return kept, len(doomed)


# The guard (armature space; the character faces -y, its left is +x): both fists low in the corners of the
# screen, pointing forward, backs of the hands towards you, the left a little further out than the right.
#   fist: where the fist's centre goes, from the point between the shoulders (tuned on the Adventurer, whose
#   arms reach REF_REACH; other characters are scaled by their own reach); knuckles: the way it points;
#   back: the way the back of the hand faces; pole: the way the elbow bends out.
GUARD = {
    'L': dict(fist=(0.27, -0.30, -0.032), knuckles=(-0.204, -0.967, 0.153), back=(0.7, 0.35, 0.6), pole=(1, 0.3, -0.6)),
    'R': dict(fist=(-0.26, -0.25, -0.042), knuckles=(0.304, -0.931, 0.202), back=(-0.7, 0.35, 0.6), pole=(-1, 0.2, -0.8)),
}
# Update 0.0.3 — the gameplay guard: fists in the lower corners, the centre clear (the first, photo-based guard
# put the left fist almost on the crosshair). Mirrored in game/src/engine/viewmodel/guard.ts.
#   Upper arm + forearm length of the Adventurer (m).
REF_REACH = 0.417
#   Wrist to the fist's centre (m).
FIST_REACH = 0.09
#   How far the fist turns from the forearm's line towards `knuckles` (0 = dead straight wrist).
WRIST_BEND = 0.5
#   The arms sit this far in front of the eye, as first-person games do: these arms are too short to frame the
#   guard from the anatomical eye. The game places them in front of its camera the same way.
VIEW_BACK = 0.12


def frame(y, z):
    """A rotation whose y axis is `y` and whose z axis is as close to `z` as it can be."""
    y = y.normalized()
    z = (z - y * z.dot(y)).normalized()
    return Matrix((y.cross(z), y, z)).transposed()


def orient(arm, name, y_dir, back_dir):
    """Turns a bone to point along `y_dir` with the back of the hand (world +z in the T-pose, palms down)
    facing `back_dir`. Its head stays where its parent put it."""
    bpy.context.view_layer.update()
    rest = arm.data.bones[name].matrix_local.to_3x3()
    turn = frame(Vector(y_dir), Vector(back_dir)) @ frame(rest @ Vector((0, 1, 0)), Vector((0, 0, 1))).inverted()
    pb = arm.pose.bones[name]
    m = (turn @ rest).to_4x4()
    m.translation = pb.head.copy()
    pb.matrix = m
    bpy.context.view_layer.update()


def bone_length(arm, name):
    b = arm.data.bones[name]
    return (b.tail_local - b.head_local).length


def solve_elbow(shoulder, wrist, upper, fore, pole):
    """Two-bone IK: where the elbow goes so the arm reaches `wrist`, bending towards `pole`."""
    to_wrist = wrist - shoulder
    d = min(to_wrist.length, (upper + fore) * 0.999)
    u = to_wrist.normalized()
    along = (upper * upper - fore * fore + d * d) / (2 * d)
    out = math.sqrt(max(0.0, upper * upper - along * along))
    p = (pole - u * pole.dot(u)).normalized()
    return shoulder + u * along + p * out


def curl_sign(arm, side):
    """Which way a positive x rotation curls this hand's fingers: towards the palm (down in the T-pose) is +1."""
    clear_pose(arm)
    tip = arm.pose.bones[f'Middle4.{side}']
    before = tip.tail.z
    for joint in (2, 3, 4):
        arm.pose.bones[f'Middle{joint}.{side}'].rotation_mode = 'XYZ'
        arm.pose.bones[f'Middle{joint}.{side}'].rotation_euler = (0.6, 0, 0)
    bpy.context.view_layer.update()
    sign = 1 if tip.tail.z < before else -1
    clear_pose(arm)
    return sign


def pose_fingers(arm, side, curl, thumb):
    """Closes one hand into a fist. `curl` already carries this hand's sign; `thumb` is the left thumb's
    rotation (mirrored on the right)."""
    sx = 1 if side == 'L' else -1
    for f in FINGERS:
        for joint in (2, 3, 4):
            pb = arm.pose.bones.get(f'{f}{joint}.{side}')
            if pb:
                pb.rotation_mode = 'XYZ'
                pb.rotation_euler = (curl, 0, 0)
    for joint in (2, 3):
        pb = arm.pose.bones.get(f'Thumb{joint}.{side}')
        if pb:
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (thumb[0], thumb[1] * sx, thumb[2] * sx)


def bake_fists(arm, meshes, signs, curl, thumb):
    """Makes closed fists the rest pose (mesh and skeleton), so the game only has to move the arms."""
    clear_pose(arm)
    for side in 'LR':
        pose_fingers(arm, side, curl * signs[side], thumb)
    bpy.context.view_layer.update()
    for o in meshes:
        mod = next(m for m in o.modifiers if m.type == 'ARMATURE')
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active = arm
    with bpy.context.temp_override(object=arm, active_object=arm, selected_objects=[arm]):
        bpy.ops.object.mode_set(mode='POSE')
        bpy.ops.pose.armature_apply(selected=False)
        bpy.ops.object.mode_set(mode='OBJECT')
    for o in meshes:
        m = o.modifiers.new('Armature', 'ARMATURE')
        m.object = arm
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
            bpy.ops.object.modifier_move_to_index(modifier=m.name, index=0)
    bpy.context.view_layer.update()


def guard_pose(arm, curl, thumb):
    """Poses both arms in the guard with closed fists. `thumb` is the left thumb's joint rotation (mirrored on
    the right)."""
    signs = {side: curl_sign(arm, side) for side in GUARD}
    between = (arm.pose.bones['UpperArm.L'].head + arm.pose.bones['UpperArm.R'].head) / 2
    for side, g in GUARD.items():
        shoulder = arm.pose.bones[f'UpperArm.{side}'].head.copy()
        upper = bone_length(arm, f'UpperArm.{side}')
        fore = bone_length(arm, f'LowerArm.{side}')
        knuckles = Vector(g['knuckles']).normalized()
        wrist = between + Vector(g['fist']) * ((upper + fore) / REF_REACH) - knuckles * FIST_REACH
        elbow = solve_elbow(shoulder, wrist, upper, fore, Vector(g['pole']))
        back = Vector(g['back'])
        # The upper arm keeps its back half-way between up and the hand's, so the elbow doesn't twist hard.
        orient(arm, f'UpperArm.{side}', elbow - shoulder, (back.normalized() + Vector((0, 0, 1))))
        orient(arm, f'LowerArm.{side}', wrist - elbow, back)
        orient(arm, f'Hand.{side}', (wrist - elbow).normalized().lerp(knuckles, WRIST_BEND), back)
        pose_fingers(arm, side, curl * signs[side], thumb)
    bpy.context.view_layer.update()
    print(f'finger curl signs: {signs}')
    return signs


def clear_pose(arm):
    for pb in arm.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.image_settings.file_format = 'PNG'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('PreviewWorld')
    scene.world.color = (0.05, 0.045, 0.06)
    cam = bpy.data.objects.new('PreviewCam', bpy.data.cameras.new('PreviewCam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.lens_unit = 'FOV'
    cam.data.clip_start = 0.01
    return cam


def shoot(cam, path, location, target, fov_deg=100, vertical=False, size=(1280, 720)):
    """Renders from `location` looking at `target`. `vertical`: `fov_deg` is the vertical FOV (as the game's arms
    camera uses), otherwise the horizontal one."""
    cam.location = location
    cam.rotation_euler = (Vector(target) - Vector(location)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.sensor_fit = 'VERTICAL' if vertical else 'AUTO'
    cam.data.angle = math.radians(fov_deg)
    bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = size
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f'rendered {path}')


def main():
    args = parse_args()
    if args.guard_json:
        with open(args.guard_json, encoding='utf-8') as f:
            for side, entry in json.load(f).items():
                GUARD[side].update({k: tuple(v) for k, v in entry.items()})
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    missing = [b for b in REQUIRED_BONES if b not in arm.data.bones]
    if missing:
        sys.exit(f'cut_arms: this rig is missing {missing} (expected Quaternius humanoid bone names)')

    kept_meshes = []
    skinned = skinned_meshes(arm)
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o not in skinned]:
        bpy.data.objects.remove(o, do_unlink=True)  # props that aren't skinned
    for o in skinned:
        apply_mirrors(o)
        kept, removed = cut_arms(o, args.keep)
        print(f'arms: {o.name}: kept {kept} vertices, removed {removed}')
        if kept == 0:
            bpy.data.objects.remove(o, do_unlink=True)
        else:
            kept_meshes.append(o)
    for i, o in enumerate(kept_meshes):
        o.name = 'Arms' if i == 0 else f'Arms_{i}'

    os.makedirs(args.previews, exist_ok=True)
    cam = setup_render()
    eye = arm.matrix_world @ arm.pose.bones['Head'].head
    eye = Vector((0, eye.y - 0.06 + VIEW_BACK, eye.z + 0.03))  # eye level, pulled back by VIEW_BACK
    shoulders = (arm.matrix_world @ arm.pose.bones['UpperArm.L'].head).z

    clear_pose(arm)
    shoot(cam, os.path.join(args.previews, 'rest.png'), (0, -2.2, shoulders), (0, 0, shoulders), fov_deg=50)
    thumb = [float(v) for v in args.thumb.split(',')]
    signs = guard_pose(arm, curl=1.4, thumb=thumb)
    # The game's arms camera: 68° vertical FOV, here on a 2:1 screen like the designer's.
    shoot(cam, os.path.join(args.previews, 'fp.png'), tuple(eye), (0, eye.y - 1.0, eye.z - 0.18), fov_deg=68, vertical=True, size=(1600, 800))
    shoot(cam, os.path.join(args.previews, 'side.png'), (1.3, -0.35, shoulders + 0.02), (0, -0.3, shoulders - 0.05), fov_deg=45)
    fist = arm.matrix_world @ arm.pose.bones['Hand.L'].tail
    shoot(cam, os.path.join(args.previews, 'hand.png'), tuple(fist + Vector((0.18, -0.45, 0.2))), tuple(fist), fov_deg=35)

    if args.bake_fists:
        bake_fists(arm, kept_meshes, signs, 1.4, thumb)
        shoot(cam, os.path.join(args.previews, 'export.png'), (0, -2.2, shoulders), (0, 0, shoulders), fov_deg=50)
    else:
        clear_pose(arm)
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    for o in kept_meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    os.makedirs(os.path.dirname(os.path.abspath(args.glb)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=args.glb, export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_yup=True)
    print(f'exported {args.glb}')


main()
