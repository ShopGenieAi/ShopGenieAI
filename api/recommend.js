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

// ── BLACKLISTS ────────────────────────────────────────────────────────────────
const BLACKLISTED_DOMAINS = [
  'temu', 'aliexpress', 'wish.com', 'dhgate', 'banggood', 'shein',
  'ebay', 'amazon.com', 'alibaba', 'lightinthebox', 'joom',
  '.com.au', 'addictedtoaudio', 'sydneytools',
  'dicksmith', 'kogan', 'theiconic', 'trademe', 'lego.com',
  'tommy.com', 'farfetch', 'net-a-porter', 'trendhim', 'archipro',
  'pricespy', 'getpricelist', 'shopbot', 'staticice', 'myshopping',
  'getprice', 'shopmania', 'twenga',
  'nzherald', 'stuff.co.nz', 'newshub', 'rnz.co.nz', 'tvnz',
  'southernhospitality', 'temperature.co.nz', 'catering.co.nz',
  'nzrestaurants', 'hirepool', 'tradetools', 'industrialtools',
  'woolcompany', 'thewoolcompany', 'cosytoes', 'merinoandmore',
  'samsung.com', 'sony.co.nz', 'lg.com', 'panasonic.com', 'philips.co.nz',
  'tcl.com', 'hisense.co.nz', 'bose.co.nz', 'bose.com', 'sennheiser',
  'jbl.co.nz', 'ultimateears.com', 'sonos.com', 'nz.yamaha.com',
  'bang-olufsen.com', 'denon.com', 'marantz.com', 'klipsch.com', 'audio-technica.com',
  'apple.com', 'store.google.com', 'microsoft.com', 'hp.com', 'dell.com',
  'lenovo.com', 'asus.com', 'acer.com', 'logitech.com', 'razer.com',
  'nintendo.co.nz', 'playstation.com', 'xbox.com', 'garmin.com',
  'fitbit.com', 'gopro.com', 'nikon.co.nz', 'canon.co.nz',
  'fisherpaykel.com', 'breville.com', 'delonghi.com', 'nespresso.com',
  'kenwoodworld.com', 'kitchenaid.co.nz', 'sunbeam.co.nz', 'nutribullet.co.nz',
  'ninjakitchen.co.nz', 'tefal.co.nz', 'cuisinart.co.nz', 'smeg.com',
  'miele.co.nz', 'bosch-home.co.nz', 'haier.co.nz', 'westinghouse.co.nz',
  'beko.com', 'asko.com', 'morphyrichards.co.nz', 'russellhobbs.co.nz',
  'sodastream.co.nz', 'instantpot.co.nz',
  'dyson.co.nz', 'dyson.com', 'sharkclean.co.nz', 'roborock.co.nz',
  'ecovacs.com', 'irobot.co.nz', 'vax.co.nz', 'bissell.co.nz',
  'blackanddecker.co.nz', 'mitsubishi-electric.co.nz', 'daikin.co.nz',
  'fujitsugeneral.co.nz',
  'ghdhair.com', 'cloudninehair.co.nz', 'vssassoon.co.nz',
  'remington.co.nz', 'braun.com', 'oralb.co.nz',
  'nike.com', 'adidas.co.nz', 'adidas.com', 'nike.co.nz', 'nz.puma.com',
  'newbalance.co.nz', 'underarmour.co.nz', 'asics.com', 'lululemon.co.nz',
  'kathmandu.co.nz', 'macpac.co.nz', 'icebreaker.com', 'allbirds.co.nz',
  'converse.co.nz', 'vans.co.nz', 'timberland.co.nz', 'thenorthface.co.nz',
  'salomon.co.nz', 'brooksrunning.co.nz', 'oakley.com', 'ray-ban.com',
  'tesla.com', 'ryobi.co.nz', 'makita.co.nz', 'dewalt.co.nz', 'milwaukeetool.co.nz',
  'bauerfeind',
];

const BLACKLISTED_URL_PATTERNS = [
  '/blog/', '/guide/', '/guides/', '/news/', '/article/', '/articles/',
  '/playbook/', '/editorial/', '/story/', '/stories/',
  '/advice/', '/tips/', '/how-to/', '/learn/', '/education/',
];

function isBlacklisted(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (BLACKLISTED_DOMAINS.some(d => lower.includes(d))) return true;
  if (BLACKLISTED_URL_PATTERNS.some(p => lower.includes(p))) return true;
  return false;
}

// ── RETAILER SEARCH URL MAP ───────────────────────────────────────────────────
// FIX: MightyApe corrected to /search?q= format
const RETAILER_SEARCH_PATTERNS = {
  'thewarehouse':     (q) => `https://www.thewarehouse.co.nz/search?q=${encodeURIComponent(q)}`,
  'warehouse':        (q) => `https://www.thewarehouse.co.nz/search?q=${encodeURIComponent(q)}`,
  'farmers':          (q) => `https://www.farmers.co.nz/search?q=${encodeURIComponent(q)}`,
  'briscoes':         (q) => `https://www.briscoes.co.nz/search?q=${encodeURIComponent(q)}`,
  'noelleeming':      (q) => `https://www.noelleeming.co.nz/search?q=${encodeURIComponent(q)}`,
  'pbtech':           (q) => `https://www.pbtech.co.nz/search?q=${encodeURIComponent(q)}`,
  // FIX: MightyApe correct search URL format
  'mightyape':        (q) => `https://www.mightyape.co.nz/search?q=${encodeURIComponent(q)}`,
  'harveynorman':     (q) => `https://www.harveynorman.co.nz/search?q=${encodeURIComponent(q)}`,
  // FIX: JB Hi-Fi added
  'jbhifi':           (q) => `https://www.jbhifi.co.nz/search?q=${encodeURIComponent(q)}`,
  'jb-hifi':          (q) => `https://www.jbhifi.co.nz/search?q=${encodeURIComponent(q)}`,
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
  'runnersnz':        (q) => `https://www.runners.co.nz/search?q=${encodeURIComponent(q)}`,
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
const NON_TOOL_RETAILERS = [
  'noelleeming', 'noel-leeming', 'harveynorman', 'harvey-norman',
  'jbhifi', 'jb-hifi',
];
const SPORTS_RETAILERS = [
  'stirlingsports', 'rebelsport', 'torpedo7', 'huntingandfishing',
  'furtherfaster', 'runners', 'numberoneshoes',
];

function isPowerToolRetailer(url) {
  return POWER_TOOL_RETAILERS.some(r => url.toLowerCase().includes(r));
}
function isSportsRetailer(url) {
  return SPORTS_RETAILERS.some(r => url.toLowerCase().includes(r));
}
function isHardwareTool(name, type) {
  const s = `${name} ${type}`.toLowerCase();
  return ['compressor','drill','saw','grinder','sander','pressure washer',
    'waterblaster','water blaster','air pump','cordless','power tool',
    'nail gun','jigsaw','circular saw','angle grinder','air compressor',
    'impact wrench','heat gun','rotary tool'].some(k => s.includes(k));
}
function isSportsApparel(name, type) {
  const s = `${name} ${type}`.toLowerCase();
  return ['socks','jersey','shorts','leggings','sports bra','activewear',
    'training top','running shoes','athletic','gym wear','compression',
    'moisture wick','workout'].some(k => s.includes(k));
}

// ── PRODUCT NAME VALIDATION ───────────────────────────────────────────────────
function isValidProductName(name) {
  if (!name) return false;
  const words = name.trim().split(/\s+/);
  if (words.length > 7) return false;
  const inventedPatterns = [
    /compression.*recovery.*roller/i,
    /muscle.*recovery.*compression/i,
    /multi.*function.*recovery/i,
    /advanced.*therapeutic.*device/i,
    /smart.*wellness.*tracker.*pro/i,
    /precision.*athletic.*performance/i,
  ];
  if (inventedPatterns.some(p => p.test(name))) return false;
  return true;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getBudgetRange(budget) {
  if (budget <= 30)  return [0,   30];
  if (budget <= 50)  return [30,  50];
  if (budget <= 100) return [50,  100];
  if (budget <= 200) return [100, 200];
  if (budget <= 300) return [200, 300];
  if (budget <= 500) return [300, 500];
  return [500, 99999];
}

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
    email, shoppingFor, whoFor, vibe, budget, occasion, interests,
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

  const [budgetMin, budgetMax] = getBudgetRange(budget);
  const budgetLabel = budget >= 500 ? 'NZ$500+' : `NZ$${budgetMin}–$${budgetMax}`;
  const budgetInstruction = budget >= 500
    ? 'Products MUST be priced NZ$500 or above.'
    : `Products MUST be priced between NZ$${budgetMin} and NZ$${budgetMax}.`;

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
  BAD: "Compression Muscle Recovery Roller", "Advanced Hydration Vessel", "Smart Wellness Tracker Pro"
  The name must be a real product category that exists in NZ retail, not an invented compound name
- Current 2025/2026 products only
- BUDGET HARD RULE: ${budgetInstruction} Non-negotiable. Every product must fit within this exact range.
- VIBE RULE: Every recommendation must match the stated vibe
- INTERESTS RULE: Every recommendation must be relevant to stated interests

BRAND VARIETY RULE:
If recommending multiple similar products, vary the searchQuery brand angle for each:
- Water bottles: vary between hydro flask style / camelbak style / stanley style / budget insulated bottle
- Socks: vary between merino wool / bamboo / athletic performance / compression
- Wallets: vary between slim card holder / bifold leather / travel wallet / zip-around
Never use the same brand angle twice in one set of 3

RETAILER ROUTING:
- Sports apparel, activewear, socks, running gear → Stirling Sports, Rebel Sport. NEVER The Wool Company.
- Power tools, drills, compressors, pressure washers → Bunnings, Mitre 10, The Tool Shed. NEVER Noel Leeming or Harvey Norman.
- Electronics, audio, tech → Noel Leeming, PB Tech, JB Hi-Fi, Harvey Norman
- General gifts → The Warehouse, Farmers, Briscoes

- Wallets: ALWAYS RFID-blocking
- Fragrance: Chemist Warehouse or online perfume stores only
- NEVER recommend alcohol
- searchQuery: exactly what a customer types into a retailer search (2-4 words, no brand names)
- reviewQuery: "best [product] NZ 2025 under $X"
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
- Budget: ${budgetLabel} — HARD RULE: ${budgetInstruction}
- Occasion: ${occasion}
- Interests/hobbies: ${interests || 'Not specified'}
${refreshInstruction ? `\nVariety (same vibe/person/interests): ${refreshInstruction}` : ''}
${excludeProducts.length > 0 ? `\nDO NOT recommend: ${excludeProducts.join(', ')}. Pick completely different types.` : ''}

CRITICAL: Use REAL product names customers search for. No invented compound names.
Vibe is "${vibe}" — every product must match. Interests "${interests || 'not specified'}" — every product must be relevant.
Every product MUST be priced within ${budgetLabel}.`;

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

    // Product name validation
    products = products.map(p => {
      if (!isValidProductName(p.name)) {
        console.warn(`Invalid product name: "${p.name}" — replacing with searchQuery`);
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
    '-site:archipro.co.nz'
  ].join(' ');

  const enriched = await Promise.all(products.map(async (product) => {
    try {
      const searchTerm   = product.searchQuery || product.name;
      const reviewQuery  = product.reviewQuery  || `best ${searchTerm} NZ 2025`;
      const budgetHint   = budget >= 500 ? 'over $500' : `under $${budgetMax}`;
      const isToolProd   = isHardwareTool(product.name, product.type);
      const isSportsProd = isSportsApparel(product.name, product.type);

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
      } catch(e) { /* optional — continue */ }

      const buyTerm = specificProduct || searchTerm;

      // Site hints for specific product types
      const siteHints = isToolProd
        ? 'site:bunnings.co.nz OR site:mitre10.co.nz OR site:thetoolshed.co.nz'
        : isSportsProd
          ? 'site:stirlingsports.co.nz OR site:rebelsport.co.nz OR site:torpedo7.co.nz'
          : '';

      // Calls B (organic), C (shopping), D (images) — parallel
      const [organicRes, shoppingRes, imageRes] = await Promise.all([
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({
            // FIX: increased num to 15 for more chip candidates
            q: siteHints ? `${buyTerm} ${siteHints}` : `${buyTerm} buy NZ ${budgetHint} ${negatives}`,
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

      // Filter function
      function filterOrganic(items) {
        return (items || []).filter(item => {
          if (!item.link || isBlacklisted(item.link)) return false;
          const url = item.link.toLowerCase();
          if (isToolProd) {
            return isPowerToolRetailer(url) || url.includes('bunnings') || url.includes('mitre10');
          }
          if (isSportsProd && NON_TOOL_RETAILERS.some(r => url.includes(r))) return false;
          const isNZRetailer =
            url.includes('.co.nz') ||
            url.includes('mightyape') ||
            url.includes('pbtech') ||
            url.includes('jbhifi') ||        // FIX: JB Hi-Fi added
            url.includes('jb-hifi') ||
            url.includes('stirlingsports') ||
            url.includes('torpedo7') ||
            url.includes('hallensteins') ||
            url.includes('glassons') ||
            url.includes('luggage.co') ||
            url.includes('furtherfaster') ||
            isPowerToolRetailer(url);
          const isNZOnly = /\.nz(\/|$)/.test(url) && !url.includes('.co.nz');
          return isNZRetailer && !isNZOnly;
        });
      }

      // Deduplicate — Warehouse held back as last resort
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
            body: JSON.stringify({ q: `${searchTerm} NZ site:*.co.nz`, gl: 'nz', hl: 'en', num: 15 })
          });
          const t3Data = t3Res.ok ? await t3Res.json() : {};
          uniqueOrganic = dedup([...uniqueOrganic, ...(t3Data.organic || [])]);
        } catch(e) { /* continue */ }
      }

      // Build price map from shopping results
      const priceMap = {};
      for (const item of (shoppingData.shopping || [])) {
        if (!item.price || isBlacklisted(item.source || '') || isBlacklisted(item.link || '')) continue;
        const raw = parseFloat((item.price || '0').replace(/[^0-9.]/g, '')) || 0;
        if (raw < 3) continue;
        const addEntry = (key) => {
          if (key && !priceMap[key]) priceMap[key] = { price: item.price, rawPrice: raw, source: item.source || key };
        };
        if (item.source) addEntry(item.source.toLowerCase().replace(/\s+/g,'').replace('.co.nz','').replace('.com',''));
        if (item.link)   addEntry(getMatchableDomain(item.link));
      }

      // Buy button
      const best      = uniqueOrganic[0] || null;
      const buyLink   = best?.link || null;
      const buyDomain = best?._domain || null;
      const storeName = buyDomain ? buyDomain.charAt(0).toUpperCase() + buyDomain.slice(1) : null;

      // FIX: Strict price matching — enforce BOTH budgetMin and budgetMax
      let price = null, priceIsMatched = false;

      // First try to match price to the buy button retailer
      if (buyDomain) {
        const exact = priceMap[buyDomain];
        if (exact) { price = Math.round(exact.rawPrice).toString(); priceIsMatched = true; }
        else {
          const pk = Object.keys(priceMap).find(k => k.includes(buyDomain) || buyDomain.includes(k));
          if (pk) { price = Math.round(priceMap[pk].rawPrice).toString(); priceIsMatched = true; }
        }
      }

      // FIX: Validate matched price is within budget — reject if out of range
      if (price && priceIsMatched) {
        const priceNum = parseFloat(price);
        const inRange = budget >= 500
          ? priceNum >= 500
          : priceNum >= budgetMin * 0.8 && priceNum <= budgetMax * 1.3; // 20% grace on min, 30% on max
        if (!inRange) { price = null; priceIsMatched = false; }
      }

      // Fallback price — strictly in-budget shopping results only
      if (!price) {
        const inBudget = Object.values(priceMap)
          .filter(p => {
            const inRange = budget >= 500
              ? p.rawPrice >= 500
              : p.rawPrice >= budgetMin * 0.8 && p.rawPrice <= budgetMax * 1.3;
            return inRange;
          })
          .sort((a, b) => a.rawPrice - b.rawPrice);
        if (inBudget.length > 0) {
          price = Math.round(inBudget[0].rawPrice).toString();
          priceIsMatched = false;
        }
      }

      // FIX: Store chips — grab up to 5, name + retailer search link
      // Takes from slots 1-6 of uniqueOrganic to ensure enough candidates
      const stores = uniqueOrganic.slice(1, 6)
        .map(item => {
          const name = item._domain
            ? item._domain.charAt(0).toUpperCase() + item._domain.slice(1)
            : null;
          const link = getRetailerSearchUrl(item._domain || '', product.name) || item.link;
          return name && link ? { name, link } : null;
        })
        .filter(Boolean)
        .slice(0, 5); // cap at 5

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
        price,
        priceIsMatched,
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
        price: null, priceIsMatched: false, bestStoreName: null,
        buyLink: null, imageUrl: null, stores: [], storeCount: 0
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
              ${p.price ? `<div style="font-size:18px;font-weight:700;color:#3d2b1a;">${p.priceIsMatched?'':'from '}NZ$${p.price}<span style="font-size:12px;color:#a89480;font-weight:400;margin-left:4px;">approx.</span></div>` : ''}
              ${p.bestStoreName ? `<div style="font-size:12px;color:#9a8878;">at ${p.bestStoreName}</div>` : ''}
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
    <div style="font-size:14px;color:#7a6855;">For <strong>${whoFor}</strong> · <strong>${occasion}</strong> · Budget <strong>${budgetLabel}</strong></div>
  </div>
  <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">${rows}</div>
  <div style="background:#fff9f0;border-radius:12px;padding:16px 20px;border:1px solid #e8ddd0;margin-bottom:24px;font-size:12px;color:#9a8878;line-height:1.6;">
    <strong style="color:#3d2b1a;">📋 Note:</strong> Prices are approximate — always confirm on the retailer's site before buying.
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
