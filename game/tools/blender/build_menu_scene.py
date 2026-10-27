# Born To Retry — builds the main-menu scene from Quaternius's Modular Dungeon Pack: a staircase climbing to an
# arched gate with a portcullis, in a sandstone wall with pillars, torches and banners, and a bright glow behind the
# bars. Exports one .glb with named nodes the game uses:
#   Portcullis           the gate bars (raised when you press Start)
#   Torch_L / Torch_R    torch flames (the game puts flickering lights there)
#   GateGlow             the bright panel behind the gate
#   Cam_Menu, Cam_Menu_Look           the low-angle menu shot (camera position, look-at point)
# and renders previews of the menu shot with Eevee, gate shut and gate open.
#
# Run (from game/):
#   blender --background --disable-autoexec --python tools/blender/build_menu_scene.py -- \
#     --kit "<Modular Dungeon Pack folder>" --glb public/models/menu/gate.glb --previews <folder>
#
# Layout (Blender: z up, the scene's front faces -y). The lower floor is z = 0; the stairs rise 4 m from y = -4 to
# y = 0; the landing and the gate wall sit at z = 4, the wall plane at y = 2.
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

PIECES = ['Arch', 'Arch_bars', 'Wall_Modular', 'WallCover_Modular', 'Column', 'Stairs_Modular', 'Stairs_SideCover',
          'Floor_Modular', 'Torch', 'Banner_wall', 'Cobweb', 'Skull', 'Brick']

MENU_VFOV = 50  # the menu shot's vertical FOV (degrees); the game's menu camera uses the same
LANDING = 4.0   # height of the landing and the gate's sill
WALL_Y = 2.0    # the gate wall's plane
WALL_FACE = WALL_Y - 0.22  # its front face
GATE_LIFT = 2.6  # how far Start raises the portcullis (the game's INTRO.gateLift); more pokes it out of the wall's top


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--kit', required=True)
    p.add_argument('--glb', required=True)
    p.add_argument('--previews', required=True)
    p.add_argument('--engine', default='BLENDER_EEVEE')
    return p.parse_args(argv)


def load_pieces(kit):
    protos = {}
    kit = os.path.abspath(kit)  # Blender reads a relative library path against the open .blend, not the shell
    for name in PIECES:
        with bpy.data.libraries.load(os.path.join(kit, name + '.blend'), link=False) as (src, dst):
            dst.objects = [n for n in src.objects]
        mesh_obj = next(o for o in dst.objects if o is not None and o.type == 'MESH')
        protos[name] = mesh_obj
    for img in bpy.data.images:
        if img.name != 'Render Result' and img.packed_file is None:
            print(f'warning: image {img.name} is not packed ({img.filepath})')
    return protos


def place(protos, piece, loc, rot_z=0.0, scale=(1, 1, 1), name=None):
    src = protos[piece]
    o = bpy.data.objects.new(name or piece, src.data)
    o.location = loc
    o.rotation_euler = (0, 0, math.radians(rot_z))
    o.scale = scale
    bpy.context.scene.collection.objects.link(o)
    return o


def marker(name, loc):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    e.empty_display_size = 0.3
    bpy.context.scene.collection.objects.link(e)
    return e


#   Half the width of the fortress (m): wide enough that the menu shot never sees its ends.
HALF_WIDTH = 16


def build(protos):
    # Floors: the lower yard (top at z = 0) and the landing (top at z = 4) running in through the gate.
    for x in range(-HALF_WIDTH - 1, HALF_WIDTH + 2, 2):
        for y in range(-21, -3, 2):
            place(protos, 'Floor_Modular', (x, y, -0.13))
        for y in range(1, 10, 2):
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


def preview_lights():
    """Lights for the Blender previews only (the game adds its own)."""
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.01, 0.018, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1
    for name in ('Torch_L', 'Torch_R'):
        l = bpy.data.lights.new(name + '_light', 'POINT')
        l.energy = 900
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


def shoot(engine, path, at, look, size=(1600, 800), vfov=60):
    scene = bpy.context.scene
    cam = scene.camera
    cam.location = at
    cam.rotation_euler = (Vector(look) - Vector(at)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle = math.radians(vfov)
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f'rendered {path}')


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    protos = load_pieces(args.kit)
    build(protos)

    os.makedirs(args.previews, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = args.engine
    scene.render.image_settings.file_format = 'PNG'
    cam = bpy.data.objects.new('PreviewCam', bpy.data.cameras.new('PreviewCam'))
    cam.data.clip_start = 0.05
    scene.collection.objects.link(cam)
    scene.camera = cam
    preview_lights()
    m = bpy.data.objects
    # The menu shot, with the game's menu lens: the gate shut, then raised as far as Start raises it.
    gate = m['Portcullis']
    shoot(args.engine, os.path.join(args.previews, 'Cam_Menu.png'), m['Cam_Menu'].location, m['Cam_Menu_Look'].location, vfov=MENU_VFOV)
    gate.location.z += GATE_LIFT
    shoot(args.engine, os.path.join(args.previews, 'Cam_Menu_open.png'), m['Cam_Menu'].location, m['Cam_Menu_Look'].location, vfov=MENU_VFOV)
    gate.location.z -= GATE_LIFT

    # Export the scene: meshes and markers only (the game lights it itself).
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:
        if o.type in ('MESH', 'EMPTY'):
            o.select_set(True)
    os.makedirs(os.path.dirname(os.path.abspath(args.glb)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=args.glb, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_lights=False, export_cameras=False)
    print(f'exported {args.glb}')


main()
