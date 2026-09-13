// 승인된 공유 자료 목록 (누구나 조회)

const { allEntries, hasStore } = require('./_store.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

  if (!hasStore()) { res.status(200).json({ items: [] }); return; }

  try {
    const items = (await allEntries())
      .filter((m) => m && m.status === 'approved')
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .map((m) => ({
        id: m.id,
        name: m.name,
        file: `/api/app?id=${encodeURIComponent(m.id)}`,
        dl: `/api/app?id=${encodeURIComponent(m.id)}&dl=1`,
        downloadable: true,
        shared: true,
        thumb: null,
        subject: m.subject,
        grade: m.grade,
        form: m.form,
        device: m.device || [],
        players: m.players,
        minutes: m.minutes,
        tags: m.tags || [],
        summary: m.summary,
        howto: m.howto || [],
        support: m.support,
        prompt: m.prompt,
        source: `선생님 공유 (${m.uploader})`,
        updated: m.updated,
      }));
    res.status(200).json({ items });
  } catch (e) {
    console.error('community error', e && e.message);
    res.status(200).json({ items: [] });
  }
};
