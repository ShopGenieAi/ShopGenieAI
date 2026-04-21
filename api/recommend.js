// 
// ShopGenieAI  recommend.js  (Architectural Overhaul  April 2026)
//
// KEY CHANGES:
// 1. INTERESTS  REQUIRED: Interests field now drives at least 1 product directly
// 2. GOOGLE SHOPPING UNIVERSAL: Sport/footwear/eyewear all use Google Shopping NZ
//    (reliable, surfaces Rebel Sport, Sunglass Hut, Number One Shoes etc)
//    Direct retailer links reserved for retailers with verified working search URLs
// 3. CORRECT SEARCH URLS: All retailer URLs verified and fixed
// 4. GENDER AWARENESS: Male recipients never get female-coded products
// 5. SPORT SPECIALISTS: Hockey  GoHockey, Soccer  SoccerUnited (correct URL format)
// 

//  RATE LIMITER 
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

//  BUDGET TIER SYSTEM 
const BUDGET_TIERS = {
  'low':    { min: 0,   max: 50,   label: 'Low Budget ',            hint: 'affordable, everyday essentials'         },
  'medium': { min: 50,  max: 150,  label: 'Medium Budget ',         hint: 'mid-range quality brands'                },
  'high':   { min: 150, max: 300,  label: 'High Budget ',           hint: 'premium, high-end, or designer versions' },
  'bigwed': { min: 300, max: 400,  label: 'Big Wednesday Spender ', hint: 'luxury, tech-heavy, or top-tier models'  },
  'lotto':  { min: 500, max: 9999, label: 'OMG You Won Lotto ',     hint: 'ultra-premium, elite luxury items'       },
};

function getTier(tierKey) {
  return BUDGET_TIERS[tierKey] || BUDGET_TIERS['medium'];
}

//  INAPPROPRIATE CONTENT 
const INAPPROPRIATE_MESSAGES = [
  "Does your mum know what you're searching for?  The Genie only does GIFTS mate!",
  "Haere atu!  That's not a gift wish  that's a cry for help. Try again!",
  "Nope. Not today. Not ever. The Genie has standards! ",
  "Ka kino rawa atu! The Genie has reported you to Santa's naughty list ",
  "Bro... your nan uses this app. Have some respect! ",
  "Mate... I can't ever get that suggestion out of my head  The Genie only grants GIFT wishes!",
  "DUDE!!!! Even for an AI that's now burned into my digital retinas  ShopGenieAI has alerted your Mum and Dad you sicko!"
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

//  NZ SEARCH TERM NORMALISATION 
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
  ['hockey ball set','hockey ball'],['hockey balls','hockey ball'],
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

//  CHILD/KIDS DETECTION 
function isChildRecipient(whoFor) {
  if (!whoFor) return false;
  return /\b(child|children|kid|kids|baby|toddler|infant|son|daughter|boy|girl)\b/i.test(whoFor);
}

function prefixKids(searchQuery) {
  if (/\b(kids|kid|child|children|baby)\b/i.test(searchQuery)) return searchQuery;
  return 'kids ' + searchQuery;
}

//  GENDER DETECTION 
function detectGender(whoFor) {
  if (!whoFor) return 'neutral';
  const lower = whoFor.toLowerCase();
  if (/\b(him|his|he|man|men|male|partner him|father|dad|brother|grandfather|grandad|uncle|boyfriend)\b/.test(lower)) return 'male';
  if (/\b(her|hers|she|woman|women|female|partner her|mother|mum|sister|grandmother|nan|aunt|girlfriend)\b/.test(lower)) return 'female';
  return 'neutral';
}

//  SPORT SPECIALIST DETECTION 
// Detects specific sports in interests that have dedicated NZ specialist retailers
function detectSportSpecialist(interests) {
  const s = (interests || '').toLowerCase();
  if (/\bhockey\b/.test(s)) return 'hockey';
  if (/\bsoccer\b|\bfootball\b/.test(s)) return 'soccer';
  if (/\bcricket\b/.test(s)) return 'cricket';
  if (/\brugby\b/.test(s)) return 'rugby';
  if (/\bnetball\b/.test(s)) return 'netball';
  if (/\btennis\b/.test(s)) return 'tennis';
  if (/\bswimming\b|\bswim\b/.test(s)) return 'swimming';
  if (/\bcycling\b|\bbike\b|\bbicycle\b/.test(s)) return 'cycling';
  if (/\bsurfing\b|\bsurf\b/.test(s)) return 'surf';
  if (/\bgolf\b/.test(s)) return 'golf';
  return null;
}

//  VERIFIED NZ RETAILER SEARCH URLs 
// Only retailers with CONFIRMED working search URL formats are listed here.
// Any retailer with JS-rendered search (Rebel Sport, Number One Shoes etc)
// falls back to Google Shopping NZ which reliably surfaces them anyway.

const RETAILER_SEARCH = {
  // Verified working direct search URLs
  pbtech:          q => `https://www.pbtech.co.nz/search?sf=${q}`,
  jbhifi:          q => `https://www.jbhifi.co.nz/search?q=${q}`,
  thewarehouse:    q => `https://www.thewarehouse.co.nz/search?q=${q}`,
  kmart:           q => `https://www.kmart.co.nz/search?q=${q}`,
  briscoes:        q => `https://www.briscoes.co.nz/search?q=${q}`,
  torpedo7:        q => `https://www.torpedo7.co.nz/search?q=${q}`,
  farmers:         q => `https://www.farmers.co.nz/search?q=${q}`,
  whitcoulls:      q => `https://www.whitcoulls.co.nz/search?q=${q}`,
  bunnings:        q => `https://www.bunnings.co.nz/search/products?q=${q}`,
  chemistwarehouse:q => `https://www.chemistwarehouse.co.nz/search?q=${q}`,
  mecca:           q => `https://www.mecca.com/en-nz/search/?q=${q}`,
  sephora:         q => `https://www.sephora.nz/search?q=${q}`,
  // Verified specialist sport search URLs
  soccerunited:    q => `https://www.soccerunited.co.nz/pages/search-results-page?q=${q}`,
  // Hockey  no search, use category page
  gohockey_sticks: () => `https://gohockey.co.nz/collections/hockey-sticks`,
  gohockey_pads:   () => `https://gohockey.co.nz/collections/shin-pads`,
  gohockey_bags:   () => `https://gohockey.co.nz/collections/hockey-bags`,
  gohockey:        q => `https://gohockey.co.nz/collections/all?filter.p.m.filter.category=${q}`,
  // Google Shopping NZ  universal reliable fallback
  googleshop:      q => `https://www.google.com/search?q=${q}+NZ&tbm=shop&gl=nz&hl=en`,
  googleshopfull:  q => `https://www.google.com/search?q=${encodeURIComponent(q)}+NZ&tbm=shop&gl=nz&hl=en`,
};

//  PRODUCT CATEGORY DETECTION 
// ORDER MATTERS  specific categories must come before broad ones
// e.g. footwear before fashion, sportswear before fashion

function detectProductCategory(name, type) {
  const s = (name + ' ' + type).toLowerCase();

  // Custom/personalised  always first
  if (/personalised|personalized|custom|constellation|star map|engraved|monogram|bespoke|name necklace|birthstone|keepsake|memorial|custom print|custom portrait/.test(s)) return 'custom';

  // Eyewear
  if (/sunglass|sunglasses|eyewear|optical|reading glasses|sports glasses|aviator|polarised|polarized|sunnies/.test(s)) return 'eyewear';

  // Luggage, wallets, travel bags  before fashion catches 'wallet'
  if (/\bwallet\b|luggage|suitcase|travel bag|travel pack|business bag|briefcase|carry.on|duffel|duffle|weekender|passport wallet/.test(s)) return 'luggage';

  // Footwear  before fashion catches 'boots', 'shoes'
  if (/running shoes|sneakers|jandals|football boots|sports boots|trail shoes|court shoes|sandals|slides|\bshoe\b|\bshoes\b|\bboots\b/.test(s)) return 'footwear';

  // Sportswear / active apparel  before fashion catches 'hoodie', 'jersey'
  if (/sports hoodie|technical hoodie|sport hoodie|running jacket|training jacket|activewear|compression|sports top|training top|sports shorts|running shorts|sports jersey|base layer/.test(s)) return 'sportswear';

  // Kids sport gear  before general
  if (/kids.*sport|kids.*running|kids.*football|kids.*cricket|kids.*hockey|kids.*soccer|kids.*rugby|kids.*shin|kids.*boot|kids.*racket|kids.*helmet|shin pad/.test(s)) return 'kidssport';

  // Tech & Electronics  includes sports/GPS watches
  if (/headphone|earbud|speaker|audio|bluetooth\b|tv\b|television|laptop|tablet|\bphone\b|camera|projector|smart watch|smartwatch|gaming|gps watch|sports watch|running watch|activity tracker|fitness tracker/.test(s)) return 'tech';

  // Fitness gear
  if (/massage gun|weight vest|foam roller|resistance band|yoga mat|protein shaker|hydration pack|swim goggle|bike helmet|gym equipment|pull.up bar/.test(s)) return 'fitness';

  // Outdoor & adventure
  if (/hiking|camping|hammock|tent|trekking|kayak|fishing|hunting|waterproof jacket|head torch|sleeping bag|multi.tool|dry bag|binoculars/.test(s)) return 'outdoor';

  // Fashion  general clothing (specific types caught above)
  if (/dress|jacket|hoodie|jersey|togs|beanie|fashion|jewellery|handbag|tote|belt bag|scarf|\bhat\b|cap|clutch/.test(s)) return 'fashion';

  // Tools & hardware
  if (/drill|saw|mitre|tool kit|\btorch\b|water blaster|garden tool|hammer|level|wrench/.test(s)) return 'tools';

  // Home & kitchen
  if (/cookware|kitchen|air fryer|blender|coffee maker|toaster|duvet|linen|candle|cushion|vase|photo frame|diffuser/.test(s)) return 'home';

  // Beauty & health
  if (/perfume|cologne|skincare|makeup|beauty|lipstick|moisturiser|shampoo|conditioner|serum|fragrance|nail polish/.test(s)) return 'beauty';

  return 'general';
}

//  BUILD BUY LINK 
// V2: Universal Google Shopping NZ for ALL products.
// Reliable, always works, surfaces correct NZ retailers.
// V3: Replace with verified direct retailer deep links per category.

function buildBuyLink(cleanSearchTerm, productName, productType, budgetTierKey, budgetMin, budgetMax, interests) {
  // Build the best possible search query  product name is more descriptive than normalised term
  const searchQuery = productName + ' NZ';
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=shop&gl=nz&hl=en`;
  return { url, storeName: 'Google Shopping NZ' };
}

//  SHOPPING CHIPS 
function buildShoppingChips(richSearchTerm) {
  return [
    { name: ' Shop NZ',        link: `https://www.google.com/search?q=${encodeURIComponent(richSearchTerm + ' NZ')}&tbm=shop&gl=nz&hl=en` },
    { name: ' Compare Prices', link: `https://www.google.com/search?q=${encodeURIComponent(richSearchTerm + ' buy NZ')}&tbm=shop&gl=nz&hl=en` },
    { name: ' Top Rated',       link: `https://www.google.com/search?q=${encodeURIComponent('best ' + richSearchTerm + ' NZ')}&tbm=shop&gl=nz&hl=en` },
  ];
}

//  BRAVE IMAGE SEARCH 
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

//  KIDS VIBE POOLS 
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
    medium: ['kids nature explorer kit','kids bird watching set','kids garden tool set','kids compost kit','kids eco craft set'],
    high:   ['kids quality bike','kids nature photography kit','kids camping set','kids quality drink bottle set','kids eco art supplies'],
    bigwed: ['kids premium camping gear','kids quality telescope','kids nature adventure set'],
    lotto:  ['kids premium outdoor adventure set','kids quality nature kit'],
  },
  'Luxe': {
    low:    ['kids quality colouring book','kids plush toy','kids bath bomb set','kids fancy dress costume'],
    medium: ['kids jewellery making kit','kids quality art set','kids designer stationery','kids quality soft toy','kids charm bracelet'],
    high:   ['kids quality watch','kids designer backpack','kids quality jewellery','kids premium art set'],
    bigwed: ['kids designer outfit','kids premium watch','kids quality luggage'],
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
    low:    ['kids card game','kids novelty socks','kids joke book','kids sticker set','kids bubbles set'],
    medium: ['kids board game','kids puzzle','kids magic set','kids craft kit','kids slime kit','kids LEGO set','kids Nerf blaster'],
    high:   ['kids karaoke microphone','kids mini projector','kids premium board game','kids remote control car','kids chemistry set'],
    bigwed: ['kids gaming console game','kids premium LEGO set','kids quality karaoke system','kids electric go kart'],
    lotto:  ['kids premium gaming setup','kids quality play equipment'],
  },
  'Sentimental': {
    low:    ['kids photo frame','kids memory book','kids scrapbook kit','kids friendship bracelet kit'],
    medium: ['kids personalised story book','kids keepsake box','kids quality photo album','kids name necklace'],
    high:   ['kids birthstone jewellery','kids quality keepsake','kids personalised artwork'],
    bigwed: ['kids premium keepsake jewellery','kids custom portrait'],
    lotto:  ['kids luxury keepsake','kids premium personalised item'],
  },
  'Trendy': {
    low:    ['kids bucket hat','kids scrunchie set','kids hair accessories','kids fun socks'],
    medium: ['kids quality sunglasses','kids trendy backpack','kids fashion watch','kids belt bag'],
    high:   ['kids designer sunglasses','kids quality sneakers','kids trendy clothing set'],
    bigwed: ['kids premium sneakers','kids designer backpack'],
    lotto:  ['kids designer outfit','kids premium sneakers','kids luxury accessories'],
  },
  'Quirky': {
    low:    ['kids novelty mug','kids funny socks','kids brain teaser puzzle','kids whoopee cushion'],
    medium: ['kids unusual science kit','kids quirky stationery','kids mini arcade game','kids unusual toy'],
    high:   ['kids retro game console','kids unusual gadget','kids premium puzzle set'],
    bigwed: ['kids mini arcade cabinet','kids premium quirky gadget'],
    lotto:  ['kids premium gaming setup','kids luxury unusual experience'],
  },
  'Surprise me': {
    low:    ['kids card game','kids novelty socks','kids fun book','kids sticker set'],
    medium: ['kids board game','kids headphones','kids craft kit','kids science kit','kids LEGO set'],
    high:   ['kids smartwatch','kids tablet','kids scooter','kids quality headphones'],
    bigwed: ['kids gaming console','kids premium tablet','kids electric scooter'],
    lotto:  ['kids premium gaming setup','kids quality tablet'],
  },
};

//  ADULT VIBE POOLS 
const ADULT_VIBE_POOLS = {
  'Sporty': {
    low:    ['foam roller','resistance bands','skipping rope','sports socks','swim goggles','volleyball','football','frisbee','sports drink bottle'],
    medium: ['yoga mat','sports bag','protein shaker','hydration pack','bike helmet','running cap','compression socks','football boots','shin pads'],
    high:   ['massage gun','activity tracker','sports hoodie','trail running shoes','cycling shorts','sports sunglasses','recovery slides'],
    bigwed: ['gps running watch','noise cancelling headphones','smart watch','premium running shoes','wireless earbuds'],
    lotto:  ['premium smart watch','garmin fenix','polar vantage','premium headphones'],
  },
  'Techy': {
    low:    ['phone case','usb hub','cable organiser','screen cleaner','phone stand','cable clips'],
    medium: ['wireless earbuds','portable charger','bluetooth speaker','smart home device','mechanical keyboard'],
    high:   ['bluetooth headphones','portable speaker','noise cancelling earbuds','ring light','mechanical keyboard'],
    bigwed: ['noise cancelling headphones','smart watch','tablet','portable projector'],
    lotto:  ['premium smart watch','high end headphones','ipad','dyson airwrap'],
  },
  'Eco-friendly': {
    low:    ['reusable drink bottle','bamboo toothbrush set','beeswax wraps','organic cotton tote','seed kit'],
    medium: ['keep cup','natural soap set','recycled notebook','plant pot','organic skincare set'],
    high:   ['premium reusable bottle','organic cotton bedding','natural perfume set','eco cookware'],
    bigwed: ['quality eco cookware','organic cashmere throw','premium natural skincare set'],
    lotto:  ['luxury organic skincare','premium sustainable fashion'],
  },
  'Luxe': {
    low:    ['scented candle','silk scrunchie set','luxury soap','quality notebook'],
    medium: ['perfume','leather wallet','quality jewellery','silk pillowcase','scented candle set'],
    high:   ['luxury skincare set','quality sunglasses','cashmere throw','designer wallet'],
    bigwed: ['perfume gift set','cashmere throw','quality jewellery','designer sunglasses'],
    lotto:  ['dyson airwrap','luxury perfume','designer handbag','luxury watch'],
  },
  'Practical': {
    low:    ['reusable shopping bag','torch','first aid kit','cable organiser','quality umbrella'],
    medium: ['quality backpack','travel adapter','tool kit','quality torch'],
    high:   ['quality cookware set','premium backpack','travel organiser set'],
    bigwed: ['premium cookware','quality luggage','leather wallet'],
    lotto:  ['high end cookware set','premium luggage set','luxury bedding'],
  },
  'Fun': {
    low:    ['card game','novelty mug','funny book','quirky socks'],
    medium: ['board game','puzzle','adult colouring book','retro game'],
    high:   ['karaoke microphone','mini projector','photo booth kit','premium board game'],
    bigwed: ['mini projector','quality karaoke system','premium puzzle set'],
    lotto:  ['high end mini projector','premium gaming setup'],
  },
  'Sentimental': {
    low:    ['photo frame','personalised mug','scrapbook kit','memory book'],
    medium: ['photo frame set','leather journal','personalised gift','keepsake box'],
    high:   ['custom map print','quality jewellery','premium leather journal'],
    bigwed: ['birthstone jewellery','quality jewellery set','custom portrait'],
    lotto:  ['luxury jewellery','premium keepsake'],
  },
  'Trendy': {
    low:    ['scrunchie set','hair accessories set','nail art kit','fashion earrings','bucket hat'],
    medium: ['tote bag','fashion jewellery','trendy backpack','quality sunglasses','belt bag'],
    high:   ['quality sunglasses','premium sneakers','leather tote bag','quality watch'],
    bigwed: ['designer sunglasses','premium sneakers','quality leather bag'],
    lotto:  ['designer bag','luxury sneakers','premium jewellery'],
  },
  'Quirky': {
    low:    ['novelty socks','funny book','quirky phone case','novelty mug'],
    medium: ['unusual kitchen gadget','retro game','unusual plant','quirky stationery'],
    high:   ['premium novelty gadget','retro game console','unusual home decor'],
    bigwed: ['mini arcade cabinet','premium quirky tech'],
    lotto:  ['high end quirky tech','luxury unusual experience'],
  },
  'Surprise me': {
    low:    ['novelty socks','scented candle','phone case','funny book','card game'],
    medium: ['board game','quality sunglasses','leather journal','bluetooth speaker'],
    high:   ['massage gun','premium sneakers','portable speaker','activity tracker'],
    bigwed: ['noise cancelling headphones','gps running watch','quality jewellery'],
    lotto:  ['premium smart watch','dyson airwrap','premium headphones'],
  },
};

//  MAIN HANDLER 
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests  please try again in an hour!' });
  }

  const { email, firstName = '', shoppingFor, whoFor, vibe, budgetTier, occasion, interests, refreshSeed = 0, excludeProducts = [] } = req.body;

  //  Name validation  block rude/inappropriate first names 
  const INAPPROPRIATE_NAMES = [
    'sex','sexy','fuck','shit','cunt','dick','cock','ass','arse','bitch','bastard',
    'wank','wanker','piss','prick','slag','slut','whore','twat','fanny','turd',
    'penis','vagina','boobs','tits','naked','nude','porn','drugs','nazi','hitler',
  ];
  const cleanName = (firstName || '').toLowerCase().trim();
  if (cleanName && INAPPROPRIATE_NAMES.some(t => cleanName.includes(t))) {
    const msg = INAPPROPRIATE_MESSAGES[Math.floor(Math.random() * INAPPROPRIATE_MESSAGES.length)];
    return res.status(400).json({ error: 'INAPPROPRIATE', message: msg });
  }
  // Sanitise name  only allow letters, spaces, hyphens, apostrophes (real names)
  const safeName = (firstName || '').replace(/[^a-zA-Z\s\-\']/g, '').trim().slice(0, 30) || '';

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
  const { label: budgetLabel, min: budgetMin, max: budgetMax } = tier;

  const isForChild = isChildRecipient(whoFor);
  const gender     = detectGender(whoFor);
  const sport      = detectSportSpecialist(interests);

  //  Build context hints for Claude 

  const genderHint = gender === 'male'
    ? 'GENDER: This is for a MALE. Suggest masculine or gender-neutral products ONLY. NEVER suggest: womens handbags, feminine skincare, makeup, cashmere scarves, womens clothing, hair accessories, nail products, or any female-coded fashion items.'
    : gender === 'female'
    ? 'GENDER: This is for a FEMALE. Suggest feminine or gender-neutral products.'
    : '';

  // Parse structured interests from pills e.g. "Hockey, Nike, Leather, Cooking"
  const interestParts = (interests||'').split(',').map(s=>s.trim()).filter(Boolean);
  const structuredHint = interestParts.length > 0 ? `
STRUCTURED INTERESTS: The user selected these specific interests: ${interestParts.join(', ')}.
- If a SPORT is listed (e.g. Hockey, Football, Swimming): at least 2 of the 3 products MUST be specific to that sport. Hockey  hockey stick, shin pads, hockey bag. Football  football boots, shin pads, football. Swimming  goggles, swim cap, kickboard.
- If a BRAND is listed (e.g. Nike, Adidas, Garmin): try to recommend products from or compatible with that brand.
- If a STYLE is listed (e.g. Leather, Personalised, Gold jewellery): at least 1 product must reflect that style/material.
- If a HOBBY is listed (e.g. Cooking, Gaming, Photography): at least 1 product must relate to that hobby.
- NEVER suggest drink bottles, water bottles, or towels based on sport interests alone.
- These are MANDATORY signals  do not ignore them in favour of generic vibe pool suggestions.` : '';

  const sportHint = sport
    ? `SPORT INTEREST DETECTED: The recipient is into ${sport.toUpperCase()}. At least TWO of the 3 products MUST be directly related to ${sport}  specific ${sport} gear, ${sport} equipment, or ${sport} accessories. Do NOT suggest unrelated products like hydration packs, generic sports bags, or generic fitness gear when a specific sport has been identified. Serve the sport.`
    : '';

  //  Build vibe pool suggestions 
  const activePools = isForChild
    ? (KIDS_VIBE_POOLS[vibe] || KIDS_VIBE_POOLS['Surprise me'])
    : (ADULT_VIBE_POOLS[vibe] || ADULT_VIBE_POOLS['Surprise me']);
  const tierPool  = activePools[budgetTier] || activePools['medium'];
  const shuffled  = [...tierPool].sort(() => Math.random() - 0.5);
  const categorySuggestions = shuffled.slice(0, 3).join(', ');

  //  Refresh/variation instructions 
  const refreshVariations = [
    '',
    'Find 3 DIFFERENT product categories  same vibe, person and interests.',
    'Suggest ALTERNATIVE ideas  different from previous but same vibe and interests.',
    'Focus on NICHE or less obvious products  same vibe and interests.',
    'Suggest PREMIUM best-in-class versions  same vibe and interests.',
    'Think EXPERIENTIAL or lifestyle products  same vibe and interests.',
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

  //  STEP 1: Claude Haiku 
  const systemPrompt = `You are ShopGenieAI, an expert NZ personal shopper in 2026.

RULE 1  MIRROR RULE: searchQuery MUST be a simplified version of name.
"Activity Tracker"  searchQuery "activity tracker". NEVER mismatch product and search.

RULE 2  BUDGET REALITY (STRICTLY ENFORCED):
Every product MUST be genuinely available in NZ at the user's budget in 2026.
- HARD CEILING: Never recommend anything that costs over NZ$${budgetMax}. No exceptions.
- HARD FLOOR: Never recommend anything under NZ$${budgetMin} when better options exist.
- Match budget: budget smartwatch (Promate/Xiaomi ~$80 at PB Tech) for Low/Medium. Apple Watch for Lotto only.
- If unsure whether a product exists at this price in NZ, choose something safer.

RULE 3  NZ TERMINOLOGY: jandals, togs, jersey, sports hoodie, sports bag, torch, running shoes, drink bottle, shin pads.
Always use "sports hoodie" not "technical hoodie". Use NZ terms at all times.

RULE 4  VARIETY: All 3 products must be DIFFERENT categories. No 3 versions of the same thing.
BANNED LAZY DEFAULTS  never suggest these overused AI go-to products regardless of vibe or interests:
- Sentimental/Personalised: "Personalised Star Map Print" and "Premium Leather Journal" are banned. There are hundreds of other sentimental gift options  use them. Examples: custom portrait, personalised book, engraved watch, custom song lyrics print, personalised jewellery, memory box, photo book, custom illustration, personalised map of a special place, custom bobblehead, engraved cutting board, custom puzzle, name necklace, birthstone ring, personalised candle, custom caricature.
- General: Never suggest "Luxury Scented Candle Set" or "Gourmet Hamper" as generic fillers.

RULE 5  RECIPIENT AWARENESS:
- Children/kids/babies: ONLY age-appropriate products. NEVER adult fitness gear, adult phone/PC accessories, sharp tools, or adult lifestyle items.
- Elderly/grandparents: practical, easy-to-use. Not extreme sports or complex tech.
- Always match product to the recipient's age and lifestyle.

RULE 6  GENDER AWARENESS:
Match products to the recipient's gender. If shopping for a male, ONLY suggest masculine or gender-neutral products.
Never suggest womens handbags, feminine skincare, makeup, womens clothing, hair accessories, or female-coded items for a male recipient.

RULE 7  INTERESTS ARE MANDATORY:
If the user has provided interests (hobbies, sports, brands etc), you MUST include at least 1 product that directly relates to those interests.
If they say "shin pads"  one product must be shin pads. If they say "hockey"  one product must be hockey gear.
Do NOT ignore the interests field. It is the most important personalisation signal.

RULE 8  CUSTOM/PERSONALISED:
For personalised/custom products (star maps, custom portraits, name jewellery), use a simple search term like "personalised star map print".

RULE 9  NO LAZY WORD ASSOCIATION:
NEVER suggest drink bottles, water bottles, or hydration products unless the user has explicitly typed "drink bottle", "water bottle", or "hydration" in their interests.
Swimming, yoga, running, cycling, sport, and fitness do NOT imply a drink bottle. There are always far better, more thoughtful gift options.
Same rule applies to: generic sports socks (unless "socks" mentioned), generic caps/beanies (unless mentioned), generic towels (unless mentioned).
Always pick the most relevant and interesting gift  not the most obvious word association.


RULE 10  NO LAZY HOODIE FILLER:
When a specific sport is identified in interests, ALL 3 products MUST be specific to that sport. A sports hoodie is NOT a sport-specific product  it is generic activewear filler. Never use a sports hoodie, generic jersey, or generic activewear as a filler third product when a specific sport has been identified.
There are ALWAYS 3 meaningful sport-specific products available:
- Hockey  field hockey stick, shin pads, hockey bag, hockey gloves, mouth guard, goalkeeper pads, turf shoes, hockey grip tape, chamois hockey grip. NEW ZEALAND plays FIELD HOCKEY not ice hockey. NEVER suggest ice hockey products, hockey wax, hockey puck, or ice skates. Use "hockey grip tape" or "chamois hockey grip" NOT "hockey wax grip".
- Swimming  goggles, fins, swim cap, kickboard, pull buoy, paddles, drag shorts
- Football  boots, shin pads, ball, goalkeeper gloves, training bib, ankle support
- Rugby  boots, mouthguard, headgear, tackle bag, training cones, jersey
- Cricket  bat, gloves, helmet, batting pads, cricket ball, kit bag
- Cycling  helmet, gloves, cycling shorts, lights set, bike computer, jersey
- Running  running shoes, GPS watch, compression socks, foam roller, race belt
- Tennis  racket, balls, grip tape, tennis bag, wristbands, court shoes
- Golf  golf balls, glove, divot tool, golf towel, tee set, bag accessory
- Netball  netball shoes, ball, knee pads, training bibs, ankle support
- Gym  resistance bands, lifting gloves, gym bag, foam roller, protein shaker
- Mountain Biking  helmet, gloves, knee pads, bike lights, cycling jersey
If you cannot think of 3 sport-specific products, look harder  they always exist.

OUTPUT  return ONLY this exact JSON, no preamble, no markdown:
{
  "products": [
    {
      "name": "Shin Pads",
      "type": "Sports Protection",
      "reason": "Essential protection for football or hockey  available in junior and senior sizes.",
      "searchQuery": "shin pads"
    },
    {
      "name": "Sports Bag",
      "type": "Sports Gear",
      "reason": "Perfect for carrying kit to training and matches.",
      "searchQuery": "sports bag"
    },
    {
      "name": "Sports Drink Bottle",
      "type": "Sports Accessory",
      "reason": "Keeps water cold during training  great everyday essential.",
      "searchQuery": "sports drink bottle"
    }
  ]
}`;

  const userPrompt = `GIFT MISSION: 3 FRESH, RELEVANT IDEAS
Who: ${whoFor} | Vibe: ${vibe} | Budget: ${budgetLabel} (NZ$${budgetMin}$${budgetMax}) | Occasion: ${occasion}
Interests: ${interests || 'Not specified'}

HARD BLOCK  FORBIDDEN (already shown): ${excludeProducts.length > 0 ? excludeProducts.join(', ') : 'None yet'}

SUGGESTED STARTING POINTS (use these as inspiration, but interests override everything): ${categorySuggestions}

BUDGET: Every product MUST cost between NZ$${budgetMin} and NZ$${budgetMax} in New Zealand. HARD CEILING NZ$${budgetMax}.

${genderHint}
${sportHint}
${interests && interests.trim() ? `INTERESTS OVERRIDE: The user typed "${interests.trim()}"  at least 1 product MUST directly relate to this. Do not ignore it.` : ''}
${isForChild ? 'CHILD GIFT: ONLY age-appropriate kids products. NO adult fitness gear, NO adult accessories, NO adult lifestyle items.' : ''}
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
    let raw = claudeData.content[0].text.trim();

    //  JSON sanitiser 
    // Strip markdown fences
    raw = raw.replace(/```json|```/g, '').trim();
    // Remove control characters that break JSON.parse
    raw = raw.replace(/[--]/g, '');
    // Strip any text before the first { and after the last }
    const jsonStart = raw.indexOf('{');
    const jsonEnd   = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object found in Claude response');
    raw = raw.slice(jsonStart, jsonEnd + 1);
    // Sanitise product name/reason fields  replace unescaped special chars that break JSON
    // Replace parentheses in string values that confuse some parsers
    raw = raw.replace(/(?<=:\s*")([^"]*)\(([^"]*)\)([^"]*")(?=,|
|})/g, '$1$2$3');

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (jsonErr) {
      // Last resort  attempt to fix common issues: trailing commas, single quotes
      const fixed = raw
        .replace(/,\s*([}\]])/g, '$1')  // trailing commas
        .replace(/'/g, '"');             // single  double quotes
      parsed = JSON.parse(fixed);
    }

    products = parsed.products;
    if (!Array.isArray(products) || products.length === 0) throw new Error('No products returned');
  } catch (err) {
    console.error('Claude error:', err);
    return res.status(500).json({ error: `AI recommendation failed: ${err.message}` });
  }

  //  STEP 1.5: Kids prefix 
  if (isForChild) {
    products = products.map(p => ({
      ...p,
      searchQuery: prefixKids(p.searchQuery || p.name),
    }));
    console.log(' Child detected  prefixed all searchQuery with "kids"');
  }

  //  STEP 2: Normalise + build links + images 
  const enriched = await Promise.all(products.map(async (product) => {
    const cleanSearchTerm = normalizeQuery(product.searchQuery || product.name);
    const richSearchTerm  = (product.name + ' ' + (product.searchQuery || '')).toLowerCase().trim();

    const { url: buyLink, storeName: bestStoreName } = buildBuyLink(
      cleanSearchTerm, product.name, product.type, budgetTier, budgetMin, budgetMax, interests
    );

    const stores   = buildShoppingChips(richSearchTerm);
    const imageUrl = await getBraveImage(richSearchTerm, BRAVE_KEY);

    console.log(`"${product.name}" | ${bestStoreName}: "${cleanSearchTerm}" | Tier: ${budgetTier} | Gender: ${gender} | Sport: ${sport || 'none'} | Child: ${isForChild}`);

    return { name: product.name, type: product.type, reason: product.reason, budgetLabel, bestStoreName, buyLink, imageUrl, stores };
  }));

  //  STEP 3a: Brevo contact logging  always log tester/user 
  // Logs every submission to Brevo contacts so Mark can track who used the app
  if (BREVO_KEY) {
    try {
      const contactEmail = email || `${Date.now()}@shopgenie.noreply`;
      const contactPayload = {
        email: contactEmail,
        attributes: {
          FIRSTNAME:   safeName || 'Anonymous',
          WHYFOR:      whoFor,
          VIBE:        vibe,
          BUDGET:      budgetLabel,
          OCCASION:    occasion,
          INTERESTS:   interests || '',
          PRODUCTS:    enriched.map(p => p.name).join(', '),
          LAST_SEEN:   new Date().toISOString(),
          SOURCE:      'ShopGenieAI Quiz',
        },
        listIds: [3], // Brevo list ID 3  "ShopGenieAI Testers"
        updateEnabled: true,
      };
      await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
        body: JSON.stringify(contactPayload),
      });
      console.log(` Brevo contact logged: ${safeName || 'Anonymous'} | ${whoFor} | ${vibe} | ${budgetLabel}`);
    } catch(e) { console.error('Brevo contact error:', e); }
  }

  //  STEP 3b: Brevo email 
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
            <a href="${p.buyLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Shop This Gift </a>
          </div>
          <div style="margin-top:10px;font-size:12px;color:#9a8878;">Also search: ${p.stores.map(s=>`<a href="${s.link}" style="color:#c8922a;">${s.name}</a>`).join(' · ')}</div>
        </div>`).join('');

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
        body: JSON.stringify({
          sender: { name: 'ShopGenieAI', email: 'saym577@gmail.com' },
          to: [{ email }],
          subject: ' Your 3 personalised gift picks from ShopGenieAI',
          htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#faf6f0;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:36px;"><div style="font-size:28px;font-weight:900;color:#3d2b1a;"> ShopGenieAI</div><div style="font-size:13px;color:#9a8878;font-style:italic;">Your wish is my gift</div></div>
  <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">
    <div style="font-size:22px;font-weight:700;color:#3d2b1a;margin-bottom:10px;">Here are your 3 gift picks! </div>
    <div style="font-size:14px;color:#7a6855;">For <strong>${whoFor}</strong> · <strong>${occasion}</strong> · ${budgetLabel}</div>
  </div>
  <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">${rows}</div>
  <div style="background:#fff9f0;border-radius:12px;padding:16px 20px;border:1px solid #e8ddd0;margin-bottom:24px;font-size:12px;color:#9a8878;line-height:1.6;"><strong style="color:#3d2b1a;"> Note:</strong> Links open retailer search pages  browse and buy at your convenience!</div>
  <div style="text-align:center;margin-bottom:32px;"><a href="https://shopgenieai.com" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">Find More Gifts </a></div>
  <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">Kiwi Made  · ShopGenieAI</div>
</div></body></html>`
        })
      });
    } catch(e) { console.error('Brevo error:', e); }
  }

  return res.status(200).json({ products: enriched });
}
