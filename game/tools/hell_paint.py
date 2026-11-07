# Update 0.5.5 — floor 10's Ultimate Monsters in Hell's colours (the designer: "they need Hell design yeah?"): each model's own copy of the
# pack's palette texture (Atlas_Monsters) repainted, colour by colour, only the palette cells the model's mesh uses (its UVs say which). The
# pack's art, recoloured in code: nothing generated. The Cinder Chicken charred black, its comb and wattle an ember; the Brimstone Bee soot
# black, its stripes lava; the Spore Lord ashen under an ember cap. Run after tools/blender/export_monster.py (which writes the pack's colours).
#   py -3 tools/hell_paint.py <glb> --list             the palette colours its mesh uses, most used first
#   py -3 tools/hell_paint.py <glb> <scheme> [--png out.png]
import colorsys, io, json, struct, sys
from PIL import Image

sys.path.insert(0, __file__.rsplit('\\', 1)[0].rsplit('/', 1)[0])
from ual_bake import read_glb, write_glb  # noqa: E402


def hsv(c):
    return colorsys.rgb_to_hsv(*(x / 255 for x in c[:3]))


def rgb(h, s, v):
    return tuple(int(round(max(0, min(1, x)) * 255)) for x in colorsys.hsv_to_rgb(h % 1, max(0, min(1, s)), max(0, min(1, v))))


def red(h, s):
    return s > 0.45 and (h < 0.04 or h > 0.93)


def yellow(h, s):
    return s > 0.45 and 0.09 < h < 0.19


def blue(h, s):
    return s > 0.35 and 0.47 < h < 0.7


def pink(h, s):
    return s > 0.25 and 0.8 < h < 0.97


def eyes(h, s, v):
    """The eyes' whites (a pale blue-grey) and their pupils (near black): every scheme keeps them."""
    return (s < 0.15 and 0.55 < h < 0.7 and v > 0.5) or v < 0.16


# Each scheme: a palette colour (r, g, b) to its Hell colour.
def cinder(c):
    h, s, v = hsv(c)
    if eyes(h, s, v):
        return c
    if red(h, s):
        return rgb(0.07, 0.95, 1)  # the comb, the wattle: an ember
    if yellow(h, s):
        return rgb(0.05, 0.85, 0.55)  # the beak: scorched orange
    if s < 0.15:
        return rgb(0.05, 0.22, 0.17)  # its white feathers: charred
    return rgb(h, s * 0.6, v * 0.45)


def brimstone(c):
    h, s, v = hsv(c)
    if eyes(h, s, v):
        return c
    if yellow(h, s):
        return rgb(0.04, 1, 0.98)  # its stripes: lava
    if pink(h, s) or red(h, s):
        return rgb(0.0, 0.85, 0.45)  # its mouth: deep red
    if s < 0.15:
        return rgb(0.05, 0.12, 0.26)  # its wings: smoke
    if 0.05 < h < 0.12 and s < 0.4:
        return rgb(0.08, 0.3, 0.62)  # its teeth: old bone
    return rgb(0.02, 0.25, v * 0.35)  # the rest: soot


def spore(c):
    h, s, v = hsv(c)
    if eyes(h, s, v):
        return c
    if blue(h, s):
        return rgb(0.02, 0.9, 0.85 if v > 0.6 else 0.55)  # its cap: an ember red
    if yellow(h, s):
        return rgb(0.09, 0.9, 1)  # its spots: burning
    if pink(h, s) or red(h, s):
        return rgb(0.98, 0.7, 0.45)  # its mouth: dark red
    return rgb(0.07, s * 0.35, v * 0.55)  # its stalk: ash


SCHEMES = {'cinder': cinder, 'brimstone': brimstone, 'spore': spore}


def accessor(j, binary, i):
    a = j['accessors'][i]
    bv = j['bufferViews'][a['bufferView']]
    n = {'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'SCALAR': 1}[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', 4 * n)
    return [struct.unpack_from('<%df' % n, binary, off + k * stride) for k in range(a['count'])]


def used(j, binary, img):
    """The palette colours the mesh samples, with how many vertices sample each."""
    w, h = img.size
    px = img.convert('RGB').load()
    out = {}
    for m in j['meshes']:
        for p in m['primitives']:
            if 'TEXCOORD_0' not in p['attributes']:
                continue
            for u, v in accessor(j, binary, p['attributes']['TEXCOORD_0']):
                c = px[min(w - 1, max(0, int(u * w))), min(h - 1, max(0, int(v * h)))]
                out[c] = out.get(c, 0) + 1
    return sorted(out.items(), key=lambda kv: -kv[1])


def main():
    path, what = sys.argv[1], sys.argv[2]
    j, binary = read_glb(path)
    im = j['images'][0]
    bv = j['bufferViews'][im['bufferView']]
    img = Image.open(io.BytesIO(bytes(binary[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]))).convert('RGBA')
    colours = used(j, binary, img)
    if what == '--list':
        for c, n in colours:
            h, s, v = hsv(c)
            print('%-16s %5d  h %.2f s %.2f v %.2f' % (c, n, h, s, v))
        return
    paint = SCHEMES[what]
    table = {c: paint(c) for c, _ in colours}
    px = img.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            p = px[x, y]
            q = table.get(p[:3])
            if q:
                px[x, y] = (*q, p[3])
    buf = io.BytesIO()
    img.save(buf, 'PNG')
    data = buf.getvalue()
    while len(binary) % 4:
        binary += b'\0'
    j['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(data)})
    binary += data
    im['bufferView'] = len(j['bufferViews']) - 1
    write_glb(path, j, binary)
    if '--png' in sys.argv:
        img.save(sys.argv[sys.argv.index('--png') + 1])
    for c, n in colours:
        print('%-16s -> %-16s (%d)' % (c, table[c], n))


main()
