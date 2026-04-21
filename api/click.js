// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — click.js
// RCI Click Tracking — logs every "Shop This Gift" click then redirects
// Captures: product, store, vibe, budget, occasion, who-for, timestamp
// Logs to Vercel serverless console (visible in Vercel dashboard logs)
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
  if (!url) {
    return res.status(400).send('Missing destination URL');
  }

  let destination;
  try {
    destination = decodeURIComponent(url);
    // Basic safety — only allow http/https destinations
    const parsed = new URL(destination);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid URL protocol');
    }
  } catch {
    return res.status(400).send('Invalid URL');
  }

  // ── Log the click ──────────────────────────────────────────────────────────
  const clickData = {
    ts: new Date().toISOString(),
    product: product ? decodeURIComponent(product) : '(unknown)',
    store:   store   ? decodeURIComponent(store)   : '(unknown)',
    type:    type    ? decodeURIComponent(type)     : '(unknown)',
    vibe:    vibe    ? decodeURIComponent(vibe)     : '(unknown)',
    budget:  budget  ? decodeURIComponent(budget)  : '(unknown)',
    occasion:occasion? decodeURIComponent(occasion): '(unknown)',
    who:     who     ? decodeURIComponent(who)     : '(unknown)',
    pos:     pos     || '?',
    dest:    destination,
    ip:      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown',
    ua:      req.headers['user-agent'] || 'unknown',
  };

  // Structured log — shows up clean in Vercel Function Logs
  console.log('[RCI_CLICK]', JSON.stringify(clickData));

  // ── Redirect to destination ────────────────────────────────────────────────
  res.setHeader('Location', destination);
  return res.status(302).end();
}
