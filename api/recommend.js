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
  const BREVO_KEY = process.env.BREVO_API_KEY;

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

      const [organicRes, shoppingRes, imageRes] = await Promise.all([
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: query, gl: 'nz', hl: 'en', num: 5 })
        }),
        fetch('https://google.serper.dev/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
          body: JSON.stringify({ q: `${product.searchQuery || product.name} NZ`, gl: 'nz', hl: 'en', num: 5 })
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

      const buyLink = organicData.organic?.[0]?.link || null;
      const shoppingItems = shoppingData.shopping || [];
      const stores = shoppingItems.slice(0, 3).map(s => ({
        name: s.source || s.store || 'Shop',
        link: organicData.organic?.find(o =>
          o.link?.toLowerCase().includes((s.source || '').toLowerCase().split(' ')[0])
        )?.link || s.link || '#'
      })).filter(s => s.name && s.name !== 'Shop');

      const rawPrice = shoppingItems[0]?.price || null;
      let price = null;
      if (rawPrice) {
        const match = rawPrice.replace(/[^0-9.]/g, '');
        price = match ? parseFloat(match).toFixed(0) : null;
      }

      const imageUrl = imageData.images?.[0]?.imageUrl || null;

      return { name: product.name, type: product.type, reason: product.reason, price, buyLink, imageUrl, stores };

    } catch (err) {
      console.error(`Serper error for ${product.name}:`, err);
      return { name: product.name, type: product.type, reason: product.reason, price: null, buyLink: null, imageUrl: null, stores: [] };
    }
  }));

  // ── STEP 3: Brevo → send results email to user ─────────────────────────────

  if (BREVO_KEY && email) {
    try {
      // Build nice HTML for each product
      const productRows = enriched.map((p, i) => `
        <div style="margin-bottom:28px;padding:20px;background:#fffdf9;border-radius:12px;border:1px solid #e8ddd0;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a9e7e;margin-bottom:4px;">${p.type || 'Gift Idea'}</div>
          <div style="font-size:20px;font-weight:700;color:#3d2b1a;margin-bottom:8px;">${i+1}. ${p.name}</div>
          <div style="font-size:14px;color:#7a6855;line-height:1.6;margin-bottom:12px;">${p.reason}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div style="font-size:18px;font-weight:700;color:#3d2b1a;">${p.price ? `NZ$${p.price} <span style="font-size:12px;color:#a89480;font-weight:400;">approx.</span>` : 'Price varies'}</div>
            ${p.buyLink ? `<a href="${p.buyLink}" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Buy now →</a>` : ''}
          </div>
          ${p.stores && p.stores.length > 0 ? `<div style="margin-top:10px;font-size:12px;color:#9a8878;">Also available at: ${p.stores.map(s => s.name).join(', ')}</div>` : ''}
        </div>
      `).join('');

      const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#faf6f0;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:36px;">
      <div style="font-size:28px;font-weight:900;color:#3d2b1a;margin-bottom:4px;">🧞 ShopGenieAI</div>
      <div style="font-size:13px;color:#9a8878;font-style:italic;">Your wish is my gift</div>
    </div>

    <!-- Intro -->
    <div style="background:white;border-radius:18px;padding:32px;box-shadow:0 4px 24px rgba(61,43,26,0.08);border:1px solid #e8ddd0;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:700;color:#3d2b1a;margin-bottom:10px;">Here are your 3 gift picks! 🎁</div>
      <div style="font-size:14px;color:#7a6855;line-height:1.6;">
        Based on your quiz answers — shopping for <strong>${whoFor}</strong> for <strong>${occasion}</strong> 
        with a budget of <strong>NZ$${budget}${budget >= 500 ? '+' : ''}</strong> — here's what your Genie found:
      </div>
    </div>

    <!-- Products -->
    <div style="background:white;border-radius:18px;padding:32px;box-shadow:0 4px 24px rgba(61,43,26,0.08);border:1px solid #e8ddd0;margin-bottom:24px;">
      ${productRows}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://shop-genie-ai-azure.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;box-shadow:0 6px 24px rgba(200,146,42,0.35);">
        Find More Gifts 🧞
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">
      Made in Aotearoa 🇳🇿 · ShopGenieAI · <a href="#" style="color:#b5a190;">Unsubscribe</a>
    </div>

  </div>
</body>
</html>`;

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_KEY
        },
        body: JSON.stringify({
          sender: { name: 'ShopGenieAI', email: 'saym577@gmail.com' },
          to: [{ email: email }],
          subject: '🧞 Your 3 personalised gift picks from ShopGenieAI',
          htmlContent
        })
      });

      console.log(`Email sent to ${email}`);
    } catch (emailErr) {
      // Don't fail the whole request if email fails — just log it
      console.error('Brevo email error:', emailErr);
    }
  }

  return res.status(200).json({ products: enriched });
}
