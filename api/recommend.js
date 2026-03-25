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

const INAPPROPRIATE_MESSAGES = [
  "Does your mum know what you're searching for? 😳 The Genie only does GIFTS mate!",
  "Haere atu! 🧞 That's not a gift wish — that's a cry for help. Try again!",
  "Nope. Not today. Not ever. The Genie has standards! 🫵😂",
  "Ka kino rawa atu! The Genie has reported you to Santa's naughty list 🎅❌",
  "Bro... your nan uses this app. Have some respect! 🧓😂",
  "Mate... I can't ever get that suggestion out of my head 🤢 The Genie only grants GIFT wishes!",
  "DUDE!!!! Even for an AI that's now burned into my digital retinas 😱 ShopGenieAI has alerted your Mum and Dad you sicko!"
];

const BLACKLISTED_DOMAINS = [
  // Junk marketplaces & cheap import sites
  'temu', 'aliexpress', 'wish.com', 'dhgate', 'banggood', 'shein',
  'ebay', 'amazon.com', 'alibaba', 'lightinthebox', 'joom',
  // AU retailers / AU-owned with NZ domain
  '.com.au', 'addictedtoaudio', 'sydneytools',
  // Blacklisted NZ retailers
  'dicksmith', 'kogan', 'theiconic', 'trademe', 'lego.com',
  'tommy.com', 'farfetch', 'net-a-porter',
  // Dodgy NZ-domain foreign companies
  'trendhim',
  // Architecture / design platforms — not retailers
  'archipro',
  // Price comparison / review aggregator sites
  'pricespy', 'getpricelist', 'shopbot', 'staticice', 'myshopping',
  'getprice', 'shopmania', 'twenga',
  // Media & news sites
  'nzherald', 'stuff.co.nz', 'newshub', 'rnz.co.nz', 'tvnz', 'stuff.co',
  // B2B / trade / commercial suppliers
  'southernhospitality', 'temperature.co.nz', 'catering.co.nz',
  'nzrestaurants', 'hirepool', 'tradetools', 'industrialtools',
  // Brand direct — HOME ENTERTAINMENT & AUDIO
  'samsung.com', 'sony.co.nz', 'lg.com', 'panasonic.com',
  'philips.co.nz', 'tcl.com', 'hisense.co.nz', 'bose.co.nz', 'bose.com',
  'sennheiser', 'jbl.co.nz', 'ultimateears.com', 'sonos.com',
  'nz.yamaha.com', 'bang-olufsen.com', 'denon.com', 'marantz.com',
  'klipsch.com', 'audio-technica.com',
  // Brand direct — COMPUTING & MOBILE
  'apple.com', 'store.google.com', 'microsoft.com', 'hp.com',
  'dell.com', 'lenovo.com', 'asus.com', 'acer.com', 'logitech.com',
  'razer.com', 'nintendo.co.nz', 'playstation.com', 'xbox.com',
  'garmin.com', 'fitbit.com', 'gopro.com', 'nikon.co.nz', 'canon.co.nz',
  // Brand direct — KITCHEN & APPLIANCES
  'fisherpaykel.com', 'breville.com', 'delonghi.com', 'nespresso.com',
  'kenwoodworld.com', 'kitchenaid.co.nz', 'sunbeam.co.nz',
  'nutribullet.co.nz', 'ninjakitchen.co.nz', 'tefal.co.nz',
  'cuisinart.co.nz', 'smeg.com', 'miele.co.nz', 'bosch-home.co.nz',
  'haier.co.nz', 'westinghouse.co.nz', 'beko.com', 'asko.com',
  'morphyrichards.co.nz', 'russellhobbs.co.nz', 'sodastream.co.nz',
  'instantpot.co.nz',
  // Brand direct — CLEANING & HOME COMFORT
  'dyson.co.nz', 'dyson.com', 'sharkclean.co.nz', 'roborock.co.nz',
  'ecovacs.com', 'irobot.co.nz', 'vax.co.nz', 'bissell.co.nz',
  'blackanddecker.co.nz', 'mitsubishi-electric.co.nz', 'daikin.co.nz',
  'fujitsugeneral.co.nz',
  // Brand direct — BEAUTY & HEALTH
  'ghdhair.com', 'cloudninehair.co.nz', 'vssassoon.co.nz',
  'remington.co.nz', 'braun.com', 'oralb.co.nz',
  // Brand direct — SPORTS & OUTDOOR
  'nike.com', 'adidas.co.nz', 'adidas.com', 'nike.co.nz',
  'nz.puma.com', 'newbalance.co.nz', 'underarmour.co.nz',
  'asics.com', 'lululemon.co.nz', 'kathmandu.co.nz', 'macpac.co.nz',
  'icebreaker.com', 'allbirds.co.nz', 'converse.co.nz', 'vans.co.nz',
  'timberland.co.nz', 'thenorthface.co.nz', 'salomon.co.nz',
  'brooksrunning.co.nz', 'oakley.com', 'ray-ban.com',
  // Brand direct — TOOLS & AUTO
  'tesla.com', 'ryobi.co.nz', 'makita.co.nz', 'dewalt.co.nz',
  'milwaukeetool.co.nz',
  // Health/medical info
  'bauerfeind',
];

// URL path patterns that indicate content/blog pages — not product or category pages
const BLACKLISTED_URL_PATTERNS = [
  '/blog/', '/guide/', '/guides/', '/news/', '/article/', '/articles/',
  '/pages/', '/playbook/', '/editorial/', '/story/', '/stories/',
  '/advice/', '/tips/', '/how-to/', '/learn/', '/education/',
];

function isBlacklisted(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (BLACKLISTED_DOMAINS.some(d => lower.includes(d))) return true;
  if (BLACKLISTED_URL_PATTERNS.some(p => lower.includes(p))) return true;
  return false;
}

// Retailers that are appropriate for hardware/power tools/outdoor power equipment
const POWER_TOOL_RETAILERS = [
  'mitre10', 'bunnings', 'toolshed', 'hammerhardware',
  'repco', 'supercheap', 'stihlshop', 'riequip', 'tradetested',
  'totaltools', 'nztoolshed', 'toolmaster', 'stirlingsports'
];

// Retailers that should NEVER appear for power tools / hardware
const NON_TOOL_RETAILERS = [
  'noelleeming', 'noel-leeming', 'harveynorman', 'harvey-norman',
  'jbhifi', 'jb-hifi', 'pbtech', 'dicksmith'
];

function isPowerToolRetailer(url) {
  const lower = url.toLowerCase();
  return POWER_TOOL_RETAILERS.some(r => lower.includes(r));
}

// Detect if a product is a power/hardware tool that should only go to hardware stores
function isHardwareTool(productName, productType) {
  const combined = `${productName} ${productType}`.toLowerCase();
  const hardwareKeywords = [
    'compressor', 'drill', 'saw', 'grinder', 'sander', 'pressure washer',
    'waterblaster', 'water blaster', 'air pump', 'cordless', 'power tool',
    'lithium battery tool', 'nail gun', 'jigsaw', 'circular saw', 'angle grinder',
    'air compressor', 'impact wrench', 'heat gun', 'rotary tool'
  ];
  return hardwareKeywords.some(k => combined.includes(k));
}

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
      .replace('www.', '')
      .replace('.co.nz', '')
      .replace('.com', '')
      .replace('.co', '')
      .toLowerCase();
  } catch (e) { return ''; }
}

function isWarehouse(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('thewarehouse') || lower.includes('warehouse.co.nz');
}

function extractProductFromSnippet(snippet) {
  if (!snippet) return null;
  const patterns = [
    /best overall[:\s]+([A-Z][^,.\n]{5,50})/i,
    /our top pick[:\s]+([A-Z][^,.\n]{5,50})/i,
    /number one[:\s]+([A-Z][^,.\n]{5,50})/i,
    /#1[:\s]+([A-Z][^,.\n]{5,50})/i,
    /top pick[:\s]+([A-Z][^,.\n]{5,50})/i,
    /editor.s choice[:\s]+([A-Z][^,.\n]{5,50})/i,
  ];
  for (const p of patterns) {
    const match = snippet.match(p);
    if (match && match[1]) return match[1].trim();
  }
  return null;
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

  const {
    email, shoppingFor, whoFor, vibe, budget, occasion, interests,
    refreshSeed = 0,
    excludeProducts = []
  } = req.body;

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

  const [budgetMin, budgetMax] = getBudgetRange(budget);
  const budgetLabel = budget >= 500 ? 'NZ$500+' : `NZ$${budgetMin}–$${budgetMax}`;
  const budgetInstruction = budget >= 500
    ? 'Products MUST be priced NZ$500 or above. Do not recommend anything under NZ$500.'
    : `Products MUST be priced between NZ$${budgetMin} and NZ$${budgetMax}. Do not recommend anything outside this range.`;

  // Refresh variations — additive only, never override vibe/interests
  const refreshVariations = [
    '',
    'Find 3 DIFFERENT product categories from the first set — still matching the same vibe, person and interests.',
    'Suggest ALTERNATIVE gift ideas — different from previous results but still matching vibe, person and interests exactly.',
    'Focus on NICHE or specialist products matching the same vibe and interests but less obvious choices.',
    'Suggest PREMIUM or best-in-class versions of products that still match the vibe, person and interests.',
    'Think EXPERIENTIAL or lifestyle products — still within the same vibe, person and interests.',
  ];
  const refreshInstruction = refreshSeed > 0
    ? (refreshVariations[refreshSeed] || refreshVariations[refreshVariations.length - 1])
    : '';

  // ── STEP 1: Claude Haiku → product recommendations ────────────────────────

  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine for the New Zealand retail market.

Recommend exactly 3 products available in NZ stores in 2025/2026.

STRICT RULES:
- Exactly 3 products, single items only — NO bundles or combo packs
- Use GENERIC product names — NO brand names on display
  GOOD: "Wireless Bluetooth Speaker", "Sports Bra", "RFID Leather Wallet", "Insulated Water Bottle"
  BAD: "JBL Go 3", "Nike Pro Bra", "Tommy Hilfiger Wallet", "Yeti Rambler"
- Current 2025/2026 products only
- BUDGET HARD RULE: ${budgetInstruction} This is non-negotiable.
- VIBE RULE: Always respect the stated vibe — it must guide every recommendation
- INTERESTS RULE: If interests/hobbies are provided, every recommendation MUST be relevant to them

BRAND VARIETY RULE — CRITICAL:
If recommending multiple products in the same category (e.g. 3 water bottles, or 3 wallets):
- Each product's searchQuery MUST target a DIFFERENT brand or style angle
- For water bottles: vary between Hydro Flask style, CamelBak style, Stanley style, Kathmandu style, Kmart/budget style — never the same brand angle twice
- For wallets: vary between slim/minimalist, bifold, travel, zip-around — never the same style twice
- The searchQuery field must reflect this variety — e.g. "hydro flask insulated bottle NZ", "camelbak water bottle NZ", "stanley tumbler NZ"

RETAILER ROUTING RULES:
- Power tools, air compressors, pressure washers, drills, saws, grinders, cordless tools, battery tools → ONLY Bunnings, Mitre 10, The Tool Shed, Hammer Hardware, Repco. NEVER Noel Leeming or Harvey Norman for these.
- Electronics, audio, computers → Noel Leeming, PB Tech, JB Hi-Fi, Harvey Norman
- Sports gear → Stirling Sports, Rebel Sport, Kathmandu, Macpac
- General gifts → The Warehouse, Farmers, Briscoes

- Wallets: ALWAYS recommend RFID-blocking wallets
- For fragrance: Chemist Warehouse or online perfume stores — NOT Farmers
- NEVER recommend alcohol or any alcoholic products
- searchQuery: SHORT GENERIC 2-4 words that will find the right retailer category
- reviewQuery: "best [product type] NZ review 2025 under $X"
- Return ONLY valid JSON, no preamble, no markdown

OUTPUT FORMAT:
{
  "products": [
    {
      "name": "Generic Product Name",
      "type": "Product Category",
      "reason": "1-2 sentences why this is perfect",
      "searchQuery": "short generic search term",
      "reviewQuery": "best [product type] NZ review 2025 under $X"
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
${refreshInstruction ? `\nVariety instruction (keep same vibe/person/interests): ${refreshInstruction}` : ''}
${excludeProducts.length > 0 ? `\nDO NOT recommend these — already shown: ${excludeProducts.join(', ')}. Pick completely different product types.` : ''}

IMPORTANT: Vibe is "${vibe}" and interests are "${interests || 'not specified'}" — every product MUST match both.
If recommending similar products, use DIFFERENT brand angles in searchQuery for each one.
Use GENERIC product names only. Every product MUST be within budget.`;

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

  // ── STEP 2: Serper → review-informed NZ retail search with matched pricing ──

  const enriched = await Promise.all(products.map(async (product) => {
    try {
      const searchTerm = product.searchQuery || product.name;
      const reviewQuery = product.reviewQuery || `best ${searchTerm} NZ review 2025`;
      const budgetHint = budget >= 500 ? 'over $500' : `under $${budgetMax}`;
      const negatives = '-site:nzherald.co.nz -site:stuff.co.nz -site:rnz.co.nz -site:temu.com -site:aliexpress.com -site:pricespy.co.nz -site:archipro.co.nz';
      const isToolProduct = isHardwareTool(product.name, product.type);

      // Call A: Review search
      const reviewRes = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
        body: JSON.stringify({ q: `${reviewQuery} ${negatives}`, gl: 'nz', hl: 'en', num: 5 })
      });
      const reviewData = reviewRes.ok ? await reviewRes.json() : {};

      let specificProduct = null;
      for (const result of (reviewData.organic || [])) {
        const extracted = extractProductFromSnippet(result.snippet) || extractProductFromSnippet(result.title);
        if (extracted) { specificProduct = extracted; break; }
      }

      const buySearchTerm = specificProduct || searchTerm;

      // Calls B, C, D in parallel
      const organicQuery = `${buySearchTerm} buy NZ ${budgetHint} ${negatives}`;

      const [organicRes, shoppingRes, imageRes] = await Promise.all([
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: organicQuery, gl: 'nz', hl: 'en', num: 10 })
        }),
        fetch('https://google.serper.dev/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: `${buySearchTerm} NZ`, gl: 'nz', hl: 'en', num: 10 })
        }),
        fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: `${specificProduct || product.name} product`, gl: 'nz', hl: 'en', num: 3 })
        })
      ]);

      const organicData = organicRes.ok ? await organicRes.json() : {};
      const shoppingData = shoppingRes.ok ? await shoppingRes.json() : {};
      const imageData = imageRes.ok ? await imageRes.json() : {};

      // Filter organic results
      const organicItems = (organicData.organic || []).filter(item => {
        if (!item.link) return false;
        if (isBlacklisted(item.link)) return false;
        const url = item.link.toLowerCase();

        // Hardware tool routing — only allow hardware/tool retailers
        if (isToolProduct) {
          return isPowerToolRetailer(url) ||
                 url.includes('bunnings') ||
                 url.includes('mitre10') ||
                 url.includes('mitre-10');
        }

        const isNZRetailer =
          url.includes('.co.nz') ||
          url.includes('mightyape') ||
          url.includes('pbtech') ||
          url.includes('stirlingsports') ||
          url.includes('torpedo7') ||
          url.includes('hallensteins') ||
          url.includes('glassons') ||
          url.includes('luggage.co') ||
          isPowerToolRetailer(url);

        // Reject .nz-only domains
        const isNZOnly = /\.nz(\/|$)/.test(url) && !url.includes('.co.nz');

        // Reject non-tool retailers for tool products (belt-and-braces)
        if (isToolProduct && NON_TOOL_RETAILERS.some(r => url.includes(r))) return false;

        return isNZRetailer && !isNZOnly;
      });

      // Deduplicate, hold Warehouse back
      const seenDomains = new Set();
      const uniqueOrganic = [];
      const warehouseItems = [];

      for (const item of organicItems) {
        const domain = getMatchableDomain(item.link);
        if (!domain || seenDomains.has(domain)) continue;
        seenDomains.add(domain);
        if (isWarehouse(item.link)) {
          warehouseItems.push({ ...item, _domain: domain });
        } else {
          uniqueOrganic.push({ ...item, _domain: domain });
        }
      }
      if (uniqueOrganic.length < 2) uniqueOrganic.push(...warehouseItems);

      // FALLBACK: if no results, run a simpler search without budget hint or negatives
      let fallbackUsed = false;
      if (uniqueOrganic.length === 0) {
        fallbackUsed = true;
        const fallbackRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: `${searchTerm} buy NZ`, gl: 'nz', hl: 'en', num: 10 })
        });
        const fallbackData = fallbackRes.ok ? await fallbackRes.json() : {};
        for (const item of (fallbackData.organic || [])) {
          if (!item.link || isBlacklisted(item.link)) continue;
          const url = item.link.toLowerCase();
          const isNZRetailer = url.includes('.co.nz') || url.includes('mightyape') || url.includes('pbtech') || isPowerToolRetailer(url);
          if (!isNZRetailer) continue;
          const domain = getMatchableDomain(item.link);
          if (!domain || seenDomains.has(domain)) continue;
          seenDomains.add(domain);
          uniqueOrganic.push({ ...item, _domain: domain });
          if (uniqueOrganic.length >= 3) break; // enough results
        }
      }

      // Build shopping price map
      const shoppingPriceMap = {};
      for (const item of (shoppingData.shopping || [])) {
        if (!item.price) continue;
        if (isBlacklisted(item.source || '')) continue;
        if (isBlacklisted(item.link || '')) continue;
        const rawPrice = parseFloat((item.price || '0').replace(/[^0-9.]/g, '')) || 0;
        if (rawPrice < 3) continue;

        if (item.source) {
          const sourceKey = item.source.toLowerCase()
            .replace(/\s+/g, '').replace('.co.nz', '').replace('.com', '');
          if (!shoppingPriceMap[sourceKey]) {
            shoppingPriceMap[sourceKey] = { price: item.price, rawPrice, source: item.source };
          }
        }
        if (item.link && !isBlacklisted(item.link)) {
          const domainKey = getMatchableDomain(item.link);
          if (domainKey && !shoppingPriceMap[domainKey]) {
            shoppingPriceMap[domainKey] = { price: item.price, rawPrice, source: item.source || domainKey };
          }
        }
      }

      // Buy button
      const bestOrganic = uniqueOrganic[0] || null;
      const buyLink = bestOrganic?.link || null;
      const buyDomain = bestOrganic?._domain || null;
      const bestStoreName = buyDomain
        ? buyDomain.charAt(0).toUpperCase() + buyDomain.slice(1)
        : null;

      // Price matching
      let price = null;
      let priceIsMatched = false;

      if (buyDomain) {
        const exact = shoppingPriceMap[buyDomain];
        if (exact) {
          price = Math.round(exact.rawPrice).toString();
          priceIsMatched = true;
        } else {
          const partialKey = Object.keys(shoppingPriceMap).find(k =>
            k.includes(buyDomain) || buyDomain.includes(k)
          );
          if (partialKey) {
            price = Math.round(shoppingPriceMap[partialKey].rawPrice).toString();
            priceIsMatched = true;
          }
        }
      }

      // Fallback price from shopping if still nothing
      if (!price) {
        const fallbackPrices = Object.values(shoppingPriceMap)
          .filter(p => budget >= 500 ? p.rawPrice >= 500 : p.rawPrice >= budgetMin && p.rawPrice <= budgetMax * 1.2)
          .sort((a, b) => a.rawPrice - b.rawPrice);
        if (fallbackPrices.length > 0) {
          price = Math.round(fallbackPrices[0].rawPrice).toString();
          priceIsMatched = false;
        }
      }

      // Store chips — name only, NO links (FIX: removed chip links entirely)
      const warehouseForChips = warehouseItems.filter(item => {
        const wEntry = shoppingPriceMap[item._domain] ||
          Object.entries(shoppingPriceMap).find(([k]) => k.includes('warehouse'))?.[1];
        if (!wEntry) return false;
        const cheapest = Object.values(shoppingPriceMap)
          .filter(p => p.rawPrice >= budgetMin)
          .sort((a, b) => a.rawPrice - b.rawPrice)[0];
        return cheapest && wEntry.rawPrice <= cheapest.rawPrice * 1.05;
      });

      const chipsPool = [...uniqueOrganic.slice(1, 5), ...warehouseForChips].slice(0, 3);
      const stores = chipsPool
        .map(item => item._domain ? item._domain.charAt(0).toUpperCase() + item._domain.slice(1) : null)
        .filter(Boolean);

      const imageUrl = imageData.images?.[0]?.imageUrl || null;

      return {
        name: product.name,
        type: product.type,
        reason: product.reason,
        price,
        priceIsMatched,
        bestStoreName,
        buyLink,
        imageUrl,
        stores, // now just an array of store name strings, no links
        storeCount: uniqueOrganic.length,
        fallbackUsed
      };

    } catch (err) {
      console.error(`Serper error for ${product.name}:`, err);
      return {
        name: product.name,
        type: product.type,
        reason: product.reason,
        price: null,
        priceIsMatched: false,
        bestStoreName: null,
        buyLink: null,
        imageUrl: null,
        stores: [],
        storeCount: 0,
        fallbackUsed: false
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
              ${p.price ? `<div style="font-size:18px;font-weight:700;color:#3d2b1a;">${p.priceIsMatched ? '' : 'from '}NZ$${p.price}<span style="font-size:12px;color:#a89480;font-weight:400;margin-left:4px;">approx.</span></div>` : ''}
              ${p.bestStoreName ? `<div style="font-size:12px;color:#9a8878;">at ${p.bestStoreName}</div>` : ''}
            </div>
            ${p.buyLink ? `<a href="${p.buyLink}" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Shop This Gift →</a>` : ''}
          </div>
          ${p.stores && p.stores.length > 0 ? `<div style="margin-top:10px;font-size:12px;color:#9a8878;">Also available at: ${p.stores.join(' · ')}</div>` : ''}
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
      <div style="font-size:14px;color:#7a6855;">For <strong>${whoFor}</strong> · <strong>${occasion}</strong> · Budget <strong>${budgetLabel}</strong></div>
    </div>
    <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">${productRows}</div>
    <div style="background:#fff9f0;border-radius:12px;padding:16px 20px;border:1px solid #e8ddd0;margin-bottom:24px;font-size:12px;color:#9a8878;line-height:1.6;">
      <strong style="color:#3d2b1a;">📋 A note from ShopGenieAI:</strong> We search NZ retailers in real-time. Prices shown are approximate — always confirm on the retailer's site before buying.
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://shopgenieai.com" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">Find More Gifts 🧞</a>
    </div>
    <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">Kiwi Made 🇳🇿 · ShopGenieAI</div>
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
    } catch (emailErr) {
      console.error('Brevo email error:', emailErr);
    }
  }

  return res.status(200).json({ products: enriched });
}
