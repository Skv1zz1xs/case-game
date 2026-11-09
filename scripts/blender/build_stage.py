# Фон страницы кейса: вид на улицу из HDRI-панорамы Poly Haven (CC0), лёгкая глубина резкости.
# Запуск: blender -b --python scripts/blender/build_stage.py -- путь.hdr поворот_градусы выход.png
import bpy, math, sys
args = sys.argv[sys.argv.index('--') + 1:]
hdr, yaw, out = args[0], float(args[1]), args[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 8
sc.render.resolution_x, sc.render.resolution_y = 1920, 900
sc.view_settings.view_transform = 'AgX'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
nt = w.node_tree; env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hdr)
mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord')
mp.inputs['Rotation'].default_value[2] = math.radians(yaw)
nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
nt.links.new(env.outputs['Color'], nt.nodes['Background'].inputs['Color'])
bpy.ops.object.camera_add(location=(0, 0, 0), rotation=(math.radians(82), 0, 0))
cam = bpy.context.active_object; sc.camera = cam; cam.data.lens = 24
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('OK', out)
