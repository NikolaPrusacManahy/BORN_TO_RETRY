# Born To Retry — builds the settings screen's scene: a small forest clearing at night with a campfire, logs to sit
# on and a ring of trees (Ultimate Nature Pack; the fire is the Modular Dungeon Pack's, both flat colour). The logs
# and the fire-ring stones are simple low-poly shapes made here (the nature pack's own logs and rocks aren't in
# ASSETS yet). Exports one .glb with named nodes the game uses:
#   Campfire                         the fire's flame (a flickering light)
#   Cam_Camp, Cam_Camp_Look          the settings shot: sat on a log, the fire on the left, room on the right for
#                                    the options panel
#   Cam_Camp_From                    where the camera glides in from
#   Ground                           the forest floor (every tree, log and bush stands on it)
# and renders previews with Eevee.
#
# Run (from game/):
#   blender --background --disable-autoexec --python tools/blender/build_camp_scene.py -- \
#     --kit "<Modular Dungeon Pack folder>" --nature "<Ultimate Nature Pack folder>" \
#     --glb public/models/menu/camp.glb --previews <folder>
#
# Layout (Blender: z up). The fire is at the origin; the camera sits south of it (−y) looking north-east.
import argparse
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import export_glb, flat_material, load_pieces, marker, place, setup_previews, shoot  # noqa: E402

CAMP_VFOV = 50  # the settings shot's vertical FOV (degrees); the game's camp camera uses the same
SEED = 11  # the trees and bushes are placed from this, so every export is the same
TREES = ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5',
         'BirchTree_1', 'BirchTree_2', 'BirchTree_3', 'BirchTree_4', 'BirchTree_5']
BUSHES = ['Bush_1', 'Bush_2', 'BushBerries_1', 'BushBerries_2']
CAMERA = (-0.6, -4.0, 1.05)
LOOK = (1.6, 0.0, 1.0)
FROM = (-1.5, -7.0, 1.7)
# Trees keep out of the clearing; bushes keep this far from the camera so none fills the shot.
CLEARING = 5.5
BUSH_CLEAR = 2.5
# Spacing so nothing grows into anything else (m): between trunks, and from a bush to a bush or a trunk.
TREE_GAP = 2.0
BUSH_GAP = 1.8


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--kit', required=True)
    p.add_argument('--nature', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', required=True)
    p.add_argument('--engine', default='BLENDER_EEVEE')
    return p.parse_args(argv)


def ground():
    """The forest floor, and the trodden dirt of the clearing round the fire."""
    bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0))
    g = bpy.context.active_object
    g.name = 'Ground'
    g.data.materials.append(flat_material('ForestFloor', (0.03, 0.04, 0.022)))
    bpy.ops.mesh.primitive_circle_add(vertices=28, radius=3.6, fill_type='NGON', location=(0, 0, 0.015))
    c = bpy.context.active_object
    c.name = 'Clearing'
    c.data.materials.append(flat_material('Dirt', (0.07, 0.05, 0.034)))


def log(loc, length, radius, rot_z):
    """A low-poly log lying on the ground: bark round the sides, pale cut ends."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=length, location=(loc[0], loc[1], radius * 0.92), rotation=(0, math.radians(90), math.radians(rot_z)))
    o = bpy.context.active_object
    o.name = 'Log'
    o.data.materials.append(flat_material('Bark', (0.11, 0.065, 0.04)))
    o.data.materials.append(flat_material('WoodCut', (0.42, 0.3, 0.18)))
    for f in o.data.polygons:
        f.material_index = 1 if len(f.vertices) > 4 else 0
    return o


def fire_ring(rng, count=9, radius=0.62):
    """Stones round the fire: squashed, jittered low-poly spheres."""
    mat = flat_material('Stone', (0.15, 0.15, 0.16))
    for i in range(count):
        a = 2 * math.pi * i / count + rng.uniform(-0.12, 0.12)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.15, location=(math.cos(a) * radius, math.sin(a) * radius, 0.05))
        s = bpy.context.active_object
        s.name = 'FireStone'
        for v in s.data.vertices:
            v.co *= 0.85 + 0.3 * rng.random()
        s.scale = (1.25, 1.0, 0.7)
        s.rotation_euler = (0, 0, rng.uniform(0, math.tau))
        s.data.materials.append(mat)


def build(protos):
    rng = random.Random(SEED)
    ground()
    # The fire, its stones, and the logs: one behind it, one to its left, and the one the camera sits on.
    place(protos, 'Woodfire', (0, 0, 0), rot_z=15, scale=(1.4, 1.4, 1.4))
    marker('Campfire', (0, 0, 0.6))
    fire_ring(rng)
    log((0.4, 1.8, 0), 2.6, 0.22, 4)
    log((-1.5, 1.0, 0), 2.2, 0.2, 50)
    log((CAMERA[0], CAMERA[1] - 0.45, 0), 2.4, 0.22, -6)
    # Two rings of trees round the clearing, the inner one close enough to wall it in. Nothing grows into anything
    # else: trunks keep TREE_GAP apart, bushes BUSH_GAP from each other and from trunks.
    cam = Vector(CAMERA[:2])
    trunks = []
    for count, r0, r1 in ((14, CLEARING + 1.0, CLEARING + 4.0), (26, CLEARING + 5.0, CLEARING + 14.0)):
        for i in range(count):
            for _ in range(30):
                a = 2 * math.pi * (i + rng.uniform(-0.35, 0.35)) / count
                spot = Vector((math.cos(a), math.sin(a))) * rng.uniform(r0, r1)
                if all((spot - t).length >= TREE_GAP for t in trunks):
                    break
            else:
                continue
            trunks.append(spot)
            s = rng.uniform(2.1, 2.8)
            place(protos, rng.choice(TREES), (spot.x, spot.y, 0), rot_z=rng.uniform(0, 360), scale=(s, s, s))
    # Bushes at the clearing's edge, none crowding the camera.
    bushes = []
    while len(bushes) < 6:
        a = rng.uniform(0, math.tau)
        spot = Vector((math.cos(a), math.sin(a))) * rng.uniform(CLEARING - 0.4, CLEARING + 2.0)
        if (spot - cam).length < BUSH_CLEAR or any((spot - o).length < BUSH_GAP for o in bushes + trunks):
            continue
        bushes.append(spot)
        s = rng.uniform(0.9, 1.25)
        place(protos, rng.choice(BUSHES), (spot.x, spot.y, 0), rot_z=rng.uniform(0, 360), scale=(s, s, s))
    marker('Cam_Camp', CAMERA)
    marker('Cam_Camp_Look', LOOK)
    marker('Cam_Camp_From', FROM)


def preview_lights():
    """Lights for the Blender previews only (the game adds its own)."""
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.008, 0.011, 0.024, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 3
    # Like the game's fire light: no shadows (with them, the fire's own stacked logs smother it).
    fire = bpy.data.lights.new('Fire_light', 'POINT')
    fire.energy = 1500
    fire.color = (1.0, 0.55, 0.22)
    fire.use_shadow = False
    fo = bpy.data.objects.new('Fire_light', fire)
    fo.location = bpy.data.objects['Campfire'].location
    scene.collection.objects.link(fo)
    moon = bpy.data.lights.new('Moon', 'SUN')
    moon.energy = 0.9
    moon.color = (0.55, 0.62, 1.0)
    mo = bpy.data.objects.new('Moon', moon)
    mo.rotation_euler = (math.radians(50), math.radians(25), math.radians(150))
    scene.collection.objects.link(mo)
    # The flame glows by itself, as the game makes it (the light sits inside it).
    for mat in bpy.data.materials:
        if mat.name.startswith('Fire') and mat.use_nodes and 'Principled BSDF' in mat.node_tree.nodes:
            bsdf = mat.node_tree.nodes['Principled BSDF']
            bsdf.inputs['Emission Color'].default_value = (1.0, 0.48, 0.13, 1)
            bsdf.inputs['Emission Strength'].default_value = 4


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    protos = load_pieces(args.kit, ['Woodfire'], {}, bake=True)
    load_pieces(args.nature, TREES + BUSHES, protos, bake=True)
    build(protos)

    setup_previews(args.engine, args.previews)
    preview_lights()
    m = bpy.data.objects
    shoot(args.engine, os.path.join(args.previews, 'Cam_Camp.png'), m['Cam_Camp'].location, m['Cam_Camp_Look'].location, size=(1600, 900), vfov=CAMP_VFOV)
    shoot(args.engine, os.path.join(args.previews, 'Cam_Camp_From.png'), m['Cam_Camp_From'].location, m['Cam_Camp_Look'].location, size=(1600, 900), vfov=CAMP_VFOV)
    shoot(args.engine, os.path.join(args.previews, 'Overview.png'), (0, -16, 22), (0, 0, 0), size=(1200, 900), vfov=50)

    export_glb(args.glb)


main()
