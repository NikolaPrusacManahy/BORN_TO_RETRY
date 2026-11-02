# Update 0.0.15 — the boss in its stance for render_dungeon.py (`--demon` <its .glb>): scaled to its size, facing as the
# game turns it. Update 0.3.16 — out of render_dungeon.py (it had been lost from it in 0.3.13's split), and at a height
# (`y`: the Big Shark swims), in its Swim when it has neither Wave nor Idle.
import math
import os

import bpy
from mathutils import Vector


def demon_at(path, d):
    """The boss in its stance (Wave, Idle or Swim), its height `height`, at `x`, `y` (its feet; 0 when not given), `z`,
    turned to `yaw`."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
    new = [o for o in bpy.data.objects if o not in before]
    arm = next((o for o in new if o.type == 'ARMATURE'), None)
    # (Not the importer's bone shape, an Icosphere beside the armature: hidden. Every other top object.)
    shapes = {pb.custom_shape for pb in arm.pose.bones if pb.custom_shape} if arm else set()
    for o in shapes:
        o.hide_render = True
    new = [o for o in new if o not in shapes]
    roots = [o for o in new if o.parent is None] or new[:1]
    if arm and arm.animation_data is None:
        arm.animation_data_create()
    act = next((a for a in bpy.data.actions if a.name.endswith(('Wave', 'Idle', 'Swim'))), None)
    if arm and act:
        arm.animation_data.action = act
        bpy.context.scene.frame_set(30)
    bpy.context.view_layer.update()
    zs = [(o.matrix_world @ Vector(c)).z for o in new if o.type == 'MESH' for c in o.bound_box]
    h = max(zs) - min(zs) if zs else 1
    k = d['height'] / h
    for root in roots:
        root.scale = (k, k, k)
        root.location = Vector((d['x'], -d['z'], d.get('y', 0)))
        root.rotation_mode = 'XYZ'
        root.rotation_euler.z = d['yaw'] + math.pi
    bpy.context.view_layer.update()
