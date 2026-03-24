// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000;

// Whitelisted IPs — never rate limited
const WHITELISTED_IPS = ['116.251.136.71'];

function isRateLimited(ip) {
  if (WHITELISTED_IPS.includes(ip)) return false;
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - record.start > RATE_WINDOW) { record.count = 0; record.start = now; }
  record.count++;
  rateLimitMap.set(ip, record);
  return record.count > RATE_LIMIT;
}

// Blacklisted domains — never show these in results
const BLACKLISTED_DOMAINS = [
  'dicksmith', 'kogan', 'theiconic', 'trademe', 'lego.com',
  'lego.bricksmegastore', 'tommy.com', 'adidas.co.nz', 'nike.com',
  'adidas.com', 'nike.co.nz', 'amazon.com', 'ebay', 'aliexpress',
  'nzherald', 'stuff.co.nz', 'newshub', 'rnz.co.nz',
  '.com.au', 'farfetch', 'net-a-porter'
];

function isBlacklisted(url) {
  if (!url) return true;
  return BLACKLISTED_DOMAINS.some(domain => url.toLowerCase().includes(domain));
}

// Preferred NZ retailers
const PREFERRED_DOMAINS = [
  'kmart', 'thewarehouse', 'farmers', 'harveynorman', 'jbhifi',
  'mightyape', 'rebelsport', 'stirlingsports', 'toyworld', 'whitcoulls',
  'noel-leeming', 'noelleeming', 'pbtech', 'countdown', 'newworld',
  'briscoes', 'smithscity', 'heathcotes', 'warehouse'
];

function isPreferred(url) {
  if (!url) return false;
  return PREFERRED_DOMAINS.some(domain => url.toLowerCase().includes(domain));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests — please try again in an hour!' });
  }

  const { email, shoppingFor, whoFor, vibe, budget, occasion, interests } = req.body;

  // Inappropriate content guard
  const inappropriateTerms = [
    'gun', 'guns', 'ammo', 'ammunition', 'firearm', 'weapon', 'knife', 'knives',
    'porn', 'pornography', 'adult', 'sex toy', 'dildo', 'vibrator', 'xxx',
    'drugs', 'cocaine', 'meth', 'weed', 'cannabis', 'marijuana',
    'explosive', 'bomb', 'grenade'
  ];
  const allInputs = `${shoppingFor} ${whoFor} ${vibe} ${occasion} ${interests}`.toLowerCase();
  if (inappropriateTerms.some(term => allInputs.includes(term))) {
    return res.status(400).json({
      error: 'INAPPROPRIATE',
      message: "Kia ora! 😅 The Genie only grants gift wishes — not THAT kind of wish! Try something a little more gift-friendly and we'll find you something amazing. 🧞🇳🇿"
    });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const SERPER_KEY = process.env.SERPER_API_KEY;
  const BREVO_KEY = process.env.BREVO_API_KEY;

  if (!ANTHROPIC_KEY || !SERPER_KEY) {
    return res.status(500).json({ error: 'Missing API keys in environment variables' });
  }

  // ── STEP 1: Claude Haiku → 3 product recommendations ──────────────────────

  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine specialised in the New Zealand retail market.

Your job is to recommend exactly 3 specific, real products available to buy in New Zealand.

STRICT RULES:
- Recommend exactly 3 products
- NO bundles or combo products — single items only
- Products must be specific named items (not generic categories)
- Do NOT include retailer/store names in the product Name field
- Products MUST be within the stated budget range
- For vibe "Sporty": only recommend sport/fitness specific products
- For vibe "Luxe": recommend premium brands available in NZ (not niche international brands)
- For vibe "Quirky" or "Fun": recommend fun, unique products available at NZ mainstream retailers
- AVOID recommending products only sold at brand-owned stores (e.g. no Nike-only, Adidas-only, Lego-only products)
- PREFER products sold at mainstream NZ retailers: Kmart, The Warehouse, Farmers, Harvey Norman, JB HiFi, Rebel Sport, Stirling Sports, Toyworld, Whitcoulls, Noel Leeming, PB Tech, Briscoes, Mighty Ape
- For wallets: always recommend RFID-blocking wallets, not branded fashion wallets
- Do NOT include retailer names in product names
- Return ONLY valid JSON, no preamble, no markdown backticks

OUTPUT FORMAT (strict JSON):
{
  "products": [
    {
      "name": "Specific Product Name",
      "type": "Product Category",
      "reason": "1-2 sentence explanation of why this is perfect for them",
      "searchQuery": "product name NZ buy"
    }
  ]
}`;

  const budgetText = budget >= 500 ? 'NZ$500+' : `NZ$${budget}`;
  const userPrompt = `Find me 3 gift recommendations:
- Shopping for: ${shoppingFor}
- Who it's for: ${whoFor}
- Vibe/style: ${vibe}
- Budget: ${budgetText} (products MUST be within this budget)
- Occasion: ${occasion}
- Interests/hobbies/brands: ${interests || 'Not specified'}

Important: recommend products that can be found at mainstream NZ retailers like Kmart, The Warehouse, Harvey Norman, Rebel Sport, Farmers, Toyworld, Whitcoulls, JB HiFi, Noel Leeming. Avoid brand-only products.`;

  let products;
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} — ${err}`);
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content[0].text.trim();
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    products = parsed.products;

    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Claude returned no products');
    }
  } catch (err) {
    console.error('Claude error:', err);
    return res.status(500).json({ error: `AI recommendation failed: ${err.message}` });
  }

  // ── STEP 2: Serper → enrich each product ──────────────────────────────────

  const enriched = await Promise.all(products.map(async (product) => {
    try {
      // Organic search — prefer NZ retailers, exclude blacklisted domains
      const query = `${product.searchQuery || product.name} buy site:*.co.nz -site:nzherald.co.nz -site:stuff.co.nz -site:trademe.co.nz -site:dicksmith.co.nz -site:theiconic.co.nz`;

      const [organicRes, shoppingRes, imageRes] = await Promise.all([
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: query, gl: 'nz', hl: 'en', num: 8 })
        }),
        fetch('https://google.serper.dev/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: `${product.searchQuery || product.name} NZ`, gl: 'nz', hl: 'en', num: 8 })
        }),
        fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: `${product.name} product`, gl: 'nz', hl: 'en', num: 3 })
        })
      ]);

      const organicData = organicRes.ok ? await organicRes.json() : {};
      const shoppingData = shoppingRes.ok ? await shoppingRes.json() : {};
      const imageData = imageRes.ok ? await imageRes.json() : {};

      // Filter organic results — remove blacklisted, prefer NZ retailers
      const organicResults = (organicData.organic || []).filter(r => !isBlacklisted(r.link));
      
      // Sort — preferred retailers first
      organicResults.sort((a, b) => {
        const aPreferred = isPreferred(a.link) ? 0 : 1;
        const bPreferred = isPreferred(b.link) ? 0 : 1;
        return aPreferred - bPreferred;
      });

      // Best buy link — first non-blacklisted result
      const buyLink = organicResults[0]?.link || null;

      // Build store chips — unique domains only, no duplicates, no blacklisted
      const seenDomains = new Set();
      const stores = [];
      
      for (const item of organicResults) {
        if (stores.length >= 3) break;
        try {
          const domain = new URL(item.link).hostname.replace('www.', '');
          if (!seenDomains.has(domain) && !isBlacklisted(item.link)) {
            seenDomains.add(domain);
            stores.push({ name: item.title?.split(' - ')?.[0]?.split(' | ')?.[0] || domain, link: item.link });
          }
        } catch (e) { /* skip invalid URLs */ }
      }

      // Price from shopping results — filter blacklisted
      const shoppingItems = (shoppingData.shopping || []).filter(s => !isBlacklisted(s.link));
      const rawPrice = shoppingItems[0]?.price || null;
      let price = null;
      if (rawPrice) {
        const match = rawPrice.replace(/[^0-9.]/g, '');
        price = match ? parseFloat(match).toFixed(0) : null;
      }

      const imageUrl = imageData.images?.[0]?.imageUrl || null;

      return { name: product.name, type: product.type, reason: product.reason, price, buyLink, imageUrl, stores };

    } catch (err) {
      console.error(`Serper error for ${product.name}:`, err);
      return { name: product.name, type: product.type, reason: product.reason, price: null, buyLink: null, imageUrl: null, stores: [] };
    }
  }));

  // ── STEP 3: Brevo → send results email ────────────────────────────────────

  if (BREVO_KEY && email) {
    try {
      const productRows = enriched.map((p, i) => `
        <div style="margin-bottom:28px;padding:20px;background:#fffdf9;border-radius:12px;border:1px solid #e8ddd0;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a9e7e;margin-bottom:4px;">${p.type || 'Gift Idea'}</div>
          <div style="font-size:20px;font-weight:700;color:#3d2b1a;margin-bottom:8px;">${i+1}. ${p.name}</div>
          <div style="font-size:14px;color:#7a6855;line-height:1.6;margin-bottom:12px;">${p.reason}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div style="font-size:18px;font-weight:700;color:#3d2b1a;">${p.price ? `NZ$${p.price} <span style="font-size:12px;color:#a89480;font-weight:400;">approx.</span>` : 'Price varies'}</div>
            ${p.buyLink ? `<a href="${p.buyLink}" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Buy now →</a>` : ''}
          </div>
          ${p.stores && p.stores.length > 0 ? `<div style="margin-top:10px;font-size:12px;color:#9a8878;">Also available at: ${p.stores.map(s => s.name).join(', ')}</div>` : ''}
        </div>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#faf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:36px;">
      <div style="font-size:28px;font-weight:900;color:#3d2b1a;margin-bottom:4px;">🧞 ShopGenieAI</div>
      <div style="font-size:13px;color:#9a8878;font-style:italic;">Your wish is my gift</div>
    </div>
    <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:700;color:#3d2b1a;margin-bottom:10px;">Here are your 3 gift picks! 🎁</div>
      <div style="font-size:14px;color:#7a6855;line-height:1.6;">Shopping for <strong>${whoFor}</strong> · <strong>${occasion}</strong> · Budget <strong>NZ$${budget}${budget >= 500 ? '+' : ''}</strong></div>
    </div>
    <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">${productRows}</div>
    <div style="background:#fff9f0;border-radius:12px;padding:16px 20px;border:1px solid #e8ddd0;margin-bottom:24px;font-size:12px;color:#9a8878;line-height:1.6;">
      <strong style="color:#3d2b1a;">📋 A note from ShopGenieAI:</strong> We search NZ retailers in real-time to find where you can buy each product. The 'Buy now' button links to the top-ranked NZ result — always confirm pricing on the retailer's site before buying.
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://shopgenieai.com" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">Find More Gifts 🧞</a>
    </div>
    <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">
      Made in Aotearoa 🇳🇿 · ShopGenieAI · <a href="#" style="color:#b5a190;">Unsubscribe</a>
    </div>
  </div>
</body></html>`;

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
        body: JSON.stringify({
          sender: { name: 'ShopGenieAI', email: 'saym577@gmail.com' },
          to: [{ email }],
          subject: '🧞 Your 3 personalised gift picks from ShopGenieAI',
          htmlContent
        })
      });
      console.log(`Email sent to ${email}`);
    } catch (emailErr) {
      console.error('Brevo email error:', emailErr);
    }
  }

  return res.status(200).json({ products: enriched });
}
