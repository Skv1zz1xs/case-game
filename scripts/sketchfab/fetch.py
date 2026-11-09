# Скачивает выбранные модели Sketchfab (только CC0 / CC-BY, без следов CS:GO/Valve) в scripts/sketchfab/raw/.
# Пишет credits.json для указания авторов. Токен подставляет прокси окружения.
import json, os, re, sys, urllib.request, zipfile, io

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
os.makedirs(RAW, exist_ok=True)
BAN = re.compile(r'cs\s*:?\s*go|csgo|cs2|counter[\s-]*strike|valve|source engine|ripped|\brip\b|extracted|call of duty|\bcod\b|battlefield|pubg|halo', re.I)
OK_LIC = {'cc0', 'by'}

PICK = {
    'ak': '07065c43bdb2459ca8faf7a99b075b9b',
    'm4': '1b858701dd7142d9b82bbe3fd121a97b',
    'awp': '49aa8bfa6efb4f0798708540cd4c9f4a',
    'glock': 'aeb171380b2b490c80aa04b4ee1a9366',
    'deagle': 'cabde59f5cf24effaf80536e35d04e95',
    'mp7': '27cd4b48fb14451c86adad4c559082d6',
    'p90': '96b61ebbbf154843b621ebf7f48647fc',
    'mac10': '8b87f75c6a474aaba5e66f71646ad517',
    'nova': '6db0ad4764d14eee8f063eea3600071b',
    'negev': '8c24d7374ea64bdab1c30f49c69d5ed8',
    'karambit': 'dfd7606f189a413681305a39b8841ce8',
    'butterfly': 'e2b7ed11b1b443c69bb6b3d7ce9aeed8',
    'bayonet': 'eb61a59f65e449d2a2eabbaef76a4a43',
    'bowie': '793322ff35f9436b8c88fc56009c690e',
    'stiletto': '05c80a40e6754e0583ebce3bf285c545',
}


def get(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read()


credits_path = os.path.join(HERE, 'credits.json')
credits = json.load(open(credits_path)) if os.path.exists(credits_path) else {}
keys = sys.argv[1:] or list(PICK)
for k in keys:
    uid = PICK[k]
    info = json.loads(get(f'https://api.sketchfab.com/v3/models/{uid}'))
    lic = (info.get('license') or {}).get('slug', '')
    text = ' '.join([info.get('name', ''), info.get('description', '') or '', ' '.join(t['name'] for t in info.get('tags', []))])
    if lic not in OK_LIC:
        print('ПРОПУСК (лицензия)', k, lic); continue
    if BAN.search(text):
        print('ПРОПУСК (похоже на рип из игры)', k, info['name']); continue
    dl = json.loads(get(f'https://api.sketchfab.com/v3/models/{uid}/download'))
    if 'glb' in dl:
        data = get(dl['glb']['url'])
        open(os.path.join(RAW, f'{k}.glb'), 'wb').write(data)
    else:
        z = zipfile.ZipFile(io.BytesIO(get(dl['gltf']['url'])))
        d = os.path.join(RAW, k); os.makedirs(d, exist_ok=True); z.extractall(d)
    credits[k] = {'name': info['name'], 'author': info['user']['displayName'] or info['user']['username'],
                  'profile': info['user']['profileUrl'], 'url': info['viewerUrl'],
                  'license': info['license']['label'], 'license_slug': lic}
    print('OK', k, info['name'], '—', credits[k]['author'], '|', credits[k]['license'])
json.dump(credits, open(credits_path, 'w'), ensure_ascii=False, indent=1)
