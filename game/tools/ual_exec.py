# Update 0.3.40 — an execution's victim moves as a body does (the designer: "is there a way to rework stuff? like make
# stuff more accurate? are the animations in lib useful for this?"; the Orc's first): the Universal Animation Library's
# reactions (ASSETS/QUATERNIUS/ULA 1, ULA 2) baked into an enemy's own GLB as `Exec_…` clips, which its execution plays
# while you hold it (engine/exec/looks.ts `clips`). Their rig is the people's (ual_people.py: each bone the library's
# bone in its place, its turn carried from its rest in world space); the Ultimate Monsters' humanoids have the same
# bones with their fingers on the forearm (no fist bone: the fingers follow the forearm). Their own clips are kept; a
# kind's `Exec_…` clips are replaced each run. Specs as ual_people.py's (`clip!`: kept in place; `clip@0.3`: a still pose
# from that moment; `a+b`; `=Name`).
#   python tools/ual_exec.py [kind …]
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ual_bake import Rig, read_glb, write_glb  # noqa: E402
from ual_people import add_clips, build_clips  # noqa: E402

# Each kind's model and the clips its execution plays (their names are the look's: engine/exec/looks.ts).
EXEC = {
    # The Orc held up by its head in your palm, tossed, an uppercut into its belly as it comes down: lifted (it buckles,
    # then is drawn up arching), hanging and kicking, flailing in the air, curled round the blow.
    'grunt': {
        'glb': 'public/models/enemies/orc.glb',
        'clips': {'UAL2': ['LiftAir!=Exec_Lift', 'LiftAir_Idle_Loop!=Exec_Hang', 'LiftAir_Fall_Air_Loop!=Exec_Flail', 'LiftAir_Hit_R@0.3!=Exec_Fold']},
    },
}


def compact(pj, pbin):
    """The GLB without the data nothing uses any more (a run's old `Exec_` clips), so running again doesn't grow it."""
    used = set()
    for m in pj.get('meshes', []):
        for p in m['primitives']:
            used.update(p['attributes'].values())
            if 'indices' in p:
                used.add(p['indices'])
            for t in p.get('targets', []):
                used.update(t.values())
    for s in pj.get('skins', []):
        if 'inverseBindMatrices' in s:
            used.add(s['inverseBindMatrices'])
    for a in pj.get('animations', []):
        for s in a['samplers']:
            used.update((s['input'], s['output']))
    acc_map = {}
    accessors = []
    for i, a in enumerate(pj['accessors']):
        if i in used:
            acc_map[i] = len(accessors)
            accessors.append(a)
    views = {a['bufferView'] for a in accessors if 'bufferView' in a} | {im['bufferView'] for im in pj.get('images', []) if 'bufferView' in im}
    out, view_map, bufferViews = bytearray(), {}, []
    for i, v in enumerate(pj['bufferViews']):
        if i not in views:
            continue
        while len(out) % 4:
            out.append(0)
        start = v.get('byteOffset', 0)
        nv = dict(v, byteOffset=len(out))
        out.extend(pbin[start:start + v['byteLength']])
        view_map[i] = len(bufferViews)
        bufferViews.append(nv)
    for a in accessors:
        if 'bufferView' in a:
            a['bufferView'] = view_map[a['bufferView']]
    for im in pj.get('images', []):
        if 'bufferView' in im:
            im['bufferView'] = view_map[im['bufferView']]
    for m in pj.get('meshes', []):
        for p in m['primitives']:
            p['attributes'] = {k: acc_map[x] for k, x in p['attributes'].items()}
            if 'indices' in p:
                p['indices'] = acc_map[p['indices']]
            if 'targets' in p:
                p['targets'] = [{k: acc_map[x] for k, x in t.items()} for t in p['targets']]
    for s in pj.get('skins', []):
        if 'inverseBindMatrices' in s:
            s['inverseBindMatrices'] = acc_map[s['inverseBindMatrices']]
    for a in pj.get('animations', []):
        for s in a['samplers']:
            s['input'], s['output'] = acc_map[s['input']], acc_map[s['output']]
    pj['accessors'], pj['bufferViews'] = accessors, bufferViews
    pj['buffers'][0]['byteLength'] = len(out)
    return out


def bake(kind):
    cfg = EXEC[kind]
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), cfg['glb'])
    pj, pbin = read_glb(path)
    anims = build_clips(Rig(pj), cfg['clips'])
    pj['animations'] = [a for a in pj.get('animations', []) if not a['name'].startswith('Exec_')]
    own = len(pj['animations'])
    out = add_clips(pj, compact(pj, pbin), anims)
    write_glb(path, pj, out)
    print('%s: %d own clips + %d Exec_ clips, %.2f MB -> %s' % (kind, own, len(anims), os.path.getsize(path) / 1e6, cfg['glb']))


if __name__ == '__main__':
    for kind in sys.argv[1:] or list(EXEC):
        bake(kind)
