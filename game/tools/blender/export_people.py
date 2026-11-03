# Born To Retry — Update 0.3.22: exports one of the More-enemies pack's people (ASSETS/QUATERNIUS/More-enemies: one rig,
# the same 17 clips) to a .glb for the game's enemies (floor 7's warband: MD/FLOOR7_WARBAND_PLAN.md): the skinned body,
# its materials by name (the game recolours them: engine/norseLooks.ts), every clip, and a weapon from the RPG pack held
# in its right fist (`Fist.R`): its handle through the fist, pointing the way the thumb does, its edge out along the
# forearm, so a chop lands edge first. Prints when the SwordSlash, the Punch and the shot land (the blow lowest and
# furthest forward) and renders its poses.
#
# Run (from game/):
#   blender --background --disable-autoexec --python tools/blender/export_people.py -- \
#     --blend "<More-enemies>/Viking_Male.blend" --glb public/models/enemies/raider.glb --previews <folder> \
#     [--weapon "<Ultimate RPG Pack>/Axe_small.blend" --length 0.36] [--poses Idle:0,Run:8]
# Update 0.3.33 — floor 8's martial artists (tools/ual_people.py bakes the Animation Library's clips on after): the
# weapon in either fist (`--hand L`: the archer's bow), gripped where `--grip` says along it; or a bo staff made here
# (`--staff`: its length a share of the body's height, gripped at its middle), a katana (`--katana`) or a kunai
# (`--kunai`), made here too (the RPG pack's swords and daggers are a knight's).
import argparse
import math
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
    p.add_argument('--weapon', default=None)
    # Its length, a share of the body's height.
    p.add_argument('--length', type=float, default=0.36)
    p.add_argument('--poses', default='Idle:0')
    p.add_argument('--engine', default='BLENDER_EEVEE')
    p.add_argument('--hand', default='R')
    p.add_argument('--grip', type=float, default=0.2)
    p.add_argument('--staff', type=float, default=0)
    p.add_argument('--katana', type=float, default=0)
    p.add_argument('--kunai', type=float, default=0)
    return p.parse_args(argv)


def body_of():
    return [o for o in bpy.data.objects if o.type == 'MESH']


def height_of(meshes):
    dg = bpy.context.evaluated_depsgraph_get()
    lo, hi = 1e9, -1e9
    for o in meshes:
        e = o.evaluated_get(dg)
        m = e.to_mesh()
        for v in m.vertices:
            z = (e.matrix_world @ v.co).z
            lo, hi = min(lo, z), max(hi, z)
        e.to_mesh_clear()
    return hi - lo


def load_weapon(path):
    """The weapon's meshes joined as one, its file's transforms baked in."""
    with bpy.data.libraries.load(os.path.abspath(path), link=False) as (src, dst):
        dst.objects = [n for n in src.objects]
    parts = [o for o in dst.objects if o is not None and o.type == 'MESH']
    for o in parts:
        bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.update()
    if len(parts) > 1:
        with bpy.context.temp_override(active_object=parts[0], object=parts[0], selected_objects=parts, selected_editable_objects=parts):
            bpy.ops.object.join()
    w = parts[0]
    w.data.transform(w.matrix_world)
    w.matrix_world = Matrix.Identity(4)
    w.name = 'Weapon'
    return w


def make_staff():
    """Update 0.3.33 — a bo staff: a long dark wooden pole, banded at its ends (made here: no pack has one)."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.03, depth=1.8, location=(0, 0, 0.9))
    pole = bpy.context.active_object
    wood = bpy.data.materials.new('StaffWood')
    wood.use_nodes = True
    wood.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.16, 0.08, 0.04, 1)
    band = bpy.data.materials.new('StaffBand')
    band.use_nodes = True
    band.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.42, 0.12, 1)
    pole.data.materials.append(wood)
    parts = [pole]
    for z in (0.08, 1.72):
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.036, depth=0.12, location=(0, 0, z))
        b = bpy.context.active_object
        b.data.materials.append(band)
        parts.append(b)
    bpy.context.view_layer.update()
    for o in parts:
        o.data.transform(o.matrix_basis)
        o.matrix_basis = Matrix.Identity(4)
    with bpy.context.temp_override(active_object=pole, object=pole, selected_objects=parts, selected_editable_objects=parts):
        bpy.ops.object.join()
    pole.name = 'Weapon'
    return pole


def flat(name, rgb):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*rgb, 1)
    return m


def blade_piece(parts):
    """The parts (made along +z, the handle's end at 0) as one mesh named Weapon."""
    bpy.context.view_layer.update()
    for o in parts:
        o.data.transform(o.matrix_basis)
        o.matrix_basis = Matrix.Identity(4)
    with bpy.context.temp_override(active_object=parts[0], object=parts[0], selected_objects=parts, selected_editable_objects=parts):
        bpy.ops.object.join()
    w = parts[0]
    w.name = 'Weapon'
    return w


def box(size, loc, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    o.data.materials.append(mat)
    return o


def make_katana():
    """Update 0.3.33 — a katana: a wrapped hilt, a round guard, a long blade curving a little back along its length
    (in four pieces), its edge along x. Along +z, its hilt's end at 0; 1 m long."""
    wrap, guard, steel = flat('KatanaWrap', (0.05, 0.04, 0.05)), flat('KatanaGuard', (0.35, 0.27, 0.1)), flat('KatanaSteel', (0.78, 0.8, 0.84))
    parts = [box((0.032, 0.026, 0.25), (0, 0, 0.125), wrap)]
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.045, depth=0.012, location=(0, 0, 0.26))
    g = bpy.context.active_object
    g.data.materials.append(guard)
    parts.append(g)
    z, y = 0.266, 0.0
    for k in range(4):
        a = 0.018 * (k + 1)
        ln = 0.18
        parts.append(box((0.034 - k * 0.003, 0.007, ln), (0, y + math.sin(a) * ln / 2, z + ln / 2), steel, (-a, 0, 0)))
        z += math.cos(a) * ln
        y += math.sin(a) * ln
    return blade_piece(parts)


def make_kunai():
    """Update 0.3.33 — a kunai: a ring at its end, a wrapped grip, a leaf of a blade. Along +z, 1 m long."""
    wrap, steel = flat('KunaiWrap', (0.12, 0.05, 0.05)), flat('KunaiSteel', (0.42, 0.44, 0.48))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.08, minor_radius=0.018, location=(0, 0, 0.06), rotation=(0, math.pi / 2, 0))
    ring = bpy.context.active_object
    ring.data.materials.append(steel)
    parts = [ring, box((0.05, 0.05, 0.36), (0, 0, 0.32), wrap)]
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.11, radius2=0, depth=0.5, location=(0, 0, 0.75), rotation=(0, 0, math.pi / 4))
    tip = bpy.context.active_object
    tip.scale = (1, 0.25, 1)
    tip.data.materials.append(steel)
    parts.append(tip)
    return blade_piece(parts)


def weapon_axes(w, at=0.2):
    """Its handle's way (grip to head), its edge's way (the head's widest side), where it's gripped (a fifth up the
    handle, on its line: Update 0.3.33, `at` up it) and its length."""
    vs = [v.co.copy() for v in w.data.vertices]
    ext = [max(v[i] for v in vs) - min(v[i] for v in vs) for i in range(3)]
    li = ext.index(max(ext))
    lo = min(v[li] for v in vs)
    hi = max(v[li] for v in vs)
    others = [i for i in range(3) if i != li]
    band = lambda a, b: [v for v in vs if a <= (v[li] - lo) / (hi - lo) <= b]  # noqa: E731
    spread = lambda pts: sum(max(p[i] for p in pts) - min(p[i] for p in pts) for i in others) if pts else 0  # noqa: E731
    top, bottom = band(0.7, 1), band(0, 0.3)
    up = 1 if spread(top) >= spread(bottom) else -1
    head = top if up > 0 else bottom
    handle = bottom if up > 0 else top
    L = Vector((0, 0, 0))
    L[li] = up
    bi = max(others, key=lambda i: max(p[i] for p in head) - min(p[i] for p in head))
    # (The handle's line: its middle across, low on it.)
    mid = [sum(p[i] for p in handle) / len(handle) for i in range(3)]
    side = sum(p[bi] - mid[bi] for p in head) / len(head)
    B = Vector((0, 0, 0))
    B[bi] = 1 if side >= 0 else -1
    grip = Vector(mid)
    grip[li] = lo + (hi - lo) * at if up > 0 else hi - (hi - lo) * at
    return L, B, grip, hi - lo


def grip_weapon(arm, path, length, hand='R', at=0.2, staff=False, made=None):
    """The weapon from `path` in the right fist, posed in the Idle's first frame, riding Fist.R. (Update 0.3.33 — or the
    left, `hand`; gripped `at` up it; or a staff made here.)"""
    scene = bpy.context.scene
    arm.animation_data.action = bpy.data.actions['Idle']
    scene.frame_set(0)
    bpy.context.view_layer.update()
    tall = height_of(body_of())
    w = make_staff() if staff else made() if made else load_weapon(path)
    if made:
        # (Made along +z, its edge along x, gripped `at` up it.)
        L, B, grip, size = Vector((0, 0, 1)), Vector((1, 0, 0)), Vector((0, 0, at)), 1.0
    else:
        L, B, grip, size = weapon_axes(w, at)
    bone = f'Fist.{hand}'
    pb = arm.pose.bones[bone]
    head = arm.matrix_world @ pb.head
    tail = arm.matrix_world @ pb.tail
    down = (tail - head).normalized()
    centre = head + (tail - head) * 0.55
    # The thumb's way: forward (the body faces −y), square to the forearm.
    fwd = Vector((0, -1, 0))
    fwd = (fwd - down * fwd.dot(down)).normalized()
    R = Matrix((fwd, down, fwd.cross(down))).transposed() @ Matrix((L, B, L.cross(B)))
    k = tall * length / size
    w.matrix_world = Matrix.Translation(centre) @ R.to_4x4() @ Matrix.Scale(k, 4) @ Matrix.Translation(-grip)
    bpy.context.view_layer.update()
    world = w.matrix_world.copy()
    w.parent = arm
    w.parent_type = 'BONE'
    w.parent_bone = bone
    bpy.context.view_layer.update()
    w.matrix_world = world
    print(f'weapon {os.path.basename(path) if path else made.__name__[5:] if made else "staff"}: {tall * length:.2f} of {tall:.2f} tall, in {bone}')


def lands(arm, name):
    """The frame of `name` where the body (its weapon too) reaches lowest and furthest forward: the blow landing."""
    action = bpy.data.actions.get(name)
    if not action:
        return None
    arm.animation_data.action = action
    f0, f1 = (int(round(f)) for f in action.frame_range)
    best = None
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        reach = -1e9
        for o in body_of():
            e = o.evaluated_get(dg)
            m = e.to_mesh()
            for v in m.vertices:
                p = e.matrix_world @ v.co
                reach = max(reach, -p.y - 0.3 * max(0.0, p.z - 1.6))
            e.to_mesh_clear()
        if best is None or reach > best[1]:
            best = (f, reach)
    fps = bpy.context.scene.render.fps
    print(f'{name.upper()} LANDS: frame {best[0] - f0} of {f1 - f0} ({(best[0] - f0) / max(1, f1 - f0):.2f} of the clip; {(f1 - f0) / fps:.2f} s at {fps} fps)')
    return best[0] - f0


def main():
    args = parse_args()
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(args.blend), load_ui=False, use_scripts=False)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    if not arm.animation_data:
        arm.animation_data_create()
    print('actions:', ', '.join(f'{a.name} ({int(a.frame_range[1] - a.frame_range[0])})' for a in bpy.data.actions))
    made = make_katana if args.katana else make_kunai if args.kunai else None
    if args.weapon or args.staff or made:
        length = args.staff or args.katana or args.kunai or args.length
        grip_weapon(arm, args.weapon, length, args.hand, 0.5 if args.staff else 0.13 if args.katana else 0.3 if args.kunai else args.grip, bool(args.staff), made)
    marks = {name: lands(arm, name) for name in ('SwordSlash', 'Punch', 'Shoot_OneHanded')}

    setup_previews(args.engine, args.previews)
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.rotation_euler = (math.radians(50), 0, math.radians(20))
    sun.data.energy = 3
    bpy.context.scene.collection.objects.link(sun)
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.75, 0.78, 0.82, 1)
    bpy.context.scene.world = world
    tall = height_of(body_of())
    for pose in args.poses.split(','):
        name, frame = pose.split(':')
        frame = marks.get(name) if frame == 'lands' else int(frame)
        if not bpy.data.actions.get(name):
            continue
        arm.animation_data.action = bpy.data.actions[name]
        bpy.context.scene.frame_set(frame or 0)
        shoot(args.engine, os.path.join(args.previews, f'{name}.png'), Vector((tall * 0.9, -tall * 1.8, tall * 0.7)), Vector((0, 0, tall * 0.45)), size=(700, 700), vfov=40)
    bpy.data.objects.remove(sun, do_unlink=True)
    arm.animation_data.action = bpy.data.actions['Idle']
    bpy.context.scene.frame_set(0)

    for o in bpy.context.scene.objects:
        o.select_set(o.type in ('MESH', 'ARMATURE'))
    os.makedirs(os.path.dirname(os.path.abspath(args.glb)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=args.glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_animations=True, export_animation_mode='ACTIONS', export_skins=True, export_lights=False, export_cameras=False)
    print(f'exported {args.glb}')


main()
