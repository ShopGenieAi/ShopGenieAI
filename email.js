// ─────────────────────────────────────────────────────────────────────────────
// ShopGenieAI — email.js
// Sends the products ALREADY shown on screen via Brevo — no Claude re-call.
// Fixes the bug where emailing generated completely different products.
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const BREVO_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_KEY) return res.status(500).json({ error: 'Missing Brevo API key' });

  const { email, firstName, whoFor, occasion, budgetTier, products } = req.body;

  if (!email || !products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Clean whoFor display — strip surrounding quotes e.g. Partner "Her" → Partner Her
  const displayWhoFor = (whoFor || '').replace(/['"]/g, '').trim();
  const displayName   = firstName ? `, ${firstName}` : '';
  const budgetLabel   = products[0]?.budgetLabel || '';

  const rows = products.map((p, i) => `
    <div style="margin-bottom:28px;padding:20px;background:#fffdf9;border-radius:12px;border:1px solid #e8ddd0;">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7a9e7e;margin-bottom:4px;">${p.type || 'Gift Idea'}</div>
      <div style="font-size:20px;font-weight:700;color:#3d2b1a;margin-bottom:8px;">${i + 1}. ${p.name}</div>
      <div style="font-size:14px;color:#7a6855;line-height:1.6;margin-bottom:12px;">${p.reason}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:15px;font-weight:600;color:#c8922a;">${p.budgetLabel || budgetLabel}</div>
          ${p.bestStoreName ? `<div style="font-size:12px;color:#9a8878;">Best match at ${p.bestStoreName}</div>` : ''}
        </div>
        <a href="${p.buyLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:14px;padding:10px 20px;border-radius:50px;text-decoration:none;">Shop This Gift →</a>
      </div>
      ${(p.stores || []).length > 0 ? `
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e8ddd0;">
        <div style="font-size:11px;color:#9a8878;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Also search:</div>
        <div>${p.stores.map(s => `<a href="${s.link}" target="_blank" style="display:inline-block;background:rgba(122,158,126,.12);color:#3d7a50;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;text-decoration:none;border:1px solid rgba(122,158,126,.3);margin-right:6px;">${s.name}</a>`).join('')}</div>
      </div>` : ''}
    </div>`).join('');

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify({
        sender: { name: 'ShopGenieAI', email: 'saym577@gmail.com' },
        to: [{ email }],
        subject: `🧞 Your 3 personalised gift picks from ShopGenieAI${displayName}`,
        htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#faf6f0;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:36px;">
    <div style="font-size:28px;font-weight:900;color:#3d2b1a;">🧞 ShopGenieAI</div>
    <div style="font-size:13px;color:#9a8878;font-style:italic;">Your wish is my gift</div>
  </div>
  <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">
    <div style="font-size:22px;font-weight:700;color:#3d2b1a;margin-bottom:10px;">Here are your 3 gift picks${displayName}! 🎁</div>
    <div style="font-size:14px;color:#7a6855;">For <strong>${displayWhoFor}</strong> · <strong>${occasion || ''}</strong> · ${budgetLabel}</div>
  </div>
  <div style="background:white;border-radius:18px;padding:32px;border:1px solid #e8ddd0;margin-bottom:24px;">${rows}</div>
  <div style="background:#fff9f0;border-radius:12px;padding:16px 20px;border:1px solid #e8ddd0;margin-bottom:24px;font-size:12px;color:#9a8878;line-height:1.6;">
    <strong style="color:#3d2b1a;">📋 Note:</strong> Links open retailer search pages — browse and buy at your convenience!
  </div>
  <div style="text-align:center;margin-bottom:32px;">
    <a href="https://shopgenieai.com" style="display:inline-block;background:linear-gradient(135deg,#c8922a,#c4623a);color:white;font-weight:600;font-size:16px;padding:16px 36px;border-radius:50px;text-decoration:none;">Find More Gifts 🧞</a>
  </div>
  <div style="text-align:center;font-size:12px;color:#b5a190;border-top:1px solid #e8ddd0;padding-top:20px;">Kiwi Made 🇳🇿 · ShopGenieAI</div>
</div>
</body></html>`
      }),
    });

    if (!brevoRes.ok) {
      const err = await brevoRes.json().catch(() => ({}));
      console.error('Brevo email error:', err);
      return res.status(500).json({ error: 'Email send failed' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Email handler error:', e);
    return res.status(500).json({ error: e.message });
  }
}
