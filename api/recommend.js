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
  // Junk marketplaces & cheap import sites
  'temu', 'aliexpress', 'wish.com', 'dhgate', 'banggood', 'shein',
  'ebay', 'amazon.com', 'alibaba', 'lightinthebox', 'joom',
  // AU retailers
  '.com.au',
  // Blacklisted NZ retailers
  'dicksmith', 'kogan', 'theiconic', 'trademe', 'lego.com',
  'tommy.com', 'farfetch', 'net-a-porter',
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
];

function isBlacklisted(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return BLACKLISTED_DOMAINS.some(d => lower.includes(d));
}

// Budget range helper — returns [min, max] for a given budget sentinel value
function getBudgetRange(budget) {
  if (budget <= 30)  return [0,   30];
  if (budget <= 50)  return [30,  50];
  if (budget <= 100) return [50,  100];
  if (budget <= 200) return [100, 200];
  if (budget <= 300) return [200, 300];
  if (budget <= 500) return [300, 500];
  return [500, 99999];
}

// Extract matchable domain key e.g. "www.thewarehouse.co.nz" → "thewarehouse"
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

// Check if a URL is The Warehouse
function isWarehouse(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('thewarehouse') || lower.includes('warehouse.co.nz');
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

  const [budgetMin, budgetMax] = getBudgetRange(budget);
  const budgetLabel = budget >= 500 ? 'NZ$500+' : `NZ$${budgetMin}–$${budgetMax}`;
  const budgetInstruction = budget >= 500
    ? 'Products MUST be priced NZ$500 or above. Do not recommend anything under NZ$500.'
    : `Products MUST be priced between NZ$${budgetMin} and NZ$${budgetMax}. Do not recommend anything outside this range.`;

  // ── STEP 1: Claude Haiku → product recommendations ────────────────────────

  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine for the New Zealand retail market.

Recommend exactly 3 products available in NZ stores in 2025/2026.

STRICT RULES:
- Exactly 3 products, single items only — NO bundles or combo packs
- Use GENERIC product names — NO brand names
  GOOD: "Wireless Bluetooth Speaker", "Electric Shaver", "Basketball", "RFID Leather Wallet"
  BAD: "JBL Go 3", "Braun Series 7", "Spalding NBA Basketball", "Tommy Hilfiger Wallet"
- Current 2025/2026 products only — nothing discontinued or outdated
- BUDGET HARD RULE: ${budgetInstruction} This is non-negotiable.
- Vibe "Sporty": sport/fitness products only
- Vibe "Luxe": premium products available in NZ mainstream stores
- Vibe "Quirky/Fun": fun unique items at NZ mainstream retailers
- Wallets: ALWAYS recommend RFID-blocking wallets
- For hardware/tools: recommend products from Mitre 10, Bunnings, The Tool Shed
- For fragrance: products at Chemist Warehouse or online perfume stores — NOT Farmers
- NEVER recommend alcohol, wine, beer, spirits or any alcoholic products under any circumstances
- searchQuery must be SHORT GENERIC 2-4 words, NO brand names, relevant to the budget range
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
- Budget: ${budgetLabel} — HARD RULE: ${budgetInstruction}
- Occasion: ${occasion}
- Interests: ${interests || 'Not specified'}

Use GENERIC product names only. No brand names. Every product MUST be within the stated budget range.`;

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

  // ── STEP 2: Serper → NZ retail search with retailer-matched pricing ────────
  //
  // KEY PRINCIPLE: price shown on card = price from the SAME retailer as buy button.
  //   1. Organic /search  → direct NZ retailer URLs (buy button)
  //   2. Shopping /shopping → prices keyed by retailer domain
  //   3. Match buy button domain → shopping price map
  //   4. Matched price = "NZ$X" | Unmatched fallback = "from NZ$X"
  //
  // WAREHOUSE RULE: The Warehouse has a 2-week delivery/pickup time via Market Online.
  // Only use as buy button if absolutely no other NZ retailer is found.
  // Must have best price to appear as a store chip.

  const enriched = await Promise.all(products.map(async (product) => {
    try {
      const searchTerm = product.searchQuery || product.name;
      const budgetHint = budget >= 500 ? 'over $500' : `under $${budgetMax}`;
      const organicQuery = `${searchTerm} buy NZ ${budgetHint} -site:nzherald.co.nz -site:stuff.co.nz -site:rnz.co.nz -site:newshub.co.nz -site:temu.com -site:aliexpress.com`;

      const [organicRes, shoppingRes, imageRes] = await Promise.all([
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: organicQuery, gl: 'nz', hl: 'en', num: 10 })
        }),
        fetch('https://google.serper.dev/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: `${searchTerm} NZ`, gl: 'nz', hl: 'en', num: 10 })
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

      // ── 1. Filter organic results ────────────────────────────────────────────
      // Strict .co.nz rule — .nz only domains are NOT NZ-based retailers
      const organicItems = (organicData.organic || []).filter(item => {
        if (!item.link) return false;
        if (isBlacklisted(item.link)) return false;
        const url = item.link.toLowerCase();

        // Must be .co.nz OR a known NZ retailer with non-.co.nz domain
        const isNZRetailer =
          url.includes('.co.nz') ||
          url.includes('mightyape') ||
          url.includes('pbtech') ||
          url.includes('stirlingsports') ||
          url.includes('torpedo7') ||
          url.includes('hallensteins') ||
          url.includes('glassons') ||
          url.includes('luggage.co');

        // Reject .nz-only domains — these are NOT genuine NZ retailers
        const isNZOnly = /\.nz(\/|$)/.test(url) && !url.includes('.co.nz');

        return isNZRetailer && !isNZOnly;
      });

      // ── 2. Deduplicate by domain, hold Warehouse back ────────────────────────
      const seenDomains = new Set();
      const uniqueOrganic = [];
      const warehouseItems = []; // held back — last resort only

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

      // Only use Warehouse as buy button if fewer than 2 other NZ retailers found
      if (uniqueOrganic.length < 2) {
        uniqueOrganic.push(...warehouseItems);
      }

      // ── 3. Build price map from shopping results, keyed by domain ────────────
      const shoppingPriceMap = {};
      for (const item of (shoppingData.shopping || [])) {
        if (!item.price) continue;
        if (isBlacklisted(item.source || '')) continue;
        if (isBlacklisted(item.link || '')) continue;
        const rawPrice = parseFloat((item.price || '0').replace(/[^0-9.]/g, '')) || 0;
        if (rawPrice < 3) continue; // kill Temu/AliExpress bleed-through

        // Key by source name (stripped)
        if (item.source) {
          const sourceKey = item.source.toLowerCase()
            .replace(/\s+/g, '').replace('.co.nz', '').replace('.com', '');
          if (!shoppingPriceMap[sourceKey]) {
            shoppingPriceMap[sourceKey] = { price: item.price, rawPrice, source: item.source };
          }
        }
        // Key by link domain
        if (item.link && !isBlacklisted(item.link)) {
          const domainKey = getMatchableDomain(item.link);
          if (domainKey && !shoppingPriceMap[domainKey]) {
            shoppingPriceMap[domainKey] = { price: item.price, rawPrice, source: item.source || domainKey };
          }
        }
      }

      // ── 4. Buy button = first clean organic result ───────────────────────────
      const bestOrganic = uniqueOrganic[0] || null;
      const buyLink = bestOrganic?.link || null;
      const buyDomain = bestOrganic?._domain || null;
      const bestStoreName = buyDomain
        ? buyDomain.charAt(0).toUpperCase() + buyDomain.slice(1)
        : null;

      // ── 5. Price: match buy button domain to shopping price map ─────────────
      let price = null;
      let priceIsMatched = false;

      if (buyDomain) {
        // Exact domain match
        const exact = shoppingPriceMap[buyDomain];
        if (exact) {
          price = Math.round(exact.rawPrice).toString();
          priceIsMatched = true;
        } else {
          // Partial match (e.g. "noelleeming" matches "noelleeminggroup")
          const partialKey = Object.keys(shoppingPriceMap).find(k =>
            k.includes(buyDomain) || buyDomain.includes(k)
          );
          if (partialKey) {
            price = Math.round(shoppingPriceMap[partialKey].rawPrice).toString();
            priceIsMatched = true;
          }
        }
      }

      // ── 6. Fallback: best in-budget price from shopping if no match ──────────
      if (!price) {
        const fallbackPrices = Object.values(shoppingPriceMap)
          .filter(p => {
            if (budget >= 500) return p.rawPrice >= 500;
            return p.rawPrice >= budgetMin && p.rawPrice <= budgetMax * 1.2;
          })
          .sort((a, b) => a.rawPrice - b.rawPrice);

        if (fallbackPrices.length > 0) {
          price = Math.round(fallbackPrices[0].rawPrice).toString();
          priceIsMatched = false; // label as "from NZ$X" on the card
        }
      }

      // ── 7. Other store chips ─────────────────────────────────────────────────
      // For Warehouse: only show as a chip if it has the best price
      const otherOrganicForChips = uniqueOrganic.slice(1, 5); // grab extra in case Warehouse gets filtered

      // Also consider Warehouse items for chips if they have a good price
      const warehouseForChips = warehouseItems.filter(item => {
        const wDomain = item._domain;
        const wPriceEntry = shoppingPriceMap[wDomain] ||
          Object.values(shoppingPriceMap).find((_, k) =>
            typeof k === 'string' && (k.includes('warehouse') || wDomain.includes(k))
          );
        if (!wPriceEntry) return false;
        // Only include Warehouse chip if it's the cheapest option
        const cheapest = Object.values(shoppingPriceMap)
          .filter(p => p.rawPrice >= budgetMin)
          .sort((a, b) => a.rawPrice - b.rawPrice)[0];
        return cheapest && wPriceEntry.rawPrice <= cheapest.rawPrice * 1.05; // within 5% of cheapest
      });

      const chipsPool = [...otherOrganicForChips, ...warehouseForChips].slice(0, 3);

      const stores = chipsPool.map(item => {
        const storeName = item._domain
          ? item._domain.charAt(0).toUpperCase() + item._domain.slice(1)
          : null;

        let storePrice = null;
        const exact = shoppingPriceMap[item._domain];
        if (exact) {
          storePrice = exact.price;
        } else {
          const partialKey = Object.keys(shoppingPriceMap).find(k =>
            k.includes(item._domain) || item._domain.includes(k)
          );
          if (partialKey) storePrice = shoppingPriceMap[partialKey].price;
        }

        return { name: storeName, link: item.link, price: storePrice };
      }).filter(s => s.name && s.link);

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
        stores
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
              ${p.price
                ? `<div style="font-size:18px;font-weight:700;color:#3d2b1a;">${p.priceIsMatched ? '' : 'from '}NZ$${p.price}<span style="font-size:12px;color:#a89480;font-weight:400;margin-left:4px;">approx.</span></div>`
                : ''}
              ${p.bestStoreName ? `<div style="font-size:12px;color:#9a8878;">at ${p.bestStoreName}</div>` : ''}
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
      console.log(`Email sent to ${email}`);
    } catch (emailErr) {
      console.error('Brevo email error:', emailErr);
    }
  }

  return res.status(200).json({ products: enriched });
}
