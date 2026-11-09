# Рендер кейсов-сундуков (свой дизайн): корпус с рёбрами жёсткости, металлические уголки, ручка, замки.
# Цвет корпуса — из палитры темы, окантовка по категории (дешёвые — сталь, ножевые/элитные — золото).
# Запуск: blender -b --python scripts/blender/build_cases.py -- [id ...]
import bpy, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CASES = json.load(open(os.path.join(HERE, 'cases.json')))
OUT = os.path.join(ROOT, 'public', 'cases')
os.makedirs(OUT, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
only = set(argv)


def hex2rgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1,)


def mat(name, color, metal, rough, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = coat
    return m


def box(name, size, loc, material, bevel=0.04, seg=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new('b', 'BEVEL'); m.width = bevel; m.segments = seg
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


def cyl(name, r, d, loc, rot, material):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=d, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name
    o.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return o


def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 40
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 520, 380
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.view_settings.exposure = -0.6
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.12, 0.13, 0.16, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35
    # свет: ключевой, контровой, заполняющий
    for loc, en, size in (((-2.5, -3, 4), 500, 3), ((3, 2.5, 3), 450, 2), ((3, -3, 1), 90, 4)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        L = bpy.context.active_object; L.data.energy = en; L.data.size = size
        d = (-loc[0], -loc[1], -loc[2])
        import mathutils
        L.rotation_euler = mathutils.Vector(d).to_track_quat('-Z', 'Y').to_euler()
    # пол-ловец тени
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.is_shadow_catcher = True
    # камера 3/4
    bpy.ops.object.camera_add(location=(3.1, -4.3, 2.6))
    cam = bpy.context.active_object; sc.camera = cam
    import mathutils
    cam.rotation_euler = (mathutils.Vector((0, 0, 0.62)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 50


def build_case(c):
    pal = c['palette']
    cat = c['cat']
    body_col = hex2rgb(pal[0])
    accent = hex2rgb(pal[1] if len(pal) > 1 else pal[0])
    gold = cat in ('knife', 'elite')
    trim = mat('trim', (0.83, 0.62, 0.22, 1) if gold else (0.55, 0.57, 0.6, 1), 1.0, 0.22 if gold else 0.3)
    dark = mat('dark', (0.03, 0.03, 0.035, 1), 0.4, 0.5)
    body = mat('body', body_col, 0.15 if cat != 'cheap' else 0.0, 0.42 if cat != 'elite' else 0.25, 0.6 if cat in ('elite', 'knife', 'event') else 0.2)
    acc = mat('acc', accent, 0.3, 0.35, 0.3)
    W, D, H, LID = 2.4, 1.5, 1.0, 0.36
    # корпус и крышка
    box('body', (W, D, H), (0, 0, H / 2 + 0.02), body, 0.07)
    box('lid', (W + 0.04, D + 0.04, LID), (0, 0, H + LID / 2 + 0.03), body, 0.09)
    # шов крышки
    box('seam', (W + 0.06, D + 0.06, 0.04), (0, 0, H + 0.02), dark, 0.01, 2)
    # рёбра жёсткости по фронту и бокам
    for x in (-0.75, 0.75):
        box(f'rib{x}', (0.16, D + 0.1, H - 0.1), (x, 0, H / 2 + 0.03), acc, 0.04)
        box(f'ribl{x}', (0.16, D + 0.12, LID - 0.06), (x, 0, H + LID / 2 + 0.03), acc, 0.04)
    # уголки
    for sx in (-1, 1):
        for sy in (-1, 1):
            for z in (0.12, H + LID - 0.08):
                box('corner', (0.26, 0.26, 0.26), (sx * (W / 2), sy * (D / 2), z), trim, 0.06)
    # замки
    for x in (-0.42, 0.42):
        box('lock', (0.24, 0.1, 0.34), (x, -D / 2 - 0.06, H + 0.02), trim, 0.03)
        box('lockh', (0.12, 0.06, 0.12), (x, -D / 2 - 0.12, H - 0.08), dark, 0.02)
    # табличка-эмблема на фронте
    box('plate', (0.92, 0.06, 0.5), (0, -D / 2 - 0.03, H * 0.5), dark, 0.04)
    box('plate2', (0.84, 0.07, 0.42), (0, -D / 2 - 0.05, H * 0.5), acc, 0.03)
    # ручка сбоку
    cyl('handle', 0.05, 0.7, (W / 2 + 0.18, 0, H * 0.62), (math.pi / 2, 0, 0), trim)
    for y in (-0.33, 0.33):
        box('hb', (0.2, 0.08, 0.08), (W / 2 + 0.09, y, H * 0.62), trim, 0.02)
    # ножки
    for sx in (-1, 1):
        box('foot', (W - 0.3, 0.16, 0.06), (0, sx * (D / 2 - 0.15), 0.03), dark, 0.02)


build_scene()
base = set(o.name for o in bpy.data.objects)
for c in CASES:
    if only and c['id'] not in only: continue
    for o in list(bpy.data.objects):
        if o.name not in base: bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials):
        if m.users == 0: bpy.data.materials.remove(m)
    build_case(c)
    bpy.context.scene.render.filepath = os.path.join(OUT, f"{c['id']}.png")
    bpy.ops.render.render(write_still=True)
    print('OK', c['id'])
