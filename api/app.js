// 승인된 공유 자료 실행 및 내려받기
// /api/app?id=uXXXX        → 브라우저에서 실행
// /api/app?id=uXXXX&dl=1   → 파일로 내려받기

const { cmd, allEntries, hasStore, htmlKey } = require('./_store.js');

module.exports = async (req, res) => {
  const q = req.query || {};
  const id = String(q.id || '');

  if (!hasStore() || !/^[A-Za-z0-9_-]{4,40}$/.test(id)) {
    res.status(404).send('자료를 찾을 수 없습니다.');
    return;
  }

  try {
    const meta = (await allEntries()).find((m) => m && m.id === id);
    if (!meta || meta.status !== 'approved') {
      res.status(404).send('자료를 찾을 수 없거나 아직 공개되지 않았습니다.');
      return;
    }

    const html = await cmd(['GET', htmlKey(id)]);
    if (!html) { res.status(404).send('자료 파일이 없습니다.'); return; }

    const safeName = (meta.name || id).replace(/[^\w가-힣.-]+/g, '_').slice(0, 50);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    if (q.dl) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${id}.html"; filename*=UTF-8''${encodeURIComponent(safeName)}.html`
      );
    }
    res.status(200).send(html);
  } catch (e) {
    console.error('app error', e && e.message);
    res.status(500).send('자료를 불러오지 못했습니다.');
  }
};
