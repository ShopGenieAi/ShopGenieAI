// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — recommend.js
// Architecture: Claude → NormalizeQuery → Smart Retailer Routing + Google Shopping chips
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
  'low':    { min: 0,   max: 50,   label: 'Low Budget 🤑',            hint: 'affordable, everyday essentials'              },
  'medium': { min: 50,  max: 150,  label: 'Medium Budget 💸',         hint: 'mid-range quality brands'                     },
  'high':   { min: 150, max: 300,  label: 'High Budget 🎯',           hint: 'premium, high-end, or designer versions'      },
  'bigwed': { min: 300, max: 400,  label: 'Big Wednesday Spender 🎰', hint: 'luxury, tech-heavy, or top-tier models'       },
  'lotto':  { min: 500, max: 9999, label: 'OMG You Won Lotto 🎉',     hint: 'ultra-premium, elite luxury items'            },
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
const NZ_TERM_MAP = [
  ['cell phone','mobile phone'],['smartphone','mobile phone'],['smart phone','mobile phone'],
  ['sport watch','smart watch'],['sports watch','smart watch'],['fitness watch','activity tracker'],
  ['activity tracker','activity tracker'],['smartwatch','smart watch'],
  ['airpods','wireless earbuds'],['earbuds','wireless earbuds'],['earphones','wireless earbuds'],
  ['in-ear headphones','wireless earbuds'],['laptop computer','laptop'],['notebook computer','laptop'],
  ['tablet computer','tablet'],['e-reader','ereader'],['smart speaker','bluetooth speaker'],
  ['bluetooth headset','bluetooth headphones'],['noise cancelling','noise cancelling headphones'],
  ['wireless charger','wireless charger'],['power bank','portable charger'],
  ['dash cam','dashcam'],['dash camera','dashcam'],
  ['sneakers','running shoes'],['tennis shoes','running shoes'],['athletic shoes','running shoes'],
  ['trainers','running shoes'],['flip flops','jandals'],['thongs','jandals'],
  ['bathing suit','togs'],['swimsuit','togs'],['swimming costume','togs'],['swimwear','togs'],
  ['sweater','jersey'],['pullover','jersey'],['sweatshirt','hoodie'],
  ['underwear','undies'],['panties','undies'],
  ['activewear set','activewear'],['gym wear','activewear'],['workout clothes','activewear'],
  ['waterproof jacket','rain jacket'],['puffer jacket','puffer jacket'],['down jacket','puffer jacket'],
  ['beanie hat','beanie'],['woolen hat','beanie'],['knit cap','beanie'],
  ['comforter','duvet'],['bedding set','bed linen'],['sheets set','bed sheets'],
  ['trash can','rubbish bin'],['garbage bin','rubbish bin'],['faucet','tap'],['countertop','benchtop'],
  ['couch','sofa'],['loveseat','sofa'],['area rug','floor rug'],['throw pillow','cushion'],
  ['picture frame','photo frame'],['laundry hamper','laundry basket'],
  ['flashlight','torch'],['flash light','torch'],['yard tools','garden tools'],
  ['pressure washer','water blaster'],['power washer','water blaster'],
  ['weed killer','weed spray'],['fertilizer','fertiliser'],
  ['diapers','nappies'],['diaper','nappies'],['pacifier','dummy'],['soother','dummy'],
  ['stroller','pram'],['baby carriage','pram'],['car seat','baby car seat'],
  ['gym bag','sports bag'],['duffel bag','sports bag'],['duffle bag','sports bag'],
  ['exercise mat','yoga mat'],['resistance bands','resistance bands'],
  ['water bottle insulated','drink bottle'],['hydro flask','drink bottle'],
  ['water bottle','drink bottle'],['drink bottle','drink bottle'],
  ['running backpack','hydration pack'],['tennis racquet','tennis racket'],
  ['soccer ball','football'],['soccer cleats','football boots'],['soccer boots','football boots'],
  ['shin guards','shin pads'],['swim goggles','swimming goggles'],
  ['cycling helmet','bike helmet'],['bicycle helmet','bike helmet'],
  ['soda','soft drink'],['candy','lollies'],['sweets','lollies'],
  ['potato chips','crisps'],['cookies','biscuits'],['cookie','biscuits'],
  ['fanny pack','bum bag'],['hip pack','bum bag'],['waist bag','bum bag'],
  ['rfid wallet','rfid wallet'],['mens wallet','leather wallet'],['womens wallet','purse wallet'],
  ['bug spray','insect repellent'],['stuffed animal','soft toy'],['teddy bear','soft toy'],
  ['cologne','mens fragrance'],['body wash set','body wash gift set'],
  ['skincare set','skincare gift set'],['makeup kit','makeup gift set'],
  ['hair dryer','hair dryer'],['hair straightener','hair straightener'],
  ['electric toothbrush','electric toothbrush'],['luggage set','suitcase'],
  ['carry on luggage','carry on bag'],['passport holder','passport wallet'],
  ['board game','board game'],['card game','card game'],['perfume','perfume'],
];

function normalizeQuery(rawQuery) {
  if (!rawQuery) return rawQuery;
  const lower = rawQuery.toLowerCase().trim();
  for (const [trigger, nzTerm] of NZ_TERM_MAP) {
    if (lower.includes(trigger)) return nzTerm;
  }
  return lower
    .replace(/\b(nike|adidas|apple|samsung|sony|lg|philips|dyson|breville|delonghi|nespresso|tefal|sunbeam|garmin|fitbit)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || rawQuery;
}

// ── SMART RETAILER ROUTING ────────────────────────────────────────────────────
// Matches product TYPE to the right NZ retailer
// Noel Leeming is NOT right for everything — weight vests, sports gear, tools need different stores

function detectProductCategory(name, type) {
  const s = (name + ' ' + type).toLowerCase();
  if (/headphone|earbud|speaker|audio|bluetooth|tv|television|laptop|tablet|phone|camera|projector|smart watch|smartwatch|gaming/.test(s)) return 'tech';
  if (/massage gun|weight vest|foam roller|resistance|yoga|protein|hydration|activity tracker|fitness tracker|swim goggle|bike helmet/.test(s)) return 'fitness';
  if (/hiking|camping|hammock|tent|trekking|kayak|fishing|hunting|waterproof jacket|head torch|sleeping bag|multi-tool|dry bag|binoculars/.test(s)) return 'outdoor';
  if (/dress|jacket|hoodie|jersey|jandals|togs|boots|running shoes|sneakers|beanie|activewear|fashion|jewellery|handbag|wallet|tote|belt bag/.test(s)) return 'fashion';
  if (/drill|saw|bunnings|mitre|tool kit|torch|water blaster|garden/.test(s)) return 'tools';
  if (/cookware|kitchen|air fryer|blender|coffee|toaster|duvet|linen|candle|cushion|vase|photo frame/.test(s)) return 'home';
  if (/perfume|cologne|skincare|makeup|beauty|lipstick|moisturiser|shampoo|conditioner|serum|fragrance/.test(s)) return 'beauty';
  if (/board game|puzzle|book|toy|novelty|gadget|stationery|lollies/.test(s)) return 'general';
  return 'general';
}

function buildBuyLink(cleanSearchTerm, productName, productType, budgetTierKey, budgetMin, budgetMax) {
  const category = detectProductCategory(productName, productType);
  const q = encodeURIComponent(cleanSearchTerm);

  // ── COMPLETE RETAILER ROUTING — all budgets, all categories ──────────────
  // Tech & Electronics
  if (category === 'tech') {
    if (['high','bigwed','lotto'].includes(budgetTierKey))
      return { url: `https://www.noelleeming.co.nz/search?q=${q}`, storeName: 'Noel Leeming' };
    if (budgetTierKey === 'medium')
      return { url: `https://www.jbhifi.co.nz/search?q=${q}`, storeName: 'JB Hi-Fi' };
    // low — The Warehouse is fine for cheap tech
    return { url: `https://www.thewarehouse.co.nz/search?q=${q}&priceTo=${budgetMax}`, storeName: 'The Warehouse' };
  }

  // Fitness & Sports gear — Google Shopping NZ (reliable, shows prices, multiple retailers)
  // site: operator doesn't work in tbm=shop mode — broad Google Shopping is the reliable option
  if (category === 'fitness') {
    return { url: `https://www.google.com/search?q=${q}+NZ&tbm=shop&gl=nz&hl=en`, storeName: 'Google Shopping NZ' };
  }

  // Outdoor & Adventure — Torpedo7 all budgets, Warehouse for low
  if (category === 'outdoor') {
    if (budgetTierKey === 'low')
      return { url: `https://www.thewarehouse.co.nz/search?q=${q}&priceTo=${budgetMax}`, storeName: 'The Warehouse' };
    return { url: `https://www.torpedo7.co.nz/search?q=${q}`, storeName: 'Torpedo7' };
  }

  // Fashion & Clothing
  if (category === 'fashion') {
    if (['high','bigwed','lotto'].includes(budgetTierKey))
      return { url: `https://www.farmers.co.nz/search?q=${q}`, storeName: 'Farmers' };
    if (budgetTierKey === 'medium')
      return { url: `https://www.glassons.com/search?q=${q}`, storeName: 'Glassons' };
    // low
    return { url: `https://www.thewarehouse.co.nz/search?q=${q}&priceTo=${budgetMax}`, storeName: 'The Warehouse' };
  }

  // Beauty & Health — tiered by budget
  if (category === 'beauty') {
    if (['high', 'bigwed', 'lotto'].includes(budgetTierKey))
      return { url: `https://www.mecca.com/en-nz/search/?q=${q}`, storeName: 'Mecca' };
    if (budgetTierKey === 'medium')
      return { url: `https://www.sephora.nz/search?q=${q}`, storeName: 'Sephora' };
    return { url: `https://www.chemistwarehouse.co.nz/search?q=${q}`, storeName: 'Chemist Warehouse' };
  }

  // Books & Stationery — Whitcoulls across all budgets
  if (category === 'books') {
    return { url: `https://www.whitcoulls.co.nz/search?q=${q}`, storeName: 'Whitcoulls' };
  }

  // Home & Kitchen — Briscoes for medium+, Kmart for low
  if (category === 'home') {
    if (budgetTierKey === 'low')
      return { url: `https://www.kmart.co.nz/search?q=${q}`, storeName: 'Kmart' };
    return { url: `https://www.briscoes.co.nz/search?q=${q}`, storeName: 'Briscoes' };
  }

  // Tools & Hardware — Bunnings across all budgets
  if (category === 'tools') {
    return { url: `https://www.bunnings.co.nz/search/products?q=${q}`, storeName: 'Bunnings' };
  }

  // General fallback — The Warehouse with price filter
  const base = `https://www.thewarehouse.co.nz/search?q=${q}`;
  let url = base;
  if (budgetMin > 0 && budgetMax < 9999) url += `&priceFrom=${budgetMin}&priceTo=${budgetMax}`;
  return { url, storeName: 'The Warehouse' };
}

function buildShoppingChips(richSearchTerm, budgetHint) {
  return [
    { name: '🛒 Shop NZ',        link: `https://www.google.com/search?q=${encodeURIComponent(richSearchTerm + ' NZ')}&tbm=shop&gl=nz&hl=en` },
    { name: '💰 Compare Prices', link: `https://www.google.com/search?q=${encodeURIComponent(richSearchTerm + ' buy NZ')}&tbm=shop&gl=nz&hl=en` },
    { name: '⭐ Top Rated',       link: `https://www.google.com/search?q=${encodeURIComponent('best ' + richSearchTerm + ' NZ')}&tbm=shop&gl=nz&hl=en` },
  ];
}

// ── BRAVE IMAGE SEARCH ────────────────────────────────────────────────────────
async function getBraveImage(searchTerm, braveKey) {
  if (!braveKey) return null;
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(searchTerm + ' product')}&count=3&safesearch=strict`,
      { headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': braveKey } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const r of (data?.results || [])) {
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

  const { email, shoppingFor, whoFor, vibe, budgetTier, occasion, interests, refreshSeed = 0, excludeProducts = [] } = req.body;

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

  // ── PRICE-CORRECTED VIBE POOLS (NZ 2026) ─────────────────────────────────
  // GPS Running Watch removed from High tier — costs $350+ in NZ
  // Smart Watch moved to BigWed/Lotto only
  const vibeCategoryPools = {
    'Sporty': {
      low:    ['foam roller','resistance bands','skipping rope','sports socks','swim goggles','volleyball','football','frisbee','headband','sports water bottle'],
      medium: ['yoga mat','sports bag','protein shaker','hydration pack','bike helmet','running cap','compression socks','swim goggles','football boots','shin pads'],
      high:   ['massage gun','activity tracker','technical hoodie','portable speaker','weight vest','trail running shoes','cycling shorts','sports sunglasses','foam roller pro','recovery slides'],
      bigwed: ['gps running watch','noise cancelling headphones','smart watch','premium running shoes','wireless earbuds pro','high end sports bag'],
      lotto:  ['premium smart watch','garmin fenix','polar vantage','premium headphones','high end cycling gear'],
    },
    'Techy': {
      low:    ['phone case','usb hub','cable organiser','screen cleaner','phone stand','laptop stand','webcam cover','cable clips'],
      medium: ['wireless earbuds','portable charger','bluetooth speaker','phone stand','smart home device','usb hub','webcam','laptop stand'],
      high:   ['bluetooth headphones','portable speaker','smart home device','noise cancelling earbuds','tablet stand','ring light','mechanical keyboard'],
      bigwed: ['noise cancelling headphones','smart watch','tablet','portable projector','premium bluetooth speaker'],
      lotto:  ['premium smart watch','high end headphones','ipad','premium laptop accessories','dyson airwrap'],
    },
    'Eco-friendly': {
      low:    ['reusable drink bottle','bamboo toothbrush set','beeswax wraps','organic cotton tote','seed kit'],
      medium: ['keep cup','natural soap set','recycled notebook','plant pot','compostable lunch kit','organic skincare set'],
      high:   ['premium reusable bottle','quality tote bag','organic cotton bedding','natural perfume set','eco cookware'],
      bigwed: ['quality eco cookware','organic cashmere throw','premium natural skincare set','sustainable fashion item'],
      lotto:  ['luxury organic skincare','premium sustainable fashion','high end eco homewares'],
    },
    'Luxe': {
      low:    ['scented candle','silk scrunchie set','luxury soap','quality notebook'],
      medium: ['perfume','leather wallet','quality jewellery','silk pillowcase','scented candle set'],
      high:   ['luxury skincare set','quality sunglasses','leather journal','cashmere scarf','designer wallet'],
      bigwed: ['perfume gift set','cashmere throw','quality jewellery','luxury handbag','designer sunglasses'],
      lotto:  ['dyson airwrap','luxury perfume','designer handbag','premium jewellery','luxury watch'],
    },
    'Practical': {
      low:    ['reusable shopping bag','torch','first aid kit','cable organiser','quality umbrella'],
      medium: ['quality backpack','travel adapter','tool kit','quality torch','cable management kit'],
      high:   ['leather boots','quality cookware set','premium backpack','quality umbrella','travel organiser set'],
      bigwed: ['premium cookware','quality luggage','leather briefcase','premium tool kit'],
      lotto:  ['high end cookware set','premium luggage set','quality briefcase','luxury bedding'],
    },
    'Fun': {
      low:    ['card game','novelty mug','funny book','quirky socks','retro toy'],
      medium: ['board game','puzzle','adult colouring book','cooking kit','retro game'],
      high:   ['karaoke microphone','mini projector','photo booth kit','premium board game','novelty gadget'],
      bigwed: ['mini projector','quality karaoke system','premium puzzle set','fun cooking class'],
      lotto:  ['high end mini projector','premium gaming setup','luxury experience voucher'],
    },
    'Sentimental': {
      low:    ['photo frame','personalised mug','scrapbook kit','memory book'],
      medium: ['photo frame set','leather journal','personalised gift','keepsake box'],
      high:   ['custom map print','quality jewellery','silk scarf','premium leather journal','quality photo album'],
      bigwed: ['birthstone jewellery','quality jewellery set','luxury leather journal','custom portrait'],
      lotto:  ['luxury jewellery','premium keepsake','high end personalised gift'],
    },
    'Trendy': {
      low:    ['scrunchie set','hair accessories set','nail art kit','fashion earrings','bucket hat'],
      medium: ['tote bag','fashion jewellery','trendy backpack','quality sunglasses','belt bag'],
      high:   ['quality sunglasses','premium sneakers','leather tote bag','quality watch','fashion jewellery set'],
      bigwed: ['designer sunglasses','premium sneakers','quality leather bag','luxury skincare set'],
      lotto:  ['designer bag','luxury sneakers','premium jewellery','high end fashion item'],
    },
    'Quirky': {
      low:    ['novelty socks','funny book','quirky phone case','novelty mug','brain teaser puzzle'],
      medium: ['unusual kitchen gadget','retro game','unusual plant','quirky stationery','mini arcade game'],
      high:   ['premium novelty gadget','retro game console','unusual home decor','quirky quality item'],
      bigwed: ['mini arcade cabinet','premium quirky tech','unusual luxury item'],
      lotto:  ['high end quirky tech','luxury unusual experience','premium retro gaming'],
    },
    'Surprise me': {
      low:    ['novelty socks','scented candle','phone case','funny book','card game'],
      medium: ['board game','quality sunglasses','leather journal','bluetooth speaker','novelty gadget'],
      high:   ['massage gun','quality sunglasses','premium sneakers','portable speaker','activity tracker'],
      bigwed: ['noise cancelling headphones','gps running watch','quality jewellery','premium handbag'],
      lotto:  ['premium smart watch','luxury handbag','dyson airwrap','premium headphones'],
    },
  };

  // Pick pool for vibe + budget tier
  const vibePools = vibeCategoryPools[vibe] || vibeCategoryPools['Surprise me'];
  const tierPool  = vibePools[budgetTier] || vibePools['medium'];
  const shuffled  = [...tierPool].sort(() => Math.random() - 0.5);
  const categorySuggestions = shuffled.slice(0, 3).join(', ');

  const refreshVariations = [
    '',
    'Find 3 DIFFERENT product categories — same vibe, person and interests.',
    'Suggest ALTERNATIVE ideas — different from previous but same vibe and interests.',
    'Focus on NICHE or less obvious products — same vibe and interests.',
    'Suggest PREMIUM best-in-class versions — same vibe and interests.',
    'Think EXPERIENTIAL or lifestyle products — same vibe and interests.',
  ];
  const firstLoadVariations = [
    '','Prioritise practical everyday products.','Prioritise stylish products.',
    'Prioritise fun or unique products.','Prioritise premium quality products.',
    'Prioritise compact or portable products.','Prioritise experience-enhancing products.',
  ];
  const firstLoadNudge = firstLoadVariations[Math.floor((Math.random() * 997 + Date.now()) % firstLoadVariations.length)];
  const refreshInstruction = refreshSeed > 0
    ? (refreshVariations[refreshSeed] || refreshVariations[refreshVariations.length - 1])
    : firstLoadNudge;

  // ── STEP 1: Claude Haiku ────────────────────────────────────────────────────
  const systemPrompt = `You are ShopGenieAI, an expert NZ personal shopper in 2026.

RULE 1 — MIRROR RULE: searchQuery MUST be a simplified version of name.
"Activity Tracker" → searchQuery "activity tracker". NEVER mismatch product and search.

RULE 2 — BUDGET REALITY (UNIVERSAL):
Your recommendations MUST be products that genuinely exist at the user's budget in New Zealand in 2026. Every product category has options at every price point — cheap smartwatches exist (e.g. $80 Promate from PB Tech), expensive ones exist too ($800 Apple Watch Ultra). Match the product to the budget — do NOT ban any product category. If a category has budget-friendly options, recommend those. If you're unsure whether something exists at a price point in NZ, pick something safer.
Do NOT recommend a premium version of a product when a budget version exists at the right price.

RULE 3 — NZ TERMINOLOGY: jandals, togs, jersey, hoodie, sports bag, torch, nappies, running shoes, drink bottle.

RULE 4 — VARIETY: All 3 recommendations must be DIFFERENT product categories. Don't suggest 3 variations of the same thing.

OUTPUT — return ONLY this exact JSON, no preamble, no markdown:
{
  "products": [
    {
      "name": "Activity Tracker",
      "type": "Fitness Tech",
      "reason": "Tracks steps, heart rate and sleep — budget-friendly options start from around $80 in NZ.",
      "searchQuery": "activity tracker"
    },
    {
      "name": "Massage Gun",
      "type": "Recovery",
      "reason": "Perfect for muscle recovery after hard training sessions.",
      "searchQuery": "massage gun"
    },
    {
      "name": "Technical Hoodie",
      "type": "Sports Apparel",
      "reason": "Lightweight moisture-wicking hoodie built for training and everyday wear.",
      "searchQuery": "technical hoodie"
    }
  ]
}`;

  const userPrompt = `GIFT MISSION: 3 FRESH IDEAS
Who: ${whoFor} | Vibe: ${vibe} | Budget: ${budgetLabel} (NZ$${budgetMin}–$${budgetMax}) | Occasion: ${occasion}
Interests: ${interests || 'Not specified'}

HARD BLOCK — FORBIDDEN (already shown): ${excludeProducts.length > 0 ? excludeProducts.join(', ') : 'None yet'}

SUGGESTED STARTING POINTS (use at least 2 of these): ${categorySuggestions}

CRITICAL: Do NOT suggest products that naturally cost MORE than NZ$${budgetMax} in New Zealand. Match products to the budget — if cheap versions exist in NZ at this price point, recommend those.
Mirror Rule: name and searchQuery must match. searchQuery max 4 words, no brand names.
${refreshInstruction ? `STRATEGY: ${refreshInstruction}` : ''}
Session: ${Date.now().toString(36)}`;

  let products;
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
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
    const cleanSearchTerm = normalizeQuery(product.searchQuery || product.name);
    const richSearchTerm  = (product.name + ' ' + (product.searchQuery || '')).toLowerCase().trim();

    // Smart retailer routing — matches product type to best NZ retailer
    const { url: buyLink, storeName: bestStoreName } = buildBuyLink(
      cleanSearchTerm, product.name, product.type, budgetTier, budgetMin, budgetMax
    );

    const stores   = buildShoppingChips(richSearchTerm, budgetHint);
    const imageUrl = await getBraveImage(richSearchTerm, BRAVE_KEY);

    console.log(`"${product.name}" | ${bestStoreName}: "${cleanSearchTerm}" | Tier: ${budgetTier}`);

    return { name: product.name, type: product.type, reason: product.reason, budgetLabel, bestStoreName, buyLink, imageUrl, stores };
  }));

  // ── STEP 3: Brevo email ─────────────────────────────────────────────────────
  if (BREVO_KEY && email) {
    try {
      const rows = enriched.map((p, i) => `
        <div style="margin-bottom:28px;padding:20px;background:#fffdf9;border-radius:12px;border:1px solid #e8ddd0;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a9e7e;margin-bottom:4px;">${p.type||'Gift Idea'}</div>
          <div style="font-size:20px;font-weight:700;color:#3d2b1a;margin-bottom:8px;">${i+1}. ${p.name}</div>
          <div style="font-size:14px;color:#7a6855;line-height:1.6;margin-bottom:12px;">${p.reason}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div><div style="font-size:15px;font-weight:600;color:#c8922a;">${p.budgetLabel}</div>
            ${p.bestStoreName?`<div style="font-size:12px;color:#9a8878;">Best match at ${p.bestStoreName}</div>`:''}</div>
            <a href="${p.buyLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Shop This Gift →</a>
          </div>
          <div style="margin-top:10px;font-size:12px;color:#9a8878;">Also search: ${p.stores.map(s=>`<a href="${s.link}" style="color:#c8922a;">${s.name}</a>`).join(' · ')}</div>
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
  <div style="text-align:center;margin-bottom:36px;"><div style="font-size:28px;font-weight:900;color:#3d2b1a;">🧞 ShopGenieAI</div><div style="font-size:13px;color:#9a8878;font-style:italic;">Your wish is my gift</div></div>
  <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">
    <div style="font-size:22px;font-weight:700;color:#3d2b1a;margin-bottom:10px;">Here are your 3 gift picks! 🎁</div>
    <div style="font-size:14px;color:#7a6855;">For <strong>${whoFor}</strong> · <strong>${occasion}</strong> · ${budgetLabel}</div>
  </div>
  <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">${rows}</div>
  <div style="background:#fff9f0;border-radius:12px;padding:16px 20px;border:1px solid #e8ddd0;margin-bottom:24px;font-size:12px;color:#9a8878;line-height:1.6;"><strong style="color:#3d2b1a;">📋 Note:</strong> Links open retailer search pages — browse and buy at your convenience!</div>
  <div style="text-align:center;margin-bottom:32px;"><a href="https://shopgenieai.com" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">Find More Gifts 🧞</a></div>
  <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">Kiwi Made 🇳🇿 · ShopGenieAI</div>
</div></body></html>`
        })
      });
    } catch(e) { console.error('Brevo error:', e); }
  }

  return res.status(200).json({ products: enriched });
}
