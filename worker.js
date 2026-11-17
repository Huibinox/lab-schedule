const origin = 'https://huibinox.github.io';
const endpoint = 'https://api.github.com/repos/Huibinox/lab-schedule/contents/schedule.json';
const cors = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};
const reply = (status, body) => Response.json(body, {status, headers: cors});
const staff = new Set(['Guibin Huang','Chenyu Wei','Dan Wang','Jing Yu','Bailu Li']);
const pis = new Set(['Yaru Xu','Shenglei Yuan','Xiaohui Wang','Zhimei Gao','Nannan Kong']);
const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function valid(shifts) {
  if (!Array.isArray(shifts) || shifts.length > 2000) return false;
  const ids = new Set();
  const periods = new Map();
  for (const item of shifts) {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) ||
        ids.has(item.id) || !staff.has(item.staff) || !pis.has(item.pi) ||
        typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
        !time.test(item.start) || !time.test(item.end) || item.start >= item.end ||
        typeof item.task !== 'string' || !item.task.trim() || item.task.length > 80 ||
        Object.keys(item).length !== 7) return false;
    const date = new Date(item.date + 'T00:00:00Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== item.date) return false;
    ids.add(item.id);
    const key = item.staff + item.date;
    const day = periods.get(key) ?? [];
    if (day.some(shift => item.start < shift.end && shift.start < item.end)) return false;
    day.push(item);
    periods.set(key, day);
  }
  return true;
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/api/schedule') return reply(404, {error:'not_found'});
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:cors});
    if (!['GET','PUT'].includes(request.method)) return reply(405, {error:'method_not_allowed'});
    if (request.method === 'PUT' && request.headers.get('Origin') !== origin) return reply(403, {error:'origin'});
    if (!env.GITHUB_TOKEN) return reply(503, {error:'missing_github_token'});
    const headers = {
      Authorization: 'Bearer ' + env.GITHUB_TOKEN,
      Accept:'application/vnd.github+json',
      'User-Agent':'huibinox-lab-schedule',
    };
    try {
      if (request.method === 'GET') {
        const remote = await fetch(endpoint, {headers, cache:'no-store'});
        if (!remote.ok) return reply(502, {error:'github_read_failed'});
        const file = await remote.json();
        const bytes = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
        return reply(200, {version:file.sha, shifts:JSON.parse(new TextDecoder().decode(bytes))});
      }
      const body = await request.text();
      if (body.length > 350000) return reply(413, {error:'too_large'});
      let data;
      try { data = JSON.parse(body); } catch { return reply(400, {error:'invalid_json'}); }
      if (!data || typeof data.version !== 'string' || !/^[0-9a-f]{40}$/.test(data.version) || !valid(data.shifts)) {
        return reply(400, {error:'invalid_schedule'});
      }
      const bytes = new TextEncoder().encode(JSON.stringify(data.shifts, null, 2) + '\n');
      const content = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
      const remote = await fetch(endpoint, {
        method:'PUT', headers:{...headers, 'Content-Type':'application/json'},
        body:JSON.stringify({message:'Update shared schedule', sha:data.version, content}),
      });
      if (remote.status === 409 || remote.status === 422) return reply(409, {error:'version_conflict'});
      if (!remote.ok) return reply(502, {error:'github_write_failed'});
      return reply(200, {version:(await remote.json()).content.sha, shifts:data.shifts});
    } catch {
      return reply(502, {error:'github_unavailable'});
    }
  },
};
