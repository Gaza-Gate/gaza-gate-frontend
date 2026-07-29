const fs = require('fs');

const SRC = String.raw`C:\Users\محمود\.mavis\v2\assets\2026\07\29\16-16-15-721-asset_20260729-161615-721_e8b268ffa95e_d99c3df7-Gaza-Gate.json`;
const DST = String.raw`C:\Users\محمود\Downloads\gaza-gate-frontend\docs\endpoints_extracted.json`;

const data = JSON.parse(fs.readFileSync(SRC, 'utf-8'));

function walk(items, stack) {
  const out = [];
  for (const item of items) {
    if (item.item) {
      out.push(...walk(item.item, stack.concat([item.name || ''])));
    } else if (item.request) {
      const req = item.request;
      const method = req.method || '';
      const url = req.url || {};
      const urlPath = Array.isArray(url.path) ? url.path : [];
      const pathStr = '/' + urlPath.join('/');
      let authRequired = false;
      const headers = Array.isArray(req.header) ? req.header : [];
      authRequired = headers.some(h => h.key === 'Authorization');
      const body = req.body || {};
      const bodyMode = body.mode || '';
      let bodyRaw = '';
      let formdataKeys = [];
      if (bodyMode === 'raw') {
        bodyRaw = body.raw || '';
      } else if (bodyMode === 'formdata') {
        const fd = body.formdata || [];
        for (const f of fd) {
          if (f.key) {
            formdataKeys.push({
              key: f.key,
              type: f.type || 'text',
              required: !f.disabled,
            });
          }
        }
      }
      const query = [];
      if (Array.isArray(url.query)) {
        for (const q of url.query) {
          query.push({ key: q.key || '', value: q.value || '' });
        }
      }
      const urlParams = urlPath.filter(p => typeof p === 'string' && p.startsWith('{{') && p.endsWith('}}')).map(p => p.slice(2, -2));
      const responses = Array.isArray(item.response) ? item.response : [];
      const responseCodes = responses.map(r => ({
        code: r.code,
        status: r.status || '',
        body: r.body || '',
      }));
      out.push({
        category: stack.join(' / '),
        name: item.name || '',
        method,
        url: pathStr,
        authRequired,
        bodyMode,
        bodyRaw: bodyRaw.length > 1000 ? bodyRaw.slice(0, 1000) + '...[truncated]' : bodyRaw,
        formdataKeys,
        query,
        urlParams,
        responseCodes,
      });
    }
  }
  return out;
}

const endpoints = walk(data.item, []);
console.error(`Total endpoints: ${endpoints.length}`);

const byCategory = {};
for (const e of endpoints) {
  if (!byCategory[e.category]) byCategory[e.category] = [];
  byCategory[e.category].push(e);
}

console.error('\n=== CATEGORIES ===');
for (const [cat, eps] of Object.entries(byCategory)) {
  console.error(`  ${cat}: ${eps.length}`);
}

fs.writeFileSync(DST, JSON.stringify(endpoints, null, 2), 'utf-8');
console.error(`\nWritten to: ${DST}`);

// Print all endpoints in compact form
console.log('\n=== ALL ENDPOINTS ===');
for (const e of endpoints) {
  const auth = e.authRequired ? '🔒' : '🔓';
  console.log(`${auth} [${e.method.padEnd(6)}] ${e.url.padEnd(70)} | ${e.category} / ${e.name}`);
}
