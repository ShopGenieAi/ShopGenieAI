// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — click.js
// RCI Click Tracking — logs every "Shop This Gift" click then redirects
// Captures: product, store, vibe, budget, occasion, who-for, timestamp
// Persists to Supabase clicks table + logs to Vercel console
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    url,        // destination URL (required)
    product,    // product name
    store,      // store name (bestStoreName)
    vibe,       // quiz Q3 vibe
    budget,     // budget tier key
    occasion,   // occasion
    who,        // whoFor
    pos,        // card position (1, 2, 3)
    type,       // product type category
  } = req.query;

  // ── Validate destination URL ───────────────────────────────────────────────
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

  // ── Build click data ───────────────────────────────────────────────────────
  const clickData = {
    timestamp:  new Date().toISOString(),
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

  // ── Log to console (Vercel logs) ───────────────────────────────────────────
  console.log('[RCI_CLICK]', JSON.stringify({ ts: new Date().toISOString(), ...clickData }));

  // ── Persist to Supabase (fire and forget — don't delay redirect) ──────────
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (SUPABASE_URL && SUPABASE_KEY) {
    fetch(`${SUPABASE_URL}/rest/v1/clicks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(clickData),
    }).catch(err => console.error('[RCI_CLICK] Supabase write failed:', err.message));
  }

  // ── Redirect immediately ───────────────────────────────────────────────────
  res.setHeader('Location', destination);
  return res.status(302).end();
}
