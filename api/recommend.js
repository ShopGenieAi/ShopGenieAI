// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — recommend.js
// Architecture: Claude → NormalizeQuery → Warehouse/Noel Leeming + Google Shopping chips
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
  ['sport watch','smart watch'],['sports watch','smart watch'],['fitness watch','smart watch'],
  ['activity tracker','smart watch'],['smartwatch','smart watch'],
  ['airpods','wireless earbuds'],['earbuds','wireless earbuds'],['earphones','wireless earbuds'],
  ['in-ear headphones','wireless earbuds'],['laptop computer','laptop'],['notebook computer','laptop'],
  ['tablet computer','tablet'],['e-reader','ereader'],['smart speaker','bluetooth speaker'],
  ['bluetooth headset','bluetooth headphones'],['noise cancelling','noise cancelling headphones'],
  ['wireless charger','wireless charger'],['power bank','portable charger'],
  ['portable charger','portable charger'],['dash cam','dashcam'],['dash camera','dashcam'],
  ['sneakers','running shoes'],['tennis shoes','running shoes'],['athletic shoes','running shoes'],
  ['trainers','running shoes'],['flip flops','jandals'],['thongs','jandals'],
  ['bathing suit','togs'],['swimsuit','togs'],['swimming costume','togs'],['swimwear','togs'],
  ['sweater','jersey'],['pullover','jersey'],['sweatshirt','hoodie'],
  ['underwear','undies'],['panties','undies'],['activewear set','activewear'],
  ['gym wear','activewear'],['workout clothes','activewear'],
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
  ['shin guards','shin pads'],['swim goggles','swimming goggles'],['goggles swimming','swimming goggles'],
  ['cycling helmet','bike helmet'],['bicycle helmet','bike helmet'],
  ['soda','soft drink'],['candy','lollies'],['sweets','lollies'],
  ['potato chips','crisps'],['cookies','biscuits'],['cookie','biscuits'],
  ['fanny pack','bum bag'],['hip pack','bum bag'],['waist bag','bum bag'],
  ['rfid wallet','rfid wallet'],['mens wallet','leather wallet'],['womens wallet','purse wallet'],
  ['bug spray','insect repellent'],['scented candle','scented candle'],
  ['essential oil diffuser','oil diffuser'],['stuffed animal','soft toy'],['teddy bear','soft toy'],
  ['cologne','mens fragrance'],['aftershave','aftershave'],
  ['body wash set','body wash gift set'],['skincare set','skincare gift set'],
  ['makeup kit','makeup gift set'],['hair dryer','hair dryer'],['hair straightener','hair straightener'],
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

// ── LINK BUILDERS ─────────────────────────────────────────────────────────────
function buildWarehouseUrl(searchTerm, budgetMin, budgetMax) {
  const base = `https://www.thewarehouse.co.nz/search?q=${encodeURIComponent(searchTerm)}`;
  let url = base;
  if (budgetMin > 0) url += `&priceFrom=${budgetMin}`;
  if (budgetMax && budgetMax < 9999) url += `&priceTo=${budgetMax}`;
  return url;
}

function buildNoelLeemingUrl(searchTerm) {
  return `https://www.noelleeming.co.nz/search?q=${encodeURIComponent(searchTerm)}`;
}

function buildBuyLink(searchTerm, budgetTierKey, budgetMin, budgetMax) {
  const premiumTiers = ['high', 'bigwed', 'lotto'];
  if (premiumTiers.includes(budgetTierKey)) {
    return { url: buildNoelLeemingUrl(searchTerm), storeName: 'Noel Leeming' };
  }
  return { url: buildWarehouseUrl(searchTerm, budgetMin, budgetMax), storeName: 'The Warehouse' };
}

function buildShoppingChips(searchTerm, productName, budgetHint) {
  return [
    { name: '🛒 Shop NZ',        link: `https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' NZ ' + budgetHint)}&tbm=shop&gl=nz&hl=en` },
    { name: '💰 Compare Prices', link: `https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' buy NZ')}&tbm=shop&gl=nz&hl=en` },
    { name: '⭐ Top Rated',       link: `https://www.google.com/search?q=${encodeURIComponent('best ' + searchTerm + ' NZ')}&tbm=shop&gl=nz&hl=en` },
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

  // Vibe-specific category pools — forces Claude away from Watch/Bag/Buds defaults
  const vibeCategoryPools = {
    'Sporty':       ['massage gun','GPS running watch','hydration pack','resistance bands','foam roller','sports bag','protein shaker','swim goggles','bike helmet','yoga mat'],
    'Techy':        ['noise cancelling headphones','smart watch','portable charger','bluetooth speaker','wireless earbuds','phone stand','smart home device','laptop stand','webcam','usb hub'],
    'Eco-friendly': ['reusable drink bottle','beeswax wraps','bamboo toothbrush set','organic cotton tote','keep cup','seed kit','natural soap set','recycled notebook','plant pot','compostable lunch kit'],
    'Luxe':         ['perfume gift set','leather wallet','cashmere throw','quality jewellery','luxury skincare set','silk pillowcase','scented candle set','quality sunglasses','leather journal','silk scarf'],
    'Practical':    ['quality backpack','leather boots','cookware set','cable organiser','quality umbrella','travel adapter','reusable shopping bag','tool kit','first aid kit','quality torch'],
    'Fun':          ['board game','card game','novelty gadget','puzzle','adult colouring book','karaoke microphone','mini projector','photo booth kit','retro toy','cooking kit'],
    'Sentimental':  ['photo frame set','leather journal','quality jewellery','personalised mug','memory book','keepsake box','custom map print','birthstone jewellery','scrapbook kit','silk scarf'],
    'Trendy':       ['quality sunglasses','premium sneakers','tote bag','hair accessories set','nail art kit','trendy backpack','fashion jewellery','bucket hat','scrunchie set','belt bag'],
    'Quirky':       ['novelty socks','funny book','unusual kitchen gadget','quirky phone case','retro game','brain teaser puzzle','unusual plant','novelty mug','quirky stationery','mini arcade game'],
    'Surprise me':  ['massage gun','quality sunglasses','leather journal','board game','premium sneakers','noise cancelling headphones','perfume set','camping hammock','quality backpack','novelty gadget'],
  };

  const vibePool = vibeCategoryPools[vibe] || vibeCategoryPools['Surprise me'];
  const shuffled = [...vibePool].sort(() => Math.random() - 0.5);
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
    '','Prioritise practical everyday products.','Prioritise stylish or trendy products.',
    'Prioritise fun or unique products.','Prioritise premium quality products.',
    'Prioritise compact or portable products.','Prioritise experience-enhancing products.',
    'Prioritise durable long-lasting products.',
  ];
  const firstLoadNudge = firstLoadVariations[Math.floor((Math.random() * 997 + Date.now()) % firstLoadVariations.length)];
  const refreshInstruction = refreshSeed > 0
    ? (refreshVariations[refreshSeed] || refreshVariations[refreshVariations.length - 1])
    : firstLoadNudge;

  // ── STEP 1: Claude Haiku ────────────────────────────────────────────────────
  const systemPrompt = `You are ShopGenieAI, a specialist gift engine for the NZ retail market. Expert personal shopper who knows NZ retail pricing in 2026.

RULE 1 — MIRROR RULE: searchQuery MUST be a simplified version of name.
"Massage Gun" → searchQuery "massage gun". NEVER mismatch product and search term.

RULE 2 — ANTI-LOOP: "Smart Watch", "Wireless Earbuds", "Sports Bag" are Common tier.
Max ONE Common item per 3-pack. Use Rare/Epic categories: Massage Gun, Camping Hammock, Weight Vest, Recovery Slides.

RULE 3 — NZ PRICE REALITY 2026:
$0-50: Basic (foam roller, drink bottle) | $50-150: Mid (earbuds, sports bag) | $150-300: Premium (massage gun, GPS watch) | $300-400: Luxury | $500+: Elite
Budget $150+ = suggest PREMIUM versions only. No basic items.

RULE 4 — NZ TERMS: jandals, togs, jersey, hoodie, sports bag, torch, nappies, running shoes, drink bottle.

OUTPUT — return ONLY this exact JSON, no preamble, no markdown:
{
  "products": [
    {
      "name": "Massage Gun",
      "type": "Fitness Recovery",
      "reason": "Perfect for recovery after hard training sessions.",
      "searchQuery": "massage gun"
    },
    {
      "name": "Camping Hammock",
      "type": "Outdoor Adventure",
      "reason": "Lightweight and packable for any outdoor adventure.",
      "searchQuery": "camping hammock"
    },
    {
      "name": "Noise Cancelling Headphones",
      "type": "Audio Tech",
      "reason": "Premium sound for commuting, gym and travel.",
      "searchQuery": "noise cancelling headphones"
    }
  ]
}`;

  const userPrompt = `GIFT MISSION: 3 FRESH IDEAS
Who: ${whoFor} | Vibe: ${vibe} | Budget: ${budgetLabel} (NZ$${budgetMin}-$${budgetMax}) | Occasion: ${occasion}
Interests: ${interests || 'Not specified'}

HARD BLOCK - DO NOT suggest (already shown): ${excludeProducts.length > 0 ? excludeProducts.join(', ') : 'None yet'}

SUGGESTED STARTING POINTS (use at least 2): ${categorySuggestions}

RULES: Mirror Rule. Max 1 Common tier item. searchQuery 2-4 words no brands. Budget NZ$${budgetMin}-$${budgetMax} strictly.
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
    const { url: buyLink, storeName: bestStoreName } = buildBuyLink(cleanSearchTerm, budgetTier, budgetMin, budgetMax);
    const stores    = buildShoppingChips(richSearchTerm, product.name, budgetHint);
    const imageUrl  = await getBraveImage(richSearchTerm, BRAVE_KEY);
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
  <div style="background:#fff9f0;border-radius:12px;padding:16px 20px;border:1px solid #e8ddd0;margin-bottom:24px;font-size:12px;color:#9a8878;line-height:1.6;"><strong style="color:#3d2b1a;">📋 Note:</strong> Links take you to NZ retailer search pages — browse and buy at your convenience!</div>
  <div style="text-align:center;margin-bottom:32px;"><a href="https://shopgenieai.com" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">Find More Gifts 🧞</a></div>
  <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">Kiwi Made 🇳🇿 · ShopGenieAI</div>
</div></body></html>`
        })
      });
    } catch(e) { console.error('Brevo error:', e); }
  }

  return res.status(200).json({ products: enriched });
}
