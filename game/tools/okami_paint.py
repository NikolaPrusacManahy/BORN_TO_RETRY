# Floor 8's boss, Yokai : Okami (MD/FLOOR8_SHRINE_PLAN.md): the Bestiary's Lycan repainted (its own
# texture's shading kept): white fur, the dark mane silver-white; its nose, lips and claws kept dark, its mouth red;
# our own red markings (kabuki's kumadori, not Capcom's wolf's): from each eye a line sweeping up over the brow to the
# ear and one back down the cheek, the inner ears, two bands round each forearm by the wrist, a line down each outer
# thigh, one down the spine onto the tail; its eyes and markings in the emissive map (embers, brighter in its rage).
# Each texel's place on the body is found by drawing the mesh into its texture (its UVs), so the markings are placed on
# the body, not the image.
# ual_bake.py's okami paints it so ('paint'); alone, to look at:
#   python tools/okami_paint.py <out folder>   (writes okami_color.png, okami_emissive.png)
import io, os, sys
import numpy as np
from PIL import Image
from ual_bake import assets, read_glb, view_bytes

SIZES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
TYPES = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
# Its fur, in shadow and lit; its markings' red; the dark kept (nose, lips, claws); the embers' glow.
FUR = (np.array([0.70, 0.72, 0.77]), np.array([0.96, 0.95, 0.92]))
RED = np.array([0.78, 0.07, 0.05])
DARK = np.array([0.10, 0.09, 0.10])
EYES = np.array([1.0, 0.62, 0.16])
EMBER = np.array([0.95, 0.18, 0.04])


def accessor(j, b, i):
    a = j['accessors'][i]
    v = j['bufferViews'][a['bufferView']]
    k = SIZES[a['type']]
    dt = np.dtype(TYPES[a['componentType']])
    raw = b[v.get('byteOffset', 0) + a.get('byteOffset', 0):]
    arr = np.ndarray((a['count'], k), dtype=dt, buffer=raw, strides=(v.get('byteStride', k * dt.itemsize), dt.itemsize)).copy()
    return arr if k > 1 else arr[:, 0]


def image(j, b, part):
    im = next(m for m in j['images'] if part in m.get('name', ''))
    return np.asarray(Image.open(io.BytesIO(view_bytes(j, b, im['bufferView']))).convert('RGB')).astype(np.float64) / 255


def draw(P, N, UV, bone, tris, size):
    """Each texel's place, its normal and its bone: the mesh drawn into its UVs (-1: none)."""
    pos = np.zeros((size, size, 3))
    nor = np.zeros((size, size, 3))
    owner = np.full((size, size), -1, dtype=np.int32)
    px = UV * size - 0.5
    for t in tris:
        a, b, c = px[t]
        x0, y0 = np.floor(np.minimum(np.minimum(a, b), c)).astype(int)
        x1, y1 = np.ceil(np.maximum(np.maximum(a, b), c)).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, size - 1), min(y1, size - 1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-12:
            continue
        w0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / d
        w1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / d
        w2 = 1 - w0 - w1
        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        if not inside.any():
            continue
        w = np.stack([w0, w1, w2], -1)[inside]
        ys, xs = gy[inside], gx[inside]
        pos[ys, xs] = w @ P[t]
        nor[ys, xs] = w @ N[t]
        owner[ys, xs] = bone[t[np.argmax(w, 1)]]
    # (Seams: a few texels out from each island, its neighbours'.)
    for _ in range(4):
        empty = owner < 0
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            src = np.roll(np.roll(owner, dy, 0), dx, 1)
            take = empty & (src >= 0) & (owner < 0)
            owner[take] = src[take]
            pos[take] = np.roll(np.roll(pos, dy, 0), dx, 1)[take]
            nor[take] = np.roll(np.roll(nor, dy, 0), dx, 1)[take]
    return pos, nor, owner


def stroke(uv, pts, radii):
    """A line through `pts` as thick as `radii` there (m), soft at its edge, drawn as if seen from one side (`uv`: each
    texel's place seen so): 0..1 for each texel."""
    best = np.zeros(uv.shape[:2])
    pts = [np.array(p, dtype=np.float64) for p in pts]
    for (a, ra), (b, rb) in zip(zip(pts, radii), zip(pts[1:], radii[1:])):
        ab = b - a
        t = np.clip(((uv - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
        d = np.linalg.norm(uv - (a + t[..., None] * ab), axis=-1)
        r = ra + (rb - ra) * t
        best = np.maximum(best, np.clip((r - d) / np.maximum(r * 0.35, 1e-4), 0, 1))
    return best


def paint(glb):
    j, b = read_glb(glb)
    mesh = next(m for m in j['meshes'] if m['name'].startswith('Lycan'))
    pr = mesh['primitives'][0]
    at = pr['attributes']
    P, N, UV = accessor(j, b, at['POSITION']), accessor(j, b, at['NORMAL']), accessor(j, b, at['TEXCOORD_0'])
    J, W = accessor(j, b, at['JOINTS_0']), accessor(j, b, at['WEIGHTS_0'])
    tris = accessor(j, b, pr['indices']).reshape(-1, 3)
    skin = j['skins'][0]
    names = [j['nodes'][k]['name'] for k in skin['joints']]
    ibm = accessor(j, b, skin['inverseBindMatrices']).reshape(-1, 4, 4)
    joint = {n: np.linalg.inv(ibm[i].T)[:3, 3] for i, n in enumerate(names)}
    bone = J[np.arange(len(J)), W.argmax(1)].astype(int)
    base = image(j, b, 'BaseColor')
    glow = image(j, b, 'Emissive')
    size = base.shape[0]
    pos, nor, owner = draw(P, N, UV, bone, tris, size)
    named = np.array(names + ['-'])[owner]
    lum = base @ [0.299, 0.587, 0.114]
    sat = base.max(-1) - base.min(-1)
    # White fur: its own shading kept (the dark mane silver), cool in the shadows.
    k = np.clip((lum - 0.04) / 0.42, 0, 1) ** 0.8
    color = FUR[0] + (FUR[1] - FUR[0]) * k[..., None]
    # Its mouth and gums: red as they were; its teeth: as they were.
    mouth = (base[..., 0] > base[..., 1] * 1.35) & (base[..., 0] > base[..., 2] * 1.15) & (sat > 0.12)
    teeth = lum > 0.55
    keep = mouth | teeth
    color[keep] = base[keep]
    # Its nose and lips (the muzzle's front, dark), its claws (its fingers' and toes' tips, dark): kept dark.
    head = named == 'Head'
    snout = head & (pos[..., 2] > 0.80) & (lum < 0.16)
    claws = np.char.find(named.astype(str), '_03_') >= 0
    claws |= np.isin(named, ['ball_l', 'ball_r', 'ball_leaf_l', 'ball_leaf_r'])
    claws &= lum < 0.18
    # (Its nose: the muzzle's tip, dark whatever its colour.)
    snout |= head & (pos[..., 2] > 0.85) & mouth & (pos[..., 1] > 1.6)
    color[snout | claws] = DARK + (base[snout | claws] - DARK) * 0.3
    # Its inner ears, red.
    ears = head & mouth & (pos[..., 1] > 1.8)
    color[ears] = RED * 0.75 + base[ears] * 0.25
    # Its markings: each side's seen from that side (its depth and its height: z, y), on what faces that way.
    side_view = pos[..., [2, 1]]
    marks = np.zeros(lum.shape)
    for s in (1, -1):
        facing = (pos[..., 0] * s > 0.015) & (nor[..., 0] * s > 0.12)
        # From the eye (z 0.715, y 1.70) up over the brow and onto the ear, and back down the cheek toward the jaw.
        brow = [(0.74, 1.712), (0.70, 1.755), (0.64, 1.815), (0.575, 1.88), (0.51, 1.95)]
        cheek = [(0.725, 1.683), (0.67, 1.665), (0.6, 1.635), (0.53, 1.6)]
        marks = np.maximum(marks, stroke(side_view, brow, [0.012, 0.018, 0.016, 0.011, 0.003]) * (head & facing))
        marks = np.maximum(marks, stroke(side_view, cheek, [0.01, 0.014, 0.01, 0.002]) * (head & facing))
        # Two bands round its forearm, by the wrist.
        side = 'l' if s > 0 else 'r'
        a, h = joint['lowerarm_' + side], joint['hand_' + side]
        t = ((pos - a) @ (h - a)) / ((h - a) @ (h - a))
        arm = np.isin(named, ['lowerarm_' + side, 'hand_' + side])
        for lo, hi in ((0.6, 0.68), (0.76, 0.81)):
            marks = np.maximum(marks, arm * np.clip(np.minimum(t - lo, hi - t) / 0.012, 0, 1))
        # A line down its outer thigh, seen from the side.
        th, ca = joint['thigh_' + side], joint['calf_' + side]
        leg = np.isin(named, ['thigh_' + side]) & (nor[..., 0] * s > 0.2)
        marks = np.maximum(marks, stroke(side_view, [(th[2] - 0.04, th[1] + 0.02), ((th[2] + ca[2]) / 2 - 0.03, (th[1] + ca[1]) / 2), (ca[2] - 0.02, ca[1] + 0.06)], [0.012, 0.022, 0.004]) * leg)
    # A line down its spine (seen from behind, on what faces back), on along the top of its tail.
    back_view = pos[..., [0, 1]]
    spine = np.isin(named, ['pelvis', 'spine_01', 'spine_02', 'spine_03']) & (nor[..., 2] < -0.3)
    marks = np.maximum(marks, stroke(back_view, [(0, 1.44), (0, 1.3), (0, 1.12), (0, 0.98)], [0.004, 0.026, 0.03, 0.022]) * spine)
    tail = np.isin(named, ['Tail_1', 'Tail_2', 'Tail_3', 'Tail_4']) & (nor[..., 1] > 0.35)
    top_view = pos[..., [0, 2]]
    t1, t4 = joint['Tail_1'], joint['Tail_4']
    marks = np.maximum(marks, stroke(top_view, [(0, t1[2]), (0, t4[2])], [0.022, 0.003]) * tail)
    marks[keep | snout | claws] = 0
    color = color + (RED - color) * marks[..., None]
    # Its eyes: embers; its markings, a glow (the game turns it up in its rage).
    eyes = glow.max(-1)
    emissive = EYES * eyes[..., None] + EMBER * (marks * 0.35)[..., None]
    return color, emissive


if __name__ == '__main__':
    out = sys.argv[1]
    glb = os.path.join(assets(), 'High-quality-enemies', 'Bestiary - Dungeon Monsters Kit[Source]', 'Exports', 'GLB (Godot-Unreal)', 'Lycan.glb')
    color, emissive = paint(glb)
    Image.fromarray((np.clip(color, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out, 'okami_color.png'))
    Image.fromarray((np.clip(emissive, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out, 'okami_emissive.png'))
    print('okami ->', out)
