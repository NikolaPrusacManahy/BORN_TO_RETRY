# Update 0.3.43 — floor 10's look in the dungeon renders (render_dungeon.py; the data from tools/hellShots.ts): Hell's
# chains and braziers' iron (the game's own meshes), the seams of lava in its stone (the game's crack map, laid on the
# world as the game's shader lays it: from above on floors, from the side on walls, hottest low down), its sky (the
# dome's colours by height, seen; lit by its sky light above and the lava's from below), its fires glowing. A copy of
# the look, not the game's renderer.
import os

import bpy


def srgb(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def iron(color):
    mat = bpy.data.materials.new('HellIron')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = 0.55
    bsdf.inputs['Metallic'].default_value = 0.25
    mat.diffuse_color = (*color, 1)
    return mat


def meshes(hell):
    """The chains and braziers' iron: game space (y up) to Blender's (z up)."""
    for k, m in enumerate(hell.get('meshes', [])):
        p = m['pos']
        verts = [(p[i], -p[i + 2], p[i + 1]) for i in range(0, len(p), 3)]
        idx = m['idx']
        faces = [(idx[i], idx[i + 1], idx[i + 2]) for i in range(0, len(idx), 3)]
        me = bpy.data.meshes.new(f'Hell{k}')
        me.from_pydata(verts, [], faces)
        me.validate()
        me.materials.append(iron(m['color']))
        bpy.context.scene.collection.objects.link(bpy.data.objects.new(f'Hell{k}', me))


def smooth(N, L, value, lo, hi, flip=False):
    """smoothstep(lo, hi, value) (or 1 minus it)."""
    mr = N.new('ShaderNodeMapRange')
    mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['From Min'].default_value = lo
    mr.inputs['From Max'].default_value = hi
    mr.inputs['To Min'].default_value = 1 if flip else 0
    mr.inputs['To Max'].default_value = 0 if flip else 1
    L.new(value, mr.inputs['Value'])
    return mr.outputs['Result']


def math(N, L, op, a, b=None):
    n = N.new('ShaderNodeMath')
    n.operation = op
    for i, x in enumerate((a, b)):
        if x is None:
            continue
        if isinstance(x, (int, float)):
            n.inputs[i].default_value = x
        else:
            L.new(x, n.inputs[i])
    return n.outputs[0]


def vmix(N, L, fac, a, b):
    n = N.new('ShaderNodeMix')
    n.data_type = 'VECTOR'
    L.new(fac, n.inputs['Factor'])
    L.new(a, n.inputs[4])
    L.new(b, n.inputs[5])
    return n.outputs[1]


def combine(N, L, x, y):
    n = N.new('ShaderNodeCombineXYZ')
    L.new(x, n.inputs['X'])
    L.new(y, n.inputs['Y'])
    return n.outputs[0]


def crack(mat, cr, img):
    """The glow along the cracks, as engine/hell/cracks.ts adds it (its breathing left at its middle)."""
    nt = mat.node_tree
    N, L = nt.nodes, nt.links
    bsdf = N.get('Principled BSDF')
    if bsdf is None:
        return
    geo = N.new('ShaderNodeNewGeometry')
    p = N.new('ShaderNodeSeparateXYZ')
    L.new(geo.outputs['Position'], p.inputs[0])
    an = N.new('ShaderNodeVectorMath')
    an.operation = 'ABSOLUTE'
    L.new(geo.outputs['Normal'], an.inputs[0])
    n = N.new('ShaderNodeSeparateXYZ')
    L.new(an.outputs[0], n.inputs[0])
    # Game (x, y, z) is Blender (x, z, −y).
    gx, gy, gz = p.outputs['X'], p.outputs['Z'], math(N, L, 'MULTIPLY', p.outputs['Y'], -1)
    up = math(N, L, 'GREATER_THAN', n.outputs['Z'], 0.6)
    side_x = math(N, L, 'GREATER_THAN', n.outputs['X'], n.outputs['Y'])
    uv = vmix(N, L, up, vmix(N, L, side_x, combine(N, L, gx, gy), combine(N, L, gz, gy)), combine(N, L, gx, gz))
    sc = N.new('ShaderNodeVectorMath')
    sc.operation = 'SCALE'
    L.new(uv, sc.inputs[0])
    sc.inputs['Scale'].default_value = 1 / cr['span']
    def sample(vec):
        t = N.new('ShaderNodeTexImage')
        t.image = img
        t.interpolation = 'Linear'
        t.extension = 'REPEAT'
        L.new(vec, t.inputs['Vector'])
        s = N.new('ShaderNodeSeparateColor')
        L.new(t.outputs['Color'], s.inputs[0])
        return s
    c1 = sample(sc.outputs[0])
    sc2 = N.new('ShaderNodeVectorMath')
    sc2.operation = 'MULTIPLY_ADD'
    L.new(sc.outputs[0], sc2.inputs[0])
    e = cr['edges']
    sc2.inputs[1].default_value = (e['maskScale'],) * 3
    sc2.inputs[2].default_value = (*e['maskShift'], 0)
    c2 = sample(sc2.outputs[0])
    k1 = math(N, L, 'MULTIPLY', smooth(N, L, c1.outputs['Red'], *e['coarse']), smooth(N, L, c2.outputs['Green'], *e['spot']))
    k2 = math(N, L, 'MULTIPLY', smooth(N, L, c1.outputs['Blue'], *e['fine']), smooth(N, L, c2.outputs['Green'], *e['fineSpot']))
    k = math(N, L, 'ADD', k1, math(N, L, 'MULTIPLY', k2, e['fineK']))
    fade_up = smooth(N, L, gy, 1.0, 2.0, flip=True)
    fade_side = smooth(N, L, gy, 0.3, 3.5, flip=True)
    fm = N.new('ShaderNodeMix')
    fm.data_type = 'FLOAT'
    L.new(up, fm.inputs['Factor'])
    L.new(fade_side, fm.inputs[2])
    L.new(fade_up, fm.inputs[3])
    k = math(N, L, 'MULTIPLY', k, fm.outputs[0])
    bsdf.inputs['Emission Color'].default_value = (*cr['color'], 1)
    L.new(math(N, L, 'MULTIPLY', k, cr['strength'] * 0.85), bsdf.inputs['Emission Strength'])


def fires(style):
    """The kit's flames and the look's glowing materials, lit from inside (kitMaterial.ts: emissive 2.2)."""
    glow = set(style.get('glow') or [])
    for m in bpy.data.materials:
        if not m.use_nodes or 'Principled BSDF' not in m.node_tree.nodes:
            continue
        base = m.name.split('.')[0]
        if 'fire' in base.lower() or 'candle' in base.lower() or base in glow:
            b = m.node_tree.nodes['Principled BSDF']
            b.inputs['Emission Color'].default_value = b.inputs['Base Color'].default_value
            b.inputs['Emission Strength'].default_value = 2.2


def sky(scene, hell, style):
    """The dome seen (its colours by height) and the light it gives: the sky light from above, the lava's from below."""
    w = scene.world
    w.use_nodes = True
    N, L = w.node_tree.nodes, w.node_tree.links
    bg = N['Background']
    tc = N.new('ShaderNodeTexCoord')
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(tc.outputs['Generated'], sep.inputs[0])
    d = hell['dome']
    ramp = N.new('ShaderNodeValToRGB')
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.04, (*srgb(d['foot']), 1)
    els[1].position, els[1].color = 1.0, (*srgb(d['top']), 1)
    for pos, col in ((0.2, d['glow']), (0.55, d['high'])):
        e = els.new(pos)
        e.color = (*srgb(col), 1)
    L.new(sep.outputs['Z'], ramp.inputs['Fac'])
    lit = N.new('ShaderNodeValToRGB')
    le = lit.color_ramp.elements
    le[0].position, le[0].color = 0.0, (*srgb(hell['ground']), 1)
    le[1].position, le[1].color = 1.0, (*srgb([((style.get('skyLight', 0xffffff) >> s) & 255) / 255 for s in (16, 8, 0)]), 1)
    half = N.new('ShaderNodeMapRange')
    half.inputs['From Min'].default_value = -1
    half.inputs['From Max'].default_value = 1
    L.new(sep.outputs['Z'], half.inputs['Value'])
    L.new(half.outputs['Result'], lit.inputs['Fac'])
    path = N.new('ShaderNodeLightPath')
    mix = N.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    L.new(path.outputs['Is Camera Ray'], mix.inputs['Factor'])
    L.new(lit.outputs['Color'], mix.inputs[6])
    L.new(ramp.outputs['Color'], mix.inputs[7])
    L.new(mix.outputs[2], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.0


def apply(scene, data, style, folder):
    """Everything above, for a floor whose data has Hell's part."""
    hell = data.get('hell')
    if not hell:
        return
    meshes(hell)
    fires(style)
    cr = hell['cracks']
    img = bpy.data.images.load(os.path.join(folder, cr['map']))
    img.colorspace_settings.name = 'Non-Color'
    for m in list(bpy.data.materials):
        if m.use_nodes and m.name.split('.')[0] in cr['on']:
            crack(m, cr, img)
    sky(scene, hell, style)
