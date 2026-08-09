import requests
token = requests.post('https://laudable-peace-production-09cd.up.railway.app/api/v1/auth/login', json={'email':'admin2@sgm.com','password':'admin123'}).json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}
r = requests.get('https://laudable-peace-production-09cd.up.railway.app/api/v1/alerts/?status=active&limit=100', headers=headers)
for a in r.json():
    if 'Combustivel' in a['title'] and '2026-07-17' not in a['triggered_at']:
        res = requests.post(f'https://laudable-peace-production-09cd.up.railway.app/api/v1/alerts/{a["id"]}/resolve', headers=headers)
        print(f'Resolvido: {a["title"]} | {a["triggered_at"]} | status={res.status_code}')
