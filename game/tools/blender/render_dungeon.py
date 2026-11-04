# Update 0.0.12 — draws a dungeon floor written by tools/dungeon-shots.ts with the real kit (public/models/dungeon/
# kit.glb): every placement as a linked copy of its kit piece, the gates' bars down (as when a room fights), then an
# overview from above and the camera spots it lists. The game is y up, Blender z up: (x, y, z) → (x, −z, y).
#   blender --background --python tools/blender/render_dungeon.py -- --json <folder>/dungeon.json --kit public/models/dungeon/kit.glb --out <folder>
# Update 0.0.13 — `--day`: Blender's sun and sky in place of the flat studio light, a rough stand-in for the game's
# daylight (engine/dungeonView.ts): the same sky colour and sun direction, not its renderer.
# Update 0.0.15 — the boss room (tools/boss-shots.ts): coloured boxes by their game matrices (the wooden gate, the
# dark), and the Demon in its stance (`--demon` <its .glb>).
# Update 0.2.9 — the lobby (tools/lobby-shots.ts): more than one kit (`--kit` again: the lobby's own pieces and its
# characters, lobby_… and Char_…), the locked characters as black silhouettes, and the boards with what they say. Its
# roof: `roof` pieces and boxes marked `noShadow` cast none (the game's roof doesn't), chandelier `rings`; `interior`
# with --day: no sun or sky, a warm fill from all round, a key light from above and point `lights` (watts).
# Update 0.2.10 — floor 5's tide at high water (`water`: its level and the rooms it floods), see-through green.
# Update 0.2.23 — floor 2's: ash beds (`ash` cells), the boss room's charred pieces (the look's `burnt`).
# Update 0.3.13 — the boxes made straight into the scene, sharing one cube and a material a colour (floor 8 has
# thousands).
# Update 0.3.21 — the manor: the fill's colour under its roof (`fill`), top-down cuts at more than one height (`cuts`:
# under the roof, under the upper floors), and lit `glow` boxes (the windows' daylight).
# Update 0.3.43 — floor 10's Hell (`hell`: hell_look.py): its chains and braziers, the lava in its stone, its sky.
import argparse
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from demon_at import demon_at  # noqa: E402 (Update 0.3.16 — the boss in its stance: demon_at.py)
import hell_look  # noqa: E402


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--json', required=True)
    p.add_argument('--kit', required=True, action='append')
    p.add_argument('--out', required=True)
    p.add_argument('--width', type=int, default=1280)
    p.add_argument('--day', action='store_true')
    p.add_argument('--demon', default='')
    return p.parse_args(argv)


# Game (y up) to Blender (z up): (x, y, z) → (x, −z, y).
TO_B = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def cube_mesh(name, inside):
    """A unit cube (`inside`: turned inside out)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    if inside:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(None)
    return me


def game_boxes(boxes):
    """Unit cubes placed by game matrices (column-major, as Three.js writes them), each in its colour; black ones
    shadeless (the dark). Update 0.3.13 — one cube shared by them all (one inside out for the dark), one material a
    colour, made straight into the scene: floor 8's machinery is two thousand of them, too many to add one by one."""
    cubes = {}
    mats = {}
    for i, b in enumerate(boxes):
        e = b['m']
        gm = Matrix([[e[c * 4 + r] for c in range(4)] for r in range(4)])
        dark = sum(b['color']) == 0
        if dark not in cubes:
            cubes[dark] = cube_mesh('BoxInside' if dark else 'BoxCube', dark)
        glow = bool(b.get('glow'))
        key = (tuple(b['color']), dark, glow)
        mat = mats.get(key)
        if mat is None:
            mat = bpy.data.materials.new(f'Box{len(mats)}')
            mat.use_nodes = True
            col = (*b['color'], 1)
            bsdf = mat.node_tree.nodes['Principled BSDF']
            bsdf.inputs['Base Color'].default_value = col
            if glow:
                # Update 0.3.21 — lit from inside (a window's daylight).
                bsdf.inputs['Emission Color'].default_value = col
                bsdf.inputs['Emission Strength'].default_value = 2.5
            if dark:
                # The dark: drawn from the inside only, as the game does (its near side never hides what's in it).
                bsdf.inputs['Roughness'].default_value = 1
                bsdf.inputs['Specular IOR Level'].default_value = 0
                mat.use_backface_culling = True
            mat.diffuse_color = col
            mats[key] = mat
        o = bpy.data.objects.new(f'Box{i}', cubes[dark])
        bpy.context.scene.collection.objects.link(o)
        o.matrix_world = TO_B @ gm @ TO_B.inverted()
        o.material_slots[0].link = 'OBJECT'
        o.material_slots[0].material = mat
        if b.get('noShadow'):
            o.visible_shadow = False


def write_boards(boards):
    """Update 0.2.9 — each board: a dark panel, its lines centred down it (each shrunk to fit), in its tone."""
    tones = {'gold': (1.0, 0.62, 0.16), 'text': (0.86, 0.82, 0.76), 'dim': (0.22, 0.2, 0.2)}
    mats = {}
    for name, col in [('BoardBack', (0.018, 0.015, 0.018))] + [(f'Ink_{t}', c) for t, c in tones.items()]:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bsdf = m.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = (*col, 1)
        if name != 'BoardBack':
            bsdf.inputs['Emission Color'].default_value = (*col, 1)
            bsdf.inputs['Emission Strength'].default_value = 1.5
        m.diffuse_color = (*col, 1)
        mats[name] = m
    for i, b in enumerate(boards):
        rot = (math.pi / 2, 0, b['rot'])
        normal = Vector((math.sin(b['rot']), -math.cos(b['rot']), 0))
        centre = to_blender(b['x'], b['y'], b['z'])
        bpy.ops.mesh.primitive_plane_add(size=1, location=centre, rotation=rot)
        panel = bpy.context.active_object
        panel.scale = (b['w'], b['h'], 1)
        panel.data.materials.append(mats['BoardBack'])
        lines = b['lines']
        total = sum(l['size'] * 1.3 for l in lines) * b['h']
        top = total / 2
        for j, l in enumerate(lines):
            h = l['size'] * b['h']
            cu = bpy.data.curves.new(f'Board{i}_{j}', 'FONT')
            cu.body = l['text']
            cu.size = h
            cu.align_x = 'CENTER'
            cu.align_y = 'CENTER'
            t = bpy.data.objects.new(f'Board{i}_{j}', cu)
            t.rotation_euler = rot
            t.location = centre + normal * 0.03 + Vector((0, 0, top - h * 0.65))
            top -= h * 1.3
            t.data.materials.append(mats['Ink_' + l['tone']])
            bpy.context.scene.collection.objects.link(t)
            bpy.context.view_layer.update()
            if t.dimensions.x > b['w'] * 0.92:
                k = b['w'] * 0.92 / t.dimensions.x
                t.scale = (k, k, k)


def interior(scene, data):
    """Update 0.2.9 — under a roof: a warm fill from all round, a key light from high above, the point lights."""
    scene.render.engine = 'BLENDER_EEVEE'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('W')
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*data.get('fill', (0.42, 0.34, 0.26)), 1)
    bg.inputs['Strength'].default_value = 1.0
    key = bpy.data.objects.new('Key', bpy.data.lights.new('Key', 'SUN'))
    key.data.energy = 1.6
    key.data.color = (1.0, 0.9, 0.75)
    key.data.angle = math.radians(8)
    key.rotation_euler = Vector((-0.15, -0.25, 1)).normalized().to_track_quat('Z', 'Y').to_euler()
    scene.collection.objects.link(key)
    for i, l in enumerate(data.get('lights', [])):
        lo = bpy.data.objects.new(f'Lamp{i}', bpy.data.lights.new(f'Lamp{i}', 'POINT'))
        lo.data.energy = l['w']
        lo.data.color = l['color']
        lo.data.shadow_soft_size = 0.3
        lo.location = to_blender(l['x'], l['y'], l['z'])
        scene.collection.objects.link(lo)


def water_sheets(data, style):
    """Update 0.2.10 — the tide's water over each room it floods, at its level, see-through."""
    w = data.get('water')
    if not w:
        return
    mat = bpy.data.materials.new('Water')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    col = (*srgb(style.get('water', 0x2b7880)), 1)
    bsdf.inputs['Base Color'].default_value = col
    bsdf.inputs['Roughness'].default_value = 0.12
    bsdf.inputs['Alpha'].default_value = 0.72
    mat.diffuse_color = (*col[:3], 0.72)
    try:
        mat.surface_render_method = 'BLENDED'
    except AttributeError:
        mat.blend_method = 'BLEND'
    for r in w['rooms']:
        bpy.ops.mesh.primitive_plane_add(size=1, location=to_blender(r['x'], w['level'], r['z']))
        o = bpy.context.active_object
        o.scale = (r['w'], r['d'], 1)
        o.data.materials.append(mat)
        o.visible_shadow = False


def rings(data):
    """Update 0.2.9 — the chandeliers' iron rings."""
    mat = bpy.data.materials.new('Iron')
    mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.02, 0.02, 0.022, 1)
    for r in data.get('rings', []):
        bpy.ops.mesh.primitive_torus_add(major_radius=r['r'], minor_radius=0.05, location=to_blender(r['x'], r['y'], r['z']))
        o = bpy.context.active_object
        o.data.materials.append(mat)
        o.visible_shadow = False


def srgb(h):
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def recolour(style, protos):
    """Update 0.2.4 — each kit material to the look's colour (by its name before any ".001"); the floor tile's own."""
    tint, floor_tint = style.get('tint') or {}, style.get('floorTint') or {}
    if not tint and not floor_tint:
        return
    fl = protos.get(style.get('floor'))
    burnt = style.get('burnt') or {}
    for name, h in burnt.items():
        o = protos.get(name)
        for i, m in enumerate(o.data.materials if o else []):
            mm = m.copy()
            mm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb(h), 1)
            o.data.materials[i] = mm
    for o in protos.values():
        if o.name in burnt:
            continue
        for i, m in enumerate(o.data.materials):
            if m is None or not m.use_nodes or 'Principled BSDF' not in m.node_tree.nodes:
                continue
            base = m.name.split('.')[0]
            want = floor_tint.get(base) if o is fl and base in floor_tint else tint.get(base)
            if want is None:
                continue
            mm = m.copy()
            mm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*srgb(want), 1)
            o.data.materials[i] = mm


def sand_cells(cells, style):
    """Update 0.2.4 — loose sand: a flat tile per cell (quicksand darker). Update 0.2.23 — each kind one mesh (a floor of
    beds has thousands of cells: one object each took Blender most of an hour)."""
    for quick, ash in ((False, False), (True, False), (False, True)):
        mat = bpy.data.materials.new('Quicksand' if quick else 'Ash' if ash else 'Sand')
        mat.use_nodes = True
        col = srgb(style.get('ash', 0x3b3631) if ash else style.get('quicksand' if quick else 'sand', 0xb98a4c if quick else 0xe6c27e))
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*col, 1)
        mat.diffuse_color = (*col, 1)
        verts, faces = [], []
        for c in cells:
            if c['quick'] != quick or bool(c.get('ash')) != ash:
                continue
            k = len(verts)
            for dx, dz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                verts.append(to_blender(c['x'] + dx, 0.015, c['z'] + dz))
            faces.append((k + 3, k + 2, k + 1, k))
        if not faces:
            continue
        mesh = bpy.data.meshes.new(mat.name)
        mesh.from_pydata(verts, [], faces)
        mesh.materials.append(mat)
        bpy.context.scene.collection.objects.link(bpy.data.objects.new(mat.name, mesh))


def daylight(scene):
    """EEVEE with a sun (the game's direction, from the south-west) and a pale sky lighting the shade."""
    scene.render.engine = 'BLENDER_EEVEE'
    sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
    sun.data.energy = 3.0
    sun.data.color = (1.0, 0.94, 0.84)
    sun.data.angle = math.radians(2)
    # The game's way to the sun: (-0.45, 1, 0.35) y up → Blender (-0.45, -0.35, 1).
    to_sun = Vector((-0.45, -0.35, 1)).normalized()
    sun.rotation_euler = to_sun.to_track_quat('Z', 'Y').to_euler()
    scene.collection.objects.link(sun)
    if scene.world is None:
        scene.world = bpy.data.worlds.new('W')
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.58, 0.69, 0.79, 1)
    bg.inputs['Strength'].default_value = 1.0


def to_blender(x, y, z):
    return Vector((x, -z, y))


def place(proto, p):
    o = bpy.data.objects.new(proto.name + '_i', proto.data)
    o.location = to_blender(p['x'], p['y'], p['z'])
    o.rotation_euler = (0, 0, p['rot'])
    o.scale = (p['sx'], p['sz'], p['sy'])
    bpy.context.scene.collection.objects.link(o)
    return o


def shoot(cam, path, at, to, lens_deg=75):
    cam.data.type = 'PERSP'
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle = math.radians(lens_deg)
    cam.location = at
    cam.rotation_euler = (to - at).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('rendered', path)


def main():
    args = parse_args()
    with open(args.json, encoding='utf-8') as f:
        data = json.load(f)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for kit in args.kit:
        bpy.ops.import_scene.gltf(filepath=os.path.abspath(kit))
    protos = {o.name: o for o in bpy.data.objects if o.name.startswith(('kit_', 'lobby_', 'Char_', 'item_')) and o.type == 'MESH'}
    for o in protos.values():
        o.hide_render = True
    for p in data['pieces']:
        if p['piece'] in protos:
            place(protos[p['piece']], p)
    for p in data.get('roof', []):
        if p['piece'] in protos:
            place(protos[p['piece']], p).visible_shadow = False
    rings(data)
    # Update 0.0.20 — the floor's look's bars and cores (`style`: floor 3 is stone).
    style = data.get('style', {})
    bars = protos.get(style.get('bars', 'kit_p1_Arch_bars'))
    bs = style.get('barsScale', [1.69, 1.12, 1])
    for g in data['gates'] if bars else []:
        place(bars, {'x': g['x'], 'y': 0, 'z': g['z'], 'rot': g['rot'], 'sx': bs[0], 'sy': bs[1], 'sz': bs[2]})
    # Update 0.0.13 — the walls' and ledges' solid cores (dark), and the slab under the floor.
    core_mat = bpy.data.materials.new('Core')
    core_mat.use_nodes = True
    core_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*style.get('core', [0.196, 0.147, 0.096]), 1)
    verts, faces = [], []
    for b in data.get('cores', []):
        c = to_blender(b['x'], b['y'], b['z'])
        hx, hy, hz = b['w'] / 2, b['d'] / 2, b['h'] / 2
        k = len(verts)
        verts += [(c.x + sx * hx, c.y + sy * hy, c.z + sz * hz) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
        faces += [(k + a, k + b_, k + c_, k + d) for a, b_, c_, d in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3))]
    if verts:
        me = bpy.data.meshes.new('Cores')
        me.from_pydata(verts, [], faces)
        me.materials.append(core_mat)
        cores = bpy.data.objects.new('Cores', me)
        bpy.context.scene.collection.objects.link(cores)
        # Update 0.0.20 — under the lava when the floor has pits (`slabY`). Update 0.2.9 — only under the floor boxes,
        # as the game lays it (`floors`), when the data has them: elsewhere the sky shows through, as in the game.
        # (Update 0.2.23 — one mesh: a plane each took Blender most of an hour on a big floor.)
        if 'floors' in data:
            sv, sf = [], []
            for f in data['floors']:
                k = len(sv)
                for dx, dz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                    sv.append(to_blender(f['x'] + dx * f['w'] / 2, -0.45, f['z'] + dz * f['d'] / 2))
                sf.append((k + 3, k + 2, k + 1, k))
            slab = bpy.data.meshes.new('Slab')
            slab.from_pydata(sv, [], sf)
            slab.materials.append(core_mat)
            bpy.context.scene.collection.objects.link(bpy.data.objects.new('Slab', slab))
        else:
            bpy.ops.mesh.primitive_plane_add(size=1000, location=(0, 0, data.get('slabY', -0.45)))
            bpy.context.active_object.data.materials.append(core_mat)
    game_boxes(data.get('boxes', []))
    # Update 0.2.9 — the lobby's locked characters, black; its boards.
    shade = bpy.data.materials.new('Silhouette')
    shade.use_nodes = True
    shade.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.004, 0.004, 0.006, 1)
    shade.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.6
    for name in data.get('silhouettes', []):
        if name in protos:
            mesh = protos[name].data
            for i in range(len(mesh.materials)):
                mesh.materials[i] = shade
    write_boards(data.get('boards', []))
    # Update 0.2.4 — the look's colours (the desert's sandstone: `tint`, the floor tile's own `floorTint`) and its sand.
    recolour(style, protos)
    sand_cells(data.get('sand', []), style)
    water_sheets(data, style)
    if args.demon and data.get('demon'):
        demon_at(args.demon, data['demon'])
    for pad in data['pads']:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.85, depth=0.08, location=to_blender(pad['x'], 0.04, pad['z']))
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    scene.view_settings.view_transform = 'Standard'
    for m in bpy.data.materials:
        if m.use_nodes and 'Principled BSDF' in m.node_tree.nodes:
            m.diffuse_color = m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
    if scene.world is None:
        scene.world = bpy.data.worlds.new('W')
    scene.world.color = (0.03, 0.025, 0.035)
    if args.day and data.get('interior'):
        interior(scene, data)
    elif args.day:
        daylight(scene)
        # Update 0.2.4 — the look's own sky and sun.
        if style.get('sky') is not None:
            scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (*srgb(style['sky']), 1)
        for o in scene.objects:
            if o.type == 'LIGHT' and o.data.type == 'SUN' and style.get('sun') is not None:
                o.data.color = srgb(style['sun'])
        hell_look.apply(scene, data, style, os.path.dirname(os.path.abspath(args.json)))
    scene.render.resolution_x = args.width
    scene.render.resolution_y = round(args.width * 9 / 16)
    scene.render.image_settings.file_format = 'PNG'
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.clip_start = 0.05
    cam.data.clip_end = 600
    os.makedirs(args.out, exist_ok=True)
    # From above: the whole floor.
    e = data['extent']
    cx = (e['min']['x'] + e['max']['x']) / 2
    cz = (e['min']['z'] + e['max']['z']) / 2
    span = max(e['max']['x'] - e['min']['x'], e['max']['z'] - e['min']['z'])
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = span * 1.05
    # (Under a roof: seen from just under it.)
    cam.location = to_blender(cx, 120, cz)
    cam.rotation_euler = (0, 0, 0)
    scene.render.resolution_y = args.width
    for i, cut in enumerate(data.get('cuts', [9.5 if data.get('interior') else 120])):
        cam.data.clip_start = 120 - cut if cut < 120 else 0.05
        scene.render.filepath = os.path.join(args.out, 'overview.png' if i == 0 else f'overview{i + 1}.png')
        bpy.ops.render.render(write_still=True)
    scene.render.resolution_y = round(args.width * 9 / 16)
    cam.data.clip_start = 0.05
    for c in data['cams']:
        shoot(cam, os.path.join(args.out, c['name'] + '.png'), to_blender(*c['at']), to_blender(*c['to']))


main()
