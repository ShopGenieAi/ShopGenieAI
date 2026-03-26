// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — recommend.js
// Architecture: Claude → NormalizeQuery → Retailer Routing → Brave Images
// No Serper. Every link is a guaranteed retailer search page.
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

// ── NZ SEARCH TERM NORMALISATION ──────────────────────────────────────────────
// Converts AI-generated generic terms to NZ retail "Known-Good" search terms
// Based on Mark's spreadsheet + extended with common AI term patterns
// Format: [ [trigger_pattern, nz_term, fallback_category] ]
// Trigger uses substring matching (lowercase) — first match wins

const NZ_TERM_MAP = [
  // ── TECH & MOBILE (from spreadsheet + extensions) ──
  ['cell phone',          'mobile phone',           'mobile phone'],
  ['smartphone',          'mobile phone',           'mobile phone'],
  ['smart phone',         'mobile phone',           'mobile phone'],
  ['sport watch',         'smart watch',            'smart watch'],
  ['sports watch',        'smart watch',            'smart watch'],
  ['fitness watch',       'smart watch',            'smart watch'],
  ['activity tracker',    'smart watch',            'smart watch'],
  ['smartwatch',          'smart watch',            'smart watch'],
  ['airpods',             'wireless earbuds',       'wireless earbuds'],
  ['earbuds',             'wireless earbuds',       'wireless earbuds'],
  ['earphones',           'wireless earbuds',       'wireless earbuds'],
  ['in-ear headphones',   'wireless earbuds',       'wireless earbuds'],
  ['laptop computer',     'laptop',                 'laptop'],
  ['notebook computer',   'laptop',                 'laptop'],
  ['tablet computer',     'tablet',                 'tablet'],
  ['e-reader',            'ereader',                'ereader'],
  ['smart speaker',       'bluetooth speaker',      'bluetooth speaker'],
  ['bluetooth headset',   'bluetooth headphones',   'bluetooth headphones'],
  ['noise cancelling',    'noise cancelling headphones', 'headphones'],
  ['wireless charger',    'wireless charger',       'charger'],
  ['power bank',          'portable charger',       'portable charger'],
  ['portable charger',    'portable charger',       'portable charger'],
  ['dash cam',            'dashcam',                'dashcam'],
  ['dash camera',         'dashcam',                'dashcam'],
  ['action camera',       'action camera',          'action camera'],
  ['security camera',     'security camera',        'security camera'],

  // ── CLOTHING & FOOTWEAR (from spreadsheet + extensions) ──
  ['sneakers',            'running shoes',          'shoes'],
  ['tennis shoes',        'running shoes',          'shoes'],
  ['athletic shoes',      'running shoes',          'shoes'],
  ['trainers',            'running shoes',          'shoes'],
  ['flip flops',          'jandals',                'jandals'],
  ['thongs',              'jandals',                'jandals'],
  ['bathing suit',        'togs',                   'togs'],
  ['swimsuit',            'togs',                   'togs'],
  ['swimming costume',    'togs',                   'togs'],
  ['swimwear',            'togs',                   'togs'],
  ['sweater',             'jersey',                 'jersey'],
  ['pullover',            'jersey',                 'jersey'],
  ['sweatshirt',          'hoodie',                 'hoodie'],
  ['underwear',           'undies',                 'underwear'],
  ['panties',             'undies',                 'underwear'],
  ['bra',                 'bra',                    'lingerie'],
  ['lingerie',            'lingerie',               'lingerie'],
  ['activewear set',      'activewear',             'activewear'],
  ['gym wear',            'activewear',             'activewear'],
  ['workout clothes',     'activewear',             'activewear'],
  ['rain jacket',         'rain jacket',            'jacket'],
  ['waterproof jacket',   'rain jacket',            'jacket'],
  ['puffer jacket',       'puffer jacket',          'jacket'],
  ['down jacket',         'puffer jacket',          'jacket'],
  ['beanie hat',          'beanie',                 'beanie'],
  ['woolen hat',          'beanie',                 'beanie'],
  ['knit cap',            'beanie',                 'beanie'],
  ['sunglasses',          'sunglasses',             'sunglasses'],
  ['sunnies',             'sunglasses',             'sunglasses'],

  // ── HOME & LIVING (from spreadsheet + extensions) ──
  ['comforter',           'duvet',                  'duvet'],
  ['duvet cover',         'duvet cover',            'duvet cover'],
  ['bedding set',         'bed linen',              'bed linen'],
  ['sheets set',          'bed sheets',             'bed sheets'],
  ['kitchen appliances',  'kitchen appliances',     'kitchen appliances'],
  ['whiteware',           'whiteware',              'whiteware'],
  ['trash can',           'rubbish bin',            'rubbish bin'],
  ['garbage bin',         'rubbish bin',            'rubbish bin'],
  ['faucet',              'tap',                    'tap'],
  ['countertop',          'benchtop',               'benchtop'],
  ['couch',               'sofa',                   'sofa'],
  ['loveseat',            'sofa',                   'sofa'],
  ['coffee table',        'coffee table',           'coffee table'],
  ['area rug',            'floor rug',              'rug'],
  ['throw pillow',        'cushion',                'cushion'],
  ['throw blanket',       'throw blanket',          'blanket'],
  ['candle set',          'candles',                'candles'],
  ['picture frame',       'photo frame',            'photo frame'],
  ['photo frame set',     'photo frame',            'photo frame'],
  ['storage basket',      'storage basket',         'storage'],
  ['laundry hamper',      'laundry basket',         'laundry basket'],

  // ── DIY & GARDEN (from spreadsheet + extensions) ──
  ['flashlight',          'torch',                  'torch'],
  ['flash light',         'torch',                  'torch'],
  ['yard tools',          'garden tools',           'garden tools'],
  ['garden tools set',    'garden tools',           'garden tools'],
  ['cinder block',        'concrete block',         'concrete block'],
  ['drywall',             'plasterboard',           'plasterboard'],
  ['sheetrock',           'gib board',              'plasterboard'],
  ['garden hose',         'garden hose',            'garden hose'],
  ['lawn mower',          'lawnmower',              'lawnmower'],
  ['leaf blower',         'leaf blower',            'leaf blower'],
  ['pressure washer',     'water blaster',          'water blaster'],
  ['power washer',        'water blaster',          'water blaster'],
  ['weed killer',         'weed spray',             'weed spray'],
  ['fertilizer',          'fertiliser',             'fertiliser'],
  ['plant pot',           'plant pot',              'pot plant'],
  ['flower pot',          'plant pot',              'pot plant'],

  // ── BABY & FAMILY (from spreadsheet + extensions) ──
  ['diapers',             'nappies',                'nappies'],
  ['diaper',              'nappies',                'nappies'],
  ['pacifier',            'dummy',                  'dummy'],
  ['soother',             'dummy',                  'dummy'],
  ['baby formula',        'baby formula',           'baby formula'],
  ['stroller',            'pram',                   'pram'],
  ['baby carriage',       'pram',                   'pram'],
  ['car seat',            'baby car seat',          'car seat'],
  ['baby monitor',        'baby monitor',           'baby monitor'],
  ['baby bouncer',        'baby bouncer',           'baby bouncer'],

  // ── SPORTS & FITNESS ──
  ['gym bag',             'sports bag',             'sports bag'],
  ['duffel bag',          'sports bag',             'sports bag'],
  ['duffle bag',          'sports bag',             'sports bag'],
  ['yoga mat',            'yoga mat',               'yoga mat'],
  ['exercise mat',        'yoga mat',               'yoga mat'],
  ['resistance bands',    'resistance bands',       'resistance bands'],
  ['foam roller',         'foam roller',            'foam roller'],
  ['massage gun',         'massage gun',            'massage gun'],
  ['protein shaker',      'protein shaker',         'protein shaker'],
  ['water bottle insulated','insulated drink bottle','drink bottle'],
  ['hydro flask',         'insulated drink bottle', 'drink bottle'],
  ['drink bottle',        'drink bottle',           'drink bottle'],
  ['water bottle',        'drink bottle',           'drink bottle'],
  ['running backpack',    'hydration pack',         'running pack'],
  ['tennis racquet',      'tennis racket',          'tennis racket'],
  ['soccer ball',         'football',               'football'],
  ['soccer cleats',       'football boots',         'football boots'],
  ['soccer boots',        'football boots',         'football boots'],
  ['shin guards',         'shin pads',              'shin pads'],
  ['goggles swimming',    'swimming goggles',       'swimming goggles'],
  ['swim goggles',        'swimming goggles',       'swimming goggles'],
  ['cycling helmet',      'bike helmet',            'bike helmet'],
  ['bicycle helmet',      'bike helmet',            'bike helmet'],

  // ── FOOD & DRINK ──
  ['soda',                'soft drink',             'soft drink'],
  ['pop drink',           'fizzy drink',            'soft drink'],
  ['candy',               'lollies',                'lollies'],
  ['sweets',              'lollies',                'lollies'],
  ['chips snack',         'crisps',                 'crisps'],
  ['potato chips',        'crisps',                 'crisps'],
  ['cookie',              'biscuits',               'biscuits'],
  ['cookies',             'biscuits',               'biscuits'],

  // ── MISCELLANEOUS (from spreadsheet + extensions) ──
  ['fanny pack',          'bum bag',                'bum bag'],
  ['hip pack',            'bum bag',                'bum bag'],
  ['waist bag',           'bum bag',                'bum bag'],
  ['rfid wallet',         'rfid wallet',            'wallet'],
  ['card holder wallet',  'card holder',            'wallet'],
  ['travel wallet',       'travel wallet',          'wallet'],
  ['mens wallet',         'leather wallet',         'wallet'],
  ['womens wallet',       'purse wallet',           'wallet'],
  ['sunscreen',           'sunscreen',              'sunscreen'],
  ['bug spray',           'insect repellent',       'insect repellent'],
  ['insect repellent',    'insect repellent',       'insect repellent'],
  ['first aid kit',       'first aid kit',          'first aid kit'],
  ['gift card',           'gift card',              'gift card'],
  ['scented candle',      'scented candle',         'candle'],
  ['essential oil diffuser', 'oil diffuser',        'diffuser'],
  ['book',                'book',                   'books'],
  ['novel',               'novel',                  'books'],
  ['cookbook',            'cookbook',               'cookbook'],
  ['journal diary',       'diary journal',          'journal'],
  ['planner notebook',    'planner',                'planner'],
  ['puzzle',              'jigsaw puzzle',          'puzzle'],
  ['board game',          'board game',             'board game'],
  ['card game',           'card game',              'card game'],
  ['soft toy',            'soft toy',               'soft toy'],
  ['stuffed animal',      'soft toy',               'soft toy'],
  ['teddy bear',          'teddy bear',             'soft toy'],
  ['perfume',             'perfume',                'perfume'],
  ['cologne',             'mens fragrance',         'fragrance'],
  ['aftershave',          'aftershave',             'aftershave'],
  ['body wash set',       'body wash gift set',     'body wash'],
  ['skincare set',        'skincare gift set',      'skincare'],
  ['makeup kit',          'makeup gift set',        'makeup'],
  ['hair dryer',          'hair dryer',             'hair dryer'],
  ['hair straightener',   'hair straightener',      'hair straightener'],
  ['electric toothbrush', 'electric toothbrush',    'toothbrush'],
  ['luggage set',         'suitcase',               'luggage'],
  ['carry on luggage',    'carry on bag',           'luggage'],
  ['travel pillow',       'travel pillow',          'travel pillow'],
  ['passport holder',     'passport wallet',        'passport wallet'],
];

// ── NORMALIZE QUERY ───────────────────────────────────────────────────────────
// Converts any AI-generated search term to a NZ retail Known-Good term
// Returns { term, fallback } where:
//   term     = the best NZ retail search term to use
//   fallback = a broad category fallback if term returns no results (v3)
function normalizeQuery(rawQuery) {
  if (!rawQuery) return { term: rawQuery, fallback: rawQuery };
  const lower = rawQuery.toLowerCase().trim();

  for (const [trigger, nzTerm, fallback] of NZ_TERM_MAP) {
    if (lower.includes(trigger)) {
      return { term: nzTerm, fallback };
    }
  }

  // No mapping found — clean up the raw query and use as-is
  // Remove brand names that commonly appear (common AI mistake)
  const cleaned = lower
    .replace(/\b(nike|adidas|apple|samsung|sony|lg|philips|dyson|breville|delonghi|nespresso|tefal|sunbeam)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { term: cleaned || rawQuery, fallback: rawQuery };
}

// ── RETAILER SEARCH URL MAP ───────────────────────────────────────────────────
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
  'torpedo7':         (q) => `https://www.torpedo7.co.nz/search?q=${encodeURIComponent(q)}`,
  'furtherfaster':    (q) => `https://www.furtherfaster.co.nz/search?q=${encodeURIComponent(q)}`,
};

// Friendly display names
const RETAILER_NAMES = {
  'thewarehouse': 'The Warehouse', 'farmers': 'Farmers', 'briscoes': 'Briscoes',
  'noelleeming': 'Noel Leeming', 'pbtech': 'PB Tech', 'mightyape': 'Mighty Ape',
  'harveynorman': 'Harvey Norman', 'jbhifi': 'JB Hi-Fi', 'kmart': 'Kmart',
  'stirlingsports': 'Stirling Sports', 'rebelsport': 'Rebel Sport',
  'torpedo7': 'Torpedo7', 'bunnings': 'Bunnings', 'mitre10': 'Mitre 10',
  'toolshed': 'The Tool Shed', 'hallensteins': 'Hallensteins', 'glassons': 'Glassons',
  'chemistwarehouse': 'Chemist Warehouse', 'whitcoulls': 'Whitcoulls',
  'paperplus': 'Paper Plus', 'huntingandfishing': 'Hunting & Fishing',
  'supercheap': 'Supercheap Auto', 'repco': 'Repco', 'countdown': 'Countdown',
  'luggage': 'Luggage.co.nz', 'strandbags': 'Strandbags',
  'numberoneshoes': 'Number One Shoes', 'smithscity': "Smiths City",
  'themarket': 'The Market', 'furtherfaster': 'Further Faster',
};

// ── SMART RETAILER ROUTING ────────────────────────────────────────────────────
// Maps product type to ordered retailer list — most relevant first
const RETAILER_ROUTES = {
  electronics:    ['noelleeming','jbhifi','pbtech','harveynorman','mightyape'],
  audio:          ['noelleeming','jbhifi','pbtech','harveynorman','mightyape'],
  tech:           ['noelleeming','pbtech','jbhifi','harveynorman','mightyape'],
  gaming:         ['mightyape','jbhifi','pbtech','noelleeming','thewarehouse'],
  camera:         ['noelleeming','jbhifi','pbtech','harveynorman'],
  sports:         ['stirlingsports','rebelsport','torpedo7','huntingandfishing','farmers'],
  fitness:        ['stirlingsports','rebelsport','torpedo7','farmers','thewarehouse'],
  outdoor:        ['torpedo7','huntingandfishing','stirlingsports','rebelsport'],
  running:        ['stirlingsports','rebelsport','numberoneshoes','torpedo7'],
  cycling:        ['torpedo7','huntingandfishing','stirlingsports','rebelsport'],
  kitchen:        ['briscoes','farmers','harveynorman','thewarehouse','noelleeming'],
  home:           ['briscoes','farmers','thewarehouse','kmart','harveynorman'],
  appliance:      ['harveynorman','noelleeming','briscoes','farmers','thewarehouse'],
  tools:          ['bunnings','mitre10','toolshed','supercheap','repco'],
  hardware:       ['bunnings','mitre10','toolshed','supercheap'],
  automotive:     ['supercheap','repco','mitre10','bunnings'],
  fashion:        ['glassons','hallensteins','farmers','thewarehouse','kmart'],
  clothing:       ['glassons','hallensteins','farmers','thewarehouse','kmart'],
  footwear:       ['numberoneshoes','stirlingsports','farmers','thewarehouse'],
  health:         ['chemistwarehouse','farmers','countdown','thewarehouse'],
  beauty:         ['chemistwarehouse','farmers','thewarehouse','kmart'],
  grooming:       ['chemistwarehouse','farmers','thewarehouse','kmart'],
  books:          ['whitcoulls','paperplus','thewarehouse','mightyape'],
  stationery:     ['whitcoulls','paperplus','thewarehouse','kmart'],
  travel:         ['luggage','strandbags','farmers','torpedo7'],
  bags:           ['strandbags','luggage','farmers','thewarehouse'],
  toys:           ['thewarehouse','kmart','mightyape','farmers'],
  kids:           ['thewarehouse','kmart','farmers','countdown'],
  baby:           ['farmers','thewarehouse','kmart','countdown'],
  food:           ['countdown','thewarehouse','farmers','kmart'],
  general:        ['thewarehouse','farmers','briscoes','kmart','mightyape',
                   'harveynorman','noelleeming','whitcoulls','paperplus',
                   'chemistwarehouse','smithscity','themarket'],
};

function detectRoute(name, type) {
  const s = `${name} ${type}`.toLowerCase();
  if (/drill|saw|grinder|sander|compressor|nail gun|jigsaw|impact wrench|heat gun|power tool|water blaster|pressure washer|waterblaster/.test(s)) return 'tools';
  if (/wrench|socket|hardware/.test(s)) return 'hardware';
  if (/car |auto|vehicle|tyre|wheel|motor oil|wiper/.test(s)) return 'automotive';
  if (/headphone|earphone|earbud|speaker|soundbar|audio/.test(s)) return 'audio';
  if (/laptop|computer|tablet|monitor|keyboard|mouse|printer|router|hard drive|ssd|usb|webcam/.test(s)) return 'tech';
  if (/phone|smart watch|smartwatch|wearable|fitness tracker|tv |television|projector|drone/.test(s)) return 'electronics';
  if (/game|gaming|console|controller/.test(s)) return 'gaming';
  if (/camera|lens|tripod|photography/.test(s)) return 'camera';
  if (/running|marathon|jog/.test(s)) return 'running';
  if (/cycling|bike|bicycle/.test(s)) return 'cycling';
  if (/gym|workout|dumbbell|barbell|weight|foam roller|yoga|pilates|resistance band|protein|sports bag/.test(s)) return 'fitness';
  if (/hiking|camping|tent|sleeping bag|kayak|fishing|hunting|surf|ski|snowboard/.test(s)) return 'outdoor';
  if (/sport|football|rugby|cricket|tennis|basketball|volleyball|hockey|swimming|swim|togs/.test(s)) return 'sports';
  if (/blender|toaster|kettle|coffee|air fryer|microwave|knife|cookware|pot |pan |bakeware/.test(s)) return 'kitchen';
  if (/appliance|washing machine|dryer|dishwasher|vacuum|iron|heater|fan |air con/.test(s)) return 'appliance';
  if (/candle|diffuser|cushion|throw|blanket|frame|vase|lamp|rug|linen|towel|home decor|duvet|rubbish bin/.test(s)) return 'home';
  if (/perfume|fragrance|cologne|skincare|makeup|moisturiser|aftershave/.test(s)) return 'beauty';
  if (/shaver|razor|trimmer|hair dryer|straightener|curler/.test(s)) return 'grooming';
  if (/supplement|vitamin|protein powder|pharmacy|health|sunscreen|insect repellent/.test(s)) return 'health';
  if (/shoes|sneakers|boots|sandals|jandals|footwear/.test(s)) return 'footwear';
  if (/shirt|pants|jeans|dress|jacket|hoodie|jumper|coat|swimwear|activewear|socks|underwear|undies|togs|jersey|beanie/.test(s)) return 'clothing';
  if (/fashion|jewellery|jewelry|watch|necklace|bracelet|ring |earring|wallet|purse/.test(s)) return 'fashion';
  if (/book|novel|cookbook|diary|journal|planner/.test(s)) return 'books';
  if (/pen |pencil|stationery|notebook|art supply|paint|drawing/.test(s)) return 'stationery';
  if (/luggage|suitcase|travel/.test(s)) return 'travel';
  if (/bag|handbag|backpack|bum bag/.test(s)) return 'bags';
  if (/toy|puzzle|board game|kids|children|baby|nappy|pram|dummy|soft toy/.test(s)) return 'toys';
  if (/food|snack|chocolate|coffee beans|tea |spice|lollies|biscuit/.test(s)) return 'food';
  return 'general';
}

function getRetailers(name, type, count = 4) {
  const route = detectRoute(name, type);
  let list = [...(RETAILER_ROUTES[route] || RETAILER_ROUTES['general'])];
  if (route === 'general') {
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const offset = hash % list.length;
    list = [...list.slice(offset), ...list.slice(0, offset)];
  }
  return list.slice(0, count);
}

function buildProductLinks(name, type, normalizedTerm) {
  const retailers = getRetailers(name, type, 4);
  const links = retailers.map(key => ({
    name: RETAILER_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1),
    url:  RETAILER_SEARCH_PATTERNS[key] ? RETAILER_SEARCH_PATTERNS[key](normalizedTerm) : null,
  })).filter(l => l.url);

  return {
    buyLink:   links[0]?.url   || null,
    storeName: links[0]?.name  || null,
    stores:    links.slice(1, 4).map(l => ({ name: l.name, link: l.url })),
  };
}

// ── BRAVE IMAGE SEARCH ────────────────────────────────────────────────────────
async function getBraveImage(normalizedTerm, braveKey) {
  if (!braveKey) return null;
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(normalizedTerm + ' product NZ')}&count=3&safesearch=strict`,
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
    for (const r of results) {
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
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'Missing Anthropic API key' });

  const tier = getTier(budgetTier || 'medium');
  const { label: budgetLabel, hint: budgetHint, min: budgetMin, max: budgetMax } = tier;
  const budgetInstruction = budgetTier === 'lotto'
    ? 'Products MUST be premium items priced NZ$500 or above.'
    : `Products MUST be priced between NZ$${budgetMin} and NZ$${budgetMax}.`;

  const refreshVariations = [
    '',
    'Find 3 DIFFERENT product categories — same vibe, person and interests.',
    'Suggest ALTERNATIVE ideas — different from previous but same vibe and interests.',
    'Focus on NICHE or less obvious products — same vibe and interests.',
    'Suggest PREMIUM best-in-class versions — same vibe and interests.',
    'Think EXPERIENTIAL or lifestyle products — same vibe and interests.',
  ];
  const refreshInstruction = refreshSeed > 0
    ? (refreshVariations[refreshSeed] || refreshVariations[refreshVariations.length - 1])
    : '';

  // ── STEP 1: Claude Haiku ────────────────────────────────────────────────────
  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine for the New Zealand retail market.

Recommend exactly 3 products available in NZ stores in 2025/2026.

RULES:
- Exactly 3 products, single items only — NO bundles, NO combo packs
- GENERIC product names ONLY — names a Kiwi customer would say in a shop
  GOOD: "Foam Roller", "Smart Watch", "Wireless Earbuds", "RFID Wallet", "Sports Bag"
  BAD: "Advanced Recovery Device", "Sport Watch Pro", invented compound names
- BUDGET HARD RULE: ${budgetInstruction} Non-negotiable.
- Every product MUST match the stated vibe
- Every product MUST be relevant to stated interests
- NEVER recommend alcohol, weapons, or adult products

VARIETY RULE — never recommend the same category twice in one set:
- Vary product types completely — e.g. not two types of headphones

PRODUCT TYPE — use ONE of these exact values (critical for routing):
electronics, audio, tech, gaming, camera, sports, fitness, outdoor, running, cycling,
kitchen, home, appliance, tools, hardware, automotive, fashion, clothing, footwear,
health, beauty, grooming, books, stationery, travel, bags, toys, kids, baby, food, general

SEARCH QUERY RULES — this is the most important field:
- Must be 2-4 words that work as a search term on NZ retailer websites
- Use NZ terminology: "drink bottle" not "water bottle", "togs" not "swimwear",
  "jandals" not "flip flops", "jersey" not "sweater", "smart watch" not "sport watch",
  "sports bag" not "gym bag", "wireless earbuds" not "earbuds", "torch" not "flashlight"
- NO brand names in searchQuery
- NO model numbers in searchQuery

Return ONLY valid JSON, no preamble, no markdown.

OUTPUT FORMAT:
{
  "products": [
    {
      "name": "Smart Watch",
      "type": "electronics",
      "reason": "1-2 sentences why this is perfect for this person",
      "searchQuery": "smart watch"
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
${refreshInstruction ? `\nVariety: ${refreshInstruction}` : ''}
${excludeProducts.length > 0 ? `\nAlready shown — do NOT repeat: ${excludeProducts.join(', ')}` : ''}`;

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
  } catch (err) {
    console.error('Claude error:', err);
    return res.status(500).json({ error: `AI recommendation failed: ${err.message}` });
  }

  // ── STEP 2: Normalize + build links + images in parallel ──────────────────
  const enriched = await Promise.all(products.map(async (product) => {

    // Run normalizeQuery on the searchQuery Claude returned
    const { term: normalizedTerm } = normalizeQuery(product.searchQuery);

    // Build guaranteed retailer search links
    const { buyLink, storeName, stores } = buildProductLinks(
      product.name,
      product.type,
      normalizedTerm
    );

    // Brave image — parallel, non-blocking
    const imageUrl = await getBraveImage(normalizedTerm, BRAVE_KEY);

    console.log(`Product: "${product.name}" | Raw: "${product.searchQuery}" | Normalized: "${normalizedTerm}" | Route: ${detectRoute(product.name, product.type)} | Buy: ${storeName}`);

    return {
      name:          product.name,
      type:          product.type,
      reason:        product.reason,
      budgetLabel,
      bestStoreName: storeName,
      buyLink,
      imageUrl,
      stores,
      searchTerm:    normalizedTerm, // sent to frontend for transparency
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
