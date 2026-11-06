# Born To Retry — helpers shared by the Blender scene builders (build_menu_scene.py, build_camp_scene.py): load
# Quaternius pieces, place linked copies, drop marker empties, make flat-colour materials, render previews, and
# export the .glb the game loads. The builders put this folder on sys.path to import it.
import math
import os

import bpy
from mathutils import Matrix, Vector


def load_pieces(folder, names, protos, bake=False, recenter=()):
    """Each named .blend's mesh as a prototype for `place`. `bake`: the file's transforms baked in and multi-part
    pieces joined, so each is one mesh standing on its origin; pieces in `recenter` are also centred on it."""
    folder = os.path.abspath(folder)  # Blender reads a relative library path against the open .blend, not the shell
    for name in names:
        with bpy.data.libraries.load(os.path.join(folder, name + '.blend'), link=False) as (src, dst):
            dst.objects = [n for n in src.objects]
        meshes = [o for o in dst.objects if o is not None and o.type == 'MESH']
        protos[name] = join_baked(name, meshes, name in recenter) if bake else meshes[0]
    for img in bpy.data.images:
        if img.name != 'Render Result' and img.packed_file is None:
            print(f'warning: image {img.name} is not packed ({img.filepath})')
    return protos


def join_baked(name, objs, recenter=False):
    """All of a piece's meshes as one, in its file's world space (`recenter`: centred, base at z = 0)."""
    scene = bpy.context.scene
    for o in objs:
        scene.collection.objects.link(o)
    bpy.context.view_layer.update()
    if len(objs) > 1:
        with bpy.context.temp_override(active_object=objs[0], object=objs[0], selected_objects=objs, selected_editable_objects=objs):
            bpy.ops.object.join()
    o = objs[0]
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix.Identity(4)
    if recenter:
        vs = [v.co for v in o.data.vertices]
        cx = (min(v.x for v in vs) + max(v.x for v in vs)) / 2
        cy = (min(v.y for v in vs) + max(v.y for v in vs)) / 2
        o.data.transform(Matrix.Translation((-cx, -cy, -min(v.z for v in vs))))
        top = max(vs, key=lambda v: v.z)
        print(f'{name}: highest point at x {top.x:.2f} y {top.y:.2f} (which way it faces)')
    scene.collection.objects.unlink(o)
    return o


def place(protos, piece, loc, rot_z=0.0, scale=(1, 1, 1), name=None):
    """A linked copy of a prototype: shares its mesh, so the .glb stores each mesh once."""
    src = protos[piece]
    o = bpy.data.objects.new(name or piece, src.data)
    o.location = loc
    o.rotation_euler = (0, 0, math.radians(rot_z))
    o.scale = scale
    bpy.context.scene.collection.objects.link(o)
    return o


def marker(name, loc):
    """An empty the game finds by name (camera spots, lights)."""
    e = bpy.data.objects.new(name, None)
    e.location = loc
    e.empty_display_size = 0.3
    bpy.context.scene.collection.objects.link(e)
    return e


def flat_material(name, rgb, roughness=1.0):
    """A plain flat-colour material (the packs are flat colour too); made once, then reused by name."""
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def frame(y, z):
    """A rotation whose y axis is `y` and whose z axis is as close to `z` as it can be (from cut_arms.py)."""
    y = y.normalized()
    z = (z - y * z.dot(y)).normalized()
    return Matrix((y.cross(z), y, z)).transposed()


def orient_bone(arm, name, y_dir, back_dir):
    """Turns a pose bone to point along `y_dir` with its rest +z side (the back of the hand in the Quaternius
    T-pose) facing `back_dir`; its head stays where its parent put it (from cut_arms.py)."""
    bpy.context.view_layer.update()
    rest = arm.data.bones[name].matrix_local.to_3x3()
    turn = frame(Vector(y_dir), Vector(back_dir)) @ frame(rest @ Vector((0, 1, 0)), Vector((0, 0, 1))).inverted()
    pb = arm.pose.bones[name]
    m = (turn @ rest).to_4x4()
    m.translation = pb.head.copy()
    pb.matrix = m
    bpy.context.view_layer.update()


def bake_posed(objs, name):
    """The meshes among `objs` as one static mesh in their current pose (armature deform and bone parents applied),
    in world space. The originals (and their armature) are removed."""
    scene = bpy.context.scene
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    baked = []
    for o in objs:
        if o.type != 'MESH':
            continue
        e = o.evaluated_get(dg)
        me = bpy.data.meshes.new_from_object(e, depsgraph=dg)
        me.transform(e.matrix_world)
        b = bpy.data.objects.new(name, me)
        scene.collection.objects.link(b)
        baked.append(b)
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    if len(baked) > 1:
        with bpy.context.temp_override(active_object=baked[0], object=baked[0], selected_objects=baked, selected_editable_objects=baked):
            bpy.ops.object.join()
    out = baked[0]
    out.name = name
    return out


def setup_previews(engine, folder):
    """Render settings and a camera for `shoot`."""
    os.makedirs(folder, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = engine
    scene.render.image_settings.file_format = 'PNG'
    cam = bpy.data.objects.new('PreviewCam', bpy.data.cameras.new('PreviewCam'))
    cam.data.clip_start = 0.05
    scene.collection.objects.link(cam)
    scene.camera = cam


def shoot(engine, path, at, look, size=(1600, 800), vfov=60):
    """Renders a preview from `at` looking at `look`, with a vertical FOV like the game's cameras."""
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


def export_glb(path, **textures):
    """Exports the scene's meshes and markers (the game lights it itself), y up."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type in ('MESH', 'EMPTY'):
            o.select_set(True)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_lights=False, export_cameras=False, **textures)
    print(f'exported {path}')
