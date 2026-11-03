# Born To Retry — Update 0.3.32: floor 8's, the Shrine Dimension's, own kit pieces (export_dungeon_kit.py --shrine;
# MD/FLOOR8_SHRINE_PLAN.md). No pack has them (the designer: "I don't see other assets that can be found on the website
# for Japan theme"), so they're made here from boxes, cylinders and cones in flat colours, as the kit's are: a torii,
# a stone lantern, a paper lantern (and one on a wall bracket), a bamboo clump, a small shrine (hokora), the shrine
# hall, a pagoda, a bell tower, a bridge's deck and railing, raked gravel, a dojo's planks, a training dummy and a
# weapon rack. And More_nature's trees (ASSETS/QUATERNIUS/More_nature): its Tree set as sakura, its pines, three
# birches as maples. Their textures aren't in the folder, so their bark is flat colour and their leaves' cut-outs
# are drawn here (clusters of blossom, needles, maple leaves on clear): made in code, nothing painted. Each piece stands
# on its origin, facing −y (the game's +z), named kit_js_<piece> and kit_mn_<tree>.
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Matrix

from scene_kit import load_pieces

SAKURA = [f'Tree_{i}' for i in range(1, 11)]
PINES = [f'Pine_{i}' for i in range(1, 6)]
MAPLES = ['Birch_3', 'Birch_6', 'Birch_8']
TEX = 256


def lin(hex_rgb):
    """An sRGB hex colour as Blender's linear one."""
    return tuple(((hex_rgb >> s & 255) / 255) ** 2.2 for s in (16, 8, 0))


def mat(name, hex_rgb, rough=0.9):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(hex_rgb), 1)
    b.inputs['Roughness'].default_value = rough
    m.diffuse_color = (*lin(hex_rgb), 1)
    return m


# The pieces' colours (sRGB): the game can recolour them by name (styles: `tint`).
COLOURS = {
    'Vermilion': 0xd23a22, 'Lacquer': 0x1e1b1b, 'ShrineWood': 0x6b4630, 'Plaster': 0xf1ebdd, 'RoofTile': 0x3b4049,
    'ShrineDark': 0x2a201b, 'LanternStone': 0x9c9a94, 'LanternGlow': 0xffd38a, 'PaperRed': 0xe0412c, 'BambooStalk': 0x86a94c,
    'BambooLeaf': 0x5f8f3a, 'Straw': 0xd8c48e, 'Shide': 0xffffff, 'Bronze': 0x8a6b3c, 'Gravel': 0xe4e1d8, 'GravelRidge': 0xcfcbc0,
    'Plank': 0xb88a5a, 'StoneBase': 0x8d8b86,
}


def M(name):
    return mat(name, COLOURS[name])


def prim(kind, m, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), n=12, r2=0.0):
    """A primitive, a unit one scaled: a box (its size), a cylinder or cone (radius, radius, height), a sphere."""
    if kind == 'box':
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    elif kind == 'cyl':
        bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=1, depth=1, location=loc, rotation=rot)
    elif kind == 'cone':
        bpy.ops.mesh.primitive_cone_add(vertices=n, radius1=1, radius2=r2, depth=1, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=n, ring_count=max(4, n // 2), radius=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = scale
    o.data.materials.append(m)
    return o


def mesh_from(name, verts, faces, m):
    """A mesh object from its vertices and faces (the roofs)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def piece(name, parts):
    """The parts as one mesh, their transforms baked in, unlinked (export_dungeon_kit.py links it)."""
    # (Their own location, turn and scale: matrix_world isn't updated till the scene is.)
    for o in parts:
        o.data.transform(o.matrix_basis)
        o.matrix_basis = Matrix.Identity(4)
    if len(parts) > 1:
        with bpy.context.temp_override(active_object=parts[0], object=parts[0], selected_objects=parts, selected_editable_objects=parts):
            bpy.ops.object.join()
    o = parts[0]
    o.name = o.data.name = f'kit_js_{name}'
    # (Faces turned outward: the roofs are made by hand.)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    for p in o.data.polygons:
        p.use_smooth = False
    for c in list(o.users_collection):
        c.objects.unlink(o)
    return o


def hip_roof(name, w, d, z0, ridge, up, lift, m):
    """A hip roof: its eaves w × d at z0 (their corners lifted `lift`, the eaves upturned), its ridge `ridge` long, `up`
    over them; closed underneath."""
    hw, hd = w / 2, d / 2
    v = [(-hw, -hd, z0 + lift), (0, -hd, z0), (hw, -hd, z0 + lift), (hw, 0, z0), (hw, hd, z0 + lift), (0, hd, z0), (-hw, hd, z0 + lift), (-hw, 0, z0),
         (-ridge / 2, 0, z0 + up), (ridge / 2, 0, z0 + up)]
    f = [(0, 1, 2, 9, 8), (2, 3, 4, 9), (4, 5, 6, 8, 9), (6, 7, 0, 8), (7, 6, 5, 4, 3, 2, 1, 0)]
    return mesh_from(name, v, f, m)


def torii():
    V, L = M('Vermilion'), M('Lacquer')
    p = []
    for x in (-2.5, 2.5):
        p.append(prim('cyl', V, (x, 0, 2.35), (0.2, 0.2, 4.7)))
        p.append(prim('cyl', L, (x, 0, 0.22), (0.26, 0.26, 0.44)))
    p.append(prim('box', V, (0, 0, 3.75), (5.8, 0.16, 0.3)))
    p.append(prim('box', V, (0, 0, 4.17), (0.3, 0.14, 0.55)))
    p.append(prim('box', V, (0, 0, 4.58), (6.0, 0.3, 0.26)))
    p.append(prim('box', L, (0, 0, 4.86), (4.0, 0.42, 0.3)))
    for s in (-1, 1):
        a = math.radians(9)
        p.append(prim('box', L, (s * (2.0 + 0.7 * math.cos(a)), 0, 4.86 + 0.7 * math.sin(a)), (1.45, 0.42, 0.3), (0, -s * a, 0)))
    return piece('Torii', p)


def stone_lantern():
    S, G = M('LanternStone'), M('LanternGlow')
    p = [prim('cyl', S, (0, 0, 0.11), (0.42, 0.42, 0.22), n=6), prim('cyl', S, (0, 0, 0.645), (0.14, 0.14, 0.85), n=8),
         prim('cyl', S, (0, 0, 1.14), (0.38, 0.38, 0.14), n=6), prim('box', S, (0, 0, 1.42), (0.46, 0.46, 0.42)),
         prim('box', G, (0, 0, 1.42), (0.3, 0.5, 0.26)), prim('box', G, (0, 0, 1.42), (0.5, 0.3, 0.26)),
         prim('cone', S, (0, 0, 1.79), (0.6, 0.6, 0.32), n=6, r2=0.08), prim('sphere', S, (0, 0, 2.0), (0.09, 0.09, 0.09), n=8)]
    return piece('StoneLantern', p)


def paper_lantern(on_wall=False):
    R, L = M('PaperRed'), M('Lacquer')
    p = [prim('sphere', R, (0, 0, 0), (0.26, 0.26, 0.34), n=12), prim('cyl', L, (0, 0, 0.33), (0.14, 0.14, 0.06)),
         prim('cyl', L, (0, 0, -0.33), (0.14, 0.14, 0.06))]
    if on_wall:
        # On a bracket out from the wall (the wall at y = +0.45: the piece faces −y), hung under it.
        p.append(prim('box', L, (0, 0.24, 0.52), (0.05, 0.48, 0.05)))
        p.append(prim('box', L, (0, 0.0, 0.43), (0.02, 0.02, 0.16)))
        p.append(prim('box', L, (0, 0.47, 0.45), (0.14, 0.04, 0.24)))
    return piece('WallLantern' if on_wall else 'PaperLantern', p)


def bamboo():
    S, Lf = M('BambooStalk'), M('BambooLeaf')
    rnd = np.random.default_rng(8)
    p = []
    for i in range(7):
        a = i / 7 * math.tau + rnd.uniform(-0.3, 0.3)
        r = 0.15 + 0.45 * rnd.random()
        x, y = math.cos(a) * r, math.sin(a) * r
        h = rnd.uniform(6.0, 8.0)
        rad = rnd.uniform(0.06, 0.09)
        tilt = (rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), 0)
        p.append(prim('cyl', S, (x, y, h / 2), (rad, rad, h), tilt, n=7))
        for k in range(1, 5):
            p.append(prim('cyl', S, (x + tilt[1] * k * 1.4, y - tilt[0] * k * 1.4, k * 1.4), (rad * 1.25, rad * 1.25, 0.05), tilt, n=7))
        for k in range(9):
            z = h * (0.55 + 0.45 * rnd.random())
            b = rnd.uniform(0, math.tau)
            p.append(prim('box', Lf, (x + math.cos(b) * 0.3, y + math.sin(b) * 0.3, z), (0.62, 0.11, 0.015), (rnd.uniform(-0.5, 0.5), rnd.uniform(-0.3, 0.3), b)))
    return piece('Bamboo', p)


def hokora():
    St, W, V, Rf = M('StoneBase'), M('ShrineWood'), M('Vermilion'), M('RoofTile')
    p = [prim('box', St, (0, 0, 0.25), (1.4, 1.2, 0.5)), prim('box', W, (0, 0, 0.95), (1.0, 0.8, 0.9)), prim('box', V, (0, -0.41, 0.95), (0.7, 0.03, 0.7))]
    for s in (-1, 1):
        p.append(prim('box', Rf, (s * 0.36, 0, 1.6), (0.82, 1.15, 0.07), (0, s * math.radians(35), 0)))
    p.append(prim('box', Rf, (0, 0, 1.84), (0.12, 1.2, 0.12)))
    return piece('Hokora', p)


def shrine_hall():
    W, V, P, D, Rf, St, Sh, L = M('ShrineWood'), M('Vermilion'), M('Plaster'), M('ShrineDark'), M('RoofTile'), M('Straw'), M('Shide'), M('Lacquer')
    p = [prim('box', W, (0, 0, 0.45), (12, 9, 0.9))]
    # Its steps up to it, each on the ground.
    for k in range(3):
        p.append(prim('box', W, (0, -4.5 - (2 - k) * 0.36 - 0.18, 0.15 * (k + 1)), (3.2, 0.36, 0.3 * (k + 1))))
    for x in (-5.4, -1.8, 1.8, 5.4):
        for y in (-4.0, 0.0, 4.0):
            p.append(prim('cyl', V, (x, y, 2.7), (0.18, 0.18, 3.6), n=10))
    p += [prim('box', P, (0, 4.0, 2.6), (10.8, 0.15, 3.2)), prim('box', P, (-5.4, 0, 2.6), (0.15, 8.0, 3.2)), prim('box', P, (5.4, 0, 2.6), (0.15, 8.0, 3.2)),
          prim('box', D, (0, 1.2, 2.6), (10.6, 5.4, 3.2)), prim('box', V, (0, -4.0, 4.4), (12, 0.3, 0.3)), prim('box', V, (0, 4.0, 4.4), (12, 0.3, 0.3)),
          prim('box', V, (-5.4, 0, 4.4), (0.3, 8.3, 0.3)), prim('box', V, (5.4, 0, 4.4), (0.3, 8.3, 0.3))]
    p.append(hip_roof('roof', 15, 12, 4.55, 7.0, 3.6, 0.6, Rf))
    p.append(prim('box', L, (0, 0, 8.18), (7.4, 0.4, 0.3)))
    # Its rope across the front, paper zigzags hanging from it; an offering box at the steps.
    p.append(prim('cyl', St, (0, -4.25, 3.95), (0.17, 0.17, 7.0), (0, math.pi / 2, 0), n=10))
    for x in (-2.4, -0.8, 0.8, 2.4):
        p.append(prim('box', Sh, (x, -4.3, 3.55), (0.16, 0.02, 0.5), (0, 0.25, 0)))
    p.append(prim('box', W, (0, -3.2, 1.25), (1.6, 0.8, 0.7)))
    return piece('ShrineHall', p)


def pagoda():
    P, V, Rf, B = M('Plaster'), M('Vermilion'), M('RoofTile'), M('Bronze')
    p = []
    z = 0.0
    for i in range(5):
        s = 4.0 - 0.45 * i
        h = 2.0 if i == 0 else 1.5
        p.append(prim('box', P, (0, 0, z + h / 2), (s, s, h)))
        for cx in (-1, 1):
            for cy in (-1, 1):
                p.append(prim('box', V, (cx * s / 2, cy * s / 2, z + h / 2), (0.22, 0.22, h)))
        z += h
        p.append(prim('cone', Rf, (0, 0, z + 0.32), (s * 1.0, s * 1.0, 0.64), (0, 0, math.pi / 4), n=4, r2=s * 0.42))
        z += 0.64
    p.append(prim('cyl', B, (0, 0, z + 1.5), (0.08, 0.08, 3.0), n=8))
    for k in range(6):
        p.append(prim('cyl', B, (0, 0, z + 0.6 + k * 0.38), (0.2, 0.2, 0.05), n=10))
    return piece('Pagoda', p)


def bell_tower():
    W, Rf, B, V = M('ShrineWood'), M('RoofTile'), M('Bronze'), M('Vermilion')
    p = [prim('box', M('StoneBase'), (0, 0, 0.15), (2.8, 2.8, 0.3))]
    for x in (-1.1, 1.1):
        for y in (-1.1, 1.1):
            p.append(prim('box', V, (x, y, 1.85), (0.2, 0.2, 3.1)))
    p += [prim('box', W, (0, 0, 3.35), (2.6, 2.6, 0.2)), prim('cone', Rf, (0, 0, 3.85), (2.2, 2.2, 0.8), (0, 0, math.pi / 4), n=4, r2=0.3),
          prim('cone', B, (0, 0, 2.3), (0.55, 0.55, 1.1), n=14, r2=0.36), prim('cyl', B, (0, 0, 2.9), (0.1, 0.1, 0.25), n=8)]
    return piece('BellTower', p)


def bridge_deck():
    Pl, V = M('Plank'), M('Vermilion')
    p = [prim('box', Pl, (0, -0.8 + k * 0.4, -0.02), (2.0, 0.36, 0.08)) for k in range(5)]
    p += [prim('box', V, (x, 0, -0.2), (0.16, 2.0, 0.26)) for x in (-0.7, 0.7)]
    return piece('BridgeDeck', p)


def bridge_rail():
    V, B = M('Vermilion'), M('Bronze')
    p = []
    for x in (-1, 1):
        p.append(prim('box', V, (x, 0, 0.45), (0.13, 0.13, 0.9)))
        p.append(prim('sphere', B, (x, 0, 0.95), (0.09, 0.09, 0.12), n=8))
    p += [prim('box', V, (0, 0, 0.82), (2.0, 0.09, 0.09)), prim('box', V, (0, 0, 0.42), (2.0, 0.07, 0.07))]
    return piece('BridgeRail', p)


def gravel():
    G, R = M('Gravel'), M('GravelRidge')
    p = [prim('box', G, (0, 0, 0.015), (2.0, 2.0, 0.03))] + [prim('box', R, (0, -0.75 + k * 0.5, 0.04), (2.0, 0.1, 0.03)) for k in range(4)]
    return piece('Gravel', p)


def planks():
    Pl = M('Plank')
    return piece('Planks', [prim('box', Pl, (0, -0.75 + k * 0.5, 0.02), (1.98, 0.48, 0.04)) for k in range(4)])


def dummy():
    W, St = M('ShrineWood'), M('Straw')
    p = [prim('box', W, (0, 0, 0.06), (0.6, 0.6, 0.12)), prim('cyl', W, (0, 0, 0.95), (0.14, 0.14, 1.7), n=10), prim('cyl', St, (0, 0, 1.72), (0.19, 0.19, 0.32), n=10)]
    for z, a in ((1.25, 0.5), (1.05, -0.6), (0.75, 0.1)):
        p.append(prim('cyl', W, (math.cos(a) * 0.3, -math.sin(a) * 0.3, z), (0.04, 0.04, 0.55), (math.pi / 2, 0, -a + math.pi / 2), n=6))
    return piece('Dummy', p)


def rack():
    W, L = M('ShrineWood'), M('Lacquer')
    p = [prim('box', L, (x, 0, 0.7), (0.08, 0.3, 1.4)) for x in (-0.8, 0.8)]
    p += [prim('box', L, (0, 0, z), (1.7, 0.1, 0.06)) for z in (0.5, 1.25)]
    p += [prim('cyl', W, (-0.5 + k * 0.33, -0.08, 0.95), (0.03, 0.03, 1.8), (0.12, 0, 0), n=6) for k in range(4)]
    return piece('Rack', p)


def build_pieces():
    return [torii(), stone_lantern(), paper_lantern(), paper_lantern(True), bamboo(), hokora(), shrine_hall(), pagoda(), bell_tower(),
            bridge_deck(), bridge_rail(), gravel(), planks(), dummy(), rack()]


def leaf_image(name, kind):
    """A leaf card's cut-out (made in code): a ragged clump on clear. `kind`: blossom (pink, five-petalled flowers over
    it), needle (dark green strokes) or maple (red, star leaves)."""
    rnd = np.random.default_rng({'blossom': 3, 'needle': 5, 'maple': 7}[kind])
    n = TEX
    yy, xx = np.mgrid[0:n, 0:n] / n
    alpha = np.zeros((n, n), bool)
    for _ in range(14):
        cx, cy = 0.5 + rnd.normal(0, 0.14), 0.5 + rnd.normal(0, 0.14)
        r = rnd.uniform(0.11, 0.24)
        ang = np.arctan2(yy - cy, xx - cx)
        wob = 1 + 0.18 * np.sin(ang * rnd.integers(5, 9) + rnd.uniform(0, 6))
        alpha |= np.hypot(xx - cx, yy - cy) < r * wob
    base = {'blossom': (0.95, 0.66, 0.77), 'needle': (0.18, 0.36, 0.22), 'maple': (0.8, 0.24, 0.14)}[kind]
    col = np.empty((n, n, 3))
    shade = 0.82 + 0.25 * (yy - 0.5) + 0.06 * rnd.standard_normal((n, n))
    for c in range(3):
        col[..., c] = base[c] * shade
    if kind == 'blossom':
        for _ in range(170):
            cx, cy, r = rnd.random(), rnd.random(), rnd.uniform(0.018, 0.034)
            ang = np.arctan2(yy - cy, xx - cx)
            petal = np.hypot(xx - cx, yy - cy) < r * (0.65 + 0.35 * np.abs(np.cos(ang * 2.5)))
            light = rnd.choice([(1.0, 0.86, 0.92), (1.0, 0.78, 0.86), (0.98, 0.93, 0.95)])
            col[petal] = light
            col[np.hypot(xx - cx, yy - cy) < r * 0.25] = (0.86, 0.38, 0.5)
    elif kind == 'needle':
        for _ in range(260):
            cx, cy, a, ln = rnd.random(), rnd.random(), rnd.uniform(0, math.pi), rnd.uniform(0.04, 0.09)
            dx, dy = xx - cx, yy - cy
            along, across = dx * math.cos(a) + dy * math.sin(a), -dx * math.sin(a) + dy * math.cos(a)
            col[(np.abs(along) < ln) & (np.abs(across) < 0.004)] = rnd.choice([(0.26, 0.48, 0.3), (0.12, 0.27, 0.16)])
    else:
        for _ in range(90):
            cx, cy, r = rnd.random(), rnd.random(), rnd.uniform(0.03, 0.055)
            ang = np.arctan2(yy - cy, xx - cx)
            star = np.hypot(xx - cx, yy - cy) < r * (0.45 + 0.55 * np.abs(np.cos(ang * 2.5)) ** 3)
            col[star] = rnd.choice([(0.92, 0.42, 0.18), (0.72, 0.16, 0.1), (0.95, 0.6, 0.22)])
    img = bpy.data.images.new(name, n, n, alpha=True)
    rgba = np.concatenate([np.clip(col, 0, 1), alpha[..., None].astype(float)], axis=2)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    img.pack()
    return img


def leaf_material(name, kind):
    """A leaf card's material: its cut-out the base colour and alpha (the game clips it: kitMaterial.ts)."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    b = nodes['Principled BSDF']
    t = nodes.new('ShaderNodeTexImage')
    t.image = leaf_image(name + '.png', kind)
    m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    m.node_tree.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    b.inputs['Roughness'].default_value = 1
    m.surface_render_method = 'DITHERED'
    m.use_backface_culling = False
    m.diffuse_color = (1, 0.6, 0.75, 1) if kind == 'blossom' else (0.2, 0.4, 0.2, 1) if kind == 'needle' else (0.8, 0.25, 0.15, 1)
    return m


def load_trees(folder):
    """More_nature's sakura (its Tree set), pines and maples (birches), their materials made again: flat bark, leaves'
    cut-outs from `leaf_material`."""
    out = []
    for names, leaves, bark, kind, bark_hex in ((SAKURA, 'Sakura', 'SakuraBark', 'blossom', 0x4a342b), (PINES, 'PineNeedle', 'PineBark', 'needle', 0x5a4232), (MAPLES, 'MapleLeaf', 'MapleBark', 'maple', 0x6b5446)):
        leaf = leaf_material(leaves, kind)
        trunk = mat(bark, bark_hex, 1.0)
        protos = load_pieces(folder, names, {}, bake=True, recenter=names)
        for name, o in protos.items():
            for slot in o.material_slots:
                slot.material = leaf if slot.material and 'Leaves' in slot.material.name else trunk
            o.name = o.data.name = f'kit_mn_{name}'
            out.append(o)
    for m in [m for m in bpy.data.materials if m.users == 0]:
        bpy.data.materials.remove(m)
    for i in [i for i in bpy.data.images if i.users == 0]:
        bpy.data.images.remove(i)
    return out


def shrine_kit(folder):
    """Every one of floor 8's pieces (unlinked): the code-made ones, then More_nature's trees from `folder`."""
    return build_pieces() + load_trees(folder)


if __name__ == '__main__':
    print(os.path.basename(__file__))
