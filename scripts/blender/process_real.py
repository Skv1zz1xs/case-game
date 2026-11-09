# Подготовка скачанных моделей (scripts/sketchfab/raw) для игры:
# длинная ось → X (ствол вправо), центр в нуле, длина 4 единицы, текстуры ≤768 px (MAXTEX), экспорт в public/models/real/<key>.glb,
# контрольный рендер вида сбоку. Запуск: blender -b --python scripts/blender/process_real.py -- [key ...] [--flip key,key] [--yaw key=deg]
import bpy, os, sys, math, glob, json, mathutils

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
RAW = os.path.join(ROOT, 'scripts', 'sketchfab', 'raw')
OUT = os.path.join(ROOT, 'public', 'models', 'real')
PREV = os.environ.get('PREVIEW_DIR', '/tmp')
os.makedirs(OUT, exist_ok=True)
FIX = json.load(open(os.path.join(HERE, 'real_fix.json'))) if os.path.exists(os.path.join(HERE, 'real_fix.json')) else {}
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
keys = argv or sorted(set(os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(RAW, '*'))))


def src_path(k):
    p = os.path.join(RAW, f'{k}.glb')
    if os.path.exists(p): return p
    g = glob.glob(os.path.join(RAW, k, '**', '*.gltf'), recursive=True)
    return g[0] if g else None


def process(k):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src_path(k))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    # применить все трансформации, объединить в один объект
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1: bpy.ops.object.join()
    o = bpy.context.active_object
    for x in list(bpy.context.scene.objects):
        if x != o: bpy.data.objects.remove(x, do_unlink=True)
    # главная ось → X, «верх» → Z (по наименьшему размаху Y как толщине)
    vs = [v.co.copy() for v in o.data.vertices]
    mn = mathutils.Vector([min(v[i] for v in vs) for i in range(3)])
    mx = mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
    size = mx - mn
    order = sorted(range(3), key=lambda i: -size[i])  # длинная, средняя (высота), короткая (толщина)
    M = mathutils.Matrix.Identity(3)
    rows = [mathutils.Vector([1 if j == order[0] else 0 for j in range(3)]),
            mathutils.Vector([1 if j == order[2] else 0 for j in range(3)]),
            mathutils.Vector([1 if j == order[1] else 0 for j in range(3)])]
    for i in range(3): M[i] = rows[i]
    if M.determinant() < 0: M[1] = -M[1]
    o.data.transform(M.to_4x4())
    fx = FIX.get(k, {})
    if fx.get('flipx'): o.data.transform(mathutils.Matrix.Rotation(math.pi, 4, 'Z'))
    if fx.get('flipz'): o.data.transform(mathutils.Matrix.Rotation(math.pi, 4, 'X'))
    if fx.get('roll'): o.data.transform(mathutils.Matrix.Rotation(math.radians(fx['roll']), 4, 'Y'))
    vs = [v.co for v in o.data.vertices]
    mn = mathutils.Vector([min(v[i] for v in vs) for i in range(3)])
    mx = mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
    c = (mn + mx) / 2; L = (mx - mn).x
    o.data.transform(mathutils.Matrix.Scale(4 / L, 4) @ mathutils.Matrix.Translation(-c))
    o.data.update()
    # прореживание тяжёлых моделей
    faces = len(o.data.polygons)
    if faces > 60000:
        m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = 60000 / faces
        bpy.ops.object.modifier_apply(modifier='dec')
    # текстуры ≤1024
    MAXT = int(os.environ.get('MAXTEX', '768'))
    for img in bpy.data.images:
        if img.size[0] > MAXT or img.size[1] > MAXT:
            s = MAXT / max(img.size)
            img.scale(max(1, int(img.size[0] * s)), max(1, int(img.size[1] * s)))
    out = os.path.join(OUT, f'{k}.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=85,
                              export_yup=True, export_apply=True)
    print('OK', k, 'граней', len(o.data.polygons), 'размер', round(os.path.getsize(out) / 1e6, 2), 'МБ')
    return o


def preview(k, o):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, 'EEVEE_NEXT') else 'CYCLES'
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 640, 300
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.35, 0.36, 0.4, 1)
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(-50), math.radians(20), 0)); bpy.context.active_object.data.energy = 3
    bpy.ops.object.camera_add(location=(0, -10, 0), rotation=(math.radians(90), 0, 0))
    cam = bpy.context.active_object; sc.camera = cam
    cam.data.type = "ORTHO"; cam.data.ortho_scale = max(4.4, o.dimensions.z * 2.2 * 1.05)
    sc.render.filepath = os.path.join(PREV, f'real-{k}.png')
    bpy.ops.render.render(write_still=True)


for k in keys:
    if not src_path(k): print('нет файла', k); continue
    o = process(k)
    preview(k, o)
