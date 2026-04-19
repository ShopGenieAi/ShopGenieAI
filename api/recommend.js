// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — recommend.js
// Fixes: gender awareness | eyewear→SunglassHut | luggage.co.nz | kids sport→RebelSport
//        sport-specific retailers (hockey/soccer) | footwear before fashion
//        sportswear before fashion | JB HiFi/Noel Leeming reinstated for tech
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
  'low':    { min: 0,   max: 50,   label: 'Low Budget 🤑',            hint: 'affordable, everyday essentials'         },
  'medium': { min: 50,  max: 150,  label: 'Medium Budget 💸',         hint: 'mid-range quality brands'                },
  'high':   { min: 150, max: 300,  label: 'High Budget 🎯',           hint: 'premium, high-end, or designer versions' },
  'bigwed': { min: 300, max: 400,  label: 'Big Wednesday Spender 🎰', hint: 'luxury, tech-heavy, or top-tier models'  },
  'lotto':  { min: 500, max: 9999, label: 'OMG You Won Lotto 🎉',     hint: 'ultra-premium, elite luxury items'       },
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
  ['technical hoodie','sports hoodie'],['tech hoodie','sports hoodie'],
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

// ── CHILD/KIDS DETECTION ──────────────────────────────────────────────────────
function isChildRecipient(whoFor) {
  if (!whoFor) return false;
  const lower = whoFor.toLowerCase();
  return /\b(child|children|kid|kids|baby|toddler|infant|son|daughter|boy|girl)\b/.test(lower);
}

function prefixKids(searchQuery) {
  const lower = searchQuery.toLowerCase();
  if (/\b(kids|kid|child|children|baby)\b/.test(lower)) return searchQuery;
  return 'kids ' + searchQuery;
}

// ── GENDER DETECTION ──────────────────────────────────────────────────────────
function detectGender(whoFor) {
  if (!whoFor) return 'neutral';
  const lower = whoFor.toLowerCase();
  if (/\b(him|his|he|man|men|male|partner him|father|dad|brother|grandfather|grandad|uncle|boyfriend)\b/.test(lower)) return 'male';
  if (/\b(her|hers|she|woman|women|female|partner her|mother|mum|sister|grandmother|nan|aunt|girlfriend)\b/.test(lower)) return 'female';
  return 'neutral';
}

// ── SPORT-SPECIFIC INTEREST DETECTION ────────────────────────────────────────
// Scans interests + whoFor for specific sports that have specialist NZ retailers
function detectSportSpecialist(interests, productName) {
  const s = ((interests || '') + ' ' + (productName || '')).toLowerCase();
  if (/\bhockey\b/.test(s)) return 'hockey';
  if (/\bsoccer\b/.test(s)) return 'soccer';
  return null;
}

// ── KIDS VIBE POOLS ───────────────────────────────────────────────────────────
const KIDS_VIBE_POOLS = {
  'Sporty': {
    low:    ['kids football','kids frisbee','skipping rope','kids swim goggles','kids sports socks','kids drink bottle','kids headband','kids volleyball'],
    medium: ['kids bike helmet','kids football boots','kids shin pads','kids sports bag','kids running shoes','kids sports watch','kids swimming goggles','kids cricket set'],
    high:   ['kids smartwatch','kids activity tracker','kids bike','kids scooter','kids sports sunglasses','kids wetsuit','kids tennis racket','kids skateboard'],
    bigwed: ['kids GPS watch','kids electric scooter','kids trampoline','kids mountain bike','kids surfboard'],
    lotto:  ['premium kids bike','kids golf set','kids horse riding gear','premium kids trampoline'],
  },
  'Techy': {
    low:    ['kids LED torch','kids digital watch','kids walkie talkies','kids magnifying glass','kids science kit','kids calculator'],
    medium: ['kids headphones','kids coding toy','kids smartwatch','kids digital camera','kids science experiment kit','kids robotics kit','kids bluetooth speaker'],
    high:   ['kids tablet','kids smart watch','kids drone','kids microscope','kids telescope','kids electronic keyboard'],
    bigwed: ['kids iPad','kids laptop','kids 3D printer pen','premium kids drone','kids programmable robot'],
    lotto:  ['premium kids tablet','kids gaming console','kids high-end headphones','premium kids laptop'],
  },
  'Eco-friendly': {
    low:    ['kids reusable drink bottle','kids beeswax wrap kit','kids seed growing kit','kids bamboo lunch box','kids recycled colouring book'],
    medium: ['kids nature explorer kit','kids bird watching set','kids garden tool set','kids compost kit','kids eco craft set','kids reusable snack bags'],
    high:   ['kids quality bike','kids nature photography kit','kids camping set','kids quality drink bottle set','kids eco art supplies'],
    bigwed: ['kids premium camping gear','kids quality telescope','kids nature adventure set'],
    lotto:  ['kids premium outdoor adventure set','kids quality nature kit'],
  },
  'Luxe': {
    low:    ['kids quality colouring book','kids plush toy','kids bath bomb set','kids fancy dress costume'],
    medium: ['kids jewellery making kit','kids quality art set','kids designer stationery','kids quality soft toy','kids charm bracelet'],
    high:   ['kids quality watch','kids designer backpack','kids quality jewellery','kids premium art set','kids designer clothing'],
    bigwed: ['kids designer outfit','kids premium watch','kids quality luggage','kids designer accessories'],
    lotto:  ['kids luxury watch','kids designer wardrobe','kids premium jewellery'],
  },
  'Practical': {
    low:    ['kids lunch box','kids drink bottle','kids umbrella','kids torch','kids backpack'],
    medium: ['kids quality backpack','kids rain jacket','kids quality lunch box','kids school supplies set','kids quality umbrella'],
    high:   ['kids quality school bag','kids quality rain gear','kids desk organiser','kids reading lamp','kids quality shoes'],
    bigwed: ['kids quality luggage','kids premium school set','kids quality desk'],
    lotto:  ['kids premium luggage set','kids quality bedroom set'],
  },
  'Fun': {
    low:    ['kids card game','kids novelty socks','kids joke book','kids sticker set','kids bubbles set','kids silly putty'],
    medium: ['kids board game','kids puzzle','kids magic set','kids craft kit','kids slime kit','kids LEGO set','kids Nerf blaster'],
    high:   ['kids karaoke microphone','kids mini projector','kids premium board game','kids remote control car','kids chemistry set','kids magic kit'],
    bigwed: ['kids gaming console game','kids premium LEGO set','kids quality karaoke system','kids electric go kart'],
    lotto:  ['kids premium gaming setup','kids quality play equipment','kids premium experience voucher'],
  },
  'Sentimental': {
    low:    ['kids photo frame','kids memory book','kids scrapbook kit','kids friendship bracelet kit'],
    medium: ['kids personalised story book','kids keepsake box','kids quality photo album','kids name necklace','kids personalised backpack'],
    high:   ['kids birthstone jewellery','kids quality keepsake','kids personalised artwork','kids quality memory book'],
    bigwed: ['kids premium keepsake jewellery','kids custom portrait','kids quality personalised gift'],
    lotto:  ['kids luxury keepsake','kids premium personalised item'],
  },
  'Trendy': {
    low:    ['kids bucket hat','kids scrunchie set','kids hair accessories','kids fun socks','kids temporary tattoos'],
    medium: ['kids quality sunglasses','kids trendy backpack','kids fashion watch','kids belt bag','kids quality hat'],
    high:   ['kids designer sunglasses','kids quality sneakers','kids trendy clothing set','kids quality accessories'],
    bigwed: ['kids premium sneakers','kids designer backpack','kids quality fashion set'],
    lotto:  ['kids designer outfit','kids premium sneakers','kids luxury accessories'],
  },
  'Quirky': {
    low:    ['kids novelty mug','kids funny socks','kids brain teaser puzzle','kids whoopee cushion','kids joke book'],
    medium: ['kids unusual science kit','kids quirky stationery','kids mini arcade game','kids unusual toy','kids magic trick set'],
    high:   ['kids retro game console','kids unusual gadget','kids quality novelty item','kids premium puzzle set'],
    bigwed: ['kids mini arcade cabinet','kids premium quirky gadget','kids unusual experience'],
    lotto:  ['kids premium gaming setup','kids luxury unusual experience'],
  },
  'Surprise me': {
    low:    ['kids card game','kids novelty socks','kids fun book','kids sticker set','kids bubbles'],
    medium: ['kids board game','kids headphones','kids craft kit','kids science kit','kids LEGO set'],
    high:   ['kids smartwatch','kids tablet','kids scooter','kids quality headphones','kids drone'],
    bigwed: ['kids gaming console','kids premium tablet','kids electric scooter','kids quality watch'],
    lotto:  ['kids premium gaming setup','kids quality tablet','kids premium experience'],
  },
};

// ── SMART RETAILER ROUTING ────────────────────────────────────────────────────
// ORDER MATTERS — more specific categories must be checked BEFORE broader ones
// e.g. footwear must come before fashion, or running shoes hit Glassons

function detectProductCategory(name, type) {
  const s = (name + ' ' + type).toLowerCase();

  // ── CUSTOM/PERSONALISED — must be first ───────────────────────────────────
  if (/personalised|personalized|custom|constellation|star map|custom print|custom portrait|engraved|monogram|bespoke|name necklace|birthstone|keepsake|memorial/.test(s)) return 'custom';

  // ── EYEWEAR ───────────────────────────────────────────────────────────────
  if (/sunglass|sunglasses|eyewear|optical|reading glasses|sports glasses|aviator|polarised|polarized/.test(s)) return 'eyewear';

  // ── LUGGAGE & TRAVEL ACCESSORIES ─────────────────────────────────────────
  // wallet, travel bag, business bag, luggage → luggage.co.nz
  if (/wallet|luggage|suitcase|travel bag|travel pack|business bag|briefcase|carry.on|passport|duffel|duffle|weekender/.test(s)) return 'luggage';

  // ── FOOTWEAR — must be before fashion ────────────────────────────────────
  // running shoes, sneakers, boots all hit fashion regex — catch them here first
  if (/running shoes|sneakers|jandals|boots|footwear|shoe |shoes|sandals|slides|thongs/.test(s)) return 'footwear';

  // ── SPORTSWEAR / ACTIVE APPAREL — before fashion ─────────────────────────
  // technical hoodie, sports hoodie, activewear → Rebel Sport not Farmers/Glassons
  if (/sports hoodie|technical hoodie|sport hoodie|running jacket|training jacket|activewear|compression|sports top|training top|sports shorts|running shorts|sports jersey/.test(s)) return 'sportswear';

  // ── KIDS SPORT GEAR — before general fashion ─────────────────────────────
  if (/kids.*sport|kids.*running|kids.*football|kids.*cricket|kids.*hockey|kids.*soccer|kids.*rugby|kids.*shin|kids.*boot|kids.*racket|kids.*helmet/.test(s)) return 'kidssport';

  // ── TECH & ELECTRONICS ───────────────────────────────────────────────────
  if (/headphone|earbud|speaker|audio|bluetooth|tv|television|laptop|tablet|phone|camera|projector|smart watch|smartwatch|gaming|gps watch|sports watch|running watch|activity tracker|fitness tracker/.test(s)) return 'tech';

  // ── FITNESS GEAR ─────────────────────────────────────────────────────────
  if (/massage gun|weight vest|foam roller|resistance|yoga|protein|hydration|swim goggle|bike helmet|gym equipment/.test(s)) return 'fitness';

  // ── OUTDOOR & ADVENTURE ───────────────────────────────────────────────────
  if (/hiking|camping|hammock|tent|trekking|kayak|fishing|hunting|waterproof jacket|head torch|sleeping bag|multi-tool|dry bag|binoculars/.test(s)) return 'outdoor';

  // ── FASHION — general clothing ────────────────────────────────────────────
  // hoodie/jersey/jacket are here as fallback ONLY — specific sport versions caught above
  if (/dress|jacket|hoodie|jersey|togs|beanie|fashion|jewellery|handbag|tote|belt bag|scarf|hat|cap/.test(s)) return 'fashion';

  // ── TOOLS ────────────────────────────────────────────────────────────────
  if (/drill|saw|mitre|tool kit|torch|water blaster|garden/.test(s)) return 'tools';

  // ── HOME & KITCHEN ────────────────────────────────────────────────────────
  if (/cookware|kitchen|air fryer|blender|coffee|toaster|duvet|linen|candle|cushion|vase|photo frame/.test(s)) return 'home';

  // ── BEAUTY ───────────────────────────────────────────────────────────────
  if (/perfume|cologne|skincare|makeup|beauty|lipstick|moisturiser|shampoo|conditioner|serum|fragrance/.test(s)) return 'beauty';

  return 'general';
}

function buildBuyLink(cleanSearchTerm, productName, productType, budgetTierKey, budgetMin, budgetMax, interests) {
  const category = detectProductCategory(productName, productType);
  const q = encodeURIComponent(cleanSearchTerm);
  const qFull = encodeURIComponent(productName);

  // ── CUSTOM/PERSONALISED → Google Shopping NZ ─────────────────────────────
  if (category === 'custom') {
    return { url: `https://www.google.com/search?q=${qFull}+NZ&tbm=shop&gl=nz&hl=en`, storeName: 'Google Shopping NZ' };
  }

  // ── EYEWEAR → Sunglass Hut NZ directly ───────────────────────────────────
  if (category === 'eyewear') {
    return { url: `https://www.sunglasshut.com/nz/search?q=${q}`, storeName: 'Sunglass Hut' };
  }

  // ── LUGGAGE & TRAVEL → luggage.co.nz ─────────────────────────────────────
  if (category === 'luggage') {
    return { url: `https://www.luggage.co.nz/search?q=${q}`, storeName: 'Luggage.co.nz' };
  }

  // ── FOOTWEAR → Number One Shoe Warehouse (low/med) or Rebel Sport (high+) ─
  if (category === 'footwear') {
    if (['high','bigwed','lotto'].includes(budgetTierKey))
      return { url: `https://www.rebelsport.co.nz/search?q=${q}`, storeName: 'Rebel Sport' };
    return { url: `https://www.numberoneshoes.co.nz/search?q=${q}`, storeName: 'Number One Shoes' };
  }

  // ── SPORTSWEAR → Rebel Sport or Stirling Sports ───────────────────────────
  if (category === 'sportswear') {
    if (['high','bigwed','lotto'].includes(budgetTierKey))
      return { url: `https://www.rebelsport.co.nz/search?q=${q}`, storeName: 'Rebel Sport' };
    return { url: `https://www.stirlingsports.co.nz/search?q=${q}`, storeName: 'Stirling Sports' };
  }

  // ── KIDS SPORT → Check for specialist sport first, then Rebel Sport ───────
  if (category === 'kidssport') {
    const sport = detectSportSpecialist(interests, productName);
    if (sport === 'hockey')
      return { url: `https://gohockey.co.nz/search?q=${q}`, storeName: 'Go Hockey' };
    if (sport === 'soccer')
      return { url: `https://www.soccerunited.co.nz/search?q=${q}`, storeName: 'Soccer United' };
    return { url: `https://www.rebelsport.co.nz/search?q=${q}`, storeName: 'Rebel Sport' };
  }

  // ── TECH & ELECTRONICS ───────────────────────────────────────────────────
  // PB Tech primary, JB Hi-Fi for high+ budgets as it stocks premium items well
  if (category === 'tech') {
    if (['high','bigwed','lotto'].includes(budgetTierKey))
      return { url: `https://www.jbhifi.co.nz/search?q=${q}`, storeName: 'JB Hi-Fi' };
    return { url: `https://www.pbtech.co.nz/search?sf=${q}`, storeName: 'PB Tech' };
  }

  // ── FITNESS GEAR → Google Shopping NZ ────────────────────────────────────
  if (category === 'fitness') {
    return { url: `https://www.google.com/search?q=${q}+NZ&tbm=shop&gl=nz&hl=en`, storeName: 'Google Shopping NZ' };
  }

  // ── OUTDOOR & ADVENTURE → Torpedo7 ───────────────────────────────────────
  if (category === 'outdoor') {
    if (budgetTierKey === 'low')
      return { url: `https://www.thewarehouse.co.nz/search?q=${q}&priceTo=${budgetMax}`, storeName: 'The Warehouse' };
    return { url: `https://www.torpedo7.co.nz/search?q=${q}`, storeName: 'Torpedo7' };
  }

  // ── FASHION → gender-neutral routing ─────────────────────────────────────
  if (category === 'fashion') {
    if (['high','bigwed','lotto'].includes(budgetTierKey))
      return { url: `https://www.farmers.co.nz/search?q=${q}`, storeName: 'Farmers' };
    if (budgetTierKey === 'medium')
      return { url: `https://www.glassons.com/search?q=${q}`, storeName: 'Glassons' };
    return { url: `https://www.thewarehouse.co.nz/search?q=${q}&priceTo=${budgetMax}`, storeName: 'The Warehouse' };
  }

  // ── BEAUTY ───────────────────────────────────────────────────────────────
  if (category === 'beauty') {
    if (['high','bigwed','lotto'].includes(budgetTierKey))
      return { url: `https://www.mecca.com/en-nz/search/?q=${q}`, storeName: 'Mecca' };
    if (budgetTierKey === 'medium')
      return { url: `https://www.sephora.nz/search?q=${q}`, storeName: 'Sephora' };
    return { url: `https://www.chemistwarehouse.co.nz/search?q=${q}`, storeName: 'Chemist Warehouse' };
  }

  // ── HOME & KITCHEN ────────────────────────────────────────────────────────
  if (category === 'home') {
    if (budgetTierKey === 'low')
      return { url: `https://www.kmart.co.nz/search?q=${q}`, storeName: 'Kmart' };
    return { url: `https://www.briscoes.co.nz/search?q=${q}`, storeName: 'Briscoes' };
  }

  // ── TOOLS ────────────────────────────────────────────────────────────────
  if (category === 'tools') {
    return { url: `https://www.bunnings.co.nz/search/products?q=${q}`, storeName: 'Bunnings' };
  }

  // ── GENERAL FALLBACK → The Warehouse with price filter ───────────────────
  const base = `https://www.thewarehouse.co.nz/search?q=${q}`;
  let url = base;
  if (budgetMin > 0 && budgetMax < 9999) url += `&priceFrom=${budgetMin}&priceTo=${budgetMax}`;
  return { url, storeName: 'The Warehouse' };
}

function buildShoppingChips(richSearchTerm) {
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

  const isForChild = isChildRecipient(whoFor);
  const gender     = detectGender(whoFor);

  // Gender hint for Claude — used to steer product suggestions
  const genderHint = gender === 'male'
    ? 'This gift is for a MALE. Suggest masculine or gender-neutral products. Do NOT suggest womens clothing, handbags, makeup, feminine skincare, cashmere scarves, or female-coded fashion items.'
    : gender === 'female'
    ? 'This gift is for a FEMALE. Suggest feminine or gender-neutral products appropriate for women.'
    : '';

  // Sport-specific interest detection for Claude prompt awareness
  const sportInterest = detectSportSpecialist(interests, '');
  const sportHint = sportInterest === 'hockey'
    ? 'The recipient is into HOCKEY — prioritise hockey-specific gear (sticks, pads, bags, etc).'
    : sportInterest === 'soccer'
    ? 'The recipient is into SOCCER — prioritise soccer-specific gear (boots, balls, shin pads, etc).'
    : '';

  // ── ADULT VIBE POOLS ──────────────────────────────────────────────────────
  const vibeCategoryPools = {
    'Sporty': {
      low:    ['foam roller','resistance bands','skipping rope','sports socks','swim goggles','volleyball','football','frisbee','headband','sports drink bottle'],
      medium: ['yoga mat','sports bag','protein shaker','hydration pack','bike helmet','running cap','compression socks','swim goggles','football boots','shin pads'],
      high:   ['massage gun','activity tracker','sports hoodie','portable speaker','weight vest','trail running shoes','cycling shorts','sports sunglasses','recovery slides'],
      bigwed: ['gps running watch','noise cancelling headphones','smart watch','premium running shoes','wireless earbuds','high end sports bag'],
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
      high:   ['luxury skincare set','quality sunglasses','leather journal','cashmere throw','designer wallet'],
      bigwed: ['perfume gift set','cashmere throw','quality jewellery','luxury handbag','designer sunglasses'],
      lotto:  ['dyson airwrap','luxury perfume','designer handbag','premium jewellery','luxury watch'],
    },
    'Practical': {
      low:    ['reusable shopping bag','torch','first aid kit','cable organiser','quality umbrella'],
      medium: ['quality backpack','travel adapter','tool kit','quality torch','cable management kit'],
      high:   ['leather boots','quality cookware set','premium backpack','quality umbrella','travel organiser set'],
      bigwed: ['premium cookware','quality luggage','leather wallet','premium tool kit'],
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
      high:   ['custom map print','quality jewellery','premium leather journal','quality photo album'],
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
      bigwed: ['noise cancelling headphones','gps running watch','quality jewellery','premium leather wallet'],
      lotto:  ['premium smart watch','luxury handbag','dyson airwrap','premium headphones'],
    },
  };

  const activePools = isForChild
    ? (KIDS_VIBE_POOLS[vibe] || KIDS_VIBE_POOLS['Surprise me'])
    : (vibeCategoryPools[vibe] || vibeCategoryPools['Surprise me']);
  const tierPool  = activePools[budgetTier] || activePools['medium'];
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

  // ── STEP 1: Claude Haiku ──────────────────────────────────────────────────
  const systemPrompt = `You are ShopGenieAI, an expert NZ personal shopper in 2026.

RULE 1 — MIRROR RULE: searchQuery MUST be a simplified version of name.
"Activity Tracker" → searchQuery "activity tracker". NEVER mismatch product and search.

RULE 2 — BUDGET REALITY (STRICTLY ENFORCED):
Every product MUST be genuinely available in New Zealand at the user's budget in 2026.
- HARD CEILING: Never recommend something that costs over NZ$${budgetMax}. No exceptions.
- HARD FLOOR: Never recommend something under NZ$${budgetMin} when a better option exists.
- Match budget versions: budget smartwatch (Promate/Xiaomi ~$80) fits Low/Medium. Apple Watch fits Lotto only.
- If unsure whether a product exists at this price in NZ, choose something safer.

RULE 3 — NZ TERMINOLOGY: jandals, togs, jersey, sports hoodie, sports bag, torch, running shoes, drink bottle.
Use "sports hoodie" not "technical hoodie". Use "sports watch" not "smart watch" for sporty recipients.

RULE 4 — VARIETY: All 3 recommendations must be DIFFERENT product categories.

RULE 5 — RECIPIENT AWARENESS:
- Children/kids/babies: ONLY age-appropriate products — toys, books, games, art supplies, kids sports gear, kids tech. NEVER adult fitness gear, phone/PC accessories, home improvement, adult lifestyle items.
- Elderly/grandparents: practical, easy-to-use. Not extreme sports or complex tech.
- Always match product to recipient's age, lifestyle and interests.

RULE 6 — GENDER AWARENESS:
Products must match the recipient's gender. A gift for "him" must be masculine or gender-neutral.
Never suggest women's handbags, feminine skincare, makeup, women's fashion, or female-coded items for a male recipient.
Never suggest power tools, men's grooming, or male-coded items for a female recipient unless interests suggest it.

RULE 7 — CUSTOM/PERSONALISED:
For personalised/custom products (star maps, custom portraits, name jewellery), use a simple search term like "personalised star map print".

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
      "name": "Sports Hoodie",
      "type": "Sports Apparel",
      "reason": "Lightweight moisture-wicking hoodie built for training and everyday wear.",
      "searchQuery": "sports hoodie"
    },
    {
      "name": "Massage Gun",
      "type": "Recovery",
      "reason": "Perfect for muscle recovery after hard training sessions.",
      "searchQuery": "massage gun"
    }
  ]
}`;

  const userPrompt = `GIFT MISSION: 3 FRESH IDEAS
Who: ${whoFor} | Vibe: ${vibe} | Budget: ${budgetLabel} (NZ$${budgetMin}–$${budgetMax}) | Occasion: ${occasion}
Interests: ${interests || 'Not specified'}

HARD BLOCK — FORBIDDEN (already shown): ${excludeProducts.length > 0 ? excludeProducts.join(', ') : 'None yet'}

SUGGESTED STARTING POINTS (use at least 2): ${categorySuggestions}

BUDGET ENFORCEMENT — CRITICAL:
Every product MUST be available in NZ for between NZ$${budgetMin} and NZ$${budgetMax}.
HARD CEILING: Never exceed NZ$${budgetMax}. HARD FLOOR: Never go below NZ$${budgetMin}.

${genderHint ? `GENDER RULE: ${genderHint}` : ''}
${sportHint ? `SPORT INTEREST: ${sportHint}` : ''}
${isForChild ? 'CHILD GIFT: ONLY age-appropriate kids products. NO adult fitness gear, NO phone/PC accessories, NO adult lifestyle items.' : ''}
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

  // ── STEP 1.5: Kids prefix ─────────────────────────────────────────────────
  if (isForChild) {
    products = products.map(p => ({
      ...p,
      searchQuery: prefixKids(p.searchQuery || p.name),
    }));
    console.log('🧒 Child detected — prefixed all searchQuery with "kids"');
  }

  // ── STEP 2: Normalise + build links + images ───────────────────────────────
  const enriched = await Promise.all(products.map(async (product) => {
    const cleanSearchTerm = normalizeQuery(product.searchQuery || product.name);
    const richSearchTerm  = (product.name + ' ' + (product.searchQuery || '')).toLowerCase().trim();

    // Pass interests into buildBuyLink for sport-specialist detection
    const { url: buyLink, storeName: bestStoreName } = buildBuyLink(
      cleanSearchTerm, product.name, product.type, budgetTier, budgetMin, budgetMax, interests
    );

    const stores   = buildShoppingChips(richSearchTerm);
    const imageUrl = await getBraveImage(richSearchTerm, BRAVE_KEY);

    console.log(`"${product.name}" | ${bestStoreName}: "${cleanSearchTerm}" | Tier: ${budgetTier} | Gender: ${gender} | Child: ${isForChild}`);

    return { name: product.name, type: product.type, reason: product.reason, budgetLabel, bestStoreName, buyLink, imageUrl, stores };
  }));

  // ── STEP 3: Brevo email ───────────────────────────────────────────────────
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
