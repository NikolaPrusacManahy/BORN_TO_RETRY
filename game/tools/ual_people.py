# Update 0.3.33 — bakes Universal Animation Library clips (ASSETS/QUATERNIUS/ULA 1, ULA 2) onto one of the More-enemies
# pack's people (ASSETS/QUATERNIUS/More-enemies: their own rig of 23 bones, big heads, their feet IK targets under the
# rig's root), for floor 8's martial artists (MD/FLOOR8_SHRINE_PLAN.md; the designer: "Make sure you match the proper
# animation, with 200+ animation SURELY you can do something about it"). Each of their bones takes the turn of the
# library's bone in the same place (the hips the pelvis's, the shins the calves'…) as a turn from its rest in world
# space, as ual_bake.py does for the Bestiary; the body's bob and lunge scaled to their legs; each foot put where its
# shin now ends, turned as the library's foot is. A clip can be kept in place (`!`: its body's travel across the floor
# taken out, the game moving them instead), a still pose taken from a moment (`clip@0.4`), clips played one after the
# other as one (`a+b`), renamed (`=Name`). Their own clips are dropped but those kept (`keep`). A weapon held as their
# own Idle had it is turned about the forearm (`weapon_turn`, degrees) to sit in the fist as the library's clips swing it.
#   1. blender --background --disable-autoexec --python tools/blender/export_people.py -- --blend "<More-enemies>/X.blend"
#        --glb <base folder>/X.glb --previews <folder> [--weapon … --length …]
#   2. python tools/ual_people.py <base folder> [fighter …]
import os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ual_bake import FPS, Rig, accessor, assets, clip_of, qinv, qmul, qrot, read_glb, write_glb  # noqa: E402
from ual_fighters import FIGHTERS  # noqa: E402

# Their bones and the library's bone each follows.
MAP = {'Body': 'pelvis', 'Hips': 'spine_01', 'Abdomen': 'spine_02', 'Torso': 'spine_03', 'Neck': 'neck_01', 'Head': 'Head',
       'Shoulder.L': 'clavicle_l', 'UpperArm.L': 'upperarm_l', 'LowerArm.L': 'lowerarm_l', 'Fist.L': 'hand_l',
       'Shoulder.R': 'clavicle_r', 'UpperArm.R': 'upperarm_r', 'LowerArm.R': 'lowerarm_r', 'Fist.R': 'hand_r',
       'UpperLeg.L': 'thigh_l', 'LowerLeg.L': 'calf_l', 'UpperLeg.R': 'thigh_r', 'LowerLeg.R': 'calf_r'}
# Their feet (under the root): the shin each hangs off, the library's foot it turns as.
FEET = {'Foot.L': ('LowerLeg.L', 'foot_l'), 'Foot.R': ('LowerLeg.R', 'foot_r')}


def fk(rig, rot, trans, F, nodes):
    """World places and turns of `nodes` (and their parents) over F frames, from local turns and places (rest where
    not given)."""
    cache = {}

    def get(k):
        if k in cache:
            return cache[k]
        t0, r0 = rig.rest(k)
        r = rot.get(k)
        r = np.broadcast_to(r0, (F, 4)) if r is None else r
        t = trans.get(k)
        t = np.broadcast_to(t0, (F, 3)) if t is None else t
        p = rig.parent.get(k)
        if p is None:
            out = (np.asarray(t, float), np.asarray(r, float))
        else:
            pp, pr = get(p)
            out = (pp + qrot(pr, t), qmul(pr, r))
        cache[k] = out
        return out

    for k in nodes:
        get(k)
    return cache


def legs(rig):
    """Their leg's length (hip to ankle) at rest."""
    w = fk(rig, {}, {}, 1, list(rig.idx.values()))
    up = w[rig.idx['UpperLeg.L']][0][0]
    knee = w[rig.idx['LowerLeg.L']][0][0]
    foot = w[rig.idx['Foot.L']][0][0]
    return float(np.linalg.norm(knee - up) + np.linalg.norm(foot - knee))


def ual_legs(ur):
    w = fk(ur, {}, {}, 1, list(ur.idx.values()))
    a, b, c = (w[ur.idx[n]][0][0] for n in ('thigh_l', 'calf_l', 'foot_l'))
    return float(np.linalg.norm(b - a) + np.linalg.norm(c - b))


def retarget(pr, ur, rot, pel, F, in_place):
    """Their tracks (a turn and a place for every bone) for one of the library's clips."""
    kids = sorted(pr.idx.values(), key=lambda k: len(pr.chain(k)))
    rest = fk(pr, {}, {}, 1, kids)
    urest = fk(ur, {}, {}, 1, list(ur.idx.values()))
    G = {}
    local_rot, local_pos = {}, {}
    scale = legs(pr) / ual_legs(ur)
    # The library's world turns this clip, and its pelvis's world place.
    uw = fk(ur, rot, {ur.idx['pelvis']: pel} if pel is not None else {}, F, list(ur.idx.values()))
    for k in kids:
        name = pr.j['nodes'][k]['name']
        p = pr.parent.get(k)
        gp = G[p] if p in G else np.broadcast_to(rest[p][1][0] if p is not None else np.array([0, 0, 0, 1.0]), (F, 4))
        if name in MAP:
            ku = ur.idx[MAP[name]]
            g = qmul(qmul(uw[ku][1], np.broadcast_to(qinv(urest[ku][1][0]), (F, 4))), np.broadcast_to(rest[k][1][0], (F, 4)))
        elif name in FEET:
            g = None
        else:
            g = qmul(gp, np.broadcast_to(pr.rest(k)[1], (F, 4)))
        if g is not None:
            G[k] = g
            local_rot[k] = qmul(qinv(gp), g)
    # The body's travel: the library's pelvis's, scaled to their legs (across the floor taken out if kept in place).
    kb = pr.idx['Body']
    move = (uw[ur.idx['pelvis']][0] - urest[ur.idx['pelvis']][0][0]) * scale
    if in_place:
        move[:, 0] = 0
        move[:, 2] = 0
    root = pr.parent[kb]
    rw = fk(pr, local_rot, {}, F, [root])[root]
    body_world = rest[kb][0][0] + move
    local_pos[kb] = qrot(qinv(rw[1]), body_world - rw[0])
    # Each foot where its shin ends now, turned as the library's foot is.
    w = fk(pr, local_rot, local_pos, F, kids)
    for foot, (shin, ufoot) in FEET.items():
        kf, ks = pr.idx[foot], pr.idx[shin]
        off = qrot(qinv(rest[ks][1][0]), rest[kf][0][0] - rest[ks][0][0])
        at = w[ks][0] + qrot(w[ks][1], np.broadcast_to(off, (F, 3)))
        ku = ur.idx[ufoot]
        g = qmul(qmul(uw[ku][1], np.broadcast_to(qinv(urest[ku][1][0]), (F, 4))), np.broadcast_to(rest[kf][1][0], (F, 4)))
        pf = pr.parent[kf]
        pw = w[pf]
        local_rot[kf] = qmul(qinv(pw[1]), g)
        local_pos[kf] = qrot(qinv(pw[1]), at - pw[0])
    tracks = {}
    for k in kids:
        t0, r0 = pr.rest(k)
        tracks[(k, 'rotation')] = local_rot.get(k, np.broadcast_to(r0, (F, 4)))
        tracks[(k, 'translation')] = local_pos.get(k, np.broadcast_to(t0, (F, 3)))
    return tracks


def bake(key, base):
    cfg = FIGHTERS[key]
    A = assets()
    pj, pbin = read_glb(os.path.join(base, cfg['base'] + '.glb'))
    pr = Rig(pj)
    libs = {'UAL1': os.path.join(A, 'ULA 1', 'Unreal-Godot', 'UAL1.glb'), 'UAL2': os.path.join(A, 'ULA 2', 'Unreal-Godot', 'UAL2.glb')}
    loaded = {}

    def lib(name):
        if name not in loaded:
            uj, ubin = read_glb(libs[name])
            loaded[name] = (uj, ubin, Rig(uj))
        return loaded[name]

    anims = []
    for libname, names in cfg['clips'].items():
        uj, ubin, ur = lib(libname)
        for spec in names:
            src, dst = spec.split('=') if '=' in spec else (spec, spec)
            in_place = src.endswith('!')
            src = src.rstrip('!')
            dst = dst.rstrip('!')
            t, tracks = None, None
            for part in src.split('+'):
                at = None
                if '@' in part:
                    part, frac = part.split('@')
                    at = float(frac)
                pt, rot, pel = clip_of(uj, ubin, ur, part, at)
                pt = pt - pt[0]
                pk = retarget(pr, ur, rot, pel, len(pt), in_place)
                if t is None:
                    t, tracks = pt, pk
                else:
                    t = np.concatenate([t, pt + t[-1] + 1 / FPS])
                    tracks = {k: np.concatenate([np.asarray(tracks[k]), np.asarray(pk[k])]) for k in tracks}
            anims.append((dst, t, tracks))
    # The weapon turned about the forearm (round the fist bone's own line, so its grip stays put).
    turn = cfg.get('weapon_turn')
    if turn:
        a = np.radians(turn) / 2
        qt = np.array([0, np.sin(a), 0, np.cos(a)])
        for n in pj['nodes']:
            if n.get('name') == 'Weapon':
                n['rotation'] = list(qmul(qt, np.array(n.get('rotation', [0, 0, 0, 1.0]))))
                n['translation'] = list(qrot(qt, np.array(n.get('translation', [0, 0, 0.0]))))
    # Their own clips kept (by name), the rest dropped; the library's added.
    keep = set(cfg.get('keep', []))
    pj['animations'] = [a for a in pj.get('animations', []) if a['name'] in keep]
    out = bytearray(pbin)

    def add(arr, typ, mn=None, mx=None):
        data = np.ascontiguousarray(arr, dtype=np.float32).tobytes()
        while len(out) % 4:
            out.append(0)
        pj['bufferViews'].append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)})
        out.extend(data)
        acc = {'bufferView': len(pj['bufferViews']) - 1, 'componentType': 5126, 'count': len(arr), 'type': typ}
        if mn is not None:
            acc['min'] = mn
            acc['max'] = mx
        pj['accessors'].append(acc)
        return len(pj['accessors']) - 1

    for name, t, tracks in anims:
        ti = add(t, 'SCALAR', [float(t[0])], [float(t[-1])])
        samplers, channels = [], []
        for (node, path), vals in tracks.items():
            samplers.append({'input': ti, 'output': add(vals, 'VEC4' if path == 'rotation' else 'VEC3'), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': node, 'path': path}})
        pj['animations'].append({'name': name, 'samplers': samplers, 'channels': channels})
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), cfg['out'])
    os.makedirs(os.path.dirname(path), exist_ok=True)
    write_glb(path, pj, out)
    print('%s: %d clips, %.2f MB -> %s' % (key, len(pj['animations']), os.path.getsize(path) / 1e6, cfg['out']))


if __name__ == '__main__':
    base = sys.argv[1]
    for key in sys.argv[2:] or list(FIGHTERS):
        bake(key, base)
