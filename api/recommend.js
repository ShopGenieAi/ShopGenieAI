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

// Category → best NZ retailers with their search URL patterns
const CATEGORY_RETAILERS = {
  fragrance: [
    { name: 'Chemist Warehouse NZ', searchUrl: 'https://www.chemistwarehouse.co.nz/search?q=' },
    { name: 'My Perfume Shop', searchUrl: 'https://www.myperfumeshop.co.nz/search?q=' },
    { name: 'Perfume NZ', searchUrl: 'https://www.perfumenz.co.nz/search?q=' },
    { name: 'Farmers', searchUrl: 'https://www.farmers.co.nz/search?q=' },
  ],
  tech: [
    { name: 'PB Tech', searchUrl: 'https://www.pbtech.co.nz/search?q=' },
    { name: 'JB HiFi', searchUrl: 'https://www.jbhifi.co.nz/search?q=' },
    { name: 'Harvey Norman', searchUrl: 'https://www.harveynorman.co.nz/search?q=' },
    { name: 'Noel Leeming', searchUrl: 'https://www.noelleeming.co.nz/search?q=' },
    { name: 'Mighty Ape', searchUrl: 'https://www.mightyape.co.nz/search?q=' },
  ],
  sports: [
    { name: 'Rebel Sport', searchUrl: 'https://www.rebelsport.co.nz/search?q=' },
    { name: 'Stirling Sports', searchUrl: 'https://www.stirlingsports.co.nz/search?q=' },
    { name: 'Kmart', searchUrl: 'https://www.kmart.co.nz/search?q=' },
    { name: 'The Warehouse', searchUrl: 'https://www.thewarehouse.co.nz/search?q=' },
    { name: 'Sportsworld', searchUrl: 'https://www.sportsworld.co.nz/search?q=' },
  ],
  toys: [
    { name: 'Toyworld', searchUrl: 'https://www.toyworld.co.nz/search?q=' },
    { name: 'Kmart', searchUrl: 'https://www.kmart.co.nz/search?q=' },
    { name: 'The Warehouse', searchUrl: 'https://www.thewarehouse.co.nz/search?q=' },
    { name: 'Mighty Ape', searchUrl: 'https://www.mightyape.co.nz/search?q=' },
    { name: 'Paper Plus', searchUrl: 'https://www.paperplus.co.nz/search?q=' },
  ],
  books: [
    { name: 'Whitcoulls', searchUrl: 'https://www.whitcoulls.co.nz/search?q=' },
    { name: 'Paper Plus', searchUrl: 'https://www.paperplus.co.nz/search?q=' },
    { name: 'Mighty Ape', searchUrl: 'https://www.mightyape.co.nz/search?q=' },
    { name: 'The Warehouse', searchUrl: 'https://www.thewarehouse.co.nz/search?q=' },
  ],
  grooming: [
    { name: 'Chemist Warehouse NZ', searchUrl: 'https://www.chemistwarehouse.co.nz/search?q=' },
    { name: 'Shaver Shop', searchUrl: 'https://www.shavershop.co.nz/search?q=' },
    { name: 'Farmers', searchUrl: 'https://www.farmers.co.nz/search?q=' },
    { name: 'Life Pharmacy', searchUrl: 'https://www.lifepharmacy.co.nz/search?q=' },
  ],
  fashion: [
    { name: 'Farmers', searchUrl: 'https://www.farmers.co.nz/search?q=' },
    { name: 'The Warehouse', searchUrl: 'https://www.thewarehouse.co.nz/search?q=' },
    { name: 'Glassons', searchUrl: 'https://www.glassons.com/search?q=' },
    { name: 'Hallensteins', searchUrl: 'https://www.hallensteins.com/search?q=' },
    { name: 'Kmart', searchUrl: 'https://www.kmart.co.nz/search?q=' },
  ],
  home: [
    { name: 'Briscoes', searchUrl: 'https://www.briscoes.co.nz/search?q=' },
    { name: 'The Warehouse', searchUrl: 'https://www.thewarehouse.co.nz/search?q=' },
    { name: 'Kmart', searchUrl: 'https://www.kmart.co.nz/search?q=' },
    { name: 'Farmers', searchUrl: 'https://www.farmers.co.nz/search?q=' },
    { name: 'Stevens', searchUrl: 'https://www.stevens.co.nz/search?q=' },
  ],
  food: [
    { name: 'The Warehouse', searchUrl: 'https://www.thewarehouse.co.nz/search?q=' },
    { name: 'Kmart', searchUrl: 'https://www.kmart.co.nz/search?q=' },
    { name: 'Moore Wilsons', searchUrl: 'https://www.moorewilsons.co.nz/search?q=' },
    { name: 'Farro Fresh', searchUrl: 'https://www.farro.co.nz/search?q=' },
  ],
  gaming: [
    { name: 'Mighty Ape', searchUrl: 'https://www.mightyape.co.nz/search?q=' },
    { name: 'JB HiFi', searchUrl: 'https://www.jbhifi.co.nz/search?q=' },
    { name: 'EB Games', searchUrl: 'https://www.ebgames.co.nz/search?q=' },
    { name: 'Harvey Norman', searchUrl: 'https://www.harveynorman.co.nz/search?q=' },
  ],
  outdoor: [
    { name: 'Kathmandu', searchUrl: 'https://www.kathmandu.co.nz/search?q=' },
    { name: 'Macpac', searchUrl: 'https://www.macpac.co.nz/search?q=' },
    { name: 'Hunting & Fishing NZ', searchUrl: 'https://www.huntingandfishing.co.nz/search?q=' },
    { name: 'Rebel Sport', searchUrl: 'https://www.rebelsport.co.nz/search?q=' },
    { name: 'Torpedo7', searchUrl: 'https://www.torpedo7.co.nz/search?q=' },
  ],
  default: [
    { name: 'Kmart', searchUrl: 'https://www.kmart.co.nz/search?q=' },
    { name: 'The Warehouse', searchUrl: 'https://www.thewarehouse.co.nz/search?q=' },
    { name: 'Farmers', searchUrl: 'https://www.farmers.co.nz/search?q=' },
    { name: 'Mighty Ape', searchUrl: 'https://www.mightyape.co.nz/search?q=' },
    { name: 'Harvey Norman', searchUrl: 'https://www.harveynorman.co.nz/search?q=' },
  ]
};

function getRetailersForCategory(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('fragrance') || t.includes('perfume') || t.includes('cologne')) return CATEGORY_RETAILERS.fragrance;
  if (t.includes('tech') || t.includes('electronic') || t.includes('gadget') || t.includes('speaker') || t.includes('headphone') || t.includes('earb') || t.includes('phone') || t.includes('tablet') || t.includes('computer') || t.includes('camera')) return CATEGORY_RETAILERS.tech;
  if (t.includes('sport') || t.includes('fitness') || t.includes('running') || t.includes('gym') || t.includes('exercise') || t.includes('ball') || t.includes('bike')) return CATEGORY_RETAILERS.sports;
  if (t.includes('toy') || t.includes('game') || t.includes('puzzle') || t.includes('lego') || t.includes('card game') || t.includes('board game')) return CATEGORY_RETAILERS.toys;
  if (t.includes('book') || t.includes('novel') || t.includes('comic')) return CATEGORY_RETAILERS.books;
  if (t.includes('groom') || t.includes('razor') || t.includes('shaver') || t.includes('skincare') || t.includes('beauty') || t.includes('makeup')) return CATEGORY_RETAILERS.grooming;
  if (t.includes('fashion') || t.includes('clothing') || t.includes('shirt') || t.includes('jacket') || t.includes('wallet') || t.includes('bag') || t.includes('watch') || t.includes('jewel') || t.includes('accessor')) return CATEGORY_RETAILERS.fashion;
  if (t.includes('home') || t.includes('kitchen') || t.includes('cook') || t.includes('appliance') || t.includes('bedding') || t.includes('candle') || t.includes('decor')) return CATEGORY_RETAILERS.home;
  if (t.includes('food') || t.includes('drink') || t.includes('coffee') || t.includes('tea') || t.includes('wine') || t.includes('chocolate') || t.includes('snack')) return CATEGORY_RETAILERS.food;
  if (t.includes('gaming') || t.includes('video game') || t.includes('console') || t.includes('playstation') || t.includes('xbox') || t.includes('nintendo')) return CATEGORY_RETAILERS.gaming;
  if (t.includes('outdoor') || t.includes('camp') || t.includes('hik') || t.includes('fishing') || t.includes('adventure') || t.includes('travel')) return CATEGORY_RETAILERS.outdoor;
  return CATEGORY_RETAILERS.default;
}

function buildSearchUrl(baseUrl, query) {
  return baseUrl + encodeURIComponent(query);
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
    'porn', 'pornography', 'adult content', 'sex toy', 'dildo', 'vibrator', 'xxx',
    'drugs', 'cocaine', 'meth', 'cannabis', 'marijuana',
    'explosive', 'bomb', 'grenade'
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
    return res.status(500).json({ error: 'Missing API keys in environment variables' });
  }

  // ── STEP 1: Claude Haiku → product recommendations ────────────────────────

  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine for the New Zealand retail market.

Recommend exactly 3 specific products available in NZ mainstream stores.

STRICT RULES:
- Exactly 3 products, single items only — NO bundles
- Specific product names — no generic categories
- Do NOT include retailer names in product Name field
- Products MUST fit within the budget range
- Vibe "Sporty": sport/fitness products only
- Vibe "Luxe": premium but available in NZ mainstream stores
- Vibe "Quirky/Fun": fun unique products at mainstream NZ retailers
- Wallets: ALWAYS recommend RFID-blocking wallets
- AVOID products only sold at brand-owned stores
- PREFER products sold at: Kmart, The Warehouse, Farmers, Harvey Norman, JB HiFi, Rebel Sport, Stirling Sports, Toyworld, Whitcoulls, Noel Leeming, PB Tech, Briscoes, Mighty Ape, Chemist Warehouse, Kathmandu, Macpac, Torpedo7
- For fragrance: recommend products available at Chemist Warehouse, pharmacies or online perfume stores — NOT Farmers
- Return ONLY valid JSON, no preamble, no markdown

OUTPUT FORMAT:
{
  "products": [
    {
      "name": "Specific Product Name",
      "type": "Product Category",
      "reason": "1-2 sentences why perfect for them",
      "searchQuery": "short search term for this product"
    }
  ]
}`;

  const userPrompt = `Find 3 gift recommendations:
- Shopping for: ${shoppingFor}
- Who: ${whoFor}
- Vibe: ${vibe}
- Budget: NZ$${budget}${budget >= 500 ? '+' : ''} (MUST be within this)
- Occasion: ${occasion}
- Interests: ${interests || 'Not specified'}

Recommend products found at mainstream NZ retailers. Avoid brand-only stores.`;

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

    if (!claudeRes.ok) throw new Error(`Claude API error: ${claudeRes.status}`);
    const claudeData = await claudeRes.json();
    const clean = claudeData.content[0].text.trim().replace(/```json|```/g, '').trim();
    products = JSON.parse(clean).products;
    if (!Array.isArray(products) || products.length === 0) throw new Error('No products returned');
  } catch (err) {
    console.error('Claude error:', err);
    return res.status(500).json({ error: `AI recommendation failed: ${err.message}` });
  }

  // ── STEP 2: Build retailer search links + get image ────────────────────────

  const enriched = await Promise.all(products.map(async (product) => {
    try {
      // Get product image from Serper
      const imageRes = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
        body: JSON.stringify({ q: `${product.name} product`, gl: 'nz', hl: 'en', num: 3 })
      });
      const imageData = imageRes.ok ? await imageRes.json() : {};
      const imageUrl = imageData.images?.[0]?.imageUrl || null;

      // Get retailers for this category
      const retailers = getRetailersForCategory(product.type);
      // Pick top 3 retailers and build search URLs
      const stores = retailers.slice(0, 3).map(r => ({
        name: r.name,
        link: buildSearchUrl(r.searchUrl, product.searchQuery || product.name)
      }));

      // Best buy link = first retailer's search page
      const buyLink = stores[0]?.link || null;

      return {
        name: product.name,
        type: product.type,
        reason: product.reason,
        price: null, // No price — we're showing search pages not exact products
        buyLink,
        imageUrl,
        stores: stores.slice(1) // remaining stores as chips (first one is the buy button)
      };

    } catch (err) {
      console.error(`Error for ${product.name}:`, err);
      const retailers = getRetailersForCategory(product.type);
      return {
        name: product.name,
        type: product.type,
        reason: product.reason,
        price: null,
        buyLink: buildSearchUrl(retailers[0]?.searchUrl || 'https://www.thewarehouse.co.nz/search?q=', product.name),
        imageUrl: null,
        stores: retailers.slice(1, 3).map(r => ({ name: r.name, link: buildSearchUrl(r.searchUrl, product.name) }))
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
          ${p.buyLink ? `<a href="${p.buyLink}" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Best Products Found →</a>` : ''}
          ${p.stores && p.stores.length > 0 ? `<div style="margin-top:10px;font-size:12px;color:#9a8878;">Also try: ${p.stores.map(s => `<a href="${s.link}" style="color:#c8922a;">${s.name}</a>`).join(' · ')}</div>` : ''}
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
      <strong style="color:#3d2b1a;">📋 A note from ShopGenieAI:</strong> We search NZ retailers in real-time. The 'Best Products Found' button takes you to search results at the best matched NZ retailer — browse, compare and buy at your convenience!
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
