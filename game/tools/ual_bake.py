# Update 0.3.29 — bakes Universal Animation Library clips (ASSETS/QUATERNIUS/ULA 1, ULA 2) onto a Bestiary monster
# (ASSETS/QUATERNIUS/High-quality-enemies: the same 65 bones, its own rest pose and bone lengths) and writes its GLB for
# the game: each bone's turn carried over in world space from its rest (its own rest kept), the pelvis's bob scaled to
# its leg, its weapon hand's fingers held closed (a grip clip's), its textures at 1024 px (its colour variant's), every
# clip under its own name; a still pose taken from a clip at a moment (`clip@0.4`) when a move needs one held; clips
# played one after the other as one (`a+b`); pieces of the model left out (`drop`: its weapon).
# Update 0.5.4 — floor 10's own (MD/FLOOR10_HELL_PLAN.md): the Imp, the Puglin and the two armoured skeletons, each with its weapon, and
# the Orc's execution reactions (`Exec_…`: tools/ual_exec.py's, here straight onto their own Library skeleton).
#   python tools/ual_bake.py tidebreaker
import io, json, os, struct, sys
import numpy as np
from PIL import Image

FPS = 30
SIZE = 1024

MONSTERS = {
    # The Moon's boss (the designer: "Alien as Moon boss"): blue (its second colour). Update 0.3.30 (the designer:
    # "remove the weapons he has"): no anchor, its fist closed; its jump the three Jump clips (its crouch Jump_Start's
    # first moment, then Jump_Start and Jump_Loop as one in the air, then Jump_Land); no shell roll ("remove the
    # spinning attack").
    'tidebreaker': {
        'glb': 'Tidebreaker.glb', 'color': 'Variations/T_Tidebreaker_BaseColor_2.png', 'out': 'public/models/enemies/tidebreaker.glb',
        'grip': ('r', 'UAL1', 'Sword_Idle'), 'drop': ['Tidebreaker_Anchor'],
        'clips': {
            'UAL1': ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Death01', 'PickUp_Kneeling', 'Jump_Start@0=Jump_Crouch', 'Jump_Start+Jump_Loop=Jump_Air', 'Jump_Land'],
            'UAL2': ['Sword_Heavy_A', 'Sword_Heavy_A_Rec', 'Sword_Heavy_B', 'Sword_Heavy_B_Rec', 'Sword_Heavy_C', 'Sword_Heavy_C_Rec', 'Sword_Heavy_D', 'Melee_Uppercut', 'OverhandThrow', 'Sword_GroundPound', 'MonsterTransformation', 'Walk_Carry_Loop', 'Hit_Knockback'],
        },
    },
    # Update 0.3.63 — floor 10's boss, Hellwarden (MD/FLOOR10_HELL_PLAN.md, the Boss Design Bible's Blazing Sword Demon): its greatsword kept
    # (a mesh of its own: the game hides it when it's thrown), its fighting clips, its transformation for its roar.
    'hellwarden': {
        'glb': 'Hellwarden.glb', 'out': 'public/models/enemies/hellwarden.glb',
        'grip': ('r', 'UAL1', 'Sword_Idle'),
        'clips': {
            'UAL1': ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Death01', 'Sword_Idle', 'Sword_Attack_Standing', 'Jump_Start@0=Jump_Crouch', 'Jump_Start+Jump_Loop=Jump_Air', 'Jump_Land'],
            'UAL2': ['Sword_Heavy_A', 'Sword_Heavy_B', 'Sword_Heavy_C', 'Sword_Heavy_D', 'Sword_Dash', 'Sword_GroundPound', 'Sword_Block', 'Sword_UpperCut', 'OverhandThrow', 'MonsterTransformation', 'Walk_Carry_Loop', 'Hit_Knockback'],
        },
    },
    # Update 0.3.34 — floor 8's boss, Yokai : Okami (MD/FLOOR8_SHRINE_PLAN.md): the Lycan repainted white with red
    # markings (okami_paint.py), no weapon (the designer: "no sword"). Update 0.3.35 (the designer: "why does the boss
    # still do the fighter stancing and the hits??? he has human animations?") — the library's most beast-like clips in
    # place of its fighting ones: hunched (Zombie_Idle_Loop), prowling, running feral, its claws and its bite; its jumps,
    # its roar (MonsterTransformation), its death.
    'okami': {
        'glb': 'Lycan.glb', 'paint': True, 'out': 'public/models/enemies/okami.glb', 'drop': ['Icosphere'],
        'clips': {
            'UAL1': ['Death01', 'Jump_Start@0=Jump_Crouch', 'Jump_Start+Jump_Loop=Jump_Air', 'Jump_Land'],
            'UAL2': ['Zombie_Idle_Loop', 'Zombie_Walk_Fwd_Loop', 'Zombie_Run_Fwd_Loop', 'Zombie_Scratch', 'Zombie_Bite', 'MonsterTransformation'],
        },
    },
    # Update 0.5.4 — Hell's Imp: lanky, quick, its spiked mace in its right hand; it swings it, throws fire from its left, blinks.
    'imp': {
        'glb': 'Imp.glb', 'out': 'public/models/enemies/imp.glb',
        'grip': ('r', 'UAL1', 'Sword_Idle'),
        'clips': {
            'UAL1': ['Sword_Idle', 'Walk_Loop', 'Jog_Fwd_Loop', 'Jog_Left_Loop', 'Jog_Right_Loop', 'Jog_Bwd_Loop', 'Sprint_Loop', 'Dodge_Left', 'Dodge_Right', 'Hit_Chest', 'Death01', 'Spell_Simple_Shoot'],
            'UAL2': ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_Combo', 'LiftAir=Exec_Lift', 'LiftAir_Idle_Loop=Exec_Hang', 'LiftAir_Fall_Air_Loop=Exec_Flail', 'LiftAir_Hit_R@0.3=Exec_Fold'],
        },
    },
    # The Puglin: squat, tusked, a club; it rushes in packs, swinging, and leaps in on a dash.
    'puglin': {
        'glb': 'Puglin.glb', 'out': 'public/models/enemies/puglin.glb',
        'grip': ('r', 'UAL1', 'Sword_Idle'),
        'clips': {
            'UAL1': ['Sword_Idle', 'Jog_Fwd_Loop', 'Jog_Left_Loop', 'Jog_Right_Loop', 'Jog_Bwd_Loop', 'Sprint_Loop', 'Hit_Chest', 'Death02'],
            'UAL2': ['Sword_Light_A', 'Sword_Light_B', 'Sword_Dash', 'LiftAir=Exec_Lift', 'LiftAir_Idle_Loop=Exec_Hang', 'LiftAir_Fall_Air_Loop=Exec_Flail', 'LiftAir_Hit_R@0.3=Exec_Fold'],
        },
    },
    # The Bone Axeman (Skeleton A: horned helm, an axe): slow and heavy; its chop splits the floor, its spin sweeps round it.
    'boneAxeman': {
        'glb': 'Skeleton_A.glb', 'out': 'public/models/enemies/bone_axeman.glb',
        'grip': ('r', 'UAL1', 'Sword_Idle'),
        'clips': {
            'UAL1': ['Sword_Idle', 'Walk_Loop', 'Jog_Fwd_Loop', 'Hit_Chest', 'Death01'],
            'UAL2': ['Sword_GroundPound', 'Sword_Heavy_A', 'Sword_Heavy_C', 'LiftAir=Exec_Lift', 'LiftAir_Idle_Loop=Exec_Hang', 'LiftAir_Fall_Air_Loop=Exec_Flail', 'LiftAir_Hit_R@0.3=Exec_Fold'],
        },
    },
    # The Bone Guard (Skeleton B: a helm, a sword): its guard up, its cuts, its counter, its guard broken.
    'boneGuard': {
        'glb': 'Skeleton_B.glb', 'out': 'public/models/enemies/bone_guard.glb',
        'grip': ('r', 'UAL1', 'Sword_Idle'),
        'clips': {
            'UAL1': ['Sword_Idle', 'Walk_Loop', 'Jog_Fwd_Loop', 'Jog_Left_Loop', 'Jog_Right_Loop', 'Jog_Bwd_Loop', 'Hit_Chest', 'Death02'],
            # (Its guard held: the block's raised moment, still.)
            'UAL2': ['Sword_Block', 'Sword_Block@0.3=Guard_Hold', 'Sword_Regular_A', 'Sword_Regular_Combo', 'Sword_Heavy_B', 'Idle_Shield_Break', 'LiftAir=Exec_Lift', 'LiftAir_Idle_Loop=Exec_Hang', 'LiftAir_Fall_Air_Loop=Exec_Flail', 'LiftAir_Hit_R@0.3=Exec_Fold'],
        },
    },
}
FINGERS = ('thumb', 'index', 'middle', 'ring', 'pinky')


def assets():
    d = os.path.dirname(os.path.abspath(__file__))
    while d != os.path.dirname(d):
        if os.path.isdir(os.path.join(d, 'ASSETS', 'QUATERNIUS')):
            return os.path.join(d, 'ASSETS', 'QUATERNIUS')
        d = os.path.dirname(d)
    raise SystemExit('no ASSETS/QUATERNIUS above this folder')


def read_glb(p):
    b = open(p, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    rest = b[20 + n:]
    m = struct.unpack('<I', rest[0:4])[0]
    return j, bytearray(rest[8:8 + m])


def write_glb(p, j, binary):
    while len(binary) % 4:
        binary += b'\0'
    j['buffers'] = [{'byteLength': len(binary)}]
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4:
        js += b' '
    with open(p, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(binary)))
        f.write(struct.pack('<I4s', len(js), b'JSON')); f.write(js)
        f.write(struct.pack('<I4s', len(binary), b'BIN\0')); f.write(binary)


SIZES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def view_bytes(j, binary, vi):
    v = j['bufferViews'][vi]
    o = v.get('byteOffset', 0)
    return bytes(binary[o:o + v['byteLength']])


def accessor(j, binary, i):
    a = j['accessors'][i]
    v = j['bufferViews'][a['bufferView']]
    assert a['componentType'] == 5126, a
    k = SIZES[a['type']]
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = v.get('byteStride', 0)
    arr = np.frombuffer(bytes(binary[off:off + (stride or 4 * k) * a['count']]), dtype=np.float32)
    if stride and stride != 4 * k:
        arr = arr.reshape(-1, stride // 4)[:, :k]
    return arr.reshape(a['count'], k) if k > 1 else arr.copy()


# Quaternions as [x, y, z, w].
def qmul(a, b):
    ax, ay, az, aw = np.moveaxis(a, -1, 0); bx, by, bz, bw = np.moveaxis(b, -1, 0)
    return np.stack([aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz], -1)


def qinv(q):
    return q * np.array([-1, -1, -1, 1.0])


def qrot(q, v):
    p = np.concatenate([v, np.zeros(v.shape[:-1] + (1,))], -1)
    return qmul(qmul(q, p), qinv(q))[..., :3]


def resample(times, vals, t, quat):
    if len(times) == 1:
        return np.repeat(vals[:1].astype(float), len(t), 0)
    if quat:
        i = np.clip(np.searchsorted(times, t) - 1, 0, len(times) - 2)
        f = np.clip((t - times[i]) / np.maximum(times[i + 1] - times[i], 1e-9), 0, 1)[:, None]
        a, b = vals[i].astype(float), vals[i + 1].astype(float).copy()
        b[np.sum(a * b, -1) < 0] *= -1
        out = a * (1 - f) + b * f
        return out / np.linalg.norm(out, axis=-1, keepdims=True)
    return np.stack([np.interp(t, times, vals[:, k]) for k in range(vals.shape[1])], -1)


class Rig:
    def __init__(self, j):
        self.j = j
        self.idx = {j['nodes'][k]['name']: k for k in j['skins'][0]['joints']}
        self.parent = {}
        for p, n in enumerate(j['nodes']):
            for c in n.get('children', []):
                self.parent[c] = p

    def rest(self, k):
        n = self.j['nodes'][k]
        return np.array(n.get('translation', [0, 0, 0]), float), np.array(n.get('rotation', [0, 0, 0, 1]), float)

    def chain(self, k):
        out = []
        while k is not None:
            out.append(k); k = self.parent.get(k)
        return out[::-1]

    def world(self, k, local):
        g = None
        for c in self.chain(k):
            q = local.get(c)
            if q is None:
                q = self.rest(c)[1][None]
            g = q if g is None else qmul(g, q)
        return g

    def hip(self):
        g = np.zeros(3); q = np.array([0, 0, 0, 1.0])
        for c in self.chain(self.idx['pelvis']):
            t, r = self.rest(c)
            g = g + qrot(q, t); q = qmul(q, r)
        return abs(g[1])


def clip_of(uj, ubin, ur, name, at=None):
    """A UAL clip's times, its bones' rotations and the pelvis's place (resampled at FPS; `at`: one still moment)."""
    a = next(x for x in uj['animations'] if x['name'] == name)
    ch, dur = {}, 0
    for c in a['channels']:
        s = a['samplers'][c['sampler']]
        assert s.get('interpolation', 'LINEAR') == 'LINEAR', s
        tt = accessor(uj, ubin, s['input']); vv = accessor(uj, ubin, s['output'])
        dur = max(dur, float(tt[-1]))
        ch[(c['target']['node'], c['target']['path'])] = (tt, vv)
    if at is None:
        t = np.arange(0, dur + 1e-6, 1 / FPS)
        if t[-1] < dur - 1e-4:
            t = np.append(t, dur)
    else:
        t = np.array([dur * at, dur * at + 1e-3])
    rot = {k: resample(*ch[(k, 'rotation')], t, True) for k in ur.idx.values() if (k, 'rotation') in ch}
    kp = ur.idx['pelvis']
    pel = resample(*ch[(kp, 'translation')], t, False) if (kp, 'translation') in ch else None
    return t, rot, pel


def retarget(br, ur, rot, pel, F):
    """The boss's tracks: each bone the same world turn from its rest as the library's; the pelvis's bob scaled."""
    tracks, gb = {}, {}
    for nm, kb in sorted(br.idx.items(), key=lambda kv: len(br.chain(kv[1]))):
        # (A bone the library hasn't, the Lycan's tail: kept as it rests on its parent.)
        if nm not in ur.idx:
            continue
        ku = ur.idx[nm]
        g = qmul(qmul(ur.world(ku, rot), np.broadcast_to(qinv(ur.world(ku, {})[0]), (F, 4))), np.broadcast_to(br.world(kb, {})[0], (F, 4)))
        gb[kb] = g
        p = br.parent.get(kb)
        gp = gb[p] if p in gb else np.broadcast_to(br.world(p, {})[0] if p is not None else np.array([0, 0, 0, 1.0]), (F, 4))
        tracks[(kb, 'rotation')] = qmul(qinv(gp), g)
    if pel is not None:
        kp_u, kp_b = ur.idx['pelvis'], br.idx['pelvis']
        tracks[(kp_b, 'translation')] = br.rest(kp_b)[0] + (pel - ur.rest(kp_u)[0]) * (br.hip() / ur.hip())
    return tracks


def textures(j, binary, color, emissive=None):
    """Every image at SIZE (the base colour its variant's; the glow its own, if it has one), re-encoded: colour and ORM
    as JPEG, the normals PNG."""
    out = bytearray()
    views = []
    for im in j['images']:
        name = im.get('name', '')
        own = color if 'BaseColor' in name else emissive if 'Emissive' in name else None
        img = Image.open(own) if own else Image.open(io.BytesIO(view_bytes(j, binary, im['bufferView'])))
        img = img.convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
        buf = io.BytesIO()
        if 'Normal' in name:
            img.save(buf, 'PNG', optimize=True); im['mimeType'] = 'image/png'
        else:
            img.save(buf, 'JPEG', quality=90); im['mimeType'] = 'image/jpeg'
        views.append(buf.getvalue())
    return views


def bake(key):
    cfg = MONSTERS[key]
    A = assets()
    bdir = os.path.join(A, 'High-quality-enemies', 'Bestiary - Dungeon Monsters Kit[Source]')
    bj, bbin = read_glb(os.path.join(bdir, 'Exports', 'GLB (Godot-Unreal)', cfg['glb']))
    br = Rig(bj)
    libs = {'UAL1': os.path.join(A, 'ULA 1', 'Unreal-Godot', 'UAL1.glb'), 'UAL2': os.path.join(A, 'ULA 2', 'Unreal-Godot', 'UAL2.glb')}
    loaded = {}

    def lib(name):
        if name not in loaded:
            uj, ubin = read_glb(libs[name]); loaded[name] = (uj, ubin, Rig(uj))
        return loaded[name]

    # The weapon hand's fingers: the grip clip's first moment, retargeted, held in every clip (none: its own clips').
    grip = {}
    if cfg.get('grip'):
        side, gl, gc = cfg['grip']
        uj, ubin, ur = lib(gl)
        t, rot, pel = clip_of(uj, ubin, ur, gc)
        grip_tracks = retarget(br, ur, rot, None, len(t))
        grip = {node: q[0] for (node, path), q in grip_tracks.items() if bj['nodes'][node]['name'].startswith(FINGERS) and bj['nodes'][node]['name'].endswith('_' + side)}
    anims = []
    for libname, names in cfg['clips'].items():
        uj, ubin, ur = lib(libname)
        for spec in names:
            src, dst = spec.split('=') if '=' in spec else (spec, spec)
            t, tracks = None, None
            # (One after the other: each after the last, a frame on.)
            for part in src.split('+'):
                at = None
                if '@' in part:
                    part, frac = part.split('@'); at = float(frac)
                pt, rot, pel = clip_of(uj, ubin, ur, part, at)
                pt = pt - pt[0]
                pk = retarget(br, ur, rot, pel, len(pt))
                if t is None:
                    t, tracks = pt, pk
                else:
                    t = np.concatenate([t, pt + t[-1] + 1 / FPS])
                    tracks = {k: np.concatenate([np.asarray(tracks[k]), np.asarray(pk[k])]) for k in tracks}
            for node, q in grip.items():
                tracks[(node, 'rotation')] = np.broadcast_to(q, (len(t), 4))
            anims.append((dst, t, tracks))
    # A fresh buffer: the boss's own views but its images, then the new images, then the clips.
    color = os.path.join(bdir, 'Blends', cfg['color']) if cfg.get('color') else None
    emissive = cfg.get('emissive')
    # (Painted: its colour and glow made from its own, okami_paint.py.)
    if cfg.get('paint'):
        import tempfile
        from okami_paint import paint
        c, e = paint(os.path.join(bdir, 'Exports', 'GLB (Godot-Unreal)', cfg['glb']))
        tmp = tempfile.mkdtemp()
        color, emissive = os.path.join(tmp, 'color.png'), os.path.join(tmp, 'emissive.png')
        Image.fromarray((np.clip(c, 0, 1) * 255).astype(np.uint8)).save(color)
        Image.fromarray((np.clip(e, 0, 1) * 255).astype(np.uint8)).save(emissive)
    images = textures(bj, bbin, color, emissive)
    image_views = {im['bufferView'] for im in bj['images']}
    out = bytearray()
    remap = {}
    new_views = []
    for vi, v in enumerate(bj['bufferViews']):
        if vi in image_views:
            continue
        while len(out) % 4:
            out.append(0)
        data = view_bytes(bj, bbin, vi)
        nv = {k: v[k] for k in v if k not in ('byteOffset', 'buffer')}
        nv.update({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)})
        remap[vi] = len(new_views); new_views.append(nv); out.extend(data)
    for a in bj['accessors']:
        a['bufferView'] = remap[a['bufferView']]
    for im, data in zip(bj['images'], images):
        while len(out) % 4:
            out.append(0)
        new_views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)})
        im['bufferView'] = len(new_views) - 1
        out.extend(data)
    bj['bufferViews'] = new_views

    def add(arr, typ, mn=None, mx=None):
        data = np.ascontiguousarray(arr, dtype=np.float32).tobytes()
        while len(out) % 4:
            out.append(0)
        bj['bufferViews'].append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)})
        out.extend(data)
        acc = {'bufferView': len(bj['bufferViews']) - 1, 'componentType': 5126, 'count': len(arr), 'type': typ}
        if mn is not None:
            acc['min'] = mn; acc['max'] = mx
        bj['accessors'].append(acc)
        return len(bj['accessors']) - 1

    bj['animations'] = []
    for name, t, tracks in anims:
        ti = add(t, 'SCALAR', [float(t[0])], [float(t[-1])])
        samplers, channels = [], []
        for (node, path), vals in tracks.items():
            samplers.append({'input': ti, 'output': add(vals, 'VEC4' if path == 'rotation' else 'VEC3'), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': node, 'path': path}})
        bj['animations'].append({'name': name, 'samplers': samplers, 'channels': channels})
    # Pieces left out (its weapon): out of the scene.
    gone = {i for i, n in enumerate(bj['nodes']) if n.get('name') in cfg.get('drop', [])}
    for n in bj['nodes']:
        if 'children' in n:
            n['children'] = [c for c in n['children'] if c not in gone]
    for sc in bj['scenes']:
        sc['nodes'] = [c for c in sc['nodes'] if c not in gone]
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), cfg['out'])
    write_glb(path, bj, out)
    print('%s: %d clips, %.1f MB -> %s' % (key, len(anims), os.path.getsize(path) / 1e6, cfg['out']))


if __name__ == '__main__':
    for key in sys.argv[1:] or list(MONSTERS):
        bake(key)
