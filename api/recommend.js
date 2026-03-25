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
  'temu', 'aliexpress', 'wish.com', 'dhgate', 'banggood', 'shein',
  'ebay', 'amazon.com', 'alibaba', 'lightinthebox', 'joom',
  '.com.au', 'addictedtoaudio', 'sydneytools',
  'dicksmith', 'kogan', 'theiconic', 'trademe', 'lego.com',
  'tommy.com', 'farfetch', 'net-a-porter',
  'trendhim', 'skullcandy.co.nz',
  'pricespy', 'getpricelist', 'shopbot', 'staticice', 'myshopping',
  'getprice', 'shopmania', 'twenga',
  'nzherald', 'stuff.co.nz', 'newshub', 'rnz.co.nz', 'tvnz', 'stuff.co',
  'southernhospitality', 'temperature.co.nz', 'catering.co.nz',
  'nzrestaurants', 'hirepool', 'tradetools', 'industrialtools',
  'samsung.com', 'sony.co.nz', 'lg.com', 'panasonic.com',
  'philips.co.nz', 'tcl.com', 'hisense.co.nz', 'bose.co.nz', 'bose.com',
  'sennheiser', 'jbl.co.nz', 'ultimateears.com', 'sonos.com',
  'nz.yamaha.com', 'bang-olufsen.com', 'denon.com', 'marantz.com',
  'klipsch.com', 'audio-technica.com',
  'apple.com', 'store.google.com', 'microsoft.com', 'hp.com',
  'dell.com', 'lenovo.com', 'asus.com', 'acer.com', 'logitech.com',
  'razer.com', 'nintendo.co.nz', 'playstation.com', 'xbox.com',
  'garmin.com', 'fitbit.com', 'gopro.com', 'nikon.co.nz', 'canon.co.nz',
  'fisherpaykel.com', 'breville.com', 'delonghi.com', 'nespresso.com',
  'kenwoodworld.com', 'kitchenaid.co.nz', 'sunbeam.co.nz',
  'nutribullet.co.nz', 'ninjakitchen.co.nz', 'tefal.co.nz',
  'cuisinart.co.nz', 'smeg.com', 'miele.co.nz', 'bosch-home.co.nz',
  'haier.co.nz', 'westinghouse.co.nz', 'beko.com', 'asko.com',
  'morphyrichards.co.nz', 'russellhobbs.co.nz', 'sodastream.co.nz',
  'instantpot.co.nz',
  'dyson.co.nz', 'dyson.com', 'sharkclean.co.nz', 'roborock.co.nz',
  'ecovacs.com', 'irobot.co.nz', 'vax.co.nz', 'bissell.co.nz',
  'blackanddecker.co.nz', 'mitsubishi-electric.co.nz', 'daikin.co.nz',
  'fujitsugeneral.co.nz',
  'ghdhair.com', 'cloudninehair.co.nz', 'vssassoon.co.nz',
  'remington.co.nz', 'braun.com', 'oralb.co.nz',
  'nike.com', 'adidas.co.nz', 'adidas.com', 'nike.co.nz',
  'nz.puma.com', 'newbalance.co.nz', 'underarmour.co.nz',
  'asics.com', 'lululemon.co.nz', 'kathmandu.co.nz', 'macpac.co.nz',
  'icebreaker.com', 'allbirds.co.nz', 'converse.co.nz', 'vans.co.nz',
  'timberland.co.nz', 'thenorthface.co.nz', 'salomon.co.nz',
  'brooksrunning.co.nz', 'oakley.com', 'ray-ban.com',
  'tesla.com', 'ryobi.co.nz', 'makita.co.nz', 'dewalt.co.nz',
  'milwaukeetool.co.nz', 'bauerfeind',
];

// URL path patterns — content/blog pages not product pages
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

// ── JEWELLERY / WATCH RETAILERS ───────────────────────────────────────────────
// When a product is jewellery or a watch, ONLY use these NZ retailers
const JEWELLERY_RETAILERS = [
  'michaelhill', 'pascoes', 'stuartdawsons', 'stewartdawsons',
  'walkerandhall', 'goldsmithsgallery', 'preciousmetals',
  'citywatches', 'pandora', 'swarovski', 'silvermoon',
  'thevillagegoldsmith', 'meadowlark', 'karenwalker',
  'zoeandmorgan', 'bohrunga', 'stolengirlfriends',
  'orsinijewellers', 'sutcliffejewellery', 'diamonds.co.nz',
  'silkandsteel', 'stonexjewellers', 'partridgejewellers', 'goldmark',
];

const JEWELLERY_KEYWORDS = [
  'watch', 'watches', 'ring', 'rings', 'necklace', 'bracelet',
  'jewellery', 'jewelry', 'earring', 'pendant', 'gold', 'silver',
  'diamond', 'gemstone', 'mechanical watch', 'automatic watch',
  'smartwatch', 'timepiece',
];

function isJewelleryProduct(name, type) {
  const combined = `${name} ${type}`.toLowerCase();
  return JEWELLERY_KEYWORDS.some(k => combined.includes(k));
}

function isJewelleryRetailer(url) {
  const lower = url.toLowerCase();
  return JEWELLERY_RETAILERS.some(r => lower.includes(r));
}

// ── POWER TOOL RETAILERS ──────────────────────────────────────────────────────
const POWER_TOOL_RETAILERS = [
  'mitre10', 'bunnings', 'toolshed', 'hammerhardware',
  'repco', 'supercheap', 'stihlshop', 'riequip', 'tradetested',
  'totaltools', 'nztoolshed', 'toolmaster',
];

function isPowerToolRetailer(url) {
  return POWER_TOOL_RETAILERS.some(r => url.toLowerCase().includes(r));
}

// ── BUDGET HELPERS ────────────────────────────────────────────────────────────
function getBudgetRange(budget) {
  if (budget <= 30)  return [0,   30];
  if (budget <= 50)  return [30,  50];
  if (budget <= 100) return [50,  100];
  if (budget <= 200) return [100, 200];
  if (budget <= 300) return [200, 300];
  if (budget <= 500) return [300, 500];
  return [500, 9999];
}

// ── POST-CLAUDE BUDGET VALIDATION ─────────────────────────────────────────────
// Claude sometimes ignores budget. This catches it before Serper runs.
function isBudgetCompliant(productName, budgetMin, budgetMax, budgetIsOpen) {
  // We can't check price before Serper — handled in Serper price filter instead
  // This is a placeholder for future price pre-check
  return true;
}

function getMatchableDomain(url) {
  try {
    return new URL(url).hostname
      .replace('www.', '').replace('.co.nz', '').replace('.com', '').replace('.co', '')
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
  const budgetIsOpen = budget >= 500;
  const budgetLabel = budgetIsOpen ? 'NZ$500+' : `NZ$${budgetMin}–$${budgetMax}`;

  // Crystal clear budget instruction — repeated multiple ways so Claude cannot miss it
  const budgetInstruction = budgetIsOpen
    ? `ALL products MUST be NZ$500 or above. A $1000 laptop is fine. A $200 phone case is NOT.`
    : `ALL products MUST be priced between NZ$${budgetMin} and NZ$${budgetMax}. A NZ$${budgetMax + 50} product is NOT acceptable. A NZ$${budgetMin - 10} product is NOT acceptable. Stay within range.`;

  const refreshVariations = [
    '',
    'Find 3 DIFFERENT product categories — still matching same vibe, person and interests.',
    'Suggest ALTERNATIVE ideas — different from previous results but matching vibe, person, interests.',
    'Focus on NICHE or specialist products matching the same vibe and interests.',
    'Suggest PREMIUM best-in-class versions still matching vibe, person and interests.',
    'Think EXPERIENTIAL or lifestyle products — same vibe, person and interests.',
  ];
  const refreshInstruction = refreshSeed > 0
    ? (refreshVariations[refreshSeed] || refreshVariations[refreshVariations.length - 1])
    : '';

  // ── STEP 1: Claude Haiku → product recommendations ────────────────────────

  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine for the New Zealand retail market.

Recommend exactly 3 products available in NZ stores in 2025/2026.

STRICT RULES:
- Exactly 3 products, single items only — NO bundles or combo packs
- GENERIC product names only — NO brand names on display name
- Current 2025/2026 products only

BUDGET — THIS IS THE MOST IMPORTANT RULE:
${budgetInstruction}
Budget range: ${budgetLabel}
If you recommend a product outside this budget range, you have FAILED. Check every product against the budget before outputting.

- VIBE: Always respect the stated vibe — it guides every recommendation
- INTERESTS: If interests are provided, recommendations MUST match them
- Sporty vibe: sport/fitness only
- Luxe vibe: premium NZ mainstream stores
- Wallets: ALWAYS RFID-blocking
- Tools/hardware: Mitre 10, Bunnings, The Tool Shed
- Fragrance: Chemist Warehouse or online perfume — NOT Farmers
- Jewellery/watches: Michael Hill, Pascoes, Stuart Dawsons, Walker & Hall, City Watches only
- NEVER recommend alcohol
- searchQuery: 2-4 words, generic, no brands
- reviewQuery: "best [product] NZ review 2025 under $X" or "over $500" if budget is $500+
- Return ONLY valid JSON, no preamble, no markdown

OUTPUT FORMAT:
{
  "products": [
    {
      "name": "Generic Product Name",
      "type": "Product Category",
      "reason": "1-2 sentences why perfect",
      "searchQuery": "short generic term",
      "reviewQuery": "best [type] NZ review 2025 under/over $X",
      "estimatedPrice": 150
    }
  ]
}`;

  const userPrompt = `Find 3 gift recommendations:
- Shopping for: ${shoppingFor}
- Who: ${whoFor}
- Vibe: ${vibe}
- Budget: ${budgetLabel}
- Occasion: ${occasion}
- Interests: ${interests || 'Not specified'}
${refreshInstruction ? `\nVariety (keep vibe/person/interests): ${refreshInstruction}` : ''}
${excludeProducts.length > 0 ? `\nDO NOT repeat these already shown: ${excludeProducts.join(', ')}` : ''}

CRITICAL BUDGET CHECK: Every product estimate must be between ${budgetIsOpen ? 'NZ$500 and NZ$2000' : `NZ$${budgetMin} and NZ$${budgetMax}`}.
Vibe is "${vibe}". Interests are "${interests || 'not specified'}". Both must be respected.`;

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
    const parsed = JSON.parse(clean);
    products = parsed.products;
    if (!Array.isArray(products) || products.length === 0) throw new Error('No products returned');

    // ── POST-CLAUDE BUDGET ENFORCEMENT ────────────────────────────────────────
    // If Claude returned an estimatedPrice outside budget, flag it
    // (We'll also filter by price in Serper step but this catches obvious misses)
    products = products.filter(p => {
      if (!p.estimatedPrice) return true; // no estimate — let it through
      const est = parseFloat(p.estimatedPrice);
      if (budgetIsOpen) return est >= 400; // allow some flex for 500+
      return est >= budgetMin * 0.8 && est <= budgetMax * 1.3; // 30% flex each way
    });

    // If all filtered out, use originals (better than returning nothing)
    if (products.length === 0) products = parsed.products;

    // Trim to 3
    products = products.slice(0, 3);

  } catch (err) {
    console.error('Claude error:', err);
    return res.status(500).json({ error: `AI failed: ${err.message}` });
  }

  // ── STEP 2: Serper enrichment ─────────────────────────────────────────────

  const enriched = await Promise.all(products.map(async (product) => {
    try {
      const searchTerm = product.searchQuery || product.name;
      const reviewQuery = product.reviewQuery || `best ${searchTerm} NZ review 2025`;
      const budgetHint = budgetIsOpen ? 'over $500' : `under $${budgetMax}`;
      const negatives = '-site:nzherald.co.nz -site:stuff.co.nz -site:rnz.co.nz -site:temu.com -site:aliexpress.com -site:pricespy.co.nz';
      const isJewellery = isJewelleryProduct(product.name, product.type || '');

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

      // ── Filter organic results ─────────────────────────────────────────────
      const organicItems = (organicData.organic || []).filter(item => {
        if (!item.link) return false;
        if (isBlacklisted(item.link)) return false;
        const url = item.link.toLowerCase();

        // Reject .nz-only (not .co.nz)
        const isNZOnly = /\.nz(\/|$)/.test(url) && !url.includes('.co.nz');
        if (isNZOnly) return false;

        // For jewellery/watches — ONLY allow known NZ jewellery retailers
        if (isJewellery) return isJewelleryRetailer(url);

        // For everything else — standard NZ retailer check
        return url.includes('.co.nz') ||
          url.includes('mightyape') || url.includes('pbtech') ||
          url.includes('stirlingsports') || url.includes('torpedo7') ||
          url.includes('hallensteins') || url.includes('glassons') ||
          url.includes('luggage.co') || isPowerToolRetailer(url);
      });

      // ── Deduplicate by domain — Warehouse held back ────────────────────────
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

      // ── Shopping price map ─────────────────────────────────────────────────
      const shoppingPriceMap = {};
      for (const item of (shoppingData.shopping || [])) {
        if (!item.price) continue;
        if (isBlacklisted(item.source || '')) continue;
        if (isBlacklisted(item.link || '')) continue;
        const rawPrice = parseFloat((item.price || '0').replace(/[^0-9.]/g, '')) || 0;
        if (rawPrice < 3) continue;

        // ── BUDGET PRICE FILTER on shopping results ────────────────────────
        // Only include shopping prices that are within budget range
        // This prevents wildly out-of-range prices polluting the display
        if (!budgetIsOpen && (rawPrice < budgetMin * 0.5 || rawPrice > budgetMax * 2)) continue;
        if (budgetIsOpen && rawPrice < 300) continue; // sanity floor for 500+

        if (item.source) {
          const sk = item.source.toLowerCase().replace(/\s+/g, '').replace('.co.nz','').replace('.com','');
          if (!shoppingPriceMap[sk]) shoppingPriceMap[sk] = { price: item.price, rawPrice, source: item.source };
        }
        if (item.link && !isBlacklisted(item.link)) {
          const dk = getMatchableDomain(item.link);
          if (dk && !shoppingPriceMap[dk]) shoppingPriceMap[dk] = { price: item.price, rawPrice, source: item.source || dk };
        }
      }

      // ── Buy button ─────────────────────────────────────────────────────────
      const bestOrganic = uniqueOrganic[0] || null;
      const buyLink = bestOrganic?.link || null;
      const buyDomain = bestOrganic?._domain || null;
      const bestStoreName = buyDomain ? buyDomain.charAt(0).toUpperCase() + buyDomain.slice(1) : null;

      // ── Price matching ─────────────────────────────────────────────────────
      let price = null;
      let priceIsMatched = false;

      if (buyDomain) {
        const exact = shoppingPriceMap[buyDomain];
        if (exact) { price = Math.round(exact.rawPrice).toString(); priceIsMatched = true; }
        else {
          const pk = Object.keys(shoppingPriceMap).find(k => k.includes(buyDomain) || buyDomain.includes(k));
          if (pk) { price = Math.round(shoppingPriceMap[pk].rawPrice).toString(); priceIsMatched = true; }
        }
      }

      // Fallback price — in-budget only
      if (!price) {
        const fallback = Object.values(shoppingPriceMap)
          .filter(p => budgetIsOpen ? p.rawPrice >= 500 : p.rawPrice >= budgetMin && p.rawPrice <= budgetMax * 1.2)
          .sort((a, b) => a.rawPrice - b.rawPrice);
        if (fallback.length > 0) { price = Math.round(fallback[0].rawPrice).toString(); priceIsMatched = false; }
      }

      // ── Store chips — name only, NO price, NO duplicates ──────────────────
      // FIX: run a fresh domain check so chips never duplicate the buy button domain
      const chipSeenDomains = new Set();
      if (buyDomain) chipSeenDomains.add(buyDomain); // exclude buy button domain from chips

      const warehouseForChips = warehouseItems.filter(item => {
        if (chipSeenDomains.has(item._domain)) return false;
        const wEntry = shoppingPriceMap[item._domain] ||
          Object.entries(shoppingPriceMap).find(([k]) => k.includes('warehouse'))?.[1];
        if (!wEntry) return false;
        const cheapest = Object.values(shoppingPriceMap)
          .filter(p => p.rawPrice >= budgetMin).sort((a,b) => a.rawPrice - b.rawPrice)[0];
        return cheapest && wEntry.rawPrice <= cheapest.rawPrice * 1.05;
      });

      const stores = [];
      for (const item of [...uniqueOrganic.slice(1, 5), ...warehouseForChips]) {
        const d = item._domain;
        if (!d || chipSeenDomains.has(d)) continue; // FIX: strict dedup
        chipSeenDomains.add(d);
        stores.push({ name: d.charAt(0).toUpperCase() + d.slice(1), link: item.link });
        if (stores.length >= 3) break;
      }

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
        stores,
        storeCount: uniqueOrganic.length
      };

    } catch (err) {
      console.error(`Serper error for ${product.name}:`, err);
      return {
        name: product.name, type: product.type, reason: product.reason,
        price: null, priceIsMatched: false, bestStoreName: null,
        buyLink: null, imageUrl: null, stores: [], storeCount: 0
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
          ${p.stores && p.stores.length > 0 ? `<div style="margin-top:10px;font-size:12px;color:#9a8878;">Also try: ${p.stores.map(s => `<a href="${s.link}" style="color:#c8922a;">${s.name}</a>`).join(' · ')}</div>` : ''}
        </div>`).join('');

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
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
    <strong style="color:#3d2b1a;">📋 A note from ShopGenieAI:</strong> We search NZ retailers in real-time. Prices are approximate — confirm on the retailer's site before buying.
  </div>
  <div style="text-align:center;margin-bottom:32px;">
    <a href="https://shopgenieai.com" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">Find More Gifts 🧞</a>
  </div>
  <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">Kiwi Made 🇳🇿 · ShopGenieAI</div>
</div></body></html>`;

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
