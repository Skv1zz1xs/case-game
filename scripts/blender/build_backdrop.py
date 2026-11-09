# Фон-сцена: склад с окнами, ящиками и тёплым светом, сильно размытый (глубина резкости).
# Свой рендер — без чужих картинок. Запуск: blender -b --python scripts/blender/build_backdrop.py
import bpy, math, os, random

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'bg.png')
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.view_settings.view_transform = 'Standard'


def mat(name, col, rough=0.8, metal=0.0, emit=None, strength=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = col
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = emit
        b.inputs['Emission Strength'].default_value = strength
    return m


def cube(loc, scale, m):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.active_object; o.scale = scale; o.data.materials.append(m); return o


concrete = mat('floor', (0.32, 0.30, 0.27, 1), 0.9)
wall = mat('wall', (0.42, 0.40, 0.37, 1), 0.85)
metal = mat('metal', (0.25, 0.26, 0.28, 1), 0.45, 0.8)
crate = mat('crate', (0.36, 0.29, 0.2, 1), 0.7)
window = mat('win', (1, 1, 1, 1), 0.2, 0, (1.0, 0.93, 0.82, 1), 6)
lamp = mat('lamp', (1, 1, 1, 1), 0.2, 0, (1.0, 0.85, 0.65, 1), 25)
cube((0, 0, -0.1), (40, 40, 0.1), concrete)
cube((0, 18, 6), (40, 0.3, 7), wall)
cube((-16, 0, 6), (0.3, 40, 7), wall)
for i in range(6):
    cube((-12 + i * 5, 17.6, 7.5), (1.6, 0.1, 2.2), window)
for i in range(4):
    cube((-10 + i * 7, 10, 11.5), (1.2, 1.2, 0.08), lamp)
for i in range(18):
    x, y = random.uniform(-14, 14), random.uniform(2, 16)
    s = random.uniform(0.6, 1.6)
    cube((x, y, s), (s * random.uniform(0.8, 1.6), s, s), crate if i % 3 else metal)
for i in range(7):
    cube((-13 + i * 4.5, 14, 3), (0.12, 0.12, 3), metal)  # стойки
cube((0, 14, 6.2), (16, 0.12, 0.12), metal)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.6, 0.7, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(55), 0, math.radians(30)))
bpy.context.active_object.data.energy = 2.5
bpy.ops.object.camera_add(location=(0, -12, 3.2), rotation=(math.radians(84), 0, 0))
cam = bpy.context.active_object; sc.camera = cam
cam.data.lens = 28
cam.data.dof.use_dof = True; cam.data.dof.focus_distance = 1.0; cam.data.dof.aperture_fstop = 0.35
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('OK', OUT)
