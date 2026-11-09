# Кейсы v2: пять форм по категориям, объёмная эмблема (знак темы) и надпись на табличке, студийный свет.
# Запуск: blender -b --python scripts/blender/build_cases.py -- [id ...]   (после рендера: node scripts/to-webp.cjs)
import bpy, json, math, os, sys, mathutils

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CASES = json.load(open(os.path.join(HERE, 'cases.json')))
OUT = os.path.join(ROOT, 'public', 'cases')
FONTS = os.path.join(os.path.dirname(bpy.app.binary_path), '4.2', 'datafiles', 'fonts')
HDR = os.path.join(ROOT, 'public', 'tex', 'studio_small_09_1k.hdr')
os.makedirs(OUT, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
only = set(argv)
SHAPE = {'cheap': 'crate', 'theme': 'case', 'mid': 'case', 'knife': 'brief', 'elite': 'vault', 'event': 'chest'}


def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1,)


def mat(name, color, metal=0.0, rough=0.5, coat=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = emit; b.inputs['Emission Strength'].default_value = 3
    return m


def worn(m, scale=6.0, amount=0.25):
    # лёгкая неоднородность краски (шум в шероховатости и цвете)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 8
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = b.inputs['Roughness'].default_value
    mr.inputs['To Max'].default_value = min(1, b.inputs['Roughness'].default_value + amount)
    nt.links.new(n.outputs['Fac'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], b.inputs['Roughness'])
    return m


def box(size, loc, m, bevel=0.04, seg=4, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new('b', 'BEVEL'); md.width = bevel; md.segments = seg; md.limit_method = 'ANGLE'
    o.data.materials.append(m); bpy.ops.object.shade_smooth()
    return o


def cyl(r, d, loc, rot, m, v=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot)
    o = bpy.context.active_object; o.data.materials.append(m); bpy.ops.object.shade_smooth()
    md = o.modifiers.new('b', 'BEVEL'); md.width = min(r, d) * 0.15; md.segments = 3
    return o


def text(s, font, size, loc, m, depth=0.03, width=None, offset=0.0):
    bpy.ops.object.text_add(location=loc, rotation=(math.pi / 2, 0, 0))
    o = bpy.context.active_object
    o.data.body = s; o.data.font = font; o.data.size = size; o.data.extrude = depth; o.data.offset = offset
    o.data.bevel_depth = depth * 0.35; o.data.bevel_resolution = 2
    o.data.align_x = 'CENTER'; o.data.align_y = 'CENTER'
    o.data.materials.append(m)
    bpy.context.view_layer.update()
    if width and o.dimensions.x > width:
        f = width / o.dimensions.x; o.data.size = size * f
    return o


def scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 560, 410
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = -0.35
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    nt = w.node_tree; env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDR)
    nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color'])
    nt.nodes['Background'].inputs['Strength'].default_value = 0.8
    for loc, en, size in (((-3, -3.5, 4.5), 420, 3.5), ((3.5, 2.5, 3.5), 700, 2.0)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        L = bpy.context.active_object; L.data.energy = en; L.data.size = size
        L.rotation_euler = (mathutils.Vector((0, 0, 0.6)) - mathutils.Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=14); bpy.context.active_object.is_shadow_catcher = True
    bpy.ops.object.camera_add(location=(3.0, -4.6, 2.5))
    cam = bpy.context.active_object; sc.camera = cam; cam.data.lens = 52
    cam.rotation_euler = (mathutils.Vector((0, 0, 0.66)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    return {'mixed': bpy.data.fonts.load(os.path.join(FONTS, 'Inter.woff2')), 'inter': bpy.data.fonts.load(os.path.join(HERE, 'fonts', 'russo-one-cyrillic-400-normal.woff2')), 'latin': bpy.data.fonts.load(os.path.join(HERE, 'fonts', 'russo-one-latin-400-normal.woff2')), 'emoji': bpy.data.fonts.load(os.path.join(FONTS, 'NotoEmoji-VariableFont_wght.woff2'))}


def label_of(c):
    n = c['name'].replace('Кейс ', '').replace('кейс', '').strip()
    return n.upper()


def build(c, F):
    pal = c['palette']; cat = c['cat']; shape = SHAPE.get(cat, 'case') if c['id'] != 'free' else 'case'
    body_c, acc_c = srgb(pal[0]), srgb(pal[1] if len(pal) > 1 else pal[0])
    gold = cat in ('knife', 'elite')
    trimM = mat('trim', (0.86, 0.64, 0.24, 1) if gold else (0.62, 0.64, 0.68, 1), 1.0, 0.18 if gold else 0.28)
    darkM = mat('dark', (0.025, 0.025, 0.03, 1), 0.5, 0.45)
    bodyM = worn(mat('body', body_c, 0.35 if shape in ('vault', 'brief') else 0.1, 0.32, 0.7 if cat in ('elite', 'knife', 'event', 'mid') else 0.35))
    accM = mat('acc', acc_c, 0.4, 0.35, 0.5)
    embM = mat('emb', (0.95, 0.78, 0.36, 1) if gold or cat == 'mid' else (0.92, 0.93, 0.95, 1), 1.0, 0.15)
    plateM = mat('plate', (0.04, 0.04, 0.05, 1), 0.6, 0.35)

    if shape == 'crate':  # армейский ящик: доски-рёбра, верёвочные ручки, трафарет
        W, D, H = 2.3, 1.45, 1.15
        box((W, D, H), (0, 0, H / 2 + 0.03), bodyM, 0.03)
        for z in (0.18, H - 0.12):
            box((W + 0.05, D + 0.05, 0.14), (0, 0, z), accM, 0.025)
        for x in (-W / 2 + 0.08, W / 2 - 0.08):
            box((0.16, D + 0.06, H + 0.02), (x, 0, H / 2 + 0.03), accM, 0.025)
        for sx in (-1, 1):
            cyl(0.05, 0.6, (sx * (W / 2 + 0.1), 0, H * 0.62), (math.pi / 2, 0, 0), darkM, 16)
        front_z, front_y, plateW = H * 0.5, -D / 2, 1.5
    elif shape == 'chest':  # сундук с полукруглой крышкой и металлическими полосами
        W, D, H = 2.3, 1.4, 0.95
        box((W, D, H), (0, 0, H / 2 + 0.03), bodyM, 0.05)
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=D / 2, depth=W, location=(0, 0, H + 0.03), rotation=(0, math.pi / 2, 0))
        lid = bpy.context.active_object; lid.data.materials.append(bodyM); bpy.ops.object.shade_smooth()
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
        lid.scale.z = 0.62
        for x in (-0.75, 0, 0.75):
            bpy.ops.mesh.primitive_torus_add(major_radius=D / 2 + 0.02, minor_radius=0.045, location=(x, 0, H + 0.03), rotation=(0, math.pi / 2, 0))
            t = bpy.context.active_object; t.scale.z = 0.62; t.data.materials.append(trimM); bpy.ops.object.shade_smooth()
            box((0.1, D + 0.06, H), (x, 0, H / 2 + 0.03), trimM, 0.02)
        front_z, front_y, plateW = H * 0.52, -D / 2, 1.15
    elif shape == 'brief':  # тонкий кейс-«дипломат» с ручкой сверху
        W, D, H = 2.5, 0.75, 1.55
        box((W, D, H), (0, 0, H / 2 + 0.03), bodyM, 0.09)
        box((W + 0.03, D + 0.03, 0.05), (0, 0, H * 0.82), trimM, 0.015)
        for x in (-0.85, 0.85):
            box((0.24, 0.1, 0.18), (x, -D / 2 - 0.04, H * 0.82), trimM, 0.03)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.05, location=(0, 0, H + 0.04), rotation=(math.pi / 2, 0, 0))
        hd = bpy.context.active_object; hd.scale.z = 0.55; hd.data.materials.append(darkM); bpy.ops.object.shade_smooth()
        front_z, front_y, plateW = H * 0.42, -D / 2, 1.6
    elif shape == 'vault':  # сейф: кубический, кодовый диск, золотые петли
        W, D, H = 1.9, 1.6, 1.75
        box((W, D, H), (0, 0, H / 2 + 0.03), bodyM, 0.08)
        box((W - 0.2, 0.08, H - 0.2), (0, -D / 2, H / 2 + 0.03), accM, 0.04)
        cyl(0.26, 0.12, (0.45, -D / 2 - 0.08, H * 0.62), (math.pi / 2, 0, 0), trimM, 48)
        cyl(0.07, 0.3, (0.45, -D / 2 - 0.18, H * 0.62), (math.pi / 2, 0, 0), darkM)
        for z in (0.4, H - 0.3):
            cyl(0.08, 0.3, (-W / 2 + 0.02, -D / 2, z), (0, 0, 0), trimM)
        front_z, front_y, plateW = H * 0.3, -D / 2 - 0.05, 1.3
    else:  # классический кейс
        W, D, H, LID = 2.4, 1.5, 1.0, 0.36
        box((W, D, H), (0, 0, H / 2 + 0.02), bodyM, 0.07)
        box((W + 0.04, D + 0.04, LID), (0, 0, H + LID / 2 + 0.03), bodyM, 0.09)
        box((W + 0.06, D + 0.06, 0.04), (0, 0, H + 0.02), darkM, 0.01, 2)
        for x in (-0.95, 0.95):
            box((0.13, D + 0.08, H - 0.1), (x, 0, H / 2 + 0.03), accM, 0.04)
        for sx in (-1, 1):
            for sy in (-1, 1):
                for z in (0.12, H + LID - 0.08):
                    box((0.24, 0.24, 0.24), (sx * W / 2, sy * D / 2, z), trimM, 0.06)
        for x in (-0.55, 0.55):
            box((0.22, 0.1, 0.32), (x, -D / 2 - 0.06, H + 0.02), trimM, 0.03)
        cyl(0.05, 0.7, (W / 2 + 0.17, 0, H * 0.62), (math.pi / 2, 0, 0), trimM)
        front_z, front_y, plateW = H * 0.5, -D / 2, 1.5

    # табличка с эмблемой и надписью
    pH = 0.62
    box((plateW, 0.06, pH), (0, front_y - 0.03, front_z), plateM, 0.03)
    box((plateW + 0.06, 0.04, pH + 0.06), (0, front_y - 0.01, front_z), trimM, 0.02)
    try:
        g = text(c['glyph'], F['emoji'], 0.36, (-plateW / 2 + 0.3, front_y - 0.08, front_z + 0.02), embM, 0.04, width=0.42)
    except Exception:
        pass
    lab = label_of(c)
    fnt = F['inter'] if any('А' <= ch <= 'я' or ch == 'Ё' for ch in lab) else F['latin']
    if any(ch.isdigit() or ('A' <= ch <= 'Z') for ch in lab) and fnt is F['inter']:
        fnt = F['mixed']  # в кириллическом начертании нет цифр — берём шрифт со всеми знаками
    text(lab, fnt, 0.2, (0.18, front_y - 0.08, front_z + 0.03), embM, 0.02, width=plateW - 0.75)
    text('КЕЙС-РОЯЛЬ', F['inter'], 0.075, (0.18, front_y - 0.08, front_z - 0.19), mat('sub', (0.55, 0.57, 0.62, 1), 1, 0.3), 0.008, width=plateW - 0.75)


F = scene()
base = set(o.name for o in bpy.data.objects)
for c in CASES:
    if only and c['id'] not in only: continue
    for o in list(bpy.data.objects):
        if o.name not in base: bpy.data.objects.remove(o, do_unlink=True)
    build(c, F)
    bpy.context.scene.render.filepath = os.path.join(OUT, f"{c['id']}.png")
    bpy.ops.render.render(write_still=True)
    print('OK', c['id'])
