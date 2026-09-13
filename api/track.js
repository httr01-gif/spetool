// 다운로드 · 실행 · 프롬프트 복사 이벤트 기록 (화면 표시 없음)
// 저장소가 연결되어 있지 않으면 Vercel 로그에만 남고, 연결되면 누적 집계됨.

const ACTIONS = new Set(['open', 'download', 'prompt']);

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(cmd) {
  const env = redisEnv();
  if (!env) return null;
  const res = await fetch(`${env.url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return res.json();
}

function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') {
    try { b = JSON.parse(b); } catch { b = {}; }
  }
  return b && typeof b === 'object' ? b : {};
}

function today() {
  // 한국 시간 기준 날짜
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  // 어떤 경우에도 사용자 화면을 방해하지 않도록 항상 204로 응답
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    const { id, action } = parseBody(req);
    if (typeof id === 'string' && id.length <= 64 && ACTIONS.has(action)) {
      const day = today();
      await redis([
        ['HINCRBY', 'toolbox:total', `${action}:${id}`, 1],
        ['HINCRBY', `toolbox:day:${day}`, `${action}:${id}`, 1],
        ['EXPIRE', `toolbox:day:${day}`, 60 * 60 * 24 * 400],
      ]);
      if (!redisEnv()) {
        console.log(JSON.stringify({ t: new Date().toISOString(), action, id }));
      }
    }
  } catch (e) {
    console.error('track error', e && e.message);
  }

  res.status(204).end();
};
