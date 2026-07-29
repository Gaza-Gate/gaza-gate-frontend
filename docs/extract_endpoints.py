import json
import sys
import os

os.chdir(r'C:\Users\محمود\.mavis\v2\assets\2026\07\29')
SRC = '16-16-15-721-asset_20260729-161615-721_e8b268ffa95e_d99c3df7-Gaza-Gate.json'
DST = r'C:\Users\محمود\Downloads\gaza-gate-frontend\docs\endpoints_extracted.json'

with open(SRC, 'r', encoding='utf-8') as f:
    data = json.load(f)

def walk_items(items, path_stack):
    results = []
    for item in items:
        if 'item' in item:
            new_path = path_stack + [item.get('name', '')]
            results.extend(walk_items(item['item'], new_path))
        else:
            if 'request' in item:
                req = item['request']
                method = req.get('method', '')
                url = req.get('url', {})
                url_path = url.get('path', []) if isinstance(url, dict) else []
                path_str = '/' + '/'.join(url_path) if url_path else ''
                auth_required = False
                headers = req.get('header', [])
                if isinstance(headers, list):
                    auth_required = any(h.get('key') == 'Authorization' for h in headers)
                # Get request body
                body = req.get('body', {})
                body_mode = body.get('mode', '') if isinstance(body, dict) else ''
                body_raw = body.get('raw', '') if isinstance(body, dict) else ''
                # If formdata, capture keys
                formdata_keys = []
                if body_mode == 'formdata':
                    fd = body.get('formdata', [])
                    if isinstance(fd, list):
                        for f in fd:
                            if isinstance(f, dict) and 'key' in f:
                                formdata_keys.append({
                                    'key': f.get('key'),
                                    'type': f.get('type', 'text'),
                                    'required': not f.get('disabled', False)
                                })
                # Get query params
                query = []
                if isinstance(url, dict):
                    raw_query = url.get('query', [])
                    if isinstance(raw_query, list):
                        for q in raw_query:
                            if isinstance(q, dict):
                                query.append({
                                    'key': q.get('key', ''),
                                    'value': q.get('value', '')
                                })
                # URL params from path
                url_params = []
                for p in url_path:
                    if isinstance(p, str) and p.startswith('{{') and p.endswith('}}'):
                        url_params.append(p[2:-2])
                # Get response codes
                response_codes = []
                responses = item.get('response', [])
                if isinstance(responses, list):
                    for r in responses:
                        if isinstance(r, dict):
                            code = r.get('code')
                            status = r.get('status', '')
                            body = r.get('body', '')
                            response_codes.append({
                                'code': code,
                                'status': status,
                                'body': body
                            })
                results.append({
                    'category': ' / '.join(path_stack),
                    'name': item.get('name', ''),
                    'method': method,
                    'url': path_str,
                    'auth_required': auth_required,
                    'body_mode': body_mode,
                    'body_raw': body_raw[:500] if body_raw else '',  # truncate for storage
                    'formdata_keys': formdata_keys,
                    'query': query,
                    'url_params': url_params,
                    'response_codes': response_codes,
                })
    return results

endpoints = walk_items(data['item'], [])
print(f'Total endpoints: {len(endpoints)}', file=sys.stderr)

# Group by category
by_category = {}
for e in endpoints:
    cat = e['category']
    by_category.setdefault(cat, []).append(e)

with open(DST, 'w', encoding='utf-8') as f:
    json.dump(endpoints, f, ensure_ascii=False, indent=2)

# Print summary
print('\n=== CATEGORIES ===', file=sys.stderr)
for cat, eps in by_category.items():
    print(f'  {cat}: {len(eps)} endpoints', file=sys.stderr)
