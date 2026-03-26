// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — recommend.js
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
// Maps the quiz tier value to a numeric range for searching
// Funny labels live in index.html quiz — backend just needs the ranges
const BUDGET_TIERS = {
  'low':    { min: 0,   max: 50,   label: 'Low Budget 🤑',              hint: 'under $50'   },
  'medium': { min: 50,  max: 150,  label: 'Medium Budget 💸',           hint: 'under $150'  },
  'high':   { min: 150, max: 300,  label: 'High Budget 🎯',             hint: 'under $300'  },
  'bigwed': { min: 300, max: 400,  label: 'Big Wednesday Spender 🎰',   hint: 'under $400'  },
  'lotto':  { min: 500, max: 9999, label: 'OMG You Won Lotto 🎉',       hint: 'over $500'   },
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
  'gun', 'guns', 'ammo', 'ammunition', 'firearm', 'weapon',
  'porn', 'pornography', 'sex toy', 'dildo', 'vibrator', 'xxx',
  'drugs', 'cocaine', 'meth', 'cannabis', 'marijuana',
  'explosive', 'bomb', 'grenade',
  'alcohol', 'wine', 'beer', 'whisky', 'whiskey', 'vodka', 'gin',
  'rum', 'spirits', 'bourbon', 'champagne', 'prosecco', 'liquor',
  'booze', 'craft beer', 'brewery', 'winery', 'cider'
];

// ── BLACKLISTED DOMAINS ───────────────────────────────────────────────────────
const BLACKLISTED_DOMAINS = [
  // Junk marketplaces
  'temu', 'aliexpress', 'wish.com', 'dhgate', 'banggood', 'shein',
  'ebay', 'amazon.com', 'alibaba', 'lightinthebox', 'joom',
  // AU only
  '.com.au', 'addictedtoaudio', 'sydneytools',
  // Poor retailers
  'dicksmith', 'kogan', 'theiconic', 'trademe', 'lego.com',
  'tommy.com', 'farfetch', 'net-a-porter', 'trendhim', 'archipro',
  // Overseas companies with NZ-looking domains
  'red-equipment.co.nz', 'husqvarnadealers.co.nz', 'aladdins.husqvarnadealers',
  // Price comparison
  'pricespy', 'getpricelist', 'shopbot', 'staticice', 'myshopping',
  'getprice', 'shopmania', 'twenga',
  // Media & news
  'nzherald', 'stuff.co.nz', 'newshub', 'rnz.co.nz', 'tvnz',
  // B2B / trade
  'southernhospitality', 'temperature.co.nz', 'catering.co.nz',
  'nzrestaurants', 'hirepool', 'tradetools', 'industrialtools',
  // Wool/craft — not sports
  'woolcompany', 'thewoolcompany', 'cosytoes', 'merinoandmore',
  // Brand direct — AUDIO/ENTERTAINMENT
  'samsung.com', 'sony.co.nz', 'lg.com', 'panasonic.com', 'philips.co.nz',
  'tcl.com', 'hisense.co.nz', 'bose.co.nz', 'bose.com', 'sennheiser',
  'jbl.co.nz', 'ultimateears.com', 'sonos.com', 'nz.yamaha.com',
  'bang-olufsen.com', 'denon.com', 'marantz.com', 'klipsch.com', 'audio-technica.com',
  // Brand direct — COMPUTING
  'apple.com', 'store.google.com', 'microsoft.com', 'hp.com', 'dell.com',
  'lenovo.com', 'asus.com', 'acer.com', 'logitech.com', 'razer.com',
  'nintendo.co.nz', 'playstation.com', 'xbox.com', 'garmin.com',
  'fitbit.com', 'gopro.com', 'nikon.co.nz', 'canon.co.nz',
  // Brand direct — KITCHEN
  'fisherpaykel.com', 'breville.com', 'delonghi.com', 'nespresso.com',
  'kenwoodworld.com', 'kitchenaid.co.nz', 'sunbeam.co.nz', 'nutribullet.co.nz',
  'ninjakitchen.co.nz', 'tefal.co.nz', 'cuisinart.co.nz', 'smeg.com',
  'miele.co.nz', 'bosch-home.co.nz', 'haier.co.nz', 'westinghouse.co.nz',
  'beko.com', 'asko.com', 'morphyrichards.co.nz', 'russellhobbs.co.nz',
  'sodastream.co.nz', 'instantpot.co.nz',
  // Brand direct — CLEANING
  'dyson.co.nz', 'dyson.com', 'sharkclean.co.nz', 'roborock.co.nz',
  'ecovacs.com', 'irobot.co.nz', 'vax.co.nz', 'bissell.co.nz',
  'blackanddecker.co.nz', 'mitsubishi-electric.co.nz', 'daikin.co.nz',
  'fujitsugeneral.co.nz',
  // Brand direct — BEAUTY
  'ghdhair.com', 'cloudninehair.co.nz', 'vssassoon.co.nz',
  'remington.co.nz', 'braun.com', 'oralb.co.nz',
  // Brand direct — SPORTS
  'nike.com', 'adidas.co.nz', 'adidas.com', 'nike.co.nz', 'nz.puma.com',
  'newbalance.co.nz', 'underarmour.co.nz', 'asics.com', 'lululemon.co.nz',
  'kathmandu.co.nz', 'macpac.co.nz', 'icebreaker.com', 'allbirds.co.nz',
  'converse.co.nz', 'vans.co.nz', 'timberland.co.nz', 'thenorthface.co.nz',
  'salomon.co.nz', 'brooksrunning.co.nz', 'oakley.com', 'ray-ban.com',
  // Brand direct — TOOLS
  'tesla.com', 'ryobi.co.nz', 'makita.co.nz', 'dewalt.co.nz', 'milwaukeetool.co.nz',
  // Medical/health info
  'bauerfeind',
];

// ── BLACKLISTED URL PATTERNS ──────────────────────────────────────────────────
// Blocks content/blog/review pages — not product or category pages
const BLACKLISTED_URL_PATTERNS = [
  '/blog/', '/guide/', '/guides/', '/news/', '/article/', '/articles/',
  '/playbook/', '/editorial/', '/story/', '/stories/',
  '/advice/', '/tips/', '/how-to/', '/learn/', '/education/',
  // Expanded: review/comparison content patterns
  '/best-', '/top-10', '/top-5', '/review/', '/reviews/',
  '/buying-guide', '/buyers-guide', '/vs-', '/compared',
  '/picks/', '/roundup/', '/tested/', '/ranked/',
];

function isBlacklisted(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (BLACKLISTED_DOMAINS.some(d => lower.includes(d))) return true;
  if (BLACKLISTED_URL_PATTERNS.some(p => lower.includes(p))) return true;
  return false;
}

// ── RETAILER SEARCH URL MAP ───────────────────────────────────────────────────
// FIX: PB Tech uses /search?pg=1&stype=1&q= format for reliable results
const RETAILER_SEARCH_PATTERNS = {
  'thewarehouse':     (q) => `https://www.thewarehouse.co.nz/search?q=${encodeURIComponent(q)}`,
  'warehouse':        (q) => `https://www.thewarehouse.co.nz/search?q=${encodeURIComponent(q)}`,
  'farmers':          (q) => `https://www.farmers.co.nz/search?q=${encodeURIComponent(q)}`,
  'briscoes':         (q) => `https://www.briscoes.co.nz/search?q=${encodeURIComponent(q)}`,
  'noelleeming':      (q) => `https://www.noelleeming.co.nz/search?q=${encodeURIComponent(q)}`,
  // FIX: PB Tech search URL format — stype=1 forces keyword search, avoids length errors
  'pbtech':           (q) => `https://www.pbtech.co.nz/search?pg=1&stype=1&q=${encodeURIComponent(q)}`,
  'mightyape':        (q) => `https://www.mightyape.co.nz/search?q=${encodeURIComponent(q)}`,
  'harveynorman':     (q) => `https://www.harveynorman.co.nz/search?q=${encodeURIComponent(q)}`,
  'jbhifi':           (q) => `https://www.jbhifi.co.nz/search?q=${encodeURIComponent(q)}`,
  'stirlingsports':   (q) => `https://www.stirlingsports.co.nz/search?q=${encodeURIComponent(q)}`,
  'rebelsport':       (q) => `https://www.rebelsport.co.nz/search?q=${encodeURIComponent(q)}`,
  'bunnings':         (q) => `https://www.bunnings.co.nz/search/products?q=${encodeURIComponent(q)}`,
  'mitre10':          (q) => `https://www.mitre10.co.nz/search?q=${encodeURIComponent(q)}`,
  'torpedo7':         (q) => `https://www.torpedo7.co.nz/search?q=${encodeURIComponent(q)}`,
  'hallensteins':     (q) => `https://www.hallensteins.com/search?q=${encodeURIComponent(q)}`,
  'glassons':         (q) => `https://www.glassons.com/search?q=${encodeURIComponent(q)}`,
  'chemistwarehouse': (q) => `https://www.chemistwarehouse.co.nz/search?q=${encodeURIComponent(q)}`,
  'countdown':        (q) => `https://www.countdown.co.nz/search?q=${encodeURIComponent(q)}`,
  'supercheap':       (q) => `https://www.supercheapauto.co.nz/search?q=${encodeURIComponent(q)}`,
  'repco':            (q) => `https://www.repco.co.nz/search?q=${encodeURIComponent(q)}`,
  'toolshed':         (q) => `https://www.thetoolshed.co.nz/search?q=${encodeURIComponent(q)}`,
  'whitcoulls':       (q) => `https://www.whitcoulls.co.nz/search?q=${encodeURIComponent(q)}`,
  'paperplus':        (q) => `https://www.paperplus.co.nz/search?q=${encodeURIComponent(q)}`,
  'huntingandfishing':(q) => `https://www.huntingandfishing.co.nz/search?q=${encodeURIComponent(q)}`,
  'luggage':          (q) => `https://www.luggage.co.nz/search?q=${encodeURIComponent(q)}`,
  'strandbags':       (q) => `https://www.strandbags.co.nz/search?q=${encodeURIComponent(q)}`,
  'smithscity':       (q) => `https://www.smithscity.co.nz/search?q=${encodeURIComponent(q)}`,
  'themarket':        (q) => `https://www.themarket.com/search?q=${encodeURIComponent(q)}`,
  'numberoneshoes':   (q) => `https://www.numberoneshoes.co.nz/search?q=${encodeURIComponent(q)}`,
  'furtherfaster':    (q) => `https://www.furtherfaster.co.nz/search?q=${encodeURIComponent(q)}`,
  'kmart':            (q) => `https://www.kmart.co.nz/search?q=${encodeURIComponent(q)}`,
};

function getRetailerSearchUrl(domain, productName) {
  const key = Object.keys(RETAILER_SEARCH_PATTERNS).find(k => domain.includes(k));
  if (key) return RETAILER_SEARCH_PATTERNS[key](productName);
  return null;
}

// ── RETAILER ROUTING ──────────────────────────────────────────────────────────
const POWER_TOOL_RETAILERS = [
  'mitre10', 'bunnings', 'toolshed', 'hammerhardware',
  'repco', 'supercheap', 'stihlshop', 'riequip', 'tradetested',
];

// FIX: Sports retailers stay in pool for ALL products (they sell electronics too)
// They only get PROMOTED (via site hints) for sports products
// This stops them being blocked for earbuds/watches while still being found for socks/gear
const SPORTS_RETAILER_DOMAINS = [
  'stirlingsports', 'rebelsport', 'torpedo7', 'huntingandfishing',
  'furtherfaster', 'runners', 'numberoneshoes',
];

function isPowerToolRetailer(url) {
  return POWER_TOOL_RETAILERS.some(r => url.toLowerCase().includes(r));
}

function isHardwareTool(name, type) {
  const s = `${name} ${type}`.toLowerCase();
  return ['compressor','drill','saw','grinder','sander','pressure washer',
    'waterblaster','water blaster','air pump','cordless','power tool',
    'nail gun','jigsaw','circular saw','angle grinder','air compressor',
    'impact wrench','heat gun','rotary tool'].some(k => s.includes(k));
}

function isSportsProduct(name, type) {
  const s = `${name} ${type}`.toLowerCase();
  return ['socks','jersey','shorts','leggings','sports bra','activewear',
    'training top','running shoes','athletic','gym wear','compression wear',
    'moisture wicking','workout gear','football','rugby','cricket','basketball',
    'tennis racket','swim','cycling'].some(k => s.includes(k));
}

// ── PRODUCT NAME VALIDATION ───────────────────────────────────────────────────
function isValidProductName(name) {
  if (!name) return false;
  const words = name.trim().split(/\s+/);
  if (words.length > 7) return false;
  const inventedPatterns = [
    /compression.*recovery.*roller/i,
    /muscle.*recovery.*compression/i,
    /advanced.*therapeutic/i,
    /smart.*wellness.*tracker.*pro/i,
    /precision.*athletic.*performance/i,
  ];
  return !inventedPatterns.some(p => p.test(name));
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getMatchableDomain(url) {
  try {
    return new URL(url).hostname
      .replace('www.','').replace('.co.nz','').replace('.com','').replace('.co','')
      .toLowerCase();
  } catch(e) { return ''; }
}

function isWarehouse(url) {
  if (!url) return false;
  const l = url.toLowerCase();
  return l.includes('thewarehouse') || l.includes('warehouse.co.nz');
}

function extractProductFromSnippet(text) {
  if (!text) return null;
  const patterns = [
    /best overall[:\s]+([A-Z][^,.\n]{5,50})/i,
    /our top pick[:\s]+([A-Z][^,.\n]{5,50})/i,
    /#1[:\s]+([A-Z][^,.\n]{5,50})/i,
    /top pick[:\s]+([A-Z][^,.\n]{5,50})/i,
    /editor.s choice[:\s]+([A-Z][^,.\n]{5,50})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
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
  const SERPER_KEY    = process.env.SERPER_API_KEY;
  const BREVO_KEY     = process.env.BREVO_API_KEY;
  if (!ANTHROPIC_KEY || !SERPER_KEY) return res.status(500).json({ error: 'Missing API keys' });

  // Resolve budget tier
  const tier = getTier(budgetTier || 'medium');
  const { min: budgetMin, max: budgetMax, label: budgetLabel, hint: budgetHint } = tier;
  const budgetInstruction = budgetTier === 'lotto'
    ? 'Products MUST be premium items priced NZ$500 or above.'
    : `Products MUST be priced between NZ$${budgetMin} and NZ$${budgetMax}. Do not recommend anything outside this range.`;

  const refreshVariations = [
    '',
    'Find 3 DIFFERENT product categories — same vibe, person and interests.',
    'Suggest ALTERNATIVE ideas — different from previous but same vibe and interests.',
    'Focus on NICHE products matching the same vibe and interests.',
    'Suggest PREMIUM best-in-class versions matching the same vibe and interests.',
    'Think EXPERIENTIAL or lifestyle products — same vibe and interests.',
  ];
  const refreshInstruction = refreshSeed > 0
    ? (refreshVariations[refreshSeed] || refreshVariations[refreshVariations.length - 1])
    : '';

  // ── STEP 1: Claude Haiku ────────────────────────────────────────────────────
  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine for the New Zealand retail market.

Recommend exactly 3 products available in NZ stores in 2025/2026.

STRICT RULES:
- Exactly 3 products, single items only — NO bundles or combo packs
- GENERIC product names ONLY — use names customers actually type into retailer search bars
  GOOD: "Foam Roller", "Insulated Water Bottle", "Sports Bra", "RFID Wallet", "Wireless Earbuds"
  BAD: "Compression Muscle Recovery Roller", "Advanced Hydration Vessel"
- BUDGET HARD RULE: ${budgetInstruction} Non-negotiable.
- VIBE RULE: Every recommendation must match the stated vibe
- INTERESTS RULE: Every recommendation must be relevant to stated interests

BRAND VARIETY RULE — if recommending similar products, vary the searchQuery brand angle:
- Water bottles: hydro flask style / camelbak style / stanley style / budget insulated
- Wallets: slim card holder / bifold leather / travel wallet / zip-around
Never use the same brand angle twice

RETAILER ROUTING:
- Power tools, drills, compressors → Bunnings, Mitre 10, The Tool Shed only
- Electronics, audio, tech → Noel Leeming, PB Tech, JB Hi-Fi, Harvey Norman
- Sports apparel (socks, activewear, running shoes) → Stirling Sports, Rebel Sport
- General gifts → The Warehouse, Farmers, Briscoes, Kmart

- Wallets: ALWAYS RFID-blocking
- Fragrance: Chemist Warehouse only
- NEVER recommend alcohol
- searchQuery: exactly what a customer types into a retailer search (2-4 words, no brand names)
- reviewQuery: "best [product] NZ 2025 ${budgetHint}"
- Return ONLY valid JSON, no preamble, no markdown

OUTPUT FORMAT:
{
  "products": [
    {
      "name": "Foam Roller",
      "type": "Fitness Recovery",
      "reason": "1-2 sentences why this is perfect",
      "searchQuery": "foam roller",
      "reviewQuery": "best foam roller NZ 2025 under $50"
    }
  ]
}`;

  const userPrompt = `Find 3 gift recommendations:
- Shopping for: ${shoppingFor}
- Who: ${whoFor}
- Vibe: ${vibe}
- Budget tier: ${budgetLabel} (${budgetInstruction})
- Occasion: ${occasion}
- Interests/hobbies: ${interests || 'Not specified'}
${refreshInstruction ? `\nVariety (same vibe/person/interests): ${refreshInstruction}` : ''}
${excludeProducts.length > 0 ? `\nDO NOT recommend: ${excludeProducts.join(', ')}. Pick completely different types.` : ''}

Use REAL product names customers search for. Vibe is "${vibe}" — every product must match.`;

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

    // Validate product names
    products = products.map(p => {
      if (!isValidProductName(p.name)) {
        p.name = p.searchQuery.split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      return p;
    });
  } catch (err) {
    console.error('Claude error:', err);
    return res.status(500).json({ error: `AI failed: ${err.message}` });
  }

  // ── STEP 2: Serper enrichment ───────────────────────────────────────────────
  const negatives = [
    '-site:nzherald.co.nz','-site:stuff.co.nz','-site:rnz.co.nz',
    '-site:temu.com','-site:aliexpress.com','-site:pricespy.co.nz',
    '-site:archipro.co.nz','-site:red-equipment.co.nz'
  ].join(' ');

  const enriched = await Promise.all(products.map(async (product) => {
    try {
      const searchTerm  = product.searchQuery || product.name;
      const reviewQuery = product.reviewQuery  || `best ${searchTerm} NZ 2025 ${budgetHint}`;
      const isToolProd  = isHardwareTool(product.name, product.type);
      const isSportProd = isSportsProduct(product.name, product.type);

      // Call A: Review search
      let specificProduct = null;
      try {
        const reviewRes  = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: `${reviewQuery} ${negatives}`, gl: 'nz', hl: 'en', num: 5 })
        });
        const reviewData = reviewRes.ok ? await reviewRes.json() : {};
        for (const r of (reviewData.organic || [])) {
          const ex = extractProductFromSnippet(r.snippet) || extractProductFromSnippet(r.title);
          if (ex) { specificProduct = ex; break; }
        }
      } catch(e) { /* optional */ }

      const buyTerm = specificProduct || searchTerm;

      // Site hints — promote relevant retailer types without excluding others
      const siteHints = isToolProd
        ? 'site:bunnings.co.nz OR site:mitre10.co.nz OR site:thetoolshed.co.nz'
        : isSportProd
          ? 'site:stirlingsports.co.nz OR site:rebelsport.co.nz OR site:torpedo7.co.nz'
          : '';

      // Calls B (organic), C (shopping), D (images) — parallel
      const [organicRes, shoppingRes, imageRes] = await Promise.all([
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({
            q: siteHints
              ? `${buyTerm} buy NZ ${budgetHint} ${siteHints}`
              : `${buyTerm} buy NZ ${budgetHint} ${negatives}`,
            gl: 'nz', hl: 'en', num: 15
          })
        }),
        fetch('https://google.serper.dev/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: `${buyTerm} NZ`, gl: 'nz', hl: 'en', num: 10 })
        }),
        fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({
            q: `${specificProduct || product.name} product photo`,
            gl: 'nz', hl: 'en', num: 5
          })
        })
      ]);

      const organicData  = organicRes.ok  ? await organicRes.json()  : {};
      const shoppingData = shoppingRes.ok ? await shoppingRes.json() : {};
      const imageData    = imageRes.ok    ? await imageRes.json()    : {};

      // Filter organic results
      function filterOrganic(items) {
        return (items || []).filter(item => {
          if (!item.link || isBlacklisted(item.link)) return false;
          const url = item.link.toLowerCase();

          // Tools: hardware retailers only
          if (isToolProd) {
            return isPowerToolRetailer(url) ||
                   url.includes('bunnings') || url.includes('mitre10');
          }

          // General NZ retailer check — sports retailers included for ALL products
          // (Rebel Sport sells electronics, watches etc — don't exclude them)
          const isNZRetailer =
            url.includes('.co.nz') ||
            url.includes('mightyape') ||
            url.includes('pbtech') ||
            url.includes('jbhifi') ||
            url.includes('stirlingsports') ||
            url.includes('torpedo7') ||
            url.includes('hallensteins') ||
            url.includes('glassons') ||
            url.includes('luggage.co') ||
            url.includes('furtherfaster') ||
            url.includes('kmart.co') ||
            isPowerToolRetailer(url);

          // Reject .nz-only (not .co.nz) — overseas domains with NZ TLD
          const isNZOnly = /\.nz(\/|$)/.test(url) && !url.includes('.co.nz');
          return isNZRetailer && !isNZOnly;
        });
      }

      // Deduplicate — Warehouse last resort
      function dedup(items) {
        const seen = new Set(), main = [], wh = [];
        for (const item of filterOrganic(items)) {
          const domain = getMatchableDomain(item.link);
          if (!domain || seen.has(domain)) continue;
          seen.add(domain);
          isWarehouse(item.link)
            ? wh.push({ ...item, _domain: domain })
            : main.push({ ...item, _domain: domain });
        }
        if (main.length < 2) main.push(...wh);
        return main;
      }

      let uniqueOrganic = dedup(organicData.organic || []);

      // Tier 2 fallback
      if (uniqueOrganic.length < 3) {
        try {
          const t2Res  = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
            body: JSON.stringify({ q: `${searchTerm} buy NZ`, gl: 'nz', hl: 'en', num: 15 })
          });
          const t2Data = t2Res.ok ? await t2Res.json() : {};
          uniqueOrganic = dedup([...(organicData.organic || []), ...(t2Data.organic || [])]);
        } catch(e) { /* continue */ }
      }

      // Tier 3 fallback
      if (uniqueOrganic.length < 3) {
        try {
          const t3Res  = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
            body: JSON.stringify({ q: `${searchTerm} NZ`, gl: 'nz', hl: 'en', num: 15 })
          });
          const t3Data = t3Res.ok ? await t3Res.json() : {};
          uniqueOrganic = dedup([...uniqueOrganic, ...(t3Data.organic || [])]);
        } catch(e) { /* continue */ }
      }

      // Buy button = first clean result
      const best      = uniqueOrganic[0] || null;
      const buyLink   = best?.link || null;
      const buyDomain = best?._domain || null;
      const storeName = buyDomain
        ? buyDomain.charAt(0).toUpperCase() + buyDomain.slice(1) : null;

      // Store chips — up to 5, retailer search URLs
      // FIX: Use product.name (generic) for chip search URLs — not the review-found specific product
      // This ensures PB Tech etc get a clean short search query
      const stores = uniqueOrganic.slice(1, 6)
        .map(item => {
          const name = item._domain
            ? item._domain.charAt(0).toUpperCase() + item._domain.slice(1) : null;
          // Use searchTerm for chip URLs — shorter and more reliable than specificProduct
          const link = getRetailerSearchUrl(item._domain || '', searchTerm) || item.link;
          return name && link ? { name, link } : null;
        })
        .filter(Boolean)
        .slice(0, 5);

      // Image — 2-tier fallback
      let imageUrl = imageData.images?.[0]?.imageUrl || null;
      if (!imageUrl) {
        try {
          const imgFb   = await fetch('https://google.serper.dev/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
            body: JSON.stringify({ q: `${searchTerm} product`, gl: 'nz', hl: 'en', num: 5 })
          });
          const imgData = imgFb.ok ? await imgFb.json() : {};
          imageUrl = imgData.images?.[0]?.imageUrl || null;
        } catch(e) { /* no image */ }
      }

      return {
        name: product.name,
        type: product.type,
        reason: product.reason,
        budgetLabel,    // tier label shown on card instead of price
        bestStoreName: storeName,
        buyLink,
        imageUrl,
        stores,
        storeCount: uniqueOrganic.length,
      };

    } catch (err) {
      console.error(`Serper error for "${product.name}":`, err);
      return {
        name: product.name, type: product.type, reason: product.reason,
        budgetLabel,
        bestStoreName: null, buyLink: null, imageUrl: null, stores: [], storeCount: 0
      };
    }
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
