// 관리자 검토 (STATS_KEY 필요)
// GET  /api/review?key=...            → 접수된 자료 전체 목록
// GET  /api/review?key=...&id=..&raw=1 → 해당 자료의 HTML 원문 미리보기
// POST /api/review  {key,id,action}    → approve | reject | delete

const { cmd, allEntries, parseBody, getQuery, keyMatches, hasStore, LIST_KEY, htmlKey } = require('./_store.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const key = process.env.STATS_KEY;
  if (!key) { res.status(503).json({ error: 'STATS_KEY 환경변수가 설정되지 않았습니다.' }); return; }
  if (!hasStore()) { res.status(503).json({ error: '저장소가 연결되지 않았습니다.' }); return; }

  const q = getQuery(req);
  const body = req.method === 'POST' ? parseBody(req) : {};
  const given = q.key || body.key || '';
  if (!keyMatches(given, key)) { res.status(401).json({ error: '접근 권한이 없습니다.' }); return; }

  try {
    if (req.method === 'GET') {
      if (q.raw && q.id) {
        const html = await cmd(['GET', htmlKey(String(q.id))]);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(html || '(내용 없음)');
        return;
      }
      const items = (await allEntries())
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      res.status(200).json({ items });
      return;
    }

    if (req.method === 'POST') {
      const id = String(body.id || '');
      const action = String(body.action || '');
      if (!/^[A-Za-z0-9_-]{4,40}$/.test(id)) { res.status(400).json({ error: '잘못된 자료 번호입니다.' }); return; }

      if (action === 'delete') {
        await cmd(['HDEL', LIST_KEY, id]);
        await cmd(['DEL', htmlKey(id)]);
        res.status(200).json({ ok: true, action });
        return;
      }
      if (action !== 'approve' && action !== 'reject') {
        res.status(400).json({ error: '알 수 없는 요청입니다.' }); return;
      }

      const meta = (await allEntries()).find((m) => m && m.id === id);
      if (!meta) { res.status(404).json({ error: '자료를 찾을 수 없습니다.' }); return; }

      meta.status = action === 'approve' ? 'approved' : 'rejected';
      meta.reviewedAt = new Date().toISOString();
      if (action === 'approve') {
        meta.updated = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      }
      await cmd(['HSET', LIST_KEY, id, JSON.stringify(meta)]);
      res.status(200).json({ ok: true, action, status: meta.status });
      return;
    }

    res.status(405).json({ error: '허용되지 않는 요청입니다.' });
  } catch (e) {
    console.error('review error', e && e.message);
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
