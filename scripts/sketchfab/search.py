# Поиск моделей на Sketchfab: только скачиваемые, только CC0 / CC-BY, без следов CS:GO/Valve.
# Токен подставляет прокси окружения (в коде его нет). Запуск: python3 scripts/sketchfab/search.py
import json, re, sys, urllib.parse, urllib.request

API = 'https://api.sketchfab.com/v3/search'
BAN = re.compile(r'cs\s*:?\s*go|csgo|cs2|counter[\s-]*strike|valve|cs 1\.6|source engine|ripped|rip\b|extracted', re.I)
QUERIES = {
    'ak': 'ak-47 rifle', 'm4': 'm4a1 rifle', 'awp': 'sniper rifle bolt action', 'glock': 'glock pistol',
    'deagle': 'desert eagle pistol', 'usp': 'usp pistol suppressor', 'mp7': 'mp7 smg', 'p90': 'p90 smg',
    'mac10': 'mac-10 smg', 'nova': 'pump shotgun', 'negev': 'light machine gun', 'karambit': 'karambit knife',
    'butterfly': 'butterfly knife balisong', 'bayonet': 'm9 bayonet knife', 'bowie': 'bowie knife',
    'stiletto': 'stiletto knife', 'gloves': 'tactical gloves',
}


def search(q, license):
    params = {'type': 'models', 'q': q, 'downloadable': 'true', 'license': license, 'sort_by': '-likeCount', 'count': 24,
              'max_face_count': 120000}
    with urllib.request.urlopen(API + '?' + urllib.parse.urlencode(params), timeout=30) as r:
        return json.load(r)['results']


out = {}
keys = sys.argv[1:] or list(QUERIES)
for k in keys:
    rows = []
    for lic in ('cc0', 'by'):
        for m in search(QUERIES[k], lic):
            text = ' '.join([m.get('name', ''), m.get('description', '') or '', ' '.join(t['name'] for t in m.get('tags', []))])
            if BAN.search(text):
                continue
            rows.append({'uid': m['uid'], 'name': m['name'], 'license': lic, 'user': m['user']['username'],
                         'faces': m.get('faceCount'), 'likes': m.get('likeCount'), 'url': m['viewerUrl'],
                         'thumb': max(m['thumbnails']['images'], key=lambda i: i['width'])['url']})
    rows.sort(key=lambda r: -(r['likes'] or 0))
    out[k] = rows[:8]
    print(f'== {k}: {len(rows)}')
    for r in rows[:8]:
        print(f"  {r['likes']:>5} {r['license']:>3} {r['faces']:>7} {r['uid']} {r['name'][:50]} — {r['user']}")
json.dump(out, open('scripts/sketchfab/candidates.json', 'w'), ensure_ascii=False, indent=1)
