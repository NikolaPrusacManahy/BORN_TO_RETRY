# Born To Retry — builds the main-menu scene from Quaternius's Modular Dungeon Pack: a staircase climbing to an
# arched gate with a portcullis, in a sandstone wall with pillars, torches and banners, and a bright glow behind the
# bars. Dressed with horse statues, crates, a campfire and dead trees from the Ultimate Nature Pack (both flat colour).
# Exports one .glb with named nodes the game uses:
#   Portcullis           the gate bars (raised when you press Start)
#   Torch_L / Torch_R    torch flames (the game puts flickering lights there)
#   Campfire             the campfire's flame (another flickering light)
#   GateGlow             the bright panel behind the gate
#   Cam_Menu, Cam_Menu_Look           the low-angle menu shot (camera position, look-at point)
# and renders previews of the menu shot with Eevee, gate shut and gate open.
#
# Run (from game/):
#   blender --background --disable-autoexec --python tools/blender/build_menu_scene.py -- \
#     --kit "<Modular Dungeon Pack folder>" --nature "<Ultimate Nature Pack folder>" \
#     --glb public/models/menu/gate.glb --previews <folder>
#
# Layout (Blender: z up, the scene's front faces -y). The lower floor is z = 0; the stairs rise 4 m from y = -4 to
# y = 0; the landing and the gate wall sit at z = 4, the wall plane at y = 2.
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scene_kit import export_glb, flat_material, load_pieces, marker, place, setup_previews, shoot  # noqa: E402

PIECES = ['Arch', 'Arch_bars', 'Wall_Modular', 'WallCover_Modular', 'Column', 'Stairs_Modular', 'Stairs_SideCover',
          'Floor_Modular', 'Torch', 'Banner_wall', 'Cobweb', 'Skull', 'Brick']
# The dressing (Update 0.0.5). These load with their file's transforms baked in and multi-part pieces joined, so
# each is one mesh standing on its origin; RECENTER pieces are also centred on it (the statue sits off-centre).
DRESS_KIT = ['Statue_Horse', 'Crate', 'Barrel', 'Barrel2', 'Woodfire', 'Floor_BricksSeparate']
DRESS_NATURE = ['BirchTree_Dead_3', 'BirchTree_Dead_5']
RECENTER = {'Statue_Horse'}

MENU_VFOV = 50  # the menu shot's vertical FOV (degrees); the game's menu camera uses the same
LANDING = 4.0   # height of the landing and the gate's sill
WALL_Y = 2.0    # the gate wall's plane
WALL_FACE = WALL_Y - 0.22  # its front face
GATE_LIFT = 2.6  # how far Start raises the portcullis (the game's INTRO.gateLift); more pokes it out of the wall's top
# Where the trees grow (the designer: no tree on paving). The floor tile there is left out for a bed of earth, its
# loose stones heaped round it. (x, y, floor top) of tile centres; tiles sit on odd x and y.
TREE_BEDS = [(11, -3, 0.0), (-11, 1, LANDING)]


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--kit', required=True)
    p.add_argument('--nature', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', required=True)
    p.add_argument('--engine', default='BLENDER_EEVEE')
    return p.parse_args(argv)


#   Half the width of the fortress (m): wide enough that the menu shot never sees its ends.
HALF_WIDTH = 16


def build(protos):
    # Floors: the lower yard (top at z = 0) and the landing (top at z = 4) running in through the gate.
    # The yard is paved right up to the retaining wall (it used to stop 4 m short, under the statues and crates).
    for x in range(-HALF_WIDTH - 1, HALF_WIDTH + 2, 2):
        for y in range(-21, 0, 2):
            if (x, y, 0.0) not in TREE_BEDS:
                place(protos, 'Floor_Modular', (x, y, -0.13))
        for y in range(1, 10, 2):
            if (x, y, LANDING) not in TREE_BEDS:
                place(protos, 'Floor_Modular', (x, y, LANDING - 0.13))
    # The landing's front: a retaining wall from the yard up to the landing, either side of the stairs.
    for row in range(2):
        for x in range(3, HALF_WIDTH + 2, 2):
            place(protos, 'Wall_Modular', (x + 0.3, -0.22, 1 + row * 2))
            place(protos, 'Wall_Modular', (-x - 0.3, -0.22, 1 + row * 2))
    for x in range(3, HALF_WIDTH + 2, 2):
        place(protos, 'WallCover_Modular', (x + 0.3, -0.22, LANDING + 1.01 - 0.4))
        place(protos, 'WallCover_Modular', (-x - 0.3, -0.22, LANDING + 1.01 - 0.4))
    # Stairs: two blocks wide, two blocks up (each block rises 2 m over 2 m towards +y), with side walls.
    for x in (-1, 1):
        place(protos, 'Stairs_Modular', (x, -3, 1))
        place(protos, 'Stairs_Modular', (x, -1, 3))
    for (y, z) in ((-3, 1), (-1, 3)):
        place(protos, 'Stairs_SideCover', (1, y, z))
        place(protos, 'Stairs_SideCover', (-1, y, z), scale=(-1, 1, 1))
    # The gate: the arch on the landing, the portcullis in it.
    place(protos, 'Arch', (0, WALL_Y, LANDING))
    place(protos, 'Arch_bars', (0, WALL_Y, LANDING), name='Portcullis')
    # The wall: three rows of 2 m blocks on each side of the arch, a row over it, grey caps on top.
    side = [3.05 + 2 * i for i in range(int((HALF_WIDTH - 2) / 2) + 1)]
    for row in range(3):
        z = LANDING + 1 + row * 2
        for x in side:
            place(protos, 'Wall_Modular', (x, WALL_Y, z))
            place(protos, 'Wall_Modular', (-x, WALL_Y, z))
    top = LANDING + 6
    for x in (-1.025, 1.025):
        place(protos, 'Wall_Modular', (x, WALL_Y, top - 1), scale=(1.025, 1, 1))
    for x in [-x for x in side] + [-1.025, 1.025] + side:
        place(protos, 'WallCover_Modular', (x, WALL_Y, top + 1.01))
    # Pillars: two stacked columns each side of the gate and along the wall, standing on the landing.
    for x in (-3.4, 3.4, -9.4, 9.4, -15.4, 15.4):
        place(protos, 'Column', (x, WALL_Y - 0.5, LANDING))
        place(protos, 'Column', (x, WALL_Y - 0.5, LANDING + 4.07))
    # Torches on the inner pillars' fronts; banners on the wall.
    pillar_front = WALL_Y - 0.5 - 0.65
    place(protos, 'Torch', (-3.4, pillar_front - 0.29, LANDING + 2.4), name='TorchMount_L')
    place(protos, 'Torch', (3.4, pillar_front - 0.29, LANDING + 2.4), name='TorchMount_R')
    marker('Torch_L', (-3.4, pillar_front - 0.25, LANDING + 2.4 + 0.75))
    marker('Torch_R', (3.4, pillar_front - 0.25, LANDING + 2.4 + 0.75))
    for x in (-6.05, 6.05, -12.05, 12.05):
        place(protos, 'Banner_wall', (x, WALL_FACE - 0.5, LANDING + 5.6))
    # Flavour: cobwebs in the arch's corners, skulls and loose bricks by the stairs.
    place(protos, 'Cobweb', (-1.5, WALL_FACE - 0.35, LANDING + 2.9), rot_z=0)
    place(protos, 'Skull', (2.6, -4.8, 0), rot_z=-30)
    place(protos, 'Skull', (-3.1, -6.2, 0), rot_z=160)
    place(protos, 'Brick', (-2.6, -4.6, 0), rot_z=25)
    place(protos, 'Brick', (3.3, -7.4, 0), rot_z=-70)
    place(protos, 'Brick', (0.7, 0.9, LANDING), rot_z=12)

    # The glow behind the bars: a bright panel a few metres inside.
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, WALL_Y + 4, LANDING + 2.2), rotation=(math.radians(90), 0, 0))
    glow = bpy.context.active_object
    glow.name = 'GateGlow'
    glow.scale = (5, 4.4, 1)
    mat = bpy.data.materials.new('GateGlow')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (1.0, 0.95, 0.85, 1)
    em.inputs['Strength'].default_value = 6
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(em.outputs[0], out.inputs[0])
    glow.data.materials.append(mat)

    # The menu shot: low, out past the foot of the stairs, looking up at the gate.
    marker('Cam_Menu', (-2.2, -14, 0.5))
    marker('Cam_Menu_Look', (0.6, WALL_Y, LANDING + 4.6))


# Statue turn (degrees): the statue faces −y (the camera) unturned; this angles the left one outward, and the right one
# is its mirror image.
STATUE_TURN = -30


def dress(protos):
    """Update 0.0.5 — props and trees. The low shot never sees the yard's floor (the frame's bottom edge crosses the
    retaining wall about 0.9 m up), so only tall things read: statues, stacked crates, scaled-up trees. Bushes and
    green trees behind the wall only showed as lumps, so there are none. The left stays calm behind the menu buttons;
    the right is warm with a campfire and clutter."""
    # Two horse statues guarding the foot of the stairs.
    place(protos, 'Statue_Horse', (-4.4, -2.6, 0), rot_z=STATUE_TURN)
    place(protos, 'Statue_Horse', (4.4, -2.6, 0), rot_z=-STATUE_TURN, scale=(-1, 1, 1))
    # The right: a campfire before the statue, crates and barrels against the wall, a tall dead birch at the edge.
    place(protos, 'Woodfire', (5.4, -5.4, 0), rot_z=20)
    marker('Campfire', (5.4, -5.4, 0.55))
    place(protos, 'Barrel2', (6.4, -1.3, 0), rot_z=30)
    place(protos, 'Crate', (7.6, -1.2, 0), rot_z=8)
    place(protos, 'Crate', (7.7, -1.15, 1.31), rot_z=-12, scale=(0.9, 0.9, 0.9))
    place(protos, 'Barrel', (9.0, -1.2, 0))
    right_bed, left_bed = TREE_BEDS
    tree_bed(protos, *right_bed)
    place(protos, 'BirchTree_Dead_5', right_bed, rot_z=200, scale=(2.1, 2.1, 2.1))
    # The left, up on the landing (clear of the buttons below): a pale dead tree to answer the right one.
    tree_bed(protos, *left_bed)
    place(protos, 'BirchTree_Dead_3', left_bed, rot_z=70, scale=(2.2, 2.2, 2.2))


def tree_bed(protos, x, y, top):
    """Earth where a flagstone was lifted, a little below the paving, with loose stones heaped round its edge."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, top - 0.21))
    bed = bpy.context.active_object
    bed.name = 'TreeBed'
    bed.scale = (1.98, 1.98, 0.3)
    bed.data.materials.append(flat_material('Soil', (0.06, 0.04, 0.025)))
    for dx, dy, rot in ((-0.95, 0.55, 20), (0.8, -0.95, -35), (0.95, 0.85, 70)):
        place(protos, 'Floor_BricksSeparate', (x + dx, y + dy, top - 0.08), rot_z=rot)


def preview_lights():
    """Lights for the Blender previews only (the game adds its own)."""
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.01, 0.018, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1
    for name, energy in (('Torch_L', 900), ('Torch_R', 900), ('Campfire', 700)):
        l = bpy.data.lights.new(name + '_light', 'POINT')
        l.energy = energy
        l.color = (1.0, 0.55, 0.22)
        l.shadow_soft_size = 0.3
        o = bpy.data.objects.new(name + '_light', l)
        o.location = bpy.data.objects[name].location + Vector((0, -0.3, 0))
        scene.collection.objects.link(o)
    moon = bpy.data.lights.new('Moon', 'SUN')
    moon.energy = 1.2
    moon.color = (0.55, 0.62, 1.0)
    mo = bpy.data.objects.new('Moon', moon)
    mo.rotation_euler = (math.radians(55), math.radians(-20), math.radians(-25))
    scene.collection.objects.link(mo)
    glow = bpy.data.lights.new('Glow', 'AREA')
    glow.energy = 1500
    glow.size = 4
    glow.color = (1.0, 0.95, 0.85)
    go = bpy.data.objects.new('Glow', glow)
    go.location = (0, WALL_Y + 3.5, LANDING + 2.2)
    go.rotation_euler = (math.radians(-90), 0, 0)
    scene.collection.objects.link(go)


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    protos = load_pieces(args.kit, PIECES, {})
    load_pieces(args.kit, DRESS_KIT, protos, bake=True, recenter=RECENTER)
    load_pieces(args.nature, DRESS_NATURE, protos, bake=True)
    build(protos)
    dress(protos)

    setup_previews(args.engine, args.previews)
    preview_lights()
    m = bpy.data.objects
    # The menu shot, with the game's menu lens: the gate shut, then raised as far as Start raises it.
    gate = m['Portcullis']
    shoot(args.engine, os.path.join(args.previews, 'Cam_Menu.png'), m['Cam_Menu'].location, m['Cam_Menu_Look'].location, vfov=MENU_VFOV)
    gate.location.z += GATE_LIFT
    shoot(args.engine, os.path.join(args.previews, 'Cam_Menu_open.png'), m['Cam_Menu'].location, m['Cam_Menu_Look'].location, vfov=MENU_VFOV)
    gate.location.z -= GATE_LIFT
    # Close-ups of the tree beds (the menu shot never sees the trees' feet).
    for name, at, look in (('Detail_TreeBed_R', (13.5, -7.5, 4.5), (11, -3, 0.3)), ('Detail_TreeBed_L', (-8.0, -3.0, 8.5), (-11, 1, 4.3))):
        shoot(args.engine, os.path.join(args.previews, f'{name}.png'), at, look, size=(1000, 700), vfov=50)

    export_glb(args.glb)


main()
