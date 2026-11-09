# Строит 3D-модели оружия из чертежей (arts.json) и сохраняет .glb в public/models.
# Запуск: blender -b --python scripts/blender/build_models.py -- [ключ ...] [--render путь.png]
# Детали-прямоугольники с вытянутой формой (стволы, глушители, трубки прицела) становятся цилиндрами,
# остальные — выдавленные контуры со скруглённой фаской. UV — боковая проекция в рамку чертежа,
# поэтому шаблон для Figma = вид сбоку.
import bpy, json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ARTS = json.load(open(os.path.join(HERE, 'arts.json')))
OUT = os.path.join(ROOT, 'public', 'models')
KNIFE = {'karambit', 'butterfly', 'bayonet', 'bowie', 'stiletto'}

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
render_to = None
if '--render' in argv:
    i = argv.index('--render'); render_to = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
keys = argv or list(ARTS.keys())


def depth_of(key, m, vh):
    if key == 'gloves':
        return vh * (0.24 if m == 'paint' else 0.27)
    if key in KNIFE:
        return vh * {'paint': 0.04, 'metal': 0.12}.get(m, 0.1)
    return vh * {'paint': 0.13, 'metal': 0.085, 'poly': 0.11, 'dark': 0.1, 'chrome': 0.05}[m]


# ——— разбор SVG-пути в многоугольники ———
TOK = re.compile(r'[MmLlHhVvQqAaZz]|-?\d*\.?\d+(?:e-?\d+)?')


def arc_points(x0, y0, rx, ry, rot, large, sweep, x1, y1, n=24):
    # SVG-дуга → точки (стандартное преобразование endpoint → center)
    if rx == 0 or ry == 0:
        return [(x1, y1)]
    phi = math.radians(rot)
    cp, sp = math.cos(phi), math.sin(phi)
    dx, dy = (x0 - x1) / 2, (y0 - y1) / 2
    x1p, y1p = cp * dx + sp * dy, -sp * dx + cp * dy
    lam = (x1p ** 2) / rx ** 2 + (y1p ** 2) / ry ** 2
    if lam > 1:
        rx *= math.sqrt(lam); ry *= math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
    co = math.sqrt(max(0, num / den)) * (-1 if large == sweep else 1)
    cxp, cyp = co * rx * y1p / ry, -co * ry * x1p / rx
    cx = cp * cxp - sp * cyp + (x0 + x1) / 2
    cy = sp * cxp + cp * cyp + (y0 + y1) / 2
    def ang(ux, uy, vx, vy):
        a = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        return a
    t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if not sweep and dt > 0: dt -= 2 * math.pi
    if sweep and dt < 0: dt += 2 * math.pi
    pts = []
    for k in range(1, n + 1):
        t = t1 + dt * k / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cp * x - sp * y + cx, sp * x + cp * y + cy))
    return pts


def parse(d):
    toks = TOK.findall(d)
    i, cmd = 0, None
    x = y = sx = sy = 0.0
    polys, cur = [], []
    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t; i += 1
            if cmd in 'Zz':
                if cur: polys.append(cur); cur = []
                x, y = sx, sy
                continue
        c = cmd
        if c in 'Mm':
            nx, ny = num(), num()
            if c == 'm': nx += x; ny += y
            if cur: polys.append(cur)
            cur = [(nx, ny)]; x, y = sx, sy = nx, ny
            cmd = 'l' if c == 'm' else 'L'
        elif c in 'Ll':
            nx, ny = num(), num()
            if c == 'l': nx += x; ny += y
            cur.append((nx, ny)); x, y = nx, ny
        elif c in 'Hh':
            nx = num(); nx = nx + x if c == 'h' else nx
            cur.append((nx, y)); x = nx
        elif c in 'Vv':
            ny = num(); ny = ny + y if c == 'v' else ny
            cur.append((x, ny)); y = ny
        elif c in 'Qq':
            qx, qy, nx, ny = num(), num(), num(), num()
            if c == 'q': qx += x; qy += y; nx += x; ny += y
            for k in range(1, 11):
                t = k / 10
                cur.append(((1 - t) ** 2 * x + 2 * (1 - t) * t * qx + t * t * nx, (1 - t) ** 2 * y + 2 * (1 - t) * t * qy + t * t * ny))
            x, y = nx, ny
        elif c in 'Aa':
            rx, ry, rot, la, sw, nx, ny = num(), num(), num(), num(), num(), num(), num()
            if c == 'a': nx += x; ny += y
            cur.extend(arc_points(x, y, rx, ry, rot, int(la), int(sw), nx, ny))
            x, y = nx, ny
        else:
            i += 1
    if cur: polys.append(cur)
    # убрать повтор последней точки
    out = []
    for p in polys:
        if len(p) > 2 and abs(p[0][0] - p[-1][0]) < 1e-6 and abs(p[0][1] - p[-1][1]) < 1e-6:
            p = p[:-1]
        if len(p) >= 3: out.append(p)
    return out


def is_bar(polys):
    # прямоугольник с осевыми сторонами, сильно вытянутый по X → цилиндр
    if len(polys) != 1 or len(polys[0]) != 4: return None
    p = polys[0]
    xs = [v[0] for v in p]; ys = [v[1] for v in p]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    # почти осевой прямоугольник (допуск 1.5 единицы на перекос)
    if sorted(ys)[1] - min(ys) > 1.5 or max(ys) - sorted(ys)[2] > 1.5: return None
    xs = [min(xs), max(xs)]; ys = [min(ys), max(ys)]
    if h <= 0 or w / h < 3.2: return None
    return xs[0], ys[0], w, h


# ——— материалы (имена важны: по ним игра подставляет свои) ———
MAT_COL = {'paint': (0.8, 0.35, 0.1, 1), 'metal': (0.06, 0.07, 0.08, 1), 'poly': (0.02, 0.02, 0.022, 1),
           'dark': (0.012, 0.012, 0.015, 1), 'chrome': (0.8, 0.82, 0.85, 1)}
def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = MAT_COL[name]
    b.inputs['Metallic'].default_value = {'paint': 0.2, 'metal': 0.9, 'poly': 0.0, 'dark': 0.3, 'chrome': 1.0}[name]
    b.inputs['Roughness'].default_value = {'paint': 0.35, 'metal': 0.3, 'poly': 0.75, 'dark': 0.55, 'chrome': 0.1}[name]
    return m


def set_uv(obj, vb):
    vx, vy, vw, vh = vb
    me = obj.data
    if not me.uv_layers: me.uv_layers.new(name='UVMap')
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = obj.matrix_world @ me.vertices[me.loops[li].vertex_index].co
            sx, sy = co.x, -co.y
            uv[li].uv = ((sx - vx) / vw, 1 - (sy - vy) / vh)


def build(key):
    art = ARTS[key]
    vx, vy, vw, vh = art['vb']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = []
    for idx, part in enumerate(art['parts']):
        m = part['m']
        polys = parse(part['d'])
        depth = depth_of(key, m, vh)
        bar = is_bar(polys) if key not in KNIFE and key != 'gloves' else None
        if bar:
            x0, y0, w, h = bar
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=h / 2, depth=w, location=(x0 + w / 2, -(y0 + h / 2), 0), rotation=(0, math.pi / 2, 0))
            o = bpy.context.active_object
            bev = o.modifiers.new('bev', 'BEVEL'); bev.width = min(h * 0.12, 0.8); bev.segments = 2; bev.limit_method = 'ANGLE'
        else:
            cu = bpy.data.curves.new(f'{m}_{idx}', 'CURVE')
            cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
            bevel = min(depth * 0.3, vh * 0.012 if key not in KNIFE else depth * 0.45)
            cu.extrude = max(0.01, depth / 2 - bevel)
            cu.bevel_depth = bevel; cu.bevel_resolution = 3
            for p in polys:
                sp = cu.splines.new('POLY'); sp.points.add(len(p) - 1)
                for j, (px, py) in enumerate(p):
                    sp.points[j].co = (px, -py, 0, 1)
                sp.use_cyclic_u = True
            o = bpy.data.objects.new(f'{m}_{idx}', cu)
            bpy.context.collection.objects.link(o)
        o.name = f'{m}_{idx}'
        o.data.materials.clear() if hasattr(o.data, 'materials') else None
        o.data.materials.append(mat(m))
        objs.append(o)
    # в меш, гладкое затенение по углу, UV
    for o in objs:
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.convert(target='MESH')
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        o.data.shade_smooth()
        if hasattr(o.data, 'set_sharp_from_angle'): o.data.set_sharp_from_angle(angle=math.radians(40))
        set_uv(o, art['vb'])
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{key}.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=False,
                              export_apply=True, export_materials='EXPORT', export_texcoords=True, export_normals=True)
    print('OK', key, os.path.getsize(path), 'байт')
    return objs


def render(objs, key, path):
    # контрольный рендер Cycles (для проверки качества модели)
    art = ARTS[key]; vx, vy, vw, vh = art['vb']
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1200, int(1200 * vh / vw) + 120
    sc.render.film_transparent = True
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.25, 0.27, 0.32, 1)
    for rot, en in (((math.radians(-35), math.radians(-25), 0), 4.0), ((math.radians(50), math.radians(40), 0), 2.0)):
        bpy.ops.object.light_add(type='SUN', rotation=rot); L = bpy.context.active_object
        L.data.energy = en; L.data.angle = math.radians(8)
    import mathutils
    cx, cy = vx + vw / 2, -(vy + vh / 2)
    # камера на сфере вокруг центра: чуть сверху и сбоку, ортографическая — без искажений
    yaw, pitch, R = math.radians(22), math.radians(14), vw * 3
    loc = mathutils.Vector((cx + R * math.sin(yaw) * math.cos(pitch), cy + R * math.sin(pitch), R * math.cos(yaw) * math.cos(pitch)))
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.active_object; sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = vw * 1.08; cam.data.clip_end = R * 4
    d = mathutils.Vector((cx, cy, 0)) - cam.location
    cam.rotation_euler = (-pitch, yaw, 0)
    bpy.context.view_layer.update()
    print('CAM', tuple(round(v,1) for v in cam.location), tuple(round(v,3) for v in cam.rotation_euler), cam.data.type, cam.data.ortho_scale)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


for k in keys:
    objs = build(k)
    if render_to:
        render(objs, k, render_to.replace('.png', f'-{k}.png'))
