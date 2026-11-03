# Update 0.3.33 — where each of floor 8's fighters' blows lands in its clip (ual_fighters.py, ual_people.py): the
# moments a fist, a foot or its weapon's tip reaches furthest forward of its hips (peaks, a share of the clip through),
# and how far (m, at its game height), for the game's warnings and hits to land with the clip.
#   python tools/ual_lands.py <base folder> [fighter …]
import os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ual_bake import Rig, accessor, assets, clip_of, qrot, read_glb  # noqa: E402
from ual_people import fk, retarget  # noqa: E402
from ual_fighters import FIGHTERS  # noqa: E402

# The blows to measure, by fighter (as named in the game's model).
BLOWS = {
    'karateka': ['Punch_Jab', 'Punch_Cross', 'Kick', 'Melee_Combo', 'Melee_Hook', 'Melee_Knee', 'Melee_Uppercut'],
    'karateGirl': ['Punch_Jab', 'Kick', 'Melee_Combo', 'Melee_Hook', 'Melee_Knee', 'JogToFlip'],
    'shinobi': ['OverhandThrow', 'Sword_Dash', 'Sword_Light_A', 'Sword_Light_B', 'Sword_Light_Combo'],
    'kunoichi': ['Spell_Simple_Shoot', 'Kick', 'Melee_Hook', 'Sword_Aerial_A', 'NinjaJump_Land', 'WallRun_Jump_L'],
    'sandNinja': ['OverhandThrow', 'Farm_ScatteringSeeds', 'Melee_Hook', 'Punch_Jab', 'Roll'],
    'archer': ['Bow_Notch', 'Bow_Shoot', 'Bow_RapidShoot_Loop'],
    'sensei': ['Sword_Regular_Combo', 'Sword_Heavy_Combo', 'Sword_GroundPound', 'Sword_UpperCut', 'Spell_Simple_Shoot', 'Sword_Block'],
    'shadow': ['Sword_Dash', 'Sword_Light_Combo', 'Sword_Heavy_A', 'Sword_Aerial_Combo_Loop', 'NinjaJump_Land'],
}
TIPS = ('Fist.L', 'Fist.R', 'Foot.L', 'Foot.R')
# The game's heights (m) its body is drawn at (kindsShrine.ts).
HEIGHT = {'karateka': 1.95, 'karateGirl': 1.85, 'shinobi': 1.95, 'kunoichi': 1.85, 'sandNinja': 1.9, 'archer': 1.85, 'sensei': 3.1, 'shadow': 2.9}


def measure(key, base):
    cfg = FIGHTERS[key]
    pj, pbin = read_glb(os.path.join(base, cfg['base'] + '.glb'))
    pr = Rig(pj)
    A = assets()
    libs = {}
    for lib, path in (('UAL1', 'ULA 1'), ('UAL2', 'ULA 2')):
        uj, ub = read_glb(os.path.join(A, path, 'Unreal-Godot', lib + '.glb'))
        libs[lib] = (uj, ub, Rig(uj))
    which = {spec.split('=')[-1].rstrip('!').split('@')[0]: lib for lib, names in cfg['clips'].items() for spec in names}
    # The weapon's tip in its fist's space, if it has one.
    tip = None
    w = next((n for n in pj['nodes'] if n.get('name') == 'Weapon'), None)
    if w is not None:
        P = np.concatenate([accessor(pj, pbin, p['attributes']['POSITION']) for p in pj['meshes'][w['mesh']]['primitives']])
        a = np.radians(cfg.get('weapon_turn', 0)) / 2
        qt = np.array([0, np.sin(a), 0, np.cos(a)])
        vf = qrot(np.broadcast_to(np.array(w.get('rotation', [0, 0, 0, 1.0])), (len(P), 4)), P) + np.array(w.get('translation', [0, 0, 0.0]))
        vf = qrot(np.broadcast_to(qt, (len(vf), 4)), vf)
        tip = vf[np.argmax(np.linalg.norm(vf, axis=1))]
        fist = next(pj['nodes'][k]['name'] for k in pr.idx.values() if w is pj['nodes'][k] or pj['nodes'].index(w) in pj['nodes'][k].get('children', []))
    rest = fk(pr, {}, {}, 1, list(pr.idx.values()))
    tall = rest[pr.idx['Head']][0][0][1] * 1.18
    k = HEIGHT[key] / tall
    print(f'{key}:')
    for name in BLOWS[key]:
        uj, ub, ur = libs[which[name]]
        t, rot, pel = clip_of(uj, ub, ur, name)
        tr = retarget(pr, ur, rot, pel, len(t), True)
        W = fk(pr, {n: v for (n, p), v in tr.items() if p == 'rotation'}, {n: v for (n, p), v in tr.items() if p == 'translation'}, len(t), list(pr.idx.values()))
        hips = W[pr.idx['Body']][0]
        reach = np.max(np.stack([W[pr.idx[b]][0][:, 2] - hips[:, 2] for b in TIPS]), 0)
        if tip is not None:
            kf = pr.idx[fist]
            reach = np.maximum(reach, W[kf][0][:, 2] + qrot(W[kf][1], np.broadcast_to(tip, (len(t), 3)))[:, 2] - hips[:, 2])
        top = reach.max()
        peaks = [i for i in range(1, len(t) - 1) if reach[i] >= reach[i - 1] and reach[i] > reach[i + 1] and reach[i] > 0.55 * top]
        merged = []
        for i in peaks:
            if merged and i - merged[-1] < 6:
                if reach[i] > reach[merged[-1]]:
                    merged[-1] = i
                continue
            merged.append(i)
        dur = float(t[-1])
        print(f'  {name:24s} {dur:4.2f} s  lands ' + ', '.join(f'{i / (len(t) - 1):.2f} ({reach[i] * k:.2f} m)' for i in merged))


if __name__ == '__main__':
    base = sys.argv[1]
    for key in sys.argv[2:] or list(BLOWS):
        measure(key, base)
