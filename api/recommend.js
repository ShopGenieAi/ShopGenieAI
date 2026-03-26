// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — recommend.js
// Architecture: Claude → NormalizeQuery → Warehouse buy button + Google Shopping chips
// Zero 404s. Zero broken links. Built for NZ retail reality.
// ─────────────────────────────────────────────────────────────────────────────

// ── RATE LIMITER ──────────────────────────────────────────────────────────────
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

// ── BUDGET TIER SYSTEM ────────────────────────────────────────────────────────
const BUDGET_TIERS = {
  'low':    { min: 0,   max: 50,   label: 'Low Budget 🤑',            hint: 'under $50'  },
  'medium': { min: 50,  max: 150,  label: 'Medium Budget 💸',         hint: 'under $150' },
  'high':   { min: 150, max: 300,  label: 'High Budget 🎯',           hint: 'under $300' },
  'bigwed': { min: 300, max: 400,  label: 'Big Wednesday Spender 🎰', hint: 'under $400' },
  'lotto':  { min: 500, max: 9999, label: 'OMG You Won Lotto 🎉',     hint: 'over $500'  },
};

function getTier(tierKey) {
  return BUDGET_TIERS[tierKey] || BUDGET_TIERS['medium'];
}

// ── INAPPROPRIATE CONTENT ─────────────────────────────────────────────────────
const INAPPROPRIATE_MESSAGES = [
  "Does your mum know what you're searching for? 😳 The Genie only does GIFTS mate!",
  "Haere atu! 🧞 That's not a gift wish — that's a cry for help. Try again!",
  "Nope. Not today. Not ever. The Genie has standards! 🫵😂",
  "Ka kino rawa atu! The Genie has reported you to Santa's naughty list 🎅❌",
  "Bro... your nan uses this app. Have some respect! 🧓😂",
  "Mate... I can't ever get that suggestion out of my head 🤢 The Genie only grants GIFT wishes!",
  "DUDE!!!! Even for an AI that's now burned into my digital retinas 😱 ShopGenieAI has alerted your Mum and Dad you sicko!"
];

const INAPPROPRIATE_TERMS = [
  'gun','guns','ammo','ammunition','firearm','weapon',
  'porn','pornography','sex toy','dildo','vibrator','xxx',
  'drugs','cocaine','meth','cannabis','marijuana',
  'explosive','bomb','grenade',
  'alcohol','wine','beer','whisky','whiskey','vodka','gin',
  'rum','spirits','bourbon','champagne','prosecco','liquor',
  'booze','craft beer','brewery','winery','cider'
];

// ── NZ SEARCH TERM NORMALISATION ──────────────────────────────────────────────
// Converts AI-generated generic terms to NZ "Known-Good" retail search terms
// Built from Mark's spreadsheet + common AI term patterns
const NZ_TERM_MAP = [
  // Tech & Mobile
  ['cell phone',          'mobile phone'],
  ['smartphone',          'mobile phone'],
  ['smart phone',         'mobile phone'],
  ['sport watch',         'smart watch'],
  ['sports watch',        'smart watch'],
  ['fitness watch',       'smart watch'],
  ['activity tracker',    'smart watch'],
  ['smartwatch',          'smart watch'],
  ['airpods',             'wireless earbuds'],
  ['earbuds',             'wireless earbuds'],
  ['earphones',           'wireless earbuds'],
  ['in-ear headphones',   'wireless earbuds'],
  ['laptop computer',     'laptop'],
  ['notebook computer',   'laptop'],
  ['tablet computer',     'tablet'],
  ['e-reader',            'ereader'],
  ['smart speaker',       'bluetooth speaker'],
  ['bluetooth headset',   'bluetooth headphones'],
  ['noise cancelling',    'noise cancelling headphones'],
  ['wireless charger',    'wireless charger'],
  ['power bank',          'portable charger'],
  ['portable charger',    'portable charger'],
  ['dash cam',            'dashcam'],
  ['dash camera',         'dashcam'],
  ['action camera',       'action camera'],
  ['security camera',     'security camera'],
  // Clothing & Footwear
  ['sneakers',            'running shoes'],
  ['tennis shoes',        'running shoes'],
  ['athletic shoes',      'running shoes'],
  ['trainers',            'running shoes'],
  ['flip flops',          'jandals'],
  ['thongs',              'jandals'],
  ['bathing suit',        'togs'],
  ['swimsuit',            'togs'],
  ['swimming costume',    'togs'],
  ['swimwear',            'togs'],
  ['sweater',             'jersey'],
  ['pullover',            'jersey'],
  ['sweatshirt',          'hoodie'],
  ['underwear',           'undies'],
  ['panties',             'undies'],
  ['activewear set',      'activewear'],
  ['gym wear',            'activewear'],
  ['workout clothes',     'activewear'],
  ['rain jacket',         'rain jacket'],
  ['waterproof jacket',   'rain jacket'],
  ['puffer jacket',       'puffer jacket'],
  ['down jacket',         'puffer jacket'],
  ['beanie hat',          'beanie'],
  ['woolen hat',          'beanie'],
  ['knit cap',            'beanie'],
  ['sunglasses',          'sunglasses'],
  // Home & Living
  ['comforter',           'duvet'],
  ['bedding set',         'bed linen'],
  ['sheets set',          'bed sheets'],
  ['kitchen appliances',  'kitchen appliances'],
  ['trash can',           'rubbish bin'],
  ['garbage bin',         'rubbish bin'],
  ['faucet',              'tap'],
  ['countertop',          'benchtop'],
  ['couch',               'sofa'],
  ['loveseat',            'sofa'],
  ['area rug',            'floor rug'],
  ['throw pillow',        'cushion'],
  ['throw blanket',       'throw blanket'],
  ['picture frame',       'photo frame'],
  ['photo frame set',     'photo frame'],
  ['laundry hamper',      'laundry basket'],
  // DIY & Garden
  ['flashlight',          'torch'],
  ['flash light',         'torch'],
  ['yard tools',          'garden tools'],
  ['garden tools set',    'garden tools'],
  ['pressure washer',     'water blaster'],
  ['power washer',        'water blaster'],
  ['weed killer',         'weed spray'],
  ['fertilizer',          'fertiliser'],
  ['plant pot',           'plant pot'],
  ['flower pot',          'plant pot'],
  // Baby & Family
  ['diapers',             'nappies'],
  ['diaper',              'nappies'],
  ['pacifier',            'dummy'],
  ['soother',             'dummy'],
  ['stroller',            'pram'],
  ['baby carriage',       'pram'],
  ['car seat',            'baby car seat'],
  // Sports & Fitness
  ['gym bag',             'sports bag'],
  ['duffel bag',          'sports bag'],
  ['duffle bag',          'sports bag'],
  ['exercise mat',        'yoga mat'],
  ['resistance bands',    'resistance bands'],
  ['water bottle insulated', 'drink bottle'],
  ['hydro flask',         'drink bottle'],
  ['water bottle',        'drink bottle'],
  ['drink bottle',        'drink bottle'],
  ['running backpack',    'hydration pack'],
  ['tennis racquet',      'tennis racket'],
  ['soccer ball',         'football'],
  ['soccer cleats',       'football boots'],
  ['soccer boots',        'football boots'],
  ['shin guards',         'shin pads'],
  ['goggles swimming',    'swimming goggles'],
  ['swim goggles',        'swimming goggles'],
  ['cycling helmet',      'bike helmet'],
  ['bicycle helmet',      'bike helmet'],
  // Food & Drink
  ['soda',                'soft drink'],
  ['candy',               'lollies'],
  ['sweets',              'lollies'],
  ['potato chips',        'crisps'],
  ['cookies',             'biscuits'],
  ['cookie',              'biscuits'],
  // Misc
  ['fanny pack',          'bum bag'],
  ['hip pack',            'bum bag'],
  ['waist bag',           'bum bag'],
  ['rfid wallet',         'rfid wallet'],
  ['mens wallet',         'leather wallet'],
  ['womens wallet',       'purse wallet'],
  ['insect repellent',    'insect repellent'],
  ['bug spray',           'insect repellent'],
  ['scented candle',      'scented candle'],
  ['essential oil diffuser', 'oil diffuser'],
  ['stuffed animal',      'soft toy'],
  ['teddy bear',          'soft toy'],
  ['cologne',             'mens fragrance'],
  ['aftershave',          'aftershave'],
  ['body wash set',       'body wash gift set'],
  ['skincare set',        'skincare gift set'],
  ['makeup kit',          'makeup gift set'],
  ['hair dryer',          'hair dryer'],
  ['hair straightener',   'hair straightener'],
  ['electric toothbrush', 'electric toothbrush'],
  ['luggage set',         'suitcase'],
  ['carry on luggage',    'carry on bag'],
  ['passport holder',     'passport wallet'],
  ['board game',          'board game'],
  ['card game',           'card game'],
  ['perfume',             'perfume'],
];

function normalizeQuery(rawQuery) {
  if (!rawQuery) return rawQuery;
  const lower = rawQuery.toLowerCase().trim();
  for (const [trigger, nzTerm] of NZ_TERM_MAP) {
    if (lower.includes(trigger)) return nzTerm;
  }
  // Remove common brand names Claude slips in
  return lower
    .replace(/\b(nike|adidas|apple|samsung|sony|lg|philips|dyson|breville|delonghi|nespresso|tefal|sunbeam|garmin|fitbit)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || rawQuery;
}

// ── LINK BUILDERS ─────────────────────────────────────────────────────────────

// BUY BUTTON: The Warehouse — most reliable NZ search engine, broad stock
// priceTo parameter narrows results to budget range
function buildWarehouseUrl(searchTerm, budgetMax) {
  const base = `https://www.thewarehouse.co.nz/search?q=${encodeURIComponent(searchTerm)}`;
  return budgetMax && budgetMax < 9999 ? `${base}&priceTo=${budgetMax}` : base;
}

// CHIPS: Google Shopping NZ — uses Google's index, shows prices + retailers
// Never 404s. Always finds products. Shows multiple NZ retailers at once.
function buildGoogleShoppingUrl(searchTerm, budgetHint) {
  // Add NZ and budget context to get relevant NZ results
  const query = `${searchTerm} NZ ${budgetHint}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop&gl=nz&hl=en`;
}

// Build Google Shopping chips — 3 different search angle variations
// This gives the user discovery options with different angles on the product
function buildShoppingChips(searchTerm, productName, budgetHint) {
  return [
    {
      name: '🛒 Shop NZ',
      link: buildGoogleShoppingUrl(searchTerm, budgetHint),
    },
    {
      name: '💰 Compare Prices',
      link: `https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' buy NZ')}&tbm=shop&gl=nz&hl=en`,
    },
    {
      name: '⭐ Top Rated',
      link: `https://www.google.com/search?q=${encodeURIComponent('best ' + searchTerm + ' NZ')}&tbm=shop&gl=nz&hl=en`,
    },
  ];
}

// ── BRAVE IMAGE SEARCH ────────────────────────────────────────────────────────
async function getBraveImage(searchTerm, braveKey) {
  if (!braveKey) return null;
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(searchTerm + ' product')}&count=3&safesearch=strict`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': braveKey,
        }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.results || [];
    for (const r of results) {
      const url = r?.thumbnail?.src || r?.properties?.url || null;
      if (url && !url.includes('logo') && !url.includes('icon')) return url;
    }
    return null;
  } catch (e) {
    console.error('Brave image error:', e.message);
    return null;
  }
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
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

  const {
    email, shoppingFor, whoFor, vibe, budgetTier, occasion, interests,
    refreshSeed = 0,
    excludeProducts = []
  } = req.body;

  const allInputs = `${shoppingFor} ${whoFor} ${vibe} ${occasion} ${interests}`.toLowerCase();
  if (INAPPROPRIATE_TERMS.some(t => allInputs.includes(t))) {
    const msg = INAPPROPRIATE_MESSAGES[Math.floor(Math.random() * INAPPROPRIATE_MESSAGES.length)];
    return res.status(400).json({ error: 'INAPPROPRIATE', message: msg });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const BRAVE_KEY     = process.env.BRAVE_API_KEY;
  const BREVO_KEY     = process.env.BREVO_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'Missing Anthropic API key' });

  const tier = getTier(budgetTier || 'medium');
  const { label: budgetLabel, hint: budgetHint, min: budgetMin, max: budgetMax } = tier;
  const budgetInstruction = budgetTier === 'lotto'
    ? 'Products MUST be premium items priced NZ$500 or above.'
    : `Products MUST be priced between NZ$${budgetMin} and NZ$${budgetMax}.`;

  const refreshVariations = [
    '',
    'Find 3 DIFFERENT product categories — same vibe, person and interests.',
    'Suggest ALTERNATIVE ideas — different from previous but same vibe and interests.',
    'Focus on NICHE or less obvious products — same vibe and interests.',
    'Suggest PREMIUM best-in-class versions — same vibe and interests.',
    'Think EXPERIENTIAL or lifestyle products — same vibe and interests.',
  ];
  const refreshInstruction = refreshSeed > 0
    ? (refreshVariations[refreshSeed] || refreshVariations[refreshVariations.length - 1])
    : '';

  // ── STEP 1: Claude Haiku ────────────────────────────────────────────────────
  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine for the New Zealand retail market.

Recommend exactly 3 products available in NZ stores in 2025/2026.

RULES:
- Exactly 3 products, single items only — NO bundles, NO combo packs
- GENERIC product names ONLY — what a Kiwi would actually say in a shop
  GOOD: "Foam Roller", "Smart Watch", "Wireless Earbuds", "Sports Bag", "Drink Bottle"
  BAD: "Advanced Recovery Device", "Recycled Plastic Sports Bag", "Bamboo Grooming Kit", invented compound names
  NEVER include materials in product names (no "bamboo", "recycled", "organic cotton" in the NAME)
  Materials belong in the reason field only, not the product name or searchQuery

- STOCK REALITY: Products must be available at mainstream NZ retailers like The Warehouse, Farmers, Briscoes, Noel Leeming, Kmart
  Do NOT recommend hyper-niche eco products that only specialist stores carry
  Eco-friendly vibe = choose mainstream products with eco credentials, not obscure boutique items
  GOOD eco picks: reusable drink bottle, bamboo toothbrush, cotton tote bag, beeswax wraps, keep cup
  BAD eco picks: hand-poured soy candle set, artisan beeswax food wrap kit, hemp clothing set
- BUDGET HARD RULE: ${budgetInstruction} Non-negotiable.
- Every product MUST match the stated vibe
- Every product MUST be relevant to stated interests
- NEVER recommend alcohol, weapons, or adult products
- NEVER repeat the same product category twice in one set of 3

NZ TERMINOLOGY — always use these terms:
- "drink bottle" not "water bottle"
- "togs" not "swimwear" or "swimsuit"
- "jandals" not "flip flops"
- "jersey" not "sweater" or "pullover"
- "smart watch" not "sport watch" or "fitness watch"
- "sports bag" not "gym bag" or "duffel bag"
- "wireless earbuds" not "earbuds" or "airpods"
- "torch" not "flashlight"
- "nappies" not "diapers"
- "bum bag" not "fanny pack"
- "rubbish bin" not "trash can"
- "hoodie" not "sweatshirt"
- "running shoes" not "sneakers" or "trainers"

SEARCH QUERY: 2-4 NZ retail words, no brand names, no model numbers.

Return ONLY valid JSON, no preamble, no markdown.

OUTPUT FORMAT:
{
  "products": [
    {
      "name": "Smart Watch",
      "type": "Electronics",
      "reason": "1-2 sentences why this is perfect for this person",
      "searchQuery": "smart watch"
    }
  ]
}`;

  const userPrompt = `Find 3 gift recommendations:
- Shopping for: ${shoppingFor}
- Who: ${whoFor}
- Vibe: ${vibe}
- Budget: ${budgetLabel} (${budgetInstruction})
- Occasion: ${occasion}
- Interests/hobbies: ${interests || 'Not specified'}
${refreshInstruction ? `\nVariety: ${refreshInstruction}` : ''}
${excludeProducts.length > 0 ? `\nDo NOT repeat: ${excludeProducts.join(', ')}` : ''}`;

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
        max_tokens: 1000,
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

  // ── STEP 2: Normalise + build links + images ──────────────────────────────
  const enriched = await Promise.all(products.map(async (product) => {

    // Normalise to NZ Known-Good search term
    const searchTerm = normalizeQuery(product.searchQuery || product.name);

    // Buy button: The Warehouse with budget price filter
    const buyLink = buildWarehouseUrl(searchTerm, budgetMax);

    // Chips: Google Shopping NZ — 3 discovery angles, never 404
    const stores = buildShoppingChips(searchTerm, product.name, budgetHint);

    // Brave image — parallel
    const imageUrl = await getBraveImage(searchTerm, BRAVE_KEY);

    console.log(`"${product.name}" → normalized: "${searchTerm}" → Warehouse + Google Shopping chips`);

    return {
      name:          product.name,
      type:          product.type,
      reason:        product.reason,
      budgetLabel,
      bestStoreName: 'The Warehouse',
      buyLink,
      imageUrl,
      stores,
    };
  }));

  // ── STEP 3: Brevo email ─────────────────────────────────────────────────────
  if (BREVO_KEY && email) {
    try {
      const rows = enriched.map((p, i) => `
        <div style="margin-bottom:28px;padding:20px;background:#fffdf9;border-radius:12px;border:1px solid #e8ddd0;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a9e7e;margin-bottom:4px;">${p.type || 'Gift Idea'}</div>
          <div style="font-size:20px;font-weight:700;color:#3d2b1a;margin-bottom:8px;">${i+1}. ${p.name}</div>
          <div style="font-size:14px;color:#7a6855;line-height:1.6;margin-bottom:12px;">${p.reason}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div><div style="font-size:15px;font-weight:600;color:#c8922a;">${p.budgetLabel}</div></div>
            <a href="${p.buyLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Shop at The Warehouse →</a>
          </div>
          <div style="margin-top:10px;font-size:12px;color:#9a8878;">
            Also search: ${p.stores.map(s=>`<a href="${s.link}" style="color:#c8922a;">${s.name}</a>`).join(' · ')}
          </div>
        </div>`).join('');

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
        body: JSON.stringify({
          sender: { name: 'ShopGenieAI', email: 'saym577@gmail.com' },
          to: [{ email }],
          subject: '🧞 Your 3 personalised gift picks from ShopGenieAI',
          htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#faf6f0;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:36px;">
    <div style="font-size:28px;font-weight:900;color:#3d2b1a;">🧞 ShopGenieAI</div>
    <div style="font-size:13px;color:#9a8878;font-style:italic;">Your wish is my gift</div>
  </div>
  <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">
    <div style="font-size:22px;font-weight:700;color:#3d2b1a;margin-bottom:10px;">Here are your 3 gift picks! 🎁</div>
    <div style="font-size:14px;color:#7a6855;">For <strong>${whoFor}</strong> · <strong>${occasion}</strong> · ${budgetLabel}</div>
  </div>
  <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">${rows}</div>
  <div style="background:#fff9f0;border-radius:12px;padding:16px 20px;border:1px solid #e8ddd0;margin-bottom:24px;font-size:12px;color:#9a8878;line-height:1.6;">
    <strong style="color:#3d2b1a;">📋 Note:</strong> The Warehouse link searches NZ stock. Google Shopping chips show prices across multiple NZ retailers.
  </div>
  <div style="text-align:center;margin-bottom:32px;">
    <a href="https://shopgenieai.com" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">Find More Gifts 🧞</a>
  </div>
  <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">Kiwi Made 🇳🇿 · ShopGenieAI</div>
</div></body></html>`
        })
      });
    } catch(e) { console.error('Brevo error:', e); }
  }

  return res.status(200).json({ products: enriched });
}
