// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — recommend.js
// Serper removed entirely. Architecture: Claude → Retailer Routing → Brave Images
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

// ── RETAILER SEARCH URL MAP ───────────────────────────────────────────────────
// Every known NZ retailer with their correct search URL pattern
// This is the ONLY source of links — no raw URLs ever used
const RETAILER_SEARCH_PATTERNS = {
  'thewarehouse':     (q) => `https://www.thewarehouse.co.nz/search?q=${encodeURIComponent(q)}`,
  'farmers':          (q) => `https://www.farmers.co.nz/search?q=${encodeURIComponent(q)}`,
  'briscoes':         (q) => `https://www.briscoes.co.nz/search?q=${encodeURIComponent(q)}`,
  'noelleeming':      (q) => `https://www.noelleeming.co.nz/search?q=${encodeURIComponent(q)}`,
  'pbtech':           (q) => `https://www.pbtech.co.nz/search?pg=1&stype=1&q=${encodeURIComponent(q)}`,
  'mightyape':        (q) => `https://www.mightyape.co.nz/search?q=${encodeURIComponent(q)}`,
  'harveynorman':     (q) => `https://www.harveynorman.co.nz/search?q=${encodeURIComponent(q)}`,
  'jbhifi':           (q) => `https://www.jbhifi.co.nz/search?q=${encodeURIComponent(q)}`,
  'kmart':            (q) => `https://www.kmart.co.nz/search?q=${encodeURIComponent(q)}`,
  'stirlingsports':   (q) => `https://www.stirlingsports.co.nz/search?q=${encodeURIComponent(q)}`,
  'rebelsport':       (q) => `https://www.rebelsport.co.nz/search?q=${encodeURIComponent(q)}`,
  'torpedo7':         (q) => `https://www.torpedo7.co.nz/search?q=${encodeURIComponent(q)}`,
  'bunnings':         (q) => `https://www.bunnings.co.nz/search/products?q=${encodeURIComponent(q)}`,
  'mitre10':          (q) => `https://www.mitre10.co.nz/search?q=${encodeURIComponent(q)}`,
  'toolshed':         (q) => `https://www.thetoolshed.co.nz/search?q=${encodeURIComponent(q)}`,
  'hallensteins':     (q) => `https://www.hallensteins.com/search?q=${encodeURIComponent(q)}`,
  'glassons':         (q) => `https://www.glassons.com/search?q=${encodeURIComponent(q)}`,
  'chemistwarehouse': (q) => `https://www.chemistwarehouse.co.nz/search?q=${encodeURIComponent(q)}`,
  'whitcoulls':       (q) => `https://www.whitcoulls.co.nz/search?q=${encodeURIComponent(q)}`,
  'paperplus':        (q) => `https://www.paperplus.co.nz/search?q=${encodeURIComponent(q)}`,
  'huntingandfishing':(q) => `https://www.huntingandfishing.co.nz/search?q=${encodeURIComponent(q)}`,
  'supercheap':       (q) => `https://www.supercheapauto.co.nz/search?q=${encodeURIComponent(q)}`,
  'repco':            (q) => `https://www.repco.co.nz/search?q=${encodeURIComponent(q)}`,
  'countdown':        (q) => `https://www.countdown.co.nz/search?q=${encodeURIComponent(q)}`,
  'luggage':          (q) => `https://www.luggage.co.nz/search?q=${encodeURIComponent(q)}`,
  'strandbags':       (q) => `https://www.strandbags.co.nz/search?q=${encodeURIComponent(q)}`,
  'numberoneshoes':   (q) => `https://www.numberoneshoes.co.nz/search?q=${encodeURIComponent(q)}`,
  'smithscity':       (q) => `https://www.smithscity.co.nz/search?q=${encodeURIComponent(q)}`,
  'themarket':        (q) => `https://www.themarket.com/search?q=${encodeURIComponent(q)}`,
  'furtherfaster':    (q) => `https://www.furtherfaster.co.nz/search?q=${encodeURIComponent(q)}`,
};

// ── SMART RETAILER ROUTING ────────────────────────────────────────────────────
// Maps Claude's product type keywords to ordered retailer lists
// First retailer = buy button, rest = chips
// Ordered by: most relevant first, most stocked, best NZ presence

const RETAILER_ROUTES = {
  // Electronics, Audio, Tech, Computing
  electronics: ['noelleeming', 'jbhifi', 'pbtech', 'harveynorman', 'mightyape'],
  audio:       ['noelleeming', 'jbhifi', 'pbtech', 'harveynorman', 'mightyape'],
  tech:        ['noelleeming', 'pbtech', 'jbhifi', 'harveynorman', 'mightyape'],
  gaming:      ['mightyape', 'jbhifi', 'pbtech', 'noelleeming', 'thewarehouse'],
  camera:      ['noelleeming', 'jbhifi', 'pbtech', 'harveynorman'],
  // Sports, Fitness, Outdoors
  sports:      ['stirlingsports', 'rebelsport', 'torpedo7', 'huntingandfishing', 'farmers'],
  fitness:     ['stirlingsports', 'rebelsport', 'torpedo7', 'farmers', 'thewarehouse'],
  outdoor:     ['torpedo7', 'huntingandfishing', 'stirlingsports', 'rebelsport'],
  running:     ['stirlingsports', 'rebelsport', 'numberoneshoes', 'torpedo7'],
  cycling:     ['torpedo7', 'huntingandfishing', 'stirlingsports', 'rebelsport'],
  // Kitchen, Home, Appliances
  kitchen:     ['briscoes', 'farmers', 'harveynorman', 'thewarehouse', 'noelleeming'],
  home:        ['briscoes', 'farmers', 'thewarehouse', 'kmart', 'harveynorman'],
  appliance:   ['harveynorman', 'noelleeming', 'briscoes', 'farmers', 'thewarehouse'],
  // Tools, Hardware, Automotive
  tools:       ['bunnings', 'mitre10', 'toolshed', 'supercheap', 'repco'],
  hardware:    ['bunnings', 'mitre10', 'toolshed', 'supercheap'],
  automotive:  ['supercheap', 'repco', 'mitre10', 'bunnings'],
  // Fashion, Clothing, Footwear
  fashion:     ['glassons', 'hallensteins', 'farmers', 'thewarehouse', 'kmart'],
  clothing:    ['glassons', 'hallensteins', 'farmers', 'thewarehouse', 'kmart'],
  footwear:    ['numberoneshoes', 'stirlingsports', 'farmers', 'thewarehouse'],
  // Health, Beauty, Personal Care
  health:      ['chemistwarehouse', 'farmers', 'countdown', 'thewarehouse'],
  beauty:      ['chemistwarehouse', 'farmers', 'thewarehouse', 'kmart'],
  grooming:    ['chemistwarehouse', 'farmers', 'thewarehouse', 'kmart'],
  // Books, Stationery, Arts
  books:       ['whitcoulls', 'paperplus', 'thewarehouse', 'mightyape'],
  stationery:  ['whitcoulls', 'paperplus', 'thewarehouse', 'kmart'],
  // Travel, Luggage, Bags
  travel:      ['luggage', 'strandbags', 'farmers', 'torpedo7'],
  bags:        ['strandbags', 'luggage', 'farmers', 'thewarehouse'],
  // Toys, Kids, Baby
  toys:        ['thewarehouse', 'kmart', 'mightyape', 'farmers'],
  kids:        ['thewarehouse', 'kmart', 'farmers', 'countdown'],
  baby:        ['farmers', 'thewarehouse', 'kmart', 'countdown'],
  // Food, Drink, Grocery
  food:        ['countdown', 'thewarehouse', 'farmers', 'kmart'],
  // Default — general gift — large diverse pool, hashed per product
  general:     ['thewarehouse', 'farmers', 'briscoes', 'kmart', 'mightyape',
                 'harveynorman', 'noelleeming', 'whitcoulls', 'paperplus',
                 'chemistwarehouse', 'smithscity', 'themarket'],
};

// Detect which route to use based on Claude's product type + name
function detectRoute(name, type) {
  const s = `${name} ${type}`.toLowerCase();

  // Specific keyword matches — ordered from most specific to least
  if (/drill|saw|grinder|sander|compressor|nail gun|jigsaw|impact wrench|heat gun|power tool|waterblaster|pressure washer/.test(s)) return 'tools';
  if (/wrench|socket|hardware|mitre|bunnings/.test(s)) return 'hardware';
  if (/car |auto|vehicle|tyre|wheel|motor oil|wiper/.test(s)) return 'automotive';
  if (/headphone|earphone|earbud|speaker|soundbar|amplifier|turntable|audio/.test(s)) return 'audio';
  if (/laptop|computer|tablet|monitor|keyboard|mouse|printer|router|modem|hard drive|ssd|usb|webcam/.test(s)) return 'tech';
  if (/phone|smartwatch|smart watch|wearable|fitness tracker|tv |television|projector|camera|drone/.test(s)) return 'electronics';
  if (/game|gaming|console|playstation|xbox|nintendo|controller/.test(s)) return 'gaming';
  if (/camera|lens|tripod|photography/.test(s)) return 'camera';
  if (/running|marathon|jog/.test(s)) return 'running';
  if (/cycling|bike|bicycle/.test(s)) return 'cycling';
  if (/gym|workout|dumbbell|barbell|weight|foam roller|yoga|pilates|resistance band|protein/.test(s)) return 'fitness';
  if (/hiking|camping|tent|sleeping bag|backpack outdoor|kayak|fishing|hunting|surf|ski|snowboard/.test(s)) return 'outdoor';
  if (/sport|football|rugby|cricket|tennis|basketball|volleyball|hockey|swimming|swim/.test(s)) return 'sports';
  if (/blender|toaster|kettle|coffee|air fryer|microwave|knife|cutting board|cookware|pot |pan |bakeware/.test(s)) return 'kitchen';
  if (/appliance|washing machine|dryer|dishwasher|vacuum|iron|heater|fan |air con/.test(s)) return 'appliance';
  if (/candle|diffuser|cushion|throw|blanket|frame|vase|lamp|rug|linen|towel|home decor/.test(s)) return 'home';
  if (/perfume|fragrance|cologne|skincare|makeup|lipstick|mascara|foundation|moisturiser/.test(s)) return 'beauty';
  if (/shaver|razor|trimmer|hair dryer|straightener|curler/.test(s)) return 'grooming';
  if (/supplement|vitamin|protein powder|medicine|pharmacy|health/.test(s)) return 'health';
  if (/shoes|sneakers|boots|sandals|footwear/.test(s)) return 'footwear';
  if (/shirt|pants|jeans|dress|jacket|hoodie|jumper|coat|swimwear|activewear|socks|underwear/.test(s)) return 'clothing';
  if (/fashion|jewellery|jewelry|watch |necklace|bracelet|ring |earring|accessory/.test(s)) return 'fashion';
  if (/book|novel|cookbook|diary|journal|planner/.test(s)) return 'books';
  if (/pen |pencil|stationery|notebook|art supply|paint|drawing/.test(s)) return 'stationery';
  if (/luggage|suitcase|travel/.test(s)) return 'travel';
  if (/bag|handbag|wallet|purse|backpack/.test(s)) return 'bags';
  if (/toy|lego|puzzle|board game|kids|children|baby|nappy|pram/.test(s)) return 'toys';
  if (/food|snack|chocolate|coffee beans|tea |spice|condiment/.test(s)) return 'food';

  return 'general';
}

// Get ordered retailer list for a product
// For general products, use a deterministic hash of the product name
// so the same product always gets the same retailers, but different products vary
function getRetailers(name, type, count = 4) {
  const route = detectRoute(name, type);
  let list = RETAILER_ROUTES[route] || RETAILER_ROUTES['general'];

  if (route === 'general') {
    // Hash product name to pick a consistent starting offset
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const offset = hash % list.length;
    // Rotate list from offset point so different products get different retailers
    list = [...list.slice(offset), ...list.slice(0, offset)];
  }

  return list.slice(0, count);
}

// Build all links for a product — guaranteed search URLs, never raw links
function buildProductLinks(name, type, searchQuery) {
  const retailers = getRetailers(name, type, 5);
  const links = retailers.map(key => ({
    name: key === 'thewarehouse' ? 'The Warehouse'
        : key === 'noelleeming' ? 'Noel Leeming'
        : key === 'jbhifi' ? 'JB Hi-Fi'
        : key === 'pbtech' ? 'PB Tech'
        : key === 'harveynorman' ? 'Harvey Norman'
        : key === 'mightyape' ? 'Mighty Ape'
        : key === 'stirlingsports' ? 'Stirling Sports'
        : key === 'rebelsport' ? 'Rebel Sport'
        : key === 'huntingandfishing' ? 'Hunting & Fishing'
        : key === 'numberoneshoes' ? 'Number One Shoes'
        : key === 'chemistwarehouse' ? 'Chemist Warehouse'
        : key === 'toolshed' ? 'The Tool Shed'
        : key === 'supercheap' ? 'Supercheap Auto'
        : key === 'themarket' ? 'The Market'
        : key === 'furtherfaster' ? 'Further Faster'
        : key === 'smithscity' ? 'Smiths City'
        : key.charAt(0).toUpperCase() + key.slice(1),
    url: RETAILER_SEARCH_PATTERNS[key](searchQuery),
  }));

  return {
    buyLink:   links[0]?.url || null,
    storeName: links[0]?.name || null,
    stores:    links.slice(1).map(l => ({ name: l.name, link: l.url })),
  };
}

// ── BRAVE IMAGE SEARCH ────────────────────────────────────────────────────────
async function getBraveImage(searchQuery, braveKey) {
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(searchQuery + ' product')}&count=3&safesearch=strict`,
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
    // Pick first image that isn't a logo or tiny thumbnail
    for (const r of results) {
      const url = r?.thumbnail?.src || r?.url || null;
      if (url && !url.includes('logo') && !url.includes('icon')) return url;
    }
    return results[0]?.thumbnail?.src || null;
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
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'Missing API keys' });

  const tier = getTier(budgetTier || 'medium');
  const { label: budgetLabel, hint: budgetHint, min: budgetMin, max: budgetMax } = tier;
  const budgetInstruction = budgetTier === 'lotto'
    ? 'Products MUST be premium items priced NZ$500 or above.'
    : `Products MUST be priced between NZ$${budgetMin} and NZ$${budgetMax}. Do not recommend anything outside this range.`;

  const refreshVariations = [
    '',
    'Find 3 DIFFERENT product categories — same vibe, person and interests.',
    'Suggest ALTERNATIVE ideas — different from previous but same vibe and interests.',
    'Focus on NICHE or less obvious products matching the same vibe and interests.',
    'Suggest PREMIUM best-in-class versions matching the same vibe and interests.',
    'Think EXPERIENTIAL or lifestyle products — same vibe and interests.',
  ];
  const refreshInstruction = refreshSeed > 0
    ? (refreshVariations[refreshSeed] || refreshVariations[refreshVariations.length - 1])
    : '';

  // ── STEP 1: Claude Haiku ────────────────────────────────────────────────────
  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine for the New Zealand retail market.

Recommend exactly 3 products available in NZ stores in 2025/2026.

RULES:
- Exactly 3 products, single items only — NO bundles or combo packs
- GENERIC product names ONLY — real names customers type into retailer search bars
  GOOD: "Foam Roller", "Insulated Water Bottle", "Wireless Earbuds", "RFID Wallet"
  BAD: "Advanced Compression Recovery Device", invented compound names
- BUDGET HARD RULE: ${budgetInstruction} Non-negotiable.
- Every product MUST match the stated vibe
- Every product MUST be relevant to stated interests

VARIETY RULE — never recommend the same product type twice:
- If recommending water bottles, vary: insulated bottle vs sports bottle vs travel bottle
- If recommending wallets, vary: slim card holder vs leather bifold vs travel wallet
- Never repeat the same angle twice in one set of 3

PRODUCT TYPE FIELD — this is critical for routing:
Use ONE of these exact type values so products reach the right retailers:
electronics, audio, tech, gaming, camera, sports, fitness, outdoor, running, cycling,
kitchen, home, appliance, tools, hardware, automotive, fashion, clothing, footwear,
health, beauty, grooming, books, stationery, travel, bags, toys, kids, baby, food, general

- Wallets: type = "fashion", ALWAYS RFID-blocking
- Fragrance/perfume: type = "beauty"  
- Sport watches: type = "electronics"
- Running shoes: type = "running"
- NEVER recommend alcohol
- searchQuery: 2-4 words, exactly what a customer types into a retailer search bar, no brand names
- Return ONLY valid JSON, no preamble, no markdown

OUTPUT FORMAT:
{
  "products": [
    {
      "name": "Foam Roller",
      "type": "fitness",
      "reason": "1-2 sentences why this is perfect for this person",
      "searchQuery": "foam roller"
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
${refreshInstruction ? `\nVariety instruction: ${refreshInstruction}` : ''}
${excludeProducts.length > 0 ? `\nDO NOT recommend these — already shown: ${excludeProducts.join(', ')}` : ''}

Return the product type field using ONLY the exact type values listed in the rules.`;

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

    // Validate product names — reject invented compound names
    products = products.map(p => {
      const words = (p.name || '').trim().split(/\s+/);
      const invented = [
        /compression.*recovery/i, /advanced.*therapeutic/i,
        /smart.*wellness.*pro/i, /precision.*athletic/i,
      ];
      if (words.length > 7 || invented.some(r => r.test(p.name))) {
        p.name = p.searchQuery.split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      return p;
    });

  } catch (err) {
    console.error('Claude error:', err);
    return res.status(500).json({ error: `AI recommendation failed: ${err.message}` });
  }

  // ── STEP 2: Build links + fetch images in parallel ────────────────────────
  // No Serper. Links come from our known retailer map.
  // Images come from Brave Search API.
  const enriched = await Promise.all(products.map(async (product) => {
    const { buyLink, storeName, stores } = buildProductLinks(
      product.name,
      product.type,
      product.searchQuery
    );

    // Brave image search — parallel, non-blocking
    const imageUrl = BRAVE_KEY
      ? await getBraveImage(product.searchQuery, BRAVE_KEY)
      : null;

    return {
      name:          product.name,
      type:          product.type,
      reason:        product.reason,
      budgetLabel,
      bestStoreName: storeName,
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
            <div>
              <div style="font-size:15px;font-weight:600;color:#c8922a;">${p.budgetLabel}</div>
              ${p.bestStoreName ? `<div style="font-size:12px;color:#9a8878;">Best match at ${p.bestStoreName}</div>` : ''}
            </div>
            ${p.buyLink ? `<a href="${p.buyLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Shop This Gift →</a>` : ''}
          </div>
          ${p.stores?.length ? `<div style="margin-top:10px;font-size:12px;color:#9a8878;">Also at: ${p.stores.map(s=>`<a href="${s.link}" style="color:#c8922a;">${s.name}</a>`).join(' · ')}</div>` : ''}
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
    <strong style="color:#3d2b1a;">📋 Note:</strong> Links take you to NZ retailer search pages — browse and buy at your convenience!
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
