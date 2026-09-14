// 관리자 전용 집계 조회
// 사용법: /api/stats?key=<STATS_KEY 환경변수 값>
//        /api/stats?key=...&day=2026-09-13   (특정 날짜)
//        /api/stats?key=...&format=html      (표로 보기)

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function hgetall(key) {
  const env = redisEnv();
  if (!env) return null;
  const res = await fetch(`${env.url.replace(/\/$/, '')}/hgetall/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${env.token}` },
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const { result } = await res.json();
  const out = {};
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) out[result[i]] = Number(result[i + 1]) || 0;
  }
  return out;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const { getQuery, normKey, keyMatches } = require('./_store.js');

module.exports = async (req, res) => {
  const key = process.env.STATS_KEY;
  const q = getQuery(req);

  if (!key) {
    res.status(503).json({ error: 'STATS_KEY 환경변수가 설정되지 않았습니다.' });
    return;
  }
  if (!keyMatches(q.key, key)) {
    res.status(401).json({
      error: '접근 권한이 없습니다.',
      // 값은 알려 주지 않고 길이만 비교해 원인을 찾도록 돕는다
      hint: {
        입력한_열쇠_글자수: normKey(q.key).length,
        등록된_열쇠_글자수: normKey(key).length,
        주소에서_key를_읽었는지: q.key != null,
      },
    });
    return;
  }
  if (!redisEnv()) {
    res.status(503).json({ error: '집계 저장소가 연결되지 않았습니다. README의 Upstash 연결 절차를 확인하세요.' });
    return;
  }

  const bucket = q.day ? `toolbox:day:${q.day}` : 'toolbox:total';

  try {
    const raw = await hgetall(bucket);
    const rows = {};
    let sum = { open: 0, download: 0, prompt: 0 };

    for (const [k, v] of Object.entries(raw)) {
      const i = k.indexOf(':');
      const action = k.slice(0, i);
      const id = k.slice(i + 1);
      rows[id] = rows[id] || { id, open: 0, download: 0, prompt: 0 };
      rows[id][action] = v;
      if (action in sum) sum[action] += v;
    }

    const list = Object.values(rows).sort((a, b) => b.download - a.download || b.open - a.open);

    if (q.format === 'html') {
      const body = list
        .map(
          (r) =>
            `<tr><td>${esc(r.id)}</td><td>${r.open}</td><td>${r.download}</td><td>${r.prompt}</td></tr>`
        )
        .join('');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).end(
        `<!doctype html><meta charset="utf-8"><title>도구함 집계</title>` +
          `<style>body{font-family:system-ui,'Malgun Gothic',sans-serif;padding:24px;max-width:760px;margin:auto}` +
          `table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}` +
          `th{background:#f4f4f5}td:not(:first-child),th:not(:first-child){text-align:right}</style>` +
          `<h1>특수교육 AI 도구함 집계</h1><p>구간: ${esc(q.day || '전체 누적')}</p>` +
          `<table><tr><th>자료</th><th>실행</th><th>내려받기</th><th>프롬프트 복사</th></tr>${body}` +
          `<tr><th>합계</th><th>${sum.open}</th><th>${sum.download}</th><th>${sum.prompt}</th></tr></table>`
      );
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ bucket: q.day || 'total', sum, items: list });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
