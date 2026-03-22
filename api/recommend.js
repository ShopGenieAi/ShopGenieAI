export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, shoppingFor, whoFor, vibe, budget, occasion, interests } = req.body;

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const SERPER_KEY = process.env.SERPER_API_KEY;

  if (!ANTHROPIC_KEY || !SERPER_KEY) {
    return res.status(500).json({ error: 'Missing API keys in environment variables' });
  }

  // ── STEP 1: Claude Haiku → 3 product recommendations ──────────────────────

  const systemPrompt = `You are ShopGenieAI, a gift recommendation engine specialised in the New Zealand retail market.

Your job is to recommend exactly 3 specific, real products that are available to buy in New Zealand.

RULES:
- Recommend exactly 3 products
- Each product must match the stated product type exactly — no bundles or combo products
- Products must be realistic, specific named items (not generic categories)
- Do NOT include retailer/store names in the product Name field
- Products must align with the budget provided
- For vibe "Sporty": only recommend sport-specific products
- Return ONLY valid JSON, no preamble, no markdown backticks

OUTPUT FORMAT (strict JSON):
{
  "products": [
    {
      "name": "Specific Product Name",
      "type": "Product Category",
      "reason": "1-2 sentence explanation of why this is perfect for them",
      "searchQuery": "product name brand NZ"
    },
    {
      "name": "...",
      "type": "...",
      "reason": "...",
      "searchQuery": "..."
    },
    {
      "name": "...",
      "type": "...",
      "reason": "...",
      "searchQuery": "..."
    }
  ]
}`;

  const userPrompt = `Find me 3 gift recommendations based on:
- Shopping for: ${shoppingFor}
- Who it's for: ${whoFor}
- Vibe/style: ${vibe}
- Budget: NZ$${budget}${budget >= 500 ? '+' : ''}
- Occasion: ${occasion}
- Interests/hobbies/brands: ${interests || 'Not specified'}

Remember: stay within NZ$${budget} budget, match the vibe closely, be specific with product names.`;

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

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} — ${err}`);
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content[0].text.trim();

    // Strip any accidental markdown fences
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    products = parsed.products;

    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Claude returned no products');
    }
  } catch (err) {
    console.error('Claude error:', err);
    return res.status(500).json({ error: `AI recommendation failed: ${err.message}` });
  }

  // ── STEP 2: Serper → enrich each product with NZ price, image, buy link ───

  const enriched = await Promise.all(products.map(async (product) => {
    try {
      const query = `${product.searchQuery || product.name} buy NZ site:*.co.nz -site:nzherald.co.nz -site:stuff.co.nz -site:trademe.co.nz`;

      // Organic search for direct retailer links
      const organicRes = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': SERPER_KEY
        },
        body: JSON.stringify({ q: query, gl: 'nz', hl: 'en', num: 5 })
      });

      // Shopping search for price + display name
      const shoppingRes = await fetch('https://google.serper.dev/shopping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': SERPER_KEY
        },
        body: JSON.stringify({ q: `${product.searchQuery || product.name} NZ`, gl: 'nz', hl: 'en', num: 5 })
      });

      // Image search
      const imageRes = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': SERPER_KEY
        },
        body: JSON.stringify({ q: `${product.name} product`, gl: 'nz', hl: 'en', num: 3 })
      });

      const organicData = organicRes.ok ? await organicRes.json() : {};
      const shoppingData = shoppingRes.ok ? await shoppingRes.json() : {};
      const imageData = imageRes.ok ? await imageRes.json() : {};

      // Extract buy link from organic results (direct retailer URL)
      const buyLink = organicData.organic?.[0]?.link || null;

      // Extract store info from shopping results
      const shoppingItems = shoppingData.shopping || [];
      const stores = shoppingItems.slice(0, 3).map(s => ({
        name: s.source || s.store || 'Shop',
        link: organicData.organic?.find(o =>
          o.link?.toLowerCase().includes((s.source || '').toLowerCase().split(' ')[0])
        )?.link || s.link || '#'
      })).filter(s => s.name && s.name !== 'Shop');

      // Price from first shopping result
      const rawPrice = shoppingItems[0]?.price || null;
      let price = null;
      if (rawPrice) {
        const match = rawPrice.replace(/[^0-9.]/g, '');
        price = match ? parseFloat(match).toFixed(0) : null;
      }

      // Image from image search
      const imageUrl = imageData.images?.[0]?.imageUrl || null;

      return {
        name: product.name,
        type: product.type,
        reason: product.reason,
        price,
        buyLink,
        imageUrl,
        stores
      };

    } catch (err) {
      console.error(`Serper error for ${product.name}:`, err);
      // Return product without enrichment rather than failing entirely
      return {
        name: product.name,
        type: product.type,
        reason: product.reason,
        price: null,
        buyLink: null,
        imageUrl: null,
        stores: []
      };
    }
  }));

  return res.status(200).json({ products: enriched });
}
