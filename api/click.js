// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — click.js
// RCI Click Tracking — logs every "Shop This Gift" click then redirects
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    url, product, store, vibe, budget, occasion, who, pos, type,
  } = req.query;

  if (!url) return res.status(400).send('Missing destination URL');

  let destination;
  try {
    destination = decodeURIComponent(url);
    const parsed = new URL(destination);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid URL protocol');
    }
  } catch {
    return res.status(400).send('Invalid URL');
  }

  const clickData = {
    ts:         new Date().toISOString(),
    product:    product  ? decodeURIComponent(product)  : null,
    store:      store    ? decodeURIComponent(store)    : null,
    type:       type     ? decodeURIComponent(type)     : null,
    vibe:       vibe     ? decodeURIComponent(vibe)     : null,
    budget:     budget   ? decodeURIComponent(budget)   : null,
    occasion:   occasion ? decodeURIComponent(occasion) : null,
    who_for:    who      ? decodeURIComponent(who)      : null,
    position:   pos      ? parseInt(pos, 10)            : null,
    dest_url:   destination,
    ip:         req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null,
    user_agent: req.headers['user-agent'] || null,
  };

  console.log('[RCI_CLICK]', JSON.stringify(clickData));

  // ── Persist to Supabase — AWAITED so Vercel doesn't kill it before it completes
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/clicks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(clickData),
      });
      if (!sbRes.ok) {
        const errText = await sbRes.text();
        console.error('[RCI_CLICK] Supabase error:', sbRes.status, errText);
      } else {
        console.log('[RCI_CLICK] Saved to Supabase OK');
      }
    } catch (err) {
      console.error('[RCI_CLICK] Supabase fetch threw:', err.message);
    }
  } else {
    console.error('[RCI_CLICK] Missing env vars — SUPABASE_URL:', !!SUPABASE_URL, 'SUPABASE_KEY:', !!SUPABASE_KEY);
  }

  // ── Redirect after write completes
  res.setHeader('Location', destination);
  return res.status(302).end();
}
