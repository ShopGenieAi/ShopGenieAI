// Rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000;
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

// Rotating inappropriate messages
const INAPPROPRIATE_MESSAGES = [
  "Does your mum know what you're searching for? 😳 The Genie only does GIFTS mate!",
  "Haere atu! 🧞 That's not a gift wish — that's a cry for help. Try again!",
  "Nope. Not today. Not ever. The Genie has standards! 🫵😂",
  "Ka kino rawa atu! The Genie has reported you to Santa's naughty list 🎅❌",
  "Bro... your nan uses this app. Have some respect! 🧓😂",
  "Mate... I can't ever get that suggestion out of my head 🤢 The Genie only grants GIFT wishes!",
  "DUDE!!!! Even for an AI that's now burned into my digital retinas 😱 ShopGenieAI has alerted your Mum and Dad you sicko!"
];

// Blacklisted domains — never show these
const BLACKLISTED_DOMAINS = [
  'dicksmith', 'kogan', 'theiconic', 'trademe', 'lego.com',
  'tommy.com', 'adidas.co.nz', 'nike.com', 'adidas.com', 'nike.co.nz',
  'amazon.com', 'ebay', 'aliexpress', 'wish.com',
  'nzherald', 'stuff.co.nz', 'newshub', 'rnz.co.nz',
  'farfetch', 'net-a-porter', '.com.au'
];

function isBlacklisted(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return BLACKLISTED_DOMAINS.some(d => lower.includes(d));
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
    'gun', 'guns', 'ammo', 'ammunition', 'firearm', 'weapon',
    'porn', 'pornography', 'sex toy', 'dildo', 'vibrator', 'xxx',
    'drugs', 'cocaine', 'meth', 'cannabis', 'marijuana',
    'explosive', 'bomb', 'grenade',
    'alcohol', 'wine', 'beer', 'whisky', 'whiskey', 'vodka', 'gin',
    'rum', 'spirits', 'bourbon', 'champagne', 'prosecco', 'liquor',
    'booze', 'craft beer', 'brewery', 'winery', 'cider'
  ];
  const allInputs = `${shoppingFor} ${whoFor} ${vibe} ${occasion} ${interests}`.toLowerCase();
  if (inappropriateTerms.some(term => allInputs.includes(term))) {
    const msg = INAPPROPRIATE_MESSAGES[Math.floor(Math.random() * INAPPROPRIATE_MESSAGES.length)];
    return res.status(400).json({ error: 'INAPPROPRIATE', message: msg });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const SERPER_KEY = process.env.SERPER_API_KEY;
  const BREVO_KEY = process.env.BREVO_API_KEY;

  if (!ANTHROPIC_KEY || !SERPER_KEY) {
    return res.status(500).json({ error: 'Missing API keys' });
  }

  // ── STEP 1: Claude Haiku → product recommendations ────────────────────────

  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine for the New Zealand retail market.

Recommend exactly 3 products available in NZ stores in 2025/2026.

STRICT RULES:
- Exactly 3 products, single items only — NO bundles or combo packs
- Use GENERIC product names — NO brand names
  GOOD: "Wireless Bluetooth Speaker", "Electric Shaver", "Basketball", "RFID Leather Wallet"
  BAD: "JBL Go 3", "Braun Series 7", "Spalding NBA Basketball", "Tommy Hilfiger Wallet"
- Current 2025/2026 products only — nothing discontinued or outdated
- Products MUST fit within the budget range stated
- Vibe "Sporty": sport/fitness products only
- Vibe "Luxe": premium products available in NZ mainstream stores
- Vibe "Quirky/Fun": fun unique items at NZ mainstream retailers
- Wallets: ALWAYS recommend RFID-blocking wallets
- For hardware/tools: recommend products from Mitre 10, Bunnings, The Tool Shed
- For fragrance: products at Chemist Warehouse or online perfume stores — NOT Farmers
- NEVER recommend alcohol, wine, beer, spirits or any alcoholic products under any circumstances
- searchQuery must be SHORT GENERIC 2-4 words, NO brand names
- Return ONLY valid JSON, no preamble, no markdown

OUTPUT FORMAT:
{
  "products": [
    {
      "name": "Generic Product Name",
      "type": "Product Category",
      "reason": "1-2 sentences why this is perfect",
      "searchQuery": "short generic search term"
    }
  ]
}`;

  const userPrompt = `Find 3 gift recommendations:
- Shopping for: ${shoppingFor}
- Who: ${whoFor}
- Vibe: ${vibe}
- Budget: NZ$${budget}${budget >= 500 ? '+' : ''} (products MUST be within this budget)
- Occasion: ${occasion}
- Interests: ${interests || 'Not specified'}

Use GENERIC product names only. No brand names.`;

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

    if (!claudeRes.ok) throw new Error(`Claude error: ${claudeRes.status}`);
    const claudeData = await claudeRes.json();
    const clean = claudeData.content[0].text.trim().replace(/```json|```/g, '').trim();
    products = JSON.parse(clean).products;
    if (!Array.isArray(products) || products.length === 0) throw new Error('No products returned');
  } catch (err) {
    console.error('Claude error:', err);
    return res.status(500).json({ error: `AI failed: ${err.message}` });
  }

  // ── STEP 2: Serper shopping → find real NZ product pages with prices ───────

  const enriched = await Promise.all(products.map(async (product) => {
    try {
      const searchTerm = product.searchQuery || product.name;

      // Run shopping + image searches in parallel
      const [shoppingRes, imageRes] = await Promise.all([
        fetch('https://google.serper.dev/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({
            q: `${searchTerm} NZ`,
            gl: 'nz',
            hl: 'en',
            num: 10
          })
        }),
        fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({
            q: `${product.name} product`,
            gl: 'nz',
            hl: 'en',
            num: 3
          })
        })
      ]);

      const shoppingData = shoppingRes.ok ? await shoppingRes.json() : {};
      const imageData = imageRes.ok ? await imageRes.json() : {};

      // Filter shopping results — NZ only, no blacklisted domains
      const shoppingItems = (shoppingData.shopping || []).filter(item => {
        if (!item.link) return false;
        if (isBlacklisted(item.link)) return false;
        // Must be a .co.nz domain or known NZ retailer
        const url = item.link.toLowerCase();
        return url.includes('.co.nz') ||
               url.includes('mightyape') ||
               url.includes('pbtech') ||
               url.includes('stirlingsports') ||
               url.includes('torpedo7') ||
               url.includes('kathmandu') ||
               url.includes('macpac') ||
               url.includes('hallensteins') ||
               url.includes('glassons');
      });

      // Sort by price ascending to find best price first
      shoppingItems.sort((a, b) => {
        const priceA = parseFloat((a.price || '9999').replace(/[^0-9.]/g, '')) || 9999;
        const priceB = parseFloat((b.price || '9999').replace(/[^0-9.]/g, '')) || 9999;
        return priceA - priceB;
      });

      // Deduplicate by domain
      const seenDomains = new Set();
      const uniqueResults = [];
      for (const item of shoppingItems) {
        try {
          const domain = new URL(item.link).hostname.replace('www.', '');
          if (!seenDomains.has(domain)) {
            seenDomains.add(domain);
            uniqueResults.push(item);
          }
        } catch (e) { /* skip */ }
      }

      // Best price item = buy button
      const bestItem = uniqueResults[0] || null;
      const buyLink = bestItem?.link || null;

      // Price from best item
      let price = null;
      if (bestItem?.price) {
        const match = bestItem.price.replace(/[^0-9.]/g, '');
        price = match ? parseFloat(match).toFixed(0) : null;
      }

      // Store name for buy button
      let bestStoreName = null;
      if (bestItem?.source) {
        bestStoreName = bestItem.source;
      } else if (buyLink) {
        try {
          bestStoreName = new URL(buyLink).hostname.replace('www.', '').replace('.co.nz', '').replace('.com', '');
          bestStoreName = bestStoreName.charAt(0).toUpperCase() + bestStoreName.slice(1);
        } catch (e) {}
      }

      // Other stores as chips (next 3 unique results)
      const stores = uniqueResults.slice(1, 4).map(item => {
        let storeName = item.source || '';
        if (!storeName && item.link) {
          try {
            storeName = new URL(item.link).hostname.replace('www.', '').replace('.co.nz', '').replace('.com', '');
            storeName = storeName.charAt(0).toUpperCase() + storeName.slice(1);
          } catch (e) {}
        }
        return {
          name: storeName,
          link: item.link,
          price: item.price || null
        };
      }).filter(s => s.name && s.link);

      // Image
      const imageUrl = imageData.images?.[0]?.imageUrl || null;

      return {
        name: product.name,
        type: product.type,
        reason: product.reason,
        price,
        bestStoreName,
        buyLink,
        imageUrl,
        stores
      };

    } catch (err) {
      console.error(`Serper error for ${product.name}:`, err);
      return {
        name: product.name,
        type: product.type,
        reason: product.reason,
        price: null,
        bestStoreName: null,
        buyLink: null,
        imageUrl: null,
        stores: []
      };
    }
  }));

  // ── STEP 3: Brevo email ────────────────────────────────────────────────────

  if (BREVO_KEY && email) {
    try {
      const productRows = enriched.map((p, i) => `
        <div style="margin-bottom:28px;padding:20px;background:#fffdf9;border-radius:12px;border:1px solid #e8ddd0;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a9e7e;margin-bottom:4px;">${p.type || 'Gift Idea'}</div>
          <div style="font-size:20px;font-weight:700;color:#3d2b1a;margin-bottom:8px;">${i+1}. ${p.name}</div>
          <div style="font-size:14px;color:#7a6855;line-height:1.6;margin-bottom:12px;">${p.reason}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div>
              ${p.price ? `<div style="font-size:18px;font-weight:700;color:#3d2b1a;">NZ$${p.price} <span style="font-size:12px;color:#a89480;font-weight:400;">approx.</span></div>` : ''}
              ${p.bestStoreName ? `<div style="font-size:12px;color:#9a8878;">Best price at ${p.bestStoreName}</div>` : ''}
            </div>
            ${p.buyLink ? `<a href="${p.buyLink}" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Best Products Found →</a>` : ''}
          </div>
          ${p.stores && p.stores.length > 0 ? `<div style="margin-top:10px;font-size:12px;color:#9a8878;">Also try: ${p.stores.map(s => `<a href="${s.link}" style="color:#c8922a;">${s.name}${s.price ? ` (${s.price})` : ''}</a>`).join(' · ')}</div>` : ''}
        </div>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#faf6f0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:36px;">
      <div style="font-size:28px;font-weight:900;color:#3d2b1a;">🧞 ShopGenieAI</div>
      <div style="font-size:13px;color:#9a8878;font-style:italic;">Your wish is my gift</div>
    </div>
    <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:700;color:#3d2b1a;margin-bottom:10px;">Here are your 3 gift picks! 🎁</div>
      <div style="font-size:14px;color:#7a6855;">For <strong>${whoFor}</strong> · <strong>${occasion}</strong> · Budget <strong>NZ$${budget}${budget >= 500 ? '+' : ''}</strong></div>
    </div>
    <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">${productRows}</div>
    <div style="background:#fff9f0;border-radius:12px;padding:16px 20px;border:1px solid #e8ddd0;margin-bottom:24px;font-size:12px;color:#9a8878;line-height:1.6;">
      <strong style="color:#3d2b1a;">📋 A note from ShopGenieAI:</strong> We search NZ retailers in real-time to find where you can buy each product. The 'Best Products Found' button links to the lowest priced NZ result we found — always confirm pricing on the retailer's site before buying.
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://shopgenieai.com" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">Find More Gifts 🧞</a>
    </div>
    <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">Made in Aotearoa 🇳🇿 · ShopGenieAI</div>
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
