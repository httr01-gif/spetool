// Upstash Redis REST 공통 도우미

function env() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function cmd(args) {
  const e = env();
  if (!e) throw new Error('NO_STORE');
  const res = await fetch(e.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${e.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

async function pipeline(list) {
  const e = env();
  if (!e) throw new Error('NO_STORE');
  const res = await fetch(`${e.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${e.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(list),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return res.json();
}

const LIST_KEY = 'toolbox:up:list';
const htmlKey = (id) => `toolbox:up:html:${id}`;

async function allEntries() {
  const flat = await cmd(['HGETALL', LIST_KEY]);
  const out = [];
  if (Array.isArray(flat)) {
    for (let i = 0; i < flat.length; i += 2) {
      try { out.push(JSON.parse(flat[i + 1])); } catch (_) { /* 손상 항목 무시 */ }
    }
  }
  return out;
}

function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

function hasStore() { return !!env(); }

module.exports = { cmd, pipeline, allEntries, parseBody, hasStore, LIST_KEY, htmlKey };
